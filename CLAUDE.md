# CLAUDE.md

## Project Overview

MapleDoro is a free, open-source web app for the MapleStory community. It provides character tracking, gameplay planning tools and live game event info. All data is persisted client-side in localStorage; server-side caching uses Redis when available.

Not affiliated with Nexon. All MapleStory IP belongs to Nexon.

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict mode)
- **Styling:** Inline styles for dynamic theming + global CSS (no Tailwind, no CSS-in-JS library)
- **State:** React hooks + Context (theme) + localStorage persistence
- **Server:** Redis (ioredis) for character lookup caching, Nexon CDN for patch notes, Discord for Sunny Sunday events
- **Linting:** ESLint 10 with eslint-config-next + eslint-plugin-sonarjs

## Directory Structure

```
src/
  app/              # Next.js pages & API routes
    api/            # Server routes (characters/lookup, patch-notes, sunny-sundays)
    characters/     # Character management page
    tools/          # Calculators (boss-crystals, liberation, symbols, hexa-skills) & trackers (pitched-boss-drops)
    guides/         # Placeholder
    settings/       # User preferences & hard reset
  components/       # Reusable UI (AppShell, ThemeContext, themes, nav, ToolHeader, WikiAttribution)
  features/         # Self-contained feature modules
    characters/     # Character lookup, directory, setup wizard, profiles
    tools/          # Boss crystals, liberation, symbols, pitched-boss-drops, hexa-skills
  lib/              # Shared utilities (Discord client, Sunny Sunday parsing)
```

## Build & Lint

Both of the following must pass before any implementation is considered complete:

```sh
npm run build
npm run lint
```

### Lint Gotchas

- **`react-hooks/set-state-in-effect`** — No bare `setState()` calls inside `useEffect`. Use lazy `useState` initializers for localStorage reads, `useSyncExternalStore` for external-store patterns, or `useRef` + direct DOM mutation for timers.
- **`sonarjs/pseudo-random`** — No `Math.random()`. Use `crypto.randomUUID()`.
- **`@next/next/no-img-element`** — External CDN images use `<img>` with `// eslint-disable-next-line @next/next/no-img-element`.

## Component Patterns

### Route Pages (`src/app/tools/<name>/page.tsx`)
Thin shells that wrap a workspace in `AppShell`:
```tsx
"use client";
import AppShell from "../../../components/AppShell";
import FooWorkspace from "../../../features/tools/foo/FooWorkspace";
export default function FooPage() {
  return <AppShell currentPath="/tools">{({ theme }) => <FooWorkspace theme={theme} />}</AppShell>;
}
```

### Workspace Layout
All tool workspaces use this centering pattern:
- Outer: `style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}`
- Inner: `style={{ maxWidth: 900, margin: "0 auto" }}`
- `<ToolHeader>` first, then content in panel sections

### SSR/Client Gate
Use `useSyncExternalStore` to safely gate client-only code (localStorage reads):
```tsx
const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
```

## Character Store API

Located in `src/features/characters/model/charactersStore.ts`:

- `readCharactersStore()` → `CharactersStore` — reads from localStorage
- `selectCharactersList(store)` → `StoredCharacterRecord[]` — ordered list
- Characters are uniquely identified by `characterName` (lowercased as the store key)
- **`characterID` (number) is NOT unique** — never use as React key or option value
- Read characters fresh each render (not cached in `useState`) so new additions appear immediately

## localStorage Keys

| Feature | Key | Notes |
|---------|-----|-------|
| Characters | `mapledoro_characters_store_v1` | Managed by `charactersStore.ts` |
| Symbols (global) | `symbols-v2` | Default when no character selected |
| Symbols (per-char) | `symbols-v2-{characterName}` | When synced to a character |
| Pitched boss drops | `pitched-boss-drops-v1` | |
| HEXA Skills (global) | `hexa-skills-v1` | Default when no character selected |
| HEXA Skills (per-char) | `hexa-skills-v1-{characterName}` | When synced to a character |
| Theme | Managed by `ThemeContext` | |

## Charts

Pure SVG — no external chart libraries. Existing patterns: horizontal bar charts, line charts with `<polyline>` + `<circle>`.

## Image Policy

All images used in the project must be sourced from **maplestorywiki.net**. Any page that displays sourced images must include a visible disclaimer/attribution stating:

> Images sourced from [MapleStory Wiki](https://maplestorywiki.net) and are used under the terms of that site's licensing. All MapleStory assets are the property of Nexon.

Use the existing `WikiAttribution` component (`src/components/WikiAttribution.tsx`) where applicable.

## Wiki Data Access

- **CDN images** (`media.maplestorywiki.net/yetidb/Skill_*.png`) — accessible from any client.
- **Wiki HTML pages** (`maplestorywiki.net/w/*`) — return 403 to programmatic clients. Use `curl` with a browser User-Agent:
  ```sh
  curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" "URL"
  ```

## HEXA Skills Tracker

Located in `src/features/tools/hexa-skills/`. Tracks Sol Erda + Fragment costs for all 47 MapleStory classes.

**Key files:**
- `hexa-classes.ts` — Class/skill definitions. `s(name)` auto-generates icon URL; `si(name, iconName)` overrides icon when wiki name differs.
- `hexa-costs.ts` — Cost tables (ORIGIN, ENHANCEMENT, MASTERY, COMMON).
- `useHexaSkillsState.ts` — State hook with localStorage persistence, cost calculation.
- `hexa-ui.tsx` — Reusable UI primitives (SkillIcon, CostBadge, LevelInput, SkillRow, SkillSection, MasterySection).
- `HexaSkillsWorkspace.tsx` — Page-level composition (SummaryPanel, ClassSelector, main workspace).

**Icon URL pattern:** `https://media.maplestorywiki.net/yetidb/Skill_{name}.png` — apostrophes → `%27`, colons stripped, spaces → `_`. Bracket skills (`[Tian]`, `[Di]`, `[Shinsoku]`) have no CDN icons; use parenthesized icon overrides via `si()` when available, otherwise fall back to letter initial.
