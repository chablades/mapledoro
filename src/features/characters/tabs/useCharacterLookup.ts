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
  const cacheRef = useRef<Map<string, CharacterCacheEntry>>(new Map());

  useEffect(() => {
    cacheRef.current = loadBrowserCharacterCache();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cooldownRemainingMs =
    lastRequestAtMs === 0 ? 0 : Math.max(0, COOLDOWN_MS - (nowMs - lastRequestAtMs));
  const trimmedQuery = query.trim();
  const queryInvalid = !CHARACTER_NAME_REGEX.test(trimmedQuery);

  const persistCache = () => {
    cacheRef.current = persistBrowserCharacterCache(cacheRef.current, MAX_BROWSER_CACHE_ENTRIES);
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
    const found = result.found;
    const resolvedName = found ? result.data.characterName : result.characterName || name;
    cacheRef.current.set(normalized, {
      characterName: resolvedName,
      found: result.found,
      expiresAt: result.expiresAt,
      savedAt: Date.now(),
      data: result.found ? result.data : null,
    });
    persistCache();
    setDegradedCode(result.degraded ? (result.degradedCode ?? "UNKNOWN") : null);
    if (found) {
      setStatusTone("neutral");
      onFoundCharacterChange(result.data);
      setStatusMessage(getFoundMessage());
      return true;
    }
    setStatusTone("error");
    onFoundCharacterChange(null);
    setStatusMessage(getNotFoundMessage());
    return false;
  };

  // Returns whether the character was found, so callers (e.g. a stale-draft
  // resume re-fetch) can fall back to other data when a lookup fails.
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const runLookup = async (name: string): Promise<boolean> => {
    const normalized = name.toLowerCase();
    if (!CHARACTER_NAME_REGEX.test(name)) {
      setStatusTone("error");
      setStatusMessage(getInvalidIgnMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
      return false;
    }

    const cached = cacheRef.current.get(normalized);
    if (cached && Date.now() < cached.expiresAt) {
      return applyCachedLookupResult(cached);
    }
    if (cached && Date.now() >= cached.expiresAt) {
      cacheRef.current.delete(normalized);
      persistCache();
    }

    if (cooldownRemainingMs > 0) {
      setStatusTone("error");
      setStatusMessage(getCooldownMessage(cooldownRemainingMs));
      return false;
    }
    if (isSearching) return false;

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

    try {
      const response = await fetch(
        `/api/characters/lookup?character_name=${encodeURIComponent(name)}&schema_version=${LOOKUP_RESPONSE_SCHEMA_VERSION}`,
        { cache: "no-store", signal: controller.signal },
      );
      clearLookupTimers(slowTimer, timeoutTimer);
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string; degradedCode?: string }
          | null;
        if (errorPayload?.degradedCode) setDegradedCode(errorPayload.degradedCode);
        throw new Error(errorPayload?.error ?? `Lookup failed with status ${response.status}`);
      }
      const result = (await response.json()) as LookupResponse;
      return applyLookupResult(name, normalized, result);
    } catch (error) {
      clearLookupTimers(slowTimer, timeoutTimer);
      setStatusTone("error");
      onFoundCharacterChange(null);
      if (error instanceof Error && error.name === "AbortError") {
        setStatusMessage(LOOKUP_MESSAGES.timeout);
        return false;
      }
      setStatusMessage(error instanceof Error ? error.message : LOOKUP_MESSAGES.failed);
      return false;
    } finally {
      setIsSearching(false);
    }
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
