# EXP Calculator

Each tab persists per-character under its own tool key via `characterToolStorage.ts`; Resources
stays in memory.

- `expFarming` (`SavedExpState`): buff selections, target level, hourly kill count.
- `expDailyWeekly` (`SavedAllInOne`): the Daily / Weekly / Monster Park / Epic Dungeon panels, plus
  target level, burning, and the date window.
- `expLevel`: the character's current level and EXP percent. Deliberately **not** per tab, since
  they are one fact about the character and the two tabs must not disagree about them.

**Never persist derived values.** Monster level and base EXP come from the monster.

**Level and EXP percent are editable even with a character selected**, because the record only
refreshes on a lookup and a player who levelled since still needs the tool. `readToolProgress`
(`tools/toolLevel.ts`) returns the save only while its level is *ahead* of the record's, so a
refresh that catches up re-syncs both tabs and discards the typed figures in one step
(`characterProgress`). A typed-ahead level with no percent saved alongside it keeps showing the
record's percent, matching what the field showed when the player typed the level and left the
percent alone. The pair is always written together, so a save can't hold a percent from one level
and a level from another. `expFarming` saves the monster's `key`
only (`monsterKey`) and rehydrates level/EXP from `EXP_MONSTERS`. Event tickets, growth potions,
Punch King, and Double Up reset each visit by design.

