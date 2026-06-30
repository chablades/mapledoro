# Event Planner

Depends on `../star-force/star-force-data` for the cost model — don't duplicate formulas. The boomTier / safeguard / event **stacking rules live in `../star-force/CLAUDE.md`**; this tool only feeds inputs into that model.

Storage is **global, not per-character** — stored in the global tools store (`mapledoro_tools_v1`) under the `eventPlanner` key. Each entry carries its own `characterName` — renaming a character elsewhere won't migrate entries.

**Global vs per-entry options:** the cost/boom events and MVP are global settings applied to every entry; `starCatch`, `safeguard`, and `boomTier` (Enhancement Mode) are stored **per-entry**, captured from the settings controls at add time (the table shows them as read-only status columns). Saves predating per-entry options stored `starCatch`/`boomTier` globally — the load path folds those values into each entry.