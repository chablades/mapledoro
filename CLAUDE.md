# CLAUDE.md

## Project Overview

MapleDoro — MapleStory community web app (character tracking, gameplay tools, live event info). All user data lives in localStorage; server-side caching uses Redis. Not affiliated with Nexon.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **Styling:** Inline styles for dynamic theming + global CSS (no Tailwind, no CSS-in-JS)
- **State:** React hooks + Context (theme) + localStorage
- **Server:** Redis (ioredis) char-lookup cache, Nexon CDN patch notes, Discord Sunny Sunday + Miracle Time events
- **Linting:** ESLint 9 (eslint-config-next + eslint-plugin-sonarjs)
- **Charts:** `react-chartjs-2` / `chart.js` for standard charts; hand-rolled SVG for small one-offs

## Behavioral Guidelines

- **Think first.** State assumptions; surface alternatives instead of silently picking one; push back when warranted.
- **Simplicity first.** Minimum code that solves the problem — no speculative features, single-use abstractions, or impossible-case handling.
- **Surgical changes.** Touch only what was asked; match existing style.

## Changelog

When a change gives players something new or fixes something broken (bug fix, new tool or capability, meaningful behavior change), add a matching entry to the `CHANGELOG` array in `src/app/changelog/page.tsx` as part of the same work. Skip internal changes (refactors, tests, tooling, docs) and minor polish players wouldn't consciously register: layout or spacing tweaks, reordering inputs, restyling, small copy edits. When in doubt, leave it out.

- Add changes to the entry for today's date, creating a new entry at the top of the array if one does not exist (newest first). The array is long; Read only its head when adding an entry.
- Pick the right `type`: `added` for new tools or capabilities, `changed` for tweaks to existing behavior, `fixed` for bug fixes.
- Match the tone and structure of existing entries: one short, plain sentence per change, written for players, naming the tool affected (for example "Fixed the Liberation Tracker wiping saved progress in some cases.").
- Do not use em dashes in entry text.

## Build & Lint

Both must pass before any implementation is considered complete. Skip `npm run build` for text-only changes (copy/string edits, changelog entries, comments) that touch no JSX structure, types, or logic — `npm run lint` alone covers those. Scope lint to changed files rather than the whole repo, and suppress output on success so a passing run doesn't burn tokens on route tables and file lists — only surface output when a command fails:

```powershell
$out = npm run build 2>&1; if ($LASTEXITCODE -ne 0) { $out }
$out = npx eslint (git diff --name-only --diff-filter=ACM -- '*.ts' '*.tsx') 2>&1; if ($LASTEXITCODE -ne 0) { $out }
```

(bash: same pattern with `out=$(<cmd> 2>&1); [ $? -ne 0 ] && echo "$out"`)

Run the full unscoped `npm run lint` (not just changed files) before treating work as complete if the change touches shared config, a widely-imported helper, or anything else where scoping to the diff could miss a ripple effect.

Same spirit for reads: large data modules (`hexa-classes.ts`, `exp-monsters.ts`, `cubing-data.ts`, mystic-frontier `*Data.ts`, `puzzle-data.generated.ts`) run to hundreds or thousands of lines. Grep for the entries you need instead of Reading them whole.

### Lint Gotchas

- **`react-hooks/set-state-in-effect`** — No bare `setState()` in `useEffect`. Use lazy `useState` initializers, `useSyncExternalStore`, or `useRef` + DOM mutation.
- **`sonarjs/cognitive-complexity`** — Cap 15. Extract cohesive sub-steps (parser, validator, renderer) or `eslint-disable` if any split would be artificial. Don't micro-shuffle branches.

## React-Doctor Rules

- **Clickable elements:** Prefer a real `<button>` (reset via `background: none; border: none; padding: 0; font: inherit; text-align: inherit`) for free semantics/focus/keyboard. Fall back to `<div>`/`<span>` + `role="button"` + `tabIndex={0}` + Enter/Space `onKeyDown` only when `<button>` can't work (e.g. nested interactive content).
- **Minimum font size:** 0.75rem (12px). No sub-12px text anywhere.
- **Image error fallbacks:** For a static fallback, use dual-render with refs (`display:none` on fallback, swap via `onError`), not `useState` — avoids a re-render on error. State is fine when the fallback needs logic the ref swap can't express (e.g. `CharacterAvatar`'s retry-with-query-param + load-timeout flow).
- **No `autoFocus` attribute.** Focus once on mount via a ref callback guarded by a `useRef(false)` flag: `ref={(el) => { if (el && !hasAutoFocusedRef.current) { hasAutoFocusedRef.current = true; el.focus(); } }}`. Don't guard on `document.activeElement` alone: it re-fires on every render and steals back focus the user moved elsewhere.
- **localStorage writes:** Write synchronously inside state updaters, not in a `useEffect` watching state. Keeps the write atomic with the state change.
- **Internal links → `next/link`. Images → `next/image` with `unoptimized`** for game art (the optimizer wastes transformations and degrades small pixel sprites). Raw `<img>` only when `next/image` can't work (e.g. `CharacterAvatar`'s load-retry), with an `eslint-disable @next/next/no-img-element`.
- **No unused `export`s** — don't `export` a type used only in its own file (react-doctor's Knip check flags them).
- **Extract large inline `style={{…}}` objects** into named `CSSProperties` vars outside JSX.