**Writes go through the `updateBuffs` / `updateSavedMonsterField` / `updateInput` wrappers** (plus
each tab's `updateProgress` for the `expLevel` key), which write inside the state updater and no-op
with no character selected (Manual Level is never saved). Calling raw `setBuffs` / `setMonster` /
`setInput` from a handler silently skips the write.

**Character selection** flushes the outgoing character, then loads the incoming one through
`mergeSavedExpState` / `mergeSavedAllInOne` so ids added after a save still get a default. Both tabs
open on the roster main (`selectMainCharacter`), falling back to Manual Level.
`loadCharacterState` / `loadCharacterAllInOne` serve both the mount seed and the dropdown so the
paths can't drift; the seed runs in a lazy `useState` initializer and **must not write**. Selecting a
character auto-fills level and EXP percent, both of which stay editable. `mergeSavedAllInOne` drops a
saved date window whose end has passed, falling back to today +27 days.

**Farming → Daily/Weekly import** is a one-shot handoff through `imported` (an `ImportedFarmingRate`)
on the workspace, because tabs unmount when hidden. Farming stashes its hourly rate, Daily/Weekly
seeds `customDailyMode: "hourly"` from it, and `changeTab` **spends it on the way out**. Skipping the spend re-seeds on a
later visit and stomps the player's setting. The handoff carries the Farming tab's `charName` (null
for Manual Level, a real selection that must not fall back to the main) and Daily/Weekly opens on
that character. `importHourlyExp` also writes the rate through `persistImportedHourlyExp`, which
cannot move into the lazy seed. Custom Daily is either a flat figure (`customDailyExp`) or a rate
(`customHourlyExp` x `customHoursPerDay`), resolved by `customDailyExp()` in the data module.

**Monster search is local-only** — use `exp-monsters.ts`, never a runtime API. Rows are
`[id, name, level, exp, mapId]`; `id` must render through `MobSprite`, `name` is the GMS display
name. `ExpMonster.key` comes from row position because several source mobs intentionally collapse to
one display mob. Unsearched, the dropdown orders by distance from the player's level; **search
results stay in source order**.

**Buff rules:**
- Tile-rendered select buffs (`TILE_SELECT_IDS`) store the option *value* in `buffs.selects` like
  every other select buff; only the input surface maps level to value. The two EXP nodestone tiles (Mapae +33%,
  Roro +10%) are exclusive toggles over one shared `exp-node` value.
- `IconLevelTile` is the shared icon + stepper tile; `SelectLevelTile` wraps it for select buffs, and
  Daily/Weekly uses it directly for weekly run counts (0-3).
- Mutually exclusive: EXP Accumulation Potion vs Small Concentrated; MVP 50% vs MVP 70%.
- Rune inputs are deliberately simplified to Rune Persistence (Evan link) plus Rune Day. Don't add
  full-uptime rune scenarios.
- Roll of the Dice shows only with no character selected or a job in `ROLL_OF_THE_DICE_JOBS` (all
  pirates); selecting a non-pirate zeroes and saves the buff so a stale value can't survive.

**EXP tables:** `BASE_MONSTER_EXP_ARCANE` / `BASE_MONSTER_EXP_GRANDIS` are base monster EXP per character
level (200-259, 260-299), read through `baseMonsterExpForLevel`. Champion Double Up (3.5x), Haste
Fever Time (7x), Express Booster, and the Treasure Boxes all derive from them, so keep them as one
shared pair. Express Booster steps by level band off Grandis and stops scaling past Lv. 294; the
Lv. 265 value is measured, not band-fit, and the post-294 flatten is real. These event resources
take no EXP buffs, which is why they live in `RESOURCE_TABLES` (per-unit EXP by level, keyed by id)
and apply through `applyResourceUnits`. Haste Fever Time has no Daily/Weekly input yet.
`HIGH_MOUNTAIN_BASE` is the only Epic Dungeon table: Angler Company and Nightmare Paradise are exact
1.5x / 2x multiples of it.

**Resources tab** renders `buildResourceBreakdown(input)`, one `BreakdownSection` per content type,
each holding `BreakdownGroup`s (one source, one icon, one name) whose `values` stack every figure
that source produces: Epic Dungeon reward tiers, treasure box grades, Monster Park days. **Only the
section the Resource dropdown picks is rendered**, so it gets the full panel width; the dropdown is
built from the same list, which is why `title` stays on the section even though nothing prints it as
a heading any more. The pick is a plain id in state, resolved through
`sections.find(...) ?? sections[0]` on every render (`""` means unpicked). **The list is
level-independent**: every section is always present, and `minLevel` (declared per section, derived
from the same options the group filter uses) decides whether the body renders or shows a locked
line. Level gating the list would let a half-typed level, which the field clamps to Lv. 200 for a
keystroke, silently reassign the pick. Never correct the pick in an effect either. The Monster Park
dungeon pin keeps its option listed out of reach for the same reason.

Formulas are ported from the whackybeanz Contents Breakdown bundle and the figures match it exactly
at equal inputs. The one shape they all share is `withBonus`: a percent bonus **adds to** the base
multiplier rather than compounding with it, so 5x rewards at +20% pays 5.2x, not 6x. The simulator's
Monster Park and MPE math now goes through the same helper.

**Sections declare their own controls.** A section lists `BreakdownControlId`s; the tab owns the
`ResourceBreakdownInput` state (one object shared by every section, so a knob keeps its value while
you look at another resource) and `BREAKDOWN_CONTROLS` in the workspace supplies each one's label
and range. Adding a knob means adding it to the id union, the input interface,
`defaultBreakdownInput`, and `BREAKDOWN_CONTROLS`, and naming it on a section. **Changing Level
re-seeds the three monster-level fields** (treasure, Express Booster, Haste) from the event handler,
never an effect, since `react-hooks/set-state-in-effect` forbids the effect version.

The tab is three bands: the Resource picker beside Level (both persist across resources), the picked
section's `note` under them, then the body. The body is one `innerCardStyle` surface holding that
section's controls in a `panel`-filled band over `.exp-breakdown-grid`, which auto-fills 280px
columns across the whole panel. A `note` is now the picked resource's description rather than a card
subtitle, so keep it to one line that reads on its own. The body is keyed by section id so switching
resources replays the site-wide `.fade-in`.

**The charts under the body** (`ResourceChartView`, one per entry) are the per-level tables the tab
was before the breakdown, brought back as a fourth band: `resourceChartsForSection(section.id)`
returns `ResourceChart`s (columns typed `exp` / `percent` / `count` for the formatter, rows of
`number | null` cells, an optional `title` shown as a heading) or an empty list for sections with
nothing worth tabling (dailies, weeklies, potions, treasure boxes, Monster Park, Double Up). They are
**level-independent and render under a locked body too**, since what a resource pays at the levels
ahead is the point of them. Each box caps at 340px and scrolls within itself; the typed level's row
is highlighted with `accentSoft` and centred by an effect that sets `scrollTop` (a DOM write, so it
clears `set-state-in-effect`). **Keys must differ from the body's**, which sits under the same parent
keyed by section id: a shared key made React keep the old resource's content on every switch.
Single-source charts come from `unitChart`: per-unit EXP, then `% of Level` and `<units> / Level`,
priced on a `batch` (a 1,150-point Punch King run, an hour of sauna, a 10k-kill Fever Time) where one
unit is a negligible slice; the to-level count is ceiled for units and fractional for batches. EXP
Tickets is two titled charts, one per ticket, since their level ranges differ. Epic Dungeon is one
chart with a `group` label on each column, and the view renders a spanning header row from runs of
equal groups. The table uses `border-collapse: separate` because collapsed borders scroll out from
under a sticky `<thead>`.

A group's `heading` opens a labelled band that spans the grid and forces a fresh row; Dailies sets it
on the first entry of each region. It is only a divider: the bonus percents stay Arcane River and
Grandis, with Tenebris riding the Arcane River one, exactly as the simulator does.

**Monster Park Extreme lives inside the Monster Park section** because it shares that section's EXP
bonus stat. Only the bonus reaches it, never the dungeon pick or run count: Extreme is one fixed
dungeon cleared **once a week**, and `MPE_CLEAR_FACTOR` is part of what that single clear pays, not a
count of runs.

It is **GMS-only and unbuffed**: no Singapore, Malaysia, Blood Moon Forest, or Sunday Maple, and no
EXP buffs (every source here either ignores them or is quoted before them). Sources the level cannot
enter are dropped rather than shown as zero; a section left with no groups keeps its slot in the
picker and renders as locked.
Treasure Boxes are flat multiples of the *monster's* base EXP, not the character's; their icons are
the EXP Gem the box drops, since the boxes have no item icon.

**Punch King per-point EXP comes from the `punch-king` table, never from base monster EXP x 900.**
The two agree at 85 of the 100 levels, which makes the shortcut look safe, but the table drifts at
Lv. 214-215 and 270-272 and **plateaus flat from Lv. 290 up**, where computing it overpays by up to
39%. A run caps at `PUNCH_KING_MAX_POINTS` (1150), which is what the breakdown opens on.

The Daily / Weekly simulator instead prices a banked score through `PUNCH_KING_TIERS`, and at a full
1150 it lands around a fifth of table x 1150. That gap is unexplained and predates the breakdown.

Note the tab shares `EXP_TO_NEXT_LEVEL_VALUES` with the rest of the calculator, which is the KMS
CROWN table: GMS needs more EXP per level between 210 and 259, so percentages in that band read low.

**Monster Park / Epic Dungeon:** `MONSTER_PARK_OPTIONS` is ordered by EXP, so the dungeon a player
would actually run is the last entry whose `minLevel` they meet. `monsterParkId` is a pin and `""`
means that auto-pick; `resolveMonsterPark` falls back to auto when a pin is out of reach so a stale
save can't zero out the EXP. Entry levels are the game's real gates (Arcana is 230). Epic Dungeon EXP
is `base x dungeon.baseMultiplier x reward multiplier x epicDungeonExpMultiplier`, the last being the
event rate (1x to 4x) typed as a number because it changes every event.

**`effectiveInput` overrides are never written back**, since the same plan is reused across
characters and clobbering a stored pick would lose it: Heroic worlds pin `epicDungeonMultiplier` to 1
(world class from `worldServerType`, which counts Solis as Heroic), and level 270+ blanks
`burningType`.

**Daily content tiles are deliberately not level-gated** — a plan can carry the character past an
unlock inside the window, so tiles stay selectable and `selectedDailyExp` skips a daily per simulated
day until the level is reached.

GMS naming: Penance Ring → Ring of Torment, Ring of Clan → Kinship Ring (keep Ring of Clan
semantics), Authentic → Sacred Symbols, Grand Authentic → Grand Sacred Symbols, Champion's Protection
→ Champion's Renown, Lucky Dice → Roll of the Dice. Penance/Cash Shop modifiers sit under Reg Server
Modifiers; the only Cash Shop coupon is 2x, applying through level 250.
