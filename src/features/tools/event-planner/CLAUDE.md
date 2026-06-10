# Event Planner

Depends on `../star-force/star-force-data` for cost model — don't duplicate formulas.

Storage is **global, not per-character** — stored in the global tools store (`mapledoro_tools_v1`) under the `eventPlanner` key. Each entry carries its own `characterName` — renaming a character elsewhere won't migrate entries.

**Global vs per-entry options:** the cost/boom events and MVP are global settings that apply to every entry; `starCatch`, `safeguard`, and `boomTier` are stored per-entry, captured from the settings controls at add time (the table shows them as read-only status columns). When an entry's `boomTier` > 1, `computeEntryCost` forces the events and that entry's safeguard off (mirrors the star-force workspace; we don't assume they stack). Saves predating per-entry options stored `starCatch`/`boomTier` globally — the load path folds those values into each entry.
