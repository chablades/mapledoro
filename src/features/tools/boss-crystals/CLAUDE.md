# Boss Crystals

**Invariants:**
- **Shared-difficulty disabling** — selecting e.g. Lotus (Normal) disables (Hard) and (Extreme) via
  `SHARED_INDICES`. Adding a boss with multiple difficulties means updating `shared` arrays on *all*
  variants in `bosses.ts`.
- **Weekly income caps at the top 14 clears per character** — game-accurate; don't remove.
- **Monthly bosses** — `Boss.monthly` (Black Mage) resets on the 1st at 00:00 UTC (`currentMonthId` /
  `monthId`), not the Thursday weekly reset. Their crystal is exempt from the per-character 14 cap
  (`calcCharacterProgress` adds them on top as `monthlyCrystals`) but still counts toward the
  account-wide 180. Keep monthly bosses last in `BOSSES` so their rows stay contiguous for the XLSX
  top-14 formula, which caps over non-monthly rows and adds monthly rows separately.
- **Server multiplier** — Heroic is full value, reboot divides by 5. Values in `bosses.ts` are heroic
  gross.
- **World filter** — the Heroic/Interactive toggle is a *filter*, not just a multiplier. Each
  `CharacterEntry` carries a `world` (imported chars derive it from `worldID` via `worldServerType`;
  typed chars take the current toggle), and only matching-world characters, totals, the per-world 180
  cap, the import picker, and export are shown. A single-world roster opens on that world.
  Pre-world-tracking saves migrate to the last-saved server.
- **Saved rows are matched by boss name** — `saveState` writes `bossNames` (the list order at save
  time) and `loadState` maps each saved row to today's `BOSSES` by name, so adding, removing or
  reordering bosses never shifts anyone's plan. Saves from before `bossNames` existed are read as
  `PRE_V272_REMOVED` followed by today's list; keep that constant as long as such saves may exist.
- **XLSX export** is zero-dependency (hand-rolled CRC32/ZIP). Don't replace it with a library.
- **`cleared` vs `checked`** — `checked` means the boss is in the character's weekly plan (drives
  income and export); `cleared` means completed this week (the card checkbox). Export reads
  `checked`/`partySize` only; never serialize `cleared`.
- **Weekly cleared reset** — `currentWeekId()` is the UTC date of the most recent Thursday 00:00
  reset. `loadState` wipes `cleared` when the stored `weekId` differs, and the hook re-checks every
  60s while open. Weekly Progress mesos and the cleared pill count only cleared bosses within each
  character's top-14 selected set (`calcCharacterProgress`).

Card reordering shares `../useCardReorder.ts` with the Daily Tracker (`moveInArray` for the reducer).

**Persistence** goes inside the state updaters (`commitCharacters` / `commitServer`), not an effect
watching state — the root `CLAUDE.md` rule, so a write is atomic with the change that caused it.
`saveState` needs both halves of the state and they live in two `useState`s, so each commit takes its
counterpart from the closure (the value as of the last committed render, which is correct: commits
only run from event handlers and the reset interval). `clearData` deliberately uses the raw setters,
since `clearState` removes the blob and a commit would write an empty one straight back.
