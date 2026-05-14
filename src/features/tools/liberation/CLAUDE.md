# Liberation

**Four tabs:** Genesis, Destiny Part 1, Destiny Part 2, Astra Secondary.

**Reset cadence (simulator correctness):**
- **Weekly bosses** reset **Thursday 00:00 UTC**. The simulator iterates Thursdays as the reset day.
- **Monthly bosses** (Black Mage) land on the **1st of each month UTC**.
- `clearedThisWeek` deducts traces from the *first* week only.

**Genesis Pass:** flat +10% trace multiplier on Genesis bosses. No effect on Destiny.

**Destiny Part 1 vs Part 2:** Share the same boss pool (8 bosses including Radiant Malefic Star and Jupiter). Part 2 has higher quest requirements (10k/12.5k/15k vs 2k/2.5k/3k). Internal type key for Part 1 is `"destiny"` (backward compat), Part 2 is `"destiny2"`.

**Astra Secondary:** Tracks two resources — Fierce Battle Traces (capped at 1000) and Erion's Fragments. Three sequential missions each requiring both. Fragments come from daily quests and boss vouchers. Stored under tool key `"astra"`, separate from liberation data.
