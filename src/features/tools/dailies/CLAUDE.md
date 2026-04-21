# Daily Tracker

Per-character daily checklist — symbol dailies, daily bosses, daily activities (CPQ), and counter-based content (Monster Park, Maple Tour). Also hosts the config bar for home-page reminders.

**Key files:**
- `dailies-data.ts` — Task catalog. Four sibling arrays:
  - `ARCANE_SYMBOL_QUESTS`, `SACRED_SYMBOL_QUESTS` (booleans). Sacred includes Tallahart.
  - `DAILY_BOSSES` (booleans).
  - `DAILY_ACTIVITIES` (booleans — CPQ Party/Solo voyages; a single checkbox each).
  - `DAILY_CONTENT` (counters — Monster Park, Maple Tour; `max: 7` per world).
- `useDailiesState.ts` — Hook + storage. Exports `useDailiesState`, `computeProgress`, `hasAnySelected`, `utcDateStr`, types `CharDailyState`, `SelectedTasks`, `TaskSection`.
- `DailiesWorkspace.tsx` — UI + `DailiesSelectionDialog` (boss-crystals-style edit flow). On the card, activities and counters render together under one "Daily Content" header; the selection dialog also merges them into one section.
- `RemindersConfigBar.tsx` — Toggle bar above the character grid. Writes to the shared reminders store (`src/lib/reminders.ts`) that the home `RemindersPanel` reads.

**Storage:** Single global key `dailies-v1` (not per-character in the `{key}-{charName}` pattern — one file holds all characters keyed by `characterName`). Schema: `{ version: 1, characters: Record<charName, CharDailyState> }`. `CharDailyState` = `{ lastResetDay, arcane, sacred, bosses, activities, counters, selected, collapsed? }`.

**Selection model:**
- Cards start empty — users pick what to track via the ✎ edit dialog, matching boss-crystals UX. `selected: { arcane, sacred, bosses, activities, content }` holds arrays of task ids.
- Only selected tasks count toward `computeProgress` and are rendered in `CardBody`. `checkAll` only ticks selected ids.
- Sections with no selections are hidden entirely; the whole card shows a "+ Add tasks" CTA when `hasAnySelected(cs)` is false.
- `TaskSection` is the union of boolean sections: `"arcane" | "sacred" | "bosses" | "activities"`. Counter section is `"content"` and goes through `setCounter` instead of `toggleTask`.

**World-scoped counter cap (important):**
- Monster Park and Maple Tour are capped at 7 **per world** — across all characters on the same world, not per-character. `useDailiesState` memoizes `worldCounterTotals` (Map keyed `${worldID}:${counterId}`) and exposes `getWorldCounterTotal(worldID, counterId)`.
- `setCounter` clamps the incoming value against `max - (sum of other chars on same world)`. `checkAll` fills each counter only up to the remaining world-room (delegated to `applyCheckAll` at module scope to keep complexity under the sonarjs cap).
- `CounterRow` shows a "World: N/7" subline and disables the `+` button (with a "World cap reached" tooltip) once the world total hits `max`.

**Daily reset:**
- Compares `cs.lastResetDay` against `utcDateStr()` (UTC midnight). On mismatch, `resetTasks` clears `arcane`/`sacred`/`bosses`/`activities`/`counters` but preserves `selected` and `collapsed`.
- `applyDailyReset` runs on load and every 60s via a `setInterval`, so open tabs flip over without reload.
- `normalizeCharState` back-fills `selected` *and* `activities` for records written before those fields existed.
