/*
  LocalStorage helpers for per-character setup draft persistence.
*/
import type { SetupStepInputById } from "../setup/types";
import { clampFlowStepIndex, getRequiredSetupFlowId, type SetupFlowId } from "../setup/flows";
import type { NormalizedCharacterData } from "./types";
import { SETUP_DRAFT_LAST_KEY, SETUP_DRAFT_STORAGE_PREFIX, type SetupMode } from "./constants";

export interface SetupDraft {
  version: 1;
  characterKey: string;
  query: string;
  setupMode: SetupMode;
  setupFlowStarted: boolean;
  autoResumeOnLoad: boolean;
  activeFlowId: SetupFlowId;
  completedFlowIds: SetupFlowId[];
  showFlowOverview: boolean;
  showCharacterDirectory: boolean;
  characterRoster: NormalizedCharacterData[];
  mainCharacterKey: string | null;
  championCharacterKeys: string[];
  setupStepIndex: number;
  setupStepDirection: "forward" | "backward";
  setupStepTestByStep: SetupStepInputById;
  confirmedCharacter: NormalizedCharacterData | null;
  savedAt: number;
}

function normalizeCharacterName(value: string) {
  return value.trim().toLowerCase();
}

export function makeDraftCharacterKey(character: NormalizedCharacterData) {
  return `${character.worldID}:${normalizeCharacterName(character.characterName)}`;
}

function parseSetupDraft(raw: string): SetupDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    if (parsed.version !== 1) return null;
    if (!parsed.confirmedCharacter) return null;
    if (typeof parsed.query !== "string") return null;
    if (typeof parsed.characterKey !== "string" || !parsed.characterKey.trim()) return null;
    const activeFlowId =
      typeof parsed.activeFlowId === "string"
        ? (parsed.activeFlowId as SetupFlowId)
        : getRequiredSetupFlowId();
    const completedFlowIds = Array.isArray(parsed.completedFlowIds)
      ? parsed.completedFlowIds.filter((entry): entry is SetupFlowId => typeof entry === "string")
      : [];
    const characterRoster = Array.isArray(parsed.characterRoster)
      ? parsed.characterRoster.filter(
          (entry): entry is NormalizedCharacterData =>
            Boolean(
              entry &&
                typeof entry === "object" &&
                typeof (entry as Partial<NormalizedCharacterData>).characterName === "string" &&
                typeof (entry as Partial<NormalizedCharacterData>).worldID === "number",
            ),
        )
      : [];
    const mainCharacterKey =
      typeof parsed.mainCharacterKey === "string" ? parsed.mainCharacterKey : null;
    const championCharacterKeys = Array.isArray(parsed.championCharacterKeys)
      ? parsed.championCharacterKeys.filter((entry): entry is string => typeof entry === "string")
      : [];
    return {
      version: 1,
      characterKey: parsed.characterKey,
      query: parsed.query,
      setupMode: parsed.setupMode === "search" || parsed.setupMode === "import" ? parsed.setupMode : "search",
      setupFlowStarted: Boolean(parsed.setupFlowStarted),
      autoResumeOnLoad: parsed.autoResumeOnLoad !== false,
      activeFlowId,
      completedFlowIds,
      showFlowOverview: Boolean(parsed.showFlowOverview),
      showCharacterDirectory: Boolean(parsed.showCharacterDirectory),
      characterRoster,
      mainCharacterKey,
      championCharacterKeys,
      setupStepIndex: clampFlowStepIndex(activeFlowId, Number(parsed.setupStepIndex ?? 0)),
      setupStepDirection: parsed.setupStepDirection === "backward" ? "backward" : "forward",
      setupStepTestByStep:
        parsed.setupStepTestByStep && typeof parsed.setupStepTestByStep === "object"
          ? (parsed.setupStepTestByStep as SetupStepInputById)
          : {},
      confirmedCharacter: parsed.confirmedCharacter,
      savedAt: Number(parsed.savedAt ?? Date.now()),
    };
  } catch {
    return null;
  }
}

function getSetupDraftStorageKey(characterKey: string) {
  return `${SETUP_DRAFT_STORAGE_PREFIX}${characterKey}`;
}

export function readSetupDraftByCharacter(character: NormalizedCharacterData): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(makeDraftCharacterKey(character)));
  if (!raw) return null;
  return parseSetupDraft(raw);
}

