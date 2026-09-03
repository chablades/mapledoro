/*
  New Player Guide progress.

  Progress is global rather than per character: a genuine newcomer following this
  guide has no roster yet, so there is nothing to save against. It lives in the
  shared global tools blob, which means the Google Drive backup already carries
  it (that sweep takes every `mapledoro`-prefixed key).

  The trade is that progress is per browser, so a reader taking a second
  character through the guide sees the first character's ticks.
*/

import { readGlobalTool, writeGlobalTool } from "../../../features/tools/globalToolsStore";

const TOOL_KEY = "newPlayerGuide";

/** Section id -> checked. Ids not present are unchecked. */
export type GuideProgress = Record<string, boolean>;

const EMPTY: GuideProgress = {};

function parse(raw: unknown): GuideProgress {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return EMPTY;
  const out: GuideProgress = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

/** Lazy `useState` initializer: returns empty during SSR. */
export function loadGuideProgress(): GuideProgress {
  if (typeof window === "undefined") return EMPTY;
  return parse(readGlobalTool<unknown>(TOOL_KEY));
}

export function saveGuideProgress(progress: GuideProgress) {
  writeGlobalTool(TOOL_KEY, progress);
}
