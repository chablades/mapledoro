// Dev-only preview drill for the Scouter figure's UI states -- lets a developer eyeball
// every status/tooltip variant without needing to actually trigger each one for real (a
// real timeout/rate-limit/etc. is now genuinely detected, but still awkward to reproduce
// on demand for visual QA). Throwaway visual-QA tooling, not a permanent feature. Every
// entry point is behind NODE_ENV, same convention as wipeTripwire.ts's
// __mapledoroTestTripwire drill.

import type { ScouterFigureStatus } from "./useScouterResult";

const overrides = new Map<string, ScouterFigureStatus>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeScouterDevOverride(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getScouterDevOverride(characterName: string): ScouterFigureStatus | null {
  return overrides.get(characterName.trim().toLowerCase()) ?? null;
}

function placeholderEntry(computedAt: number) {
  return {
    computedAt,
    boss300Normal: 98765,
    boss300Hexa: 96543,
    boss380Normal: 118420,
    boss380Hexa: 112984,
    convertedPowerNormal: 61200,
    convertedPowerHexa: 58900,
    dojoPower: 43100,
  };
}

// Built fresh per call (not a module-scope constant) -- Date.now() frozen at module load
// would make "As of X ago" drift wrong the longer the page's been open before the drill
// runs (a "1 hour stale" example would read as "3 hours ago" after sitting open a while).
function buildExampleStatuses(): Record<string, ScouterFigureStatus> {
  const now = Date.now();
  const staleEntry = placeholderEntry(now - 3600_000);
  return {
    unsupported: { kind: "unsupported" },
    incomplete_character_info: { kind: "incomplete", gap: "characterInfo" },
    incomplete_quick_questions: { kind: "incomplete", gap: "quickQuestions" },
    empty: { kind: "empty" },
    ready: { kind: "ready", entry: placeholderEntry(now), stale: false },
    ready_stale_rate_limited: { kind: "ready", entry: staleEntry, stale: true, reason: "rate_limited" },
    ready_stale_timeout: { kind: "ready", entry: staleEntry, stale: true, reason: "timeout" },
    ready_stale_bad_response: { kind: "ready", entry: staleEntry, stale: true, reason: "bad_response" },
    ready_stale_network: { kind: "ready", entry: staleEntry, stale: true, reason: "network" },
    error: { kind: "error" },
    error_rate_limited: { kind: "error", reason: "rate_limited" },
    error_timeout: { kind: "error", reason: "timeout" },
    error_bad_response: { kind: "error", reason: "bad_response" },
    error_bad_response_repeated: { kind: "error", reason: "bad_response", repeatedFailure: true },
    error_network: { kind: "error", reason: "network" },
  };
}

/** Dev-only drill: `__mapledoroForceScouterStatus("fuyurin64", "error_timeout")` forces
 *  that character's Scouter figure to render as if in that state, reactively (no reload,
 *  no navigation needed). Pass `null` as the second argument to clear the override. Valid
 *  names are buildExampleStatuses()' keys. Nothing is saved -- purely an in-memory render
 *  override. */
function installScouterStatusDrill() {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const target = window as typeof window & {
    __mapledoroForceScouterStatus?: (name: string, statusName: string | null) => void;
  };
  if (target.__mapledoroForceScouterStatus) return;
  target.__mapledoroForceScouterStatus = (name, statusName) => {
    const key = name.trim().toLowerCase();
    if (statusName === null) {
      overrides.delete(key);
      console.info(`[scouter drill] cleared override for ${key}.`);
      notify();
      return;
    }
    const exampleStatuses = buildExampleStatuses();
    const status = exampleStatuses[statusName];
    if (!status) {
      console.warn(`[scouter drill] unknown status "${statusName}". Options: ${Object.keys(exampleStatuses).join(", ")}`);
      return;
    }
    overrides.set(key, status);
    console.info(`[scouter drill] forcing ${key}'s Scouter figure to "${statusName}". Nothing is saved -- __mapledoroForceScouterStatus("${key}", null) to clear.`);
    notify();
  };
}

installScouterStatusDrill();
