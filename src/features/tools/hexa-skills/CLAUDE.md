# HEXA Skills

**Icons:** each node carries a MapleResource `hexa-skill` id (string) served from
haku.network; render with `<HexaSkillIcon id … disabled? />` or, in this feature, the local
`SkillIcon` in `hexa-ui.tsx` (which adds an initial-letter fallback). IDs are baked into
`hexa-classes.ts`. Multi-skill **mastery** nodes use the in-game *split composite* icon, so
a node is `{ iconId, iconUrl?, skills: string[] }` — one icon, many skill names. An empty
`iconId` with no `iconUrl` renders the skill's initial. Icons not served by a `hexa-skill`
id instead set `iconUrl` (built via `resourceImageUrl` from the `erda-skill`/`skill` resource
types — the SHINE classes' nodes/skills and the Sol skills); see the `su`/`nodeUrl` helpers in
`hexa-classes.ts`.

**`hexa-skill` ID series** (from the v268 dump, unchanged in v269):
`1000xxxx` = origin (suffix <52) + ascent (≥52, = origin+52), `2000xxxx` = mastery composites,
`3000xxxx` = enhancement (contiguous 4-run per class). The Sol skills and the SHINE classes'
kits come from the `erda-skill`/`skill` dumps below, not `hexa-skill`.

**`erda-skill` icons** (`manifests/v269/erda-skill.json`, url pattern
`/api/img/erda-skill/{outerId}/{type}/{id}/{asset}` — note the v269 per-class `{outerId}`
folder, added since v268's flat `/{type}/{id}/` layout). The two SHINE classes each have an
`outerId`: **Sia = 18212**, **Erel Light = 18112**. Sol Janus' global icon lives in Erel
Light's folder: `18112/skill/100`. Sia's kit: enhancements `18212/skill/102` (Shine),
`/101` (Sirius), `/104` (Sadalsuud), `/106` (Savior's Circle); mastery composites
`18212/ultimate/500` (Ray/Antares) + `/501` (Boom/Algol/Fomalhaut). Erel Light's kit:
enhancements `18112/skill/101` (Eternal Light), `/102` (Sentinel Rise), `/104` (Eternal
Guardian), `/106` (Destruction of Roan); mastery composites `18112/ultimate/500` (Spear of
Lugh) + `/501` (Fury/Sting of Roan).

**`skill` icons** (plain game-`skill` ids, `/api/img/skill/{id}/{asset}`): SHINE origins/ascents
— Sia `182141500` (Celestial Design) / `182141502` (Starlit Cosmos); Erel Light `181141500`
(Fall of Melin) / `181141502` (Radiant Spear). Sol Hecate is `skill` `500001005`. All `erda-skill`
and `skill` icons are set via `iconUrl` through `su`/`nodeUrl`.

**SHINE classes use the Erda Link system**, not the HEXA Matrix; `HexaSkillsWorkspace` shows a
placeholder-cost notice for any class with `group === "SHINE"`.