export function readAllSetupDrafts(): SetupDraft[] {
  if (typeof window === "undefined") return [];
  const drafts: SetupDraft[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(SETUP_DRAFT_STORAGE_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    const parsed = parseSetupDraft(raw);
    if (!parsed) continue;
    drafts.push(parsed);
  }
  return drafts;
}

export function readMergedCharacterRoster(): NormalizedCharacterData[] {
  const drafts = readAllSetupDrafts();
  const requiredFlowId = getRequiredSetupFlowId();
  const completedDrafts = drafts.filter((draft) =>
    draft.completedFlowIds.includes(requiredFlowId),
  );
  const existingCharacterKeys = new Set(completedDrafts.map((draft) => draft.characterKey));
  const map = new Map<string, NormalizedCharacterData>();
  for (const draft of completedDrafts) {
    for (const entry of draft.characterRoster ?? []) {
      const entryKey = makeDraftCharacterKey(entry);
      // Prevent stale roster snapshots from resurrecting deleted characters.
      if (!existingCharacterKeys.has(entryKey)) continue;
      map.set(entryKey, entry);
    }
    if (draft.confirmedCharacter) {
      map.set(makeDraftCharacterKey(draft.confirmedCharacter), draft.confirmedCharacter);
    }
  }
  return Array.from(map.values());
}

export function readLastSetupDraft(): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const draftKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
  if (draftKey) {
    const raw = window.localStorage.getItem(getSetupDraftStorageKey(draftKey));
    if (raw) {
      const parsed = parseSetupDraft(raw);
      if (parsed) return parsed;
    }
  }

  // Fallback: recover from any valid saved draft if the "last" pointer is stale/missing.
  let newestDraft: SetupDraft | null = null;
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(SETUP_DRAFT_STORAGE_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    const parsed = parseSetupDraft(raw);
    if (!parsed) continue;
    if (!newestDraft || parsed.savedAt > newestDraft.savedAt) {
      newestDraft = parsed;
    }
  }

  if (newestDraft) {
    window.localStorage.setItem(SETUP_DRAFT_LAST_KEY, newestDraft.characterKey);
  } else {
    window.localStorage.removeItem(SETUP_DRAFT_LAST_KEY);
  }
  return newestDraft;
}

export function hasAnyCompletedRequiredSetupFlow() {
  if (typeof window === "undefined") return false;
  try {
    const requiredFlowId = getRequiredSetupFlowId();
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(SETUP_DRAFT_STORAGE_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const draft = parseSetupDraft(raw);
      if (!draft) continue;
      if (draft.completedFlowIds.includes(requiredFlowId)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function writeSetupDraft(draft: SetupDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSetupDraftStorageKey(draft.characterKey), JSON.stringify(draft));
    window.localStorage.setItem(SETUP_DRAFT_LAST_KEY, draft.characterKey);
  } catch {
    // Ignore localStorage write failures.
  }
}

export function setLastSetupDraftAutoResume(value: boolean) {
  const draft = readLastSetupDraft();
  if (!draft) return;
  writeSetupDraft({
    ...draft,
    setupFlowStarted: value ? draft.setupFlowStarted : false,
    autoResumeOnLoad: value,
    savedAt: Date.now(),
  });
}

export function removeSetupDraftForCharacter(character: NormalizedCharacterData) {
  if (typeof window === "undefined") return;
  try {
    const characterKey = makeDraftCharacterKey(character);
    window.localStorage.removeItem(getSetupDraftStorageKey(characterKey));
    const lastKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
    if (lastKey === characterKey) {
      // Re-point "last draft" to the newest remaining valid draft if possible.
      let newestDraft: SetupDraft | null = null;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(SETUP_DRAFT_STORAGE_PREFIX)) continue;
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = parseSetupDraft(raw);
        if (!parsed) continue;
        if (!newestDraft || parsed.savedAt > newestDraft.savedAt) {
          newestDraft = parsed;
        }
      }

      if (newestDraft) {
        window.localStorage.setItem(SETUP_DRAFT_LAST_KEY, newestDraft.characterKey);
      } else {
        window.localStorage.removeItem(SETUP_DRAFT_LAST_KEY);
      }
    }
  } catch {
    return null;
  }
}

export function clearLastSetupDraft() {
  if (typeof window === "undefined") return;
  try {
    const lastKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
    if (lastKey) {
      window.localStorage.removeItem(getSetupDraftStorageKey(lastKey));
    }
    window.localStorage.removeItem(SETUP_DRAFT_LAST_KEY);
  } catch {
    // Ignore localStorage errors.
  }
}
