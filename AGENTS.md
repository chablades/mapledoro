# CLAUDE.md

## Project Overview

MapleDoro — MapleStory community web app (character tracking, gameplay tools, live event info). All user data lives in localStorage; server-side caching uses Redis. Not affiliated with Nexon.

## Tech Stack

**Next.js 16** (App Router, typed routes), **React 19**, **TypeScript** (strict). Styling is inline styles for dynamic theming plus global CSS (no Tailwind, no CSS-in-JS). State is hooks + Context (theme) + localStorage. Server side: Redis (ioredis) char-lookup cache, Nexon CDN patch notes, Discord Sunny Sunday + Miracle Time. Lint is ESLint 9 (eslint-config-next + eslint-plugin-sonarjs). Charts use `react-chartjs-2` / `chart.js`, with hand-rolled SVG for small one-offs.

## Behavioral Guidelines

- **Think first.** State assumptions; surface alternatives instead of silently picking one; push back when warranted.
- **Simplicity first.** Minimum code that solves the problem — no speculative features, single-use abstractions, or impossible-case handling.
- **Surgical changes.** Touch only what was asked; match existing style.

## Changelog

Player-visible changes (new tool or capability, bug fix, meaningful behavior change) get an entry in the `CHANGELOG` array in `src/app/changelog/page.tsx`, as part of the same work. Skip internal work (refactors, tests, tooling, docs) and polish players wouldn't notice (spacing, restyling, small copy edits). When in doubt, leave it out.

- Add to today's entry, creating one at the top if absent (newest first). The array is long; Read only its head.
- `type`: `added` (new tool/capability), `changed` (tweak to existing behavior), `fixed` (bug fix).
- One short plain sentence per change, written for players, naming the tool: "Fixed the Liberation Tracker wiping saved progress in some cases."
- No em dashes.

## Build & Lint

Both must pass before work is complete. Skip `npm run build` for text-only changes (copy, changelog, comments) touching no JSX, types, or logic. Scope lint to changed files, surfacing output only on failure:

```powershell
$out = npm run build 2>&1; if ($LASTEXITCODE -ne 0) { $out }
$out = npx eslint (git diff --name-only --diff-filter=ACM -- '*.ts' '*.tsx') 2>&1; if ($LASTEXITCODE -ne 0) { $out }
```

(bash: `out=$(<cmd> 2>&1); [ $? -ne 0 ] && echo "$out"`)

Run the full `npm run lint` when the change touches shared config or a widely-imported helper, where scoping to the diff could miss a ripple effect.

### Context Discipline

Tool output stays in context for every later request, so one careless command inflates the whole session.

- **Never Read whole** — grep for the entries you need: mystic-frontier `*Data.ts` and `familiarTraits.ts`, `hexa-fd-data.generated.ts`, `hexa-classes.ts`, `cubing-data.ts`, `exp-calculator-data.ts`, `exp-monsters.ts`, `puzzle-data.generated.ts`, and anything under `manifests/`. Each runs from thousands of lines to tens of MB.
- **Anchor greps to a specific name**, never a family. Bash truncates long output *silently*, so a wide pattern returns a confidently incomplete answer rather than an error.
- Prefer targeted `offset`/`limit` Reads once you know where you're going.

### Lint Gotchas

- **`react-hooks/set-state-in-effect`** — No bare `setState()` in `useEffect`. Use lazy `useState` initializers, `useSyncExternalStore`, or `useRef` + DOM mutation.
- **`sonarjs/cognitive-complexity`** — Cap 15. Extract cohesive sub-steps (parser, validator, renderer) or `eslint-disable` if any split would be artificial. Don't micro-shuffle branches.

## React-Doctor Rules

- **Clickable elements:** prefer a real `<button>` (reset via `background: none; border: none; padding: 0; font: inherit; text-align: inherit`). Use `role="button"` + `tabIndex={0}` + Enter/Space `onKeyDown` only when `<button>` can't work (e.g. nested interactive content).
- **Minimum font size 0.75rem (12px).**
- **Image error fallbacks:** dual-render with refs (`display:none` on the fallback, swap via `onError`), not `useState`, which costs a re-render. State is fine when the fallback needs logic refs can't express (`CharacterAvatar`'s retry + load-timeout flow).
- **No `autoFocus`.** Focus once on mount via a ref callback guarded by a `useRef(false)` flag. Don't guard on `document.activeElement` alone: it re-fires every render and steals back focus the user moved.
- **localStorage writes go inside state updaters**, not a `useEffect` watching state, so the write stays atomic with the state change.
- **Internal links → `next/link`; images → `next/image` with `unoptimized`** for game art (the optimizer wastes transformations and degrades small pixel sprites). Raw `<img>` only when `next/image` can't work, with an `eslint-disable @next/next/no-img-element`.
- **No unused `export`s** — don't `export` a type used only in its own file (Knip flags them).
- **Extract large inline `style={{…}}` objects** into named `CSSProperties` vars outside JSX.

## Key Patterns

**Route pages** (`src/app/{tools,games}/<name>/page.tsx`) are thin `"use client"` shells wrapping a workspace in `AppShell`.

