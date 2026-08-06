import { toCharacterKey } from "./characterKeys";
import type { NormalizedCharacterData } from "./types";
import { checkForWipe } from "./wipeTripwire";
import { MAX_CHARACTERS_PER_WORLD } from "./constants";

const CHARACTERS_STORE_VERSION = 1 as const;
const CHARACTERS_STORE_STORAGE_KEY = "mapledoro_characters_store_v1";

export interface CharacterMarriage {
  isMarried: boolean | null;
  partnerName: string | null;
}

export interface CharacterSoul {
  type: "mugong" | "ephenia" | "none" | null;
  // Applies to whichever soul `type` is active — Mu Gong and Ephenia both have real Lv 1/Lv 2 tiers.
  soulLevel: 1 | 2 | null;
}

export interface StoredTripleStatField {
  base: string;
  percent: string;
  percentUnapplied: string;
}

interface StoredCooldownReductionField {
  seconds: string;
  percent: string;
}

export interface StoredHyperStat {
  /** One allocation map (HyperStatCategoryId → level 1–15) per preset. */
  presets: Record<string, number>[];
  activePreset: number;
}

/** Oz ring levels (OzRingId → 1–6), plus the Totalling Ring's off-stat totals
 *  (MainStatId → the character's real current total for that stat -- the ring's own
 *  in-game effect scales off "the sum of all your stats," so this is a real displayed
 *  total, not stats.str/dex/int/luk.base). Kept as its own private value rather than
 *  synced with the Stats step's Base field -- an earlier design did sync them, reverted
 *  after it silently corrupted a character's real Base stats. */
export interface StoredOzRings {
  ringMode: "standard" | "continuous";
  levels: Record<string, number>;
  totallingStats?: Record<string, number>;
}

/** Buffs entered in the MapleScouter buffs step. */
export interface StoredScouterBuffs {
  bossSlayers?: number;
  undeterred?: number;
  forTheGuild?: number;
  hardHitter?: number;
  statPotionValue?: number;
  sayramElixir?: true;
  collectorElixir?: true;
  honorableElixir?: true;
  heroEcho?: true;
  legionMight?: true;
  masarayuGift?: true;
  extremePotion?: true;
  extremeGreenPotion?: true;
  mvpSuperpower?: true;
  vipBuff?: true;
  brightMoonlight?: true;
  candiedApple?: true;
  caretakerSupport?: true;
  sparklingRedStar?: true;
  maxedSacredSymbol?: true;
  greatHeroBoost?: true;
  legendaryHero?: true;
  advWeaponTempering?: true;
  sparklingBlueStar?: true;
  onyxApple?: true;
  tengusJudgement?: true;
  fishBuff?: true;
  renown?: Partial<Record<"allStats" | "atkMagAtk" | "bossDmg" | "ignoreDef" | "critDmg", number>>;
}

/** MapleScouter-flow inputs — character data fed to the ranking, NOT a tool. */
export interface StoredScouterData {
  ozRings?: StoredOzRings;
  buffs?: StoredScouterBuffs;
  /** Scouter-relevant legendary Inner Ability line. "neither" is a real, deliberate answer
   *  (not the same as unanswered/undefined) — must round-trip like any other value. */
  innerAbilityLine?: "passive" | "multiTarget" | "neither";
  /** Weapon's attack value — the "+X" Attack Power / Magic ATT shown on the weapon tooltip. */
  weaponAtt?: number;
}

/** One Familiars preset's slot: a picked familiar plus its rolled lines.
 *  `tier` is kept as a loose string (rather than importing `FamiliarTier` from
 *  setup/data/familiarsData) to avoid the model layer depending on setup/data. */
export interface StoredFamiliarSlot {
  familiarId: number | null;
  mobId: string;
  name: string;
  tier: string;
  line1: string;
  line2: string;
}

export interface StoredFamiliarPreset {
  familiars: StoredFamiliarSlot[];
  badges: string[];
}

/** Character-bound Familiars setup data — real per-character game data, not a tool
 *  (no standalone `/tools/familiars` page reads/writes this). */
export interface StoredFamiliarsData {
  presets: StoredFamiliarPreset[];
  /** Which preset (0-4) is the one actually equipped in-game. Always saved as 0 —
   *  same policy as Equipment/Hyper Stat/Inner Ability/HEXA Stat's activePreset. */
  activePreset: number;
}

/** Character-bound V Matrix node levels — real per-character game data, not a tool
 *  (no standalone `/tools/v-matrix` page reads/writes this). */
export interface StoredVMatrixData {
  levels: Record<string, number>;
}

/** Wild Hunter legion-attacker grade (derived from the WH's level). */
export type WhLegionRank = "B" | "A" | "S" | "SS" | "SSS";

/** Per-character link skill levels. Mastery of a link skill is genuinely shared across a
 *  world's roster (summed per contributing class, see computeLinkSkillsFromRoster) -- a
 *  same-world Bishop and Arch Mage F/P read the identical Empirical Knowledge total. But
 *  a link skill also has to be EQUIPPED to affect a given character (limited equip slots),
 *  so mastering a link via one alt doesn't mean every other character on the account is
 *  running it. This is why storage lives per-character, not per-world: a character's own
 *  value is floored by what the roster proves is mastered, but is independently editable
 *  at or above that floor -- a Kanna that doesn't equip Hoyoung's link stores 0 for Bravado
 *  even if a same-world Hoyoung has mastered it to 3. See linkSkillsData.ts's
 *  computeLinkSkillsFromRoster (the floor) and propagateLinkSkillFloors (the sibling
 *  floor-raise sync that keeps stale floors from lingering after a later alt is added). */
export type LinkSkillId =
  | "unfairAdvantage" | "tideOfBattle" | "solus" | "timeToPrepare"
  | "termsAndConditions" | "elementalism" | "qiCultivation" | "bravado"
  | "empiricalKnowledge" | "thiefsCunning"
  | "nobleFire" | "spiritOfFreedom" | "cygnusBlessing" | "adventurersCuriosity"
  | "piratesBlessing" | "invincibleBelief" | "wildRage" | "furyUnleashed"
  | "guidingStars" | "runePersistence" | "moonlitBladeLearnings" | "innateGift"
  | "judgment" | "naturesFriend" | "lightWash" | "spiritGuideBlessing"
  | "knightsWatch" | "phantomInstinct" | "groundedBody" | "closeCall"
  | "rhinnesBlessing" | "comboKillBlessing" | "hybridLogic" | "ironWill"
  | "elvenBlessing";

