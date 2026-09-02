/*
  Per-character, hash-keyed cache for MapleScouter Additional Spec Simulator ("what if")
  results -- sibling to scouterCache.ts's real-result cache, same client-side/hash-keyed
  rationale (see that file's header), but under its OWN tool key so a one-off simulator run
  never mixes with a character's real saved Scouter result even though the two hashes could
  never actually collide (a simulator hash includes the patched level + full simulator
  overlay, a real hash never does).

  No TTL the way the real cache has one -- a simulator entry is inherently "as of when I ran
  this specific what-if," not something that silently drifts the way a real character's gear
  does in the background. No stale-fallback/auto-refresh either -- simulator runs are always
  a deliberate, explicit "Apply" click from the popup, never triggered passively.
*/

import { readCharacterToolData, writeCharacterToolData } from "../../tools/characterToolStorage";
import { buildSimulatorPayload, hashScouterPayload, type ScouterPayloadContext, type ScouterSimulatorOverrides } from "./scouterApi";
import { parseSimulatorCalcResponse, type ScouterErrorReason, type ScouterResultEntry } from "./scouterCache";
import type { StoredCharacterRecord } from "../model/charactersStore";

const SCOUTER_SIMULATOR_RESULT_TOOL_KEY = "scouterSimulatorResult";
const MAX_CACHE_ENTRIES = 8;

// Kept in lockstep with scouterCache.ts's SCOUTER_CACHE_VERSION conceptually -- a payload-
// shape fix to buildScouterPayload/buildSimulatorPayload should invalidate stale simulator
// entries too, same reasoning as the real cache's own version bump. Bumped independently
// (not literally shared) so a real-result-only fix doesn't force a needless simulator-cache
// wipe, and vice versa.
const SCOUTER_SIMULATOR_CACHE_VERSION = 1;

interface ScouterSimulatorCacheData {
  version: number;
  entries: Record<string, ScouterResultEntry>;
}

function readCache(characterName: string): ScouterSimulatorCacheData | null {
  const cache = readCharacterToolData<ScouterSimulatorCacheData>(characterName, SCOUTER_SIMULATOR_RESULT_TOOL_KEY);
  return cache && cache.version === SCOUTER_SIMULATOR_CACHE_VERSION ? cache : null;
}

function storeCacheEntry(characterName: string, hash: string, entry: ScouterResultEntry, existing: ScouterSimulatorCacheData | null): void {
  const entries = { ...(existing?.entries ?? {}), [hash]: entry };
  const hashes = Object.keys(entries);
  if (hashes.length > MAX_CACHE_ENTRIES) {
    const oldest = hashes.toSorted((a, b) => entries[a].computedAt - entries[b].computedAt)[0];
    delete entries[oldest];
  }
  writeCharacterToolData(characterName, SCOUTER_SIMULATOR_RESULT_TOOL_KEY, { version: SCOUTER_SIMULATOR_CACHE_VERSION, entries } satisfies ScouterSimulatorCacheData);
}

export type ScouterSimulatorRunResult =
  | { status: "ok"; entry: ScouterResultEntry }
  | { status: "unsupported" }
  | { status: "error"; reason: ScouterErrorReason };

const ERROR_CODE_TO_REASON: Record<string, ScouterErrorReason> = {
  RATE_LIMITED: "rate_limited",
  TIMEOUT: "timeout",
  BAD_RESPONSE: "bad_response",
  NETWORK: "network",
};

/** Runs a Scouter Simulator "what if", hash-cached the same way the real result is: an
 *  identical override combo (down to the character's own current real stats) is an instant
 *  hit, no network call. A hash miss POSTs through the scouter-simulator proxy route. Never
 *  throws -- every failure resolves to a tagged reason, same contract as the real cache's
 *  own fetch helper. */
export async function runScouterSimulator(
  character: StoredCharacterRecord,
  ctx: ScouterPayloadContext,
  overrides: ScouterSimulatorOverrides,
): Promise<ScouterSimulatorRunResult> {
  const request = buildSimulatorPayload(character, ctx, overrides);
  if (!request) return { status: "unsupported" };
  const hash = hashScouterPayload(request);

  const cache = readCache(character.characterName);
  const cached = cache?.entries[hash];
  if (cached) return { status: "ok", entry: cached };

  let response: Response;
  try {
    response = await fetch("/api/scouter-simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    return { status: "error", reason: "network" };
  }
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { code?: string } | null;
    const reason = errorBody?.code ? ERROR_CODE_TO_REASON[errorBody.code] : undefined;
    return { status: "error", reason: reason ?? "bad_response" };
  }
  const data = await response.json().catch(() => null);
  const entry = data === null ? null : parseSimulatorCalcResponse(data);
  if (!entry) return { status: "error", reason: "bad_response" };

  storeCacheEntry(character.characterName, hash, entry, cache);
  return { status: "ok", entry };
}
