# Boss Crystals

**Invariants:**
- **Shared-difficulty disabling** — Selecting e.g. Lotus (Normal) disables (Hard) and (Extreme) via `SHARED_INDICES`. Adding a boss with multiple difficulties requires updating `shared` arrays on *all* variants in `bosses.ts`.
- **Weekly income caps at top 14 clears per character** — game-accurate; don't remove.
- **Server multiplier** — Heroic = full value; reboot divides by 5. Values in `bosses.ts` are heroic gross.
- **XLSX export** is zero-dependency (hand-rolled CRC32/ZIP). Don't replace with a library.
