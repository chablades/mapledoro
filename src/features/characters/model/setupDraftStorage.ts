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
  /** Which substep of the current step (Stats/Equipment/HEXA Matrix) was active —
   *  without this, resuming after a full page reload always fell back to substep 0,
   *  forgetting how far into a multi-screen step the player actually was. Reported up
   *  via each step's onSubstepChange as it navigates internally; 0 for step types
   *  without substeps. */
  setupSubstepIndex: number;
  setupStepTestByStep: SetupStepInputById;
  /** Last-known Next-button validity per "stepId:substepIndex" (or
   *  "flowId:stepId:substepIndex" for the few steps whose rule differs by flow) — see
   *  SetupStepFrame's onValidityChange. Persisted alongside setupStepTestByStep so
   *  resuming a draft that was left on invalid data doesn't silently forget that and
   *  ungate the step-jump dropdown until the step happens to be revisited. */
  stepValidityById: Record<string, boolean>;
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

function parseDraftStepValidityById(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean");
  return Object.fromEntries(entries);
}

function parseDraftSetupSubstepIndex(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
      setupSubstepIndex: parseDraftSetupSubstepIndex(parsed.setupSubstepIndex),
      setupStepTestByStep: parseDraftStepTestByStep(parsed.setupStepTestByStep),
      stepValidityById: parseDraftStepValidityById(parsed.stepValidityById),
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

// Drafts untouched for longer than this are dropped on the next prune: stale base
// data + clutter, no value. Caps the kept count so a name-masher can't grow storage
// without bound.
const SETUP_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SETUP_DRAFTS = 5;

function collectSetupDraftEntries(): { key: string; draft: SetupDraft }[] {
  if (typeof window === "undefined") return [];
  const entries: { key: string; draft: SetupDraft }[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(SETUP_DRAFT_STORAGE_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    const draft = parseSetupDraft(raw);
    if (!draft) continue;
    entries.push({ key, draft });
  }
  return entries;
}

export function readSetupDraftByCharacter(character: NormalizedCharacterData): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const characterKey = makeDraftCharacterKey(character);
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(characterKey));
  if (!raw) return null;
  return parseSetupDraft(raw);
}

// Drops drafts past the TTL and caps the rest to the most-recent MAX, deleting the
// evicted entries from storage. Returns the survivors sorted newest-first.
export function pruneAndReadSetupDrafts(): SetupDraft[] {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  const live: { key: string; draft: SetupDraft }[] = [];
  for (const entry of collectSetupDraftEntries()) {
    // savedAt === 0 is a freshly-created draft not yet stamped by the persistence
    // effect — keep it rather than mistaking the epoch for a 56-year-old draft.
    if (entry.draft.savedAt > 0 && now - entry.draft.savedAt > SETUP_DRAFT_TTL_MS) {
      window.localStorage.removeItem(entry.key);
      continue;
    }
    live.push(entry);
  }
  live.sort((a, b) => b.draft.savedAt - a.draft.savedAt);
  for (const evicted of live.slice(MAX_SETUP_DRAFTS)) {
    window.localStorage.removeItem(evicted.key);
  }
  return live.slice(0, MAX_SETUP_DRAFTS).map((entry) => entry.draft);
}

export function readSetupDraftByKey(characterKey: string): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(normalizeCharacterKey(characterKey)));
  if (!raw) return null;
  return parseSetupDraft(raw);
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

