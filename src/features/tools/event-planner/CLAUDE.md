# Event Planner

Depends on `../star-force/star-force-data` for cost model — don't duplicate formulas.

Storage is **global, not per-character** — stored in the global tools store (`mapledoro_tools_v1`) under the `eventPlanner` key. Each entry carries its own `characterName` — renaming a character elsewhere won't migrate entries.
