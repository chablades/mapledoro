"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { findScouterSetupGap, isScouterSupportedClass, type ScouterSetupGap } from "./scouterApi";
import {
  autoRefreshScouterResultIfNeeded, peekScouterCache, refreshScouterResult,
  type ScouterErrorReason, type ScouterRefreshResult, type ScouterResultEntry,
} from "./scouterCache";
import { getScouterDevOverride, subscribeScouterDevOverride } from "./scouterDevDrill";

export type { ScouterErrorReason };

export type ScouterFigureStatus =
  | { kind: "unsupported" }
  | { kind: "incomplete"; gap: ScouterSetupGap }
  | { kind: "empty" }
  | { kind: "ready"; entry: ScouterResultEntry; stale: false }
  // stale is only ever reached via a failed refresh, so the reason is always known.
  | { kind: "ready"; entry: ScouterResultEntry; stale: true; reason: ScouterErrorReason }
  // reason/repeatedFailure are optional only so the dev drill can force a bare "error"
  // preview with neither -- a real refresh always supplies both.
  | { kind: "error"; reason?: ScouterErrorReason; repeatedFailure?: boolean };

export interface ScouterFigureState {
  status: ScouterFigureStatus;
  loading: boolean;
  canRefresh: boolean;
  refresh: () => void;
  justRefreshed: boolean;
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
  return cached ? { kind: "ready", entry: cached, stale: false } : { kind: "empty" };
}

/** Manual-refresh-only by design. Never fetches MapleScouter's API on its own. Reading
 *  the cache on mount (initialStatus) costs no network call, only the user clicking
 *  refresh does. */
export function useScouterResult(character: StoredCharacterRecord): ScouterFigureState {
  const [characterKey, setCharacterKey] = useState(character.characterName);
  const [status, setStatus] = useState<ScouterFigureStatus>(() => initialStatus(character));
  const [loading, setLoading] = useState(false);
  // Confirms a refresh actually happened even on a cache hit, where loading resolves near-
  // instantly and the figure often shows the same number -- otherwise clicking refresh on an
  // already-cached character looks like the click did nothing at all.
  const [justRefreshed, setJustRefreshed] = useState(false);

  // Re-derive when the viewed character changes, a render-time state adjustment (React's
  // documented pattern for resetting derived state on prop change), not a useEffect, so it
  // doesn't trip react-hooks/set-state-in-effect.
  if (characterKey !== character.characterName) {
    setCharacterKey(character.characterName);
    setStatus(initialStatus(character));
    setJustRefreshed(false);
  }

  useEffect(() => {
    if (!justRefreshed) return;
    const t = setTimeout(() => setJustRefreshed(false), 400);
    return () => clearTimeout(t);
  }, [justRefreshed]);

  // Auto-refresh, but only for a genuinely never-seen "empty" state, and only once per
  // hash per browser session (see autoRefreshScouterResultIfNeeded's own comment for why
  // this covers both "a new character just finished setup" and "an existing character's
  // data actually changed" with one rule, and why a failed attempt doesn't keep silently
  // retrying just from bouncing between bookmarks).
  useEffect(() => {
    if (status.kind !== "empty") return;
    let cancelled = false;
    // setLoading(true) can't run synchronously in the effect body (react-hooks/set-state-
    // in-effect) -- deferred a tick, same escape hatch useCharacterSetupController.ts's
    // hydrate effect already uses for the same restriction.
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

  const refresh = useCallback(() => {
    if (loading) return;
    setLoading(true);
    void refreshScouterResult(character).then((result) => {
      setLoading(false);
      setStatus(resultToStatus(result));
      setJustRefreshed(true);
    });
  }, [character, loading]);

  const canRefresh = !loading && (status.kind === "ready" || status.kind === "empty" || status.kind === "error");

  // Dev-only visual QA override (scouterDevDrill.ts) -- reactive via useSyncExternalStore
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
    return { status: devOverride, loading: false, canRefresh: overrideCanRefresh, refresh: () => {}, justRefreshed: false };
  }

  return { status, loading, canRefresh, refresh, justRefreshed };
}
