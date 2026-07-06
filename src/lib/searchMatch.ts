function normalizeSearchText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function queryTokens(query: string): string[] {
  return query.trim().split(/\s+/).flatMap((t) => {
    const n = normalizeSearchText(t);
    return n ? [n] : [];
  });
}

interface MatchScore {
  /** 0 = exact match, 1 = candidate starts with the full query, 2 = candidate
   *  contains the full query as one contiguous run, 3 = every word appears
   *  somewhere but not as one phrase. Lower is a closer match. */
  tier: number;
  /** Tiebreak within a tier: how early the words appear (lower = earlier). */
  firstIndexSum: number;
  /** Tiebreak within a tier: shorter candidates are a tighter match. */
  length: number;
}

function scoreMatch(norm: string, fullQuery: string, tokens: string[]): MatchScore {
  let tier = 3;
  if (fullQuery) {
    if (norm === fullQuery) tier = 0;
    else if (norm.startsWith(fullQuery)) tier = 1;
    else if (norm.includes(fullQuery)) tier = 2;
  }
  const firstIndexSum = tokens.reduce((sum, t) => sum + Math.max(0, norm.indexOf(t)), 0);
  return { tier, firstIndexSum, length: norm.length };
}

function compareScores(a: MatchScore, b: MatchScore): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.firstIndexSum !== b.firstIndexSum) return a.firstIndexSum - b.firstIndexSum;
  return a.length - b.length;
}

/**
 * Filters `items` to those matching every word of `query` (tokenized, normalized
 * substring match — lets "arca ma" match "Arcane Umbra Mage Hat" or "crit dam"
 * match "Critical Damage"), then sorts by closeness so the best match comes first
 * — an exact match, then a prefix match, then a contiguous-substring match, then
 * everything else ranked by how early the words appear. Without this, results sit
 * in whatever order the underlying catalog happens to use, so a loosely-related
 * match can outrank the thing you actually typed.
 */
export function searchAndRank<T>(items: readonly T[], query: string, getText: (item: T) => string): T[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return items.slice();
  const fullQuery = normalizeSearchText(query);
  const scored: { item: T; score: MatchScore }[] = [];
  for (const item of items) {
    const norm = normalizeSearchText(getText(item));
    if (tokens.every((t) => norm.includes(t))) {
      scored.push({ item, score: scoreMatch(norm, fullQuery, tokens) });
    }
  }
  scored.sort((a, b) => compareScores(a.score, b.score));
  return scored.map((s) => s.item);
}
