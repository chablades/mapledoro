# Mystic Frontier Solver

Calculator for the Mystic Frontier dice event: a single calculator (no roster /
optimizer / OCR scanner).

## Model

- **Waves:** a character has 3 **waves** (lineup presets), selected via a dropdown next
  to the character picker. Each wave holds its own 3 slots **and** its own target score,
  so up to 9 familiars are saved per character. Bonus items are equipped on the character
  and shared across all waves. The active wave drives all scoring/reroll output.
- **Lineup:** 3 familiar slots per wave. Each slot = a familiar (`familiarId`), a chosen
  **rarity**, **one** Mystic Frontier potential line, and a rolled **die** value. MF
  familiars get a single MF potential — separate from the two regular potential lines
  in the character setup flow. Rarity is
  independent of the familiar (it's the familiar's grade in your inventory) and sets
  the die size: Common d3, Rare d4, Epic d5, Unique/Legendary d6 (`MF_RARITY_DICE`).
- **Type & element auto-populate** from the picked familiar — never stored, always
  derived via `FAMILIAR_TRAITS[familiarId]` (see `familiars.ts`), so the user never sets
  them by hand.
- **Bonus items:** the equipped dice items (`bonusItemsData.ts`). One color per family
  at most; all selected items apply to every roll.

## Scoring (`calc.ts`)

`finalResult = floor((diceSum + totalFlat) × totalMult)` where **`totalMult` is the
SUM of all active multiplier components** (e.g. `+1.2x` and `+1.4x` → ×2.6 — additive,
not chained). When no multiplier component is active the dice total is used directly
(implicit ×1).

## Potentials (`potentialsData.ts` + `potentialEngine.ts`)

- A potential's **effect is fully determined by its `params`**: `add`/`sub` → flat dice
  total, `mul` → an additive Final Multiplier component. The **condition** is the
  leading clause of the template (everything before the first comma), matched to a
  predicate by a flat matcher table.
- **"+x% chance to roll …" lines are informational** — they change roll *odds*, not the
  score of a fixed roll, so they contribute 0/0 and never appear as active. They're still
  selectable.
- **"Prevents dice from rolling over N"** always applies its multiplier and caps every
  die at N. The cap is computed in the hook and clamps both the stored die values and
  the reroll search range (`globalDiceCap` / `effectiveMaxDie`).
- The potential pool is **rarity-specific**; changing a slot's rarity clears its line.

## Type-label normalization

Manifest familiar types are normalized to Mystic Frontier wording at generation time:
`Fish → Aquatic`, `Nymph → Fairy`, `Machine → Mechanical` (the potential condition text
uses the latter). Elements are unchanged.

## Generated data — regenerating

`familiarTraits.ts`, `potentialsData.ts`, and `bonusItemsData.ts` are generated from
`manifests/v269/{familiar,familiar-potentials,item}.json` (potential ids 110001–153303;
bonus dice item ids 03802169–03802188). Re-derive with a script if the manifest version
changes; do not hand-edit the entry lists.

`MfPotentialDef.rarity` is intentionally typed `string` (not `MfRarity`) and `params` is
an index signature: a literal-union / optional-keys field makes TypeScript keep each of
the ~1.4k array elements as a distinct type and overflow ("union type too complex").
Consumers narrow `rarity` back to `MfRarity`.

## Persistence

**Per-character** (like symbols/liberation/hexa): the full solver state — `waves[]`
(each with its slots and target), shared `bonus` selections, and `activeWave` — is stored
under the `mysticFrontier` key in each character's `tools` field via `characterToolStorage`.
The workspace has a `CharacterSyncPanel`; switching characters saves the outgoing one and
loads the incoming one (initial character comes from `?character=` or the world Main via
`useApplyCharacterQueryParam`). Persistence targets the character held in `selectedCharRef`
(a ref mirror of `selectedCharName`) so writes inside state updaters never hit a stale
character. With no character selected, edits are ephemeral. Legacy pre-wave saves
(`{slots, target}`) are migrated into wave 1 by `parseState`. Derived type/element is
never stored.
