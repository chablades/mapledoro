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
`2000xxxx` = mastery composites, `3000xxxx` = enhancement (contiguous 4-run per class),
`4000xxxx` = the 3rd Common Node added in v271.

**Common nodes are class-aware.** `COMMON_SKILLS` is only the two shared Sol skills; the
`common` level array is indexed against `commonSkillsFor(className)`, which appends the
class's **3rd Common Node** (the HEXA form of its job branch's 5th job common skill, so one
skill covers a whole branch). That node has its own cost table, so common costs are looked
up per index through `COMMON_COST_TABLES`, not one shared table. The branch table lives in
`hexa-classes.ts`; SHINE classes get the Erda Link equivalent (SHINE Tree of Stars) in the
same slot.

**HEXA Stat nodes** are rolled rather than leveled, so they have no level, FD or fragment
cost, never touch any total, and never reach the FD breakdown tab or `applyGuideSteps`. The
generated `order` carries `h1`/`h2`/`h3` markers at MapleScouter's positions, drawn as plain
(non-clickable) tiles reading "Stat". `HEXA_STAT_SKILLS` in `hexa-classes.ts` is the one
definition of their names and icons, shared with the Scouter setup step and the Stat
Optimizer.

Completion is not stored here. It's derived from the character's own `hexaStat` tool data
(a node counts as done once a preset's lines sum to `HEXA_STAT_NODE_MAX_LEVEL`), with a
manual per-node override in the tracker's Overview tab for characters that don't track it,
kept in the `hexaSkills` saved state as `hexaStatDone`. A node marked done drops out of the
guide.

**SHINE classes (Sia, Erel Light) use the Erda Link system**, not the HEXA Matrix, so
`HexaSkillsWorkspace` shows a placeholder-cost notice for any class with `group === "SHINE"`.
Their kits (and the Sol skills) draw icons from the `erda-skill`/`skill` resource types rather
than `hexa-skill`; the specific ids live inline in `hexa-classes.ts`. Note the `erda-skill` url
pattern gained a per-class `{outerId}` folder in v269 (`/api/img/erda-skill/{outerId}/{type}/{id}/{asset}`,
vs v268's flat `/{type}/{id}/`); Sia = 18212, Erel Light = 18112.