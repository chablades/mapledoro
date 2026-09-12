/*
  Parses the JSON MapleScouter lets you export for a character ("Save preset" ->
  downloads a `scouter-preset-*.json`) and turns it back into MapleDoro setup-step
  drafts, so a player can paste their export, review every value in the normal setup
  steps, and finish setup without retyping.

  This is the INVERSE of scouterApi.ts's buildScouterPayload (which builds MapleScouter's
  request body FROM a MapleDoro character). The export's `data` object is the same
  ScouterUserStat shape that file documents field-by-field -- read its comments as the
  dictionary for what each field means and how it's encoded.

  MapleScouter's export dumps stale default-template values for inputs you can't actually
  edit in the GMS UI (statThird/statFourth, the non-GMS seed rings, etc.). Those are on a
  hard denylist here -- never surfaced, never mapped. See TEMPLATE_JUNK_NOTE.
*/

import type { ScouterUserStat, ScouterPayloadContext } from "../../scouter/scouterApi";
import { assignMainSubStats, buildScouterPayload } from "../../scouter/scouterApi";
import type { StoredCharacterRecord, LinkSkillId } from "../../model/charactersStore";
import { SCOUTER_CLASS_KOREAN_NAMES } from "../../scouter/scouterClassNames";
import { LINK_SKILL_TO_SCOUTER_KEY } from "../../scouter/scouterLinkSkills";
import { LINK_SKILLS } from "./linkSkillsData";
import { CLASS_SKILL_DATA } from "./classSkillData";
import { TRIPLE_STAT_FIELDS, STAT_LABELS, type TripleStatFieldId } from "./statFields";
import { serializeStatsStepDraft, storedStatsToStatsStepDraft, type StatsStepDraft, type TripleStatDraft } from "./statsStepDraft";
import { serializeOzRingsDraft, OZ_RING_MAX_LEVEL, type OzRingId } from "./ozRingData";
import { serializeBuffsDraft, emptyBuffsDraft, BOOL_BUFFS, GUILD_BUFFS, RENOWN_STATS, type BuffsDraft } from "./buffsData";
import { whRankForLevel } from "./scouterQuestionsData";
import { isRebootWorld } from "./rebootData";
import type { SetupStepInputById } from "../types";

/** The wrapper MapleScouter's "Save preset" download writes around the ScouterUserStat. */
interface MapleScouterExportFile {
  type: string;
  v: number;
  savedAt: string;
  label: string;
  data: ScouterUserStat;
}

/** What the export's `type` field must equal for us to accept it. */
const EXPORT_FILE_TYPE = "maplescouter-manual-preset";

/*
  TEMPLATE_JUNK_NOTE: fields MapleScouter's export always populates with default-template
  values regardless of what the player actually set (they're not editable in the GMS UI, or
  were removed in the v271 Special Skill Ring consolidation). Parsing these back would
  silently inject numbers the player never chose. Never read them.

    special.statThird / special.statFourth      - removed off-stat ring inputs
    special.ringOfSum / special.riskTaker       - Totalling / Risk Taker ring (not GMS)
    seedRing.riskTakerRing / .criDamageRing     - not GMS rings
    seedRing.levelRing / .ultiRing / .ringOfSum
    seedRing.durabilityRing
    seedRing.*.efficiency                       - API-computed, not an input
    entireStat / power                          - MapleScouter's own derived snapshots
    stat.classForce                             - unreleased tribe-force stat
    stat.tms_* / doping.criDmgRing              - non-GMS
    hexa.skillCore3-6 / hexa.generalCore3-4     - unreleased GMS content
    huntSkill.erdaShower                        - no MapleDoro field
*/

// ── Reverse class-name lookup ────────────────────────────────────────────────

const KOREAN_NAME_TO_CLASS_ID: Record<string, string> = Object.fromEntries(
  Object.entries(SCOUTER_CLASS_KOREAN_NAMES).map(([classId, koreanName]) => [koreanName, classId]),
);

/** MapleDoro classId for a MapleScouter Korean class name, or null if unrecognized. */
function classIdFromKoreanName(koreanName: string): string | null {
  return KOREAN_NAME_TO_CLASS_ID[koreanName.trim()] ?? null;
}

// ── Region check ────────────────────────────────────────────────────────────

/** The export flags its region as one of isGMS/isTMS/isJMS/isMSEA; all four false means
 *  KMS (MapleScouter's default). Returns the non-GMS region's label, or null for GMS. */
function nonGmsRegionLabel(payload: ScouterUserStat): string | null {
  const p = payload as unknown as Record<string, unknown>;
  if (p.isTMS === true) return "Taiwan MapleStory (TMS)";
  if (p.isJMS === true) return "Japan MapleStory (JMS)";
  if (p.isMSEA === true) return "MapleStory SEA (MSEA)";
  return p.isGMS === true ? null : "Korea MapleStory (KMS)";
}

