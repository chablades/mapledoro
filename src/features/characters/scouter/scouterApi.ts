/*
  Builds the exact request body MapleScouter's calc API expects (POST
  https://api.maplescouter.com/api/calc/dmg, body `{ userStat: ScouterUserStat }`),
  from a character's own stored data. Every field here comes from real captured requests and
  responses on maplescouter.com. Do not re-derive any of it from guesses; capture a real
  request and response instead when a field's meaning is unclear.

  Not every character can be sent at all: the legacy job names have no MapleScouter class
  to map to, so buildScouterPayload returns null for them, callers must show a "not
  available for this class" state rather than attempting a fetch with nowhere to route to.
*/

import type { CharacterSoul, StoredCharacterRecord, StoredScouterLegion, StoredScouterBuffs, LinkSkillsData, LinkSkillId, WhLegionRank } from "../model/charactersStore";
import { readCharactersStore, selectCharactersList } from "../model/charactersStore";
import { CLASS_SKILL_DATA, getRequiredStatsForClass } from "../setup/data/classSkillData";
import type { TripleStatFieldId } from "../setup/data/statFields";
import { isRebootWorld } from "../setup/data/rebootData";
import {
  isArcaneEligible, isSacredEligible, isStatsSubstepComplete,
  MAIN_STAT_IDS, TRIPLE_IDS, type StatsStepDraft,
} from "../setup/data/statsStepDraft";
import { deriveWeaponHandFromWeapon } from "../setup/data/classBranch";
import { innerAbilityHasData } from "../setup/data/innerAbilityData";
import { whAutofillSourceFromRoster } from "../setup/data/scouterQuestionsData";
import { OZ_RING_MAX_LEVEL, type OzRingId } from "../setup/data/ozRingData";
import { scouterKoreanClassName } from "./scouterClassNames";
import { LINK_SKILL_TO_SCOUTER_KEY, SCOUTER_UNMODELED_LINK_SKILL_KEYS } from "./scouterLinkSkills";
import { readCharacterToolData } from "../../tools/characterToolStorage";
import type { HexaSkillLevels } from "../../tools/hexa-skills/hexa-classes";
import { COMMON_SKILLS } from "../../tools/hexa-skills/hexa-classes";
import { critRateToCritDmg } from "../../tools/stat-optimizer/scouter-class-data";

// ── Request shape ──────────────────────────────────────────────────────────────

export interface ScouterDoping {
  bigHero: boolean;
  greatIgnoreGuard: boolean;
  dragonsMeal: boolean;
  extreme: boolean;
  fish: boolean;
  guildBlessing: boolean;
  jangBi: boolean;
  legendHero: boolean;
  legendHp: boolean;
  rebootAtkPotion: boolean;
  shiningRed: boolean;
  shiningBlue: boolean;
  statPotion: boolean;
  stat: string;
  superPower: boolean;
  unionsPower: boolean;
  urus: boolean;
  heroesHawl: boolean;
  noblessBoss: boolean;
  noblessDmg: boolean;
  noblessCriDmg: boolean;
  noblessIgnore: boolean;
  nobless: [string, string, string, string];
  sayram: boolean;
  collector: boolean;
  buff275: boolean;
  additional1: boolean;
  additional2: boolean;
  championAll: string;
  championAtk: string;
  championBoss: string;
  championIgnore: string;
  championCriDmg: string;
  authenticDmg: boolean;
  moonshine: boolean;
  cake: boolean;
  apple: boolean;
  tengu: boolean;
  candy: boolean;
  house: boolean;
  wedding: boolean;
  specialWedding: boolean;
  whiteBear: boolean;
  ultraVip: boolean;
  superVip: boolean;
  truffle: boolean;
  medal: boolean;
  hyperRainbow: boolean;
  rainbow: boolean;
  thanks: boolean;
  genePass: boolean;
  // Not a GMS buff, so always "0" here, the same treatment as the KMS-only seed rings below
  // (see buildSeedRing).
  criDmgRing: "0";
}

export interface ScouterSpecial {
  isReboot: boolean;
  combat: true;
  epiSoul: string;
  mugongSoul: string;
  genesis: boolean;
  oneHandSword: boolean;
  useRuinForceShild: boolean;
  // Removed from GMS in the ring consolidation (no more standard-vs-continuous choice, no
  // Totalling Ring). The API still accepts these fields, so they're sent as inert
  // constants, the same treatment as riskTaker and the non-GMS seed rings below.
  useContinuousRingAsMainRing: false;
  restraintRing: string;
  weaponRing: string;
  ringOfSum: "0";
  riskTaker: "0";
  statThird: "0";
  statFourth: "0";
  continuosRing: string;
  challenge: false;
  is30min: false;
  destiny2ndSkill: false;
  famPassiveUp: false;
}

export interface ScouterStat {
  myClass: string;
  level: string;
  mainStatBase: string;
  mainStatPer: string;
  mainStatAbs: string;
  subStatBase: string;
  subStatPer: string;
  subStatAbs: string;
  ssubStatBase: string;
  ssubStatPer: string;
  ssubStatAbs: string;
  arcaneForce: string;
  authenticForce: string;
  // A later tribe-force stat no GMS class uses yet, unreleased content given the same
  // treatment as hexa's skillCore3 through 6 below. Always "0" until something needs it.
  classForce: "0";
  atkBase: string;
  atkAbs: string;
  dmg: string;
  bossDmg: string;
  normalDmg: string;
  ignoreDef: string;
  buffDuration: string;
  critical: string;
  criticalDmg: string;
  weaponAtk: string;
  atkPercent: string;
  coolTimeReducePercent: string;
  coolTimeReduce: string;
  wildhunterUnion: string;
  resetCoolDown: string;
  statusAdditionalDmg: string;
  passiveSkillLevelUp: boolean;
  increaseTarget: boolean;
  summonPersistTime: string;
  artifact_increaseTarget: boolean;
  artifact_finalAttack: string;
  subStat_hyper: "";
  subStat_ability: "";
  subStat_union: "";
  subStat_doping: "";
  subStat_afterDoping: "";
  ssubStat_hyper: "";
  ssubStat_ability: "";
  ssubStat_union: "";
  ssubStat_doping: "";
  ssubStat_afterDoping: "";
  ignoreElementalResist: string;
  maple_combatPower: "";
  tms_fd: "0";
  // TMS (Taiwan) soul weapon stat. Always "0" on GMS.
  tms_soul: "0";
}

interface ScouterSeedRingEntry {
  level: string;
  efficiency: 0;
}

