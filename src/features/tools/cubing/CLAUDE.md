# Cubing Calculator

Probability calculator for MapleStory cubing. Computes expected cube count and meso cost to achieve a desired potential, using official KMS rate data.

**Key files:**
- `cubing-data.ts` — Pre-consolidated rate tables + dedup lookup (generated, see below).
- `cubing-types.ts` — `Cat` enum, `RateEntry`/`LineRates` types, tier/cube constants, stat option builders.
- `cubing-engine.ts` — Probability calculation: consolidates rates, enumerates 3-line outcomes, sums matching probabilities, applies geometric distribution.
- `CubingWorkspace.tsx` — UI.

**Data format (`cubing-data.ts`):**

Rate data is sourced from the reference at `github.com/brendonmay/brendonmay.github.io` (39K-line `cubeRates.js`), then pre-processed into a compact format:

```ts
{ tables: LineRates[], lookup: Record<string, number> }
```

- `tables` — 86 unique rate tables. Each has `l1`, `l2`, `l3` (line 1/2/3) arrays of `RateEntry` tuples.
- `lookup` — Maps `"item/cube/tier"` keys (e.g. `"ring/red/legendary"`) to an index in `tables`. 140 combos map to 86 unique tables (shoulder/cape/belt share tables, as do top/overall, etc.).
- `RateEntry` is `[Cat, number, number]` — category enum, stat value, probability percentage.

Categories use the `Cat` const enum (numeric IDs 0–19). Only the 19 categories the engine actually inspects are kept individually; all others are pre-summed into a single `Cat.Junk` entry per line.

**Invariants:**
- **Special-line limits** — `MAX_CATEGORY_COUNT` caps how many times certain categories (IED, Boss, Drop, Decent Skill, etc.) can appear across 3 lines. The engine adjusts probabilities for lines 2/3 when prior lines contain capped categories.
- **Level 160+ adjustment** — Stat/ATT/HP values get +1% for items level 160 and above. Applied at calculation time, not baked into the data.
- **Item type aliases** — UI "Accessory" maps to data key `ring`, "Badge" maps to `heart`.
- **No localStorage** — Stateless calculator; no persistence needed.
