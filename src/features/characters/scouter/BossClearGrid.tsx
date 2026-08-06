"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { bossDifficultyIconUrl, bossSplashUrl } from "../../../lib/mapleResource";
import { searchAndRank } from "../../../lib/searchMatch";
import { useKeyboardListNav } from "../../../lib/useKeyboardListNav";
import { useScrollEdges, edgeFadeMask } from "../../../lib/useScrollEdges";
import HoverTooltip from "../../../components/HoverTooltip";
import { PillGroup } from "../../tools/shared-ui";
import { usePickerCoords } from "../setup/hooks/usePickerCoords";
import { DropdownChevron, NavChevron } from "../DropdownChevron";
import InfoTooltip, { type TooltipContent } from "../setup/components/InfoTooltip";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { secondaryButtonStyle } from "../tabs/components/uiStyles";
import { BOSSCUT_DATA, BOSSCUT_SCRAPED_AT, type BossCutEntry } from "./bosscut-data.generated";
import { BOSS_DISPLAY_NAME, groupByBoss, type BossEntryList } from "./bossGrouping";
import { computeBossClear, type BossClearResult, type ClearColorTier } from "./bossClearFormula";
import { formatFigure } from "./scouterFormat";
import type { ScouterResultEntry } from "./scouterCache";

// Icon ids hand-looked-up from manifests/v270/ui-boss.json (renamed from boss.json as of v269
// -- see root CLAUDE.md "Image Policy"), cross-checked against the same bosses already mapped in
// liberation-data.ts and trace-restoration-data.ts.
const BOSS_ICON_ID: Record<string, string> = {
  스우: "13", 데미안: "15", 루시드: "19", 윌: "23", 더스크: "26", "진 힐라": "24",
  듄켈: "27", "검은 마법사": "25", 세렌: "28", 칼로스: "30", 대적자: "35", 흉성: "37",
  카링: "31", 림보: "33", 발드릭스: "34", 유피테르: "38", 가엔슬: "29", 카이: "36",
};

const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Normal: 1, Hard: 2, Chaos: 3, Extreme: 4, Destiny: 5, Champion: 6 };

// Tag order matches the severity ladder in bossClearFormula.ts's TAG_COLOR (best to worst),
// so this list stays a direct reading aid for the pill colors on every chip/tile.
const QUICK_VIEW_INFO_CONTENT: TooltipContent = {
  title: "How to read this",
  description: (
    <>
      <p style={{ margin: "0 0 0.3rem" }}>
        The % shows how much of the boss&apos;s HP you can deal within the fight&apos;s time
        limit:
      </p>
      <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.1rem" }}>
        <li>90-129%: theoretically possible</li>
        <li>130%+: comfortable</li>
      </ul>
      <p style={{ margin: 0 }}>
        &quot;Min&quot; means the bare minimum to pass, not a comfortable clear. Solo Min is
        barely soloable, and a Min Cut tag (1p/2p/3p...) shows the smallest party size that can
        just barely clear it.
      </p>
    </>
  ),
};

const BOSS_THRESHOLD_INFO_CONTENT: TooltipContent = {
  title: "Boss thresholds",
  description: "Boss Clear thresholds from MapleScouter, informally curated by a small group of experienced players rather than measured across the whole playerbase.",
};

// MapleScouter's own "relevant" filter, ported verbatim (confirmed by clicking their own
// "View my (relevant) boss standards" toggle live) -- hides a difficulty tile once the
// character has wildly outgrown it (>10x, or >10x/partyLimit for a party-only boss) or
// genuinely can't touch it yet (<0.15x, or <0.85x/partyLimit).
function isRelevant(clearRate: number, isPartyBoss: boolean, partyLimit: number): boolean {
  const outgrown = isPartyBoss ? clearRate / partyLimit > 10 : clearRate > 10;
  if (outgrown) return false;
  const tooWeak = isPartyBoss ? clearRate < 0.85 / partyLimit : clearRate < 0.15;
  return !tooWeak;
}

type PillStatus = "success" | "info" | "danger" | "critical" | "severe" | null;

// Maps mapledoro's 6-tier severity ladder onto real STATUS tones, best to worst: green (Easy) ->
// success, blue (Possible) -> info, red (Solo Min, right at the pass/fail edge) -> danger, orange
// (Party-able) -> critical, purple (Party Min, most desperate) -> severe, gray (impossible/can't
// enter) -> no status color, a neutral pill instead.
function pillStatus(colorTier: ClearColorTier): PillStatus {
  if (colorTier === "green") return "success";
  if (colorTier === "blue") return "info";
  if (colorTier === "red") return "danger";
  if (colorTier === "orange") return "critical";
  if (colorTier === "purple") return "severe";
  return null;
}

