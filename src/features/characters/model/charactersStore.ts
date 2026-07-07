import { toCharacterKey } from "./characterKeys";
import type { NormalizedCharacterData } from "./types";

const CHARACTERS_STORE_VERSION = 1 as const;
const CHARACTERS_STORE_STORAGE_KEY = "mapledoro_characters_store_v1";

export interface CharacterMarriage {
  isMarried: boolean | null;
  partnerName: string | null;
}

export interface CharacterSoul {
  type: "mugong" | "ephenia" | "none" | null;
  epheniaLevel: 1 | 2 | null;
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

/** Oz ring levels (OzRingId → 1–6) + the Totalling Ring's off-stat values. */
export interface StoredOzRings {
  ringMode: "standard" | "continuous";
  levels: Record<string, number>;
  totallingStats: Record<string, number>;
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
  renown?: Partial<Record<"allStats" | "atkMagAtk" | "bossDmg" | "ignoreDef" | "critDmg", number>>;
}

/** MapleScouter-flow inputs — character data fed to the ranking, NOT a tool. */
export interface StoredScouterData {
  ozRings?: StoredOzRings;
  buffs?: StoredScouterBuffs;
  /** Scouter-relevant legendary Inner Ability line, if any. */
  innerAbilityLine?: "passive" | "multiTarget";
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

/** Per-world link skill levels, shared account-wide across a world's roster. */
export type LinkSkillId =
  | "unfairAdvantage" | "tideOfBattle" | "solus" | "timeToPrepare"
  | "termsAndConditions" | "elementalism" | "qiCultivation" | "bravado"
  | "empiricalKnowledge" | "thiefsСunning";

export type LinkSkillsData = Partial<Record<LinkSkillId, number>>;

const LINK_SKILL_IDS = new Set<LinkSkillId>([
  "unfairAdvantage", "tideOfBattle", "solus", "timeToPrepare",
  "termsAndConditions", "elementalism", "qiCultivation", "bravado",
  "empiricalKnowledge", "thiefsСunning",
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
  wildHunterRank?: WhLegionRank;
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
  scouter?: StoredScouterData;
  familiars?: StoredFamiliarsData;
  vMatrix?: StoredVMatrixData;
  meta: {
    addedAt: number;
    updatedAt: number;
  };
}

export interface CharactersStore {
  version: typeof CHARACTERS_STORE_VERSION;
  order: string[];
  // Per-world: worldID (as string key) -> character id
  mainCharacterIdByWorld: Record<string, string>;
  // Per-world: worldID (as string key) -> character ids
  championCharacterIdsByWorld: Record<string, string[]>;
  charactersById: Record<string, StoredCharacterRecord>;
  // Per-world: worldID (as string key) -> committed link skill levels
  linkSkillsByWorld: Record<string, LinkSkillsData>;
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
  const epheniaRaw = value.epheniaLevel;
  return {
    type: type === "mugong" || type === "ephenia" || type === "none" ? type : null,
    epheniaLevel: epheniaRaw === 1 || epheniaRaw === 2 ? epheniaRaw : null,
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
    linkSkillsByWorld: {},
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
    meta: {
      addedAt: args.addedAt ?? Date.now(),
      updatedAt: args.updatedAt ?? Date.now(),
    },
  };
}

function parseOptionalRecord<T>(value: unknown): T | undefined {
  return isObject(value) ? (value as unknown as T) : undefined;
}

function parseStoredCharacterRecord(
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
    scouter: parseOptionalRecord<StoredScouterData>(value.scouter),
    familiars: parseOptionalRecord<StoredFamiliarsData>(value.familiars),
    vMatrix: parseOptionalRecord<StoredVMatrixData>(value.vMatrix),
    meta: {
      addedAt: typeof meta.addedAt === "number" ? meta.addedAt : Date.now(),
      updatedAt: typeof meta.updatedAt === "number" ? meta.updatedAt : Date.now(),
    },
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

function parseLinkSkillsByWorld(raw: unknown): Record<string, LinkSkillsData> {
  if (!isObject(raw)) return {};
  const result: Record<string, LinkSkillsData> = {};
  for (const [worldId, val] of Object.entries(raw)) {
    if (!isObject(val)) continue;
    const entry = parseLinkSkillsEntry(val);
    if (Object.keys(entry).length > 0) result[worldId] = entry;
  }
  return result;
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
  if (typeof val.wildHunterRank === "string" && WH_LEGION_RANKS.has(val.wildHunterRank)) {
    entry.wildHunterRank = val.wildHunterRank as WhLegionRank;
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
      linkSkillsByWorld: parseLinkSkillsByWorld(parsed.linkSkillsByWorld),
      scouterLegionByWorld: parseScouterLegionByWorld(parsed.scouterLegionByWorld),
      legionArtifactByWorld: parseLegionArtifactByWorld(parsed.legionArtifactByWorld),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeLinkSkillsForWorld(worldId: number, value: LinkSkillsData) {
  const store = readCharactersStore();
  writeCharactersStore({ ...store, linkSkillsByWorld: { ...store.linkSkillsByWorld, [String(worldId)]: value } });
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

