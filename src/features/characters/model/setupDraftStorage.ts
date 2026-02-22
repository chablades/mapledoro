/*
  LocalStorage helpers for per-character setup draft persistence.
*/
import type { SetupStepInputById } from "../setup/types";
import { clampSetupStepIndex } from "../setup/steps";
import type { NormalizedCharacterData } from "./types";
import { SETUP_DRAFT_LAST_KEY, SETUP_DRAFT_STORAGE_PREFIX, type SetupMode } from "./constants";

export interface SetupDraft {
  version: 1;
  characterKey: string;
  query: string;
  setupMode: SetupMode;
  setupFlowStarted: boolean;
  autoResumeOnLoad: boolean;
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
    return {
      version: 1,
      characterKey: parsed.characterKey,
      query: parsed.query,
      setupMode: parsed.setupMode === "search" || parsed.setupMode === "import" ? parsed.setupMode : "search",
      setupFlowStarted: Boolean(parsed.setupFlowStarted),
      autoResumeOnLoad: parsed.autoResumeOnLoad !== false,
      setupStepIndex: clampSetupStepIndex(Number(parsed.setupStepIndex ?? 0)),
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

export function readLastSetupDraft(): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const draftKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
  if (!draftKey) return null;
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(draftKey));
  if (!raw) return null;
  return parseSetupDraft(raw);
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
      window.localStorage.removeItem(SETUP_DRAFT_LAST_KEY);
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
