import { toCharacterKey } from "./characterKeys";
import type { NormalizedCharacterData } from "./types";

const CHARACTERS_STORE_VERSION = 1 as const;
const CHARACTERS_STORE_STORAGE_KEY = "mapledoro_characters_store_v1";

export interface StoredTripleStatField {
  base: string;
  percent: string;
  percentUnapplied: string;
}

interface StoredCooldownReductionField {
  seconds: string;
  percent: string;
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
}

interface StoredEquipmentItem {
  name: string;
}

export interface StoredCharacterEquipment {
  rings: [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
  pocket: StoredEquipmentItem | null;
  eye: StoredEquipmentItem | null;
  face: StoredEquipmentItem | null;
  pendants: [StoredEquipmentItem | null, StoredEquipmentItem | null];
  weapon: StoredEquipmentItem | null;
  secondary: StoredEquipmentItem | null;
  emblem: StoredEquipmentItem | null;
  hat: StoredEquipmentItem | null;
  top: StoredEquipmentItem | null;
  bottom: StoredEquipmentItem | null;
  shoulder: StoredEquipmentItem | null;
  android: StoredEquipmentItem | null;
  cape: StoredEquipmentItem | null;
  glove: StoredEquipmentItem | null;
  shoe: StoredEquipmentItem | null;
  medal: StoredEquipmentItem | null;
  heart: StoredEquipmentItem | null;
  totems: [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
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
  married: boolean | null;
  partnerName: string | null;
  stats: StoredCharacterStats;
  equipment: StoredCharacterEquipment;
  tools?: Record<string, unknown>;
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
  };
}

function createEmptyCharacterEquipment(): StoredCharacterEquipment {
  return {
    rings: [null, null, null, null],
    pocket: null,
    eye: null,
    face: null,
    pendants: [null, null],
    weapon: null,
    secondary: null,
    emblem: null,
    hat: null,
    top: null,
    bottom: null,
    shoulder: null,
    android: null,
    cape: null,
    glove: null,
    shoe: null,
    medal: null,
    heart: null,
    totems: [null, null, null],
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
  return isObject(value) && typeof value.name === "string";
}

function isNullableStoredEquipmentItem(value: unknown): value is StoredEquipmentItem | null {
  return value === null || isStoredEquipmentItem(value);
}

function isStoredCharacterEquipment(value: unknown): value is StoredCharacterEquipment {
  return (
    isObject(value) &&
    Array.isArray(value.rings) &&
    value.rings.length === 4 &&
    value.rings.every(isNullableStoredEquipmentItem) &&
    isNullableStoredEquipmentItem(value.pocket) &&
    isNullableStoredEquipmentItem(value.eye) &&
    isNullableStoredEquipmentItem(value.face) &&
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
    isNullableStoredEquipmentItem(value.heart) &&
    Array.isArray(value.totems) &&
    value.totems.length === 3 &&
    value.totems.every(isNullableStoredEquipmentItem)
  );
}

function createEmptyCharactersStore(): CharactersStore {
  return {
    version: CHARACTERS_STORE_VERSION,
    order: [],
    mainCharacterIdByWorld: {},
    championCharacterIdsByWorld: {},
    charactersById: {},
    updatedAt: 0,
  };
}

export function createStoredCharacterRecord(args: {
  character: NormalizedCharacterData;
  gender?: "male" | "female" | null;
  married?: boolean | null;
  partnerName?: string | null;
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
    married: args.married ?? null,
    partnerName: args.partnerName ?? null,
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
    gender:
      value.gender === "male" || value.gender === "female" ? value.gender : null,
    married: typeof value.married === "boolean" ? value.married : null,
    partnerName: typeof value.partnerName === "string" && value.partnerName ? value.partnerName : null,
    stats: isStoredCharacterStats(value.stats) ? value.stats : createEmptyCharacterStats(),
    equipment: isStoredCharacterEquipment(value.equipment)
      ? value.equipment
      : createEmptyCharacterEquipment(),
    tools: isObject(value.tools) ? (value.tools as Record<string, unknown>) : undefined,
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
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
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

export function hasStoredCompletedRequiredSetup(store: CharactersStore) {
  return selectCharactersList(store).length > 0;
}

