import { BOSSCUT_DATA, type BossCutEntry } from "./bosscut-data.generated";
import { LOWEND_BOSS_DATA } from "./lowend-boss-data.generated";
import { isEstimatedBoss } from "./bossClearFormula";

export type BossEntryList = [string, BossCutEntry[]];

export const BOSS_DISPLAY_NAME: Record<string, string> = {
  스우: "Lotus", 데미안: "Damien", 루시드: "Lucid", 윌: "Will", 더스크: "Gloom",
  "진 힐라": "Verus Hilla", 듄켈: "Darknell", "검은 마법사": "Black Mage", 세렌: "Seren",
  칼로스: "Kalos", 대적자: "Adversary", 흉성: "Malefic Star", 카링: "Kaling",
  림보: "Limbo", 발드릭스: "Baldrix", 유피테르: "Jupiter", 가엔슬: "Guardian Angel Slime",
  카이: "Kai",
};

function groupByBoss(entries: BossCutEntry[]): BossEntryList[] {
  const byBoss = new Map<string, BossCutEntry[]>();
  for (const e of entries) {
    const list = byBoss.get(e.boss);
    if (list) list.push(e);
    else byBoss.set(e.boss, [e]);
  }
  // Highest level requirement first, tie-broken by each boss's highest tier. Lotus's 210 floor
  // ties Damien's, but Lotus also has a 285 Extreme tier Damien has no equivalent for, so Lotus
  // ranks above it. The question is how hard a boss gets, not when it unlocks. This beats
  // falling back to the scraper's arbitrary array order, and Quick View and Spotlight share it.
  return [...byBoss.entries()].sort(([, a], [, b]) => {
    const minDiff = Math.min(...b.map((e) => e.level)) - Math.min(...a.map((e) => e.level));
    return minDiff !== 0 ? minDiff : Math.max(...b.map((e) => e.level)) - Math.max(...a.map((e) => e.level));
  });
}

/** Every boss in the Boss Clear grid: MapleScouter's, then the low-end bosses MapleDoro
 *  estimates itself, which always sort below them. */
export const BOSS_CLEAR_GROUPS: BossEntryList[] = [...groupByBoss(BOSSCUT_DATA), ...groupByBoss(LOWEND_BOSS_DATA)];

/** Resolves a grouped-list index to the boss's display name, clamping out-of-range indexes
 *  (e.g. stale selection after a boss list update) to the last entry. Shared between
 *  BossClearGrid and CharacterProfileOverviewScreen so the page header can derive the
 *  Spotlight label itself instead of BossClearGrid reporting it back up via effect. */
export function resolveBossDisplayName(grouped: BossEntryList[], selectedIndex: number): string {
  const clampedIndex = Math.min(selectedIndex, grouped.length - 1);
  const boss = grouped[clampedIndex][0];
  return BOSS_DISPLAY_NAME[boss] ?? boss;
}

// Icon ids looked up by hand from manifests/v271/ui-boss.json, renamed from boss.json as of
// v269 (see the Image Policy in the root CLAUDE.md), cross-checked against the same bosses
// already mapped in liberation-data.ts and trace-restoration-data.ts.
const BOSS_ICON_ID: Record<string, string> = {
  스우: "13", 데미안: "15", 루시드: "19", 윌: "23", 더스크: "26", "진 힐라": "24",
  듄켈: "27", "검은 마법사": "25", 세렌: "28", 칼로스: "30", 대적자: "35", 흉성: "37",
  카링: "31", 림보: "33", 발드릭스: "34", 유피테르: "38", 가엔슬: "29", 카이: "36",
};

/** The low-end bosses MapleDoro estimates carry their own icon id. */
export function bossIconId(boss: string, entries: BossCutEntry[]): string | undefined {
  const first = entries[0];
  return BOSS_ICON_ID[boss] ?? (isEstimatedBoss(first) ? first.iconId : undefined);
}

// Easiest to hardest. Champion and Destiny are solo variants of a party tier, nearly always
// Hard, and sit below Extreme on every boss that has one. Lotus, Black Mage, Seren and
// Adversary all read wrong with Extreme ranked under them. Checked per boss against the
// scraped cut and easyRate rather than assumed from the names.
const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Normal: 1, Hard: 2, Chaos: 3, Champion: 4, Destiny: 5, Extreme: 6 };

// The two bosses whose solo variant doesn't mirror Hard: Kalos's Champion is a solo Normal
// (same 49800 cut as Normal, about half of Chaos's), and Kaling's Destiny is rated easier than
// its Hard, sharing the same cut at easyRate x1.2, since players clear Destiny before soloing
// Hard. Every other boss follows the global ladder.
const DIFFICULTY_ORDER_OVERRIDE: Partial<Record<string, Record<string, number>>> = {
  kalos: { Easy: 0, Normal: 1, Champion: 2, Chaos: 3, Destiny: 4, Extreme: 5 },
  kaling: { Easy: 0, Normal: 1, Destiny: 2, Hard: 3, Extreme: 4 },
};

/** A boss's difficulties, easiest first. */
export function sortByDifficulty(entries: BossCutEntry[]): BossCutEntry[] {
  const order = (entries[0] && DIFFICULTY_ORDER_OVERRIDE[entries[0].name]) ?? DIFFICULTY_ORDER;
  return [...entries].sort((a, b) => (order[a.difficulty] ?? 99) - (order[b.difficulty] ?? 99));
}