// Dual-render with refs (display:none on the fallback, swap via onError) rather than useState,
// per root CLAUDE.md's React-Doctor Rules -- same pattern for every boss sprite here (row
// difficulty chips, spotlight tile icons). Covers both a real load failure AND a boss with no
// confirmed icon id at all (src undefined) by simply never mounting the Image in the latter case.
function FallbackSpriteIcon({ theme, src, size, displayName }: {
  theme: AppTheme; src: string | undefined; size: number; displayName: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const fallbackStyle: CSSProperties = {
    width: size, height: size, borderRadius: 6, background: theme.accentSoft,
    display: src ? "none" : "flex", alignItems: "center", justifyContent: "center",
    fontSize: Math.max(12, size * 0.35), fontWeight: 800, color: theme.accentText, flexShrink: 0,
  };
  return (
    <>
      {src && (
        <div ref={wrapperRef} style={{ width: size, height: size, flexShrink: 0 }}>
          <Image
            src={src}
            alt=""
            width={size}
            height={size}
            unoptimized
            onError={() => {
              if (wrapperRef.current) wrapperRef.current.style.display = "none";
              if (fallbackRef.current) fallbackRef.current.style.display = "flex";
            }}
            style={{ borderRadius: 6, objectFit: "cover", display: "block" }}
          />
        </div>
      )}
      <div ref={fallbackRef} style={fallbackStyle}>{displayName.charAt(0)}</div>
    </>
  );
}

const BANNER_WIDTH = 180;
const BANNER_HEIGHT = 64;
// Vertical anchor for the wide banner crop of mob.png (a tall splash) -- 20% lands roughly on
// a character's head/shoulders for the 2 splashes checked so far (Malefic Star, First
// Adversary). Not verified across the full roster yet.
const DEFAULT_ART_POSITION = "50% 20%";
// Per-boss override, keyed the same as BOSS_ICON_ID -- framing varies enough per splash that a
// single default crop misses most faces entirely. Hand-tuned by eyeballing every boss's real
// mob.png (in the WZ image dump's ui/boss/<id>/mob.png) and picking the vertical anchor (as %
// of the source image's height) that lands on the character's face/eyes against the actual
// wide (180x64) banner crop -- Gloom has no face (an inanimate seal), positioned on the
// portal's glowing center instead.
const BOSS_ART_POSITION: Record<string, string> = {
  스우: "50% 25%", 데미안: "42% 50%", 루시드: "50% 43%", 윌: "68% 61%", 더스크: "50% 53%",
  "진 힐라": "50% 23%", 듄켈: "48% 46%", "검은 마법사": "42% 19%", 세렌: "50% 33%",
  칼로스: "55% 60%", 대적자: "75% 29%", 흉성: "50% 26%", 카링: "50% 26%", 림보: "50% 58%",
  발드릭스: "50% 40%", 유피테르: "48% 25%", 가엔슬: "50% 51%", 카이: "50% 28%",
};

// Spotlight's own crop anchors -- deliberately separate from BOSS_ART_POSITION above, which was
// hand-tuned for Quick View's tiny wide 180x64 banner crop, not Spotlight's much taller/wider
// SPOTLIGHT_HEIGHT-tall card. Left empty (falls back to DEFAULT_ART_POSITION for every boss)
// until it gets its own eyeball pass against Spotlight's real aspect ratio -- BOSS_ART_POSITION's
// values don't transfer, so a wrong per-boss override is worse than a plain, honest default.
const SPOTLIGHT_ART_POSITION: Record<string, string> = {};

function bannerMaskStyle(): CSSProperties {
  return {
    position: "absolute", inset: 0,
    maskImage: "linear-gradient(to right, black 55%, transparent 100%)",
    WebkitMaskImage: "linear-gradient(to right, black 55%, transparent 100%)",
  };
}

const bannerScrimStyle: CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 55%, transparent 80%)",
};

const bannerNameStyle: CSSProperties = {
  position: "absolute", left: 8, bottom: 6, fontSize: 12, fontWeight: 800, color: "#fff",
  textShadow: "0 1px 3px rgba(0,0,0,0.8)", maxWidth: BANNER_WIDTH - 16, whiteSpace: "nowrap",
  overflow: "hidden", textOverflow: "ellipsis",
};

// The Quick View row's "extended" boss art -- a wide slice of mob.png, faded to transparent on
// its right edge (bannerMaskStyle) instead of hard-cropped, so it blends into the row's own
// background rather than reading as an obviously-cropped rectangle. Same dual-render-with-refs
// fallback shape as FallbackSpriteIcon, just sized for a banner instead of a small icon.
function BossBanner({ theme, boss, iconId, displayName }: {
  theme: AppTheme; boss: string; iconId: string | undefined; displayName: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const artPosition = BOSS_ART_POSITION[boss] ?? DEFAULT_ART_POSITION;
  const containerStyle: CSSProperties = {
    position: "relative", width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 10,
    overflow: "hidden", flexShrink: 0, background: theme.bg,
  };
  const fallbackStyle: CSSProperties = {
    position: "absolute", inset: 0, display: iconId ? "none" : "flex",
    alignItems: "center", justifyContent: "center", background: theme.accentSoft,
  };
  return (
    <div style={containerStyle}>
      {iconId && (
        <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }}>
          <div style={bannerMaskStyle()}>
            <Image
              src={bossSplashUrl(iconId)}
              alt=""
              fill
              unoptimized
              sizes={`${BANNER_WIDTH}px`}
              onError={() => {
                if (wrapperRef.current) wrapperRef.current.style.display = "none";
                if (fallbackRef.current) fallbackRef.current.style.display = "flex";
              }}
              style={{ objectFit: "cover", objectPosition: artPosition }}
            />
          </div>
          <div style={bannerScrimStyle} />
          <span style={bannerNameStyle}>{displayName}</span>
        </div>
      )}
      <div ref={fallbackRef} style={fallbackStyle}>
        <span style={{ fontSize: 13, fontWeight: 800, color: theme.accentText }}>{displayName}</span>
      </div>
    </div>
  );
}

// flexWrap so the chip column drops to its own full-width line below the banner once the row
// gets too narrow for both side by side (mobile) -- see the chip container's own flex-basis
// below, which is what actually triggers that wrap.
function rowStyle(isLast: boolean, theme: AppTheme): CSSProperties {
  return {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, width: "100%",
    padding: "8px 4px", borderBottom: isLast ? "none" : `1px solid ${theme.border}`,
  };
}

// Reset to look like the plain banner wrapper it replaces -- only the banner itself opens
// Spotlight now (used to be the whole row, which made every difficulty chip's own hover
// tooltip fight the row's click target, so the click target was scoped down).
const bannerButtonStyle: CSSProperties = {
  background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", flexShrink: 0,
  borderRadius: 10, transition: "transform 0.1s ease",
};

type BossFilter = "relevant" | "all";
const BOSS_FILTER_OPTIONS: { value: BossFilter; label: string }[] = [
  { value: "relevant", label: "Relevant" },
  { value: "all", label: "All" },
];

