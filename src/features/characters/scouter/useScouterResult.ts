"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { findScouterSetupGap, isScouterSupportedClass, type ScouterSetupGap } from "./scouterApi";
import {
  autoRefreshScouterResultIfNeeded, isScouterRefreshInFlight, peekScouterCache, peekScouterLastKnown,
  refreshScouterResult, subscribeScouterRefreshInFlight,
  type ScouterErrorReason, type ScouterRefreshResult, type ScouterResultEntry,
} from "./scouterCache";
import { getScouterDevOverride, subscribeScouterDevOverride } from "./scouterDevDrill";

export type { ScouterErrorReason };

export type ScouterFigureStatus =
  | { kind: "unsupported" }
  | { kind: "incomplete"; gap: ScouterSetupGap }
  | { kind: "empty" }
  | { kind: "ready"; entry: ScouterResultEntry; stale: false }
  // reason is set when this came from a failed refresh this session; unset on a cold
  // mount showing a previous build's last known value that simply hasn't been
  // recomputed for the character's current inputs yet (see initialStatus below). The
  // UI must not say an error happened in that second case.
  | { kind: "ready"; entry: ScouterResultEntry; stale: true; reason?: ScouterErrorReason }
  // reason/repeatedFailure are optional only so the dev drill can force a bare "error"
  // preview with neither. A real refresh always supplies both.
  | { kind: "error"; reason?: ScouterErrorReason; repeatedFailure?: boolean };

export interface ScouterFigureState {
  status: ScouterFigureStatus;
  loading: boolean;
  canRefresh: boolean;
  refresh: () => void;
  justRefreshed: boolean;
  // True briefly after a refresh that returned the same cached entry, meaning the same
  // computedAt. MapleScouter wasn't re-queried, since the inputs haven't changed since the
  // last calculation. Without this a refresh on unchanged stats looks like it did nothing.
  justRefreshedUnchanged: boolean;
}

function resultToStatus(result: ScouterRefreshResult): ScouterFigureStatus {
  switch (result.status) {
    case "ok":
      return result.stale
        ? { kind: "ready", entry: result.entry, stale: true, reason: result.reason }
        : { kind: "ready", entry: result.entry, stale: false };
    case "unsupported": return { kind: "unsupported" };
    case "empty": return { kind: "empty" };
    case "error": return { kind: "error", reason: result.reason, repeatedFailure: result.repeatedFailure };
  }
}

function initialStatus(character: StoredCharacterRecord): ScouterFigureStatus {
  if (!isScouterSupportedClass(character.jobName)) return { kind: "unsupported" };
  const gap = findScouterSetupGap(character);
  if (gap) return { kind: "incomplete", gap };
  const cached = peekScouterCache(character);
  if (cached) return { kind: "ready", entry: cached, stale: false };
  // No result for the current inputs, say because stats were just edited, but a previous
  // build's result is still in the cache. Show that instead of dropping to empty or the
  // "--" placeholder. Same last-known-value fallback a failed refresh gets in-session,
  // surviving a remount too (see peekScouterLastKnown).
  const lastKnown = peekScouterLastKnown(character);
  return lastKnown ? { kind: "ready", entry: lastKnown, stale: true } : { kind: "empty" };
}

/** Manual-refresh-only by design. Never fetches MapleScouter's API on its own. Reading
 *  the cache on mount (initialStatus) costs no network call, only the user clicking
 *  refresh does. */
