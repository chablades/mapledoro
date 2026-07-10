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
