/*
  LocalStorage helpers for per-character setup draft persistence.
*/
import type { SetupStepInputById } from "../setup/types";
import { clampFlowStepIndex, getRequiredSetupFlowId, type SetupFlowId } from "../setup/flows";
import type { NormalizedCharacterData } from "./types";
import { normalizeCharacterKey, normalizeCharacterName } from "./characterKeys";
import { SETUP_DRAFT_STORAGE_PREFIX, type SetupMode } from "./constants";

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
  setupStepIndex: number;
  setupStepDirection: "forward" | "backward";
  setupStepTestByStep: SetupStepInputById;
  confirmedCharacter: NormalizedCharacterData | null;
  savedAt: number;
}

export function makeDraftCharacterKey(character: NormalizedCharacterData) {
  return normalizeCharacterName(character.characterName);
}

function parseDraftActiveFlowId(value: unknown): SetupFlowId {
  return typeof value === "string" ? (value as SetupFlowId) : getRequiredSetupFlowId();
}

function parseDraftCompletedFlowIds(value: unknown): SetupFlowId[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is SetupFlowId => typeof entry === "string")
    : [];
}

function parseDraftStepTestByStep(value: unknown): SetupStepInputById {
  return value && typeof value === "object" ? (value as SetupStepInputById) : {};
}

function parseSetupDraft(raw: string): SetupDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    if (parsed.version !== 1) return null;
    if (!parsed.confirmedCharacter) return null;
    if (typeof parsed.query !== "string") return null;
    if (typeof parsed.characterKey !== "string" || !parsed.characterKey.trim()) return null;
    const activeFlowId = parseDraftActiveFlowId(parsed.activeFlowId);
    const completedFlowIds = parseDraftCompletedFlowIds(parsed.completedFlowIds);
    return {
      version: 1,
      characterKey: normalizeCharacterKey(parsed.characterKey),
      query: parsed.query,
      setupMode: parsed.setupMode === "search" || parsed.setupMode === "import" ? parsed.setupMode : "search",
      setupFlowStarted: Boolean(parsed.setupFlowStarted),
      autoResumeOnLoad: parsed.autoResumeOnLoad !== false,
      activeFlowId,
      completedFlowIds,
      showFlowOverview: Boolean(parsed.showFlowOverview) && completedFlowIds.length > 0,
      showCharacterDirectory: Boolean(parsed.showCharacterDirectory) && completedFlowIds.length > 0,
      setupStepIndex: clampFlowStepIndex(activeFlowId, Number(parsed.setupStepIndex ?? 0)),
      setupStepDirection: parsed.setupStepDirection === "backward" ? "backward" : "forward",
      setupStepTestByStep: parseDraftStepTestByStep(parsed.setupStepTestByStep),
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
  const characterKey = makeDraftCharacterKey(character);
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(characterKey));
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

export function readLastSetupDraft(): SetupDraft | null {
  if (typeof window === "undefined") return null;
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
  return newestDraft;
}

export function writeSetupDraft(draft: SetupDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSetupDraftStorageKey(draft.characterKey), JSON.stringify(draft));
  } catch {
    // Ignore localStorage write failures.
  }
}


export function removeSetupDraftForCharacter(character: NormalizedCharacterData) {
  if (typeof window === "undefined") return;
  try {
    const characterKey = makeDraftCharacterKey(character);
    window.localStorage.removeItem(getSetupDraftStorageKey(characterKey));
  } catch {
    return null;
  }
}

