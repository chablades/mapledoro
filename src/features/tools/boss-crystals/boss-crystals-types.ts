import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { BOSSES, SHARED_INDICES } from "./bosses";

// -- Types --------------------------------------------------------------------

export interface BossRow {
  checked: boolean;
  partySize: number;
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

export interface SavedState {
  server: string;
  characters?: CharacterEntry[];
  columns?: { name: string; bosses: BossRow[] }[];
}

// -- Helpers ------------------------------------------------------------------

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

export function calcCharacterIncome(
  bosses: BossRow[],
  server: string,
): { meso: number; crystals: number } {
  const mult = server === "heroic" ? 1 : 5;
  const values: number[] = [];
  for (let i = 0; i < bosses.length; i++) {
    if (!bosses[i].checked) continue;
    values.push(BOSSES[i].meso / bosses[i].partySize);
  }
  values.sort((a, b) => b - a);
  const top14 = values.slice(0, 14);
  let total = 0;
  for (const v of top14) total += v / mult;
  return { meso: Math.floor(total), crystals: top14.length };
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
  return {
    server: parsed.server,
    characters: chars.map((c) => ({
      name: c.name,
      imageURL: "imageURL" in c ? (c as CharacterEntry).imageURL : null,
      bosses: BOSSES.map((_, i) => {
        const s = c.bosses[i];
        return s
          ? { checked: s.checked, partySize: s.partySize }
          : { checked: false, partySize: 1 };
      }),
    })),
  };
}

export function saveState(server: string, characters: CharacterEntry[]) {
  writeGlobalTool("bossCrystals", { server, characters });
}

export function clearState() {
  writeGlobalTool("bossCrystals", null);
}