// ── Parse result ────────────────────────────────────────────────────────────

export type MapleScouterImportError =
  | "not-json"
  | "wrong-file-type"
  | "no-data"
  | "unknown-class"
  | "class-mismatch"
  | "wrong-region";

/** A non-blocking "check this" notice shown after a successful parse: a stale preset, or a
 *  setting in the export that doesn't match what MapleDoro knows about the character. The
 *  import still goes through, and the real review is the setup steps themselves. */
interface ImportStalenessWarning {
  id: "level-mismatch" | "old-export" | "reboot-mismatch";
  message: string;
}

export interface MapleScouterImportResult {
  ok: true;
  /** The export's own label, which MapleScouter writes as "Lv <level> <class>". Display only. */
  label: string;
  /** MapleDoro classId resolved from stat.myClass. */
  classId: string;
  /** Human class name for display. */
  className: string;
  level: number;
  /** "This preset looks stale" notices: a level mismatch against the live character, or an
   *  old savedAt. Never blocks the import. */
  warnings: ImportStalenessWarning[];
  /** The parsed payload, mapped into setup-step drafts by mapImportToDrafts. */
  payload: ScouterUserStat;
}

export interface MapleScouterImportFailure {
  ok: false;
  error: MapleScouterImportError;
  /** For "class-mismatch"/"unknown-class": the class name we read out of the export. */
  foundClassName?: string;
}

// ── Staleness detection ─────────────────────────────────────────────────────

/** An export older than this reads as "you probably leveled / changed gear since". */
const OLD_EXPORT_DAYS = 14;

function relativeAge(savedAt: string): { days: number; text: string } | null {
  const then = Date.parse(savedAt);
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days < 1) return { days, text: "today" };
  if (days === 1) return { days, text: "yesterday" };
  if (days < 30) return { days, text: `${days} days ago` };
  const months = Math.floor(days / 30);
  return { days, text: months === 1 ? "a month ago" : `${months} months ago` };
}

interface WarningInput {
  payload: ScouterUserStat;
  level: number;
  expectedLevel: number | undefined;
  expectedWorldId: number | undefined;
  className: string;
  savedAt: string | undefined;
}

function buildImportWarnings({ payload, level, expectedLevel, expectedWorldId, className, savedAt }: WarningInput): ImportStalenessWarning[] {
  const warnings: ImportStalenessWarning[] = [];

  if (expectedLevel && level && level !== expectedLevel) {
    warnings.push({
      id: "level-mismatch",
      message: `This MapleScouter preset is for a Level ${level} ${className} but yours is Level ${expectedLevel}. It may differ from your current stats, so make sure to double check the values.`,
    });
  }

  // isReboot is a per-world fact, and MapleDoro derives it from the character's world, so a
  // mismatch means the MapleScouter preset has it set wrong. That is a common mistake, and it
  // quietly adds or drops Reboot's Final Damage bonus.
  if (expectedWorldId !== undefined) {
    const worldIsReboot = isRebootWorld(expectedWorldId);
    if (payload.special.isReboot === true && !worldIsReboot) {
      warnings.push({
        id: "reboot-mismatch",
        message: "This MapleScouter preset is set to Reboot, but this character isn't on a Reboot world.",
      });
    } else if (payload.special.isReboot === false && worldIsReboot) {
      warnings.push({
        id: "reboot-mismatch",
        message: "This character is on a Reboot world, but this MapleScouter preset isn't set to Reboot.",
      });
    }
  }

  const age = savedAt ? relativeAge(savedAt) : null;
  if (age && age.days >= OLD_EXPORT_DAYS) {
    warnings.push({
      id: "old-export",
      message: `This MapleScouter preset was exported ${age.text}. If you have changed anything since, re-export it and upload the new file.`,
    });
  }

  return warnings;
}

// ── Entry point ─────────────────────────────────────────────────────────────

export interface ParseExportContext {
  /** The confirmed character's Nexon jobName. The export must be for the same class or it's
   *  refused, since importing a Bishop's numbers onto a Kanna is always a mistake. */
  jobName: string;
  /** The character's live level, used only to flag a stale preset as a warning, never a
   *  rejection. */
  level?: number;
  /** The character's world id, used to flag a Reboot/Interactive mismatch in the export.
   *  isReboot is a per-world fact MapleDoro derives, not a per-character setting. */
  worldId?: number;
}