export interface ScouterSeedRing {
  restraintRing: ScouterSeedRingEntry;
  weaponRing: ScouterSeedRingEntry;
  ringOfSum: ScouterSeedRingEntry;
  riskTakerRing: ScouterSeedRingEntry;
  criDamageRing: ScouterSeedRingEntry;
  levelRing: ScouterSeedRingEntry;
  continuosRing: ScouterSeedRingEntry;
  ultiRing: ScouterSeedRingEntry;
  durabilityRing: ScouterSeedRingEntry;
}

export interface ScouterHexa {
  skillCore1: string;
  skillCore2: string;
  // GMS has no content for skill cores past Origin and Ascent yet, so these stay "0" until
  // something releases into one of these slots.
  skillCore3: "0";
  skillCore4: "0";
  skillCore5: "0";
  skillCore6: "0";
  masteryCore1: string;
  masteryCore2: string;
  masteryCore3: string;
  masteryCore4: string;
  reinCore1: string;
  reinCore2: string;
  reinCore3: string;
  reinCore4: string;
  generalCore2: string;
  generalCore3: string;
  generalCore4: string;
  hexaStat: 2;
  character_class: string;
  // A nested duplicate of the flat core fields above, numeric rather than string. Required by
  // /calc/dmg-simulator specifically; the plain /calc/dmg endpoint works without it.
  hexaSkill: {
    skillCore1: number; skillCore2: number; skillCore3: 0;
    masteryCore1: number; masteryCore2: number; masteryCore3: number; masteryCore4: number;
    reinCore1: number; reinCore2: number; reinCore3: number; reinCore4: number;
  };
  hexaSkill_general: { generalCore1: 0; generalCore2: number; generalCore3: number };
  // MapleScouter's derived summary of Erda spent and meso cost. There is no source for it
  // here, and it reads as informational rather than validated, so it stays at 0.
  hexaSkill_used: { sole_Erda: 0; sole_ErdaPrice: 0 };
  hexaStat_opened: false;
}

interface ScouterPower {
  mainStatBase: 0;
  mainStatPer: 0;
  mainStatAbs: 0;
  subStatBase: 0;
  subStatPer: 0;
  subStatAbs: 0;
  ssubStatBase: 0;
  ssubStatPer: 0;
  ssubStatAbs: 0;
  atk: 0;
  atkPer: 0;
  bossDmg: 0;
  criDmg: 0;
}

export interface ScouterUserStat {
  doping: ScouterDoping;
  linkSkill: Record<string, string>;
  special: ScouterSpecial;
  stat: ScouterStat;
  hexa: ScouterHexa;
  seedRing: ScouterSeedRing;
  entireStat: { str: "0"; dex: "0"; int: "0"; luk: "0" };
  isGMS: true;
  isTMS: false;
  isJMS: false;
  isMSEA: false;
  power: ScouterPower;
  huntSkill: { solJanus: string; erdaShower: "0" };
}

// ── Buffs ────────────────────────────────────────────────────────────────────

const ZERO_POWER: ScouterPower = {
  mainStatBase: 0, mainStatPer: 0, mainStatAbs: 0,
  subStatBase: 0, subStatPer: 0, subStatAbs: 0,
  ssubStatBase: 0, ssubStatPer: 0, ssubStatAbs: 0,
  atk: 0, atkPer: 0, bossDmg: 0, criDmg: 0,
};

const ZERO_ENTIRE_STAT = { str: "0", dex: "0", int: "0", luk: "0" } as const;

/** Renown level (0-5) as a string, or "0" if unset. */
function renownLevel(buffs: StoredScouterBuffs | undefined, key: "allStats" | "atkMagAtk" | "bossDmg" | "ignoreDef" | "critDmg"): string {
  return String(buffs?.renown?.[key] ?? 0);
}

/** Builds the doping (buffs) block from a plain StoredScouterBuffs, not read directly off a
 *  character. That lets buildScouterPayload pass the Scouter Simulator popup's draft-derived
 *  buffs override in place of the character's real ones without a separate code path. */
function buildDoping(buffs: StoredScouterBuffs | undefined): ScouterDoping {
  const bossSlayers = buffs?.bossSlayers ?? 0;
  const forTheGuild = buffs?.forTheGuild ?? 0;
  const hardHitter = buffs?.hardHitter ?? 0;
  const undeterred = buffs?.undeterred ?? 0;
  return {
    bigHero: Boolean(buffs?.greatHeroBoost),
    greatIgnoreGuard: false,
    dragonsMeal: false,
    extreme: Boolean(buffs?.extremePotion),
    fish: Boolean(buffs?.fishBuff),
    // MapleScouter's own site always sends true here, but the field is inert: true and false
    // return a byte-identical response, covering every boss figure, converted power, dojo and
    // the whole specEfficiency table, both fully buffed and with every other doping flag off.
    // Left false rather than mirroring their true.
    guildBlessing: false,
    jangBi: Boolean(buffs?.advWeaponTempering),
    legendHero: Boolean(buffs?.legendaryHero),
    legendHp: false,
    rebootAtkPotion: false,
    shiningRed: Boolean(buffs?.sparklingRedStar),
    shiningBlue: Boolean(buffs?.sparklingBlueStar),
    statPotion: (buffs?.statPotionValue ?? 0) > 0,
    stat: String(buffs?.statPotionValue ?? 0),
    superPower: Boolean(buffs?.mvpSuperpower),
    unionsPower: Boolean(buffs?.legionMight),
    urus: Boolean(buffs?.masarayuGift),
    heroesHawl: Boolean(buffs?.heroEcho),
    noblessBoss: bossSlayers > 0,
    noblessDmg: forTheGuild > 0,
    noblessCriDmg: hardHitter > 0,
    noblessIgnore: undeterred > 0,
    nobless: [String(bossSlayers), String(forTheGuild), String(hardHitter), String(undeterred)],
    sayram: Boolean(buffs?.sayramElixir),
    collector: Boolean(buffs?.collectorElixir),
    buff275: Boolean(buffs?.honorableElixir),
    additional1: Boolean(buffs?.vipBuff),
    additional2: false,
    championAll: renownLevel(buffs, "allStats"),
    championAtk: renownLevel(buffs, "atkMagAtk"),
    championBoss: renownLevel(buffs, "bossDmg"),
    championIgnore: renownLevel(buffs, "ignoreDef"),
    championCriDmg: renownLevel(buffs, "critDmg"),
    authenticDmg: Boolean(buffs?.maxedSacredSymbol),
    moonshine: Boolean(buffs?.brightMoonlight),
    cake: false,
    apple: Boolean(buffs?.onyxApple),
    tengu: Boolean(buffs?.tengusJudgement),
    candy: Boolean(buffs?.candiedApple),
    house: Boolean(buffs?.caretakerSupport),
    wedding: false,
    specialWedding: false,
    whiteBear: false,
    ultraVip: false,
    superVip: false,
    truffle: false,
    medal: false,
    hyperRainbow: false,
    rainbow: false,
    thanks: false,
    genePass: Boolean(buffs?.genepass),
    criDmgRing: "0",
  };
}

