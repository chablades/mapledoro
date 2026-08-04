# BGM Guesser

Daily game: hear a MapleStory BGM track, name the **area or boss** it plays for in 3 tries. No
hints, one mode. Puzzle rollover, replay arrows, share squares and the countdown all mirror
[Mapledle](../skill-guesser/CLAUDE.md); only the differences are documented here.

The puzzle advances at **00:00:00 UTC**; puzzle #1 is the `EPOCH_UTC_MS` day in `puzzles.ts`
(2026-08-04), and day N maps to payload index `(N-1) % length`.

**The guess picker portals its menu to `<body>`** via `usePickerCoords`, matching the character-setup
and Mystic Frontier pickers. It has to: `.panel-card` sets `overflow: hidden`, so an
absolutely-positioned menu gets cut off by the panel's bottom edge, and this panel is short enough
(no hint cards, only 3 guess slots) that the menu never fits below the input. Menu width is measured
off the input when it opens instead of being a constant, and the outside-click handler has to check
the portal too, since the menu is no longer a DOM descendant of the anchor.

**Audio** streams from haku.network's `bgm` namespace via `bgmTrackUrl(group, track)`. The manifest
key is `{group}/{trackName}` and **track names are not unique across groups** (32 collisions), so
both halves travel together everywhere. `BgmPlayer` drives everything off the `<audio>` element's own
events (no effects, no mount-time setState), sets the starting volume in a callback ref, and loops —
these are in-game loops, not songs with an ending. The parent keys it by puzzle number so a new day
gets a fresh element.

**Puzzle payload** (`puzzle-data.generated.ts`) is AUTO-GENERATED — never hand-edit. Regenerate with
`node scripts/generate-bgm-guesser-data.mjs` (needs dev-only `manifests/v270/bgm.json` +
`ui-mark.json`, and network access to fetch maplebgm-db). It exports base64(XOR(json)) of
`[group, track, title, answer]` tuples, plus the plain `BGM_GUESSER_ANSWER_DATA` pool
(`[name, ui-mark id, isBoss]`) — the picker needs every answer anyway, so only the day's answer is
worth hiding. The XOR key in `puzzles.ts` must match the script's. **Don't change the generator's
`SEED` or reorder `ANSWERS`** — that reshuffles the daily order and breaks streaks mid-run.

**Answers come from a hand-curated allowlist** (`ANSWERS` in the generator), not from any rule the
data could supply: the manifest has no map names at all, and
[maplebgm-db](https://github.com/maplestory-music/maplebgm-db)'s free-text `description` mixes maps,
bosses, story beats and events in one field. maplebgm-db is fetched at generation time only for
titles; every inclusion decision was made by reading its descriptions once. Curation rules:

- Only tracks tied to a concrete GMS place or boss fight. Storyline, cutscene, credits, tutorial
  and "unused" tracks are out — they aren't a map, so there's nothing fair to guess.
- No event/anniversary/collab content, no class-burst or 6th-job skill themes, no minigame hubs
  (Star Planet, Monster Life, PvP), no UI/login themes.
- No region-exclusive content GMS never shipped (CMS/TMS/JMS-only areas), and no Mirror World
  remixes — they re-score a town theme already in the pool, so both would be the same puzzle.
- **The Guild Castle jukebox tracks are excluded on purpose**: they're piano covers of *other*
  areas' themes (Temple of Time, Pantheon, Elodin…), so they'd punish players for correctly
  recognizing the tune.
- Party quests answer as the area they sit in rather than getting their own entry — Ludibrium PQ is
  Ludibrium, Orbis PQ is Orbis. Sharenian is the exception, since it's its own place.
- Tracks whose description names two unrelated places ("Henesys Market, Southperry"; "Hekaton boss
  theme, Morass: Trueffet") are left out — there's no single right answer.
- One track per distinct piece of music: near-identical variants (`...B`, `_Loop`, `_MR`,
  `_reprise`, `Short`, `Extended`, the Afterlands' `_Night` re-scores) are left out of `ANSWERS`.

The generator **fails loudly** rather than silently shrinking the pool: it exits non-zero if a
curated track is missing from the manifest, an answer has no tracks, or an answer's `mark` is not in
`ui-mark.json`. Each answer carries a `ui-mark` icon id shown in the picker and on reveal, so adding
an answer means finding its mark in that manifest. Note the mark id is the WZ asset name, not the
answer label — Geardock's mark is `Geardrak`, Karote's is `karotte`.

The pool is **386 curated tracks across 131 answers, trimmed to 365 puzzles** by the round-robin
balancer, so the daily sequence is exactly a year before it repeats and the largest pools give up
their surplus first. Adding or removing an answer reshuffles every day, since `answerOrder` is a
shuffle of the whole key set.

**Results** live in `mapledoro_games_v1` under a `bgmGuesser` section, sharing the key (and its
version 2 schema) with the Skill Guesser. Both `storage.ts` modules read the whole store and write it
back, so each preserves the other's section — keep it that way rather than rebuilding the object from
known keys.
