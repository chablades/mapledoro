# CLAUDE.md

## Project Overview

MapleDoro — free, open-source MapleStory community web app (character tracking, gameplay tools, live event info). All user data lives in localStorage; server-side caching uses Redis. Not affiliated with Nexon.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **Styling:** Inline styles for dynamic theming + global CSS (no Tailwind, no CSS-in-JS)
- **State:** React hooks + Context (theme) + localStorage
- **Server:** Redis (ioredis) char-lookup cache, Nexon CDN patch notes, Discord Sunny Sunday events
- **Linting:** ESLint 9 (eslint-config-next + eslint-plugin-sonarjs)
- **Charts:** `react-chartjs-2` / `chart.js` for standard charts; hand-rolled SVG for small one-offs

## Behavioral Guidelines

**Think first.** State assumptions. Present multiple interpretations rather than silently picking one; flag simpler approaches and push back when warranted.

**Simplicity first.** Minimum code that solves the problem — no speculative features, single-use abstractions, or handling for impossible cases.

**Surgical changes.** Touch only what was asked; match existing style.

## Build & Lint

Both must pass before any implementation is considered complete:

```sh
npm run build
npm run lint
```

### Lint Gotchas

- **`react-hooks/set-state-in-effect`** — No bare `setState()` in `useEffect`. Use lazy `useState` initializers, `useSyncExternalStore`, or `useRef` + DOM mutation.
- **`sonarjs/cognitive-complexity`** — Cap 15. Extract cohesive sub-steps (parser, validator, renderer) or `eslint-disable` if any split would be artificial. Don't micro-shuffle branches.

## React-Doctor Rules

- **Clickable elements:** Prefer a real `<button>` (reset appearance via CSS: `background: none; border: none; padding: 0; font: inherit; text-align: inherit`) — native semantics, focus, and keyboard handling for free. Only fall back to `<div>`/`<span>` with `role="button"`, `tabIndex={0}`, and an `onKeyDown` Enter/Space handler when `<button>` can't work (e.g. nested interactive content).
- **Minimum font size:** 0.75rem (12px). No sub-12px text anywhere.
- **Image error fallbacks:** Use dual-render with refs (`display:none` on fallback, swap via `onError`), not `useState` to toggle. Avoids a re-render on error.
- **No `autoFocus` attribute.** Use a ref callback with a guard: `ref={(el) => { if (el && document.activeElement !== el) el.focus(); }}`.
- **localStorage writes:** Write synchronously inside state updaters, not in a `useEffect` watching state. Keeps the write atomic with the state change.
- **Internal links → `next/link`; images → `next/image`** (never raw `<a>`/`<img>` for these).
- **No unused type exports** — don't `export` types used only in the same file (Knip flags them).
- **Extract large inline `style={{…}}` objects** into named `CSSProperties` vars outside JSX.

## Key Patterns

**Route pages** (`src/app/tools/<name>/page.tsx`) are thin `"use client"` shells wrapping a workspace in `AppShell`.

**Workspace layout:** outer padding `1.5rem 1.5rem 2rem 2.75rem`, inner `maxWidth: 900, margin: "0 auto"`. `<ToolHeader>` first, then panel sections.

**SSR/client gate:** `useSyncExternalStore(() => () => undefined, () => true, () => false)` for localStorage reads.

**Shared tool controls:** Form controls split static settings (in global CSS) from dynamic theme colors (inline). Use `className="tool-input"` (text/number/date), `"tool-select"` (dropdowns), `"tool-field-label"` (uppercase field labels), and `"tool-dialog-btn"` (modal action buttons) for shape; pair with `toolStyles(theme)` (`tool-styles.ts`) which returns **colors only** (`background`/`borderColor`/`color`). Context sizing (widths, compact paddings) stays inline. `Field` (uppercase label + control) lives in `shared-ui.tsx` alongside `Toggle`/`PillGroup`. Don't re-add radius/padding/font to per-tool style helpers — extend the class instead.

**Per-character tool storage:** Per-character tool data (symbols, liberation, hexa skills) is stored in each character's `tools` field within the character store (`mapledoro_characters_store_v1`). Read/write via `characterToolStorage.ts` helpers. Global tool data (dailies, event planner, boss crystals, pitched boss drops, trace restoration) lives in a single `mapledoro_tools_v1` key via `globalToolsStore.ts`.

## Image Policy

Game art comes from the self-hosted **MapleResource API** (`haku.network`), via pure id→URL components in `src/components/ResourceImage.tsx` (`src/lib/mapleResource.ts`): `<ItemIcon>`, `<MobSprite>`, `<SkillIcon>`, `<HexaSkillIcon>`, `<FamiliarSprite>`. Host = `NEXT_PUBLIC_RESOURCE_BASE`; new hosts go in `next.config.mjs` `remotePatterns`.

- **Item icons** default to shadowless `iconRaw.png`; pass `shadow` for framed `icon.png` (inventory only).
- **Boss icons** have no component — use `bossIconUrl(id)` (`ui/boss` URL); stored as `icon` strings in boss data (`bosses.ts`, `liberation-data.ts`, `astra-data.ts`, `trace-restoration-data.ts`).
- **Familiars:** `<FamiliarSprite>` is direct-sprite only; mob/card-backed ones use `<MobSprite>`/`<ItemIcon>` per manifest `spriteFrom`.
- **Finding IDs:** search committed `manifests/v<version>/<type>.json` by `name`, hardcode the id with a name comment. No name→ID map; manifests are dev-only, never bundled (`item.json` ~17 MB).

## Feature Docs

Non-obvious domain rules and invariants live in nested `CLAUDE.md` files under `src/features/`. Consult them when working on a feature.