// ── Special ──────────────────────────────────────────────────────────────────

/** Ephenia or Mu Gong soul level in MapleScouter's string encoding, capped at "2". Never send
 *  "C", which zeroes out the whole result. The simulator's Info tab can override the
 *  character's real soul with a what-if through `infoSoul`. */
function soulValue(character: StoredCharacterRecord, type: "ephenia" | "mugong", infoSoul?: CharacterSoul): string {
  const soul = infoSoul ?? character.soul;
  if (!soul || soul.type !== type) return "0";
  return soul.soulLevel === 1 || soul.soulLevel === 2 ? String(soul.soulLevel) : "0";
}

/** Optional per-ring level overrides for the Scouter Simulator's Oz Rings tab. Undefined or
 *  omitted means use the character's real saved value, matching every other simulator
 *  override in this file. */
export interface OzRingOverrides {
  levels?: Partial<Record<OzRingId, number>>;
}

function ozRingLevel(character: StoredCharacterRecord, ring: OzRingId, overrides?: OzRingOverrides): string {
  const raw = overrides?.levels?.[ring] ?? character.scouter?.ozRings?.levels[ring] ?? 0;
  // Clamp to the ring's current max so a pre-consolidation Weapon Jump level above 4,
  // still sitting in stored data until the character re-saves, isn't sent as-is.
  return String(Math.min(raw, OZ_RING_MAX_LEVEL[ring]));
}

function buildSpecial(character: StoredCharacterRecord, ringOverrides?: OzRingOverrides, info?: SimulatorInfoOverrides): ScouterSpecial {
  return {
    isReboot: isRebootWorld(character.worldID),
    combat: true,
    epiSoul: soulValue(character, "ephenia", info?.soul),
    mugongSoul: soulValue(character, "mugong", info?.soul),
    genesis: info?.isLiberated ?? character.isLiberated === true,
    oneHandSword: (info?.weaponHand ?? character.weaponHand) === "1h",
    useRuinForceShild: info?.hasRuinForceShield ?? character.hasRuinForceShield === true,
    useContinuousRingAsMainRing: false,
    restraintRing: ozRingLevel(character, "restraint", ringOverrides),
    weaponRing: ozRingLevel(character, "weaponJump", ringOverrides),
    ringOfSum: "0",
    riskTaker: "0",
    statThird: "0",
    statFourth: "0",
    continuosRing: ozRingLevel(character, "continuous", ringOverrides),
    challenge: false,
    is30min: false,
    destiny2ndSkill: false,
    famPassiveUp: false,
  };
}

// ── Stat ─────────────────────────────────────────────────────────────────────

/** The 4 real stats, in the fixed order MapleScouter's off-stat total-value fields expect. */
const REAL_STATS: TripleStatFieldId[] = ["str", "dex", "int", "luk"];

const TRIPLE_STAT_FIELD_IDS = new Set<string>(["str", "dex", "int", "luk", "hp", "attackPower", "magicAtt"]);

function isTripleStatField(id: string): id is TripleStatFieldId {
  return TRIPLE_STAT_FIELD_IDS.has(id);
}

export interface MainSubAssignment {
  main: TripleStatFieldId | null;
  sub: TripleStatFieldId | null;
  ssub: TripleStatFieldId | null;
}

/** Which real stat (STR/DEX/INT/LUK) each of MapleScouter's main/sub/ssub stat slots
 *  corresponds to for a class. Exported so the reverse direction (importing a MapleScouter
 *  export back into MapleDoro, see maplescouterImportData.ts) can un-map slot values to
 *  the right per-stat draft fields. */
export function assignMainSubStats(classId: string, requiredStats: TripleStatFieldId[]): MainSubAssignment {
  const realStatSlots = requiredStats.filter((s) => REAL_STATS.includes(s));
  const [first = null, second = null, third = null] = realStatSlots;
  if (classId === "demon_avenger") {
    // Demon Avenger's Main Stat is HP (buildStat overrides mainField to "hp" directly),
    // so its one real stat slot, STR in `first`, belongs in Sub rather than Main. Otherwise
    // STR is discarded when mainField is overridden and never reaches the payload.
    return { main: null, sub: first, ssub: third };
  }
  return { main: first, sub: second, ssub: third };
}

/** Reads a stat's Base/%/Not-Applied triple as MapleScouter's Base/Per/Abs strings.
 *  Demon Avenger's Main Stat is HP, not one of the 4 real stats. */
function tripleStrings(character: StoredCharacterRecord, field: TripleStatFieldId | null): { base: string; per: string; abs: string } {
  if (!field) return { base: "0", per: "0", abs: "0" };
  const triple = character.stats[field];
  return { base: triple.base || "0", per: triple.percent || "0", abs: triple.percentUnapplied || "0" };
}

