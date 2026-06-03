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
- **Internal links:** Use `next/link` (`<Link>`) instead of `<a>` for internal routes. Enables client-side navigation, prefetching, and scroll preservation.
- **Images:** Use `next/image` (`<Image>`) instead of `<img>`. Provides automatic optimization, lazy loading, and layout shift prevention.
- **No unused type exports:** Don't `export` interfaces/types that are only used within the same file. Knip flags these as dead exports.
- **No exhaustive inline styles:** Extract large `style={{…}}` objects into named `CSSProperties` variables outside JSX. Keeps markup readable and avoids re-creating objects on every render.

## Key Patterns

**Route pages** (`src/app/tools/<name>/page.tsx`) are thin `"use client"` shells wrapping a workspace in `AppShell`.

**Workspace layout:** outer padding `1.5rem 1.5rem 2rem 2.75rem`, inner `maxWidth: 900, margin: "0 auto"`. `<ToolHeader>` first, then panel sections.

**SSR/client gate:** `useSyncExternalStore(() => () => undefined, () => true, () => false)` for localStorage reads.

**Per-character tool storage:** Per-character tool data (symbols, liberation, hexa skills) is stored in each character's `tools` field within the character store (`mapledoro_characters_store_v1`). Read/write via `characterToolStorage.ts` helpers. Global tool data (dailies, event planner, boss crystals, pitched boss drops) lives in a single `mapledoro_tools_v1` key via `globalToolsStore.ts`.

## Image Policy

**Game art (items, mobs, skills, hexa skills, familiars)** comes from the self-hosted **MapleResource API** at `haku.network`, rendered via the resource components in `src/components/ResourceImage.tsx`:

- `<ItemIcon id size shadow? />` · `<MobSprite id size />` · `<SkillIcon id size disabled? />` · `<HexaSkillIcon id size disabled? />` · `<FamiliarSprite id size />`
- Each is a pure **id → URL** builder (`src/lib/mapleResource.ts`). The host is `NEXT_PUBLIC_RESOURCE_BASE` (default `https://haku.network`); add new hosts to `next.config.mjs` `remotePatterns`.

**Item icons:** `<ItemIcon>` defaults to the **shadowless** `iconRaw.png`. The framed `icon.png` (drop shadow) is reserved for inventory management — pass `shadow` for it.

**Finding IDs:** look them up by hand in the committed manifests `manifests/v<version>/<type>.json` (search by `name`), then hardcode the id at the call site with the name in a comment. There is **no** name→ID resolution map — the manifests are a dev-time reference, never bundled (`item.json` is ~17 MB).

**Familiars:** `<FamiliarSprite>` renders the direct familiar sprite only. For mob- or card-backed familiars (manifest `spriteFrom` = `mob` / `null`), use `<MobSprite id={mobId}>` or `<ItemIcon id={cardId}>` per the manifest entry.

**Migration in progress:** `maplestory.io`, `media.maplestorywiki.net`, and `orangemushroom.net` are being replaced by `haku.network` page-by-page. `WikiAttribution` is required only where wiki imagery genuinely remains.

## Feature Docs

Non-obvious domain rules and invariants live in nested `CLAUDE.md` files under `src/features/`. Consult them when working on a feature.
