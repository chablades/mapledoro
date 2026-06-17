# Star Force

Post-revamp (November 2025 NEXT update) cost calculator.

**Revamp rules:**
- Stars no longer drop on failure (maintain at current star).
- `restorePoint(star)` — boom landing: 12 (<20), 15 (=20), 17 (21–22), 19 (23–25), 20 (26–29).
- Safeguard: 15–17 only, triples cost.

**Enhancement Mode** (`StarForceOpts.boomTier`, 1–4; default/undefined = 1 = baseline): Tespia boom-reduction system for stars 15–21. Tier > 1 overrides base success/boom from `BOOM_TIER_SUCCESS_RATES`/`BOOM_TIER_DESTROY_RATES` (applied first in `adjustedRates`, before safeguard/event/star-catch) and multiplies the cost by `1 + BOOM_TIER_COST_MULT_INCREASE`. Tier 1 reproduces the default tables exactly. Exposed as a slider (labelled "Enhancement Mode") in the workspace. The 30% off / 30% boom-reduction events **stack** with it — the events apply to the base cost/boom first, then the Enhancement Mode effect (cost multiplies the discounted base; boom resolves to `base × 0.7 × tier factor`). Only `safeguard` is forced off (and its toggle disabled) when tier > 1, since we don't assume that one stacks. The event planner exposes the same slider as a global setting with the same rules.

**`star-force-data.ts` is reused by `../event-planner`** — keep it pure (no React, no localStorage). Don't bolt persistence onto this module.
