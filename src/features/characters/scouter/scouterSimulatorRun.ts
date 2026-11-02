/*
  Runs a Scouter Simulator ("what if"): the character's payload with the popup's overrides
  applied, computed by the local engine like the real result (see scouterResult.ts). Nothing is
  stored; a run takes milliseconds, and an applied simulation lives in useScouterSimulator's
  session-only state.
*/

import { buildDirectScouterPayload, hashScouterPayload, type ScouterPayloadContext, type ScouterSimulatorOverrides } from "./scouterApi";
import { computeScouterResult } from "./engine/scouterLocal";
import { scouterResultFor, type ScouterErrorReason, type ScouterResultEntry } from "./scouterResult";
import type { StoredCharacterRecord } from "../model/charactersStore";

export type ScouterSimulatorRunResult =
  | { status: "ok"; entry: ScouterResultEntry }
  | { status: "unsupported" }
  | { status: "error"; reason: ScouterErrorReason; detail?: string };

/** Never throws: every failure resolves to a tagged reason. */
export async function runScouterSimulator(
  character: StoredCharacterRecord,
  ctx: ScouterPayloadContext,
  overrides: ScouterSimulatorOverrides,
): Promise<ScouterSimulatorRunResult> {
  const real = scouterResultFor(character, ctx);
  const cridmgeff1 = real?.ok ? real.entry.specEfficiency?.cridmgeff1 : undefined;
  const request = buildDirectScouterPayload(character, ctx, overrides, cridmgeff1);
  if (!request) return { status: "unsupported" };
  const computed = await computeScouterResult(request, hashScouterPayload(request));
  return computed.ok ? { status: "ok", entry: computed.entry } : { status: "error", reason: computed.reason, detail: computed.detail };
}