/** One boss+difficulty tile's computed result, or null if computeBossClear couldn't produce one
 *  (missing formula fields) -- filtered out before rendering either view. */
function relevantTiles(entries: BossCutEntry[], level: number, arcaneForce: number, authenticForce: number, inputs: NonNullable<ScouterResultEntry["bossClearInputs"]>, filter: BossFilter) {
  const sorted = [...entries].sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99));
  return sorted.reduce<{ entry: BossCutEntry; result: BossClearResult }[]>((tiles, entry) => {
    const result = computeBossClear(entry, level, arcaneForce, authenticForce, inputs);
    if (result && (filter === "all" || isRelevant(result.clearRate, result.isPartyBoss, result.partyLimit))) {
      tiles.push({ entry, result });
    }
    return tiles;
  }, []);
}

// Status-colored TEXT on a neutral card (statusText), not a filled/saturated pill.
function chipTagColor(theme: AppTheme, status: PillStatus): string {
  if (status === "success") return statusText(theme, "success");
  if (status === "info") return statusText(theme, "info");
  if (status === "danger") return statusText(theme, "danger");
  if (status === "critical") return statusText(theme, "critical");
  if (status === "severe") return statusText(theme, "severe");
  return theme.muted;
}

// Sectioned, left-aligned tooltip content -- the default hover-tip-bubble CSS centers short
// one-line labels, which reads fine for those but turns a multi-row breakdown into an
// unscannable wall of centered text. Overrides text-align via HoverTooltip's style prop.
// Difficulty/clear% are deliberately left out: both are already visible on the chip being
// hovered, so repeating them here was just noise.
function chipTooltipDividerStyle(theme: AppTheme): CSSProperties {
  return { borderTop: `1px solid ${theme.border}`, margin: "4px 0" };
}
function ChipTooltipContent({ theme, difficulty, result }: { theme: AppTheme; difficulty: string; result: BossClearResult }) {
  const { combinedLossPercent, lines: losses } = lossBreakdown(result);
  return (
    <div style={{ minWidth: 168, textAlign: "left" }}>
      <div style={{ fontWeight: 800 }}>{difficulty}</div>
      <div style={chipTooltipDividerStyle(theme)} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: theme.muted }}>Adjusted HEXA Stat</span>
        <span>{formatFigure(result.bossStat)}</span>
      </div>
      <div style={chipTooltipDividerStyle(theme)} />
      {combinedLossPercent > 0 && (
        <div style={{ color: statusText(theme, "warning"), fontWeight: 800 }}>{combinedLossPercent}% FD Loss</div>
      )}
      {losses.map((line) => (
        <div key={line.label} style={{ marginTop: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: line.lossPercent === null ? theme.muted : theme.text }}>{line.label}</span>
            {line.lossPercent !== null && <span style={{ color: statusText(theme, "warning") }}>-{line.lossPercent}%</span>}
          </div>
          <div style={{ color: theme.muted, fontWeight: 500 }}>Boss {line.bossValue} · You {line.yourValue}</div>
        </div>
      ))}
    </div>
  );
}

// Tag + % both visible without hovering -- MapleScouter users expect both at a glance -- hover
// expands into the adjusted stat + damage-loss factor that used to be Spotlight-only. A small
// neutral card (icon + stacked text) instead of the old saturated pill.
function DifficultyChip({ theme, iconId, displayName, entry, result }: {
  theme: AppTheme; iconId: string | undefined; displayName: string; entry: BossCutEntry; result: BossClearResult;
}) {
  const tagColor = chipTagColor(theme, pillStatus(result.colorTier));
  return (
    <HoverTooltip
      theme={theme}
      label={<ChipTooltipContent theme={theme} difficulty={entry.difficulty} result={result} />}
    >
      {/* Fixed width so every chip lines up evenly instead of sizing to its own tag text.
          118px is measured, not guessed: "Party-able"/"Impossible" (the longest tags in
          bossClearFormula.ts's tier tables) are 70px of text at this 12px font (React-Doctor's
          sub-12px-text rule floor, not a design choice), +28 icon +6 gap +12 padding +2 border
          = 118px exact fit. Don't shrink further without re-measuring. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 118, padding: "4px 8px 4px 4px", borderRadius: 10, background: theme.bg, border: `1px solid ${theme.border}`, boxSizing: "border-box" }}>
        <FallbackSpriteIcon theme={theme} src={iconId ? bossDifficultyIconUrl(iconId, entry.difficulty) : undefined} size={28} displayName={displayName} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: tagColor }}>
            {result.tagEnglish}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted }}>{result.clearRatePercent.toFixed(2)}%</span>
        </div>
      </div>
    </HoverTooltip>
  );
}

function BossQuickViewRow({
  theme, boss, entries, level, arcaneForce, authenticForce, inputs, filter, isLast, onSelect,
}: {
  theme: AppTheme; boss: string; entries: BossCutEntry[]; level: number; arcaneForce: number;
  authenticForce: number; inputs: NonNullable<ScouterResultEntry["bossClearInputs"]>;
  filter: BossFilter; isLast: boolean; onSelect: (boss: string) => void;
}) {
  const tiles = relevantTiles(entries, level, arcaneForce, authenticForce, inputs, filter);
  if (tiles.length === 0) return null;

  const iconId = BOSS_ICON_ID[boss];
  const displayName = BOSS_DISPLAY_NAME[boss] ?? boss;

  return (
    <div className="boss-quick-row" style={rowStyle(isLast, theme)}>
      <button
        type="button"
        aria-label={`View ${displayName} in Spotlight`}
        onClick={() => onSelect(boss)}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
        style={bannerButtonStyle}
      >
        <BossBanner theme={theme} boss={boss} iconId={iconId} displayName={displayName} />
      </button>
      <div className="boss-quick-chip-grid" style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: "1 1 200px", minWidth: 0 }}>
        {tiles.map(({ entry, result }) => (
          <DifficultyChip key={entry.difficulty} theme={theme} iconId={iconId} displayName={displayName} entry={entry} result={result} />
        ))}
      </div>
    </div>
  );
}

function PowerStripItem({ theme, label, value, sub }: { theme: AppTheme; label: string; value: number; sub?: number }) {
  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: theme.text, fontFamily: "var(--font-heading)" }}>{formatFigure(value)}</span>
    </div>
  );
  if (sub === undefined) return content;
  return <HoverTooltip theme={theme} label={`Normal: ${formatFigure(sub)}`}>{content}</HoverTooltip>;
}

// The old ScouterSummaryView's 3 StatBlocks, collapsed into one compact strip that sits above
// the boss table instead of behind a separate page -- these are the raw power figures that feed
// every row below it, so they read as this view's header now instead of an unrelated sibling.
function PowerStrip({ theme, entry }: { theme: AppTheme; entry: ScouterResultEntry }) {
  return (
    <div className="power-strip" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12 }}>
      {/* Grid, not flex-wrap: Converted's long value skews flex column widths. 4 columns on
          desktop, 2 on narrow panels (.power-strip-grid's container query in styles.ts). */}
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted }}>Boss 300 / 380 / Converted shown as HEXA</span>
      <div className="power-strip-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <PowerStripItem theme={theme} label="Boss 300" value={entry.boss300Hexa} sub={entry.boss300Normal} />
        <PowerStripItem theme={theme} label="Boss 380" value={entry.boss380Hexa} sub={entry.boss380Normal} />
        <PowerStripItem theme={theme} label="Converted" value={entry.convertedPowerHexa} sub={entry.convertedPowerNormal} />
        <PowerStripItem theme={theme} label="Dojo" value={entry.dojoPower} />
      </div>
    </div>
  );
}