export type LinkSkillsData = Partial<Record<LinkSkillId, number>>;

const LINK_SKILL_IDS = new Set<LinkSkillId>([
  "unfairAdvantage", "tideOfBattle", "solus", "timeToPrepare",
  "termsAndConditions", "elementalism", "qiCultivation", "bravado",
  "empiricalKnowledge", "thiefsCunning",
  "nobleFire", "spiritOfFreedom", "cygnusBlessing", "adventurersCuriosity",
  "piratesBlessing", "invincibleBelief", "wildRage", "furyUnleashed",
  "guidingStars", "runePersistence", "moonlitBladeLearnings", "innateGift",
  "judgment", "naturesFriend", "lightWash", "spiritGuideBlessing",
  "knightsWatch", "phantomInstinct", "groundedBody", "closeCall",
  "rhinnesBlessing", "comboKillBlessing", "hybridLogic", "ironWill",
  "elvenBlessing",
]);

/** Max percent for the "Damage of Final Attack Skills" Maple Union artifact. */
export const LEGION_ARTIFACT_FINAL_ATK_MAX = 30;

/** One Legion Artifact Crystal: a level (0-5) and up to 3 assigned stat lines (by id,
 *  see LegionArtifactStatId in setup/data/legionArtifactData.ts — kept as a loose string
 *  here to avoid the model layer depending on setup/data). */
export interface StoredLegionCrystal {
  level: number;
  stats: (string | null)[];
}

/**
 * Per-world account-level scouter inputs (Legion is per-world). The WH rank is
 * derived from the highest Wild Hunter in that world's roster. `artifactExtraTarget`/
 * `artifactFinalAttackDmg` are the 2 fields MapleScouter's API needs; MapleScouter setup
 * asks for them directly, full_setup derives them from the real Legion Artifact board
 * (`StoredLegionArtifact`, below) instead — see legionArtifactData.ts and
 * useCharacterSetupController.ts's applyScouterLegionForWorld.
 */
export interface StoredScouterLegion {
  // "none" is a real, deliberate "No Wild Hunter" answer, distinct from `undefined`
  // ("never answered this question") -- see resolveWhLegionRank's own comment in
  // useCharacterSetupController.ts for why the distinction matters.
  wildHunterRank?: WhLegionRank | "none";
  /** "+1 targets hit on multi-target skills & EXP acquired" artifact is active. */
  artifactExtraTarget?: boolean;
  /** "Damage of Final Attack Skills" artifact bonus, as a percent (1–30). */
  artifactFinalAttackDmg?: number;
}

/**
 * Per-world account-level Legion Artifact progress — the real game data (full_setup's
 * dedicated step), as opposed to `StoredScouterLegion`'s 2 fields derived FROM it for
 * MapleScouter's API.
 */
export interface StoredLegionArtifact {
  /** Legion Artifact level (0-60); gates which of the 9 crystals are unlocked. */
  artifactLevel?: number;
  /** The 9 crystals, indexed to match LEGION_CRYSTALS order. */
  crystals?: StoredLegionCrystal[];
}

export interface StoredCharacterStats {
  hp: StoredTripleStatField;
  str: StoredTripleStatField;
  dex: StoredTripleStatField;
  int: StoredTripleStatField;
  luk: StoredTripleStatField;
  damage: string;
  bossDamage: string;
  ignoreDefense: string;
  attackPower: StoredTripleStatField;
  magicAtt: StoredTripleStatField;
  criticalRate: string;
  criticalDamage: string;
  buffDuration: string;
  cooldownReduction: StoredCooldownReductionField;
  cooldownSkip: string;
  ignoreElementalResistance: string;
  additionalStatusDamage: string;
  summonDuration: string;
  arcanePower: string;
  sacredPower: string;
  /** Resource bar shown alongside HP — a raw number, not a triple field. Labeled "MP"
   *  by default; some classes replace it entirely (Demon Fury/Time Force/Psychic
   *  Points), see ClassSkillData.resourceLabel. Profile-pencil only (never asked in
   *  the guided Setup flows), and optional for back-compat with records saved before
   *  it was collected. */
  mp?: string;
  /** In-game Character Info window stat. Profile-pencil only, same reasoning as mp. */
  normalEnemyDamage?: string;
  /** Hyper Stat allocation (3 swappable presets). Optional for back-compat with
   *  records saved before hyper stat was collected. */
  hyperStat?: StoredHyperStat;
  /** Inner Ability (3 swappable presets, each with 3 tiered lines) — a Character Info
   *  fact (found in the in-game Stats window), collected on the Stats setup step. */
  innerAbility?: StoredInnerAbility;
}

export interface StoredEquipmentItem {
  id?: string;
  name: string;
}

