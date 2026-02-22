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

interface UseCharacterLookupArgs {
  query: string;
  onFoundCharacterChange: (character: NormalizedCharacterData | null) => void;
}

export function useCharacterLookup({
  query,
  onFoundCharacterChange,
}: UseCharacterLookupArgs) {
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState(getUsageMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [nowMs, setNowMs] = useState(Date.now());
  const lastRequestAtRef = useRef(0);
  const cacheRef = useRef<Map<string, CharacterCacheEntry>>(new Map());

  useEffect(() => {
    cacheRef.current = loadBrowserCharacterCache();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - (nowMs - lastRequestAtRef.current));
  const trimmedQuery = query.trim();
  const queryInvalid = !CHARACTER_NAME_REGEX.test(trimmedQuery);

  const persistCache = () => {
    cacheRef.current = persistBrowserCharacterCache(cacheRef.current, MAX_BROWSER_CACHE_ENTRIES);
  };

  const resetSearchStateMessage = () => {
    setStatusTone("neutral");
    setStatusMessage(getUsageMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
  };

  const runLookup = async (name: string) => {
    const normalized = name.toLowerCase();
    if (!CHARACTER_NAME_REGEX.test(name)) {
      setStatusTone("error");
      setStatusMessage(getInvalidIgnMessage(MIN_QUERY_LENGTH, MAX_QUERY_LENGTH));
      return;
    }

    const cached = cacheRef.current.get(normalized);
    if (cached && Date.now() < cached.expiresAt) {
      onFoundCharacterChange(cached.found && cached.data ? cached.data : null);
      setStatusTone(cached.found ? "neutral" : "error");
      setStatusMessage(cached.found ? getFoundMessage(0) : getNotFoundMessage(0));
      return;
    }
    if (cached && Date.now() >= cached.expiresAt) {
      cacheRef.current.delete(normalized);
      persistCache();
    }

    if (cooldownRemainingMs > 0) {
      setStatusTone("error");
      setStatusMessage(getCooldownMessage(cooldownRemainingMs));
      return;
    }
    if (isSearching) return;

    setIsSearching(true);
    setStatusTone("neutral");
    setStatusMessage(LOOKUP_MESSAGES.searching);
    lastRequestAtRef.current = Date.now();
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
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorPayload?.error ?? `Lookup failed with status ${response.status}`);
      }
      const result = (await response.json()) as LookupResponse;
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
      if (found) {
        setStatusTone("neutral");
        onFoundCharacterChange(result.data);
        setStatusMessage(getFoundMessage(result.queuedMs));
      } else {
        setStatusTone("error");
        onFoundCharacterChange(null);
        setStatusMessage(getNotFoundMessage(result.queuedMs));
      }
    } catch (error) {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      setStatusTone("error");
      onFoundCharacterChange(null);
      if (error instanceof Error && error.name === "AbortError") {
        setStatusMessage(LOOKUP_MESSAGES.timeout);
        return;
      }
      setStatusMessage(error instanceof Error ? error.message : LOOKUP_MESSAGES.failed);
    } finally {
      setIsSearching(false);
    }
  };

  return {
    isSearching,
    statusMessage,
    statusTone,
    cooldownRemainingMs,
    trimmedQuery,
    queryInvalid,
    resetSearchStateMessage,
    runLookup,
    setStatusMessage,
    setStatusTone,
  };
}
