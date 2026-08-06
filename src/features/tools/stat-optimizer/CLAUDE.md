# Stat Optimizer

Two modes (Hyper Stat, HEXA Stat) that are **exact ports of maplescouter.com's
optimizer** (algorithms, tables, and damage kernel were reverse-engineered from
its production bundle and behaviorally verified against the live site). Scouter
optimizes bossing only; Hyper Stat additionally has a **mobbing target** that is
ours (see "Mobbing target" below). Works **standalone**: state is always present,
blank by default (`emptyCharacterSeed`), autopopulated when a stored character is
picked. Edits live in memory only and are intentionally **not persisted**, with
one exception: the level, saved per character under the `statOptimizer` tool key
(see "Point budget").

## Damage kernel (`damage-formula.ts`, scouter's `A`/n8/Ng/gt/h2/_M/VQ)
`computeScouterDamage` = statFactor × attack × critBucket × dmgBucket × iedBucket.
Only ratios between two evaluations matter (final damage / skill % cancel), but
the buckets contain scouter's per-class passive constants (`scouter-class-data.ts`,
vendored from their GMS table) because additive constants inside a bucket change
marginal values and therefore recommendations.

- Stat inputs are the in-game tooltip triple; a stat's total is
  `floor(base * (1 + %/100)) + %NotApplied` (the last is a FLAT amount).
- **statFactor** `(4*main + sub)/100` (Xenon: `(4*main + (sub + sub2)*4)/100`;
  Demon Avenger: HP-based `floor(x/3.5) + 0.8*floor((HP-x)/3.5) + sub`,
  `x = 90*level + 545`). A level term `dpmMainStat*(5*level+18)` sits inside the
  main stat base.
- **attack** `(base + 20 + dpmAtk + Δatk) * (1 + (atk% + dpmAtkPer)/100) + flat` —
  the flat `+20` is always present on the live site; added ATT from hyper/HEXA
  lands inside the multiplied base. Added main/sub stat lands in the flat bucket
  (the game puts it in "% Not Applied").
- **critBucket** `(1-cr) + cr*(1.35 + critDmg%)`, **rounded to 4 decimals** like
  the site; `cr = min(1, critRate/100)`. HEXA evaluations force `cr = 1`. Crit rate
  past 100% is not discarded for archers, it converts into crit damage instead
  (`excessCritDamage`) -- see "Excess crit rate" below.
- **dmgBucket** `1 + (dmg% + boss% + dpmBossDmg + Δ)/100`.
- **iedBucket** `1 - PDR%*(1 - ied)/100`; sources stack multiplicatively with
  scouter's exact stack/un-stack arithmetic (`stackIedSources`/`applyIed`,
  including their odd mixed-sign combine). `dpmIgnoreGuard` is stacked in.
- Boss PDR is a two-option picker, 300% (standard endgame) or 380% (hardest
  tier), defaulting to `DEFAULT_BOSS_PDR` = 380. Scouter offers the full 50-380
  range; the kernel still takes any number, so widening it is a UI change only.

## Strip-then-optimize
Stored character stats are displayed totals that already include the current
hyper/HEXA allocation, so each optimizer strips the current (editable)
allocation via negative kernel deltas, then re-optimizes. Scouter applies the
candidate's IED stack and the strip as two sequential operations — preserved
(`KernelDelta.ied` then `.iedStrip`). If the allocation is untracked the gain is
overstated; the workspace warns and lets the user type it in.