/** The per-preset equipment grid — everything that swaps between in-game equip presets. */
export interface StoredEquipmentPreset {
  rings: [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
  face: StoredEquipmentItem | null;
  eye: StoredEquipmentItem | null;
  earring: StoredEquipmentItem | null;
  pendants: [StoredEquipmentItem | null, StoredEquipmentItem | null];
  belt: StoredEquipmentItem | null;
  pocket: StoredEquipmentItem | null;
  hat: StoredEquipmentItem | null;
  cape: StoredEquipmentItem | null;
  top: StoredEquipmentItem | null;
  glove: StoredEquipmentItem | null;
  bottom: StoredEquipmentItem | null;
  shoe: StoredEquipmentItem | null;
  shoulder: StoredEquipmentItem | null;
  medal: StoredEquipmentItem | null;
  weapon: StoredEquipmentItem | null;
  secondary: StoredEquipmentItem | null;
  emblem: StoredEquipmentItem | null;
  android: StoredEquipmentItem | null;
  heart: StoredEquipmentItem | null;
  badge: StoredEquipmentItem | null;
}

/** Inner Ability tier; "" means the line's rank hasn't been set yet. */
export type StoredIATier = "" | "rare" | "epic" | "unique" | "legendary";

export interface StoredInnerAbilityLine {
  tier: StoredIATier;
  value: string;
}

export interface StoredInnerAbilityPreset {
  lines: [StoredInnerAbilityLine, StoredInnerAbilityLine, StoredInnerAbilityLine];
}

export interface StoredInnerAbility {
  /** Which preset (0-2) is the primary/displayed one. */
  activePreset: number;
  presets: [StoredInnerAbilityPreset, StoredInnerAbilityPreset, StoredInnerAbilityPreset];
}

export interface StoredCharacterEquipment {
  /** Three equipment presets (the grid). */
  presets: [StoredEquipmentPreset, StoredEquipmentPreset, StoredEquipmentPreset];
  /** Which preset (0-2) is the primary/displayed one. */
  activePreset: number;
  // Shared across presets (title, totems, and symbols are separate from the equip preset).
  title: StoredEquipmentItem | null;
  totems: [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
  pets: [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
  petEquips: [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
}

export interface ExpHistoryEntry {
  date: number;
  level: number;
  exp: number;
}

const EXP_HISTORY_MAX_DAYS = 90;
export const EXP_HISTORY_DAY_MS = 24 * 60 * 60 * 1000;

// Nexon's own character/ranking data only actually refreshes once per real-world day, via a
// batch job observed kicking off at 16:00 UTC and almost always finishing by 17:00 UTC --
// rare outliers run to ~17:30 UTC, never later than that so far. Not at UTC midnight. A
// refresh taken before that update lands still returns the PREVIOUS day's frozen snapshot, so
// which day a snapshot belongs to needs to be anchored to Nexon's own update cadence, not
// literal UTC midnight-to-midnight. Padded ~30min past the observed worst case so an
// occasionally-delayed update doesn't get misread as having already landed for the day --
// tightened from a much wider, less-informed 3hr pad after a real refresh landed in the old
// dead zone and got folded into the previous day's entry instead of creating its own (two
// real days' gains merged into one inflated delta). Revisit the margin if a delayed update is
// ever observed running later than ~17:30 UTC.
export const NEXON_DAILY_UPDATE_CUTOFF_HOUR_UTC = 18;

/** Which "Nexon day" a timestamp falls into -- an integer that's equal for any two
 *  timestamps between one NEXON_DAILY_UPDATE_CUTOFF_HOUR_UTC and the next. Shared with the
 *  EXP chart's own date-bucketing/labeling so storage and display always agree. */
export function nexonDayIndex(ms: number): number {
  return Math.floor((ms - NEXON_DAILY_UPDATE_CUTOFF_HOUR_UTC * 60 * 60 * 1000) / EXP_HISTORY_DAY_MS);
}

function isSameNexonDay(a: number, b: number): boolean {
  return nexonDayIndex(a) === nexonDayIndex(b);
}

/** Appends an EXP/level snapshot, deduping to at most one entry per Nexon day (see
 *  nexonDayIndex) and pruning entries past the 90-day tracking window. A no-op when
 *  level/exp match the last entry, so repeat refreshes with no real progress don't grow
 *  the array. */
export function appendExpHistoryEntry(
  existing: ExpHistoryEntry[] | undefined,
  level: number,
  exp: number,
  now: number = Date.now(),
): ExpHistoryEntry[] {
  const pruned = (existing ?? []).filter((e) => now - e.date <= EXP_HISTORY_MAX_DAYS * EXP_HISTORY_DAY_MS);
  const last = pruned[pruned.length - 1];
  if (last && last.level === level && last.exp === exp) return pruned;
  if (last && isSameNexonDay(last.date, now)) return [...pruned.slice(0, -1), { date: now, level, exp }];
  return [...pruned, { date: now, level, exp }];
}

// Key Stats is deliberately not one of these -- it's fixed chrome at the top of every
// Overview layout (alongside the Scouter figure/WSE row), never customizable.
export type OverviewSectionId =
  | "arcaneSymbols"
  | "hexaStat"
  | "hexaSkills"
  | "vMatrix"
  | "gear"
  | "familiars"
  | "innerAbility"
  | "expBar"
  | "expLevel";

export interface StoredCharacterRecord {
  ign: string;
  worldId: number;
  characterID: number;
  characterName: string;
  worldID: number;
  level: number;
  exp: number;
  jobName: string;
  characterImgURL: string;
  isSearchTarget: boolean;
  startRank: number;
  overallRank: number;
  overallGap: number;
  legionRank: number;
  legionGap: number;
  legionLevel: number;
  raidPower: number;
  tierID: number;
  score: number;
  fetchedAt: number;
  expiresAt: number;
  gender: "male" | "female" | null;
  marriage: CharacterMarriage | null;
  isLiberated: boolean | null;
  weaponHand: "1h" | "2h" | null;
  hasRuinForceShield: boolean | null;
  soul: CharacterSoul | null;
  stats: StoredCharacterStats;
  equipment: StoredCharacterEquipment;
  tools?: Record<string, unknown>;
  expHistory?: ExpHistoryEntry[];
  scouter?: StoredScouterData;
  familiars?: StoredFamiliarsData;
  vMatrix?: StoredVMatrixData;
  linkSkills?: LinkSkillsData;
  overviewLayout?: OverviewSectionId[];
  meta: {
    addedAt: number;
    updatedAt: number;
  };
}

/** Mergeable sections offered by the JSON import conflict picker when the imported
 *  IGN already exists. `identity` bundles gender/marriage/isLiberated/weaponHand/
 *  hasRuinForceShield into one row -- these are exactly the fields the Bio
 *  bookmark's edit pencil lets a user hand-correct post-setup, so treating them
 *  separately from "always take imported" avoids silently reverting a correction.
 *  `soul` rides along with `scouter` instead (it's scouter-feeding data, not
 *  something the Bio bookmark surfaces) -- see mergeImportedCharacterRecord. */
export type ImportSectionId =
  | "identity"
  | "stats"
  | "equipment"
  | "vMatrix"
  | "linkSkills"
  | "familiars"
  | "scouter"
  | "tools"
  | "expHistory"
  | "overviewLayout";

// Display order for the import conflict picker -- tuned by hand, not derived from any
// other ordering (e.g. the profile's own bookmark order).
export const IMPORT_SECTION_DEFS: { id: ImportSectionId; label: string }[] = [
  { id: "overviewLayout", label: "Overview Layout" },
  { id: "identity", label: "Gender & Marriage" },
  { id: "expHistory", label: "EXP History" },
  { id: "scouter", label: "Scouter" },
  { id: "stats", label: "Stats" },
  { id: "equipment", label: "Gear" },
  { id: "vMatrix", label: "V Matrix" },
  { id: "linkSkills", label: "Link Skills" },
  { id: "familiars", label: "Familiars" },
  { id: "tools", label: "Tool Data" },
];

export interface CharactersStore {
  version: typeof CHARACTERS_STORE_VERSION;
  order: string[];
  // Per-world: worldID (as string key) -> character id
  mainCharacterIdByWorld: Record<string, string>;
  // Per-world: worldID (as string key) -> character ids
  championCharacterIdsByWorld: Record<string, string[]>;
  charactersById: Record<string, StoredCharacterRecord>;
  // Per-world: worldID (as string key) -> account-level scouter inputs (WH legion, …)
  scouterLegionByWorld: Record<string, StoredScouterLegion>;
  // Per-world: worldID (as string key) -> real Legion Artifact board progress
  legionArtifactByWorld: Record<string, StoredLegionArtifact>;
  updatedAt: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNormalizedCharacterData(value: unknown): value is NormalizedCharacterData {
  return (
    isObject(value) &&
    typeof value.characterID === "number" &&
    typeof value.characterName === "string" &&
    typeof value.worldID === "number" &&
    typeof value.level === "number" &&
    typeof value.exp === "number" &&
    typeof value.jobName === "string" &&
    typeof value.characterImgURL === "string" &&
    typeof value.isSearchTarget === "boolean" &&
    typeof value.startRank === "number" &&
    typeof value.overallRank === "number" &&
    typeof value.overallGap === "number" &&
    typeof value.legionRank === "number" &&
    typeof value.legionGap === "number" &&
    typeof value.legionLevel === "number" &&
    typeof value.raidPower === "number" &&
    typeof value.tierID === "number" &&
    typeof value.score === "number" &&
    typeof value.fetchedAt === "number" &&
    typeof value.expiresAt === "number"
  );
}

function createEmptyTripleStatField(): StoredTripleStatField {
  return { base: "", percent: "", percentUnapplied: "" };
}

function createEmptyCharacterStats(): StoredCharacterStats {
  return {
    hp: createEmptyTripleStatField(),
    str: createEmptyTripleStatField(),
    dex: createEmptyTripleStatField(),
    int: createEmptyTripleStatField(),
    luk: createEmptyTripleStatField(),
    damage: "",
    bossDamage: "",
    ignoreDefense: "",
    attackPower: createEmptyTripleStatField(),
    magicAtt: createEmptyTripleStatField(),
    criticalRate: "",
    criticalDamage: "",
    buffDuration: "",
    cooldownReduction: { seconds: "", percent: "" },
    cooldownSkip: "",
    ignoreElementalResistance: "",
    additionalStatusDamage: "",
    summonDuration: "",
    arcanePower: "",
    sacredPower: "",
    mp: "",
    normalEnemyDamage: "",
    hyperStat: { presets: [{}, {}, {}], activePreset: 0 },
    innerAbility: createEmptyInnerAbility(),
  };
}

function createEmptyEquipmentPreset(): StoredEquipmentPreset {
  return {
    rings: [null, null, null, null],
    face: null,
    eye: null,
    earring: null,
    pendants: [null, null],
    belt: null,
    pocket: null,
    hat: null,
    cape: null,
    top: null,
    glove: null,
    bottom: null,
    shoe: null,
    shoulder: null,
    medal: null,
    weapon: null,
    secondary: null,
    emblem: null,
    android: null,
    heart: null,
    badge: null,
  };
}

function createEmptyInnerAbilityPreset(): StoredInnerAbilityPreset {
  return { lines: [{ tier: "", value: "" }, { tier: "", value: "" }, { tier: "", value: "" }] };
}

function createEmptyInnerAbility(): StoredInnerAbility {
  return {
    activePreset: 0,
    presets: [createEmptyInnerAbilityPreset(), createEmptyInnerAbilityPreset(), createEmptyInnerAbilityPreset()],
  };
}

function createEmptyCharacterEquipment(): StoredCharacterEquipment {
  return {
    presets: [createEmptyEquipmentPreset(), createEmptyEquipmentPreset(), createEmptyEquipmentPreset()],
    activePreset: 0,
    title: null,
    totems: [null, null, null],
    pets: [null, null, null],
    petEquips: [null, null, null],
  };
}

function isStoredTripleStatField(value: unknown): value is StoredTripleStatField {
  return (
    isObject(value) &&
    typeof value.base === "string" &&
    typeof value.percent === "string" &&
    typeof value.percentUnapplied === "string"
  );
}

function isStoredCooldownReductionField(value: unknown): value is StoredCooldownReductionField {
  return (
    isObject(value) &&
    typeof value.seconds === "string" &&
    typeof value.percent === "string"
  );
}

function parseMarriage(value: unknown): CharacterMarriage | null {
  if (!isObject(value)) return null;
  return {
    isMarried: typeof value.isMarried === "boolean" ? value.isMarried : null,
    partnerName: typeof value.partnerName === "string" && value.partnerName ? value.partnerName : null,
  };
}

function parseSoul(value: unknown): CharacterSoul | null {
  if (!isObject(value)) return null;
  const type = value.type;
  const levelRaw = value.soulLevel;
  return {
    type: type === "mugong" || type === "ephenia" || type === "none" ? type : null,
    soulLevel: levelRaw === 1 || levelRaw === 2 ? levelRaw : null,
  };
}

function isStoredCharacterStats(value: unknown): value is StoredCharacterStats {
  return (
    isObject(value) &&
    isStoredTripleStatField(value.hp) &&
    isStoredTripleStatField(value.str) &&
    isStoredTripleStatField(value.dex) &&
    isStoredTripleStatField(value.int) &&
    isStoredTripleStatField(value.luk) &&
    typeof value.damage === "string" &&
    typeof value.bossDamage === "string" &&
    typeof value.ignoreDefense === "string" &&
    isStoredTripleStatField(value.attackPower) &&
    isStoredTripleStatField(value.magicAtt) &&
    typeof value.criticalRate === "string" &&
    typeof value.criticalDamage === "string" &&
    typeof value.buffDuration === "string" &&
    isStoredCooldownReductionField(value.cooldownReduction) &&
    typeof value.cooldownSkip === "string" &&
    typeof value.ignoreElementalResistance === "string" &&
    typeof value.additionalStatusDamage === "string" &&
    typeof value.summonDuration === "string" &&
    typeof value.arcanePower === "string" &&
    typeof value.sacredPower === "string"
  );
}

function isStoredEquipmentItem(value: unknown): value is StoredEquipmentItem {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    (value.id === undefined || typeof value.id === "string")
  );
}

function isNullableStoredEquipmentItem(value: unknown): value is StoredEquipmentItem | null {
  return value === null || isStoredEquipmentItem(value);
}

function isStoredEquipmentPreset(value: unknown): value is StoredEquipmentPreset {
  return (
    isObject(value) &&
    Array.isArray(value.rings) &&
    value.rings.length === 4 &&
    value.rings.every(isNullableStoredEquipmentItem) &&
    isNullableStoredEquipmentItem(value.face) &&
    isNullableStoredEquipmentItem(value.eye) &&
    isNullableStoredEquipmentItem(value.pocket) &&
    Array.isArray(value.pendants) &&
    value.pendants.length === 2 &&
    value.pendants.every(isNullableStoredEquipmentItem) &&
    isNullableStoredEquipmentItem(value.weapon) &&
    isNullableStoredEquipmentItem(value.secondary) &&
    isNullableStoredEquipmentItem(value.emblem) &&
    isNullableStoredEquipmentItem(value.hat) &&
    isNullableStoredEquipmentItem(value.top) &&
    isNullableStoredEquipmentItem(value.bottom) &&
    isNullableStoredEquipmentItem(value.shoulder) &&
    isNullableStoredEquipmentItem(value.android) &&
    isNullableStoredEquipmentItem(value.cape) &&
    isNullableStoredEquipmentItem(value.glove) &&
    isNullableStoredEquipmentItem(value.shoe) &&
    isNullableStoredEquipmentItem(value.medal) &&
    isNullableStoredEquipmentItem(value.heart)
  );
}

function isStoredCharacterEquipment(value: unknown): value is StoredCharacterEquipment {
  return (
    isObject(value) &&
    Array.isArray(value.presets) &&
    value.presets.length === 3 &&
    value.presets.every(isStoredEquipmentPreset) &&
    typeof value.activePreset === "number" &&
    isNullableStoredEquipmentItem(value.title) &&
    Array.isArray(value.totems) &&
    value.totems.length === 3 &&
    value.totems.every(isNullableStoredEquipmentItem)
  );
}

/** Migrate the pre-preset flat equipment shape (grid fields at top level) into preset 1. */
function migrateFlatEquipment(value: Record<string, unknown>): StoredCharacterEquipment | null {
  // Capture the shared fields before the grid-shape guard narrows `value`.
  const title = value.title;
  const totems = value.totems;
  if (!isStoredEquipmentPreset(value)) return null;
  const empty = createEmptyCharacterEquipment();
  return {
    presets: [value, empty.presets[1], empty.presets[2]],
    activePreset: 0,
    title: isNullableStoredEquipmentItem(title) ? title : null,
    totems: Array.isArray(totems) && totems.length === 3 && totems.every(isNullableStoredEquipmentItem)
      ? (totems as StoredCharacterEquipment["totems"])
      : [null, null, null],
    pets: empty.pets,
    petEquips: empty.petEquips,
  };
}

/** Read equipment from a stored record, migrating older shapes; falls back to empty. */
function readStoredEquipment(value: unknown): StoredCharacterEquipment {
  if (isStoredCharacterEquipment(value)) return { ...createEmptyCharacterEquipment(), ...value };
  if (isObject(value)) {
    const migrated = migrateFlatEquipment(value);
    if (migrated) return migrated;
  }
  return createEmptyCharacterEquipment();
}

function createEmptyCharactersStore(): CharactersStore {
  return {
    version: CHARACTERS_STORE_VERSION,
    order: [],
    mainCharacterIdByWorld: {},
    championCharacterIdsByWorld: {},
    charactersById: {},
    scouterLegionByWorld: {},
    legionArtifactByWorld: {},
    updatedAt: 0,
  };
}

export function createStoredCharacterRecord(args: {
  character: NormalizedCharacterData;
  gender?: "male" | "female" | null;
  marriage?: CharacterMarriage | null;
  isLiberated?: boolean | null;
  weaponHand?: "1h" | "2h" | null;
  hasRuinForceShield?: boolean | null;
  soul?: CharacterSoul | null;
  stats?: StoredCharacterStats;
  equipment?: StoredCharacterEquipment;
  tools?: Record<string, unknown>;
  expHistory?: ExpHistoryEntry[];
  addedAt?: number;
  updatedAt?: number;
}): StoredCharacterRecord {
  return {
    ign: args.character.characterName,
    worldId: args.character.worldID,
    ...args.character,
    gender: args.gender ?? null,
    marriage: args.marriage ?? null,
    isLiberated: args.isLiberated ?? null,
    weaponHand: args.weaponHand ?? null,
    hasRuinForceShield: args.hasRuinForceShield ?? null,
    soul: args.soul ?? null,
    stats: args.stats ?? createEmptyCharacterStats(),
    equipment: args.equipment ?? createEmptyCharacterEquipment(),
    tools: args.tools,
    expHistory: args.expHistory ?? appendExpHistoryEntry(undefined, args.character.level, args.character.exp, args.updatedAt),
    meta: {
      addedAt: args.addedAt ?? Date.now(),
      updatedAt: args.updatedAt ?? Date.now(),
    },
  };
}

function parseOptionalRecord<T>(value: unknown): T | undefined {
  return isObject(value) ? (value as unknown as T) : undefined;
}

function isExpHistoryEntry(value: unknown): value is ExpHistoryEntry {
  return isObject(value) && typeof value.date === "number" && typeof value.level === "number" && typeof value.exp === "number";
}

function parseExpHistory(value: unknown): ExpHistoryEntry[] | undefined {
  return Array.isArray(value) && value.every(isExpHistoryEntry) ? value : undefined;
}

const OVERVIEW_SECTION_IDS: readonly OverviewSectionId[] = [
  "arcaneSymbols", "hexaStat", "hexaSkills", "vMatrix", "gear", "familiars", "innerAbility", "expBar", "expLevel",
];

function parseOverviewLayout(value: unknown): OverviewSectionId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((id): id is OverviewSectionId => OVERVIEW_SECTION_IDS.includes(id as OverviewSectionId));
}

export function parseStoredCharacterRecord(
  value: unknown,
  idHint: string | null,
): StoredCharacterRecord | null {
  if (!isObject(value)) return null;
  const ign = typeof value.ign === "string" ? value.ign : null;
  const worldId = typeof value.worldId === "number" ? value.worldId : null;
  const normalizedCharacterData = isNormalizedCharacterData(value) ? value : null;
  const meta = isObject(value.meta) ? value.meta : null;
  if (!ign || worldId === null || !normalizedCharacterData || !meta) return null;
  const derivedIgn = ign || idHint || normalizedCharacterData.characterName;

  return {
    ...normalizedCharacterData,
    ign: derivedIgn,
    worldId,
    gender: value.gender === "male" || value.gender === "female" ? value.gender : null,
    marriage: parseMarriage(value.marriage),
    isLiberated: typeof value.isLiberated === "boolean" ? value.isLiberated : null,
    weaponHand: value.weaponHand === "1h" || value.weaponHand === "2h" ? value.weaponHand : null,
    hasRuinForceShield: typeof value.hasRuinForceShield === "boolean" ? value.hasRuinForceShield : null,
    soul: parseSoul(value.soul),
    stats: isStoredCharacterStats(value.stats) ? value.stats : createEmptyCharacterStats(),
    equipment: readStoredEquipment(value.equipment),
    tools: parseOptionalRecord<Record<string, unknown>>(value.tools),
    expHistory: parseExpHistory(value.expHistory),
    scouter: parseOptionalRecord<StoredScouterData>(value.scouter),
    familiars: parseOptionalRecord<StoredFamiliarsData>(value.familiars),
    vMatrix: parseOptionalRecord<StoredVMatrixData>(value.vMatrix),
    linkSkills: parseOptionalLinkSkills(value.linkSkills),
    overviewLayout: parseOverviewLayout(value.overviewLayout),
    meta: {
      addedAt: typeof meta.addedAt === "number" ? meta.addedAt : Date.now(),
      updatedAt: typeof meta.updatedAt === "number" ? meta.updatedAt : Date.now(),
    },
  };
}

// The only host characterImgURL is ever legitimately set to (Nexon's own ranking API --
// see api/characters/lookup/route.ts) and the one already allowlisted for it in
// next.config.mjs. A JSON import is untrusted input; without this check, a crafted
// characterImgURL renders as a real <img src> the moment the preview card mounts,
// before the user has confirmed anything, leaking their IP to an attacker-chosen host.
const TRUSTED_CHARACTER_IMAGE_HOST = "msavatar1.nexon.net";

// Mirrors CharacterAvatar.tsx's own FALLBACK_SRC -- duplicated rather than imported since
// that's a "use client" component file and this is a plain data module.
const FALLBACK_AVATAR_SRC = "https://haku.network/api/img/avatar/2000/stand1.png";

function isTrustedCharacterImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname === TRUSTED_CHARACTER_IMAGE_HOST;
  } catch {
    return false;
  }
}

/** Parses/validates an unknown JSON value as an importable StoredCharacterRecord.
 *  Reuses parseStoredCharacterRecord's exact defensiveness -- import accepts
 *  anything export can produce, nothing stricter -- except characterImgURL, which is
 *  re-checked against the one real host it can ever legitimately be (see
 *  isTrustedCharacterImageUrl), falling back to CharacterAvatar's own FALLBACK_SRC
 *  rather than trusting an arbitrary URL from an untrusted file. */
export function parseImportedCharacterRecord(value: unknown): StoredCharacterRecord | null {
  const record = parseStoredCharacterRecord(value, null);
  if (!record) return null;
  if (isTrustedCharacterImageUrl(record.characterImgURL)) return record;
  return { ...record, characterImgURL: FALLBACK_AVATAR_SRC };
}

/** Merges `imported` onto `existing` one ImportSectionId at a time: "mine" keeps
 *  existing's value untouched, "imported" takes imported's value. Required
 *  non-sectioned scalars (level, exp, jobName, rank/score fields, characterImgURL,
 *  fetchedAt/expiresAt) always come from imported wholesale, since keeping "mine"
 *  for those is meaningless -- they're refreshed by the app's own lookup elsewhere,
 *  not something a user hand-edits. meta.addedAt always keeps existing's value;
 *  meta.updatedAt is always Date.now(), matching the persist effect's own convention. */
export function mergeImportedCharacterRecord(
  existing: StoredCharacterRecord,
  imported: StoredCharacterRecord,
  choices: Record<ImportSectionId, "mine" | "imported">,
): StoredCharacterRecord {
  const take = <T,>(id: ImportSectionId, mine: T, theirs: T): T =>
    choices[id] === "imported" ? theirs : mine;

  return {
    ...imported,
    ign: existing.ign,
    gender: take("identity", existing.gender, imported.gender),
    marriage: take("identity", existing.marriage, imported.marriage),
    isLiberated: take("identity", existing.isLiberated, imported.isLiberated),
    weaponHand: take("identity", existing.weaponHand, imported.weaponHand),
    hasRuinForceShield: take("identity", existing.hasRuinForceShield, imported.hasRuinForceShield),
    soul: take("scouter", existing.soul, imported.soul),
    stats: take("stats", existing.stats, imported.stats),
    equipment: take("equipment", existing.equipment, imported.equipment),
    vMatrix: take("vMatrix", existing.vMatrix, imported.vMatrix),
    linkSkills: take("linkSkills", existing.linkSkills, imported.linkSkills),
    familiars: take("familiars", existing.familiars, imported.familiars),
    scouter: take("scouter", existing.scouter, imported.scouter),
    tools: take("tools", existing.tools, imported.tools),
    expHistory: take("expHistory", existing.expHistory, imported.expHistory),
    overviewLayout: take("overviewLayout", existing.overviewLayout, imported.overviewLayout),
    meta: {
      addedAt: existing.meta.addedAt,
      updatedAt: Date.now(),
    },
  };
}

/** One world's worth of exportable data -- every character on that world plus the
 *  world-scoped facts no per-character export can carry (Legion Artifact board,
 *  its MapleScouter-derived summary, and Main/Champion role assignments). Roles are
 *  carried as character keys (toCharacterKey, i.e. lowercased IGN), not the internal
 *  characterID -- see this feature's own CLAUDE.md: characterID is never a stable
 *  identity. Resolving a role back to a real character happens at apply-time, after
 *  that character has actually been upserted into the importing account's roster. */
export interface WorldExportPayload {
  kind: "world";
  version: 1;
  worldID: number;
  characters: StoredCharacterRecord[];
  legionArtifact?: StoredLegionArtifact;
  scouterLegion?: StoredScouterLegion;
  mainCharacterKey: string | null;
  championCharacterKeys: string[];
}

/** Parses/validates an unknown JSON value as an importable WorldExportPayload.
 *  Each character reuses parseImportedCharacterRecord's exact defensiveness; invalid
 *  characters are dropped rather than failing the whole import. Role keys are only
 *  checked for shape here (string / string array) -- whether they actually match one
 *  of `characters` is a decision for the apply step, not this parser.
 *
 *  Rejects the whole payload if `characters` exceeds MAX_CHARACTERS_PER_WORLD, or if any
 *  two characters share the same IGN (case-insensitive, the same identity toCharacterKey
 *  uses everywhere) -- exportWorldJson can never produce either (it only ever writes one
 *  world's own roster, itself capped at MAX_CHARACTERS_PER_WORLD with every IGN unique),
 *  so a file that violates either was hand-edited or corrupted, not a real MapleDoro
 *  export. Both are a hard reject, not a silent truncate/dedupe, so nothing is quietly
 *  dropped without the user knowing the file itself is the problem. */
export function parseImportedWorldPayload(value: unknown): WorldExportPayload | null {
  if (!isObject(value) || value.kind !== "world" || typeof value.worldID !== "number") return null;
  if (!Array.isArray(value.characters)) return null;
  if (value.characters.length > MAX_CHARACTERS_PER_WORLD) return null;
  const characters = value.characters
    .map(parseImportedCharacterRecord)
    .filter((c): c is StoredCharacterRecord => c !== null);
  if (characters.length === 0) return null;
  const characterKeys = characters.map(toCharacterKey);
  if (new Set(characterKeys).size !== characterKeys.length) return null;

  const legionArtifact = isObject(value.legionArtifact) ? parseLegionArtifactEntry(value.legionArtifact) : undefined;
  const scouterLegion = isObject(value.scouterLegion) ? parseScouterLegionEntry(value.scouterLegion) : undefined;
  const mainCharacterKey = typeof value.mainCharacterKey === "string" ? value.mainCharacterKey : null;
  const championCharacterKeys = Array.isArray(value.championCharacterKeys)
    ? value.championCharacterKeys.filter((k): k is string => typeof k === "string")
    : [];

  return {
    kind: "world",
    version: 1,
    worldID: value.worldID,
    characters,
    legionArtifact: legionArtifact && !isEmptyLegionArtifactEntry(legionArtifact) ? legionArtifact : undefined,
    scouterLegion: scouterLegion && !isEmptyScouterLegionEntry(scouterLegion) ? scouterLegion : undefined,
    mainCharacterKey,
    championCharacterKeys,
  };
}

function parseWorldScopedRoles(
  parsed: Record<string, unknown>,
  charactersById: Record<string, StoredCharacterRecord>,
): Pick<CharactersStore, "mainCharacterIdByWorld" | "championCharacterIdsByWorld"> {
  const mainCharacterIdByWorld: Record<string, string> = {};
  if (isObject(parsed.mainCharacterIdByWorld)) {
    for (const [worldId, charId] of Object.entries(parsed.mainCharacterIdByWorld)) {
      if (typeof charId === "string" && charactersById[charId]) {
        mainCharacterIdByWorld[worldId] = charId;
      }
    }
  }

  const championCharacterIdsByWorld: Record<string, string[]> = {};
  if (isObject(parsed.championCharacterIdsByWorld)) {
    for (const [worldId, ids] of Object.entries(parsed.championCharacterIdsByWorld)) {
      if (Array.isArray(ids)) {
        championCharacterIdsByWorld[worldId] = ids.filter(
          (entry): entry is string =>
            typeof entry === "string" && Boolean(charactersById[entry]),
        );
      }
    }
  }

  return { mainCharacterIdByWorld, championCharacterIdsByWorld };
}

function parseLinkSkillsEntry(val: Record<string, unknown>): LinkSkillsData {
  const entry: LinkSkillsData = {};
  for (const [skillId, level] of Object.entries(val)) {
    if (!LINK_SKILL_IDS.has(skillId as LinkSkillId)) continue;
    if (typeof level === "number") entry[skillId as LinkSkillId] = level;
  }
  return entry;
}

/** Per-character `linkSkills` field parse -- unlike vMatrix's untyped `parseOptionalRecord`,
 *  this validates real shape (drops unknown skill ids/non-number levels) via the same
 *  `parseLinkSkillsEntry` the old per-world map used, since link skill levels feed directly
 *  into the Scouter damage calc payload and a malformed value there isn't just cosmetic. */
function parseOptionalLinkSkills(raw: unknown): LinkSkillsData | undefined {
  if (!isObject(raw)) return undefined;
  const entry = parseLinkSkillsEntry(raw);
  return Object.keys(entry).length > 0 ? entry : undefined;
}

/** Converts the setup wizard's raw string-valued draft (`{"elementalism":"3",...}`)
 *  into the typed, numeric shape committed to permanent storage. */
export function linkSkillsDraftToStored(raw: string): LinkSkillsData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return {};
    const entry: LinkSkillsData = {};
    for (const [skillId, val] of Object.entries(parsed)) {
      if (!LINK_SKILL_IDS.has(skillId as LinkSkillId)) continue;
      let level = NaN;
      if (typeof val === "string") level = parseInt(val, 10);
      else if (typeof val === "number") level = val;
      if (!isNaN(level)) entry[skillId as LinkSkillId] = level;
    }
    return entry;
  } catch {
    return {};
  }
}