function buildStat(
  character: StoredCharacterRecord,
  classId: string,
  koreanClassName: string,
  assignment: MainSubAssignment,
  legion: StoredScouterLegion | undefined,
  info: SimulatorInfoOverrides | undefined,
): ScouterStat {
  // Info-tab what-ifs for the account-level fields: undefined falls back to the real
  // per-world value, exactly as the non-simulated payload reads it.
  const innerAbilityLine = info?.innerAbilityLine ?? character.scouter?.innerAbilityLine;
  const artifactExtraTarget = info?.artifactExtraTarget ?? legion?.artifactExtraTarget === true;
  const artifactFinalAttackDmg = info?.artifactFinalAttackDmg ?? legion?.artifactFinalAttackDmg ?? 0;
  const wildhunterUnion = info?.wildHunterRank !== undefined
    ? wildHunterUnionLevelForRank(info.wildHunterRank)
    : wildHunterUnionLevel(legion);
  const mainField = classId === "demon_avenger" ? "hp" : assignment.main;
  const main = tripleStrings(character, mainField);
  const sub = tripleStrings(character, assignment.sub);
  const ssub = tripleStrings(character, assignment.ssub);
  const isIntBased = mainField === "int";
  const atk = isIntBased ? character.stats.magicAtt : character.stats.attackPower;

  return {
    myClass: koreanClassName,
    level: String(character.level),
    mainStatBase: main.base,
    mainStatPer: main.per,
    mainStatAbs: main.abs,
    subStatBase: sub.base,
    subStatPer: sub.per,
    subStatAbs: sub.abs,
    ssubStatBase: ssub.base,
    ssubStatPer: ssub.per,
    ssubStatAbs: ssub.abs,
    arcaneForce: character.stats.arcanePower || "0",
    authenticForce: character.stats.sacredPower || "0",
    classForce: "0",
    atkBase: atk.base || "0",
    atkAbs: atk.percentUnapplied || "0",
    dmg: character.stats.damage || "0",
    bossDmg: character.stats.bossDamage || "0",
    // The field is greyed out on MapleScouter's own site, so it reads as dead input on their
    // end rather than something worth collecting from users here. Sending 0 is safe and the
    // result still matches theirs. Their site sends a bogus nonzero value regardless, seen as
    // "37" in captures, which is their dead field's leftover state rather than a real stat, so
    // this deliberately sends 0 instead of replicating it.
    normalDmg: character.stats.normalEnemyDamage || "0",
    ignoreDef: character.stats.ignoreDefense || "0",
    buffDuration: character.stats.buffDuration || "0",
    // MapleScouter's own form rejects anything below 100%, since its damage formulas assume you
    // always crit. Clamped up to 100 here rather than validating or blocking the field, so the
    // stored number stays a real unrestricted stat useful elsewhere and only the payload is
    // floored. A value above 100 is sent as-is and uncapped, since some classes such as
    // Marksman get real damage benefit from over-capping crit rate.
    critical: String(Math.max(Number(character.stats.criticalRate || "0"), 100)),
    criticalDmg: character.stats.criticalDamage || "0",
    // MapleScouter removed the Weapon ATT input from its UI and the API ignores whatever value
    // it is sent: 0, a real number and garbage all return a byte-identical result. The field
    // is still accepted, so it goes as an inert "0", like ringOfSum and riskTaker.
    weaponAtk: "0",
    atkPercent: atk.percent || "0",
    coolTimeReducePercent: character.stats.cooldownReduction.percent || "0",
    coolTimeReduce: character.stats.cooldownReduction.seconds || "0",
    wildhunterUnion: String(wildhunterUnion),
    resetCoolDown: character.stats.cooldownSkip || "0",
    statusAdditionalDmg: character.stats.additionalStatusDamage || "0",
    // The two Inner Ability lines MapleScouter cares about, per IA_LINE_OPTIONS in
    // scouterQuestionsData.ts. These were hardcoded false, so innerAbilityLine was collected
    // and gated on but never reached the payload.
    passiveSkillLevelUp: innerAbilityLine === "passive",
    increaseTarget: innerAbilityLine === "multiTarget",
    summonPersistTime: character.stats.summonDuration || "0",
    // Real MapleScouter capture sends this as an actual boolean, not "1"/"0".
    artifact_increaseTarget: artifactExtraTarget,
    artifact_finalAttack: String(artifactFinalAttackDmg),
    subStat_hyper: "",
    subStat_ability: "",
    subStat_union: "",
    subStat_doping: "",
    subStat_afterDoping: "",
    ssubStat_hyper: "",
    ssubStat_ability: "",
    ssubStat_union: "",
    ssubStat_doping: "",
    ssubStat_afterDoping: "",
    ignoreElementalResist: character.stats.ignoreElementalResistance || "0",
    maple_combatPower: "",
    tms_fd: "0",
    tms_soul: "0",
  };
}

/** Wild Hunter legion rank's bracket-min level (B->60 ... SSS->250), the reverse of
 *  scouterQuestionsData.ts's whRankForLevel, since MapleScouter wants the raw level
 *  MapleScouter's own site uses as the union-effect input, not the letter grade. */
const WH_RANK_TO_LEVEL: Record<string, number> = { B: 60, A: 100, S: 140, SS: 200, SSS: 250 };

function wildHunterUnionLevelForRank(rank: WhLegionRank | "none" | undefined): number {
  return rank && rank !== "none" ? (WH_RANK_TO_LEVEL[rank] ?? 0) : 0;
}

function wildHunterUnionLevel(legion: StoredScouterLegion | undefined): number {
  return wildHunterUnionLevelForRank(legion?.wildHunterRank);
}

// ── Hexa ─────────────────────────────────────────────────────────────────────

const SOL_JANUS_INDEX = COMMON_SKILLS.findIndex((s) => s.name === "Sol Janus");
const SOL_HECATE_INDEX = COMMON_SKILLS.findIndex((s) => s.name === "Sol Hecate");
// The 3rd Common Node sits straight after the two Sol skills in every class's common list.
const COMMON3_INDEX = COMMON_SKILLS.length;

function hexaCoreLevels(levels: HexaSkillLevels | undefined, isHexaEligible: boolean): { skillCore1: string; skillCore2: string; mastery: string[]; rein: string[] } {
  return {
    // Origin always starts at level 1 once HEXA-eligible (real game rule, same floor
    // useHexaSkillsState.ts's defaultLevels/normalizeLevels enforce) for a character who
    // has not opened the HEXA Skills tool yet. Not for a sub-260 or legacy character, who has
    // no Origin at all, which is why gating on isHexaEligible keeps that case at 0.
    skillCore1: String(levels?.origin ?? (isHexaEligible ? 1 : 0)),
    skillCore2: String(levels?.ascent ?? 0),
    mastery: [0, 1, 2, 3].map((i) => String(levels?.mastery[i] ?? 0)),
    rein: [0, 1, 2, 3].map((i) => String(levels?.enhancement[i] ?? 0)),
  };
}

interface HexaBuildResult {
  hexa: ScouterHexa;
  solJanusLevel: number;
}

function buildHexa(characterName: string, isHexaEligible: boolean, koreanClassName: string): HexaBuildResult {
  const saved = readCharacterToolData<{ levels?: HexaSkillLevels }>(characterName, "hexaSkills");
  const cores = hexaCoreLevels(saved?.levels, isHexaEligible);
  const solJanusLevel = SOL_JANUS_INDEX >= 0 ? (saved?.levels?.common[SOL_JANUS_INDEX] ?? 0) : 0;
  const solHecateLevel = SOL_HECATE_INDEX >= 0 ? (saved?.levels?.common[SOL_HECATE_INDEX] ?? 0) : 0;
  const common3Level = saved?.levels?.common[COMMON3_INDEX] ?? 0;

  return {
    hexa: {
      skillCore1: cores.skillCore1,
      skillCore2: cores.skillCore2,
      skillCore3: "0",
      skillCore4: "0",
      skillCore5: "0",
      skillCore6: "0",
      masteryCore1: cores.mastery[0],
      masteryCore2: cores.mastery[1],
      masteryCore3: cores.mastery[2],
      masteryCore4: cores.mastery[3],
      reinCore1: cores.rein[0],
      reinCore2: cores.rein[1],
      reinCore3: cores.rein[2],
      reinCore4: cores.rein[3],
      // generalCore2 = Sol Hecate, generalCore3 = the 3rd Common Node v271 gave every class
      // (the HEXA form of its branch's 5th job common skill). generalCore4 has no known
      // content at all, so it stays "0" until something real releases into that slot. No
      // generalCore1, which GMS does not have yet either, and maplescouter.com's own request
      // omits that key entirely rather than sending "0" as it does for generalCore3 and 4.
      generalCore2: String(solHecateLevel),
      generalCore3: String(common3Level),
      generalCore4: "0",
      hexaStat: 2,
      character_class: koreanClassName,
      hexaSkill: {
        skillCore1: Number(cores.skillCore1), skillCore2: Number(cores.skillCore2), skillCore3: 0,
        masteryCore1: Number(cores.mastery[0]), masteryCore2: Number(cores.mastery[1]),
        masteryCore3: Number(cores.mastery[2]), masteryCore4: Number(cores.mastery[3]),
        reinCore1: Number(cores.rein[0]), reinCore2: Number(cores.rein[1]),
        reinCore3: Number(cores.rein[2]), reinCore4: Number(cores.rein[3]),
      },
      hexaSkill_general: { generalCore1: 0, generalCore2: solHecateLevel, generalCore3: common3Level },
      hexaSkill_used: { sole_Erda: 0, sole_ErdaPrice: 0 },
      hexaStat_opened: false,
    },
    solJanusLevel,
  };
}

