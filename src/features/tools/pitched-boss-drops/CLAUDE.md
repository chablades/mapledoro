# Drop Tracker

Display name is **"Drop Tracker"**, but the route/folder stay `pitched-boss-drops` and the localStorage key stays `pitchedBossDrops` — don't rename them (preserves bookmarks and existing user data).

Drops are events (`id`, `characterId`, `characterName`, `itemId`, `channel`, `date`, `timestamp`, optional `note`) — not per-character toggles.

`characterID` isn't a reliable unique key — treat `characterName` as canonical identity for display/filtering.

Items live in `pitched-items.ts` as `DROP_ITEMS`, each tagged with a `category` from `DROP_CATEGORIES` (Pitched Boss, Armor Boxes, Ring Boxes, Brilliant Boss Accessory Set, Grindstones, Exceptional Enhancements). Category drives the grouped dropdown and the category filter. Existing pitched `id` slugs are kept stable so already-logged drops still resolve.