/** Parses and validates a pasted MapleScouter export against the character being set up. */
export function parseMapleScouterExport(
  raw: string,
  ctx: ParseExportContext,
): MapleScouterImportResult | MapleScouterImportFailure {
  const { jobName: expectedJobName, level: expectedLevel, worldId: expectedWorldId } = ctx;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "not-json" };
  }

  if (!parsed || typeof parsed !== "object") return { ok: false, error: "not-json" };
  const file = parsed as Partial<MapleScouterExportFile>;
  if (file.type !== EXPORT_FILE_TYPE) return { ok: false, error: "wrong-file-type" };
  if (!file.data || typeof file.data !== "object") return { ok: false, error: "no-data" };

  const payload = file.data as ScouterUserStat;

  // MapleDoro is GMS-only. A non-GMS export is balanced for a different version and can
  // carry buffs, rings and values that don't exist in GMS, so importing it would seed
  // garbage. Reject it rather than salvaging the fields that happen to overlap.
  // MapleScouter bakes the region into a saved preset, so there's no "re-export as GMS".
  const region = nonGmsRegionLabel(payload);
  if (region) return { ok: false, error: "wrong-region", foundClassName: region };

  const koreanName = payload.stat?.myClass ?? "";
  const classId = classIdFromKoreanName(koreanName);
  if (!classId) return { ok: false, error: "unknown-class", foundClassName: koreanName };

  const expectedClass = CLASS_SKILL_DATA.find((c) => c.nexonJobName === expectedJobName);
  if (!expectedClass || expectedClass.id !== classId) {
    const importedClass = CLASS_SKILL_DATA.find((c) => c.id === classId);
    return { ok: false, error: "class-mismatch", foundClassName: importedClass?.displayName ?? importedClass?.nexonJobName ?? koreanName };
  }

  const level = Number(payload.stat.level || "0");
  const className = expectedClass.displayName ?? expectedClass.nexonJobName;
  return {
    ok: true,
    label: typeof file.label === "string" ? file.label : "",
    classId,
    className,
    level,
    warnings: buildImportWarnings({ payload, level, expectedLevel, expectedWorldId, className, savedAt: file.savedAt }),
    payload,
  };
}

// ── Draft mapping ───────────────────────────────────────────────────────────
//
// Every value ends up in a setup-step draft string (the `stats`, `oz_rings`, `buffs`,
// `link_skills`, `hexa_matrix` slots of SetupStepInputById). The account-level bits (Wild
// Hunter Legion rank, Legion Artifact) ride in the stats draft's `scouterQuestions` block,
// which the existing finish path (applyMapleScouterFlow / buildFullSetupRecord ->
// applyScouterLegionForWorld) already persists per-world, so there is no separate
// world-write path to wire.

