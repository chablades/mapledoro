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
    tools/          # Calculator tools (boss-crystals, liberation, symbols)
    guides/         # Placeholder
    settings/       # User preferences & hard reset
  components/       # Reusable UI (AppShell, ThemeContext, themes, nav)
  features/         # Self-contained feature modules
    characters/     # Character lookup, directory, setup wizard, profiles
    tools/          # Boss crystals, liberation, symbols calculators
  lib/              # Shared utilities (Discord client, Sunny Sunday parsing)
```

## Build & Lint

Both of the following must pass before any implementation is considered complete:

```sh
npm run build
npm run lint
```

## Image Policy

All images used in the project must be sourced from **maplestorywiki.net**. Any page that displays sourced images must include a visible disclaimer/attribution stating:

> Images sourced from [MapleStory Wiki](https://maplestorywiki.net) and are used under the terms of that site's licensing. All MapleStory assets are the property of Nexon.

Use the existing `WikiAttribution` component (`src/components/WikiAttribution.tsx`) where applicable.
