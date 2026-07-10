# Cubing Calculator

Stateless probability calculator — no localStorage persistence, and no `useMounted()` gate (there is nothing client-only to wait for). Results recompute live from the form via `useDeferredValue`; there is no Calculate button, so a result can never describe a form state that has moved on.

**Invariants:**
- **Tier options come from the rate tables** — `availableDesiredTiers()` filters `cubeRates.lookup`, so the Desired Tier `<select>` can only offer tiers the cube has data for (Occult: Rare/Epic, Master: Epic/Unique, Meister/Red/Black: Unique/Legendary). This is what keeps `getProbability` from missing its lookup, returning 0, and driving `geoDistrQuantile` to Infinity. The available tiers per cube are always contiguous, so first and last bound the range. Current Tier then offers everything at or below the desired tier; `TIER_RATES` covers every step in that range for every cube.
- **`geoDistrQuantile` rejects both ends** — callers must reject `p <= 0` before calling (no finite answer); `p >= 1` is clamped to one cube inside, since `log(1 - 1)` is -Infinity and a summed probability can land a hair above 1.
- **Stat option amounts must be positive** — a `+0` target (e.g. `percAtt+0`, which a Rare-tier prime line of 3% produces) matches every roll and forces `p` to 1. Both `get2LAtkAmounts` and `get3LAtkAmounts` filter it out.
- **Double Miracle Time applies to Red and Black only** (`DMT_CUBES`). The event does not touch Occult/Master/Meister rates, so the toggle is disabled for them and the reducer clears the flag on cube change. It also only affects tier ups, so it is disabled when current tier equals desired tier.
- **Desired stat survives level edits** — `withValidDesiredStat` checks the option list, never the level's validity. A level typed one digit at a time passes through out-of-range values, and dropping the stat on the way loses it. Crossing level 160 legitimately invalidates exact-amount options (every line amount shifts by 1%).
- **Special-line limits** — `MAX_CATEGORY_COUNT` caps how many times certain categories (IED, Boss, Drop, Decent Skill) can appear across 3 lines. Engine adjusts lines 2/3 probabilities accordingly.
- **Level 160+ adjustment** — Stat/ATT/HP values get +1% at calculation time (not baked into data).
- **Item type aliases** — UI "Accessory" → data key `ring`, "Badge" → `heart`.

Desired Stat option labels sit in a native `<select>`, which can neither wrap nor truncate. Keep them terse ("Meso%" not "Mesos Obtained%", "+" not "and"), and keep the field spanning the full form row.

Rate data sourced from `brendonmay.github.io` and pre-processed into compact `{ tables, lookup }` format in `cubing-data.ts`.