/** Converts committed link skill levels back into the wizard's string-valued draft
 *  format, for prefilling `LinkSkillsSetupStep` on first land. */
export function linkSkillsStoredToDraftString(data: LinkSkillsData | undefined): string {
  if (!data) return "";
  const draft: Partial<Record<LinkSkillId, string>> = {};
  for (const [skillId, level] of Object.entries(data)) {
    draft[skillId as LinkSkillId] = String(level);
  }
  return JSON.stringify(draft);
}

const WH_LEGION_RANKS = new Set<string>(["B", "A", "S", "SS", "SSS"]);
const MAX_LEGION_ARTIFACT_LEVEL = 60;

function parseStoredLegionCrystal(val: unknown): StoredLegionCrystal | null {
  if (!isObject(val)) return null;
  const level = typeof val.level === "number" ? Math.max(0, Math.min(5, Math.floor(val.level))) : 0;
  const stats = Array.isArray(val.stats)
    ? val.stats.map((s) => (typeof s === "string" ? s : null))
    : [];
  return { level, stats };
}

function parseScouterLegionEntry(val: Record<string, unknown>): StoredScouterLegion {
  const entry: StoredScouterLegion = {};
  if (typeof val.wildHunterRank === "string" && (val.wildHunterRank === "none" || WH_LEGION_RANKS.has(val.wildHunterRank))) {
    entry.wildHunterRank = val.wildHunterRank as WhLegionRank | "none";
  }
  if (val.artifactExtraTarget === true) entry.artifactExtraTarget = true;
  if (typeof val.artifactFinalAttackDmg === "number" && val.artifactFinalAttackDmg > 0) {
    entry.artifactFinalAttackDmg = Math.min(Math.floor(val.artifactFinalAttackDmg), LEGION_ARTIFACT_FINAL_ATK_MAX);
  }
  return entry;
}

