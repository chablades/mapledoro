# Pitched Boss Drops

Drop-log tracker for the 10 pitched boss items. Each logged drop is an event (`id`, `characterId`, `characterName`, `itemId`, `channel`, `date`, `timestamp`) — not a per-character toggle.

**Key files:**
- `pitched-items.ts` — `PITCHED_BOSS_ITEMS` catalog (id, name, boss, slot, icon) + `PITCHED_ITEMS_BY_ID` map.
- `PitchedBossDropsWorkspace.tsx` — UI, charts, and storage (`pitched-boss-drops-v1`, global store versioned `{ version: 1, drops: [] }`).

**Charts:** uses `react-chartjs-2` / `chart.js` (Line chart). This is the **one exception** to the top-level "pure SVG charts" convention — keep it here, don't propagate chart.js to other tools.

**Character linkage:** drops hold `characterId` (from the characters store's numeric ID) *and* a denormalized `characterName`. Because `characterID` isn't a reliable unique key (see `src/features/characters/CLAUDE.md`), treat `characterName` as the canonical identity when displaying or filtering.
