# HEXA Skills

**Icons:** each node carries a MapleResource `hexa-skill` id (string) served from
haku.network; render with `<HexaSkillIcon id … disabled? />` or, in this feature, the local
`SkillIcon` in `hexa-ui.tsx` (which adds an initial-letter fallback). IDs are baked into
`hexa-classes.ts`. Multi-skill **mastery** nodes use the in-game *split composite* icon, so
a node is `{ iconId, iconUrl?, skills: string[] }` — one icon, many skill names. An empty
`iconId` with no `iconUrl` renders the skill's initial. Icons not served by a `hexa-skill`
id instead set `iconUrl` (built via `resourceImageUrl` from the `erda-skill`/`skill` resource
types) through the `su`/`nodeUrl` helpers in `hexa-classes.ts`.

**`hexa-skill` ID series:** `1000xxxx` = origin (suffix <52) + ascent (≥52, = origin+52),
`2000xxxx` = mastery composites, `3000xxxx` = enhancement (contiguous 4-run per class).

**SHINE classes (Sia, Erel Light) use the Erda Link system**, not the HEXA Matrix, so
`HexaSkillsWorkspace` shows a placeholder-cost notice for any class with `group === "SHINE"`.
Their kits (and the Sol skills) draw icons from the `erda-skill`/`skill` resource types rather
than `hexa-skill`; the specific ids live inline in `hexa-classes.ts`. Note the `erda-skill` url
pattern gained a per-class `{outerId}` folder in v269 (`/api/img/erda-skill/{outerId}/{type}/{id}/{asset}`,
vs v268's flat `/{type}/{id}/`); Sia = 18212, Erel Light = 18112.