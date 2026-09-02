# Mapledle (Skill Guesser)

User-facing name is **Mapledle** (matching the Discord Activity port); internal identifiers and the
`/games/skill-guesser` route keep the old name.

Daily game: guess which class learns the shown skill icon in 5 tries. The puzzle advances at
**00:00:00 UTC**; puzzle #1 is the `EPOCH_UTC_MS` day in `puzzles.ts` (2026-06-11), and day N maps to
payload index `(N-1) % length`. Players can replay earlier days via header arrows, clamped between #1
and today; the workspace keys `PuzzleView` by puzzle number so each day re-reads its own results.

**Archive routing** is shared with BGM Guesser by `../usePuzzleRoute.ts`. Each game has two routes:
the bare path (always today) and `<base>/<n>` for one earlier day, both rendering the same workspace
with the segment only seeding `puzzleNumber`. Validation is necessarily client-side, since `today`
comes from `Date.now()` and the workspace is `useMounted`-gated; a non-numeric or out-of-range
segment silently falls back to today rather than 404ing. Moving between days rewrites the URL with
`history.replaceState`, **not** a router navigation: the route is fully client-rendered, so
navigating would remount the workspace and every arrow press would stack a back-button entry.
Today's puzzle canonicalises back to the bare path. The `[puzzle]/layout.tsx` sets `robots:
{ index: false }` because the archive is an unbounded number space; the daily page stays indexable.
Share text links to `<base>/<n>` so a copied result opens the day it describes.

**Two modes per puzzle**, with independent guesses and results. Normal names the **class**
(`answer = puzzle.className`, picker from `SKILL_GUESSER_CLASSES`); hard names the **skill**
(`answer = puzzle.skillName`, picker from `allSkillNames()`). The whole board keys off that one
`answer`. Hard is locked until normal is **finished** (won or 5 guesses used). The **skill name stays
hidden everywhere until the player clears hard mode** (`results.hard.won`), so a normal finish reveals
only the class. Stats are per mode (`computeSkillGuesserStats(mode)`). Mirror behavior changes with
the Discord Activity port.

**Puzzle payload** (`puzzle-data.generated.ts`) is AUTO-GENERATED — never hand-edit. Regenerate with
`node scripts/generate-skill-guesser-data.mjs`. It is
base64(XOR(json)) of `[resourceType, skillId, skillName, className]` tuples (0 = `skill`,
1 = `hexa-skill`, 2 = `erda-skill`, rendered via `PuzzleSkillIcon`) so the answer isn't readable in
devtools; the XOR key in `puzzles.ts` must match the script's. **Don't change the generator's `SEED`
or reorder filters** — that reshuffles the daily order and breaks streaks mid-run.

**The shipped payload was generated from v269 and is deliberately not re-run.** The script's manifest
path was bumped to `manifests/v270/skill.json` with the rest of `scripts/` in the v270 sweep, but the
payload was left alone: regenerating reshuffles the daily order and breaks every in-flight streak,
the same reason `SEED` is frozen. **The v270 path in the script is not evidence the payload is v270
data**, and a version bump alone is not a reason to re-run this one.

**Class attribution** comes from skill-id job prefixes (`floor(id/10000)`), not the manifest, which
has no class field. Excluded: branch-shared jobs (Explorer commons, beginners, 5th-job, removed
classes like Beast Tamer/Jett) and any name appearing in more than one class pool (shared icons are
unguessable). HEXA origin/ascent/mastery skills live in each class's HEXA job group (Hero = 114) with
per-skill icons; combined mastery icons are never used. Origin/ascent skills missing from skill.json
are backfilled from `hexa-classes.ts` via `hexa-skill` ids (Demon Slayer's Nightmare, Kain's Churning
Malice), and SHINE Erda Link enhancements come from `erda-skill` paths. The generator warns if a
class pool loses its origin/ascent.

**Answer pool + hints** (`classes.ts`): main stats follow
`characters/setup/data/classSkillData.ts`; secondary/weapon types were verified against GMS sources.
Renaming a class requires regenerating the payload, since the generator validates names against this
file.

**Results** live in `mapledoro_games_v1` (its own key, NOT `mapledoro_tools_v1`) under a
`skillGuesser` section shared with BGM Guesser, keyed by puzzle number to `{ normal?, hard? }`.
In-progress guesses persist too (`done: false`) and are excluded from stats.

Reads/writes go through `games/gamesStore.ts` (`readGameSection`/`writeGameSection`), which owns the
key and preserves other games' sections. **Never touch `mapledoro_games_v1` directly from a game
module** — when both modules owned the whole key, each rebuilt it from the sections it knew, so the
second game played erased the other's history.

Schema is **version 2**; v1 (one result per puzzle plus a global `hardMode` toggle) migrates into the
`normal` slot. That migration lives in `gamesStore.ts` because `version` describes the whole key:
bumping it without reshaping this section in the same step would make every v1 puzzle read as never
played.