function isEmptyScouterLegionEntry(entry: StoredScouterLegion): boolean {
  return entry.wildHunterRank === undefined && !entry.artifactExtraTarget && entry.artifactFinalAttackDmg === undefined;
}

function parseScouterLegionByWorld(raw: unknown): Record<string, StoredScouterLegion> {
  if (!isObject(raw)) return {};
  const result: Record<string, StoredScouterLegion> = {};
  for (const [worldId, val] of Object.entries(raw)) {
    if (!isObject(val)) continue;
    const entry = parseScouterLegionEntry(val);
    if (!isEmptyScouterLegionEntry(entry)) result[worldId] = entry;
  }
  return result;
}

function parseLegionArtifactEntry(val: Record<string, unknown>): StoredLegionArtifact {
  const entry: StoredLegionArtifact = {};
  if (typeof val.artifactLevel === "number") {
    entry.artifactLevel = Math.max(0, Math.min(MAX_LEGION_ARTIFACT_LEVEL, Math.floor(val.artifactLevel)));
  }
  if (Array.isArray(val.crystals)) {
    const crystals = val.crystals.map(parseStoredLegionCrystal).filter((c): c is StoredLegionCrystal => c !== null);
    if (crystals.length > 0) entry.crystals = crystals;
  }
  return entry;
}