// ── Seed ring / Link skill ────────────────────────────────────────────────────

const ZERO_RING: ScouterSeedRingEntry = { level: "0", efficiency: 0 };

function buildSeedRing(character: StoredCharacterRecord, ringOverrides?: OzRingOverrides): ScouterSeedRing {
  return {
    // efficiency is always 0 here, even for rings there is real level data for. A real
    // maplescouter.com request sends nonzero per-ring efficiency numbers, but the result
    // matches with these at 0, so the API appears to compute this from `level` rather than
    // trusting the request. Left as a known mismatch rather than guessing at their
    // formula; revisit if a real result ever depends on it.
    restraintRing: { level: ozRingLevel(character, "restraint", ringOverrides), efficiency: 0 },
    weaponRing: { level: ozRingLevel(character, "weaponJump", ringOverrides), efficiency: 0 },
    continuosRing: { level: ozRingLevel(character, "continuous", ringOverrides), efficiency: 0 },
    // ringOfSum (Totalling Ring) was removed from GMS in the ring consolidation; the API
    // still accepts the field so it's sent zeroed, like the non-GMS rings below.
    ringOfSum: ZERO_RING,
    // Non-GMS rings, mapledoro has no data for these and can't collect any.
    riskTakerRing: ZERO_RING,
    criDamageRing: ZERO_RING,
    levelRing: ZERO_RING,
    ultiRing: ZERO_RING,
    durabilityRing: ZERO_RING,
  };
}

/** Reads this character's own link skill levels directly. Scouter's calc needs what is
 *  equipped on this character, not a shared world total. See linkSkillsData.ts's file-header
 *  reasoning: mastery is shared per-world, but equipping is per-character. */
function buildLinkSkill(linkSkills: LinkSkillsData | undefined): Record<string, string> {
  const stored = linkSkills ?? {};
  const out: Record<string, string> = {};
  for (const [id, scouterKey] of Object.entries(LINK_SKILL_TO_SCOUTER_KEY)) {
    out[scouterKey] = String(stored[id as LinkSkillId] ?? 0);
  }
  for (const key of SCOUTER_UNMODELED_LINK_SKILL_KEYS) {
    out[key] = "0";
  }
  return out;
}

// ── Setup completeness gate ──────────────────────────────────────────────────

/** Which of MapleScouter Setup's completeness requirements this character is still missing, or
 *  null when fully satisfied. hasMinimalScouterSetup below reduces this to a boolean for
 *  callers that do not need to say where the gap is, such as an unsupported class, which has
 *  no location.
 *
 *  "quickQuestions" covers everything Quick Questions asks: soul type, weapon hand where the
 *  class asks for it, Wild Hunter Legion rank and Inner Ability line. full_setup's own Quick
 *  Questions stays permanently optional (see isScouterQuestionnaireComplete), so this is the
 *  only place that data is ever required. "characterInfo" points at Stats' Character Info
 *  substep, the numeric stat fields Full Setup can skip past (see
 *  isStatsSubstepAnyFieldFilled).
 *
 *  Checked in the order the flow's substeps appear, Quick Questions then Character Info, so a
 *  character missing both reports the one the player hits first rather than whichever the code
 *  happened to check first. A blank character previously reported "characterInfo" even though
 *  Quick Questions is the earlier and more fundamental gap. */
export type ScouterSetupGap = "characterInfo" | "quickQuestions";

export function findScouterSetupGap(character: StoredCharacterRecord): ScouterSetupGap | null {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === character.jobName);
  if (!classData) return "quickQuestions";

  const stats = character.stats;
  const soulComplete = character.soul !== null;
  const weaponHandComplete = !classData.setupOptionsDef?.weaponType
    || character.weaponHand !== null
    || deriveWeaponHandFromWeapon(character.equipment) !== undefined;
  const iaComplete = innerAbilityHasData(stats.innerAbility) || character.scouter?.innerAbilityLine !== undefined;

  const store = readCharactersStore();
  const worldRoster = selectCharactersList(store).filter((c) => c.worldID === character.worldID);
  const whComplete = whAutofillSourceFromRoster(worldRoster) !== null
    || store.scouterLegionByWorld[String(character.worldID)]?.wildHunterRank !== undefined;

  if (!(soulComplete && weaponHandComplete && iaComplete && whComplete)) return "quickQuestions";

  const tripleIds = getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id));
  const primaryStat = classData.requiredStats.find((s): s is TripleStatFieldId => MAIN_STAT_IDS.has(s));
  const draft: StatsStepDraft = {
    str: stats.str, dex: stats.dex, int: stats.int, luk: stats.luk, hp: stats.hp,
    attackPower: stats.attackPower, magicAtt: stats.magicAtt,
    damage: stats.damage, bossDamage: stats.bossDamage, ignoreDefense: stats.ignoreDefense,
    criticalRate: stats.criticalRate, criticalDamage: stats.criticalDamage, buffDuration: stats.buffDuration,
    cooldownReduction: stats.cooldownReduction, cooldownSkip: stats.cooldownSkip,
    ignoreElementalResistance: stats.ignoreElementalResistance, additionalStatusDamage: stats.additionalStatusDamage,
    summonDuration: stats.summonDuration, arcanePower: stats.arcanePower, sacredPower: stats.sacredPower,
  };
  const characterInfoComplete = isStatsSubstepComplete(
    draft, tripleIds, primaryStat,
    isArcaneEligible(character.level, classData.isLegacy),
    isSacredEligible(character.level, classData.isLegacy),
  );
  return characterInfoComplete ? null : "characterInfo";
}

