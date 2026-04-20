# CLAUDE.md

## Project Overview

MapleDoro is a free, open-source web app for the MapleStory community. It provides character tracking, gameplay planning tools and live game event info. All data is persisted client-side in localStorage; server-side caching uses Redis when available.

Not affiliated with Nexon. All MapleStory IP belongs to Nexon.

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict mode)
- **Styling:** Inline styles for dynamic theming + global CSS (no Tailwind, no CSS-in-JS library)
- **State:** React hooks + Context (theme) + localStorage persistence
- **Server:** Redis (ioredis) for character lookup caching, Nexon CDN for patch notes, Discord for Sunny Sunday events
- **Linting:** ESLint 9 with eslint-config-next + eslint-plugin-sonarjs

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
  features/         # Self-contained feature modules (see nested CLAUDE.md files)
    characters/     # Character lookup, directory, setup wizard, profiles
    tools/          # Boss crystals, liberation, symbols, pitched-boss-drops, hexa-skills
  lib/              # Shared utilities (Discord client, Sunny Sunday parsing)
```

Feature-specific guidance lives in nested `CLAUDE.md` files (e.g. `src/features/characters/CLAUDE.md`, `src/features/tools/hexa-skills/CLAUDE.md`).

## Build & Lint

Both of the following must pass before any implementation is considered complete:

```sh
npm run build
npm run lint
```

### Lint Gotchas

- **`react-hooks/set-state-in-effect`** — No bare `setState()` calls inside `useEffect`. Use lazy `useState` initializers for localStorage reads, `useSyncExternalStore` for external-store patterns, or `useRef` + direct DOM mutation for timers.
- **`sonarjs/pseudo-random`** — No `Math.random()`. Use `crypto.randomUUID()`.
- **`sonarjs/cognitive-complexity`** — Function bodies cap at 15 (sonarjs default). Don't chase the score with micro-extractions that just shuffle branches into tiny one-call helpers — extract cohesive sub-steps (a parser, a validator, a renderer) that stand on their own.
- **`@next/next/no-img-element`** — Disabled project-wide (images come from third-party CDNs — `next/image` optimization isn't worth the config/billing overhead). Use native `<img>` directly.

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

## localStorage Keys

| Feature | Key | Notes |
|---------|-----|-------|
| Characters store | `mapledoro_characters_store_v1` | Managed by `charactersStore.ts` |
| Character lookup cache | `mapledoro_character_cache_v1` | Browser-side lookup result cache |
| Character setup draft | `mapledoro_character_setup_draft_v1:{characterKey}` | Per-character setup-wizard draft |
| Directory world filter | `mapledoro_directory_world_filter` | |
| Patch notes cache | `mapledoro_patch_notes_v1` | Home-page patch notes |
| Theme | `mapledoro-theme-key` | Managed by `usePersistedThemeKey` |
| Boss Crystals | `boss-crystals-v2` | Global (single list of characters) |
| Event Planner | `event-planner-v1` | Global (entries carry `characterName`) |
| Liberation (global) | `liberation-v1` | Default when no character selected |
| Liberation (per-char) | `liberation-v1-{characterName}` | When synced to a character |
| Symbols (global) | `symbols-v2` | Default when no character selected |
| Symbols (per-char) | `symbols-v2-{characterName}` | When synced to a character |
| HEXA Skills (global) | `hexa-skills-v1` | Default when no character selected |
| HEXA Skills (per-char) | `hexa-skills-v1-{characterName}` | When synced to a character |
| Pitched boss drops | `pitched-boss-drops-v1` | Event log, not per-character toggle |

## Charts

Use `react-chartjs-2` / `chart.js` for line, bar, and other standard chart types (see `features/tools/pitched-boss-drops` and `features/tools/symbols` for setup patterns — register only the scales/elements you use). Hand-rolled SVG (`<polyline>` + `<circle>`, horizontal bar rects) is fine for small one-off visualizations where pulling in chart.js would be overkill.

## Image Policy

All images must be sourced from **maplestorywiki.net**. Any page that displays sourced images must include the `WikiAttribution` component (`src/components/WikiAttribution.tsx`).
