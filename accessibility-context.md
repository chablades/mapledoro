# MapleDoro — context for designing an accessibility settings panel

Context only. Nothing here is a proposal. Repo is Next.js 16 (App Router, typed
routes), React 19, TypeScript strict. No Tailwind, no CSS-in-JS. All user data is
localStorage; server-side caching is Redis.

---

## 1. Theming system

### How themes are defined and stored

Colors are **not** CSS variables and **not** Tailwind. A theme is a plain
TypeScript object passed through React context and applied as **inline styles**.

`src/components/themes.ts` (~238 lines) defines a flat token bag:

```ts
export interface AppTheme {
  name: string; emoji: string;
  colorMode: ColorMode;              // "light" | "dark"
  bg: string; panel: string; border: string; text: string; muted: string;
  /** Brand color. A fill and border color only — never a text color. */
  accent: string;
  accentSoft: string;
  /** Accent-colored *text*, tuned per color mode. */
  accentText: string;
  /** Text/icon color that sits on top of an `accent` fill. Derived, never authored. */
  accentOn: string;
  sidebar: string; sidebarAccent: string;
  timerBg: string; badge: string; badgeText: string;
}
```

A theme is composed at render time from two independent axes:

```ts
export function composeTheme(accentKey: string, colorMode: ColorMode): AppTheme {
  const accent = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES["default"];
  const base = COLOR_MODE_BASES[colorMode];
  const modeAccent = accent[colorMode];
  return {
    name: accent.name, emoji: accent.emoji, colorMode, ...base,
    accent: accent.accent,
    accentSoft: modeAccent.accentSoft,
    accentText: modeAccent.accentText,
    accentOn: inkOn(accent.accent),
    sidebarAccent: accent.accent,
  };
}
```

`LIGHT_BASE` / `DARK_BASE` supply the neutral surfaces. The accent supplies
`accent`, plus a per-mode `accentSoft` and `accentText`. `accentOn` is derived by
relative luminance:

```ts
export function inkOn(fill: string): string {
  const whiteContrast = 1.05 / (relativeLuminance(fill) + 0.05);
  return whiteContrast >= 4.5 ? "#ffffff" : ACCENT_INK;
}
```

### What themes exist

12 accent themes × 2 color modes = 24 combinations. Accent keys in
`ACCENT_THEMES`:

`aranya`, `momijigaoka`, `default`, `ludibrium`, `juno`, `sleepywood`,
`onyxapple`, `arcaneriver`, `cha`, `esfera`, `elluel`, `yuki`.

Accent is a **site-wide user preference**, not per-class. Class pages do not
inject their own accent. Class-specific color appears only as data-driven values
(`DIFFICULTY_COLORS`, `RESOURCE_TYPE_COLORS`), never as a theme override.

### The contrast contract (important, and documented at the definition site)

The palette is tuned to WCAG AA 4.5:1 and the hex values are OKLCH contrast fits.
The header comment above `ACCENT_THEMES` states the constraint directly:

> Every `accentText` here clears 4.5:1 against its own `accentSoft` and against
> every surface in its color mode (bg, panel, timerBg, sidebar). Values were slid
> in OKLCH (hue and chroma preserved, lightness adjusted) until they fit; don't
> round them to cleaner hex. `accent` is exempt: it is a fill, and `accentOn`
> supplies the ink that sits on it. `accent` can never itself be readable text in
> both modes: a fill white text can sit on needs relative luminance <= 0.183,
> while readable text on #101014 needs >= 0.199, and the windows don't overlap.

There is also a documented luminance dead zone (~0.183–0.218) where neither white
nor dark ink clears 4.5:1 on the fill.

### Status colors

`src/components/statusColors.ts` mirrors the same fill/ink split:

```ts
export type StatusKind = "success" | "danger" | "info" | "warning" | "critical" | "severe";
export const STATUS: Record<StatusKind, { fill: string; on: string }> = { ... };
/** Status-colored *text* on a neutral surface, per color mode — like `accentText`. */
export function statusText(theme: AppTheme, kind): string;
```

`success → danger → critical → severe` is an escalating severity ladder (6 steps
exist because Boss Clear needs them). Keys are named for meaning, not hue.
Hardcoding `#10b981` / `#ef4444` and friends is explicitly disallowed.

### How a component consumes tokens

Either `useTheme()`, or a `theme` prop drilled from `AppShell`'s render prop:

```tsx
<AppShell currentPath="/guides">{({ theme }) => <NewPlayerGuide theme={theme} />}</AppShell>
```

The governing convention is **shape in global CSS classes, color inline**:

```tsx
<nav className="guide-toc" style={{ background: theme.panel, border: `1px solid ${theme.border}` }}>
```