export function useScouterResult(character: StoredCharacterRecord): ScouterFigureState {
  const [characterKey, setCharacterKey] = useState(character.characterName);
  const [status, setStatus] = useState<ScouterFigureStatus>(() => initialStatus(character));
  const [loading, setLoading] = useState(false);
  // Confirms a refresh actually happened even on a cache hit, where loading resolves near-
  // instantly and the figure often shows the same number. Otherwise clicking refresh on an
  // already-cached character looks like the click did nothing.
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [justRefreshedUnchanged, setJustRefreshedUnchanged] = useState(false);

  // Re-derive when the viewed character changes, a render-time state adjustment (React's
  // documented pattern for resetting derived state on prop change), not a useEffect, so it
  // doesn't trip react-hooks/set-state-in-effect.
  if (characterKey !== character.characterName) {
    setCharacterKey(character.characterName);
    setStatus(initialStatus(character));
    setJustRefreshed(false);
    setJustRefreshedUnchanged(false);
  }

  useEffect(() => {
    if (!justRefreshed) return;
    const t = setTimeout(() => setJustRefreshed(false), 400);
    return () => clearTimeout(t);
  }, [justRefreshed]);

  // A separate, longer-lived timeout than justRefreshed's 400ms button flash. This drives an
  // inline note a player has to read rather than merely notice, so it needs time on screen
  // instead of disappearing with the flash.
  useEffect(() => {
    if (!justRefreshedUnchanged) return;
    const t = setTimeout(() => setJustRefreshedUnchanged(false), 4000);
    return () => clearTimeout(t);
  }, [justRefreshedUnchanged]);

  // Auto-refresh, but only for a genuinely never-seen "empty" state, and only once per
  // hash per browser session (see autoRefreshScouterResultIfNeeded's own comment for why
  // this covers both "a new character just finished setup" and "an existing character's
  // data actually changed" with one rule, and why a failed attempt doesn't keep silently
  // retrying just from bouncing between bookmarks).
  useEffect(() => {
    if (status.kind !== "empty") return;
    let cancelled = false;
    // setLoading(true) can't run synchronously in the effect body (react-hooks/set-state-
    // in-effect), so it is deferred a tick. Same escape hatch
    // useCharacterSetupController.ts's hydrate effect uses for the same restriction.
    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      void autoRefreshScouterResultIfNeeded(character).then((result) => {
        if (cancelled) return;
        setLoading(false);
        if (result) setStatus(resultToStatus(result));
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [status.kind, character]);

  // Reactive read of another useScouterResult instance's in-flight refresh for this same
  // character. The Overview figure and a bookmark header each run their own instance with no
  // shared React state otherwise. refreshScouterResult already dedupes the network call, but
  // without this a freshly mounted instance's own `loading` starts false and its button would
  // look clickable mid-refresh.
  const refreshInFlightElsewhere = useSyncExternalStore(
    subscribeScouterRefreshInFlight,
    () => isScouterRefreshInFlight(character.characterName),
    () => false,
  );
  const effectiveLoading = loading || refreshInFlightElsewhere;

  const refresh = useCallback(() => {
    if (effectiveLoading) return;
    // Captured before the fetch so the "unchanged" check has the pre-click timestamp to
    // compare against, not whatever `status` becomes by the time the promise resolves.
    const computedAtBeforeRefresh = status.kind === "ready" ? status.entry.computedAt : null;
    setLoading(true);
    void refreshScouterResult(character).then((result) => {
      setLoading(false);
      setStatus(resultToStatus(result));
      setJustRefreshed(true);
      setJustRefreshedUnchanged(
        result.status === "ok" && computedAtBeforeRefresh !== null && result.entry.computedAt === computedAtBeforeRefresh,
      );
    });
  }, [character, effectiveLoading, status]);

  const canRefresh = !effectiveLoading && (status.kind === "ready" || status.kind === "empty" || status.kind === "error");

  // Dev-only visual QA override (scouterDevDrill.ts), reactive via useSyncExternalStore
  // so calling __mapledoroForceScouterStatus in the console updates the figure immediately,
  // no reload or navigation needed. Called after every other hook above unconditionally,
  // so this early return never violates the Rules of Hooks.
  const devOverride = useSyncExternalStore(
    subscribeScouterDevOverride,
    () => getScouterDevOverride(character.characterName),
    () => null,
  );
  if (devOverride) {
    const overrideCanRefresh = devOverride.kind === "ready" || devOverride.kind === "empty" || devOverride.kind === "error";
    return { status: devOverride, loading: false, canRefresh: overrideCanRefresh, refresh: () => {}, justRefreshed: false, justRefreshedUnchanged: false };
  }

  return { status, loading: effectiveLoading, canRefresh, refresh, justRefreshed, justRefreshedUnchanged };
}
