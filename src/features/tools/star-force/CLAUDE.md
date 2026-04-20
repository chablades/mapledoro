# Star Force

Star Force enhancement cost calculator (GMS post-revamp / November 2025 NEXT update).

**Key files:**
- `star-force-data.ts` — Pure cost/probability model. Exports `SUCCESS_RATE`, `DESTROY_RATE`, `attemptCost()`, `computeExpectedCosts()`, `simulate()`, `formatMeso*`, and types `StarForceOpts` / `MvpTier` / `StarResult` / `SimulationResult`. **Reused by `../event-planner`** — keep this file pure (no React, no localStorage).
- `StarForceWorkspace.tsx` — UI. Stateless regarding persistence; inputs are ephemeral `useState`.

**Revamp-specific rules to preserve:**
- Stars no longer drop on failure (maintain at current star).
- `restorePoint(star)` controls where a trace lands after a boom: 12 (<20), 15 (=20), 17 (21–22), 19 (23–25), 20 (26–29).
- Safeguard applies only 15–17 and triples the cost.

**Cost formula reference:** `100 * round(extraMult * floor(level/10)^3 * (star+1)^exp / divisor + 10)` — exp and divisor vary per star band (see comment block at top of `star-force-data.ts`). Match brendonmay's reference calculator.

**Do not persist anything here** — if you need saved inputs, extend the event-planner pattern, don't bolt storage onto this module.
