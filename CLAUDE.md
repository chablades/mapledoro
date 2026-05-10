# CLAUDE.md

## Project Overview

MapleDoro — free, open-source MapleStory community web app (character tracking, gameplay tools, live event info). All user data lives in localStorage; server-side caching uses Redis. Not affiliated with Nexon.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **Styling:** Inline styles for dynamic theming + global CSS (no Tailwind, no CSS-in-JS)
- **State:** React hooks + Context (theme) + localStorage
- **Server:** Redis (ioredis) for character lookup caching, Nexon CDN for patch notes, Discord for Sunny Sunday events
- **Linting:** ESLint 9 (eslint-config-next + eslint-plugin-sonarjs)
- **Charts:** `react-chartjs-2` / `chart.js` for standard charts; hand-rolled SVG for small one-offs

## Behavioral Guidelines

**Think before coding.** State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so. Push back when warranted.

**Simplicity first.** Minimum code that solves the problem. No speculative features, abstractions for single-use code, or error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

**Surgical changes.** Touch only what was asked. Don't "improve" adjacent code or formatting. Match existing style. Remove imports/variables YOUR changes made unused; don't remove pre-existing dead code unless asked. Every changed line should trace to the request.

## Build & Lint

Both must pass before any implementation is considered complete:

```sh
npm run build
npm run lint
```

### Lint Gotchas

- **`react-hooks/set-state-in-effect`** — No bare `setState()` in `useEffect`. Use lazy `useState` initializers, `useSyncExternalStore`, or `useRef` + DOM mutation.
- **`sonarjs/pseudo-random`** — Use `crypto.randomUUID()`, not `Math.random()`.
- **`sonarjs/cognitive-complexity`** — Cap 15. Extract cohesive sub-steps (parser, validator, renderer) or `eslint-disable` if any split would be artificial. Don't micro-shuffle branches.

## React-Doctor Rules

- **Accessibility on clickable non-buttons:** Any `<div>` or `<span>` with `onClick` needs `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler for Enter/Space.
- **Minimum font size:** 0.75rem (12px). No sub-12px text anywhere.
- **Progress bar animation:** Use `transform: scaleX()` + `transformOrigin: left`, not `width`, for fill animations (GPU-composited, no layout thrash).
- **Image error fallbacks:** Use dual-render with refs (`display:none` on fallback, swap via `onError`), not `useState` to toggle. Avoids a re-render on error.
- **No `autoFocus` attribute.** Use a ref callback with a guard: `ref={(el) => { if (el && document.activeElement !== el) el.focus(); }}`.
- **localStorage writes:** Write synchronously inside state updaters, not in a `useEffect` watching state. Keeps the write atomic with the state change.

## Key Patterns

**Route pages** (`src/app/tools/<name>/page.tsx`) are thin `"use client"` shells wrapping a workspace in `AppShell`.

**Workspace layout:** outer padding `1.5rem 1.5rem 2rem 2.75rem`, inner `maxWidth: 900, margin: "0 auto"`. `<ToolHeader>` first, then panel sections.

**SSR/client gate:** `useSyncExternalStore(() => () => undefined, () => true, () => false)` for localStorage reads.

**Per-character tool storage:** Per-character tool data (symbols, liberation, hexa skills) is stored in each character's `tools` field within the character store (`mapledoro_characters_store_v1`). Read/write via `characterToolStorage.ts` helpers. Global tool data (dailies, event planner, boss crystals, pitched boss drops) lives in a single `mapledoro_tools_v1` key via `globalToolsStore.ts`.

## Image Policy

All images sourced from **maplestorywiki.net**. Pages with sourced images must include `WikiAttribution`.

## Feature Docs

Non-obvious domain rules and invariants live in nested `CLAUDE.md` files under `src/features/`. Consult them when working on a feature.
