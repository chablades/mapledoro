# EXP Calculator

The Farming Calculator persists buff selections, target level, and hourly kill count per-character
under the `expCalculator` tool key (`SavedExpState`) via `characterToolStorage.ts`. Character level
and current EXP percent are not saved (they come from the character record), nor are monster level
and base EXP (they come from the selected monster). The Daily / Weekly and Resources tabs stay
entirely in memory. Do not persist them without a good reason.

Writes go through `updateBuffs` and `updateSavedMonsterField` in `BuffsTab`, which write inside the
state updater and no-op when no character is selected (Manual Level is never saved). Selecting a
character flushes the outgoing character's state, then loads the incoming one's through
`mergeSavedExpState`, so buff ids added after a save still get a default. Switching to Manual Level
resets buffs, target level, and hourly kill count to the defaults.

The monster search is local-only. Use `exp-monsters.ts`; do not add a runtime monster API or
network lookup. Monster rows are `[id, name, level, exp, mapId]`, where `id` must render through
`MobSprite` and `name` should be the GMS display name. `ExpMonster.key` is generated from row
position because multiple source mobs can intentionally collapse to the same display mob.

Monster dropdown behavior should match character dropdown patterns: portaled fixed-position menu,
thin scrollbar styling, arrow rotation, and click-away preserving the selected monster. Reopening
the closed monster dropdown clears only the search text.

Character selection auto-fills level and current EXP percent. Convert stored raw EXP to percent
of the selected level, truncate to 3 decimals, and disable level/percent inputs while a character
is selected.

The Farming Calculator opens on the roster's main character (`selectMainCharacter`) when there is
one, falling back to Manual Level otherwise. `loadCharacterState` is shared by that mount-time seed
and the dropdown's `updateCharacter`, so both paths apply saved state and job rules identically.

The unsearched monster dropdown is ordered by distance from the current player level, so the
nearest-level monsters seed the list. Search results stay in source order; do not reorder them by
level.

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

Overview should stay compact. The selected monster card owns the monster identity and final kill
EXP; avoid duplicating selected monster details elsewhere.