const BOSS_PICKER_WIDTH = 220;

// Matches the search-input/option-list visual convention used by the setup flow's own pickers
// (e.g. FamiliarsSetupStep.tsx's LinePicker) -- those constants are file-local there too (no
// shared export exists for them), so this is its own copy, not a duplicate import.
const bossPickerSearchInputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 6, fontFamily: "inherit",
  fontSize: "0.78rem", fontWeight: 600, padding: "0.3rem 0.5rem", outline: "none", border: "1px solid",
};
const bossPickerPopoverStyle: CSSProperties = { borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.28)", overflow: "hidden" };
function bossOptionStyle(theme: AppTheme, isHighlighted: boolean): CSSProperties {
  return {
    display: "block", width: "100%", padding: "0.3rem 0.5rem",
    background: isHighlighted ? `${theme.accent}22` : "transparent",
    border: "none", borderBottom: `1px solid ${theme.border}`,
    cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
    color: theme.text, textAlign: "left",
  };
}

/** Searchable replacement for the old plain <select> -- lets a player type a boss name instead
 *  of scrolling a long native dropdown (~15-17 bosses). Reuses the same shared pieces as the
 *  setup flow's own search pickers (usePickerCoords for portal positioning, useKeyboardListNav
 *  for arrow/Enter/Escape, searchAndRank for fuzzy-ish ranked matching) rather than a plain
 *  <select>, but is its own standalone open/close (no cross-field openId chaining -- there's
 *  only one picker here, not a group of them like a familiar's Line 1/Line 2). */
