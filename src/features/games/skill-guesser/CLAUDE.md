# Mapledle (Skill Guesser)

User-facing name is **Mapledle** (matching the Discord Activity port); internal
identifiers and the `/games/skill-guesser` route intentionally keep the old
`skill-guesser` name for now.

Daily game: guess which class learns the shown skill icon in 5 tries. The puzzle
advances at **00:00:00 UTC**; puzzle #1 = the `EPOCH_UTC_MS` day in `puzzles.ts`
(2026-06-11). Day N maps to payload index `(N-1) % length` (wraps after a year).
Players can replay earlier days via prev/next arrows on the header (clamped
between #1 and today); the workspace keys `PuzzleView` by puzzle number so each
day re-reads its own results.

**Two modes per puzzle.** Each day has a `normal` and a `hard` game with
independent guesses/results. In normal mode you name the **class**
(`answer = puzzle.className`, picker from `SKILL_GUESSER_CLASSES`); in hard mode
you name the **skill itself** (`answer = puzzle.skillName`, picker from
`allSkillNames()`). The whole board — guess slots, squares, share text, win
check — keys off that one `answer`. Hard mode is locked until the normal game is
**finished** (won OR all 5 guesses used). The **skill name** stays hidden
everywhere until the player **wins (clears) hard mode** (`results.hard.won`) —
i.e. until they actually name it — so a normal finish reveals only the class.
Stats are tracked **separately per mode** (`computeSkillGuesserStats(mode)`).
Mirror behavior changes with the Discord Activity port.

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
keyed by puzzle number → `{ normal?, hard? }`; in-progress guesses are persisted
too (`done: false`) and excluded from stats. Store schema is **version 2**;
v1 (single result per puzzle + a global `hardMode` toggle) is migrated on read,
folding each old result into the `normal` slot.
