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
  usesContinuous: boolean;
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

/** Wild Hunter legion-attacker grade (derived from the WH's level). */
export type WhLegionRank = "B" | "A" | "S" | "SS" | "SSS";

/**
 * Per-world account-level scouter inputs (Legion is per-world). The WH rank is
 * derived from the highest Wild Hunter in that world's roster; legion artifacts
 * (user input, not derivable) will live here too.
 */
export interface StoredScouterLegion {
  wildHunterRank?: WhLegionRank;
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
  innerAbility: StoredInnerAbility;
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
  // Per-world: worldID (as string key) -> serialized link skills draft
  linkSkillsByWorld: Record<string, string>;
  // Per-world: worldID (as string key) -> account-level scouter inputs (WH legion, …)
  scouterLegionByWorld: Record<string, StoredScouterLegion>;
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
    innerAbility: createEmptyInnerAbility(),
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
    innerAbility: empty.innerAbility,
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
    tools: isObject(value.tools) ? (value.tools as Record<string, unknown>) : undefined,
    scouter: isObject(value.scouter) ? (value.scouter as StoredScouterData) : undefined,
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

function parseLinkSkillsByWorld(raw: unknown): Record<string, string> {
  if (!isObject(raw)) return {};
  const result: Record<string, string> = {};
  for (const [worldId, val] of Object.entries(raw)) {
    if (typeof val === "string") result[worldId] = val;
  }
  return result;
}

const WH_LEGION_RANKS = new Set<string>(["B", "A", "S", "SS", "SSS"]);

function parseScouterLegionByWorld(raw: unknown): Record<string, StoredScouterLegion> {
  if (!isObject(raw)) return {};
  const result: Record<string, StoredScouterLegion> = {};
  for (const [worldId, val] of Object.entries(raw)) {
    if (isObject(val) && typeof val.wildHunterRank === "string" && WH_LEGION_RANKS.has(val.wildHunterRank)) {
      result[worldId] = { wildHunterRank: val.wildHunterRank as WhLegionRank };
    }
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
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeLinkSkillsForWorld(worldId: number, value: string) {
  const store = readCharactersStore();
  writeCharactersStore({ ...store, linkSkillsByWorld: { ...store.linkSkillsByWorld, [String(worldId)]: value } });
}

export function writeScouterLegionForWorld(worldId: number, value: StoredScouterLegion) {
  const store = readCharactersStore();
  writeCharactersStore({ ...store, scouterLegionByWorld: { ...store.scouterLegionByWorld, [String(worldId)]: value } });
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

