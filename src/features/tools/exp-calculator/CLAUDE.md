# EXP Calculator

Keep this feature stateless. Do not add localStorage unless it becomes a saved plan/tracker.

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

GMS naming/content decisions:
- Penance Ring is Ring of Torment.
- Ring of Clan is Kinship Ring, but keep the Ring of Clan option semantics.
- Authentic symbols are labeled Sacred Symbols.
- Grand Authentic Symbols are labeled Grand Sacred Symbols.
- Champion's Protection is Champion's Renown.
- Lucky Dice is Roll of the Dice.
- Roll of the Dice only shows when no character is selected or the selected character's job is in
  `ROLL_OF_THE_DICE_JOBS` (all pirate branches); selecting a non-pirate zeroes the buff.
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
