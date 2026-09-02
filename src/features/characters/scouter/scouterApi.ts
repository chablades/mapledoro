/*
  Builds the exact request body MapleScouter's calc API expects (POST
  https://api.maplescouter.com/api/calc/dmg, body `{ userStat: ScouterUserStat }`),
  from a character's own stored data. Every field here was live-verified against real
  captured requests/responses on maplescouter.com -- don't re-derive any of this from
  guesses, re-capture a real request/response instead if a field's meaning is unclear.

  Not every character can be sent at all: Erel Light isn't supported by MapleScouter's
  own site, so buildScouterPayload returns null for it, callers must show a "not
  available for this class" state rather than attempting a fetch with nowhere to route to.
*/

import type { StoredCharacterRecord, StoredScouterLegion, StoredScouterBuffs, LinkSkillsData, LinkSkillId } from "../model/charactersStore";
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
import { scouterKoreanClassName } from "./scouterClassNames";
import { LINK_SKILL_TO_SCOUTER_KEY, SCOUTER_UNMODELED_LINK_SKILL_KEYS } from "./scouterLinkSkills";
import { readCharacterToolData } from "../../tools/characterToolStorage";
import type { HexaSkillLevels } from "../../tools/hexa-skills/hexa-classes";
import { COMMON_SKILLS } from "../../tools/hexa-skills/hexa-classes";

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
  // Not a GMS buff -- always "0" here, same treatment as the KMS-only seed rings below
  // (buildSeedRing's own comment).
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
  useContinuousRingAsMainRing: boolean;
  restraintRing: string;
  weaponRing: string;
  ringOfSum: string;
  riskTaker: "0";
  statThird: string;
  statFourth: string;
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
  // Some later tribe-force stat GMS has no class using yet (unreleased content, same
  // treatment as hexa's skillCore3-6 below) -- always "0" until something real needs it.
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
  // TMS (Taiwan) soul weapon stat -- we're GMS, always "0".
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
  // GMS has no content for skill cores past Origin (1)/Ascent (2) yet -- always "0" until
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
 *  character -- lets buildSimulatorPayload call this SAME function twice: once with the
 *  character's real buffs for `doping`, once with the Scouter Simulator popup's own draft-
 *  derived buffs for `dopingSimul`, without duplicating this mapping. */
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

/** Ephenia/Mu Gong soul level as MapleScouter's string encoding, capped at "2" —
 *  never send "C": live-tested to zero out the whole result. */
function soulValue(character: StoredCharacterRecord, type: "ephenia" | "mugong"): string {
  const soul = character.soul;
  if (!soul || soul.type !== type) return "0";
  return soul.soulLevel === 1 || soul.soulLevel === 2 ? String(soul.soulLevel) : "0";
}

export type OzRingId = "restraint" | "weaponJump" | "totalling" | "continuous";

/** Optional per-ring level overrides for the Scouter Simulator's Oz Rings tab, plus the ring
 *  mode toggle -- undefined/omitted means "use the character's real saved value", matching
 *  every other simulator override in this file. */
export interface OzRingOverrides {
  levels?: Partial<Record<OzRingId, number>>;
  useContinuousAsMainRing?: boolean;
}

function ozRingLevel(character: StoredCharacterRecord, ring: OzRingId, overrides?: OzRingOverrides): string {
  const override = overrides?.levels?.[ring];
  if (override !== undefined) return String(override);
  return String(character.scouter?.ozRings?.levels[ring] ?? 0);
}

