# CLAUDE.md

## Project Overview

MapleDoro — MapleStory community web app (character tracking, gameplay tools, live event info). All user data lives in localStorage; server-side caching uses Redis. Not affiliated with Nexon.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **Styling:** Inline styles for dynamic theming + global CSS (no Tailwind, no CSS-in-JS)
- **State:** React hooks + Context (theme) + localStorage
- **Server:** Redis (ioredis) char-lookup cache, Nexon CDN patch notes, Discord Sunny Sunday events
- **Linting:** ESLint 9 (eslint-config-next + eslint-plugin-sonarjs)
- **Charts:** `react-chartjs-2` / `chart.js` for standard charts; hand-rolled SVG for small one-offs

## Behavioral Guidelines

- **Think first.** State assumptions; surface alternatives instead of silently picking one; push back when warranted.
- **Simplicity first.** Minimum code that solves the problem — no speculative features, single-use abstractions, or impossible-case handling.
- **Surgical changes.** Touch only what was asked; match existing style.

## Changelog

Whenever a change makes a user-facing difference (bug fix, new feature, or behavior change), add a matching entry to the `CHANGELOG` array in `src/app/changelog/page.tsx` as part of the same work. Skip purely internal changes (refactors, tests, tooling, docs) that users would never notice.

- Add changes to the entry for today's date, creating a new entry at the top of the array if one does not exist (newest first).
- Pick the right `type`: `added` for new tools or capabilities, `changed` for tweaks to existing behavior, `fixed` for bug fixes.
- Match the tone and structure of existing entries: one short, plain sentence per change, written for players, naming the tool affected (for example "Fixed the Liberation Tracker wiping saved progress in some cases.").
- Do not use em dashes in entry text.

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

- **Clickable elements:** Prefer a real `<button>` (reset via `background: none; border: none; padding: 0; font: inherit; text-align: inherit`) for free semantics/focus/keyboard. Fall back to `<div>`/`<span>` + `role="button"` + `tabIndex={0}` + Enter/Space `onKeyDown` only when `<button>` can't work (e.g. nested interactive content).
- **Minimum font size:** 0.75rem (12px). No sub-12px text anywhere.
- **Image error fallbacks:** For a static fallback, use dual-render with refs (`display:none` on fallback, swap via `onError`), not `useState` — avoids a re-render on error. State is fine when the fallback needs logic the ref swap can't express (e.g. `CharacterAvatar`'s retry-with-query-param + load-timeout flow).
- **No `autoFocus` attribute.** Use a ref callback that focuses once on mount, guarded by a `useRef` flag: `const hasAutoFocusedRef = useRef(false); ... ref={(el) => { if (el && !hasAutoFocusedRef.current) { hasAutoFocusedRef.current = true; el.focus(); } }}`. Don't guard on `document.activeElement !== el` alone — that re-fires on every render (not just mount) and will steal focus back any time the user has deliberately moved it elsewhere, if anything else causes the component to re-render meanwhile.
- **localStorage writes:** Write synchronously inside state updaters, not in a `useEffect` watching state. Keeps the write atomic with the state change.
- **Internal links → `next/link`. Images → `next/image` with `unoptimized`** for game art (the optimizer wastes transformations and degrades small pixel sprites). Raw `<img>` only when `next/image` can't work (e.g. `CharacterAvatar`'s load-retry), with an `eslint-disable @next/next/no-img-element`.
- **No unused `export`s** — don't `export` a type used only in its own file (react-doctor's Knip check flags them).
- **Extract large inline `style={{…}}` objects** into named `CSSProperties` vars outside JSX.

## Key Patterns

**Route pages** (`src/app/{tools,games}/<name>/page.tsx`) are thin `"use client"` shells wrapping a workspace in `AppShell`.

**Workspace layout:** outer padding `1.5rem 1.5rem 2rem 2.75rem`, inner `maxWidth: 900, margin: "0 auto"`. `<ToolHeader>` first, then panel sections.

**SSR/client gate:** `useMounted()` (`src/lib/useMounted.ts`) for localStorage reads — false during SSR/hydration, true after mount.

**Shared tool controls:** Form controls split shape (global CSS classes) from theme colors (inline). Use `className="tool-input"` (text/number/date), `"tool-select"` (dropdowns), `"tool-field-label"` (uppercase labels), or `"tool-dialog-btn"` (modal buttons) for shape; pair with `toolStyles(theme)` (`tool-styles.ts`), which returns **colors only** (`background`/`borderColor`/`color`). Context sizing (widths, compact paddings) stays inline. `Field`, `Toggle`, and `PillGroup` live in `shared-ui.tsx`. Don't re-add radius/padding/font to the style helpers — extend the class instead.

**Tool storage:** Per-character data (symbols, liberation, hexa skills, exp calculator) lives in each character's `tools` field in the character store (`mapledoro_characters_store_v1`), via `characterToolStorage.ts`. Global data (dailies, event planner, boss crystals, pitched boss drops, trace restoration) lives under one `mapledoro_tools_v1` key, via `globalToolsStore.ts`.

## Image Policy

Game art comes from the self-hosted **MapleResource API** (`haku.network`), via pure id→URL components in `src/components/ResourceImage.tsx` (`src/lib/mapleResource.ts`): `<ItemIcon>`, `<MobSprite>`, `<SkillIcon>`, `<HexaSkillIcon>`, `<ErdaSkillIcon>`, `<FamiliarSprite>`. Host = `NEXT_PUBLIC_RESOURCE_BASE`; new hosts go in `next.config.mjs` `remotePatterns`.

- **Item icons** default to shadowless `iconRaw.png`; pass `shadow` for framed `icon.png` (inventory only).
- **Boss icons** have no component — use `bossIconUrl(id)` (`ui/boss` URL); stored as `icon` strings in boss data (`bosses.ts`, `liberation-data.ts`, `astra-data.ts`, `trace-restoration-data.ts`).
- **Familiars:** `<FamiliarSprite>` is direct-sprite only; mob/card-backed ones use `<MobSprite>`/`<ItemIcon>` per manifest `spriteFrom`.
- **Finding IDs:** search committed `manifests/v<version>/<type>.json` by `name`, hardcode the id with a name comment. No name→ID map; manifests are dev-only, never bundled (`item.json` ~17 MB). The current game version is **v270** — use the `manifests/v270/` manifests when implementing features.

## Feature Docs

Non-obvious domain rules and invariants live in nested `CLAUDE.md` files under `src/features/`. Consult them when working on a feature.
