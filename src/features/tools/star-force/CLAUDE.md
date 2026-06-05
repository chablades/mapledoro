# Star Force

Post-revamp (November 2025 NEXT update) cost calculator.

**Revamp rules:**
- Stars no longer drop on failure (maintain at current star).
- `restorePoint(star)` — boom landing: 12 (<20), 15 (=20), 17 (21–22), 19 (23–25), 20 (26–29).
- Safeguard: 15–17 only, triples cost.

**Experimental boom reduction tier** (`StarForceOpts.boomTier`, 1–4; default/undefined = 1 = baseline): Tespia "Enhancement Mode" for stars 15–21. Tier > 1 overrides base success/boom from `BOOM_TIER_SUCCESS_RATES`/`BOOM_TIER_DESTROY_RATES` (applied first in `adjustedRates`, before safeguard/event/star-catch) and adds `BOOM_TIER_COST_MULT_INCREASE` to the cost multiplier. Tier 1 reproduces the default tables exactly. UI-gated behind an "Experimental" toggle in the workspace; event-planner passes nothing (stays baseline).

**`star-force-data.ts` is reused by `../event-planner`** — keep it pure (no React, no localStorage). Don't bolt persistence onto this module.
