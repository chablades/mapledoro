# Boss Crystals

**Invariants:**
- **Shared-difficulty disabling** — Selecting e.g. Lotus (Normal) disables (Hard) and (Extreme) via `SHARED_INDICES`. Adding a boss with multiple difficulties requires updating `shared` arrays on *all* variants in `bosses.ts`.
- **Weekly income caps at top 14 clears per character** — game-accurate; don't remove.
- **Server multiplier** — Heroic = full value; reboot divides by 5. Values in `bosses.ts` are heroic gross.
- **XLSX export** is zero-dependency (hand-rolled CRC32/ZIP). Don't replace with a library.
- **`cleared` vs `checked`** — `checked` = boss is part of the character's weekly plan (drives income/export). `cleared` = boss was completed this week (the card checkbox). Export only reads `checked`/`partySize`; never serialize `cleared`.
- **Weekly cleared reset** — `currentWeekId()` is the UTC date of the most recent Thursday 00:00 reset. `loadState` wipes `cleared` when the stored `weekId` differs; the hook also re-checks every 60s while open. "Weekly Progress" mesos / the cleared pill count only cleared bosses within each character's top-14 selected set (`calcCharacterProgress`).
