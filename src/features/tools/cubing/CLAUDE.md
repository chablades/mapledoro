# Cubing Calculator

Stateless probability calculator — no localStorage persistence.

**Invariants:**
- **Special-line limits** — `MAX_CATEGORY_COUNT` caps how many times certain categories (IED, Boss, Drop, Decent Skill) can appear across 3 lines. Engine adjusts lines 2/3 probabilities accordingly.
- **Level 160+ adjustment** — Stat/ATT/HP values get +1% at calculation time (not baked into data).
- **Item type aliases** — UI "Accessory" → data key `ring`, "Badge" → `heart`.

Rate data sourced from `brendonmay.github.io` and pre-processed into compact `{ tables, lookup }` format in `cubing-data.ts`.