/** Whether this character has answered everything MapleScouter Setup's own live flow
 *  actually requires before letting you click Continue, re-derived against the persisted
 *  record since this runs outside the flow's draft state. See findScouterSetupGap for what is
 *  checked and why Oz Rings, Link Skills and Buffs are deliberately not required, having none
 *  of those being a legitimate, if less
 *  accurate, state; a player who wants a more precise calc can go fill them in without
 *  being blocked from calculating at all in the meantime. */
export function hasMinimalScouterSetup(character: StoredCharacterRecord): boolean {
  return findScouterSetupGap(character) === null;
}

/** Whether MapleScouter supports this character's class at all. See the class-name table
 *  above; currently only the legacy job names are missing. */
export function isScouterSupportedClass(jobName: string): boolean {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  return classData ? scouterKoreanClassName(classData.id) !== null : false;
}

// ── Entry point ──────────────────────────────────────────────────────────────

export interface ScouterPayloadContext {
  scouterLegionByWorld: Record<string, StoredScouterLegion>;
}

/** Builds MapleScouter's request body for a character, or null if this class isn't
 *  supported by MapleScouter at all. `overrides` is only ever passed by
 *  buildDirectScouterPayload; omit it for the real, unmodified payload. */
export function buildScouterPayload(
  character: StoredCharacterRecord,
  ctx: ScouterPayloadContext,
  overrides?: Pick<ScouterSimulatorOverrides, "dopingOverrides" | "ringOverrides" | "infoOverrides">,
): ScouterUserStat | null {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === character.jobName);
  if (!classData) return null;
  const koreanClassName = scouterKoreanClassName(classData.id);
  if (!koreanClassName) return null;

  const assignment = assignMainSubStats(classData.id, classData.requiredStats.filter(isTripleStatField));

  const legion = ctx.scouterLegionByWorld[String(character.worldID)];
  const isHexaEligible = character.level >= 260 && !classData.isLegacy;
  const { hexa, solJanusLevel } = buildHexa(character.characterName, isHexaEligible, koreanClassName);

  return {
    doping: buildDoping(overrides?.dopingOverrides ?? character.scouter?.buffs),
    linkSkill: buildLinkSkill(character.linkSkills),
    special: buildSpecial(character, overrides?.ringOverrides, overrides?.infoOverrides),
    stat: buildStat(character, classData.id, koreanClassName, assignment, legion, overrides?.infoOverrides),
    hexa,
    seedRing: buildSeedRing(character, overrides?.ringOverrides),
    entireStat: ZERO_ENTIRE_STAT,
    isGMS: true,
    isTMS: false,
    isJMS: false,
    isMSEA: false,
    power: ZERO_POWER,
    // erdaShower has no known mapledoro field, not tracked anywhere currently.
    huntSkill: { solJanus: String(solJanusLevel), erdaShower: "0" },
  };
}

// ── Simulator ────────────────────────────────────────────────────────────────

/** The HEXA core fields MapleDoro can override in a simulator run, meaning everything
 *  hexaCoreLevels and buildHexa can produce. Deliberately excludes skillCore3-6/generalCore4
 *  (unreleased GMS content, no real value to simulate), generalCore1 (MapleScouter's own
 *  request omits it entirely, see buildHexa's comment), and solJanus (doesn't factor into
 *  the boss380_hexaStat calculation at all and has no effect on the result, so there is
 *  nothing to simulate by editing it even though huntSkill.solJanus is sent).
 *  generalCore3 is the 3rd Common Node v271 gave every class, so it IS simulatable. */
export type SimulatorHexaCoreField =
  | "skillCore1" | "skillCore2"
  | "masteryCore1" | "masteryCore2" | "masteryCore3" | "masteryCore4"
  | "reinCore1" | "reinCore2" | "reinCore3" | "reinCore4"
  | "generalCore2" | "generalCore3";

/** Every core caps at 30, matching clampLevel in useHexaSkillsState.ts, which caps Origin,
 *  Ascent, Mastery and Enhancement identically. No per-core-type cap exists in this codebase
 *  or in real HEXA leveling to differentiate them. */
export const SIMULATOR_HEXA_CORE_MAX = 30;

/** Raw stat-delta fields the Scouter Simulator's Input tab exposes, additive on top of the
 *  character's real stats, where "0" or unset means no override. Field names match
 *  MapleScouter's own request keys rather than this app's internal naming, so the payload
 *  builder below can assign them straight through. */
export interface SimulatorInputOverrides {
  mainStat?: string; mainStatPer?: string; mainStatAbs?: string; mainStat9Level?: string;
  subStat?: string; subStatPer?: string; subStatAbs?: string; subStat9Level?: string;
  ssubStat?: string; ssubStatPer?: string; ssubStatAbs?: string; ssubStat9Level?: string;
  allStatPer?: string; criRate?: string; buffDuration?: string; coolTimeReduce?: string;
  atk?: string; atkPer?: string; bossDmg?: string; criDmg?: string; ignoreGuard?: string;
  resetCoolDown?: string;
}

/** The Scouter Simulator's "Info" tab, holding the discrete character and account answers
 *  MapleScouter Setup's Quick Questions step collects. Every field is an absolute override
 *  rather than a delta, so undefined means use the character's real saved value, matching
 *  hexaCoreOverrides and linkSkillOverrides. The account-level fields, meaning artifact* and
 *  wildHunterRank, are pure what-ifs here. They never write back to scouterLegionByWorld and
 *  reach only this simulation's payload. */
export interface SimulatorInfoOverrides {
  /** The character's weapon soul as {type, soulLevel}; type "none" simulates removing it. */
  soul?: CharacterSoul;
  /** Genesis Liberation complete (special.genesis). */
  isLiberated?: boolean;
  /** One-handed weapon (special.oneHandSword), meaningful only for weaponType classes. */
  weaponHand?: "1h" | "2h";
  /** Ruin Force Shield equipped (special.useRuinForceShild), Demon Slayer and Avenger only. */
  hasRuinForceShield?: boolean;
  /** Legendary Inner Ability line MapleScouter models (stat.passiveSkillLevelUp/increaseTarget). */
  innerAbilityLine?: "passive" | "multiTarget" | "neither";
  /** Legion Artifact "+1 target" effect (stat.artifact_increaseTarget). */
  artifactExtraTarget?: boolean;
  /** Legion Artifact "Damage of Final Attack Skills" percent, 0-30 (stat.artifact_finalAttack). */
  artifactFinalAttackDmg?: number;
  /** Wild Hunter Legion grade (stat.wildhunterUnion), or "none" for no Wild Hunter. */
  wildHunterRank?: WhLegionRank | "none";
}