## Hyper Stat (scouter's greedy, `hyper-stat-engine.ts`)
Candidates in scouter's order: main stat, **secondary stat**, secondary II (only
Dual Blade / Shadower / Cadena / Xenon), ATT, boss, damage, crit damage, crit
rate, ignore DEF. Each step scores +1 level per line as
`0.998*(gain/stepCost) + 0.002*gain` with heuristic discounts ×0.9 on ignore DEF
and ×0.5 on the secondary line; best affordable line wins (strict `>`, so ties go
to the earlier line in the list); cap 15. Demon Avenger's main line is HP%
(2%/level) into the % bucket, with scouter's exact strip quirk (removed from both
the % and ×21 flat buckets). If the greedy scores below the current allocation,
the current one is kept and reported as `alreadyOptimal`. Points budget seeds
from `availableHyperPoints(level)` (scouter's closed form, 1699 at 300) minus
points the stored preset spends on untracked lines (HP, Arcane Power, ...).
There is no separate budget input: the workspace's level field recomputes the
budget on edit as the closed form less that same deduction, which the seed
carries out on `TargetSeed.untrackedPoints` for exactly that reason.

## HEXA Stat (scouter's per-line greedy, `hexa-stat-engine.ts`)
Levels are fixed (RNG-rolled in-game); only the stat TYPE per line is assigned.
**All six types are candidates** (main stat, ATT, boss, crit damage, damage,
ignore DEF — order matters for ties). Lines from all unlocked cores are sorted by
their Boss Damage value at their level (descending, additional-before-primary on
ties) and assigned greedily: each takes the type with the highest full-kernel
damage subject to the cross-core rules (a type on ≤1 primary line, ≤2 additional
lines, once per core). Crit rate forced to 100% during evaluation (site
behavior). The greedy is **not exhaustive**: when the player's current setup is
globally optimal the greedy usually lands a hair below it, the result is
reverted, and `alreadyOptimal` is reported — this is exactly how the live site
produces its "already optimized" answer (verified with a real endgame Kanna).
Xenon: candidate evaluations convert main stat to 0.48× All Stats; the final gain
evaluation intentionally reproduces the site's bug of skipping that conversion.

## Class handling
`resolveClassDamageProfile` prefers the vendored scouter table (main/sub/sub2 +
dpm constants); unlisted classes fall back to `classSkillData` requiredStats and
zero constants. Xenon: STR main / DEX sub / LUK sub2, tri-stat hyper lines.
Demon Avenger: HP main / STR sub.

## Mobbing target (`OptimizeTarget`, Hyper Stat only)
Scouter has no mobbing optimizer, so this is entirely ours: the *same* greedy and
the *same* kernel with every boss-only term switched off. HEXA Stat doesn't take
it (a HEXA line assignment is a bossing decision), so the workspace resolves an
`activeTarget` that is forced back to `"bossing"` whenever HEXA mode is on
screen, and hides the target picker there.

What "mobbing" changes, and nothing else:
- **The IED bucket collapses to 1**, so the Boss PDR picker, the Ignore Enemy
  DEF field and the Ignore Defense line all disappear rather than being valued
  at zero on screen.
- **`dpmBossDmg` drops out of the damage bucket.** The other `dpm*` constants
  stay: they are always-on class passives, not the bossing buffs the wording of
  the panel's note is about.
- **The archer excess-crit conversion is skipped.** Not because the mechanic
  changes, but because Vicious Shot and its equivalents run ~25% uptime and a
  mobbing allocation is tuned for the other 75%. This is the one place
  `excessCritDamage` is deliberately not applied.
- **No calibration.** `KernelCalibration` puts the kernel on scouter's fully
  buffed bossing footing (links, potions, Champion's Renown, seed rings), which
  is exactly the state a mobbing run isn't in, so it's zeroed and the panel shows
  `MobbingNote` in place of `CalibrationNote`.
- **Boss Damage % becomes Normal Enemy Damage %.** Label only: the field is the
  same `inputs.bossDamagePct`, and the game puts both in the same damage bucket.

**Normal Damage is a real in-game hyper line** (+3%/level, the Damage line's
curve), not a relabelled Boss Damage. It's in `HYPER_LINES` and lands in `d.dmg`
alongside Damage. Mobbing wants points in *both* precisely because the step-cost
curve is per line: two lines at 8 buy more percent than one at 15.

`HYPER_TARGET_LINES` is the single source of which lines a target touches: greedy
candidates, and which preset keys `mapStoredHyper` reads (so an untouched line is
never stripped from the baseline, and never shows a row). The bossing list is
scouter's, in scouter's order, untouched.

The **point budget deliberately does not vary by target.** `trackedPresetKeys`
is the union of both lists, so a mobbing run frees up the preset's Boss Damage
and IED points and a bossing run frees up its Normal Damage points, leaving the
same total on the table either way. That figure is the character's respec budget,
not a property of what they're respeccing for, and a budget that moved when you
flipped the picker would read as a bug.

## Per-target state
`SelectionState.targets` holds a `TargetSeed` per target (`inputs`,
`storedHyper`, `availablePoints`, `untrackedPoints`, `presetIndex`); `profile`, `cores` and the
calibration are shared. Both open on the same stat window and diverge only as
the user edits them, so typing mobbing numbers never clobbers the bossing ones.
The level is the exception: it's a fact about the character, so `setLevel`
writes it to both.

The **Hyper Preset picker** chooses which of the character's three in-game
presets seeds the "Now" column, which also re-derives `availablePoints` (a
different preset locks a different amount into untracked lines). It's per target,
which is the point: bossing preset on one, mobbing preset on the other. Greyed
out when the character has no stored allocation (`presetCount === 0`), since
there is nothing to switch between. Switching re-derives the budget off the level
on screen, not the record's, so it survives a level typed ahead of the last lookup.

## Excess crit rate (the one deliberate divergence)
Seven archer classes convert crit rate above the 100% cap into crit damage
(Vicious Shot and equivalents). `excessCritDamage` folds
`critRateToDmg * max(0, critRate - 100)` into the kernel's crit damage term, so the
rate still caps at 100 but the overflow keeps paying. Everyone else has a
`critRateToDmg` of 0 and is unaffected, byte for byte.

**Scouter does not do this, and that is not an oversight on their part we're
correcting blindly.** They carry the same per-class rate (`criInP`, vendored into
`CRIT_RATE_TO_CRIT_DMG`) and apply it as `pct * cridmgeff1 * criInP` in their
link-skill ranking, gated on exactly those seven classes. Their *optimizer* can't
reach it for two structural reasons: the crit rate input is capped at 100 in their
UI (typing more fires a toast and rewrites the field), and `specEfficiency` has no
crit rate bucket at all, only `cridmgeff1` to translate into. So a live cross-check
of an archer will now legitimately disagree with us on the crit rate line. Verify
against scouter with a non-archer, or with an archer under the cap.

Three consequences to keep in mind (a fourth, the mobbing target, is above):
- **`forceFullCrit` does not gate it.** That flag pins the rate for HEXA
  evaluations (scouter's convention); the overflow is a property of the character's
  stat line, so it applies in both modes. In HEXA it moves only the crit damage
  baseline (there is no crit rate line to assign), which slightly lowers what more
  crit damage is worth. That is the correct direction.
- **The calibration must subtract it.** `calibrateFromSpecEfficiency` solves
  `cal.critDmgPct` as "whatever the scouter bucket has that our inputs don't", so
  the seeded conversion comes off there or the kernel double-counts it.
- **It fires on the crit rate in the input field, which is unbuffed for a seeded
  character.** An endgame archer's stat window often reads well under 100 even
  though they are over it buffed, and the buffed value is not recoverable from
  `specEfficiency` (`cridmgeff1` alone leaves two unknowns). So on a seeded
  character this usually only bites at the boundary, where hyper levels push a
  70-90% window past the cap. Type the real buffed rate in to model it properly.

## Matching maplescouter exactly
Given identical inputs, recommendations match the live site, with the single
documented exception above. The `dpm*` class constants must be refreshed if scouter
rebalances its class data.

Both modes need this equally. Scouter's HEXA optimizer (`async function G` in the
optimizer chunk) is called as `G(userStat, calculatedData.myClassData, ...)` and
evaluates candidates through the same kernel `A` the hyper path uses, differing
only by the mode string (`"Hexa"` vs `"Hyper"`). `specEfficiency` appears nowhere
in that chunk: it's a *derived* table computed in the store module from the same
buffed state, which is exactly why inverting it recovers the buckets. So neither
optimizer reads the efficiency table, and both need the same calibration; the
kernel is shared, so `optimizeHexa` takes the same `KernelCalibration`.

**Buffed-state calibration (`scouter-calibration.ts`).** Our stat inputs are the
in-game stat window, which is unbuffed, while scouter optimizes a fully-buffed
bossing state (link skills, noblesse/potion settings, Champion's Renown, seed-ring
uptime). Those are all additive constants inside the same buckets, so the entire
gap is one offset per bucket, and each bucket's size is exactly what one field of
scouter's own `specEfficiency` table reports (`eff = d(bucket)/bucket` inverts to
the bucket). `calibrateFromSpecEfficiency` solves those offsets from the character's
cached Scouter entry (`peekScouterCache`, cache-only, no network call) into a
`KernelCalibration` the kernel adds alongside `dpm*`. All-zero = the raw stat
window, which is also the fallback whenever there's no cached entry — the panel
says so, since results then won't line up with scouter.

When calibration doesn't happen the seed carries a `CalibrationNotice` naming the
reason, so the panel can point at the fix instead of only disclaiming: `"setup"`
(Scouter setup unfinished, the actionable case), `"refresh"` (set up, but no cached
figure matches the character's current stats), `"unavailable"` (class scouter doesn't
cover, or a Demon Avenger). Standalone entry gets `null` — typed stats are taken at
face value, so there's nothing to warn about.

Left uncalibrated on purpose: **Demon Avenger** (its stat factor isn't `4*main + sub`,
so `mainStatAbseff1` doesn't invert to a stat sum) and any character whose table has
a non-positive field or 0% crit rate. Calibration is solved once at seed time from
the seeded inputs, so later edits to the stat fields move the buckets *from* the
calibrated baseline rather than re-deriving it.

Verified end to end against a real endgame Kanna: uncalibrated the greedy returned
main 5 / sub 3 / ATT 7 / boss 15 / dmg 14 / crit dmg 14 / IED 8, calibrated it
returns scouter's live answer exactly (ATT 8 / dmg 13 / crit dmg 15 / IED 6), at
both 300 and 380 PDR.

## Now/Best table
The hyper lines are a real `<table>` (`HYPER_TABLE_CSS`), not a CSS grid: each stat is
a `<th scope="row">` whose text is the `<label htmlFor>` for that row's input, which
both names the input and lets a screen reader place the recommended value
("Critical Damage, Best, 15"). Consequences worth keeping:
- The header cells must NOT use `.tool-field-label` — its `display: block` collapses
  the header row. Their typography is duplicated in `HYPER_TABLE_CSS` instead.
- Row cards need `border-collapse: separate` + `border-spacing` for the gap, so the
  border and radius are painted per cell (`th` left, `td.hyper-best` right).
- The changed/unchanged split is carried by weight AND color, plus an `.sr-only`
  suffix. Don't reintroduce a `→` glyph; screen readers announce it inconsistently.

The HEXA core cards follow the same rules in their own shape: each line's role text
is the `<label htmlFor>` for its stat `<select>` and "Lv" is the one for its level
input, each completing its accessible name with an `.sr-only` span (the visible
words alone don't say which core they belong to). The recommendation line reads
"Best: ..." for the same reason the arrow went: a `★` announced inconsistently.

## Point budget
The character level seeds from the stored record but stays editable, since a
record only refreshes on a lookup and a player who levelled since still needs the
tool. `readToolLevel` (`tools/toolLevel.ts`) floors the saved level with the
record's, so a refresh that catches up re-syncs the tool and a level typed ahead
of it survives until then. Everything the seed derives from the level (hyper
budget, `prefillFromStats`, HEXA core unlocks) uses the resolved one, but only at
seed time: a later edit moves the budget and the kernel's level term, not the
core unlocks (those stay hand-togglable).

Typed-in current levels are clamped so an allocation can never cost more than
`availableHyperPoints(level)` (`capHyperLevelToBudget` against what the other lines
already spend, in `setHyperLevel`). The panel's counter reports `result.pointsUsed`,
which is what the **recommended** allocation costs, so the number belongs to the Best
column it sits above. It can fall short of the budget: the greedy stops once no line's
next level is affordable, and the leftover is real. `pointsUsed` must therefore always
be the cost of the `allocation` actually returned, including in the `alreadyOptimal`
branch, where the greedy's own spend describes an allocation that was discarded.

HEXA has the same rule per core: `capHexaLineLevel` clamps a typed level against
what the core's other two lines spend, so the three can't exceed `HEXA_CORE_TOTAL`.
Scouter enforces this by refusing to run (`main + additional1 + additional2 > 20`
aborts with "입력값을 다시 확인해주세요"); clamping keeps the recommendation live instead.

## Nothing-to-optimize states
Three inputs make an engine report a 0% gain for want of input rather than as a
verdict, and all three are reported by the panel, never by the engine (the engines
mirror scouter; this is our own concern). `GainBanner` takes a `GainPending` that
replaces the figure outright:

- **No stats.** With no main or secondary stat the stat factor is 0, so every
  candidate evaluates to 0 and the greedy ranks nothing (`hasStatBaseline`).
- **No hyper points.** A zero budget makes the greedy allocate nothing, so the
  recommendation ties the current one at 0% (`result.pointsAvailable <= 0`).
- **No HEXA lines.** No unlocked core carrying levels means no assignable lines,
  so the optimized damage equals the current damage and `optimizeHexa` returns
  `alreadyOptimal` (`hexaTracked`).

Don't fold any of them into `alreadyOptimal`, and don't let the HEXA one reach the
banner: "already optimized" on a character with no HEXA at all is the exact wrong
answer, and it sits directly above the untracked-data warning that contradicts it.

## Standalone entry
No character behind the numbers, so `emptyCharacterSeed` supplies a generic
STR-main / DEX-secondary profile with zero class constants. Two consequences the
UI has to honor (`standalone = selectedCharName === null`):

- **The stat ids are placeholders, not answers.** `statLabel` prints "Main Stat",
  not "Main Stat (STR)", and `hexaTypeLabel` withholds the primary stat so
  `getMainStatLabel` falls back to its own generic. The kernel only ever reads
  main/sub/sub2 by position, so nothing downstream depends on the id.
- **The level cannot start at 0.** The hyper-point budget comes from the level, and
  a 0 budget makes `capHyperLevelToBudget` clamp every typed level straight back to
  0, so the panel silently refuses the levels its own warning asks for.
  `STANDALONE_LEVEL` (290) is the guard; keep it at or above 140.

## Data sources
Hyper tables/costs: `hyper-stat-data.ts` (== scouter's tD/ve/hR; == wiki, with
Normal Damage added from the wiki since scouter has no need for it). HEXA
per-level values reuse `setup/data/hexaStatData.ts` (== scouter's NZ/oF tables).
Class constants: `scouter-class-data.ts` (vendored, GMS region table).
