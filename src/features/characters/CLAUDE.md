# Characters

- Characters are uniquely identified by `characterName` (lowercased as store key)
- **`characterID` (number) is NOT unique** — never use as React key or option value
- Read characters fresh each render (not cached in `useState`) so new additions appear immediately

## Adding a new class

When Nexon ships a new class, characters of that class appear in rankings **immediately on patch day** — if it's not registered here, class detection breaks (no buff guide, no branch filtering, blank class data). Get the exact `jobName` from the live ranking API (`/api/maplestory/no-auth/ranking/v2/na?...&character_name=<ign>`) — it can differ from the display name (e.g. Cannoneer, jobName `"Cannon Master"`). Double-check against a real character, some classes have a distinct legacy jobName too (a pre-revamp string still returned by dormant, never-renamed characters), which is easy to mix up with the live one: Cannoneer's live jobName is `"Cannon Master"`, while `"Cannoneer"` is actually the legacy one. Then:

1. **`setup/data/classSkillData.ts`** — add a `CLASS_SKILL_DATA` entry (`id`, `nexonJobName`, `requiredStats`, optional `fixedGender`/`displayName`/`warnings`/`buffSkills`). This is the keystone: `nexonJobMapping.ts` (`resolveClassId`, display name, gender/marriage overrides) and `classBranch.ts` lookups are all **derived** from it, so this one entry wires up most of the app.
2. **`setup/data/classBranch.ts`** — map `id` → equip branch(es) + per-type weapon/secondary id-prefix tables (verify branch in-game, not from sites — they're sometimes wrong).
3. **`setup/data/buffsData.ts`** — if the class has a unique Echo of Hero / Exclusive Spell icon, add its `jobName` to `HERO_ECHO_SKILL_MAP` (and `heroEchoName` if the in-game name differs).
4. **`tools/hexa-skills/hexa-classes.ts`** — add hexa skill/node data (mastery node count, etc.).
5. **Regenerated data** — class may need inclusion in skill-guesser data and any manifest-derived generators.
6. **Character slot cap** — Nexon generally adds +1 to the max characters per world with each new class. Bump both `MAX_ACCOUNT_CHARACTERS` (`tabs/CharacterSetupFlow.tsx`) and `IP_REQUESTS_PER_DAY_LIMIT`'s fallback (`src/app/api/characters/lookup/route.ts`) together, confirming the new number in-game first.
7. **Mastery%/Final Damage baseline** (`scripts/gen-stat-baselines.mjs`, feeding `setup/data/masteryData.ts`/`finalDamageData.ts`) — a new class needs its Weapon Mastery% and Final Damage% baseline established: find its always-on skills in `manifests/v<version>/skill-formulas.json` (the reliable signal is whether the skill's own tooltip contains a "Passive Effect(s)" marker — not the manifest's `alwaysOn`/`flaggedForReview` flags alone, both have known false-negative gaps), pin each skill's id + expected value into `FINAL_DAMAGE_RECIPES`/`MASTERY_SKILL_RECIPES`, add the class's inherent base Mastery% to `MASTERY_BASE_PERCENT`, then run the script and confirm the output against a real character's unbuffed level-30 in-game reading before trusting it — the generator only checks its own arithmetic, not whether a skill was really always-on.
   - **Mastery's inherent base defaults to 20%** per strategywiki's own Formulas page ("beginners equivalent will have a mastery of 20%") — a reasonable starting assumption for a new class, but real classes vary (Bishop/Arch Mage/Blaze Wizard/Battle Mage/Lynn/Kanna/Sia Astelle: 25%; most archers/gunners/pirates: 15%) and Grandis Library's own numbers have had real transcription errors before. Verify in-game rather than assuming 20% is right.
   - **Mastery is capped at 99% game-wide** (`MASTERY_CAP` in the generator) — if base + skill% would exceed that, the real in-game reading is 99, not the raw sum (this is how Hayato's 20+80=100 became a documented 99, not a class-specific quirk).

## Class revamps

A substantial kit rework on an *existing* class isn't covered by the new-class checklist above, but can just as easily go stale:
- **Manifest version first** — confirm `scripts/gen-vmatrix.mjs` and `scripts/gen-stat-baselines.mjs` (and any other `scripts/gen-*`/`generate-*` script you run) actually default to the current version named in the root `CLAUDE.md`. A stale default reads the old manifest with no error or warning — it just silently evaluates against pre-revamp data, so a "looks clean" regen proves nothing until this is confirmed.
- **Mastery%/Final Damage baseline** (`scripts/gen-stat-baselines.mjs`) — a revamp can rename/renumber the skill ids pinned in `FINAL_DAMAGE_RECIPES`/`MASTERY_SKILL_RECIPES`; the generator throws a build-time error naming the class/skill/id if a pinned formula no longer evaluates to its last-known value, which is the concrete signal to re-derive that class's ids against a real post-revamp character. Don't assume the old numbers still hold. If the manifest tags more than one skill "Mastery" for the class, only the single highest-tier one is real — stacking Mastery-type skills don't add in MapleStory, the higher tier supersedes the lower rather than stacking with it (same reason every recipe in this file is one skill per class, never a sum).
- **V Matrix** (`scripts/gen-vmatrix.mjs`, hardcoded per-class node exclusions in `EXCLUDED_NODE_IDS`) — a revamp can swap *which* manifest-listed job nodes are the real ones (same candidate id set, different 4 actually in-game) rather than renumbering them outright. The 4-job/6-boost guard only catches a count mismatch, not a same-count swap — re-derive the real job node ids from a post-revamp character rather than trusting a passing guard alone.
- **`tools/hexa-skills/hexa-classes.ts`** — a HEXA mastery/enhancement node's id can stay the same across a revamp while the skill(s) it represents change entirely (an enhancement node enhances whichever job skill currently occupies that slot; a mastery composite node shows whichever skills the manifest currently pairs at that id). Check display names against the current manifest even when the ids look untouched — a matching id doesn't mean matching content.
- **V Matrix node icons** — a node's haku-hosted icon can go stale even after its id/name/data are all correctly updated in code: the node id is a fixed slot, and a revamp can change what art belongs there, but the WZ dump feeding haku needs a fresh capture for that same id to pick it up. Icons are a pure source-asset lookup (`resourceImageUrl("v-matrix", id, ...)`, no per-id override anywhere in code) — a wrong icon post-revamp needs a re-dump + haku replacement (same fix as any other wrong-icon case), not an app-side change.
- **`buffsData.ts`** (`HERO_ECHO_SKILL_MAP`) — if the class's Echo of Hero/Exclusive Spell skill changes.

## Level / legacy gating

Several features are unavailable below a level threshold, or for legacy (pre-revamp, no 5th job)
classes. `flows.ts`'s `isStepSkippedForLevel` is the source of truth for which *setup steps* get
skipped — but **profile bookmarks render independently of the step registry and must re-check
eligibility themselves**, since nothing wires a bookmark's render path to the step registry's
skip logic. Check this table before adding or reworking a bookmark:

| Feature | Unlocks at | Legacy classes | Setup source | Bookmark check |
|---|---|---|---|---|
| Hyper Stat | Lv 140 | n/a | `isHyperStatEligible` (`statsStepDraft.ts`) | Stats bookmark's sub-view switcher |
| Arcane Symbols/Force | Lv 200 | excluded | `isArcaneEligible` (`statsStepDraft.ts`) | `SymbolLevelsDisplay`/`SymbolAreaGroup` (per-area `locked`, blanket legacy message) |
| V Matrix | Lv 200 | excluded | `isStepSkippedForLevel` (`flows.ts`) | `VMatrixBookmark`'s `resolveVMatrixNotice` |
| Genesis Liberation | Lv 255 | n/a | `GENESIS_LIBERATION_LEVEL` (`statsStepDraft.ts`) | — |
| Sacred Symbols/Power | Lv 260 | excluded | `isSacredEligible` (`statsStepDraft.ts`) | `SymbolLevelsDisplay`/`SymbolAreaGroup` |
| HEXA Matrix | Lv 260 | excluded | `isStepSkippedForLevel` (`flows.ts`) | `HexaMatrixBookmark`'s `resolveHexaNotice` |

Legacy-class exclusion for V Matrix/HEXA is `isLegacyClass(jobName)` (reads `ClassSkillData.isLegacy`
in `classSkillData.ts`) — the same field `flows.ts` gates on. Use this directly for any legacy-class
check rather than re-deriving it from other `ClassSkillData` fields.
