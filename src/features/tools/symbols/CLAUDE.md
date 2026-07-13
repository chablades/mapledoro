# Symbols

**Type differences (don't conflate):**
- **Arcane**: max level 20. `weeklyEnabled` toggles +120/week from weekly dungeons.
- **Sacred**: max level 11. `weeklyEnabled` is unused.

Arcane and Sacred share one tool slot (`tools.symbols`) per character — switching type swaps datasets but keeps the same slot. Stored in the character store via `characterToolStorage`.

**Unlocking is derived, never toggled.** A symbol is editable and counted only when the selected character's level clears `area.requiredLevel`. There is no per-symbol enable switch on either tab (an older Sacred-only "Tracking" toggle was removed). With no character selected there is no level to check, so every symbol is unlocked and the tool works standalone. Locked cards render dimmed with disabled controls and are excluded from totals, estimates, and the timeline.

**Totals:** `ARCANE_TOTAL = 2679`, `SACRED_TOTAL = 4565` — update comments if growth tables change.

**Colors:** status text (the "No income set" / "--" states) goes through `statusText(theme, "danger")`, never a hardcoded `#e05a5a`; accent-colored *text* uses `theme.accentText`, never `theme.accent` (which is a fill and fails contrast as ink). Translucent state borders use `alpha(theme.accent, n)` from `themes.ts`, not string-appended hex like `theme.accent + "44"`. Grand Sacred cards take `theme.accentSoft`, not a fixed violet. `TIMELINE_COLORS` is a per-color-mode categorical palette (each series color clears 3:1 on its mode's panel); index it with `theme.colorMode`.

**Chart:** the completion timeline lazy-loads chart.js in a `useEffect` (as StarForce and Pitched do), so the ~200 KB library stays out of the page's eager bundle. The panel often renders nothing (no tracked symbol with income), which is why the cost isn't paid up front.
