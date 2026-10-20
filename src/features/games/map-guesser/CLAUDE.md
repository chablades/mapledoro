# MapGuessr (Map Guesser)

Daily game: find the map shown by its minimap in 6 tries, entering guesses on the client's own world
map. Same daily mechanics as Mapledle (`skill-guesser/CLAUDE.md`): rolls over at **00:00:00 UTC**,
puzzle #1 is `EPOCH_UTC_MS` in `puzzles.ts` (2026-10-12), day N is payload index `(N-1) % length`,
replayable via header arrows.

**World data is generated, never hand-edited.** `node scripts/generate-map-guesser-data.mjs` reads
dev-only `manifests/v270/map.json` + `map-worldmaps.json` (dumped by mapledoro-image's
`MapExtractor`) and writes `world-data.generated.ts` (screens, spots, guessable `[mapId, name]`) and
`puzzle-data.generated.ts` (base64(XOR) of `[mapId, street, bgm, revealX, revealY]`; XOR key must
match `puzzles.ts`). The reveal centre is scored from each minimap fetched from the resource host,
one at a time (it answers bursts with 429), so a run takes about 30s and needs the network.
**Don't change the generator's `SEED` or filters** once live: that reshuffles the daily order.

**Tree:** world map screens chained by `info/parentMap` from three hand-labeled roots (Maple World
`WorldMap`, Grandis `GWorldMap`, Arcane River `WorldMap082`; the WZ names no root). Parent screens'
spots roll up their children's maps, so each map is placed at its **deepest** listing. Screen names
come from the parent's MapLink tooltips; screens the client never links to fall back to their most
common street. Spot `x/y` are already in image pixels of the screen art
(`/api/img/map/worldmap/{id}/base.png`).

**Puzzle pool** excludes maps whose minimap is shared (`minimapFrom`, or borrowed by another map) so
the image identifies exactly one answer, plus "Hidden Street" quest maps. **Guessable** maps are all
named placed maps (not just the pool), so the picker doesn't leak which maps can be answers.

**Picker:** clicking a ring (spot with a `child`) zooms straight in; that spot's own maps (ones
the child screen doesn't place) show under the map as "Also at ...". MapLinks to non-child screens
(Cernium <-> Burning Cernium) become `links`, drawn under the top-right Back button. Right-click on
the map also goes back.

**Minimap reveal** (`MinimapReveal.tsx`): only a square of the minimap shows, growing per miss via
`REVEAL_STEPS` (shares of the **shorter** side, all < 1, so it stays a square section on tall or
wide minimaps instead of clamping to a full band), grown around the puzzle's `reveal` centre.
`scripts/map-guesser-reveal.mjs` picks that centre: the first-step square with the most
platform/building outline and texture, damped when it's nearly all sky or solid ground, with a
mild pull to the middle. Its `FIRST_STEP` must match `REVEAL_STEPS[0]`. The map's backdrop
(`back.png`, its back layers at minimap scale) sits under the minimap inside the same clip, so
the sky the minimap leaves transparent shows scenery; maps without one hide it on error. The
images must load eagerly: a fully clipped lazy image never loads. Minimaps are tiny
(~100-300px), so they upscale only by a whole-number factor (pixelated) that fits the frame height;
fractional stretching to fill the frame blurred them.

**Scoring** compares the guess and target paths (world → screens → spot → map): green while
matching, red where they diverge. Below the world level, a compass gives direction and rough
distance from guess to answer on the deepest shared screen (`positionOn`).

**Results** live under `mapGuesser` in the shared `mapledoro_games_v1` key; the writer only touches
that field, and a fresh store is seeded at Mapledle's schema version so its reader accepts it.
