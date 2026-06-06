# HEXA Skills

**Icons:** each node carries a MapleResource `hexa-skill` id (string) served from
haku.network; render with `<HexaSkillIcon id … disabled? />` or, in this feature, the local
`SkillIcon` in `hexa-ui.tsx` (which adds an initial-letter fallback). IDs are baked into
`hexa-classes.ts`. Multi-skill **mastery** nodes use the in-game *split composite* icon, so
a node is `{ iconId, iconUrl?, skills: string[] }` — one icon, many skill names. An empty
`iconId` (e.g. Sol Hecate) renders the skill's initial. Icons not served by a `hexa-skill`
id instead set `iconUrl` (built via `resourceImageUrl` from the `erda-skill`/`skill` resource
types — Sia's nodes/skills and Sol Janus); see the `su`/`nodeUrl` helpers in `hexa-classes.ts`.

**`hexa-skill` ID series** (from the v268 dump, `mapleresource-api/assets/hexa-skill/`):
`1000xxxx` = origin (suffix <52) + ascent (≥52, = origin+52), `2000xxxx` = mastery composites,
`3000xxxx` = enhancement (contiguous 4-run per class). Sol Janus and Sia's kit come from the
`erda-skill` dump below, not `hexa-skill`.

**`erda-skill` / `skill` icons** (`manifests/v268/erda-skill.json`, url pattern
`/api/img/erda-skill/{type}/{id}/{asset}`): Sol Janus is `erda-skill` `skill/100`. Sia's kit:
enhancements `skill/102` (Shine), `skill/101` (Sirius), `skill/104` (Sadalsuud), `skill/106`
(Savior's Circle); mastery composites `ultimate/500` (Ray/Antares) + `ultimate/501`
(Boom/Algol/Fomalhaut). Sia's origin (Celestial Design) and ascent (Starlit Cosmos) use plain
game-`skill` ids `182141500` / `182141502`. All set via `iconUrl` through `su`/`nodeUrl`.