function isEmptyLegionArtifactEntry(entry: StoredLegionArtifact): boolean {
  return entry.artifactLevel === undefined && entry.crystals === undefined;
}

function parseLegionArtifactByWorld(raw: unknown): Record<string, StoredLegionArtifact> {
  if (!isObject(raw)) return {};
  const result: Record<string, StoredLegionArtifact> = {};
  for (const [worldId, val] of Object.entries(raw)) {
    if (!isObject(val)) continue;
    const entry = parseLegionArtifactEntry(val);
    if (!isEmptyLegionArtifactEntry(entry)) result[worldId] = entry;
  }
  return result;
}

function parseCharactersStore(raw: string): CharactersStore | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return null;
    if (parsed.version !== CHARACTERS_STORE_VERSION) return null;

    const charactersByIdInput = isObject(parsed.charactersById) ? parsed.charactersById : {};
    const charactersById: Record<string, StoredCharacterRecord> = {};
    for (const [id, entry] of Object.entries(charactersByIdInput)) {
      const parsedEntry = parseStoredCharacterRecord(entry, id);
      if (!parsedEntry) continue;
      charactersById[id] = parsedEntry;
    }

    const order = Array.isArray(parsed.order)
      ? parsed.order.filter(
          (entry): entry is string => typeof entry === "string" && Boolean(charactersById[entry]),
        )
      : [];

    const orderSet = new Set(order);
    for (const id of Object.keys(charactersById)) {
      if (!orderSet.has(id)) order.push(id);
    }

    const { mainCharacterIdByWorld, championCharacterIdsByWorld } =
          parseWorldScopedRoles(parsed, charactersById);

    return {
      version: CHARACTERS_STORE_VERSION,
      order,
      mainCharacterIdByWorld,
      championCharacterIdsByWorld,
      charactersById,
      scouterLegionByWorld: parseScouterLegionByWorld(parsed.scouterLegionByWorld),
      legionArtifactByWorld: parseLegionArtifactByWorld(parsed.legionArtifactByWorld),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeScouterLegionForWorld(worldId: number, value: StoredScouterLegion) {
  const store = readCharactersStore();
  writeCharactersStore({ ...store, scouterLegionByWorld: { ...store.scouterLegionByWorld, [String(worldId)]: value } });
}

export function writeLegionArtifactForWorld(worldId: number, value: StoredLegionArtifact) {
  const store = readCharactersStore();
  writeCharactersStore({ ...store, legionArtifactByWorld: { ...store.legionArtifactByWorld, [String(worldId)]: value } });
}

export function writeCharactersStore(store: CharactersStore) {
  if (typeof window === "undefined") return;
  try {
    if (process.env.NODE_ENV !== "production") {
      checkForWipe(window.localStorage.getItem(CHARACTERS_STORE_STORAGE_KEY), store);
    }
    window.localStorage.setItem(CHARACTERS_STORE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore localStorage write failures.
  }
}

export function readCharactersStore(): CharactersStore {
  if (typeof window === "undefined") return createEmptyCharactersStore();
  const raw = window.localStorage.getItem(CHARACTERS_STORE_STORAGE_KEY);
  if (raw) {
    const parsed = parseCharactersStore(raw);
    if (parsed) return parsed;
  }
  return createEmptyCharactersStore();
}

export function selectCharactersList(store: CharactersStore): StoredCharacterRecord[] {
  const result: StoredCharacterRecord[] = [];
  for (const id of store.order) {
    const entry = store.charactersById[id];
    if (entry) result.push(entry);
  }
  return result;
}

export function selectCharacterById(store: CharactersStore, id: string) {
  return store.charactersById[id] ?? null;
}

export function selectCharacterByIgn(store: CharactersStore, ign: string) {
  const normalizedIgn = ign.trim().toLowerCase();
  return (
    selectCharactersList(store).find((entry) => toCharacterKey(entry) === normalizedIgn) ?? null
  );
}

/** First character in roster order that is a world main, or null. */
export function selectMainCharacter(store: CharactersStore) {
  const mainIds = new Set(Object.values(store.mainCharacterIdByWorld));
  for (const id of store.order) {
    if (mainIds.has(id)) return store.charactersById[id] ?? null;
  }
  return null;
}

export function hasStoredCompletedRequiredSetup(store: CharactersStore) {
  return selectCharactersList(store).length > 0;
}