## Key Patterns

**Route pages** (`src/app/{tools,games}/<name>/page.tsx`) are thin `"use client"` shells wrapping a workspace in `AppShell`.

**Workspace layout:** outer padding `1.5rem 1.5rem 2rem 2.75rem`, inner `.tool-container` (`maxWidth: 1020, margin: "0 auto"`). `<ToolHeader>` first, then panel sections.

**SSR/client gate:** `useMounted()` (`src/lib/useMounted.ts`) for localStorage reads — false during SSR/hydration, true after mount.

**Shared tool controls:** Form controls split shape (global CSS classes) from theme colors (inline). Use `className="tool-input"` (text/number/date), `"tool-select"` (dropdowns), `"tool-field-label"` (uppercase labels), or `"tool-dialog-btn"` (modal buttons) for shape; pair with `toolStyles(theme)` (`tool-styles.ts`), which returns **colors only** (`background`/`borderColor`/`color`). Context sizing (widths, compact paddings) stays inline. `Field`, `Toggle`, and `PillGroup` live in `shared-ui.tsx`. Don't re-add radius/padding/font to the style helpers — extend the class instead.

**Tool storage:** Per-character data (symbols, liberation, hexa skills, exp calculator) lives in each character's `tools` field in the character store (`mapledoro_characters_store_v1`), via `characterToolStorage.ts`. Global data (dailies, event planner, boss crystals, pitched boss drops, trace restoration) lives under one `mapledoro_tools_v1` key, via `globalToolsStore.ts`.

## Color & Contrast

Themes live in `src/components/themes.ts`: a `ColorModeBase` (light/dark neutrals) merged with one of 12 `ACCENT_THEMES` by `composeTheme()`. **The palette is tuned to WCAG AA (4.5:1) and must stay there.** Odd-looking hex values are OKLCH contrast fits; don't round them. Full rationale (luminance windows, dead zone) lives in the `themes.ts` comments.

Three accent tokens, each with one job:

| Token | Role | Rule |
|---|---|---|
| `accent` | Fills and borders | **Never a text color** (one hex can't be readable ink in both modes). `color: theme.accent` is always a bug; use `accentText`. |
| `accentText` | Accent-colored *text* | Per color mode; clears 4.5:1 on every surface. |
| `accentOn` | Ink *on top of* an `accent` fill | Derived by `composeTheme`. `color: "#fff"` on an accent fill is a bug; bright accents take dark ink. |

When adding or changing an accent theme, check the new color against every surface in both modes before committing (see the dead-zone note in `themes.ts`).

**Status colors:** `src/components/statusColors.ts` applies the same split to success / danger / info / warning; never hardcode `#10b981`, `#ef4444`, and friends. `STATUS[kind].fill` + `.on` for filled pills/badges; `statusText(theme, kind)` for status-colored *text* on a neutral surface.

Known gaps: `DIFFICULTY_COLORS` / `RESOURCE_TYPE_COLORS` in the character guides still hardcode categorical text colors that fail contrast (they need the `statusText` treatment), and `accent` as a 1px state border misses WCAG 1.4.11's 3:1 in 16 of 24 theme/mode combos (fix: route state borders through `accentText`, a separate ~38-site pass).

## Image Policy

Game art comes from the self-hosted **MapleResource API** (`haku.network`), via pure id→URL components in `src/components/ResourceImage.tsx` (`src/lib/mapleResource.ts`): `<ItemIcon>`, `<MobSprite>`, `<SkillIcon>`, `<HexaSkillIcon>`, `<ErdaSkillIcon>`, `<FamiliarSprite>`. Host = `NEXT_PUBLIC_RESOURCE_BASE`; new hosts go in `next.config.mjs` `remotePatterns`.

- **Item icons** default to shadowless `iconRaw.png`; pass `shadow` for framed `icon.png` (inventory only). Some items (e.g. androids) also have a `revealed` variant (`iconD`/`iconRawD`) for their actual appearance once equipped, vs. the default pre-equip icon (e.g. an android's egg form); check the manifest's `hasIconD`/`hasIconRawD` flags before assuming it exists for a given item.
- **Boss icons** have no component — use `bossIconUrl(id)` (`ui/boss` URL); stored as `icon` strings in boss data (`bosses.ts`, `liberation-data.ts`, `astra-data.ts`, `trace-restoration-data.ts`).
- **Familiars:** `<FamiliarSprite>` is direct-sprite only; mob/card-backed ones use `<MobSprite>`/`<ItemIcon>` per manifest `spriteFrom`.
- **Finding IDs:** Grep committed `manifests/v<version>/<type>.json` by `name` (never Read a manifest whole; `item.json` ~17 MB), hardcode the id with a name comment. No name→ID map; manifests are dev-only, never bundled. The current game version is **v270** — use the `manifests/v270/` manifests when implementing features. Older features whose generated data was built from an earlier manifest (and says so) are correct as-is.

## Feature Docs

Non-obvious domain rules and invariants live in nested `CLAUDE.md` files under `src/features/`. Consult them when working on a feature.
