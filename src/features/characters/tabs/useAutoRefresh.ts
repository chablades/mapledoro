import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toCharacterKey } from "../model/characterKeys";
import { LOOKUP_RESPONSE_SCHEMA_VERSION } from "../model/constants";
import type { StoredCharacterRecord } from "../model/charactersStore";
import type { LookupResponse, NormalizedCharacterData } from "../model/types";

// The lookup API caps an IP at LOOKUP_IP_MINUTE_LIMIT (7) requests per minute, so this
// background sweep has to stay well under that or it 429s itself on load for anyone with
// more than a handful of stale characters. 20s pacing is 3/min, leaving ~4/min of headroom
// for the manual lookups the same visitor makes while the sweep runs (both share one
// per-IP budget). Raising the server cap is the only way to make this faster.
const REFRESH_GAP_MS = 20000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

// "rate_limited" is reported separately so the sweep can stop instead of firing the rest
// of the queue into a wall: every rejected call still counts against the per-IP window,
// which only steals budget from whatever the visitor does next.
type RefreshOutcome =
  | { kind: "done"; data: NormalizedCharacterData | null }
  | { kind: "rate_limited" };

async function fetchFreshCharacter(
  characterName: string,
  signal: AbortSignal,
): Promise<RefreshOutcome> {
  try {
    const response = await fetch(
      `/api/characters/lookup?character_name=${encodeURIComponent(characterName)}&schema_version=${LOOKUP_RESPONSE_SCHEMA_VERSION}`,
      { cache: "no-store", signal },
    );
    if (response.status === 429) return { kind: "rate_limited" };
    if (!response.ok) return { kind: "done", data: null };
    const result = (await response.json()) as LookupResponse;
    return { kind: "done", data: result.found ? result.data : null };
  } catch {
    return { kind: "done", data: null };
  }
}

// Walks the stale queue one character at a time, REFRESH_GAP_MS apart. Every post-await
// setter returns early when the signal is aborted, so nothing writes state after cleanup.
async function runRefreshSweep(
  queue: StoredCharacterRecord[],
  signal: AbortSignal,
  setRefreshingKeys: Dispatch<SetStateAction<ReadonlySet<string>>>,
  onRefreshed: (fresh: NormalizedCharacterData) => void,
) {
  setRefreshingKeys(new Set(queue.map(toCharacterKey)));
  for (let i = 0; i < queue.length; i++) {
    const character = queue[i];
    const outcome = await fetchFreshCharacter(character.characterName, signal);
    if (signal.aborted) return;
    if (outcome.kind === "rate_limited") {
      setRefreshingKeys(new Set());
      return;
    }
    if (outcome.data) onRefreshed(outcome.data);
    const key = toCharacterKey(character);
    setRefreshingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    if (i < queue.length - 1) await sleep(REFRESH_GAP_MS, signal);
  }
}

export function useAutoRefresh({
  queue,
  onRefreshed,
}: {
  queue: StoredCharacterRecord[];
  onRefreshed: (fresh: NormalizedCharacterData) => void;
}) {
  const [refreshingKeys, setRefreshingKeys] = useState<ReadonlySet<string>>(() => new Set());
  const onRefreshedRef = useRef(onRefreshed);
  useEffect(() => { onRefreshedRef.current = onRefreshed; });

  // react-doctor-disable-next-line no-fetch-in-effect, react-doctor/no-set-state-after-await-in-effect -- one-shot fetch with proper AbortController cleanup; this project hasn't adopted a data-fetching library, matches the rule's own documented FP criteria. Every post-await setter (setRefreshingKeys, onRefreshedRef.current) is already gated behind !signal.aborted, and cleanup calls controller.abort() synchronously.
  useEffect(() => {
    if (queue.length === 0) return;
    const controller = new AbortController();
    const { signal } = controller;

    void runRefreshSweep(queue, signal, setRefreshingKeys, (fresh) => onRefreshedRef.current(fresh));

    return () => {
      controller.abort();
      setRefreshingKeys(new Set());
    };
  }, [queue]);

  const refreshSingle = useCallback(async (character: StoredCharacterRecord) => {
    const key = toCharacterKey(character);
    setRefreshingKeys((prev) => new Set([...prev, key]));
    const outcome = await fetchFreshCharacter(character.characterName, new AbortController().signal);
    if (outcome.kind === "done" && outcome.data) onRefreshedRef.current(outcome.data);
    setRefreshingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }, []);

  return { refreshingKeys, refreshSingle };
}
