# Mapledle (Skill Guesser)

User-facing name is **Mapledle** (matching the Discord Activity port); internal
identifiers and the `/games/skill-guesser` route intentionally keep the old
`skill-guesser` name for now.

Daily game: guess which class learns the shown skill icon in 5 tries. The puzzle
advances at **00:00:00 UTC**; puzzle #1 = the `EPOCH_UTC_MS` day in `puzzles.ts`
(2026-06-11). Day N maps to payload index `(N-1) % length` (wraps after a year).

**Puzzle payload** (`puzzle-data.generated.ts`) is AUTO-GENERATED — never edit by
hand. Regenerate with `node scripts/generate-skill-guesser-data.mjs` (needs the
dev-only `manifests/v269/skill.json`). It's base64(XOR(json)) of
`[resourceType, skillId, skillName, className]` tuples (0 = `skill`,
1 = `hexa-skill`, 2 = `erda-skill`; rendered via `PuzzleSkillIcon`) so the day's
answer isn't trivially readable in devtools; the XOR key in `puzzles.ts` must
match the script's. Don't change the generator's `SEED` or reorder filters
casually — that reshuffles the daily order and breaks continuity for players
mid-streak.

**Class attribution** comes from skill-id job prefixes (`floor(id/10000)`), not
from the manifest (it has no class field). Branch-shared jobs (Explorer commons,
beginners, 5th-job, removed classes like Beast Tamer/Jett) are excluded; names
appearing in more than one class pool are dropped (shared icons are
unguessable). HEXA origin/ascent/mastery add-on skills live in each class's
HEXA job group (e.g. Hero = 114) with per-skill icons — combined mastery icons
are never used. Origin/ascent skills missing from skill.json are backfilled
from `hexa-classes.ts` via `hexa-skill` ids (Demon Slayer's Nightmare, Kain's
Churning Malice), and the SHINE classes' Erda Link enhancements come from
`erda-skill` paths; the generator warns if any class pool loses its
origin/ascent.

**Answer pool + hints** (`classes.ts`): main stats follow
`characters/setup/data/classSkillData.ts`; secondary/weapon types were verified
against GMS sources (Grandis Library / wiki). Renaming a class requires
regenerating the payload (the generator validates names against this file).

**Results** live in `mapledoro_games_v1` (own key, NOT `mapledoro_tools_v1`),
keyed by puzzle number; in-progress guesses are persisted too (`done: false`)
and excluded from stats. The **hard mode** preference (progressive icon blur:
7px before the first guess, linearly sharp by the last; blur math must match
the Discord Activity) lives in the same store under `skillGuesser.hardMode`.