function BossPicker({ theme, grouped, onSelectBoss }: {
  theme: AppTheme; grouped: BossEntryList[]; onSelectBoss: (boss: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, BOSS_PICKER_WIDTH);
  const options = grouped.map(([boss]) => ({ boss, label: BOSS_DISPLAY_NAME[boss] ?? boss }));
  const filtered = query ? searchAndRank(options, query, (o) => o.label) : options;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointer = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && portalRef.current && !portalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [isOpen, wrapperRef, portalRef]);

  function select(boss: string) {
    setIsOpen(false);
    onSelectBoss(boss);
  }

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (o) => select(o.boss),
    onClose: () => setIsOpen(false),
  });

  const triggerStyle: CSSProperties = {
    width: "100%", maxWidth: 180, boxSizing: "border-box", borderRadius: 8, fontFamily: "inherit",
    fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.6rem", border: `1px solid ${theme.border}`,
    background: theme.bg, color: theme.muted, textAlign: "left", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem",
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="tap-target-44"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Jump to boss"
        onClick={() => {
          if (!isOpen) setQuery("");
          setIsOpen((v) => !v);
        }}
        style={triggerStyle}
      >
        Jump to boss
        <DropdownChevron open={isOpen} />
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ ...bossPickerPopoverStyle, position: "absolute", top: 0, left: 0, width: BOSS_PICKER_WIDTH, zIndex: 310, background: theme.panel, border: `1px solid ${theme.accent}` }}
        >
          <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search bosses"
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={navKeyDown}
              style={{ ...bossPickerSearchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.map((o, i) => (
              <button
                key={o.boss}
                ref={itemRef(i)}
                type="button"
                onClick={() => select(o.boss)}
                style={bossOptionStyle(theme, i === highlightedIndex)}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                No results
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// Drops the row list's height cap/scroll/fade so every boss renders and the page grows instead
// -- lets someone screenshot the whole list in one shot to share (e.g. "can I see your scouter"),
// which the normal capped+scrollable list can't do without stitching two screenshots together.
// State lives here, not lifted to BossClearGrid, specifically so switching to Spotlight (which
// unmounts BossQuickView entirely, see the view === "quickView" conditional render) resets it for
// free -- nobody's profile should stay stuck in the expanded layout after they navigate away.
function BossQuickView({
  theme, entry, grouped, filter, onFilterChange, level, arcaneForce, authenticForce, inputs, onSelectBoss,
}: {
  theme: AppTheme; entry: ScouterResultEntry; grouped: BossEntryList[]; filter: BossFilter;
  onFilterChange: (v: BossFilter) => void; level: number; arcaneForce: number; authenticForce: number;
  inputs: NonNullable<ScouterResultEntry["bossClearInputs"]>; onSelectBoss: (boss: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Fades whichever edge actually has more to scroll to (see useScrollEdges/edgeFadeMask)
  // -- the previous static bottom fade stayed visible even once fully scrolled to the end,
  // or when grouped was short enough to never overflow the 506px cap in the first place.
  const { ref: quickViewListRef, atStart: quickViewAtStart, atEnd: quickViewAtEnd } =
    useScrollEdges<HTMLDivElement>([grouped.length, expanded], "vertical");
  const quickViewListMask = edgeFadeMask(quickViewAtStart, quickViewAtEnd, 28, "vertical");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <PowerStrip theme={theme} entry={entry} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PillGroup theme={theme} options={BOSS_FILTER_OPTIONS} value={filter} onChange={onFilterChange} />
          <InfoTooltip theme={theme} label="How to read this" content={QUICK_VIEW_INFO_CONTENT} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* minWidth sized to "Collapse list" (the longer of the two labels) so the button
              doesn't visibly resize when the label swaps on toggle. */}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{ ...secondaryButtonStyle(theme, "0.38rem 0.62rem"), fontSize: "0.76rem", minWidth: 96, textAlign: "center" }}
          >
            {expanded ? "Collapse list" : "Expand list"}
          </button>
          <BossPicker theme={theme} grouped={grouped} onSelectBoss={onSelectBoss} />
        </div>
      </div>
      {/* 506px keeps total content within .profile-binder's shared 729px row height (see
          CharacterSetupFlow.styles.ts). Re-measure if PowerStrip/filter-row/timestamp height
          changes. Dropped entirely (maxHeight/overflow/fade) when expanded -- see this
          component's own top comment. */}
      <div
        ref={quickViewListRef}
        className="boss-quick-row-list tool-dialog-scroll"
        style={{
          display: "flex", flexDirection: "column", border: `1px solid ${theme.border}`, borderRadius: 12, padding: "0 8px",
          ...(expanded
            ? {}
            : {
              maxHeight: 506, overflowY: "auto",
              maskImage: quickViewListMask,
              WebkitMaskImage: quickViewListMask,
            }),
        }}
      >
        {grouped.map(([boss, entries], i) => (
          <BossQuickViewRow
            key={boss}
            theme={theme}
            boss={boss}
            entries={entries}
            level={level}
            arcaneForce={arcaneForce}
            authenticForce={authenticForce}
            inputs={inputs}
            filter={filter}
            isLast={i === grouped.length - 1}
            onSelect={onSelectBoss}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: theme.muted, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
        Boss thresholds as of {BOSSCUT_SCRAPED_AT}
        <InfoTooltip theme={theme} label="Where do these numbers come from?" content={BOSS_THRESHOLD_INFO_CONTENT} />
      </span>
    </div>
  );
}

// Fixed (not min/flex) so every boss's banner crops identically regardless of tile count --
// 623px was measured the same way as BossQuickView's 526px cap (see that comment): .profile-
// binder's pinned 697px content area, minus .profile-binder-page's 32px vertical padding (665px
// usable), minus Spotlight's own header row (back button + nav arrows, 32px) and its 10px gap.
const SPOTLIGHT_HEIGHT = 623;

// SpotlightTile is always 2 lines tall (difficulty/tag over clear%/Adjusted, see its own grid
// layout): 2 x ~15px lines + 2px internal row-gap + 6px+6px padding = 44px per tile, 8px gap
// between stacked tiles. This is only the initial-render estimate before BossSpotlight's
// ResizeObserver measurement lands -- tiles can grow taller than this if a value wraps, so the
// live measurement is what actually drives the fade once mounted.
const SPOTLIGHT_TILE_HEIGHT = 44;
const SPOTLIGHT_TILE_GAP = 8;
// Total height the tile stack occupies (including its 1rem top+bottom padding) for a given count.
// Used as the initial-render estimate before a live measurement lands.
function spotlightTileStackHeight(tileCount: number): number {
  if (tileCount === 0) return 16 * 2;
  return 16 * 2 + tileCount * SPOTLIGHT_TILE_HEIGHT + (tileCount - 1) * SPOTLIGHT_TILE_GAP;
}

// Fade end deliberately bleeds 20px past the tile stack's top edge (tiles have their own opaque
// background, so legibility holds); start sits 130px above end. Both scale up with stack height
// so taller stacks (Destiny/Champion-tier bosses) don't overlap still-opaque art. Takes the
// stack's height directly rather than a tile count so the caller can pass either the fixed-height
// formula (pre-mount estimate) or a live ResizeObserver measurement (actual rendered height,
// which can exceed the estimate once a value wraps onto extra lines).
function spotlightMaskStyle(stackHeightPx: number): CSSProperties {
  const stackTopPx = SPOTLIGHT_HEIGHT - stackHeightPx;
  const endPx = Math.max(0, stackTopPx + 20);
  const startPx = Math.max(0, endPx - 130);
  const start = (startPx / SPOTLIGHT_HEIGHT) * 100;
  const end = (endPx / SPOTLIGHT_HEIGHT) * 100;
  return {
    position: "absolute", inset: 0,
    maskImage: `linear-gradient(to bottom, black ${start}%, transparent ${end}%)`,
    WebkitMaskImage: `linear-gradient(to bottom, black ${start}%, transparent ${end}%)`,
  };
}

function NavArrowButton({ theme, direction, disabled, onClick }: {
  theme: AppTheme; direction: "prev" | "next"; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="tap-target-44"
      aria-label={direction === "prev" ? "Previous boss" : "Next boss"}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
        borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg,
        color: theme.text, opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer",
      }}
    >
      <NavChevron direction={direction} />
    </button>
  );
}

/** Every gap the boss actually requires (e.g. Arcane is omitted entirely for a Grandis boss --
 *  see BossClearResult's boss/characterArcaneForce doc), each with the boss-vs-character values
 *  behind it (MapleScouter shows this as a Boss/User table; we fold it into the same line) AND
 *  its individual loss%, null when that stat isn't costing any damage. Requirement-relevant
 *  stats are returned even at no loss so the UI can show a quiet boss-vs-you reference line for
 *  players just checking whether they meet a requirement, not only when something's wrong. */
function lossBreakdown(result: BossClearResult): { combinedLossPercent: number; lines: { label: string; bossValue: number; yourValue: number; lossPercent: number | null }[] } {
  const gaps: { label: string; bossValue: number; yourValue: number; gapDmg: number; gapCeiling: number }[] = [
    { label: "Level", bossValue: result.bossLevel, yourValue: result.characterLevel, gapDmg: result.levelGapDmg, gapCeiling: result.levelGapCeiling },
  ];
  if (result.bossArcaneForce !== null) {
    gaps.push({ label: "Arcane Force", bossValue: result.bossArcaneForce, yourValue: result.characterArcaneForce, gapDmg: result.arcaneGapDmg, gapCeiling: result.arcaneGapCeiling });
  }
  if (result.bossAuthenticForce !== null) {
    gaps.push({ label: "Sacred Power", bossValue: result.bossAuthenticForce, yourValue: result.characterAuthenticForce, gapDmg: result.authenticGapDmg, gapCeiling: result.authenticGapCeiling });
  }
  // Loss is relative to each stat's own bonus CEILING, not to 1 -- sitting exactly at a boss's
  // requirement reads gapDmg ~1.0 but is still short of the max bonus tier (confirmed against a
  // real MapleScouter reading: Black Mage arcane 1350/1320 required reads gapDmg 1.0 against a
  // 1.1 ceiling for that boss specifically, i.e. 9.09% loss, not 0%).
  //
  // The combined total isn't a sum of the per-stat losses -- it's the achieved/ceiling PRODUCT
  // across all gaps (confirmed against a real MapleScouter reading: Jupiter Level 295/295 +
  // Sacred Power 810/820 gives 8.33% + 16% individually, but MapleScouter's own displayed total
  // is 23.00%, which only matches (1.10*1.05)/(1.20*1.25)). A gap the boss doesn't require
  // contributes gapDmg=gapCeiling=1 and drops out of the product on its own.
  const achievedProduct = gaps.reduce((acc, g) => acc * g.gapDmg, 1);
  const ceilingProduct = gaps.reduce((acc, g) => acc * g.gapCeiling, 1);
  const combinedLossPercent = Math.round((1 - achievedProduct / ceilingProduct) * 100 * 100) / 100;
  const lines = gaps.map((g) => ({
    label: g.label,
    bossValue: g.bossValue,
    yourValue: g.yourValue,
    lossPercent: g.gapDmg < g.gapCeiling ? Math.round((1 - g.gapDmg / g.gapCeiling) * 100 * 100) / 100 : null,
  }));
  return { combinedLossPercent, lines };
}

// Mirrors DifficultyChip's tag-text + hover-tooltip pattern (Quick View's current design,
// replacing the old saturated pill this used to share) so both views read as the same system.
//
// 5 grid columns shared across every tile in the stack (icon, difficulty, tag, clear%, Adjusted)
// via subgrid, so an 8-digit clear% (e.g. 474248.20%) on one tile grows that column for every
// tile at once instead of just its own, keeping every column aligned across tiles regardless of
// which one has the longest value (without subgrid, each tile sizing its own independent grid
// meant a wide value on tile 1 didn't widen tile 3's matching column, so text drifted between
// tiles). Desktop is one row (.spotlight-tile-cell classes place each cell in its own column);
// below 400px (.spotlight-tile's container query, CharacterSetupFlow.styles.ts) the placement
// classes switch clear%/Adjusted onto a second row sharing the difficulty/tag columns instead,
// since a maxed-out end-game clear% has no room left on the same line as icon+difficulty+tag on
// a narrow panel. Placement lives in CSS classes, not inline styles, specifically so the
// container query can override it -- an inline gridColumn/gridRow would always win over any
// stylesheet rule regardless of breakpoint. Requires the caller (stackRef's div) to be the
// actual grid with the matching column template; this component only supplies rows.
function SpotlightTile({ theme, iconId, displayName, entry, result }: {
  theme: AppTheme; iconId: string | undefined; displayName: string; entry: BossCutEntry; result: BossClearResult;
}) {
  const tagColor = chipTagColor(theme, pillStatus(result.colorTier));
  return (
    <HoverTooltip
      theme={theme}
      // .hover-tip is inline-flex and shrink-wraps its own box by default (see globals.css and
      // FamiliarsSetupStep.tsx's sprite for the same issue) -- without an explicit grid-column
      // span, the wrapper wouldn't participate in the parent subgrid's column tracks at all.
      // className reuses .spotlight-tile's own gridRow rule (styles.ts) rather than setting it
      // inline, since it needs to be 1 row on desktop (single-line, content vertically centers
      // in a 1-row-tall box) and 2 rows on mobile (wrapped) -- an inline gridRow would always
      // beat the container query that switches between them.
      className="spotlight-tile"
      style={{ display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "subgrid", gridTemplateRows: "subgrid" }}
      label={<ChipTooltipContent theme={theme} difficulty={entry.difficulty} result={result} />}
    >
      <div
        className="spotlight-tile"
        style={{
          display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "subgrid", gridTemplateRows: "subgrid",
          alignItems: "center", columnGap: 6, rowGap: 2, boxSizing: "border-box",
          background: `${theme.bg}dd`, borderRadius: 10, padding: "6px 10px",
        }}
      >
        {/* margin-right on a grid item lives inside that item's own fixed-width track -- it
            doesn't enlarge the track or push the next column over, so it had zero visible effect
            here (tried it, the icon just clipped/overflowed its 32px box instead). The icon's
            extra breathing room (see the 14px-vs-10px note this session) has to come from the
            parent's own column-1 track width instead, via .spotlight-tile-cell-icon in styles.ts
            widening column 1 past the icon's actual 32px size. */}
        <div className="spotlight-tile-cell-icon" style={{ gridColumn: 1, gridRow: 1 }}>
          <FallbackSpriteIcon theme={theme} src={iconId ? bossDifficultyIconUrl(iconId, entry.difficulty) : undefined} size={32} displayName={displayName} />
        </div>
        {/* paddingRight (not marginRight -- same reason as the icon's column-width trick above,
            padding is included when max-content measures this cell's own intrinsic size, margin
            isn't) gives diff<->tag extra breathing room without affecting the tag<->numbers gap,
            which shares the same columnGap and should stay at its current tighter spacing. */}
        <span className="spotlight-tile-cell-diff" style={{ fontSize: 12, fontWeight: 700, color: theme.text, whiteSpace: "nowrap", paddingRight: 8 }}>{entry.difficulty}</span>
        <span className="spotlight-tile-cell-tag" style={{ fontSize: 12, fontWeight: 800, color: tagColor, whiteSpace: "nowrap" }}>
          {result.tagEnglish}
        </span>
        {/* diff/tag are their own max-content columns (tight-packed against each other); this
            group is 1fr and pins to the card's right edge via justifySelf: end on the group
            itself, but clear%/Adjusted stay tight-packed against EACH OTHER inside it (small
            fixed gap, not space-between) so the pair reads as one unit instead of spreading
            across the remaining row width. On mobile (.spotlight-tile-cell-numbers's
            container query, styles.ts) this switches to display: contents so its two spans
            become direct grid items the mobile area map can place independently under the
            diff/tag columns on their own row. */}
        <span className="spotlight-tile-cell-numbers" style={{ gridColumn: 4, gridRow: 1, display: "flex", alignItems: "center", justifySelf: "end", gap: 10, minWidth: 0 }}>
          <span className="spotlight-tile-cell-clear" style={{ fontSize: 12, fontWeight: 700, color: theme.text, whiteSpace: "nowrap" }}>{result.clearRatePercent.toFixed(2)}%</span>
          <span className="spotlight-tile-cell-adjusted" style={{ fontSize: 12, color: theme.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
            Adjusted {formatFigure(result.bossStat)}
          </span>
        </span>
      </div>
    </HoverTooltip>
  );
}

// Full-bleed backdrop version of BossBanner's fade trick -- a radial mask (same shape as the
// Bio bookmark's ClassPortrait fade) instead of a linear one, since this backdrop has content
// overlaid on all sides rather than just needing to fade into whatever sits to its right.
// Matches the "← Characters" nav button's look (secondaryButtonStyle, ← arrow glyph).
function BackToQuickViewButton({ theme, onClick }: { theme: AppTheme; onClick: () => void }) {
  return (
    <button
      type="button"
      className="tap-target-44"
      onClick={onClick}
      style={{ ...secondaryButtonStyle(theme, "0.38rem 0.62rem"), fontSize: "0.76rem" }}
    >
      ← Quick View
    </button>
  );
}

function BossSpotlight({
  theme, grouped, selectedIndex, onNavigate, level, arcaneForce, authenticForce, inputs, onBack,
}: {
  theme: AppTheme; grouped: BossEntryList[]; selectedIndex: number; onNavigate: (i: number) => void;
  level: number; arcaneForce: number; authenticForce: number;
  inputs: NonNullable<ScouterResultEntry["bossClearInputs"]>; onBack: () => void;
}) {
  const [boss, entries] = grouped[selectedIndex];
  const iconId = BOSS_ICON_ID[boss];
  const displayName = BOSS_DISPLAY_NAME[boss] ?? boss;
  const artPosition = SPOTLIGHT_ART_POSITION[boss] ?? DEFAULT_ART_POSITION;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const tiles = relevantTiles(entries, level, arcaneForce, authenticForce, inputs, "all");

  // Formula estimate holds on desktop (fixed single-line tiles); below 400px tiles can wrap onto
  // a second line (.spotlight-tile-numbers) so the fixed-height assumption breaks and this gets
  // replaced by a live measurement of the stack's actual rendered height once it's mounted. No
  // reset-to-null on boss change: ResizeObserver's callback fires immediately on observe() with
  // the newly-observed node's current size, so a boss switch naturally overwrites the stale
  // value on its own -- an explicit reset would just be a same-effect setState with nothing to
  // show for the one frame between the reset and the observer's own first callback.
  const [measuredStackHeight, setMeasuredStackHeight] = useState<number | null>(null);
  useEffect(() => {
    const node = stackRef.current;
    if (!node) return;
    // +32 restores the 1rem top+bottom padding stripped by measuring the inner content div
    // directly (the outer .spotlight-tile-stack is always the full absolute-positioned panel
    // height, so it can't be measured for its content size the same way).
    const observer = new ResizeObserver(([e]) => setMeasuredStackHeight(e.contentRect.height + 32));
    observer.observe(node);
    return () => observer.disconnect();
  }, [boss]);
  const stackHeight = measuredStackHeight ?? spotlightTileStackHeight(tiles.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <BackToQuickViewButton theme={theme} onClick={onBack} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavArrowButton theme={theme} direction="prev" disabled={selectedIndex === 0} onClick={() => onNavigate(selectedIndex - 1)} />
          <span style={{ fontSize: 12, color: theme.muted }}>{selectedIndex + 1} / {grouped.length}</span>
          <NavArrowButton theme={theme} direction="next" disabled={selectedIndex === grouped.length - 1} onClick={() => onNavigate(selectedIndex + 1)} />
        </div>
      </div>
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", height: SPOTLIGHT_HEIGHT, background: theme.panel }}>
        {iconId && (
          <div ref={wrapperRef} style={spotlightMaskStyle(stackHeight)}>
            <Image
              src={bossSplashUrl(iconId)}
              alt=""
              fill
              unoptimized
              sizes="100vw"
              onError={() => {
                if (wrapperRef.current) wrapperRef.current.style.display = "none";
                if (fallbackRef.current) fallbackRef.current.style.display = "flex";
              }}
              style={{ objectFit: "cover", objectPosition: artPosition }}
            />
          </div>
        )}
        <div
          ref={fallbackRef}
          style={{ position: "absolute", inset: 0, display: iconId ? "none" : "flex", alignItems: "center", justifyContent: "center", background: theme.accentSoft }}
        >
          <span style={{ fontSize: 40, fontWeight: 800, color: theme.accentText }}>{displayName.charAt(0)}</span>
        </div>
        <div className="spotlight-tile-stack" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 8, padding: "1rem", justifyContent: "flex-end" }}>
          {/* The actual grid: 4 columns (icon, difficulty, tag, numbers) shared by every tile via
              subgrid (see SpotlightTile) so a long clear% on any one tile grows the numbers
              column for all of them, keeping columns aligned across tiles regardless of which one
              has the longest value. diff/tag are max-content (tight-packed against each other,
              don't stretch just because the panel is wide -- was the whole point of this pass: at
              a very wide viewport, plain auto columns were resolving 60-90% wider than their
              content actually needed). numbers is 1fr and pins to the card's right edge as a
              whole group (justifySelf: end), with clear%/Adjusted tight-packed against each other
              inside it (small fixed gap, not space-between) rather than spread across the row.
              Desktop uses all 4 columns in one row per tile; below 400px
              (.spotlight-tile-cell-numbers's container query, styles.ts) that group switches to
              display: contents so clear%/Adjusted become direct grid items the mobile area map
              can place independently onto a second row sharing the diff/tag columns. 8px row-gap
              separates tiles from each other; each tile overrides this to 2px for its own
              internal rows on mobile (subgrid permits per-spanned-track gap overrides). 6px
              column-gap for the text-to-text gaps, but column 1 (icon) is 40px, not the icon's
              actual 32px -- the extra 8px is the icon's own breathing room (confirmed via
              DevTools: the sprite art has no internal padding baked into the asset, so a plain
              6-10px gap still reads as touching). A margin on the icon's own grid item doesn't
              work for this (tried it: margin lives inside that item's own track, doesn't push the
              next column over), so the track itself has to be wider instead. */}
          <div ref={stackRef} style={{ display: "grid", gridTemplateColumns: "40px max-content max-content 1fr", gridAutoRows: "auto", rowGap: 8, columnGap: 6 }}>
            {tiles.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)", gridColumn: "1 / -1" }}>No relevant difficulties right now.</p>
            ) : (
              tiles.map(({ entry, result }) => (
                <SpotlightTile key={entry.difficulty} theme={theme} iconId={iconId} displayName={displayName} entry={entry} result={result} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type ScouterBookmarkView = "quickView" | "spotlight";

/** Renders once BossClearGrid confirms bossClearInputs exists -- kept as a separate component
 *  so that null-check lives at the call site, not scattered through every sub-view. Owns both
 *  swappable sub-views (Quick View table / Spotlight card) internally, same stacked-grid-cell
 *  shape as every other multi-sub-view bookmark (see CharacterSetupFlow.styles.ts's
 *  .bookmark-subview comment) -- ScouterBookmark just passes view/onViewChange through.
 *  Spotlight's selected boss is owned by CharacterProfileOverviewScreen (not local state) so
 *  the page header can read the same value directly instead of BossClearGrid reporting it back
 *  up through an effect -- see resolveBossDisplayName's own comment. */
export default function BossClearGrid({ theme, character, entry, view, onViewChange, selectedIndex, onSelectedIndexChange }: {
  theme: AppTheme;
  character: StoredCharacterRecord;
  entry: ScouterResultEntry;
  view: ScouterBookmarkView;
  onViewChange: (v: ScouterBookmarkView) => void;
  selectedIndex: number;
  onSelectedIndexChange: (i: number) => void;
}) {
  const [filter, setFilter] = useState<BossFilter>("relevant");
  const inputs = entry.bossClearInputs;
  const grouped = groupByBoss(BOSSCUT_DATA);
  const clampedIndex = Math.min(selectedIndex, grouped.length - 1);

  if (!inputs) {
    return (
      <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, textAlign: "center", padding: "2rem 0" }}>
        Boss Clear data isn&apos;t available yet. Refresh the Scouter figure on Overview to compute it.
      </p>
    );
  }

  const arcaneForce = Number(character.stats.arcanePower) || 0;
  const authenticForce = Number(character.stats.sacredPower) || 0;

  const handleSelectBoss = (boss: string) => {
    const idx = grouped.findIndex(([b]) => b === boss);
    if (idx >= 0) onSelectedIndexChange(idx);
    onViewChange("spotlight");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {view === "quickView" && (
        <BossQuickView
          theme={theme}
          entry={entry}
          grouped={grouped}
          filter={filter}
          onFilterChange={setFilter}
          level={character.level}
          arcaneForce={arcaneForce}
          authenticForce={authenticForce}
          inputs={inputs}
          onSelectBoss={handleSelectBoss}
        />
      )}
      {view === "spotlight" && (
        <BossSpotlight
          theme={theme}
          grouped={grouped}
          selectedIndex={clampedIndex}
          onNavigate={onSelectedIndexChange}
          level={character.level}
          arcaneForce={arcaneForce}
          authenticForce={authenticForce}
          inputs={inputs}
          onBack={() => onViewChange("quickView")}
        />
      )}
    </div>
  );
}