Shared control classes are `tool-input`, `tool-select`, `tool-field-label`,
`tool-dialog-btn`, paired with `toolStyles(theme)` in
`src/features/tools/tool-styles.ts`, which returns **colors only**.

The only CSS custom properties in the app are the two font variables. There are
no color custom properties to override.

Helper for translucency: `alpha(color, opacity)` returns a `color-mix(in srgb, …)`
string rather than appending alpha hex digits.

---

## 2. Settings infrastructure

### The route

`/settings` exists at `src/app/settings/page.tsx` (~786 lines). Sections, in order:

| Section | Control | Notes |
|---|---|---|
| Appearance | `SegmentedToggle` light/dark | same setting as the sun/moon in the top nav |
| Theme | custom dropdown of the 12 accents | swatch + name per row |
| Google Drive backup | connect / back up / restore / disconnect | optional, hidden app folder |
| Data management | export JSON, import JSON, reset all | import writes localStorage then reloads |

There is currently **no non-appearance preference of any kind** in this panel, so
there is no existing precedent for storing something like a motion or contrast
preference.

### How preferences persist

Theme preferences are the only ones that write **both localStorage and a cookie**.

| Key | Storage | Owner |
|---|---|---|
| `mapledoro-color-mode` | localStorage + cookie | `src/components/usePersistedColorMode.ts` |
| `mapledoro-theme-key` | localStorage + cookie | `src/components/usePersistedThemeKey.ts` |

Both hooks use `useSyncExternalStore` with a server snapshot, plus cross-tab sync
via the `storage` event and a custom broadcast event:

```ts
const colorMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

const setColorMode = (next: ColorMode) => {
  const mode = VALID_MODES.has(next) ? next : initialMode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    writeCookie(mode);                                  // path=/; max-age=31536000; samesite=lax
    window.dispatchEvent(new Event(BROADCAST_EVENT));
  } catch { /* Ignore storage access issues. */ }
};
```

All other user data is localStorage-only across four keys, one owner module each:
`mapledoro_characters_store_v1` (per-character tool data), `mapledoro_tools_v1`
(global tools), `mapledoro_games_v1`, `mapledoro_drop_tracker_v1`.

### FOUC / hydration handling

This is the reason the cookie exists alongside localStorage. `src/app/layout.tsx`
reads the cookie **server-side** and paints the correct background in the initial
HTML:

```tsx
const cookieStore = await cookies();
const cookieColorMode = cookieStore.get("mapledoro-color-mode")?.value;
const initialColorMode: ColorMode =
  cookieColorMode === "light" || cookieColorMode === "dark" ? cookieColorMode : "light";
const initialBg = composeTheme(initialThemeKey, initialColorMode).bg;

return (
  <html lang="en" className={`${nunito.variable} ${fredoka.variable}`}
        style={{ background: initialBg, colorScheme: initialColorMode }}>
```

`colorScheme` is set so native widget chrome (date picker icon, scrollbars,
`<select>` menus) paints the right way. `ThemeProvider` keeps both in sync after
changes:

```tsx
useEffect(() => {
  document.documentElement.style.background = theme.bg;
  document.documentElement.style.colorScheme = theme.colorMode;
}, [theme.bg, theme.colorMode]);
```

For anything read from localStorage rather than a cookie, the SSR gate is
`useMounted()` in `src/lib/useMounted.ts` — `false` on the server and during
hydration, `true` after mount.

---

## 3. Typography

### Font stack

`next/font/google` in `src/app/layout.tsx`:

- **Nunito** → `--font-body`, weights 400 / 600 / 700 / 800, `display: "swap"`
- **Fredoka** → `--font-heading`, weight 700, `display: "swap"`

Both are attached as classes on `<html>`. These two are the only CSS custom
properties in the codebase.

### Units

There is **no `html { font-size: … }` declaration anywhere**, so the root stays at
the browser default and rem already tracks the user's browser font-size setting.

| Where | rem | px |
|---|---|---|
| Inline `fontSize` in `.tsx` | ~778 | 57 |
| `font-size` in `globals.css` | 32 | 1 |

The single px rule in `globals.css` is deliberate, preventing iOS zoom-on-focus:

```css
@media (max-width: 560px) {
  .searchable-select-input, .tool-input, .tool-select { font-size: 16px; }
}
```

Project rule is a 0.75rem (12px) floor, and nothing in the repo goes below it.

### Would root font-size scaling reflow the layouts safely?

Type would scale. **Containers would not.** The layout is px-pinned in several
places, so text grows inside fixed-width boxes.

Dashboard, defined in a `<style>` block inside `src/features/home/HomeDashboard.tsx`:

