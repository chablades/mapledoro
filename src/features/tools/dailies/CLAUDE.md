# Daily Tracker

**Storage:** Under the `dailies` key in the global tools store. Since v2 this is an ordered `DailyCharacter[]` (`{ name, state }`) that the user builds manually and can drag to reorder, mirroring the Boss Crystal tracker. `migrate()` upgrades the old v1 shape (unordered `Record<characterName, state>`) into that array.

**Manual-add flow:** Characters are added via the shared two-step dialog (`AddCharacterNameDialog` → `DailiesSelectionDialog`), not auto-listed from the character store. Shared pieces with Boss Crystals live in `../` (`AddCharacterNameDialog`, `AddCharacterCard`, `useCardReorder`). A card's avatar / level / job / world are looked up **live** from the character store by name (`getStoreChar`); a typed name with no import match just shows the name.

**Selection model:** Cards start empty — users pick tasks in the dialog. Only selected tasks render and count toward progress. Sections with no selections are hidden.

**World-scoped counter cap:** Counter tasks have a per-character `max` and an optional shared `worldMax` (defaults to `max`). Monster Park is 7 per character but 14 per world; Maple Tour is 7 for both. The cap is enforced across characters sharing a world; world identity comes from the live store record, and typed characters with no match get a private per-character bucket (`worldKeyOf`). `setCounter` clamps to the smaller of the per-character `max` and the remaining world room (`worldMax` minus others). `CounterRow` disables `+` when the character hits `max` or the world hits `worldMax`.

**Daily reset:** Compares `lastResetDay` against `utcDateStr()` (UTC midnight). Clears task check state but preserves `selected`. Runs on load + every 60s interval.

**Reminders:** `RemindersConfigBar` here writes to the shared reminders store (`src/lib/reminders.ts`) that the home `RemindersPanel` reads.
