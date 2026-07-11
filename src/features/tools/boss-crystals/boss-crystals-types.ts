import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { utcDateStr } from "../date";
import { BOSSES, SHARED_INDICES } from "./bosses";

// -- Types --------------------------------------------------------------------

/** World type. Heroic = Reboot worlds (full meso); Interactive = regular (÷5). */
export type ServerType = "heroic" | "interactive";

// Heroic (Reboot) world IDs; every other world is Interactive (regular). See
// WORLD_NAMES in characters/model/constants.ts (Kronos 45, Solis 46, Hyperion 70).
const HEROIC_WORLD_IDS = new Set([45, 46, 70]);

/** Classify an imported character's world. Unknown worlds default to interactive. */
export function worldServerType(worldID: number): ServerType {
  return HEROIC_WORLD_IDS.has(worldID) ? "heroic" : "interactive";
}

export interface BossRow {
  checked: boolean;
  partySize: number;
  /** Cleared this week (checked off in the character card). Resets weekly. */
  cleared?: boolean;
}

export interface CharacterEntry {
  name: string;
  imageURL: string | null;
  /** World type this character belongs to; the tracker filters cards by it. */
  world: ServerType;
  bosses: BossRow[];
}

export type DialogState =
  | null
  | { type: "add-name" }
  | { type: "add-bosses"; name: string; imageURL: string | null; world: ServerType }
  | { type: "edit"; index: number };

interface SavedState {
  server: string;
  characters?: CharacterEntry[];
  columns?: { name: string; bosses: BossRow[] }[];
  weekId?: string;
  monthId?: string;
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

/**
 * Identifier for the current monthly-boss period: the UTC year-month. Monthly
 * bosses (Black Mage) reset on the 1st at 00:00 UTC, when this value changes.
 */
export function currentMonthId(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
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
  /** Selected (planned) income: top-14 capped bosses plus monthly bosses. */
  meso: number;
  /** Selected (planned) income from the top-14 capped (weekly) bosses only. */
  weeklyMeso: number;
  /** Selected (planned) income from monthly bosses (Black Mage) only. */
  monthlyMeso: number;
  /** Selected (planned) capped crystal count, capped at 14 (excludes monthly). */
  crystals: number;
  /** Selected (planned) monthly crystals (Black Mage), exempt from the 14 cap. */
  monthlyCrystals: number;
  /** Income from bosses cleared this period (capped top-14 plus monthly). */
  clearedMeso: number;
  /** Crystals cleared this period (capped top-14 plus monthly). */
  clearedCrystals: number;
}

export function calcCharacterProgress(
  bosses: BossRow[],
  server: string,
): CharacterProgress {
  const mult = server === "heroic" ? 1 : 5;
  const capped: { value: number; cleared: boolean }[] = [];
  // Monthly bosses (Black Mage) are added on top of the top-14, not capped by it.
  let weeklyMeso = 0;
  let monthlyMeso = 0;
  let monthlyCrystals = 0;
  let clearedMeso = 0;
  let clearedCrystals = 0;
  for (let i = 0; i < bosses.length; i++) {
    if (!bosses[i].checked) continue;
    const value = BOSSES[i].meso / bosses[i].partySize / mult;
    if (!BOSSES[i].monthly) {
      capped.push({ value, cleared: !!bosses[i].cleared });
      continue;
    }
    monthlyMeso += value;
    monthlyCrystals++;
    if (bosses[i].cleared) {
      clearedMeso += value;
      clearedCrystals++;
    }
  }
  capped.sort((a, b) => b.value - a.value);
  const top14 = capped.slice(0, 14);
  for (const e of top14) {
    weeklyMeso += e.value;
    if (e.cleared) {
      clearedMeso += e.value;
      clearedCrystals++;
    }
  }
  return {
    meso: Math.floor(weeklyMeso + monthlyMeso),
    weeklyMeso: Math.floor(weeklyMeso),
    monthlyMeso: Math.floor(monthlyMeso),
    crystals: top14.length,
    monthlyCrystals,
    clearedMeso: Math.floor(clearedMeso),
    clearedCrystals,
  };
}

export function calcCharacterIncome(
  bosses: BossRow[],
  server: string,
): { meso: number; crystals: number } {
  const { meso, crystals, monthlyCrystals } = calcCharacterProgress(bosses, server);
  return { meso, crystals: crystals + monthlyCrystals };
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
  // Wipe cleared flags when their period has rolled over: weekly bosses on the
  // Thursday reset, monthly bosses (Black Mage) on the 1st of the month.
  const resetWeekly = parsed.weekId !== currentWeekId();
  const resetMonthly = parsed.monthId !== currentMonthId();
  // Characters saved before world tracking inherit the last-selected server.
  const fallbackWorld: ServerType = parsed.server === "interactive" ? "interactive" : "heroic";
  return {
    server: parsed.server,
    characters: chars.map((c) => ({
      name: c.name,
      imageURL: "imageURL" in c ? (c as CharacterEntry).imageURL : null,
      world:
        (c as Partial<CharacterEntry>).world === "heroic" ||
        (c as Partial<CharacterEntry>).world === "interactive"
          ? (c as CharacterEntry).world
          : fallbackWorld,
      bosses: BOSSES.map((boss, i) => {
        const s = c.bosses[i];
        if (!s) return { checked: false, partySize: 1, cleared: false };
        const resetThis = boss.monthly ? resetMonthly : resetWeekly;
        return {
          checked: s.checked,
          partySize: s.partySize,
          cleared: resetThis ? false : !!s.cleared,
        };
      }),
    })),
  };
}

export function saveState(server: string, characters: CharacterEntry[]) {
  writeGlobalTool("bossCrystals", {
    server,
    characters,
    weekId: currentWeekId(),
    monthId: currentMonthId(),
  });
}

export function clearState() {
  writeGlobalTool("bossCrystals", null);
}
