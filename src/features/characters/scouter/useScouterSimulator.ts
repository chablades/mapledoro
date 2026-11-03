"use client";

import { useCallback, useState } from "react";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { resolveScouterContext, useScouterWorldContext } from "./scouterWorldContext";
import type { ScouterSimulatorOverrides } from "./scouterApi";
import { runScouterSimulator } from "./scouterSimulatorRun";
import { loadScouterResultFor, type ScouterErrorReason, type ScouterResultEntry } from "./scouterResult";

/** True when the override combo touches only level, Arcane Force and Sacred Power, fields that
 *  don't enter the damage calculation and feed purely local Boss Clear Grid gap math (see
 *  ScouterSimulatorOverrides' own field comments). Applying one of these alone reuses the
 *  character's real result, which is just as accurate.
 *
 *  buildOverrides (useScouterSimulatorDraft.ts) omits every untouched tab group, so an absent
 *  group here means unchanged. This is a presence check. */
function isLocalOnlyOverride(overrides: ScouterSimulatorOverrides): boolean {
  return (!overrides.finalDmgPercent || Number(overrides.finalDmgPercent) === 0)
    && !overrides.hexaCoreOverrides
    && !overrides.dopingOverrides
    && !overrides.ringOverrides
    && !overrides.linkSkillOverrides
    && !overrides.infoOverrides
    && Object.values(overrides.input ?? {}).every((v) => v === undefined || Number(v) === 0);
}

/** The overrides a player can set from the Scouter Simulator popup. Level, Arcane Force and
 *  Sacred Power don't enter the damage calculation and feed purely local Boss Clear Grid formula
 *  math. The rest, such as finalDmgPercent and hexaCoreOverrides,
 *  become part of the real request via buildDirectScouterPayload. */
interface ScouterSimulatorState {
  overrides: ScouterSimulatorOverrides;
  entry: ScouterResultEntry;
}

export type ScouterSimulatorApplyResult =
  | { status: "ok" }
  | { status: "unsupported" }
  | { status: "error"; reason: ScouterErrorReason; detail?: string };

export interface ScouterSimulatorController {
  /** The currently-applied simulation, or null when the bookmark is showing the real
   *  result. Session-only, held in plain React state, so a page reload drops back to real
   *  per the product decision. */
  active: ScouterSimulatorState | null;
  applying: boolean;
  /** Runs the simulator for the given overrides. On success,
   *  sets `active` and resolves { status: "ok" }, which the popup uses to close itself. On
   *  failure `active` is left untouched, so the bookmark keeps showing what it showed before,
   *  and the reason is returned for the popup's own inline error message. */
  apply: (overrides: ScouterSimulatorOverrides) => Promise<ScouterSimulatorApplyResult>;
  /** Clears back to the real Scouter result. */
  reset: () => void;
}

/** Owns a character's currently-applied Scouter Simulator "what if" state. Lives in
 *  BookmarkPageBody (CharacterProfileOverviewScreen.tsx), the shared ancestor of both
 *  ScouterFigure on Overview and ScouterBookmark on the Scouter tab, and is passed down to
 *  both. So an applied simulation replaces the real figure and Boss Clear grid in both places
 *  at once, per the Scouter Simulator plan's product decision, rather than each owning a
 *  separate instance.
 *
 *  Accepts a possibly-null character (unlike useScouterResult, which is only ever called
 *  from an already character-gated leaf component) because BookmarkPageBody itself renders
 *  before a character is confirmed. The hook must still be called unconditionally under the
 *  Rules of Hooks, so it short-circuits internally instead of requiring its caller to gate
 *  the call. */
export function useScouterSimulator(character: StoredCharacterRecord | null): ScouterSimulatorController {
  const [active, setActive] = useState<ScouterSimulatorState | null>(null);
  const [applying, setApplying] = useState(false);
  const worldCtx = useScouterWorldContext();

  const apply = useCallback(async (overrides: ScouterSimulatorOverrides): Promise<ScouterSimulatorApplyResult> => {
    if (!character) return { status: "unsupported" };
    if (isLocalOnlyOverride(overrides)) {
      const real = await loadScouterResultFor(character, worldCtx);
      if (!real) return { status: "unsupported" };
      if (!real.ok) return { status: "error", reason: real.reason, detail: real.detail };
      setActive({ overrides, entry: real.entry });
      return { status: "ok" };
    }
    setApplying(true);
    const result = await runScouterSimulator(character, resolveScouterContext(worldCtx), overrides);
    setApplying(false);
    if (result.status === "ok") {
      setActive({ overrides, entry: result.entry });
      return { status: "ok" };
    }
    return result;
  }, [character, worldCtx]);

  const reset = useCallback(() => setActive(null), []);

  return { active, applying, apply, reset };
}
