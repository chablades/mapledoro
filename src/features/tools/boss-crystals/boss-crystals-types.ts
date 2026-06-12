import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { utcDateStr } from "../date";
import { BOSSES, SHARED_INDICES } from "./bosses";

// -- Types --------------------------------------------------------------------

export interface BossRow {
  checked: boolean;
  partySize: number;
  /** Cleared this week (checked off in the character card). Resets weekly. */
  cleared?: boolean;
}

export interface CharacterEntry {
  name: string;
  imageURL: string | null;
  bosses: BossRow[];
}

export type DialogState =
  | null
  | { type: "add-name" }
  | { type: "add-bosses"; name: string; imageURL: string | null }
  | { type: "edit"; index: number };

interface SavedState {
  server: string;
  characters?: CharacterEntry[];
  columns?: { name: string; bosses: BossRow[] }[];
  weekId?: string;
}

// -- Helpers ------------------------------------------------------------------

/**
 * Identifier for the current weekly-boss period: the UTC date of the most
 * recent Thursday 00:00:00 UTC reset. Cleared flags reset when this changes.
 */
export function currentWeekId(now: Date = new Date()): string {
  const d = new Date(now);
  // getUTCDay: 0=Sun … 4=Thu … 6=Sat. Days elapsed since the last Thursday.
  const sinceThursday = (d.getUTCDay() - 4 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - sinceThursday);
  return utcDateStr(d);
}

export function createBosses(preset: string): BossRow[] {
  return BOSSES.map((b) => ({
    checked: !!(b.preset && b.preset.includes(preset)),
    partySize: 1,
  }));
}

export function getDisabledSet(bosses: BossRow[]): Set<number> {
  const disabled = new Set<number>();
  for (let i = 0; i < bosses.length; i++) {
    if (bosses[i].checked) {
      for (const idx of SHARED_INDICES[i]) disabled.add(idx);
    }
  }
  return disabled;
}

export interface CharacterProgress {
  /** Selected (planned) income from the top-14 selected bosses. */
  meso: number;
  /** Selected (planned) crystal count, capped at 14. */
  crystals: number;
  /** Income from bosses cleared this week (among the top-14 selected). */
  clearedMeso: number;
  /** Crystals cleared this week (among the top-14 selected). */
  clearedCrystals: number;
}

export function calcCharacterProgress(
  bosses: BossRow[],
  server: string,
): CharacterProgress {
  const mult = server === "heroic" ? 1 : 5;
  const entries: { value: number; cleared: boolean }[] = [];
  for (let i = 0; i < bosses.length; i++) {
    if (!bosses[i].checked) continue;
    entries.push({ value: BOSSES[i].meso / bosses[i].partySize, cleared: !!bosses[i].cleared });
  }
  entries.sort((a, b) => b.value - a.value);
  const top14 = entries.slice(0, 14);
  let meso = 0;
  let clearedMeso = 0;
  let clearedCrystals = 0;
  for (const e of top14) {
    meso += e.value / mult;
    if (e.cleared) {
      clearedMeso += e.value / mult;
      clearedCrystals++;
    }
  }
  return {
    meso: Math.floor(meso),
    crystals: top14.length,
    clearedMeso: Math.floor(clearedMeso),
    clearedCrystals,
  };
}

export function calcCharacterIncome(
  bosses: BossRow[],
  server: string,
): { meso: number; crystals: number } {
  const { meso, crystals } = calcCharacterProgress(bosses, server);
  return { meso, crystals };
}

export function checkBg(disabled: boolean, checked: boolean, accent: string, timerBg: string): string {
  if (disabled) return timerBg;
  if (checked) return accent;
  return "transparent";
}

// -- Storage ------------------------------------------------------------------

export function loadState(): { server: string; characters: CharacterEntry[] } | null {
  const parsed = readGlobalTool<SavedState>("bossCrystals");
  if (!parsed) return null;
  const chars = parsed.characters ?? parsed.columns;
  if (!chars) return null;
  // Wipe cleared flags if the stored week predates the latest Thursday reset.
  const resetCleared = parsed.weekId !== currentWeekId();
  return {
    server: parsed.server,
    characters: chars.map((c) => ({
      name: c.name,
      imageURL: "imageURL" in c ? (c as CharacterEntry).imageURL : null,
      bosses: BOSSES.map((_, i) => {
        const s = c.bosses[i];
        if (!s) return { checked: false, partySize: 1, cleared: false };
        return {
          checked: s.checked,
          partySize: s.partySize,
          cleared: resetCleared ? false : !!s.cleared,
        };
      }),
    })),
  };
}

export function saveState(server: string, characters: CharacterEntry[]) {
  writeGlobalTool("bossCrystals", { server, characters, weekId: currentWeekId() });
}

export function clearState() {
  writeGlobalTool("bossCrystals", null);
}
