# Daily Tracker

**Storage:** Single global key `dailies-v1` (NOT the `{key}-{charName}` pattern). One object holds all characters keyed by `characterName`.

**Selection model:** Cards start empty — users pick tasks via the edit dialog. Only selected tasks render and count toward progress. Sections with no selections are hidden.

**World-scoped counter cap:** Monster Park and Maple Tour are capped at 7 **per world** (across all characters on the same world, not per-character). `setCounter` clamps against remaining world room. `CounterRow` disables `+` at cap.

**Daily reset:** Compares `lastResetDay` against `utcDateStr()` (UTC midnight). Clears task state but preserves `selected` and `collapsed`. Runs on load + every 60s interval.

**Reminders:** `RemindersConfigBar` here writes to the shared reminders store (`src/lib/reminders.ts`) that the home `RemindersPanel` reads.