```css
.dashboard-layout      { max-width: 1560px; display: flex; gap: 1.25rem; align-items: flex-start; }
.dashboard-sidebar-left  { width: 320px; flex-shrink: 0; position: sticky; top: 72px; }
.dashboard-main          { flex: 1; min-width: 0; max-width: 900px; }
.dashboard-sidebar-right { width: 300px; flex-shrink: 0; position: sticky; top: 72px; }

@media (max-width: 1200px) {
  .dashboard-layout { flex-direction: column; align-items: center; gap: 0; }
  .dashboard-sidebar-left, .dashboard-sidebar-right, .dashboard-main { display: contents; }
  .dash-sec { width: 100%; max-width: 900px; margin-bottom: 1.25rem; }
}
```

Other px pins:

- `.tool-card-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }` (`globals.css`)
- `.guide-layout { grid-template-columns: 236px minmax(0, 1fr); }` (`globals.css`)
- `.tool-container` `maxWidth: 1020`, the standard workspace wrapper
- `.page-shell { padding-top: 56px; }` clearing the fixed top nav
- `.guide-toc { top: 72px; }` and `.guide-section { scroll-margin-top: 72px; }`
- Every game-art icon takes a required numeric `size` prop in px

All breakpoints are px, so they will not trip earlier as text grows. The 320px and
300px sidebars are the tightest constraint: their contents are rem-sized, so they
are where large-text reflow would bite first, and the single-column collapse only
happens at ≤1200px viewport width regardless of text size.

---

## 4. Class guide page structure

### Routes and files

- Index: `src/app/guides/character-guides/page.tsx`
- Detail: `src/app/guides/character-guides/[className]/page.tsx` (~668 lines)
- Data: `classData.ts`, `hexaData.ts`, `classResources.ts` in the same directory

### Component breakdown of the detail page

| Component | Role |
|---|---|
| `ClassGuideContent` | hero portrait, summary, link skill, legion; owns page state |
| `InfographicPanel` | collapsible, server toggle (GMS/other), external infographic image |
| `HexaGuidePanel` | collapsible, HEXA progression per server |
| `ResourcesPanel` | external links, typed and color-coded |

Style helpers are functions returning `CSSProperties` (`heroPortraitStyle`,
`collapsibleButtonStyle`, `wipPlaceholderStyle`, `serverToggleStyle`,
`resourceLinkStyle`, `attributionStyle`), all taking `theme`.

`ClassEntry` in `classData.ts` carries: `name`, `region`, `classType`, `summary`,
`difficulty`, `link`, `legion`, `portrait`, `slug`.

### Skill icons — not maplestory.io

One correction worth carrying into your design work: this app does **not** use
maplestory.io. There are zero references to it. Game art comes from a self-hosted
**MapleResource API** at `haku.network`, base URL `NEXT_PUBLIC_RESOURCE_BASE`.

`src/components/ResourceImage.tsx` holds pure id→URL components: `ItemIcon`,
`MobSprite`, `SkillIcon`, `HexaSkillIcon`, `ErdaSkillIcon`, `MarkIcon`. They all
funnel into one wrapper over `next/image`:

```tsx
function ResourceImage({ src, size, alt = "", style, className }) {
  return (
    <Image src={src} alt={alt} width={size} height={size} unoptimized
           className={className} style={{ objectFit: "contain", flexShrink: 0, ...style }} />
  );
}
```

Three things follow from that signature:

1. **`alt` defaults to `""`.** Icons are decorative by default. Of ~20
   `SkillIcon` / `HexaSkillIcon` / `ErdaSkillIcon` usages, about 5 pass an `alt`.
2. **The prevailing pattern is decorative icon plus adjacent visible text**, which
   is why the empty alt is mostly correct rather than a bug. Example from
   `StatOptimizerWorkspace.tsx`:
   ```tsx
   <HexaSkillIcon id={HEXA_NODE_ICON_IDS[index]} size={26} disabled={!core.unlocked} />
   {CORE_LABELS[index]}
   ```
3. **`size` is a required number in px**, so icons do not scale with root font-size.

Disabled state is a **different image file**, not a CSS filter:

```tsx
export function SkillIcon({ id, disabled = false, ...rest }) {
  return <ResourceImage src={resourceImageUrl("skill", id, disabled ? "iconDisabled.png" : "icon.png")} {...rest} />;
}
```

Boss icons have no component; `bossIconUrl(id)` is used directly and stored as
`icon` strings in boss data.

### Where color carries meaning

