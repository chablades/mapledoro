# EXP Calculator

Each calculator tab persists per-character under its own tool key via `characterToolStorage.ts`,
mirroring how the liberation page splits `liberation` and `astra`. Resources stays in memory.

- `expFarming` (`SavedExpState`): buff selections, target level, hourly kill count.
- `expDailyWeekly` (`SavedAllInOne`): the Daily Content, Weekly Content, Monster Park, and Epic
  Dungeon panels, plus target level, burning, and the date window.

Never persist values that are derived from elsewhere: character level and current EXP percent come
from the character record, and monster level and base EXP come from the selected monster. What
`expFarming` saves of the monster is its `key` alone (`monsterKey`), and level/EXP are rehydrated
from `EXP_MONSTERS` on load, so the saved state is enough to reproduce the hourly rate without
duplicating the monster table. Event tickets, growth potions, Punch King, and Double Up are
deliberately not saved; they are one-off event resources, so they reset each visit.

The Farming tab's Overview has an "Import Into Daily/Weekly Calculator" link. Tabs unmount when
they aren't showing, so the import is a one-shot handoff through `importedHourlyExp` on the
workspace: Farming stashes its hourly rate, Daily / Weekly seeds `customDailyMode: "hourly"` from
it in its lazy initializer, and `changeTab` spends it on the way out. Do not skip the spend, or a
later visit to the tab would re-seed and stomp whatever the player had set. Custom Daily is either
a flat figure (`customDailyExp`) or a rate (`customHourlyExp` x `customHoursPerDay`), resolved by
`customDailyExp()` in the data module.

Writes go through the `updateBuffs` / `updateSavedMonsterField` / `updateInput` wrappers, which
write inside the state updater and no-op when no character is selected (Manual Level is never
saved). Do not call the raw `setBuffs` / `setMonster` / `setInput` from a handler or the write is
silently skipped. Selecting a character flushes the outgoing character's state, then loads the
incoming one's through `mergeSavedExpState` / `mergeSavedAllInOne`, so ids added after a save still
get a default. Switching to Manual Level resets that tab to its defaults.

`mergeSavedAllInOne` drops a saved date window whose end date has already passed and falls back to
today through +27 days, so a stale plan cannot silently project EXP over dead dates.

The monster search is local-only. Use `exp-monsters.ts`; do not add a runtime monster API or
network lookup. Monster rows are `[id, name, level, exp, mapId]`, where `id` must render through
`MobSprite` and `name` should be the GMS display name. `ExpMonster.key` is generated from row
position because multiple source mobs can intentionally collapse to the same display mob.

The monster dropdown mirrors the character dropdown patterns (portaled fixed-position menu, thin
scrollbar, arrow rotation, click-away keeps the selection); reopening it clears only the search
text. Unsearched, it is ordered by distance from the current player level; search results stay in
source order — do not reorder them by level.

Character selection auto-fills level and current EXP percent. Convert stored raw EXP to percent
of the selected level, truncate to 3 decimals, and disable level/percent inputs while a character
is selected.

Both calculator tabs open on the roster's main character (`selectMainCharacter`) when there is one,
falling back to Manual Level otherwise. `loadCharacterState` / `loadCharacterAllInOne` are shared by
the mount-time seed and the dropdown's `updateCharacter`, so both paths apply saved state and job
rules identically. The seed runs in a lazy `useState` initializer, so it must not write.

GMS naming/content decisions:
- Penance Ring is Ring of Torment.
- Ring of Clan is Kinship Ring, but keep the Ring of Clan option semantics.
- Authentic symbols are labeled Sacred Symbols.
- Grand Authentic Symbols are labeled Grand Sacred Symbols.
- Champion's Protection is Champion's Renown.
- Lucky Dice is Roll of the Dice.
- Roll of the Dice only shows when no character is selected or the selected character's job is in
  `ROLL_OF_THE_DICE_JOBS` (all pirate branches); selecting a non-pirate zeroes the buff and saves
  the zero, so a stale value cannot survive in a non-pirate's stored buffs.
- Penance/Cash Shop modifiers live under Reg Server Modifiers.
- The only Cash Shop coupon is 2x and it only applies through level 250.

Tile-rendered select buffs (`TILE_SELECT_IDS`) store the option *value* in `buffs.selects` like
every other select buff; only the input surface maps level (option index) to value. The two EXP
nodestone tiles (Mapae +33%, Roro +10%) are exclusive toggles over the single shared `exp-node`
select value.

`IconLevelTile` is the shared icon + numeric-stepper tile. Select buffs wrap it (mapping level to
option value) via `SelectLevelTile`; the Daily / Weekly tab uses it directly for weekly run counts
(value is the raw run count, 0-3).

Non-stacking rules:
- EXP Accumulation Potion and Small Concentrated EXP Accumulation Potion are mutually exclusive.
- MVP 50% Bonus EXP and MVP 70% Bonus EXP are mutually exclusive.

Rune inputs are intentionally simplified: use Rune Persistence (Evan Link Skill) plus Rune Day
instead of separate Liberated Rune/Rune of Blessings dropdowns. Do not add impossible full-uptime
rune scenarios.

Overview stays compact: the selected monster card owns the monster identity and final kill EXP;
don't duplicate its details elsewhere.

`MONSTER_PARK_OPTIONS` is ordered by EXP, so "the dungeon a player would actually run" is just the
last entry whose `minLevel` the character meets. `monsterParkId` is a pin, and `""` means that
auto-pick, which keeps upgrading as the plan levels the character. `resolveMonsterPark` falls back
to the auto-pick when a pinned dungeon is out of reach, so a stale save cannot silently zero out
Monster Park EXP. Entry levels are the game's real gate minimums (Arcana is 230), not a 5-level
ladder.

Epic Dungeon EXP is `base x dungeon.baseMultiplier x reward multiplier x epicDungeonExpMultiplier`.
The last is the event rate (1x when no event is running, 1.5x - 4x during one) and is a typed
number, not a dropdown, because the rate changes every event.

Heroic (Reboot) worlds have no reward multiplier to buy, so its dropdown is hidden for a selected
Heroic character and `effectiveInput` pins `epicDungeonMultiplier` to 1 for the calculation only.
World class comes from `worldServerType` (boss-crystals), which counts Solis as Heroic alongside
Kronos and Hyperion. `effectiveInput` likewise blanks `burningType` at level 270+, where no Burning
type grants extra levels and the dropdown is disabled. Neither override is written back to state:
the same plan is reused across characters, and clobbering a stored pick would lose it for one the
option still applies to.

Daily content tiles are deliberately *not* level-gated. A plan can carry the character past a
daily's unlock level inside the date window, so the tiles stay selectable and `selectedDailyExp`
skips a daily per simulated day until the level is reached.
