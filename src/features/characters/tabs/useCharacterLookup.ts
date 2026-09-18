import { useEffect, useRef, useState } from "react";
import {
  CHARACTER_NAME_REGEX,
  COOLDOWN_MS,
  LOOKUP_RESPONSE_SCHEMA_VERSION,
  LOOKUP_REQUEST_TIMEOUT_MS,
  LOOKUP_SLOW_NOTICE_MS,
  MAX_BROWSER_CACHE_ENTRIES,
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
} from "../model/constants";
import {
  getCooldownMessage,
  getFoundMessage,
  getInvalidIgnMessage,
  getNotFoundMessage,
  getUsageMessage,
  LOOKUP_MESSAGES,
} from "./messages";
import {
  loadBrowserCharacterCache,
  persistBrowserCharacterCache,
  type CharacterCacheEntry,
} from "../model/browserCharacterCache";
import type { LookupResponse, NormalizedCharacterData } from "../model/types";
import { normalizeLookupData } from "../model/types";

function clearLookupTimers(slowTimer: ReturnType<typeof setTimeout>, timeoutTimer: ReturnType<typeof setTimeout>) {
  clearTimeout(slowTimer);
  clearTimeout(timeoutTimer);
}

interface UseCharacterLookupArgs {
  query: string;
  onFoundCharacterChange: (character: NormalizedCharacterData | null) => void;
}

