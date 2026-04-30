# Star Force

Post-revamp (November 2025 NEXT update) cost calculator.

**Revamp rules:**
- Stars no longer drop on failure (maintain at current star).
- `restorePoint(star)` — boom landing: 12 (<20), 15 (=20), 17 (21–22), 19 (23–25), 20 (26–29).
- Safeguard: 15–17 only, triples cost.

**`star-force-data.ts` is reused by `../event-planner`** — keep it pure (no React, no localStorage). Don't bolt persistence onto this module.
