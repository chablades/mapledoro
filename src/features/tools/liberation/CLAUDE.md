# Liberation

**Four tabs:** Genesis, Destiny Part 1, Destiny Part 2, Astra Secondary.

**Reset cadence (simulator correctness):**
- **Weekly bosses** reset **Thursday 00:00 UTC**. The simulator iterates Thursdays as the reset day. The first iterated Thursday is *strictly after* the start date (a start that lands on a Thursday counts that week's income as immediate, not as a reset event), and every reset — including the first — pays the **full** weekly income.
- **Monthly bosses** (Black Mage) land on the **1st of each month UTC**; the next monthly reset is always the 1st of the *following* month.
- `clearedThisWeek` does **not** reduce any reset payout. It only controls whether a boss's income is counted as **immediate** (earnable now, before the next reset) — an uncleared boss can push completion onto the start date itself; a cleared boss's next income arrives at the next reset. This matches masonym.dev's Destiny/Genesis model.

**Genesis Pass:** flat +10% trace multiplier on Genesis bosses. No effect on Destiny.

**Destiny Part 1 vs Part 2:** Share the same boss pool (8 bosses including Radiant Malefic Star and Jupiter). Part 2 has higher quest requirements (10k/12.5k/15k vs 2k/2.5k/3k). Internal type key for Part 1 is `"destiny"` (backward compat), Part 2 is `"destiny2"`.

**Astra Secondary:** Tracks two resources — Fierce Battle Traces (capped at 1000) and Erion's Fragments. Three sequential missions each requiring both. Fragments come from daily quests and boss vouchers. Stored under tool key `"astra"`, separate from liberation data.
