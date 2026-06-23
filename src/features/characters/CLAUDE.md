# Characters

- Characters are uniquely identified by `characterName` (lowercased as store key)
- **`characterID` (number) is NOT unique** — never use as React key or option value
- Read characters fresh each render (not cached in `useState`) so new additions appear immediately

## Adding a new class

When Nexon ships a new class, characters of that class appear in rankings **immediately on patch day** — if it's not registered here, class detection breaks (no buff guide, no branch filtering, blank class data). Get the exact `jobName` from the live ranking API (`/api/maplestory/no-auth/ranking/v2/na?...&character_name=<ign>`) — it can differ from the display name (e.g. Cannoneer → `"Cannon Master"`). Then:

1. **`setup/data/classSkillData.ts`** — add a `CLASS_SKILL_DATA` entry (`id`, `nexonJobName`, `requiredStats`, optional `fixedGender`/`displayName`/`warnings`/`buffSkills`). This is the keystone: `nexonJobMapping.ts` (`resolveClassId`, display name, gender/marriage overrides) and `classBranch.ts` lookups are all **derived** from it, so this one entry wires up most of the app.
2. **`setup/data/classBranch.ts`** — map `id` → equip branch(es) + per-type weapon/secondary id-prefix tables (verify branch in-game, not from sites — they're sometimes wrong).
3. **`setup/data/buffsData.ts`** — if the class has a unique Echo of Hero / Exclusive Spell icon, add its `jobName` to `HERO_ECHO_SKILL_MAP` (and `heroEchoName` if the in-game name differs).
4. **`tools/hexa-skills/hexa-classes.ts`** — add hexa skill/node data (mastery node count, etc.).
5. **Regenerated data** — class may need inclusion in skill-guesser data and any manifest-derived generators.