/** "0"/""/absent -> 0, otherwise the parsed number. */
const num = (v: string | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** A payload stat triple ({Base,Per,Abs} strings) -> the draft's {base,percent,percentUnapplied}. */
function statTriple(base: string, per: string, abs: string): TripleStatDraft {
  return { base: base || "0", percent: per || "0", percentUnapplied: abs || "0" };
}

// ── Stats step ──────────────────────────────────────────────────────────────

/** Reverses scouterApi.ts's buildStat: the payload carries main/sub/ssub stat SLOTS, so
 *  un-map each slot back to the real stat (STR/DEX/INT/LUK) it belongs to for this class,
 *  and the attack triple back to attackPower or magicAtt.
 *
 *  `base` is the character's already-saved stats as a draft (from storedStatsToStatsStepDraft),
 *  or an empty draft for a first-time setup. The import only overwrites the fields it
 *  actually has, meaning the class's own stat slots plus the always-asked combat stats. Any
 *  other value a player entered via the profile Stats pencil, such as an off-class stat like
 *  STR on a Kanna, MP or Normal Enemy Damage, survives instead of being blanked on Finish. */
function buildStatsDraft(
  payload: ScouterUserStat,
  classId: string,
  requiredStats: readonly string[],
  base: StatsStepDraft,
): StatsStepDraft {
  const { stat } = payload;
  const tripleIds = requiredStats.filter((s): s is TripleStatFieldId =>
    s === "str" || s === "dex" || s === "int" || s === "luk");
  const assignment = assignMainSubStats(classId, tripleIds);

  const draft: StatsStepDraft = { ...base };

  // Demon Avenger's Main Stat slot is HP (buildStat overrides mainField to "hp"); its one
  // real stat (STR) sits in the Sub slot instead. assignMainSubStats already encodes that.
  const mainField: TripleStatFieldId | "hp" | null = classId === "demon_avenger" ? "hp" : assignment.main;
  if (mainField) draft[mainField] = statTriple(stat.mainStatBase, stat.mainStatPer, stat.mainStatAbs);
  if (assignment.sub) draft[assignment.sub] = statTriple(stat.subStatBase, stat.subStatPer, stat.subStatAbs);
  if (assignment.ssub) draft[assignment.ssub] = statTriple(stat.ssubStatBase, stat.ssubStatPer, stat.ssubStatAbs);

  // atkBase/atkPercent/atkAbs is the class's weapon-type attack (buildStat picks magicAtt
  // for an INT main, attackPower otherwise).
  const atkField: TripleStatFieldId = mainField === "int" ? "magicAtt" : "attackPower";
  draft[atkField] = statTriple(stat.atkBase, stat.atkPercent, stat.atkAbs);

  draft.damage = stat.dmg || "0";
  draft.bossDamage = stat.bossDmg || "0";
  draft.ignoreDefense = stat.ignoreDef || "0";
  draft.criticalRate = stat.critical || "0";
  draft.criticalDamage = stat.criticalDmg || "0";
  draft.buffDuration = stat.buffDuration || "0";
  draft.cooldownReduction = { seconds: stat.coolTimeReduce || "0", percent: stat.coolTimeReducePercent || "0" };
  draft.cooldownSkip = stat.resetCoolDown || "0";
  draft.ignoreElementalResistance = stat.ignoreElementalResist || "0";
  draft.additionalStatusDamage = stat.statusAdditionalDmg || "0";
  draft.summonDuration = stat.summonPersistTime || "0";
  draft.arcanePower = stat.arcaneForce || "0";
  draft.sacredPower = stat.authenticForce || "0";
  // Left as-is from `base`: MP and Normal Enemy Damage (not in the export, not asked in the
  // guided flows, and MapleScouter's own field for the latter is dead, see scouterApi.ts),
  // and Weapon ATT (MapleScouter removed the input and ignores the value).

  // Overlay only what the export actually determines; keep the rest of base.setupOptions
  // (a saved weaponHand, say, since special.oneHandSword being false doesn't disprove it).
  // Soul is always overlaid: the export carries a definite answer, "none" included.
  draft.setupOptions = {
    ...base.setupOptions,
    ...(payload.special.genesis === true ? { isLiberated: true } : {}),
    ...(payload.special.oneHandSword ? { weaponHand: "1h" as const } : {}),
    ...(payload.special.useRuinForceShild === true ? { hasRuinForceShield: true } : {}),
    ...soulOption(payload),
  };

  draft.scouterQuestions = { ...base.scouterQuestions, ...buildScouterQuestions(payload) };
  return draft;
}

/** Payload soul level ("0"/"1"/"2" per epiSoul/mugongSoul) -> setupOptions soul fields.
 *  An export always carries a definite value for these; "0" means no Soul Weapon (a real,
 *  committable answer) rather than "unanswered", so it maps to "none" instead of leaving the
 *  Quick Questions soul pick blank for the player to fill in. */
function soulOption(payload: ScouterUserStat): Pick<NonNullable<StatsStepDraft["setupOptions"]>, "soulType" | "soulLevel"> {
  const mugong = num(payload.special.mugongSoul);
  const epi = num(payload.special.epiSoul);
  if (mugong === 1 || mugong === 2) return { soulType: "mugong", soulLevel: mugong };
  if (epi === 1 || epi === 2) return { soulType: "ephenia", soulLevel: epi };
  return { soulType: "none" };
}

/** The MapleScouter-only questionnaire answers: Inner Ability line, Wild Hunter Legion
 *  rank (from the raw union level), Legion Artifact effects. All committed by the existing
 *  finish path. */
function buildScouterQuestions(payload: ScouterUserStat): StatsStepDraft["scouterQuestions"] {
  const { stat } = payload;
  const out: NonNullable<StatsStepDraft["scouterQuestions"]> = {};

  // The export always carries a definite Inner Ability answer. Both flags false means the
  // player has neither legendary line, a real committable answer like soul's "none", not
  // "unanswered". Map it so Quick Questions comes pre-answered either way.
  if (stat.passiveSkillLevelUp) out.innerAbilityLine = "passive";
  else if (stat.increaseTarget) out.innerAbilityLine = "multiTarget";
  else out.innerAbilityLine = "neither";

  const whLevel = num(stat.wildhunterUnion);
  const whRank = whLevel > 0 ? whRankForLevel(whLevel) : null;
  if (whRank) out.whLegion = whRank;

  if (stat.artifact_increaseTarget === true) out.artifactExtraTarget = true;
  const artifactFa = num(stat.artifact_finalAttack);
  if (artifactFa > 0) out.artifactFinalAttackDmg = String(artifactFa);

  return out;
}

// ── Oz Rings step ───────────────────────────────────────────────────────────

const OZ_RING_PAYLOAD_KEY: Record<OzRingId, keyof ScouterUserStat["special"]> = {
  restraint: "restraintRing",
  weaponJump: "weaponRing",
  continuous: "continuosRing",
};

function buildOzRingsDraft(payload: ScouterUserStat): { levels: Partial<Record<OzRingId, string>> } {
  const levels: Partial<Record<OzRingId, string>> = {};
  for (const ring of Object.keys(OZ_RING_PAYLOAD_KEY) as OzRingId[]) {
    const raw = num(payload.special[OZ_RING_PAYLOAD_KEY[ring]] as string | undefined);
    if (raw > 0) levels[ring] = String(Math.min(raw, OZ_RING_MAX_LEVEL[ring]));
  }
  return { levels };
}

// ── Buffs step ──────────────────────────────────────────────────────────────

/** payload doping flag -> BuffsDraft bool id. Mirrors scouterApi.ts's buildDoping. */
const DOPING_BOOL_MAP: Partial<Record<keyof ScouterUserStat["doping"], keyof BuffsDraft["bools"]>> = {
  bigHero: "greatHeroBoost",
  extreme: "extremePotion",
  fish: "fishBuff",
  jangBi: "advWeaponTempering",
  legendHero: "legendaryHero",
  shiningRed: "sparklingRedStar",
  shiningBlue: "sparklingBlueStar",
  superPower: "mvpSuperpower",
  unionsPower: "legionMight",
  urus: "masarayuGift",
  heroesHawl: "heroEcho",
  sayram: "sayramElixir",
  collector: "collectorElixir",
  buff275: "honorableElixir",
  additional1: "vipBuff",
  authenticDmg: "maxedSacredSymbol",
  moonshine: "brightMoonlight",
  apple: "onyxApple",
  tengu: "tengusJudgement",
  candy: "candiedApple",
  house: "caretakerSupport",
  genePass: "genepass",
};

const RENOWN_PAYLOAD_KEY: Record<keyof NonNullable<BuffsDraft["renown"]>, keyof ScouterUserStat["doping"]> = {
  allStats: "championAll",
  atkMagAtk: "championAtk",
  bossDmg: "championBoss",
  ignoreDef: "championIgnore",
  critDmg: "championCriDmg",
};

/** Guild buff order in doping.nobless, paired with the on/off boolean MapleScouter keeps
 *  alongside each. MapleScouter's export retains the LEVEL in `nobless` even when the buff
 *  is toggled off, so the boolean is the source of truth for "is it active". */
const GUILD_BUFF_PAYLOAD: { id: keyof NonNullable<BuffsDraft["guild"]>; noblessIndex: number; activeKey: keyof ScouterUserStat["doping"] }[] = [
  { id: "bossSlayers", noblessIndex: 0, activeKey: "noblessBoss" },
  { id: "forTheGuild", noblessIndex: 1, activeKey: "noblessDmg" },
  { id: "hardHitter", noblessIndex: 2, activeKey: "noblessCriDmg" },
  { id: "undeterred", noblessIndex: 3, activeKey: "noblessIgnore" },
];

function buildBuffsDraft(payload: ScouterUserStat): BuffsDraft {
  const { doping } = payload;
  const draft = emptyBuffsDraft();

  for (const [dopingKey, boolId] of Object.entries(DOPING_BOOL_MAP)) {
    if (doping[dopingKey as keyof ScouterUserStat["doping"]] === true) draft.bools[boolId] = true;
  }

  // Advanced Stat Potion: gated on the `statPotion` boolean (the `stat` level lingers when
  // off). The UI only models tier X (+30), so any active potion maps to it.
  if (doping.statPotion === true) draft.statPotionTier = "10";

  // Guild buffs are active only when the paired boolean is true (see GUILD_BUFF_PAYLOAD).
  for (const { id, noblessIndex, activeKey } of GUILD_BUFF_PAYLOAD) {
    const level = doping.nobless?.[noblessIndex] ?? "0";
    if (doping[activeKey] === true && num(level) > 0) draft.guild[id] = level;
  }

  // Champion's Renown has no on/off, only the account-level value.
  for (const [renownId, dopingKey] of Object.entries(RENOWN_PAYLOAD_KEY)) {
    const level = num(doping[dopingKey] as string | undefined);
    if (level > 0) draft.renown[renownId as keyof NonNullable<BuffsDraft["renown"]>] = String(level);
  }

  return draft;
}

// ── Link Skills step ────────────────────────────────────────────────────────

function buildLinkSkillsDraft(payload: ScouterUserStat): Partial<Record<LinkSkillId, string>> {
  const out: Partial<Record<LinkSkillId, string>> = {};
  for (const [linkId, scouterKey] of Object.entries(LINK_SKILL_TO_SCOUTER_KEY)) {
    if (!scouterKey) continue;
    const level = num(payload.linkSkill?.[scouterKey]);
    if (level > 0) out[linkId as LinkSkillId] = String(level);
  }
  return out;
}

// ── HEXA Matrix step ────────────────────────────────────────────────────────

/** The hexa_matrix draft is JSON.stringify of a partial HexaSkillLevels plus a `hexaStat`
 *  key. useHexaSkillsState.normalizeLevels handles slicing arrays to the class's real node
 *  count and clamping, so a flat 4-length array is fine here. */
function buildHexaDraft(payload: ScouterUserStat): Record<string, unknown> | null {
  const { hexa } = payload;
  const origin = num(hexa.skillCore1);
  const ascent = num(hexa.skillCore2);
  const mastery = [hexa.masteryCore1, hexa.masteryCore2, hexa.masteryCore3, hexa.masteryCore4].map(num);
  const enhancement = [hexa.reinCore1, hexa.reinCore2, hexa.reinCore3, hexa.reinCore4].map(num);
  // common[0] = Sol Janus (huntSkill.solJanus), common[1] = Sol Hecate (hexa.generalCore2).
  const common = [num(payload.huntSkill?.solJanus), num(hexa.generalCore2)];

  const anyData = origin > 0 || ascent > 0 || mastery.some((v) => v > 0)
    || enhancement.some((v) => v > 0) || common.some((v) => v > 0);
  if (!anyData) return null;

  return { origin, ascent, mastery, enhancement, common };
}

export interface MapleScouterImportDrafts {
  /** Partial SetupStepInputById, merged onto the live setup drafts. */
  stepDrafts: SetupStepInputById;
}

/** Turns a parsed export into setup-step draft strings. Every step the MapleScouter Setup
 *  and Full Setup flows share gets seeded, and the flow's own steps then render these for
 *  the player to review before Finish.
 *
 *  `storedRecord` is the character being imported onto, if it's already in the roster. The
 *  stats draft is seeded from its saved stats first, then the import overlays only the
 *  fields it actually has, so an off-class stat, MP, Normal Enemy Damage, or anything else
 *  a player set via the profile Stats pencil survives the import. */
export function mapImportToDrafts(
  result: MapleScouterImportResult,
  storedRecord?: StoredCharacterRecord | null,
): MapleScouterImportDrafts {
  const { payload, classId } = result;
  const classData = CLASS_SKILL_DATA.find((c) => c.id === classId);
  const requiredStats = classData?.requiredStats ?? [];

  const stepDrafts: SetupStepInputById = {};

  const statsBase: StatsStepDraft = storedRecord
    ? storedStatsToStatsStepDraft({
        stats: storedRecord.stats,
        isLiberated: storedRecord.isLiberated,
        weaponHand: storedRecord.weaponHand,
        hasRuinForceShield: storedRecord.hasRuinForceShield,
        soul: storedRecord.soul,
        innerAbilityLine: storedRecord.scouter?.innerAbilityLine,
      })
    : {};
  stepDrafts.stats = serializeStatsStepDraft(buildStatsDraft(payload, classId, requiredStats, statsBase));

  const ozRings = buildOzRingsDraft(payload);
  if (Object.keys(ozRings.levels).length > 0) stepDrafts.oz_rings = serializeOzRingsDraft(ozRings);

  stepDrafts.buffs = serializeBuffsDraft(buildBuffsDraft(payload));

  const linkSkills = buildLinkSkillsDraft(payload);
  if (Object.keys(linkSkills).length > 0) stepDrafts.link_skills = JSON.stringify(linkSkills);

  const hexa = buildHexaDraft(payload);
  if (hexa) stepDrafts.hexa_matrix = JSON.stringify(hexa);

  return { stepDrafts };
}

// ── Compare against a character that's already set up ────────────────────────
//
// If the character being imported onto already has its own MapleScouter data, show the
// player which values the export disagrees with. Some people fill both MapleScouter and
// MapleDoro out by hand and want to confirm nothing drifted. This diffs the export's payload
// against the one MapleDoro would build from the stored character, over a curated list of
// the fields a player actually enters rather than the always-constant plumbing.

export interface ImportFieldDiff {
  label: string;
  /** The value MapleDoro currently has for this character. */
  mine: string;
  /** The value in the uploaded export. */
  imported: string;
}

/** A ScouterUserStat field worth comparing, with how to read and label it. */
interface ComparedField {
  label: string;
  /** Pulls the comparable value out of a payload as a display string. */
  read: (p: ScouterUserStat) => string;
}

/** Normalizes a numeric-ish string so "98.12" and "98.120" or "5" and "5.0" match. */
const normNum = (v: string): string => {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : (v || "0");
};

/** Boolean as a player-facing word rather than "true"/"false". */
const onOff = (v: boolean): string => (v ? "On" : "Off");
const yesNo = (v: boolean): string => (v ? "Yes" : "No");

const statNum = (read: (s: ScouterUserStat["stat"]) => string): ComparedField["read"] =>
  (p) => normNum(read(p.stat));

const tripleStatLabel = (id: TripleStatFieldId): string =>
  TRIPLE_STAT_FIELDS.find((f) => f.id === id)?.label ?? id.toUpperCase();

/** The three sub-values of a triple stat, labeled as the Stats step labels them. */
function tripleFields(
  statLabel: string,
  base: (s: ScouterUserStat["stat"]) => string,
  per: (s: ScouterUserStat["stat"]) => string,
  abs: (s: ScouterUserStat["stat"]) => string,
): ComparedField[] {
  return [
    { label: `${statLabel} (Base Value)`, read: statNum(base) },
    { label: `${statLabel} (% Value)`, read: statNum(per) },
    { label: `${statLabel} (% Not Applied)`, read: statNum(abs) },
  ];
}

/** The fields to diff, in display order. Class-aware: the main/sub/attack stat labels use
 *  this class's real stat names (INT vs STR, Magic ATT vs Attack Power), and the labels
 *  match the Stats setup step's own wording. */
function comparedFields(classId: string, requiredStats: readonly string[]): ComparedField[] {
  const tripleIds = requiredStats.filter((s): s is TripleStatFieldId =>
    s === "str" || s === "dex" || s === "int" || s === "luk");
  const assignment = assignMainSubStats(classId, tripleIds);
  const mainField: TripleStatFieldId | "hp" | null = classId === "demon_avenger" ? "hp" : assignment.main;
  const atkLabel = mainField === "int" ? tripleStatLabel("magicAtt") : tripleStatLabel("attackPower");

  const stat = (id: keyof typeof STAT_LABELS): string => STAT_LABELS[id] ?? String(id);

  return [
    { label: "Level", read: statNum((s) => s.level) },
    ...(mainField ? tripleFields(tripleStatLabel(mainField), (s) => s.mainStatBase, (s) => s.mainStatPer, (s) => s.mainStatAbs) : []),
    ...(assignment.sub ? tripleFields(tripleStatLabel(assignment.sub), (s) => s.subStatBase, (s) => s.subStatPer, (s) => s.subStatAbs) : []),
    ...(assignment.ssub ? tripleFields(tripleStatLabel(assignment.ssub), (s) => s.ssubStatBase, (s) => s.ssubStatPer, (s) => s.ssubStatAbs) : []),
    ...tripleFields(atkLabel, (s) => s.atkBase, (s) => s.atkPercent, (s) => s.atkAbs),
    { label: stat("damage"), read: statNum((s) => s.dmg) },
    { label: stat("bossDamage"), read: statNum((s) => s.bossDmg) },
    // Normal Enemy Damage deliberately not compared, since buildStatsDraft doesn't map it.
    { label: stat("ignoreDefense"), read: statNum((s) => s.ignoreDef) },
    { label: stat("criticalRate"), read: statNum((s) => s.critical) },
    { label: stat("criticalDamage"), read: statNum((s) => s.criticalDmg) },
    { label: stat("buffDuration"), read: statNum((s) => s.buffDuration) },
    { label: `${stat("cooldownReduction")} (sec)`, read: statNum((s) => s.coolTimeReduce) },
    { label: `${stat("cooldownReduction")} (%)`, read: statNum((s) => s.coolTimeReducePercent) },
    { label: stat("cooldownSkip"), read: statNum((s) => s.resetCoolDown) },
    { label: stat("ignoreElementalResistance"), read: statNum((s) => s.ignoreElementalResist) },
    { label: stat("additionalStatusDamage"), read: statNum((s) => s.statusAdditionalDmg) },
    { label: stat("summonDuration"), read: statNum((s) => s.summonPersistTime) },
    { label: stat("arcanePower"), read: statNum((s) => s.arcaneForce) },
    { label: stat("sacredPower"), read: statNum((s) => s.authenticForce) },
    // Weapon ATT deliberately not compared, since MapleScouter ignores it (buildStatsDraft).
    { label: "Inner Ability: +1 Passive Skill Level", read: (p) => yesNo(p.stat.passiveSkillLevelUp === true) },
    { label: "Inner Ability: +1 Attack Target", read: (p) => yesNo(p.stat.increaseTarget === true) },
    // Compare the Legion rank, not the raw union level. What MapleDoro stores and what the
    // import maps is the bracket, where 250 and 255 are both SSS, so raw-level differences
    // inside one bracket aren't real differences.
    { label: "Wild Hunter Legion rank", read: (p) => whRankForLevel(num(p.stat.wildhunterUnion)) ?? "None" },
    { label: "Legion Artifact: +1 target", read: (p) => yesNo(p.stat.artifact_increaseTarget === true) },
    { label: "Legion Artifact: Final Attack Damage %", read: (p) => normNum(p.stat.artifact_finalAttack) },
    { label: "Genesis Liberation", read: (p) => yesNo(p.special.genesis === true) },
    { label: "Mu Gong Soul", read: (p) => normNum(p.special.mugongSoul) },
    { label: "Ephenia Soul", read: (p) => normNum(p.special.epiSoul) },
    { label: "Ring of Restraint", read: (p) => normNum(p.special.restraintRing) },
    { label: "Weapon Jump Ring", read: (p) => normNum(p.special.weaponRing) },
    { label: "Continuous Ring", read: (p) => normNum(p.special.continuosRing) },
    { label: "HEXA Origin", read: (p) => normNum(p.hexa.skillCore1) },
    { label: "HEXA Ascent", read: (p) => normNum(p.hexa.skillCore2) },
    { label: "HEXA Mastery", read: (p) => [p.hexa.masteryCore1, p.hexa.masteryCore2, p.hexa.masteryCore3, p.hexa.masteryCore4].map(normNum).join("/") },
    { label: "HEXA Enhancement", read: (p) => [p.hexa.reinCore1, p.hexa.reinCore2, p.hexa.reinCore3, p.hexa.reinCore4].map(normNum).join("/") },
    { label: "Sol Janus", read: (p) => normNum(p.huntSkill?.solJanus ?? "0") },
    { label: "Sol Hecate", read: (p) => normNum(p.hexa.generalCore2) },
    ...linkSkillFields(),
    ...buffFields(),
  ];
}

/** One row per link skill MapleScouter accepts (LINK_SKILL_TO_SCOUTER_KEY), labeled with
 *  its in-game name. */
function linkSkillFields(): ComparedField[] {
  return Object.entries(LINK_SKILL_TO_SCOUTER_KEY).map(([linkId, scouterKey]) => {
    const name = LINK_SKILLS.find((s) => s.id === linkId)?.name ?? linkId;
    return {
      label: `Link Skill: ${name}`,
      read: (p: ScouterUserStat) => normNum(p.linkSkill?.[scouterKey as string] ?? "0"),
    };
  });
}

const boolBuffName = (id: string): string => {
  // MapleScouter shows "Fish Buff" but GMS uses a different item (i.e: Tree Ornament).
  // Spell out both so someone cross-checking their MapleScouter setup recognizes the row.
  if (id === "fishBuff") return "Tree Ornament (Fish Buff)";
  return BOOL_BUFFS.find((b) => b.id === id)?.name ?? id;
};

const guildBuffName = (id: string): string => GUILD_BUFFS.find((b) => b.id === id)?.name ?? id;

/** One row per buff MapleDoro tracks: the on/off doping flags, guild buff levels, Advanced
 *  Stat Potion, and Champion's Renown. Mirrors scouterApi.ts's buildDoping. */
function buffFields(): ComparedField[] {
  const bools: ComparedField[] = Object.entries(DOPING_BOOL_MAP).map(([dopingKey, boolId]) => ({
    label: boolBuffName(boolId),
    read: (p: ScouterUserStat) => onOff(p.doping[dopingKey as keyof ScouterUserStat["doping"]] === true),
  }));

  // Guild buffs: MapleScouter keeps the level in `nobless` when the buff is off, so compare
  // the effective level (0 when the on/off boolean is false), matching how buildBuffsDraft
  // and scouterApi.ts's buildDoping treat it.
  const guild: ComparedField[] = GUILD_BUFF_PAYLOAD.map(({ id, noblessIndex, activeKey }) => ({
    label: `${guildBuffName(id)} (guild)`,
    read: (p: ScouterUserStat) => (p.doping[activeKey] === true ? normNum(p.doping.nobless?.[noblessIndex] ?? "0") : "0"),
  }));

  const statPotion: ComparedField = {
    label: "Advanced Stat Potion",
    // Gated on the `statPotion` boolean (level lingers when off); MapleDoro only models tier X.
    read: (p: ScouterUserStat) => onOff(p.doping.statPotion === true),
  };

  const renown: ComparedField[] = RENOWN_STATS.map(({ id, shortLabel }) => ({
    label: `Renown: ${shortLabel}`,
    read: (p: ScouterUserStat) => normNum(p.doping[RENOWN_PAYLOAD_KEY[id]] as string | undefined ?? "0"),
  }));

  return [...bools, ...guild, statPotion, ...renown];
}

/** Diffs an export against the character it's being imported onto. Returns an empty list
 *  when the character has no MapleScouter data to compare (first-time setup, unsupported
 *  class, or never set up), or when nothing differs. */
export function compareImportToStored(
  result: MapleScouterImportResult,
  storedCharacter: StoredCharacterRecord,
  ctx: ScouterPayloadContext,
): ImportFieldDiff[] {
  // During first-time setup the "stored" record is a bare lookup result (name/level/job
  // only, no stats or tools blob) cast to StoredCharacterRecord. buildScouterPayload reads
  // character.stats.<field> and would throw. There is nothing to compare against anyway.
  if (!storedCharacter.stats || typeof storedCharacter.stats !== "object") return [];

  const mine = buildScouterPayload(storedCharacter, ctx);
  if (!mine) return [];
  // A blank character, added but never set up, has an all-zero payload. There's nothing
  // meaningful to compare against, so treat it as having no existing data.
  if (normNum(mine.stat.mainStatBase) === "0" && normNum(mine.stat.atkBase) === "0") return [];

  const classData = CLASS_SKILL_DATA.find((c) => c.id === result.classId);
  const fields = comparedFields(result.classId, classData?.requiredStats ?? []);
  const imported = result.payload;
  const diffs: ImportFieldDiff[] = [];
  for (const field of fields) {
    const a = field.read(mine);
    const b = field.read(imported);
    if (a !== b) diffs.push({ label: field.label, mine: a, imported: b });
  }
  return diffs;
}
