import { useCallback, useEffect, useRef, useState } from "react";
import { toCharacterKey } from "../model/characterKeys";
import { LOOKUP_RESPONSE_SCHEMA_VERSION } from "../model/constants";
import type { StoredCharacterRecord } from "../model/charactersStore";
import type { LookupResponse, NormalizedCharacterData } from "../model/types";

const REFRESH_GAP_MS = 5100;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

async function fetchFreshCharacter(
  characterName: string,
  signal: AbortSignal,
): Promise<NormalizedCharacterData | null> {
  try {
    const response = await fetch(
      `/api/characters/lookup?character_name=${encodeURIComponent(characterName)}&schema_version=${LOOKUP_RESPONSE_SCHEMA_VERSION}`,
      { cache: "no-store", signal },
    );
    if (!response.ok) return null;
    const result = (await response.json()) as LookupResponse;
    return result.found ? result.data : null;
  } catch {
    return null;
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

  useEffect(() => {
    if (queue.length === 0) return;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      setRefreshingKeys(new Set(queue.map(toCharacterKey)));
      for (let i = 0; i < queue.length; i++) {
        if (signal.aborted) break;
        const character = queue[i];
        const key = toCharacterKey(character);
        const fresh = await fetchFreshCharacter(character.characterName, signal);
        if (fresh && !signal.aborted) onRefreshedRef.current(fresh);
        if (!signal.aborted) {
          setRefreshingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
          if (i < queue.length - 1) await sleep(REFRESH_GAP_MS, signal);
        }
      }
    })();

    return () => {
      controller.abort();
      setRefreshingKeys(new Set());
    };
  }, [queue]);

  const refreshSingle = useCallback(async (character: StoredCharacterRecord) => {
    const key = toCharacterKey(character);
    setRefreshingKeys((prev) => new Set([...prev, key]));
    const fresh = await fetchFreshCharacter(character.characterName, new AbortController().signal);
    if (fresh) onRefreshedRef.current(fresh);
    setRefreshingKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }, []);

  return { refreshingKeys, refreshSingle };
}
