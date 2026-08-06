import type { BossCutEntry } from "./bosscut-data.generated";

export type BossEntryList = [string, BossCutEntry[]];

export const BOSS_DISPLAY_NAME: Record<string, string> = {
  스우: "Lotus", 데미안: "Damien", 루시드: "Lucid", 윌: "Will", 더스크: "Gloom",
  "진 힐라": "Verus Hilla", 듄켈: "Darknell", "검은 마법사": "Black Mage", 세렌: "Seren",
  칼로스: "Kalos", 대적자: "Adversary", 흉성: "Malefic Star", 카링: "Kaling",
  림보: "Limbo", 발드릭스: "Baldrix", 유피테르: "Jupiter", 가엔슬: "Guardian Angel Slime",
  카이: "Kai",
};

export function groupByBoss(entries: BossCutEntry[]): BossEntryList[] {
  const byBoss = new Map<string, BossCutEntry[]>();
  for (const e of entries) {
    const list = byBoss.get(e.boss);
    if (list) list.push(e);
    else byBoss.set(e.boss, [e]);
  }
  // Highest level requirement first, tie-broken by each boss's HIGHEST tier (e.g. Lotus's 210
  // floor ties Damien's, but Lotus also has a 285 Extreme tier Damien has no equivalent for, so
  // Lotus ranks above it -- this is "how hard does it get," not "when do you unlock it") rather
  // than falling back to the scraper's own arbitrary array order. Both Quick View and Spotlight
  // share this order.
  return [...byBoss.entries()].sort(([, a], [, b]) => {
    const minDiff = Math.min(...b.map((e) => e.level)) - Math.min(...a.map((e) => e.level));
    return minDiff !== 0 ? minDiff : Math.max(...b.map((e) => e.level)) - Math.max(...a.map((e) => e.level));
  });
}

/** Resolves a grouped-list index to the boss's display name, clamping out-of-range indexes
 *  (e.g. stale selection after a boss list update) to the last entry. Shared between
 *  BossClearGrid and CharacterProfileOverviewScreen so the page header can derive the
 *  Spotlight label itself instead of BossClearGrid reporting it back up via effect. */
export function resolveBossDisplayName(grouped: BossEntryList[], selectedIndex: number): string {
  const clampedIndex = Math.min(selectedIndex, grouped.length - 1);
  const boss = grouped[clampedIndex][0];
  return BOSS_DISPLAY_NAME[boss] ?? boss;
}
