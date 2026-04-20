# Event Planner (Star Force)

Meso-cost planner for Star Force events across multiple characters/items. **Depends on `../star-force/star-force-data`** for the cost model — don't duplicate the formulas here; extend the shared module.

**Key files:**
- `event-items.ts` — Equipment catalog (`EVENT_ITEMS`, `EVENT_ITEMS_BY_ID`), categories (AbsoLab, Arcane Umbra, Eternal, CRA, Dawn, Pitched, Brilliant, Gollux, Misc), and `maxStarForLevel()`.
- `EventPlannerWorkspace.tsx` — UI + its own localStorage (`event-planner-v1`) holding global planner options (MVP tier, Sunny Sunday toggles, starCatch) and an `entries[]` list of `{characterName, itemId, currentStar, targetStar, replacementCost, safeguard}`.

**Notes:**
- Storage is **global, not per-character**. Each entry carries its own `characterName` string — changing a character's name elsewhere won't migrate existing entries.
- Overalls (AbsoLab / Arcane Umbra / Eternal) replace separate Top/Bottom. Class-specific icons exist only for Hats and Overalls on the wiki CDN; Shoes/Gloves/Cape/Shoulder share a generic icon per set.
