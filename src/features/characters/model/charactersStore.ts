import { toCharacterKey } from "./characterKeys";
import { getRequiredSetupFlowId, type SetupFlowId } from "../setup/flows";
import type { NormalizedCharacterData } from "./types";
import { readAllSetupDrafts, readLastSetupDraft } from "./setupDraftStorage";

export const CHARACTERS_STORE_VERSION = 1 as const;
export const CHARACTERS_STORE_STORAGE_KEY = "mapledoro_characters_store_v1";

export interface StoredCharacterRecord {
  id: string;
  ign: string;
  worldId: number;
  data: NormalizedCharacterData;
  setup: {
    activeFlowId: SetupFlowId;
    completedFlowIds: SetupFlowId[];
    hasCompletedRequiredFlow: boolean;
  };
  meta: {
    addedAt: number;
    updatedAt: number;
  };
}

export interface CharactersStore {
  version: typeof CHARACTERS_STORE_VERSION;
  order: string[];
  mainCharacterId: string | null;
  championCharacterIds: string[];
  charactersById: Record<string, StoredCharacterRecord>;
  updatedAt: number;
}

export interface CharactersStoreView {
  version: CharactersStore["version"];
  all: StoredCharacterRecord[];
  byId: CharactersStore["charactersById"];
  main: StoredCharacterRecord | null;
  champions: StoredCharacterRecord[];
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

function uniqueFlowIds(flowIds: SetupFlowId[]) {
  return Array.from(new Set(flowIds));
}

export function createEmptyCharactersStore(): CharactersStore {
  return {
    version: CHARACTERS_STORE_VERSION,
    order: [],
    mainCharacterId: null,
    championCharacterIds: [],
    charactersById: {},
    updatedAt: 0,
  };
}

export function createStoredCharacterRecord(args: {
  character: NormalizedCharacterData;
  activeFlowId: SetupFlowId;
  completedFlowIds: SetupFlowId[];
  addedAt?: number;
  updatedAt?: number;
}): StoredCharacterRecord {
  const requiredFlowId = getRequiredSetupFlowId();
  const completedFlowIds = uniqueFlowIds(args.completedFlowIds);
  return {
    id: toCharacterKey(args.character),
    ign: args.character.characterName,
    worldId: args.character.worldID,
    data: args.character,
    setup: {
      activeFlowId: args.activeFlowId,
      completedFlowIds,
      hasCompletedRequiredFlow: completedFlowIds.includes(requiredFlowId),
    },
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
  const data = isNormalizedCharacterData(value.data) ? value.data : null;
  const setup = isObject(value.setup) ? value.setup : null;
  const meta = isObject(value.meta) ? value.meta : null;
  if (!ign || worldId === null || !data || !setup || !meta) return null;

  const activeFlowId =
    typeof setup.activeFlowId === "string"
      ? (setup.activeFlowId as SetupFlowId)
      : getRequiredSetupFlowId();
  const completedFlowIds = Array.isArray(setup.completedFlowIds)
    ? setup.completedFlowIds.filter((entry): entry is SetupFlowId => typeof entry === "string")
    : [];
  const derivedId = typeof value.id === "string" ? value.id : idHint;
  const id = derivedId || toCharacterKey(data);

  return {
    id,
    ign,
    worldId,
    data,
    setup: {
      activeFlowId,
      completedFlowIds,
      hasCompletedRequiredFlow:
        typeof setup.hasCompletedRequiredFlow === "boolean"
          ? setup.hasCompletedRequiredFlow
          : completedFlowIds.includes(getRequiredSetupFlowId()),
    },
    meta: {
      addedAt: typeof meta.addedAt === "number" ? meta.addedAt : Date.now(),
      updatedAt: typeof meta.updatedAt === "number" ? meta.updatedAt : Date.now(),
    },
  };
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
      charactersById[parsedEntry.id] = parsedEntry;
    }

    const order = Array.isArray(parsed.order)
      ? parsed.order.filter(
          (entry): entry is string => typeof entry === "string" && Boolean(charactersById[entry]),
        )
      : [];

    for (const id of Object.keys(charactersById)) {
      if (!order.includes(id)) {
        order.push(id);
      }
    }

    const mainCharacterId =
      typeof parsed.mainCharacterId === "string" && charactersById[parsed.mainCharacterId]
        ? parsed.mainCharacterId
        : null;
    const championCharacterIds = Array.isArray(parsed.championCharacterIds)
      ? parsed.championCharacterIds.filter(
          (entry): entry is string =>
            typeof entry === "string" && Boolean(charactersById[entry]),
        )
      : [];

    return {
      version: CHARACTERS_STORE_VERSION,
      order,
      mainCharacterId,
      championCharacterIds,
      charactersById,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function buildLegacyCharactersStore(): CharactersStore {
  const requiredFlowId = getRequiredSetupFlowId();
  const drafts = readAllSetupDrafts()
    .filter((draft) => draft.confirmedCharacter && draft.completedFlowIds.includes(requiredFlowId))
    .sort((a, b) => a.savedAt - b.savedAt);

  if (!drafts.length) return createEmptyCharactersStore();

  const charactersById: Record<string, StoredCharacterRecord> = {};
  const order: string[] = [];

  for (const draft of drafts) {
    if (!draft.confirmedCharacter) continue;
    const existing = charactersById[draft.characterKey];
    charactersById[draft.characterKey] = createStoredCharacterRecord({
      character: draft.confirmedCharacter,
      activeFlowId: draft.activeFlowId,
      completedFlowIds: draft.completedFlowIds,
      addedAt: existing?.meta.addedAt ?? draft.savedAt,
      updatedAt: draft.savedAt,
    });
    if (!order.includes(draft.characterKey)) {
      order.push(draft.characterKey);
    }
  }

  const lastDraft = readLastSetupDraft();
  const mainCharacterId =
    lastDraft?.mainCharacterKey && charactersById[lastDraft.mainCharacterKey]
      ? lastDraft.mainCharacterKey
      : order[0] ?? null;
  const championCharacterIds = (lastDraft?.championCharacterKeys ?? []).filter((id) =>
    Boolean(charactersById[id]),
  );
  const updatedAt = drafts[drafts.length - 1]?.savedAt ?? Date.now();

  return {
    version: CHARACTERS_STORE_VERSION,
    order,
    mainCharacterId,
    championCharacterIds,
    charactersById,
    updatedAt,
  };
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

  const migrated = buildLegacyCharactersStore();
  if (migrated.order.length > 0) {
    writeCharactersStore(migrated);
  }
  return migrated;
}

export function selectCharactersList(store: CharactersStore): StoredCharacterRecord[] {
  return store.order
    .map((id) => store.charactersById[id] ?? null)
    .filter((entry): entry is StoredCharacterRecord => Boolean(entry));
}

export function selectCharacterById(store: CharactersStore, id: string) {
  return store.charactersById[id] ?? null;
}

export function selectCharacterByIgn(store: CharactersStore, ign: string) {
  const normalizedIgn = ign.trim().toLowerCase();
  return (
    selectCharactersList(store).find((entry) => entry.ign.trim().toLowerCase() === normalizedIgn) ??
    null
  );
}

export function selectMainCharacter(store: CharactersStore) {
  if (!store.mainCharacterId) return null;
  return store.charactersById[store.mainCharacterId] ?? null;
}

export function selectChampionCharacters(store: CharactersStore) {
  return store.championCharacterIds
    .map((id) => store.charactersById[id] ?? null)
    .filter((entry): entry is StoredCharacterRecord => Boolean(entry));
}

export function hasStoredCompletedRequiredSetup(store: CharactersStore) {
  return selectCharactersList(store).some((entry) => entry.setup.hasCompletedRequiredFlow);
}

export function readCharactersStoreView(): CharactersStoreView {
  const store = readCharactersStore();
  return {
    version: store.version,
    all: selectCharactersList(store),
    byId: store.charactersById,
    main: selectMainCharacter(store),
    champions: selectChampionCharacters(store),
  };
}