**Typed routes** are on, so every link-registry `href` is `Route` from `next`, not `string` (`nav-links.ts`, `quickTools.ts`, `AppShell`'s `FOOTER_LINKS`, the tools/games/guides card arrays). Renaming a route directory fails the build until all are updated; only the route portion is checked, so template-literal hrefs work.

**Workspace layout:** outer padding `1.5rem 1.5rem 2rem 2.75rem`, inner `.tool-container` (`maxWidth: 1020, margin: "0 auto"`). `<ToolHeader>` first, then panel sections.

**SSR/client gate:** `useMounted()` (`src/lib/useMounted.ts`) for localStorage reads — false during SSR/hydration, true after mount.

**Shared tool controls** split shape (global CSS classes) from theme colors (inline). Use `className="tool-input"` (text/number/date), `"tool-select"`, `"tool-field-label"`, or `"tool-dialog-btn"`; pair with `toolStyles(theme)` (`tool-styles.ts`), which returns **colors only**. Don't re-add radius/padding/font to the style helpers — extend the class. `Field`, `Toggle`, `PillGroup`, `ToolNumberInput`, `ActionButton`, and `PanelDivider` live in `shared-ui.tsx`. Prefer `ToolNumberInput` to a raw `type="number"`: its draft state keeps half-typed values (`0.`) that a number input reports as empty. Raw inputs are right only where an empty or out-of-range value is meaningful (star force trial count, cubing's validation error).

**Shared tool modules** (`src/features/tools/`): `usePerCharacterToolState.ts` (per-character load/save, character list, `?character=` seed), `useLazyChart.ts` (defers chart.js to first chart render), `date.ts` (`formatLongDate`/`formatShortDate`/`utcDateStr`/`localDateStr`), `useCardReorder.ts` (drag hook plus `moveInArray`).

**Tool storage:** four localStorage keys, one owner module each. Per-character tool data (symbols, liberation, astra, hexa skills, mystic frontier, exp calculator) lives in each character's `tools` field in `mapledoro_characters_store_v1` via `characterToolStorage.ts`; global tools (dailies, event planner, boss crystals, trace restoration) in `mapledoro_tools_v1` via `globalToolsStore.ts`; game results (Mapledle, BGM Guesser) in `mapledoro_games_v1`, one section per game, via `gamesStore.ts`'s `readGameSection`/`writeGameSection` (game modules never touch the key directly); the Drop Tracker in its own `mapledoro_drop_tracker_v1` (uncapped event log, deliberately out of the shared blob).

## Color & Contrast

Themes live in `src/components/themes.ts` (12 accent themes x light/dark, composed by `composeTheme()`). **The palette is tuned to WCAG AA (4.5:1) and must stay there.** Odd-looking hex values are OKLCH contrast fits; don't round them. The `accent` / `accentText` / `accentOn` split is documented at the definition site in `themes.ts` — read those doc comments before using an accent as ink. Status colors work the same way through `src/components/statusColors.ts`; never hardcode `#10b981`, `#ef4444`, and friends.

## Image Policy

Game art comes from the self-hosted **MapleResource API** (`haku.network`), via pure id→URL components in `src/components/ResourceImage.tsx` (`src/lib/mapleResource.ts`): `<ItemIcon>`, `<MobSprite>`, `<SkillIcon>`, `<HexaSkillIcon>`, `<ErdaSkillIcon>`, `<MarkIcon>` (`ui-mark`, for BGM Guesser's answer icons). Host = `NEXT_PUBLIC_RESOURCE_BASE`; new hosts go in `next.config.mjs` `remotePatterns`.

- **Item icons** default to shadowless `iconRaw.png`; pass `shadow` for framed `icon.png` (inventory only). Some items (androids) have a `revealed` variant (`iconD`/`iconRawD`) showing the equipped appearance instead of the pre-equip icon; check the manifest's `hasIconD`/`hasIconRawD` before assuming it exists.
- **Boss icons** have no component — use `bossIconUrl(id)` (`ui/boss` URL); stored as `icon` strings in boss data (`bosses.ts`, `liberation-data.ts`, `astra-data.ts`, `trace-restoration-data.ts`).
- **Familiars:** no shared direct-sprite component; each feature composes its own (e.g. Characters' `FamiliarCardSprite` does a sequential mob→familiar→card fallback via `onError`). Mob/card-backed ones use `<MobSprite>`/`<ItemIcon>` per manifest `spriteFrom`.
- **Finding IDs:** grep `manifests/v270/<type>.json` for the exact `name` (see Context Discipline), then hardcode the id with a name comment. There is no name→ID map; manifests are dev-only and never bundled. Current game version is **v270**. Older features whose generated data was built from an earlier manifest (and says so) are correct as-is.

## Generated Data

`public/data/`, `*.generated.ts`, and `*Data.ts` files come from `scripts/`, and a stale one serves pre-patch content without erroring. Read `scripts/CLAUDE.md` before bumping the game version or re-running any generator or scraper.

## Feature Docs

Non-obvious domain rules and invariants live in nested `CLAUDE.md` files under `src/features/`. Consult them when working on a feature.
