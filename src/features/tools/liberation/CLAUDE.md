# Liberation

Genesis & Destiny liberation trace planner — weeks-to-complete estimator.

**Key files:**
- `liberation-data.ts` — `GENESIS_BOSSES` / `DESTINY_BOSSES` datasets, `GENESIS_QUESTS` / `DESTINY_QUESTS` step thresholds, totals, and `getTracesPerClear()` (party size division + Genesis Pass multiplier).
- `useLiberationState.ts` — State hook + completion-date simulator.
- `LiberationWorkspace.tsx` — UI.

**Storage:** per-character via `liberation-v1-{characterName}` (falls back to `liberation-v1` when no character is selected). Handled by `storageKeyFor()`.

**Reset cadence (critical — simulator correctness):**
- **Weekly bosses** reset **Thursday 00:00 UTC**. Last day of each weekly cycle in UTC is Wednesday → `simulateCompletion()` iterates Wednesdays as the event day when weekly traces land.
- **Monthly bosses** (Black Mage) land on the **1st of each month UTC**.
- The simulator steps Wed-vs-1st whichever comes next. `clearedThisWeek` on a weekly boss deducts its traces from the *first* week only (post-reset they resume normally).

**Genesis Pass:** flat +10% trace multiplier on Genesis bosses. No effect on Destiny.
