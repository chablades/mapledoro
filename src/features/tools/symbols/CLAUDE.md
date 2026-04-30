# Symbols

**Type differences (don't conflate):**
- **Arcane**: max level 20. `weeklyEnabled` toggles +120/week from weekly dungeons.
- **Sacred**: max level 11. `enabled` marks whether a symbol is tracked. `weeklyEnabled` is unused.

Arcane and Sacred share one storage key per character — switching type swaps datasets but keeps the same key.

**Totals:** `ARCANE_TOTAL = 2679`, `SACRED_TOTAL = 4565` — update comments if growth tables change.
