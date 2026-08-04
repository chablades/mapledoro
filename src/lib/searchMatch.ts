function normalizeSearchText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function queryTokens(query: string): string[] {
  return query.trim().split(/\s+/).flatMap((t) => {
    const n = normalizeSearchText(t);
    return n ? [n] : [];
  });
}

// Community abbreviations that don't reduce to first-letter initials of the label
// actually shown in-app (e.g. "IED" is short for "Ignore Enemy Defense", but Legion
// Artifact's label is just "Ignore Defense" — initials alone give "id", not "ied").
// Expand as more mismatches get reported; anything whose initials already match
// (e.g. "cfe" -> "Commanding Force Earring") doesn't need an entry here.
const QUERY_SYNONYMS: Record<string, string> = {
  ied: "ignoredefense",
};

/** First letter of each whitespace-separated word, normalized (e.g. "Commanding Force Earring" -> "cfe"). */
function initials(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => normalizeSearchText(w)[0] ?? "")
    .join("");
}

interface MatchScore {
  /** 0 = exact match, 1 = candidate starts with the full query, 2 = query is an
   *  initialism of the candidate's words (e.g. "cfe" for "Commanding Force
   *  Earring"), 3 = candidate contains the full query as one contiguous run,
   *  4 = every word appears somewhere but not as one phrase. Lower is a closer
   *  match. Initialism ranks above plain substring because it's a deliberate
   *  whole-name signal — a substring hit is often just incidental (e.g. "cfe"
   *  buried mid-word in "musiCFEstival") and shouldn't outrank it. */
  tier: number;
  /** Tiebreak within a tier: how early the words appear (lower = earlier). */
  firstIndexSum: number;
  /** Tiebreak within a tier: shorter candidates are a tighter match. */
  length: number;
}

/** Whether every word of `query` matches `norm`/`candidateInitials`, as a literal substring, a synonym-expanded substring, or (single-token queries only) an initialism of the candidate's words. */
function tokenMatches(token: string, norm: string, candidateInitials: string): boolean {
  if (norm.includes(token)) return true;
  const synonym = QUERY_SYNONYMS[token];
  if (synonym && norm.includes(synonym)) return true;
  return token.length > 1 && candidateInitials === token;
}

function scoreMatch(norm: string, fullQuery: string, tokens: string[], candidateInitials: string): MatchScore {
  let tier = 4;
  if (fullQuery) {
    if (norm === fullQuery) tier = 0;
    else if (norm.startsWith(fullQuery)) tier = 1;
    else if (candidateInitials === fullQuery) tier = 2;
    else if (norm.includes(fullQuery)) tier = 3;
  }
  const firstIndexSum = tokens.reduce((sum, t) => sum + Math.max(0, norm.indexOf(QUERY_SYNONYMS[t] ?? t)), 0);
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
 *
 * A single-token query also matches a candidate's initialism (e.g. "cfe" finds
 * "Commanding Force Earring") or a hardcoded synonym (`QUERY_SYNONYMS`, for
 * community abbreviations whose letters aren't the label's initials, e.g. "ied").
 * Multi-word queries skip the initialism check — "arca ma" already means "every
 * word substring-matches", not "match the whole candidate's initials".
 */
export function searchAndRank<T>(items: readonly T[], query: string, getText: (item: T) => string): T[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return items.slice();
  const fullQuery = normalizeSearchText(query);
  const scored: { item: T; score: MatchScore }[] = [];
  for (const item of items) {
    const text = getText(item);
    const norm = normalizeSearchText(text);
    const candidateInitials = tokens.length === 1 ? initials(text) : "";
    if (tokens.every((t) => tokenMatches(t, norm, candidateInitials))) {
      scored.push({ item, score: scoreMatch(norm, fullQuery, tokens, candidateInitials) });
    }
  }
  scored.sort((a, b) => compareScores(a.score, b.score));
  return scored.map((s) => s.item);
}
