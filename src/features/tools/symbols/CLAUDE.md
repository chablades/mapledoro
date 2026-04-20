# Symbols

Arcane & Sacred symbol progress / days-to-max calculator.

**Key files:**
- `symbol-data.ts` — Growth tables (`ARCANE_GROWTH`, `SACRED_GROWTH`), area definitions (daily/weekly rates, `requiredLevel`), max levels, and helpers (`symbolsRemaining`, `symbolsConsumed`, `daysToMax`, `symbolsForLevel`).
- `SymbolWorkspace.tsx` — UI + state.

**Storage:** per-character via `symbols-v2-{characterName}` (falls back to `symbols-v2` when no character is selected). Stores `{ type: SymbolType, symbols: Record<areaName, SymbolState> }` so **Arcane and Sacred share one key per character** — switching `type` swaps datasets but keeps the same file. `symbols[areaName]` holds `{level, current, daily, weeklyEnabled, enabled}`.

**Type differences (don't conflate):**
- **Arcane**: max level 20, `weeklyEnabled` toggles the flat +120/week from weekly dungeons (e.g. Erda Spectrum, Hungry Muto). `enabled` is unused.
- **Sacred**: max level 11, `enabled` marks whether a symbol is being tracked at all (unused ones are hidden from totals). `weeklyEnabled` is unused.

**Totals:** `ARCANE_TOTAL = 2679`, `SACRED_TOTAL = 4565` — if you update the growth tables, update the comment that cites the pre-computed total.
