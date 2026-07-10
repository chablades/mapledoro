# Boss Crystals

**Invariants:**
- **Shared-difficulty disabling** — Selecting e.g. Lotus (Normal) disables (Hard) and (Extreme) via `SHARED_INDICES`. Adding a boss with multiple difficulties requires updating `shared` arrays on *all* variants in `bosses.ts`.
- **Weekly income caps at top 14 clears per character** — game-accurate; don't remove.
- **Monthly bosses** — `Boss.monthly` (Black Mage) reset on the 1st at 00:00 UTC (`currentMonthId` / `monthId`), not the Thursday weekly reset. Their crystal is exempt from the per-character 14 cap (`calcCharacterProgress` adds them on top of the top-14 as `monthlyCrystals`) but still counts toward the account-wide 180 total. Keep monthly bosses last in `BOSSES` so their rows stay contiguous for the XLSX top-14 formula, which caps over non-monthly rows and adds monthly rows separately.
- **Server multiplier** — Heroic = full value; reboot divides by 5. Values in `bosses.ts` are heroic gross.
- **World filter** — The Heroic/Interactive toggle is a *filter*, not just a multiplier: each `CharacterEntry` carries a `world` (imported chars derive it from `worldID` via `worldServerType`; typed chars take the current toggle), and only matching-world characters, totals, the per-world 180 cap, the import picker, and export are shown. On load, a single-world roster opens on that world (so interactive-only rosters default to Interactive). Characters saved before world tracking migrate to the last-saved server.
- **XLSX export** is zero-dependency (hand-rolled CRC32/ZIP). Don't replace with a library.
- **`cleared` vs `checked`** — `checked` = boss is part of the character's weekly plan (drives income/export). `cleared` = boss was completed this week (the card checkbox). Export only reads `checked`/`partySize`; never serialize `cleared`.
- **Weekly cleared reset** — `currentWeekId()` is the UTC date of the most recent Thursday 00:00 reset. `loadState` wipes `cleared` when the stored `weekId` differs; the hook also re-checks every 60s while open. "Weekly Progress" mesos / the cleared pill count only cleared bosses within each character's top-14 selected set (`calcCharacterProgress`).
