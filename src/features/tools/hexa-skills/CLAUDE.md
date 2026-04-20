# HEXA Skills Tracker

Tracks Sol Erda + Fragment costs for all 47 MapleStory classes.

**Key files:**
- `hexa-classes.ts` — Class/skill definitions. `s(name)` auto-generates icon URL; `si(name, iconName)` overrides icon when wiki name differs.
- `hexa-costs.ts` — Cost tables (ORIGIN, ENHANCEMENT, MASTERY, COMMON).
- `useHexaSkillsState.ts` — State hook with localStorage persistence, cost calculation.
- `hexa-ui.tsx` — Reusable UI primitives (SkillIcon, CostBadge, LevelInput, SkillRow, SkillSection, MasterySection).
- `HexaSkillsWorkspace.tsx` — Page-level composition (SummaryPanel, ClassSelector, main workspace).

**Icon URL pattern:** `https://media.maplestorywiki.net/yetidb/Skill_{name}.png` — apostrophes → `%27`, colons stripped, spaces → `_`. Bracket skills (`[Tian]`, `[Di]`, `[Shinsoku]`) have no CDN icons; use parenthesized icon overrides via `si()` when available, otherwise fall back to letter initial.

## Wiki Data Access

- **CDN images** (`media.maplestorywiki.net/yetidb/Skill_*.png`) — accessible from any client.
- **Wiki HTML pages** (`maplestorywiki.net/w/*`) — return 403 to programmatic clients. Use `curl` with a browser User-Agent:
  ```sh
  curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" "URL"
  ```