export function useCharacterLookup({
  query,
  onFoundCharacterChange,
}: UseCharacterLookupArgs) {
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState(() => getUsageMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [degradedCode, setDegradedCode] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [lastRequestAtMs, setLastRequestAtMs] = useState(0);
  const cacheRef = useRef<Map<string, CharacterCacheEntry> | null>(null);
  // react-doctor false positive: matches its own documented lazy-init exception, flags anyway.
  // react-doctor-disable-next-line react-doctor/no-ref-current-in-render
  if (cacheRef.current === null) cacheRef.current = new Map();

  useEffect(() => {
    cacheRef.current = loadBrowserCharacterCache();
  }, []);

  // Only ticks while an actual cooldown is counting down, not for the hook's whole
  // lifetime. A fresh interval starts per lookup and self-clears once that lookup's
  // cooldown window ends, instead of re-rendering every second indefinitely.
  useEffect(() => {
    if (lastRequestAtMs === 0) return;
    const remaining = COOLDOWN_MS - (Date.now() - lastRequestAtMs);
    if (remaining <= 0) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    const stopId = setTimeout(() => {
      clearInterval(id);
      // One last update at the true end time. The interval's own ticks land on 1000ms
      // boundaries from effect start rather than the cooldown's exact end, so without
      // this the final render is stuck showing about 1s remaining forever.
      setNowMs(Date.now());
    }, remaining);
    return () => {
      clearInterval(id);
      clearTimeout(stopId);
    };
  }, [lastRequestAtMs]);

  const cooldownRemainingMs =
    lastRequestAtMs === 0 ? 0 : Math.max(0, COOLDOWN_MS - (nowMs - lastRequestAtMs));
  const trimmedQuery = query.trim();
  const queryInvalid = !CHARACTER_NAME_REGEX.test(trimmedQuery);

  const persistCache = () => {
    cacheRef.current = persistBrowserCharacterCache(cacheRef.current!, MAX_BROWSER_CACHE_ENTRIES);
  };

  const resetSearchStateMessage = () => {
    setStatusTone("neutral");
    setStatusMessage(getUsageMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
  };

  const applyCachedLookupResult = (cached: CharacterCacheEntry) => {
    onFoundCharacterChange(cached.found && cached.data ? cached.data : null);
    setStatusTone(cached.found ? "neutral" : "error");
    setStatusMessage(cached.found ? getFoundMessage() : getNotFoundMessage());
    return cached.found;
  };

  const applyLookupResult = (name: string, normalized: string, result: LookupResponse) => {
    // Normalized before anything keeps it: response.json() is a cast, and this both seeds the
    // local cache and feeds the roster, so an under-filled payload would otherwise be stored
    // twice over and delete the character on the next load. A payload too thin to describe
    // anyone reads as not-found rather than being written.
    const data = result.found ? normalizeLookupData(result.data) : null;
    const found = data !== null;
    const resolvedName = data?.characterName ?? (result.found ? name : result.characterName || name);
    cacheRef.current!.set(normalized, {
      characterName: resolvedName,
      found,
      expiresAt: result.expiresAt,
      savedAt: Date.now(),
      data,
    });
    persistCache();
    setDegradedCode(result.degraded ? (result.degradedCode ?? "UNKNOWN") : null);
    if (data) {
      setStatusTone("neutral");
      onFoundCharacterChange(data);
      setStatusMessage(getFoundMessage());
      return true;
    }
    setStatusTone("error");
    onFoundCharacterChange(null);
    setStatusMessage(getNotFoundMessage());
    return false;
  };

  // Resolves whatever can be answered without a network request: an invalid name, a fresh
  // cache hit, a cooldown still counting down, or a lookup already in flight. Returns the
  // found/not-found boolean once one of those applies, or null when runLookup should proceed
  // to the real fetch. Also drops an expired cache entry as a side effect of checking it.
  const resolveWithoutFetch = (name: string, normalized: string): boolean | null => {
    if (!CHARACTER_NAME_REGEX.test(name)) {
      setStatusTone("error");
      setStatusMessage(getInvalidIgnMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
      return false;
    }

    const cached = cacheRef.current!.get(normalized);
    if (cached && Date.now() < cached.expiresAt) {
      return applyCachedLookupResult(cached);
    }
    if (cached && Date.now() >= cached.expiresAt) {
      cacheRef.current!.delete(normalized);
      persistCache();
    }

    if (cooldownRemainingMs > 0) {
      setStatusTone("error");
      setStatusMessage(getCooldownMessage(cooldownRemainingMs));
      return false;
    }
    if (isSearching) return false;

    return null;
  };

  // Returns whether the character was found, so callers (e.g. a stale-draft
  // resume re-fetch) can fall back to other data when a lookup fails.
  const runLookup = async (name: string): Promise<boolean> => {
    const normalized = name.toLowerCase();
    const resolved = resolveWithoutFetch(name, normalized);
    if (resolved !== null) return resolved;

    setIsSearching(true);
    setStatusTone("neutral");
    setStatusMessage(LOOKUP_MESSAGES.searching);
    const requestStartedAt = Date.now();
    setLastRequestAtMs(requestStartedAt);
    setNowMs(requestStartedAt);
    const controller = new AbortController();
    const slowTimer = setTimeout(() => {
      setStatusTone("neutral");
      setStatusMessage(LOOKUP_MESSAGES.searchingSlow);
    }, LOOKUP_SLOW_NOTICE_MS);
    const timeoutTimer = setTimeout(() => controller.abort(), LOOKUP_REQUEST_TIMEOUT_MS);

    const failLookup = (message: string) => {
      clearLookupTimers(slowTimer, timeoutTimer);
      setStatusTone("error");
      onFoundCharacterChange(null);
      setStatusMessage(message);
    };

    // Neither a `finally` nor a `throw` inside the `try`: the React Compiler
    // can't lower either yet and would leave the whole hook unmemoized. An HTTP
    // error is handled in place, and the catch covers network and abort errors.
    let found = false;
    try {
      const response = await fetch(
        `/api/characters/lookup?character_name=${encodeURIComponent(name)}&schema_version=${LOOKUP_RESPONSE_SCHEMA_VERSION}`,
        { cache: "no-store", signal: controller.signal },
      );
      clearLookupTimers(slowTimer, timeoutTimer);
      if (response.ok) {
        const result = (await response.json()) as LookupResponse;
        found = applyLookupResult(name, normalized, result);
      } else {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string; degradedCode?: string }
          | null;
        if (errorPayload?.degradedCode) setDegradedCode(errorPayload.degradedCode);
        failLookup(errorPayload?.error ?? `Lookup failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        failLookup(LOOKUP_MESSAGES.timeout);
      } else {
        failLookup(error instanceof Error ? error.message : LOOKUP_MESSAGES.failed);
      }
    }
    setIsSearching(false);
    return found;
  };

  return {
    isSearching,
    statusMessage,
    statusTone,
    degradedCode,
    cooldownRemainingMs,
    trimmedQuery,
    queryInvalid,
    resetSearchStateMessage,
    runLookup,
    setStatusMessage,
    setStatusTone,
  };
}