| Place | File | Is there a text equivalent? |
|---|---|---|
| Resource link type | `[className]/page.tsx` `RESOURCE_TYPE_COLORS` | Yes — `RESOURCE_TYPE_LABELS` maps the same keys to "Discord", "Guide", "Wiki", "Infographic", "Link" |
| Class difficulty | `classData.ts` `DIFFICULTY_COLORS` | Yes — the colored text *is* the difficulty word |
| Boss Clear tier | `BossClearGrid.tsx` `chipTagColor`, `bossClearFormula.ts` `ClearColorTier` | Weakest case. A 6-step severity ladder rendered as chip colors; the strongest candidate for color-alone meaning in the app |
| Chart series | `src/components/chartColors.ts` `chartSeriesColor(theme, key)` | Depends on the chart's legend |
| Class picker tags | `new-players/ClassPicker.tsx` `TagChip` | Yes — status color plus a visible label and an `sr-only` category prefix |

Disabled/locked skill nodes are conveyed by the sprite swap described above, so
they are not color-alone in the CSS sense, but they carry no text or ARIA state
either.

---

## 5. Existing accessibility

### What is already there

**Landmarks and skip link** — `src/components/AppShell.tsx` renders a skip link,
`<main id="main-content">`, `<footer>`, and `<nav>`. The skip link is offscreen
until focused:

```css
.skip-link       { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.skip-link:focus { position: fixed !important; left: 0 !important; top: 0 !important; z-index: 30; }
```

**Modals** — `src/components/ModalShell.tsx` uses a native `<dialog>` opened with
`showModal()`, so focus trapping, Escape, and inert-behind come for free. It
deliberately focuses the dialog element itself so the ring does not land on the
first button as if the user had tabbed there.

**Focus rings** — there is no `outline: none` anywhere in `globals.css`, so
browser default rings survive. `.btn-reset` resets background, border, padding,
font, color, and text-align, but not outline. Explicit rings exist for form
controls only:

```css
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid; outline-offset: 2px;
}
.searchable-select-trigger:focus-within { outline: 2px solid; outline-offset: 2px; }
```

(`outline: 2px solid` with no color resolves to `currentColor`.)

**prefers-reduced-motion** — one global rule plus three feature-local blocks and
one JS check:

```css
@media (prefers-reduced-motion: reduce) { .fade-in { animation: none; } }
```

Also in `CharacterSetupFlow.styles.ts`, `LegionPanel.tsx`,
`MysticFrontierWorkspace.tsx`, and read imperatively in the new player guide's
`scrollToSection` before choosing smooth vs auto scrolling.

**ARIA usage across `src/`** (approximate match counts):

| Attribute | Count |
|---|---|
| `aria-label` | 160 |
| `aria-hidden` | 58 |
| `role=` | 56 |
| `aria-pressed` | 30 |
| `aria-expanded` | 13 |
| `sr-only` | 20 |
| `aria-current` | 5 |
| `aria-labelledby` | 2 |
| `aria-describedby` | 2 |
| `aria-live` | 1 |

`SegmentedToggle` is the good pattern to copy — it wraps in `role="group"` with an
`aria-label`, and each option carries `aria-pressed` and `aria-controls`.

**Other** — palette tuned to AA with reasoning at the definition sites; 0.75rem
font floor; `color-scheme` on `<html>`; iOS zoom prevention at ≤560px; project
conventions in `CLAUDE.md` under "React-Doctor Rules" (prefer a real `<button>`,
no `autoFocus`, focus once on mount via a ref callback guarded by a `useRef` flag).

### Known gaps

- **No `prefers-contrast` and no `forced-colors` handling.** Zero matches in the
  entire repo. Windows High Contrast Mode is unaddressed, and inline-style colors
  are the hardest thing to override in forced-colors mode.
- **No stored motion preference.** Reduced motion is media-query only. A user who
  wants reduced motion without an OS-level setting has no path, and there is no
  precedent in the settings store for a non-theme appearance preference.
- **One `aria-live` region in the whole app**, and it is the Doro speech bubble on
  the home hero. Async results elsewhere (character lookup, import status, Drive
  sync, chart reloads) are not announced.
- **The settings page itself has exactly one ARIA attribute**, `aria-label="Import
  data file"` on the file input. The accent theme dropdown is a custom
  button-plus-div with click-outside and Escape handling but no `aria-expanded`,
  no `role="listbox"`, and no roving focus.
- **`alt=""` by default on all game art.** Correct where a visible label sits
  beside the icon, which is the common pattern, but not universal.
- **Focus rings are only defined for form controls.** Buttons fall back to UA
  defaults, which vary by browser and can be low-contrast on accent fills.
- **Charts have no text alternative.** `react-chartjs-2` canvases carry no
  description or data table fallback.
- **Layout px-pinning** described in section 3 limits reflow under browser zoom or
  large-text settings, particularly the 320px and 300px dashboard sidebars.
- Only 2 `aria-labelledby` and 2 `aria-describedby`, so dialogs and grouped
  controls lean almost entirely on `aria-label` strings.
