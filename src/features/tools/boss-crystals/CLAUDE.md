# Boss Crystals

Weekly meso income planner. Global (non-per-character) store — one list of characters with their weekly boss checklist.

**Key files:**
- `bosses.ts` — Master boss list (name, icon, meso value, preset tags, `shared` alias array for difficulty sharing).
- `boss-crystals-types.ts` — Types, helpers, storage (`STORAGE_KEY = "boss-crystals-v2"`, `SavedState` still accepts legacy `columns` key for back-compat).
- `useBossCrystalsState.ts` — Hook wiring up characters, server toggle (heroic/reboot), and dialog state.
- `exportBossCrystals.ts` + `xlsx-export.ts` — Zero-dependency XLSX export (STORE-only ZIP of Office Open XML parts, hand-rolled CRC32). Don't replace with a library unless really necessary; the whole point is zero deps.
- `BossCrystalsWorkspace.tsx` — UI.

**Invariants:**
- **Shared-difficulty disabling** — `getDisabledSet()` uses `SHARED_INDICES` from `bosses.ts`. Selecting e.g. Lotus (Normal) disables (Hard) and (Extreme) in the same character's list. Adding a new boss with multiple difficulties requires updating the `shared` arrays on *all* variants.
- **Weekly income caps at top 14 clears per character** — `calcCharacterIncome()` sorts meso values desc and sums the first 14. This is game-accurate; don't remove the cap.
- **Server multiplier** — `heroic` = full value, anything else (reboot etc.) divides by 5. Values in `bosses.ts` are stored as heroic gross.