function buildSpecial(character: StoredCharacterRecord, offStats: { third: string; fourth: string }, ringOverrides?: OzRingOverrides): ScouterSpecial {
  return {
    isReboot: isRebootWorld(character.worldID),
    combat: true,
    epiSoul: soulValue(character, "ephenia"),
    mugongSoul: soulValue(character, "mugong"),
    genesis: character.isLiberated === true,
    oneHandSword: character.weaponHand === "1h",
    useRuinForceShild: character.hasRuinForceShield === true,
    useContinuousRingAsMainRing: ringOverrides?.useContinuousAsMainRing ?? (character.scouter?.ozRings?.ringMode === "continuous"),
    restraintRing: ozRingLevel(character, "restraint", ringOverrides),
    weaponRing: ozRingLevel(character, "weaponJump", ringOverrides),
    ringOfSum: ozRingLevel(character, "totalling", ringOverrides),
    riskTaker: "0",
    statThird: offStats.third,
    statFourth: offStats.fourth,
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

interface MainSubAssignment {
  main: TripleStatFieldId | null;
  sub: TripleStatFieldId | null;
  ssub: TripleStatFieldId | null;
  /** Real stats (str/dex/int/luk) not assigned to main/sub/ssub, feeds statThird/statFourth. */
  offStats: TripleStatFieldId[];
}

/** Demon Avenger's kit is fully INT-independent, and its 3 leftover off-stats
 *  (DEX/INT/LUK) don't fit the 2 statThird/statFourth slots, so INT is dropped
 *  entirely rather than picked arbitrarily. */
const DEMON_AVENGER_DROPPED_OFF_STAT: TripleStatFieldId = "int";

function assignMainSubStats(classId: string, requiredStats: TripleStatFieldId[]): MainSubAssignment {
  const realStatSlots = requiredStats.filter((s) => REAL_STATS.includes(s));
  const [first = null, second = null, third = null] = realStatSlots;
  let offStats = REAL_STATS.filter((s) => !realStatSlots.includes(s));
  if (classId === "demon_avenger") {
    offStats = offStats.filter((s) => s !== DEMON_AVENGER_DROPPED_OFF_STAT);
    // Demon Avenger's Main Stat is HP (buildStat overrides mainField to "hp" directly),
    // so its one real stat slot (STR, `first`) belongs in Sub, not Main -- otherwise STR
    // gets silently discarded when mainField is overridden and never reaches the payload
    // at all.
    return { main: null, sub: first, ssub: third, offStats };
  }
  return { main: first, sub: second, ssub: third, offStats };
}

/** Reads a stat's Base/%/Not-Applied triple as MapleScouter's Base/Per/Abs strings.
 *  Demon Avenger's Main Stat is HP, not one of the 4 real stats. */
function tripleStrings(character: StoredCharacterRecord, field: TripleStatFieldId | null): { base: string; per: string; abs: string } {
  if (!field) return { base: "0", per: "0", abs: "0" };
  const triple = character.stats[field];
  return { base: triple.base || "0", per: triple.percent || "0", abs: triple.percentUnapplied || "0" };
}

// Off-stat totals live in their own private field (StoredOzRings.totallingStats), not
// derived from stats.str/dex/int/luk's Base/%/Not Applied triple -- an earlier version
// computed the Applied Value from that triple, which assumed the Totalling Ring step was
// writing into Base, silently corrupting a character's real Base stat (see ozRingData.ts's
// file header for the full story).
function offStatTotal(character: StoredCharacterRecord, field: TripleStatFieldId | undefined): string {
  if (!field) return "0";
  const value = character.scouter?.ozRings?.totallingStats?.[field];
  return value !== undefined ? String(value) : "0";
}

function buildStat(
  character: StoredCharacterRecord,
  classId: string,
  koreanClassName: string,
  assignment: MainSubAssignment,
  legion: StoredScouterLegion | undefined,
): ScouterStat {
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
    // Field is greyed out/disabled on MapleScouter's own site -- looks like dead/buggy
    // input on their end, not something worth collecting from mapledoro's users. Safe to
    // always send 0; confirmed against a Lara character that its number matched with this
    // at 0. MapleScouter's own site sends a bogus nonzero value here regardless (seen "37"
    // in real captures) -- that's their dead field's leftover state, not a real stat to
    // match; we deliberately always send our own 0 instead of trying to replicate it.
    normalDmg: character.stats.normalEnemyDamage || "0",
    ignoreDef: character.stats.ignoreDefense || "0",
    buffDuration: character.stats.buffDuration || "0",
    // MapleScouter's own form rejects anything below 100% ("크확 100%미만!!" -- Crit Rate
    // under 100%), since damage formulas assume you're always critting. Clamped up to 100
    // here rather than validating/blocking the field itself, so the stored number stays a
    // real, unrestricted stat (useful elsewhere) and only the payload we send is floored.
    // A real value above 100 is sent as-is, uncapped -- some classes (Marksman, etc.) get
    // real damage benefit from over-capping crit rate, so that bonus isn't thrown away.
    critical: String(Math.max(Number(character.stats.criticalRate || "0"), 100)),
    criticalDmg: character.stats.criticalDamage || "0",
    weaponAtk: String(character.scouter?.weaponAtt ?? 0),
    atkPercent: atk.percent || "0",
    coolTimeReducePercent: character.stats.cooldownReduction.percent || "0",
    coolTimeReduce: character.stats.cooldownReduction.seconds || "0",
    wildhunterUnion: String(wildHunterUnionLevel(legion)),
    resetCoolDown: character.stats.cooldownSkip || "0",
    statusAdditionalDmg: character.stats.additionalStatusDamage || "0",
    // The two Inner Ability lines MapleScouter cares about (scouterQuestionsData.ts's
    // IA_LINE_OPTIONS) -- previously hardcoded false, so innerAbilityLine was collected
    // and gated on but never actually reached the payload.
    passiveSkillLevelUp: character.scouter?.innerAbilityLine === "passive",
    increaseTarget: character.scouter?.innerAbilityLine === "multiTarget",
    summonPersistTime: character.stats.summonDuration || "0",
    // Real MapleScouter capture sends this as an actual boolean, not "1"/"0".
    artifact_increaseTarget: legion?.artifactExtraTarget === true,
    artifact_finalAttack: String(legion?.artifactFinalAttackDmg ?? 0),
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

function wildHunterUnionLevel(legion: StoredScouterLegion | undefined): number {
  const rank = legion?.wildHunterRank;
  return rank ? (WH_RANK_TO_LEVEL[rank] ?? 0) : 0;
}

// ── Hexa ─────────────────────────────────────────────────────────────────────

const SOL_JANUS_INDEX = COMMON_SKILLS.findIndex((s) => s.name === "Sol Janus");
const SOL_HECATE_INDEX = COMMON_SKILLS.findIndex((s) => s.name === "Sol Hecate");

function hexaCoreLevels(levels: HexaSkillLevels | undefined, isHexaEligible: boolean): { skillCore1: string; skillCore2: string; mastery: string[]; rein: string[] } {
  return {
    // Origin always starts at level 1 once HEXA-eligible (real game rule, same floor
    // useHexaSkillsState.ts's defaultLevels/normalizeLevels enforce) for a character who
    // hasn't opened the HEXA Skills tool yet -- but NOT for a sub-260/legacy character, who
    // genuinely has no Origin at all; gating on isHexaEligible keeps that case at 0.
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

function buildHexa(characterName: string, isHexaEligible: boolean): HexaBuildResult {
  const saved = readCharacterToolData<{ levels?: HexaSkillLevels }>(characterName, "hexaSkills");
  const cores = hexaCoreLevels(saved?.levels, isHexaEligible);
  const solJanusLevel = SOL_JANUS_INDEX >= 0 ? (saved?.levels?.common[SOL_JANUS_INDEX] ?? 0) : 0;
  const solHecateLevel = SOL_HECATE_INDEX >= 0 ? (saved?.levels?.common[SOL_HECATE_INDEX] ?? 0) : 0;

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
      // generalCore2 = Sol Hecate. generalCore3 ("Freud's Blessing VI") hasn't reached
      // GMS yet, and generalCore4 has no known content at all -- both always "0" until
      // something real releases into either slot. No generalCore1 -- GMS doesn't have
      // one yet either, and maplescouter.com's own request omits the key entirely
      // rather than sending "0" for it, unlike generalCore3/4.
      generalCore2: String(solHecateLevel),
      generalCore3: "0",
      generalCore4: "0",
      hexaStat: 2,
    },
    solJanusLevel,
  };
}

// ── Seed ring / Link skill ────────────────────────────────────────────────────

const ZERO_RING: ScouterSeedRingEntry = { level: "0", efficiency: 0 };

function buildSeedRing(character: StoredCharacterRecord, ringOverrides?: OzRingOverrides): ScouterSeedRing {
  return {
    // efficiency is always 0 here, even for rings mapledoro does have real level data
    // for -- a real maplescouter.com request sends real nonzero per-ring efficiency
    // numbers, but the result matched ours anyway in a same-inputs test with these left
    // at 0, so this looks like a value the API computes itself from `level` rather than
    // trusting from the request. Left as a known mismatch rather than guessing at their
    // formula; revisit if a real result ever depends on it.
    restraintRing: { level: ozRingLevel(character, "restraint", ringOverrides), efficiency: 0 },
    weaponRing: { level: ozRingLevel(character, "weaponJump", ringOverrides), efficiency: 0 },
    ringOfSum: { level: ozRingLevel(character, "totalling", ringOverrides), efficiency: 0 },
    continuosRing: { level: ozRingLevel(character, "continuous", ringOverrides), efficiency: 0 },
    // Non-GMS rings, mapledoro has no data for these and can't collect any.
    riskTakerRing: ZERO_RING,
    criDamageRing: ZERO_RING,
    levelRing: ZERO_RING,
    ultiRing: ZERO_RING,
    durabilityRing: ZERO_RING,
  };
}

/** Reads this character's OWN link skill levels directly -- Scouter's calc needs what's
 *  actually equipped on THIS character, not a shared world total (see linkSkillsData.ts's
 *  file-header reasoning: mastery is shared per-world, but equipping is per-character). */
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

/** Which part of MapleScouter Setup's own completeness requirements this character is
 *  still missing, or null if it's fully satisfied -- see hasMinimalScouterSetup below,
 *  which reduces this to a plain boolean for callers that don't need to say WHERE the
 *  gap is (e.g. "Erel Light isn't a supported class" doesn't have a location).
 *  "quickQuestions" covers everything Quick Questions asks (soul type, weapon hand if
 *  the class asks, Wild Hunter Legion rank, Inner Ability line) -- full_setup's own
 *  Quick Questions stays permanently optional (see isScouterQuestionnaireComplete's doc
 *  comment), so this is the one place that data ever gets required at all.
 *  "characterInfo" points at Stats' Character Info substep (STR/DEX/etc, Combat Stats,
 *  Weapon ATT -- the numeric fields Full Setup can silently skip past, see
 *  isStatsSubstepAnyFieldFilled). Checked in the same order the live flow's own substeps
 *  appear (Quick Questions is substep 0, Character Info is substep 1) so a character
 *  missing BOTH reports the one the player would actually hit first, not whichever
 *  happened to be checked first in code -- a totally blank character used to report
 *  "characterInfo" here even though Quick Questions is the earlier, more fundamental gap. */
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
    weaponAtt: character.scouter?.weaponAtt !== undefined ? String(character.scouter.weaponAtt) : undefined,
  };
  const characterInfoComplete = isStatsSubstepComplete(
    draft, tripleIds, true, primaryStat,
    isArcaneEligible(character.level, classData.isLegacy),
    isSacredEligible(character.level, classData.isLegacy),
  );
  return characterInfoComplete ? null : "characterInfo";
}

/** Whether this character has answered everything MapleScouter Setup's own live flow
 *  actually requires before letting you click Continue -- re-derived against the
 *  PERSISTED record (this runs outside the flow's own draft state). See
 *  findScouterSetupGap for what's actually checked and why Oz Rings/Link Skills/Buffs
 *  are deliberately NOT required here -- having none of those is a legitimate, if less
 *  accurate, state; a player who wants a more precise calc can go fill them in without
 *  being blocked from calculating at all in the meantime. */
export function hasMinimalScouterSetup(character: StoredCharacterRecord): boolean {
  return findScouterSetupGap(character) === null;
}

/** Whether MapleScouter supports this character's class at all, currently only
 *  Erel Light doesn't (see class-name table above). */
export function isScouterSupportedClass(jobName: string): boolean {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  return classData ? scouterKoreanClassName(classData.id) !== null : false;
}

// ── Entry point ──────────────────────────────────────────────────────────────

export interface ScouterPayloadContext {
  scouterLegionByWorld: Record<string, StoredScouterLegion>;
}

/** Builds MapleScouter's request body for a character, or null if this class isn't
 *  supported by MapleScouter at all (currently only Erel Light). */
export function buildScouterPayload(character: StoredCharacterRecord, ctx: ScouterPayloadContext): ScouterUserStat | null {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === character.jobName);
  if (!classData) return null;
  const koreanClassName = scouterKoreanClassName(classData.id);
  if (!koreanClassName) return null;

  const assignment = assignMainSubStats(classData.id, classData.requiredStats.filter(isTripleStatField));
  const [thirdField, fourthField] = assignment.offStats;
  const offStats = {
    third: offStatTotal(character, thirdField),
    fourth: offStatTotal(character, fourthField),
  };

  const legion = ctx.scouterLegionByWorld[String(character.worldID)];
  const isHexaEligible = character.level >= 260 && !classData.isLegacy;
  const { hexa, solJanusLevel } = buildHexa(character.characterName, isHexaEligible);

  return {
    doping: buildDoping(character.scouter?.buffs),
    linkSkill: buildLinkSkill(character.linkSkills),
    special: buildSpecial(character, offStats),
    stat: buildStat(character, classData.id, koreanClassName, assignment, legion),
    hexa,
    seedRing: buildSeedRing(character),
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

/** The HEXA core fields MapleDoro can override in a simulator run -- everything
 *  hexaCoreLevels/buildHexa can produce. Deliberately excludes skillCore3-6/generalCore3-4
 *  (unreleased GMS content, no real value to simulate), generalCore1 (MapleScouter's own
 *  request omits it entirely, see buildHexa's comment), and solJanus (doesn't factor into
 *  the boss380_hexaStat calculation at all -- confirmed it has no effect on the result, so
 *  there's nothing to simulate by editing it despite huntSkill.solJanus being sent). */
export type SimulatorHexaCoreField =
  | "skillCore1" | "skillCore2"
  | "masteryCore1" | "masteryCore2" | "masteryCore3" | "masteryCore4"
  | "reinCore1" | "reinCore2" | "reinCore3" | "reinCore4"
  | "generalCore2";

/** Every core capped at 30 -- confirmed against useHexaSkillsState.ts's own clampLevel,
 *  which caps Origin/Ascent/Mastery/Enhancement identically. No per-core-type cap exists
 *  in this codebase (or in real HEXA leveling) to differentiate them. */
export const SIMULATOR_HEXA_CORE_MAX = 30;

/** Raw stat-delta fields the Scouter Simulator's Input tab exposes -- additive on top of the
 *  character's real stats, "0"/unset = no override. Field names match ScouterSimulator's own
 *  keys (live-captured), not MapleDoro's internal naming, so the payload builder below can
 *  assign them straight through. */
export interface SimulatorInputOverrides {
  mainStat?: string; mainStatPer?: string; mainStatAbs?: string; mainStat9Level?: string;
  subStat?: string; subStatPer?: string; subStatAbs?: string; subStat9Level?: string;
  allStatPer?: string; criRate?: string; buffDuration?: string; coolTimeReduce?: string;
  atk?: string; atkPer?: string; bossDmg?: string; criDmg?: string; ignoreGuard?: string;
  resetCoolDown?: string; weaponAtk?: string;
}

export interface ScouterSimulatorOverrides {
  /** Overrides userStat.stat.level -- MapleDoro-only, MapleScouter's simulator has no
   *  level field of its own (confirmed via live capture). */
  level?: number;
  /** MapleDoro-only, local Boss Clear Grid gap math -- neither reaches the /dmg-simulator
   *  request at all (MapleScouter's own simulator has no Arcane Force/Sacred Power override
   *  field either, same absence as level). computeBossClear uses these in place of the
   *  character's real character.stats.arcanePower/sacredPower when set, so typing the boss's
   *  own requirement here closes that gap honestly -- no separate "pin to ceiling" toggle. */
  arcaneForceOverride?: number;
  authenticForceOverride?: number;
  /** Percent string, e.g. "75.00000" -- MapleScouter's own simulator field format. */
  finalDmgPercent?: string;
  hexaCoreOverrides?: Partial<Record<SimulatorHexaCoreField, string>>;
  /** From the Buffs tab's own draft -- a full independent buff re-pick, not a partial patch
   *  onto the character's real buffs (matches dopingSimul's real shape: MapleScouter's own
   *  simulator sends a full second buff object, not a delta). Undefined means "same as the
   *  character's real buffs", not "no buffs". */
  dopingOverrides?: StoredScouterBuffs;
  ringOverrides?: OzRingOverrides;
  input?: SimulatorInputOverrides;
}

export interface ScouterSimulatorRequest {
  userStat: ScouterUserStat;
  simulator: ScouterSimulator;
}

export interface ScouterSimulator {
  mainStat: string; mainStatPer: string; mainStatAbs: string;
  subStat: string; subStatPer: string; subStatAbs: string;
  ssubStat: "0"; ssubStatPer: "0"; ssubStatAbs: "0";
  allStatPer: string; criRate: string; buffDuration: string; coolTimeReduce: string;
  atk: string; atkPer: string; bossDmg: string; criDmg: string; ignoreGuard: string; resetCoolDown: string;
  weaponAtk: string; erda: "0"; solJanus: "0";
  genesis: boolean;
  finalDmg: string;
  mainStat9Level: string; subStat9Level: string; ssubStat9Level: "";
  tms_fd: ""; tms_soul: "";
  masteryCore1: string; masteryCore2: string; masteryCore3: string; masteryCore4: string;
  skillCore1: string; skillCore2: string;
  // "" (not "0") -- unreleased content, same as skillCore3-6 always "" in a real
  // maplescouter.com simulator request (their frontend never overrides these either).
  skillCore3: ""; skillCore4: ""; skillCore5: ""; skillCore6: "";
  reinCore1: string; reinCore2: string; reinCore3: string; reinCore4: string;
  generalCore2: string;
  generalCore3: ""; generalCore4: "";
  dopingSimul: ScouterDoping;
  restraintRing: string; weaponRing: string; ringofSum: string; riskTaker: "0"; contiRing: string;
  destiny2ndSkill: false;
}

/** Builds the combined {userStat, simulator} body for MapleScouter's Additional Spec
 *  Simulator endpoint (POST /api/calc/dmg-simulator via the scouter-simulator proxy route),
 *  or null under the same conditions buildScouterPayload returns null (class unsupported).
 *  linkSimul is deliberately omitted -- MapleDoro doesn't expose a Link Skills tab in the
 *  popup (out of scope, see the Scouter Simulator plan). ssubStat/erda/solJanus/tms_fd/
 *  tms_soul stay hardcoded no-ops -- unlike mainStat9Level/subStat9Level (confirmed live
 *  against maplescouter.com's own simulator to have a real, large effect on the result),
 *  these have no confirmed effect, same "unclear purpose / low value" reasoning as
 *  skillCore3-6. */
export function buildSimulatorPayload(
  character: StoredCharacterRecord,
  ctx: ScouterPayloadContext,
  overrides: ScouterSimulatorOverrides,
): ScouterSimulatorRequest | null {
  const userStat = buildScouterPayload(character, ctx);
  if (!userStat) return null;
  if (overrides.level !== undefined) {
    userStat.stat.level = String(overrides.level);
  }

  const hexaCore = (field: SimulatorHexaCoreField): string =>
    overrides.hexaCoreOverrides?.[field] ?? userStat.hexa[field];
  const input = overrides.input;
  const num = (v: string | undefined): string => v ?? "0";

  const ringOverrides = overrides.ringOverrides;

  return {
    userStat,
    simulator: {
      mainStat: num(input?.mainStat), mainStatPer: num(input?.mainStatPer), mainStatAbs: num(input?.mainStatAbs),
      subStat: num(input?.subStat), subStatPer: num(input?.subStatPer), subStatAbs: num(input?.subStatAbs),
      ssubStat: "0", ssubStatPer: "0", ssubStatAbs: "0",
      allStatPer: num(input?.allStatPer), criRate: num(input?.criRate), buffDuration: num(input?.buffDuration), coolTimeReduce: num(input?.coolTimeReduce),
      atk: num(input?.atk), atkPer: num(input?.atkPer), bossDmg: num(input?.bossDmg), criDmg: num(input?.criDmg), ignoreGuard: num(input?.ignoreGuard), resetCoolDown: num(input?.resetCoolDown),
      weaponAtk: num(input?.weaponAtk), erda: "0", solJanus: "0",
      genesis: userStat.special.genesis,
      finalDmg: overrides.finalDmgPercent ?? "0.00000",
      mainStat9Level: num(input?.mainStat9Level), subStat9Level: num(input?.subStat9Level), ssubStat9Level: "",
      tms_fd: "", tms_soul: "",
      masteryCore1: hexaCore("masteryCore1"), masteryCore2: hexaCore("masteryCore2"),
      masteryCore3: hexaCore("masteryCore3"), masteryCore4: hexaCore("masteryCore4"),
      skillCore1: hexaCore("skillCore1"), skillCore2: hexaCore("skillCore2"),
      skillCore3: "", skillCore4: "", skillCore5: "", skillCore6: "",
      reinCore1: hexaCore("reinCore1"), reinCore2: hexaCore("reinCore2"),
      reinCore3: hexaCore("reinCore3"), reinCore4: hexaCore("reinCore4"),
      generalCore2: hexaCore("generalCore2"),
      generalCore3: "", generalCore4: "",
      dopingSimul: buildDoping(overrides.dopingOverrides ?? character.scouter?.buffs),
      restraintRing: ozRingLevel(character, "restraint", ringOverrides),
      weaponRing: ozRingLevel(character, "weaponJump", ringOverrides),
      ringofSum: ozRingLevel(character, "totalling", ringOverrides),
      riskTaker: "0",
      contiRing: ozRingLevel(character, "continuous", ringOverrides),
      destiny2ndSkill: false,
    },
  };
}

export interface SimulatorStatLabel {
  field: TripleStatFieldId | "hp";
  label: string;
}

/** Per-class main/sub/ssub stat labels for the simulator popup's stat-context display --
 *  reuses assignMainSubStats/buildStat's own assignment logic (including the Demon Avenger
 *  special case) so the popup never has to re-derive class stat layout on its own. Returns
 *  null entries for slots the class doesn't use (e.g. a 2-real-stat class has no ssub). */
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

/** Deterministic FNV-1a hash of a built payload, used as the client-side cache key --
 *  cached per-character, keyed by input hash, not "most recent value". Field order is
 *  already stable, buildScouterPayload/buildSimulatorPayload construct the object
 *  identically every call — so plain JSON.stringify is deterministic without an explicit
 *  key-sort replacer (which would otherwise strip every nested key not present at the top
 *  level). Generic over ScouterUserStat and ScouterSimulatorRequest -- both are plain,
 *  fully-serializable payload objects. */
export function hashScouterPayload(payload: ScouterUserStat | ScouterSimulatorRequest): string {
  const json = JSON.stringify(payload);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