export interface ScouterSimulatorOverrides {
  /** Local Boss Clear Grid gap math only; never reaches the API. computeBossClear uses this in
   *  place of character.level when set. A Level override does not affect boss380Hexa on
   *  MapleScouter's own site either. */
  level?: number;
  /** Local Boss Clear Grid gap math only; neither reaches the API. computeBossClear uses these
   *  in place of the character's real arcanePower and sacredPower when set, so typing the
   *  boss's own requirement here closes that gap honestly, with no separate pin-to-ceiling
   *  toggle. */
  arcaneForceOverride?: number;
  authenticForceOverride?: number;
  /** Percent string, e.g. "75.00000". It has no ScouterUserStat field of its own and is
   *  converted into an equivalent Critical Damage% amount at request-build time. See
   *  applyCritDmgAndFinalDmg. */
  finalDmgPercent?: string;
  hexaCoreOverrides?: Partial<Record<SimulatorHexaCoreField, string>>;
  /** From the Buffs tab's own draft. A full independent buff re-pick, not a partial patch onto
   *  the character's real buffs. Undefined means the same as the character's real buffs, not
   *  no buffs. */
  dopingOverrides?: StoredScouterBuffs;
  ringOverrides?: OzRingOverrides;
  input?: SimulatorInputOverrides;
  /** Real ScouterUserStat.linkSkill levels, only for the 10 link skills MapleScouter's own
   *  payload accepts, per LINK_SKILL_TO_SCOUTER_KEY. Absolute levels like hexaCoreOverrides
   *  rather than deltas, matching what the real Link Skills setup step stores. */
  linkSkillOverrides?: Partial<Record<LinkSkillId, string>>;
  /** The Info tab: MapleScouter Setup's Quick Questions answers as pure what-ifs. Applied in
   *  buildScouterPayload, via buildSpecial and buildStat, the same as dopingOverrides and
   *  ringOverrides, so it needs no special handling in buildDirectScouterPayload. */
  infoOverrides?: SimulatorInfoOverrides;
}

/** The subset of ScouterSimulatorOverrides that has a real 1:1 field on ScouterUserStat
 *  itself, either directly or through a same-value equivalence. Everything a
 *  ScouterSimulatorOverrides can carry ends up mutating this real payload instead of the
 *  separate `simulator` overlay object, so the whole popup can run through MapleScouter's
 *  plain /calc/dmg endpoint (no api-key header) instead of the api-key-gated
 *  /calc/dmg-simulator one. */
export type DirectScouterOverrides = ScouterSimulatorOverrides;

/** Adds `amount` onto a ScouterStat field's current string value, in place. */
function addToStatField(stat: ScouterStat, field: keyof ScouterStat, amount: number): void {
  (stat[field] as string) = String(Number(stat[field]) + amount);
}

/** floor(level / 9) * amount, the formula behind the "X per 9 Levels" potential line. Uses the
 *  character's real level rather than a simulated Level override, because MapleScouter's own
 *  mainStat9Level and subStat9Level fields ignore a Level override entirely and always compute
 *  off the real level, even within the same request. */
function per9LevelsAmount(realLevel: number, amount: number): number {
  return Math.floor(realLevel / 9) * amount;
}

/** mainStat/subStat/ssubStat's base/percent/abs/9-per-level fields, plus allStatPer (which
 *  fans out across all of them at once). ssubStatPer only gets allStatPer's share when the
 *  class actually has a 3rd real stat slot (ssubStatBase nonzero, or already touched by its
 *  own override this call). realLevel is the character's real level, for the 9-per-level
 *  fields, rather than stat.level, which may already carry a Level override by this point. */
function applyStatFamilyOverrides(stat: ScouterStat, input: SimulatorInputOverrides, realLevel: number): void {
  if (input.mainStat) addToStatField(stat, "mainStatBase", Number(input.mainStat));
  if (input.mainStatPer) addToStatField(stat, "mainStatPer", Number(input.mainStatPer));
  if (input.mainStatAbs) addToStatField(stat, "mainStatAbs", Number(input.mainStatAbs));
  if (input.mainStat9Level) addToStatField(stat, "mainStatBase", per9LevelsAmount(realLevel, Number(input.mainStat9Level)));
  if (input.subStat) addToStatField(stat, "subStatBase", Number(input.subStat));
  if (input.subStatPer) addToStatField(stat, "subStatPer", Number(input.subStatPer));
  if (input.subStatAbs) addToStatField(stat, "subStatAbs", Number(input.subStatAbs));
  if (input.subStat9Level) addToStatField(stat, "subStatBase", per9LevelsAmount(realLevel, Number(input.subStat9Level)));
  if (input.ssubStat) addToStatField(stat, "ssubStatBase", Number(input.ssubStat));
  if (input.ssubStatPer) addToStatField(stat, "ssubStatPer", Number(input.ssubStatPer));
  if (input.ssubStatAbs) addToStatField(stat, "ssubStatAbs", Number(input.ssubStatAbs));
  if (input.ssubStat9Level) addToStatField(stat, "ssubStatBase", per9LevelsAmount(realLevel, Number(input.ssubStat9Level)));
  if (input.allStatPer) {
    const amount = Number(input.allStatPer);
    addToStatField(stat, "mainStatPer", amount);
    addToStatField(stat, "subStatPer", amount);
    if (Number(stat.ssubStatPer) !== 0 || stat.ssubStatBase !== "0") addToStatField(stat, "ssubStatPer", amount);
  }
}

/** Everything else on the Input tab: combat percentages, cooldowns and ATT. ignoreGuard is the
 *  one diminishing-stack field, computed as real + (100 - real) * (typed / 100), and the rest
 *  are plain adds. criDmg is applied by applyInputOverrides itself rather than here, since it
 *  has to combine with a Final Damage% override on the same field. */
function applyCombatFieldOverrides(stat: ScouterStat, input: SimulatorInputOverrides): void {
  if (input.criRate) {
    // Floor to 100 after the delta, same as buildScouterPayload does for the base value:
    // MapleScouter's API rejects a payload with critical < 100 (its formulas assume you always
    // crit), and its own site floors the field before POSTing too, so a negative delta that
    // would push the total below 100 lands at exactly 100 rather than failing the request.
    stat.critical = String(Math.max(Number(stat.critical) + Number(input.criRate), 100));
  }
  if (input.buffDuration) addToStatField(stat, "buffDuration", Number(input.buffDuration));
  if (input.coolTimeReduce) addToStatField(stat, "coolTimeReduce", Number(input.coolTimeReduce));
  if (input.atk) addToStatField(stat, "atkBase", Number(input.atk));
  if (input.atkPer) addToStatField(stat, "atkPercent", Number(input.atkPer));
  if (input.bossDmg) addToStatField(stat, "bossDmg", Number(input.bossDmg));
  if (input.ignoreGuard) {
    const real = Number(stat.ignoreDef);
    stat.ignoreDef = String(real + (100 - real) * (Number(input.ignoreGuard) / 100));
  }
  if (input.resetCoolDown) addToStatField(stat, "resetCoolDown", Number(input.resetCoolDown));
}

/** Applies every Input tab field's formula onto a real ScouterStat, in place. See
 *  applyStatFamilyOverrides and applyCombatFieldOverrides for the field-by-field rules. There
 *  is no field for Final Damage percent itself, so it is expressed as a Critical Damage delta,
 *  which needs specEfficiency (cridmgeff1) from the character's last computed Scouter result.
 *
 *  Critical Damage and Final Damage share this field because both are Final Damage sources,
 *  and multiple sources multiply rather than add: typing 7% Crit Damage and 10% Final Damage
 *  compounds to more than their sum. The archer classes with a critRateToCritDmg rate add a
 *  third source, since typing more Crit Rate grows their excess-Crit-Rate-to-Crit-Damage
 *  conversion, itself a Final Damage source that must compound in.
 *
 *  Only the delta of that conversion caused by this Apply's typed Crit Rate counts. The
 *  character's pre-existing excess is already part of reality rather than a new source, so
 *  realCritRate, the un-overridden value, isolates the delta from stat.critical's already
 *  mutated total. */
function applyCritDmgAndFinalDmg(stat: ScouterStat, typedCritDmg: number, finalDmgPercent: string | undefined, cridmgeff1: number | undefined, critRateToDmg: number, realCritRate: number): void {
  const finalDmg = finalDmgPercent ? Number(finalDmgPercent) : 0;
  if (!finalDmg || !cridmgeff1) {
    addToStatField(stat, "criticalDmg", typedCritDmg);
    return;
  }
  const realExcessCritRate = Math.max(0, realCritRate - 100);
  const totalExcessCritRate = Math.max(0, Number(stat.critical) - 100);
  const newExcessCritRate = totalExcessCritRate - realExcessCritRate;
  const existingCritDmgFdShare = (typedCritDmg + newExcessCritRate * critRateToDmg) * cridmgeff1;
  const combinedFdShare = (1 + existingCritDmgFdShare) * (1 + finalDmg / 100) - 1;
  const totalCritDmgNeeded = combinedFdShare / cridmgeff1 - newExcessCritRate * critRateToDmg;
  addToStatField(stat, "criticalDmg", totalCritDmgNeeded);
}

function applyInputOverrides(stat: ScouterStat, input: SimulatorInputOverrides | undefined, finalDmgPercent: string | undefined, cridmgeff1: number | undefined, realLevel: number, critRateToDmg: number, realCritRate: number): void {
  if (input) {
    applyStatFamilyOverrides(stat, input, realLevel);
    applyCombatFieldOverrides(stat, input);
  }
  applyCritDmgAndFinalDmg(stat, input?.criDmg ? Number(input.criDmg) : 0, finalDmgPercent, cridmgeff1, critRateToDmg, realCritRate);
}

/** Builds a real ScouterUserStat with a Scouter Simulator popup's full overrides applied, for
 *  POSTing straight to /api/scouter (MapleScouter's plain /calc/dmg) instead of the api-key-
 *  gated simulator endpoint. Returns null under the same conditions buildScouterPayload does
 *  (class unsupported). `cridmgeff1` is the character's own specEfficiency rate (from their
 *  last computed Scouter result), needed only when finalDmgPercent is set. */
export function buildDirectScouterPayload(
  character: StoredCharacterRecord,
  ctx: ScouterPayloadContext,
  overrides: DirectScouterOverrides,
  cridmgeff1?: number,
): ScouterUserStat | null {
  const userStat = buildScouterPayload(character, ctx, overrides);
  if (!userStat) return null;
  // level is deliberately not sent to the API. A Level override does not change boss380Hexa on
  // MapleScouter's own site, and only the Boss Clear Grid's level-gap math, computed locally in
  // bossClearFormula.ts, uses it. Sending it here changed boss380Hexa on this side when it
  // should not have.
  if (overrides.hexaCoreOverrides) {
    for (const [field, value] of Object.entries(overrides.hexaCoreOverrides)) {
      if (value !== undefined) userStat.hexa[field as SimulatorHexaCoreField] = value;
    }
  }
  if (overrides.linkSkillOverrides) {
    for (const [id, value] of Object.entries(overrides.linkSkillOverrides)) {
      const scouterKey = LINK_SKILL_TO_SCOUTER_KEY[id as LinkSkillId];
      if (scouterKey && value !== undefined) userStat.linkSkill[scouterKey] = value;
    }
  }
  const classId = CLASS_SKILL_DATA.find((c) => c.nexonJobName === character.jobName)?.id;
  const realCritRate = Number(userStat.stat.critical);
  applyInputOverrides(userStat.stat, overrides.input, overrides.finalDmgPercent, cridmgeff1, character.level, critRateToCritDmg(classId), realCritRate);
  return userStat;
}

export interface SimulatorStatLabel {
  field: TripleStatFieldId | "hp";
  label: string;
}

/** Per-class main, sub and ssub stat labels for the simulator popup's stat-context display.
 *  Reuses assignMainSubStats and buildStat's own assignment logic, Demon Avenger special case
 *  included, so the popup never re-derives class stat layout itself. Returns null entries for
 *  slots the class doesn't use, since a 2-real-stat class has no ssub. */
export function simulatorStatLabels(classId: string, requiredStats: readonly string[]): {
  main: SimulatorStatLabel | null;
  sub: SimulatorStatLabel | null;
  ssub: SimulatorStatLabel | null;
} {
  const assignment = assignMainSubStats(classId, requiredStats.filter(isTripleStatField));
  const mainField: TripleStatFieldId | "hp" | null = classId === "demon_avenger" ? "hp" : assignment.main;
  const toLabel = (field: TripleStatFieldId | "hp" | null): SimulatorStatLabel | null =>
    field ? { field, label: field.toUpperCase() } : null;
  return {
    main: toLabel(mainField),
    sub: toLabel(assignment.sub),
    ssub: toLabel(assignment.ssub),
  };
}

// ── Cache hash ───────────────────────────────────────────────────────────────

/** Deterministic FNV-1a hash of a built payload, used as the client-side cache key. Cached per
 *  character and keyed by input hash rather than most recent value. Field order is already
 *  stable, since buildScouterPayload and buildDirectScouterPayload construct the object
 *  identically every call, so plain JSON.stringify is deterministic without a key-sort
 *  replacer, which would otherwise strip every nested key absent from the top level. */
export function hashScouterPayload(payload: ScouterUserStat): string {
  const json = JSON.stringify(payload);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
