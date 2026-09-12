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

// Icon ids looked up by hand from manifests/v271/ui-boss.json, renamed from boss.json as of
// v269 (see the Image Policy in the root CLAUDE.md), cross-checked against the same bosses
// already mapped in liberation-data.ts and trace-restoration-data.ts.
const BOSS_ICON_ID: Record<string, string> = {
  스우: "13", 데미안: "15", 루시드: "19", 윌: "23", 더스크: "26", "진 힐라": "24",
  듄켈: "27", "검은 마법사": "25", 세렌: "28", 칼로스: "30", 대적자: "35", 흉성: "37",
  카링: "31", 림보: "33", 발드릭스: "34", 유피테르: "38", 가엔슬: "29", 카이: "36",
};

// Easiest to hardest. Champion and Destiny are solo variants of a party tier, nearly always
// Hard, and sit below Extreme on every boss that has one. Lotus, Black Mage, Seren and
// Adversary all read wrong with Extreme ranked under them. Checked per boss against the
// scraped cut and easyRate rather than assumed from the names.
const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Normal: 1, Hard: 2, Chaos: 3, Champion: 4, Destiny: 5, Extreme: 6 };

// The two bosses whose solo variant doesn't mirror Hard: Kalos's Champion is a solo Normal
// (same 49800 cut as Normal, about half of Chaos's), and Kaling's Destiny is rated easier than
// its Hard, sharing the same cut at easyRate x1.2, since players clear Destiny before soloing
// Hard. Every other boss follows the global ladder.
const DIFFICULTY_ORDER_OVERRIDE: Partial<Record<string, Record<string, number>>> = {
  kalos: { Easy: 0, Normal: 1, Champion: 2, Chaos: 3, Destiny: 4, Extreme: 5 },
  kaling: { Easy: 0, Normal: 1, Destiny: 2, Hard: 3, Extreme: 4 },
};

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
      <p style={{ margin: "0 0 0.5rem" }}>
        &quot;Min&quot; means the bare minimum to pass, not a comfortable clear. Solo Min is
        barely soloable.
      </p>
      <p style={{ margin: 0 }}>
        Party-only bosses use your HEXA alone, never your party members&apos;. A Min Cut tag
        (1p/2p/3p...) is how many players like you it would take.
      </p>
    </>
  ),
};

const BOSS_THRESHOLD_INFO_CONTENT: TooltipContent = {
  title: "Boss thresholds",
  description: (
    <>
      <p style={{ margin: "0 0 0.5rem" }}>
        Boss Clear thresholds from MapleScouter, informally curated by a small group of experienced
        players rather than measured across the whole playerbase.
      </p>
      {/* Temporary until GMS gets the 20-minute timer patch: MapleScouter already models every
          boss on KMS's post-patch 20-minute timer with HP scaled to match, which preserves the
          required DPS, so the numbers hold for GMS's current timers. Drop this paragraph once
          the patch lands. (Champion Black Mage, the one exception, explains itself on its own
          chip -- see bossClearFormula.ts's effectiveEasyRate.) */}
      <p style={{ margin: 0 }}>
        MapleScouter already uses the 20-minute boss timers with HP cut to match, so the damage
        you need per minute is the same as on GMS&apos;s current timers and these numbers still
        apply.
      </p>
    </>
  ),
};

// MapleScouter's own relevant filter, ported verbatim from their "View my (relevant) boss
// standards" toggle. Hides a difficulty tile once the character has wildly outgrown it, past
// 10x or 10x over partyLimit for a party-only boss, or cannot touch it yet, below 0.15x or
// 0.85x over partyLimit.
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

// Dual-render with refs, keeping the fallback at display:none and swapping via onError, rather
// than useState, per the React-Doctor Rules in the root CLAUDE.md. The same pattern covers
// every boss sprite here, including row difficulty chips and spotlight tile icons. Handles both
// a load failure and a boss with no known icon id, where src is undefined and the Image simply
// never mounts.
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
// Vertical anchor for the wide banner crop of mob.png, which is a tall splash. 20% lands
// roughly on the head and shoulders for the 2 splashes checked so far, Malefic Star and First
// Adversary. Not checked across the full roster.
const DEFAULT_ART_POSITION = "50% 20%";
// Per-boss override, keyed like BOSS_ICON_ID, since framing varies enough per splash that a
// single default crop misses most faces. Tuned by hand against each boss's real mob.png in the
// WZ image dump, picking the vertical anchor as a percentage of source height that lands on the
// face in the wide banner crop. Gloom has no face, being an inanimate seal, so it is positioned
// on the portal's glowing center.
const BOSS_ART_POSITION: Record<string, string> = {
  스우: "50% 25%", 데미안: "42% 50%", 루시드: "50% 43%", 윌: "68% 61%", 더스크: "50% 53%",
  "진 힐라": "50% 23%", 듄켈: "48% 46%", "검은 마법사": "42% 19%", 세렌: "50% 33%",
  칼로스: "55% 60%", 대적자: "75% 29%", 흉성: "50% 26%", 카링: "50% 26%", 림보: "50% 58%",
  발드릭스: "50% 40%", 유피테르: "48% 25%", 가엔슬: "50% 51%", 카이: "50% 28%",
};

// Spotlight's own crop anchors, deliberately separate from BOSS_ART_POSITION above, which was
// tuned for Quick View's small wide banner crop rather than Spotlight's much taller card. Left
// empty, falling back to DEFAULT_ART_POSITION for every boss, until it gets its own pass
// against Spotlight's real aspect ratio. BOSS_ART_POSITION's values do not transfer, and a
// wrong per-boss override is worse than an honest default.
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

// The Quick View row's extended boss art: a wide slice of mob.png faded to transparent on its
// right edge through bannerMaskStyle rather than hard-cropped, so it blends into the row's
// background instead of reading as a cropped rectangle. Same dual-render-with-refs fallback as
// FallbackSpriteIcon, sized for a banner rather than a small icon.
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

// flexWrap drops the chip column to its own full-width line below the banner once the row is
// too narrow for both side by side, as on mobile. The chip container's flex-basis below is what
// triggers the wrap.
function rowStyle(isLast: boolean, theme: AppTheme): CSSProperties {
  return {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, width: "100%",
    padding: "8px 4px", borderBottom: isLast ? "none" : `1px solid ${theme.border}`,
  };
}

// Reset to look like the plain banner wrapper it replaces. Only the banner opens Spotlight
// now; it used to be the whole row, which made every difficulty chip's hover tooltip fight the
// row's click target, so the target was scoped down.
const bannerButtonStyle: CSSProperties = {
  background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", flexShrink: 0,
  borderRadius: 10, transition: "transform 0.1s ease",
};

type BossFilter = "relevant" | "all";
const BOSS_FILTER_OPTIONS: { value: BossFilter; label: string }[] = [
  { value: "relevant", label: "Relevant" },
  { value: "all", label: "All" },
];

// The same on/off color swap the old Full HEXA toggle had in noGapLossToggleStyle, removed when
// the Scouter Simulator popup replaced it. Same slot in the filter row and same visual
// treatment, but it opens the popup rather than flipping a flag directly.
function openSimulatorButtonStyle(theme: AppTheme, active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px", borderRadius: "10px", fontSize: "0.82rem", lineHeight: 1, fontWeight: 700,
    cursor: "pointer", userSelect: "none", color: active ? theme.accentText : theme.muted,
    background: active ? theme.accentSoft : theme.timerBg, border: `1px solid ${active ? theme.accent : theme.border}`,
  };
}
function OpenSimulatorButton({ theme, simulated, onOpen }: { theme: AppTheme; simulated: boolean; onOpen: () => void }) {
  return (
    <HoverTooltip theme={theme} label={simulated ? "Edit your custom stats set." : "Preview your HEXA with custom stats set."}>
      <button
        type="button"
        className="tool-btn"
        aria-pressed={simulated}
        onClick={onOpen}
        style={openSimulatorButtonStyle(theme, simulated)}
      >
        {simulated ? "Edit Simulator" : "Simulator"}
      </button>
    </HoverTooltip>
  );
}

/** One boss+difficulty tile's computed result, or null if computeBossClear couldn't produce one
 *  because formula fields are missing, in which case it is filtered out before either view
 *  renders. level, arcaneForce and authenticForce can each be a Scouter Simulator override,
 *  state ScouterBookmark owns rather than this component, instead of the character's real
 *  stats. */
function relevantTiles(entries: BossCutEntry[], level: number, arcaneForce: number, authenticForce: number, inputs: NonNullable<ScouterResultEntry["bossClearInputs"]>, filter: BossFilter) {
  const order = (entries[0] && DIFFICULTY_ORDER_OVERRIDE[entries[0].name]) ?? DIFFICULTY_ORDER;
  const sorted = [...entries].sort((a, b) => (order[a.difficulty] ?? 99) - (order[b.difficulty] ?? 99));
  return sorted.reduce<{ entry: BossCutEntry; result: BossClearResult }[]>((tiles, entry) => {
    const result = computeBossClear(entry, level, arcaneForce, authenticForce, inputs);
    if (result && (filter === "all" || isRelevant(result.clearRate, result.isPartyBoss, result.partyLimit))) {
      tiles.push({ entry, result });
    }
    return tiles;
  }, []);
}

// Trailing * flags a clear% mapledoro deliberately corrects away from MapleScouter's own figure
// (Champion Black Mage, see bossClearFormula.ts's effectiveEasyRate) so a player comparing the
// two sites sees at a glance that the mismatch is intended, with the hover tooltip explaining it.
function formatClearPercent(result: BossClearResult): string {
  return `${result.clearRatePercent.toFixed(2)}%${result.scouterClearRatePercent === null ? "" : "*"}`;
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

// Sectioned, left-aligned tooltip content. The default hover-tip-bubble CSS centers short
// one-line labels, which suits those but turns a multi-row breakdown into an unscannable wall
// of centered text, so this overrides text-align through HoverTooltip's style prop. Difficulty
// and clear percent are left out, since both are already visible on the chip being hovered.
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
      {/* Whichever scale the chip ISN'T showing -- the party figure once the boss has flipped to
          solo (also what MapleScouter's own site shows, so the cross-check survives the flip). */}
      {result.soloScalePercent !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: theme.muted }}>{result.soloable ? `${result.partyLimit}-player party %` : "Solo %"}</span>
          <span>{(result.soloable ? result.clearRate * 100 : result.soloScalePercent).toFixed(2)}%</span>
        </div>
      )}
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
      {result.scouterClearRatePercent !== null && (
        <>
          <div style={chipTooltipDividerStyle(theme)} />
          <div style={{ color: theme.muted, fontWeight: 500 }}>
            Current GMS Scouter incorrectly deflates the Champion Mode Black Mage difficulty. Black
            Mage values will stabilize after GMS receives the 20-minute change. Adjusted from{" "}
            {result.scouterClearRatePercent.toFixed(2)}%.
          </div>
        </>
      )}
    </div>
  );
}

// Tag and percent are both visible without hovering, since MapleScouter users expect both at a
// glance, and hovering expands into the adjusted stat and damage-loss factor that used to be
// Spotlight-only. A small neutral card with an icon and stacked text rather than the old
// saturated pill.
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
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted }}>{formatClearPercent(result)}</span>
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

/** The (+X) / (-X) chip next to a simulated power figure. Rounds both sides before diffing so
 *  it never shows a delta the displayed (rounded) numbers don't actually support. */
function PowerStripDelta({ theme, value, realValue }: { theme: AppTheme; value: number; realValue: number }) {
  const diff = Math.round(value) - Math.round(realValue);
  if (diff === 0) return null;
  const up = diff > 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: statusText(theme, up ? "success" : "danger"), fontFamily: "var(--font-heading)", whiteSpace: "nowrap" }}>
      {up ? "+" : "-"}{formatFigure(Math.abs(diff))}
    </span>
  );
}

/** The FD-equivalent of a simulation for one boss: simulated raw HEXA damage over real, minus
 *  one. The same figure MapleScouter's own "Additional Spec Simulation" cards show as "FD %".
 *  It sits under the (+X) chip on the Boss 300 and Boss 380 cells, so the cell labels it. Null
 *  when either result predates the Boss Clear fields, or rounds to nothing. */
function fdEquivalentPercent(realDamage?: number, simDamage?: number): number | null {
  if (!realDamage || !simDamage) return null;
  const pct = (simDamage / realDamage - 1) * 100;
  return Math.abs(pct) < 0.05 ? null : pct;
}

function PowerStripFdEquiv({ theme, pct }: { theme: AppTheme; pct: number }) {
  const up = pct > 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" }}>
      <span style={{ fontWeight: 800, color: statusText(theme, up ? "success" : "danger") }}>
        {up ? "+" : "-"}{Math.abs(pct).toFixed(2)}%
      </span>
      {" "}FD eq.
    </span>
  );
}

function PowerStripItem({ theme, label, value, sub, realValue, fdEquiv }: {
  theme: AppTheme; label: string; value: number; sub?: number;
  /** The character's real (pre-simulation) figure for this slot. Set only while a Scouter
   *  Simulator what-if is applied. Drives the delta chip and the "was" tooltip line. */
  realValue?: number;
  /** This boss's FD-equivalent % for the simulation (Boss 300 / Boss 380 only). */
  fdEquiv?: number | null;
}) {
  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted }}>{label}</span>
      {/* Value and delta stack rather than sit side by side -- Converted's 9-digit figure plus
          its own 9-digit delta can't share one line inside a 2-column strip at 360px. */}
      <span style={{ fontSize: 14, fontWeight: 800, color: theme.text, fontFamily: "var(--font-heading)" }}>{formatFigure(value)}</span>
      {realValue !== undefined && <PowerStripDelta theme={theme} value={value} realValue={realValue} />}
      {fdEquiv != null && <PowerStripFdEquiv theme={theme} pct={fdEquiv} />}
    </div>
  );
  // "Normal" alone (no simulation): the old single-line tooltip, unchanged.
  if (realValue === undefined) {
    if (sub === undefined) return content;
    return <HoverTooltip theme={theme} label={`Normal: ${formatFigure(sub)}`}>{content}</HoverTooltip>;
  }
  // While simulated, the strip already shows the current figure and its delta chip, so the
  // tooltip carries only what the strip cannot: the pre-simulation value, muted since it is
  // history, and the Normal-tier figure if there is one, at full weight since it is current.
  return (
    <HoverTooltip
      theme={theme}
      label={
        <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 88 }}>
          <span style={{ color: theme.muted }}>Was: {formatFigure(realValue)}</span>
          {sub !== undefined && <span>Normal: {formatFigure(sub)}</span>}
        </span>
      }
    >
      {content}
    </HoverTooltip>
  );
}

// The old ScouterSummaryView's 3 StatBlocks, collapsed into one compact strip above the boss
// table rather than behind a separate page. These are the raw power figures feeding every row
// below, so they read as this view's header rather than an unrelated sibling.
function PowerStrip({ theme, entry, realEntry }: { theme: AppTheme; entry: ScouterResultEntry; realEntry?: ScouterResultEntry }) {
  // A simulation touching only level, Arcane Force or Sacred Power reuses the character's
  // cached result untouched, since those fields never reach MapleScouter, so the power figures
  // are identical. Skip the "was" tooltip line and the always-zero chip in that case.
  const showDeltas = realEntry !== undefined && (
    Math.round(entry.boss300Hexa) !== Math.round(realEntry.boss300Hexa) ||
    Math.round(entry.boss380Hexa) !== Math.round(realEntry.boss380Hexa) ||
    Math.round(entry.convertedPowerHexa) !== Math.round(realEntry.convertedPowerHexa) ||
    Math.round(entry.dojoPower) !== Math.round(realEntry.dojoPower)
  );
  const real = showDeltas ? realEntry : undefined;
  const fdEquiv300 = real ? fdEquivalentPercent(real.bossClearInputs?.calculatedHexaDamage300, entry.bossClearInputs?.calculatedHexaDamage300) : null;
  const fdEquiv380 = real ? fdEquivalentPercent(real.bossClearInputs?.calculatedHexaDamage380, entry.bossClearInputs?.calculatedHexaDamage380) : null;
  return (
    <div className="power-strip" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12 }}>
      {/* Grid, not flex-wrap: Converted's long value skews flex column widths. 4 columns on
          desktop, 2 on narrow panels (.power-strip-grid's container query in styles.ts). */}
      <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted }}>Boss 300 / 380 / Converted shown as HEXA</span>
      <div className="power-strip-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <PowerStripItem theme={theme} label="Boss 300" value={entry.boss300Hexa} sub={entry.boss300Normal} realValue={real?.boss300Hexa} fdEquiv={fdEquiv300} />
        <PowerStripItem theme={theme} label="Boss 380" value={entry.boss380Hexa} sub={entry.boss380Normal} realValue={real?.boss380Hexa} fdEquiv={fdEquiv380} />
        <PowerStripItem theme={theme} label="Converted" value={entry.convertedPowerHexa} sub={entry.convertedPowerNormal} realValue={real?.convertedPowerHexa} />
        <PowerStripItem theme={theme} label="Dojo" value={entry.dojoPower} realValue={real?.dojoPower} />
      </div>
    </div>
  );
}

const BOSS_PICKER_WIDTH = 220;

// Matches the search-input and option-list convention the setup flow's pickers use, such as
// LinePicker in FamiliarsSetupStep.tsx. Those constants are file-local there too, with no
// shared export, so this is its own copy rather than a duplicated import.
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

/** Searchable replacement for the old plain <select>, letting a player type a boss name instead
 *  of scrolling a native dropdown of 15 to 17 bosses. Reuses the same shared pieces as the
 *  setup flow's own search pickers: usePickerCoords for portal positioning, useKeyboardListNav
 *  for arrow, Enter and Escape keys, and searchAndRank for ranked matching, rather than a plain
 *  <select>, but owns its open and close state standalone, with no cross-field openId
 *  chaining, since there is only one picker here rather than a group like a familiar's two
 *  line slots. */
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

// Drops the row list's height cap, scroll and fade so every boss renders and the page grows
// instead, letting someone screenshot the whole list in one shot to share. The normal capped,
// scrollable list cannot do that without stitching two screenshots together.
//
// State lives here rather than lifted to BossClearGrid so that switching to Spotlight, which
// unmounts BossQuickView entirely through the quickView conditional render, resets it for free.
// Nobody's profile should stay stuck in the expanded layout after navigating away.
function BossQuickView({
  theme, entry, realEntry, grouped, filter, onFilterChange, level, arcaneForce, authenticForce, inputs, onSelectBoss, simulated, onOpenSimulator,
}: {
  theme: AppTheme; entry: ScouterResultEntry; realEntry?: ScouterResultEntry; grouped: BossEntryList[]; filter: BossFilter;
  onFilterChange: (v: BossFilter) => void;
  level: number; arcaneForce: number; authenticForce: number;
  inputs: NonNullable<ScouterResultEntry["bossClearInputs"]>; onSelectBoss: (boss: string) => void;
  simulated: boolean; onOpenSimulator: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Fades whichever edge has more to scroll to (see useScrollEdges and edgeFadeMask). The
  // previous static bottom fade stayed visible even when fully scrolled to the end, or when
  // grouped was short enough never to overflow the cap.
  const { ref: quickViewListRef, atStart: quickViewAtStart, atEnd: quickViewAtEnd } =
    useScrollEdges<HTMLDivElement>([grouped.length, expanded], "vertical");
  const quickViewListMask = edgeFadeMask(quickViewAtStart, quickViewAtEnd, 28, "vertical");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <PowerStrip theme={theme} entry={entry} realEntry={realEntry} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PillGroup theme={theme} options={BOSS_FILTER_OPTIONS} value={filter} onChange={onFilterChange} />
          <OpenSimulatorButton theme={theme} simulated={simulated} onOpen={onOpenSimulator} />
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

// Fixed rather than min or flex, so every boss's banner crops identically regardless of tile
// count. Measured the same way as BossQuickView's cap (see that comment): `.profile-binder`'s
// pinned content area, minus `.profile-binder-page`'s vertical padding, minus Spotlight's own
// header row of back button and nav arrows plus its gap.
const SPOTLIGHT_HEIGHT = 623;

// SpotlightTile is always 2 lines tall (difficulty/tag over clear%/Adjusted, see its own grid
// layout): two roughly 15px lines, a 2px internal row gap and 6px padding top and bottom, for
// 44px per tile with an 8px gap between stacked tiles. This is only the initial-render estimate
// before BossSpotlight's ResizeObserver measurement lands. Tiles can grow taller when a value
// wraps, so the live measurement drives the fade once mounted.
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

/** Every gap the boss requires, where Arcane is omitted entirely for a Grandis boss (see
 *  BossClearResult's bossArcaneForce and characterArcaneForce docs). Each carries the
 *  boss-versus-character values behind it, which MapleScouter shows as a separate Boss and User
 *  table and this folds into one line, plus its own loss percentage, null when that stat costs
 *  no damage. Requirement-relevant stats are returned even at no loss, so the UI can show a
 *  quiet boss-versus-you reference line for players checking whether they meet a requirement,
 *  not only when something is wrong. */
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
  // Loss is relative to each stat's own bonus ceiling rather than to 1. Sitting exactly at a
  // boss's requirement reads gapDmg around 1.0 but is still short of the max bonus tier: Black
  // Mage at 1350 arcane against 1320 required reads gapDmg 1.0 against a 1.1 ceiling for that
  // boss, a 9.09% loss rather than 0%.
  //
  // The combined total is not a sum of the per-stat losses but the achieved-over-ceiling
  // product across all gaps. Jupiter at Level 295/295 with Sacred Power 810/820 gives 8.33%
  // and 16% individually, while MapleScouter's own displayed total is 23.00%, which matches
  // only (1.10*1.05)/(1.20*1.25). A gap the boss does not require contributes 1 to both sides
  // and drops out of the product.
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
// since a maxed-out end-game clear percent has no room left beside the icon, difficulty and tag
// on a narrow panel. Placement lives in CSS classes rather than inline styles so the container
// query can override it; an inline gridColumn or gridRow would beat any stylesheet rule at every
// breakpoint. Requires the caller's stackRef div to be the actual grid with the matching column
// template, since this component only supplies rows.
function SpotlightTile({ theme, iconId, displayName, entry, result }: {
  theme: AppTheme; iconId: string | undefined; displayName: string; entry: BossCutEntry; result: BossClearResult;
}) {
  const tagColor = chipTagColor(theme, pillStatus(result.colorTier));
  return (
    <HoverTooltip
      theme={theme}
      // `.hover-tip` is inline-flex and shrink-wraps its own box by default (see globals.css,
      // and FamiliarsSetupStep.tsx's sprite for the same issue), so without an explicit
      // grid-column span the wrapper would not participate in the parent subgrid's column
      // tracks. The className reuses `.spotlight-tile`'s gridRow rule from styles.ts rather
      // than setting it inline, since it needs 1 row on desktop, where content centers
      // vertically in a one-row box, and 2 rows on mobile where it wraps. An inline gridRow
      // would beat the container query that switches between them.
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
          <span className="spotlight-tile-cell-clear" style={{ fontSize: 12, fontWeight: 700, color: theme.text, whiteSpace: "nowrap" }}>{formatClearPercent(result)}</span>
          <span className="spotlight-tile-cell-adjusted" style={{ fontSize: 12, color: theme.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
            Adjusted {formatFigure(result.bossStat)}
          </span>
        </span>
      </div>
    </HoverTooltip>
  );
}

// A full-bleed backdrop version of BossBanner's fade trick, using a radial mask like the Bio
// bookmark's ClassPortrait fade rather than a linear one, since this backdrop has content
// overlaid on all sides rather than only needing to fade into what sits to its right.
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
  // value on its own. An explicit reset would be a same-effect setState with nothing to show
  // for the one frame between the reset and the observer's first callback.
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

/** Renders once BossClearGrid confirms bossClearInputs exists. Kept as a separate component so
 *  that null-check lives at the call site rather than scattered through every sub-view. Owns
 *  both swappable sub-views, the Quick View table and Spotlight card, with the same stacked-cell
 *  shape as every other multi-sub-view bookmark (see CharacterSetupFlow.styles.ts's
 *  `.bookmark-subview` comment), with ScouterBookmark passing view and onViewChange through.
 *  Spotlight's selected boss is owned by CharacterProfileOverviewScreen rather than local
 *  state, so the page header can read the same value directly instead of BossClearGrid
 *  reporting it back up through an effect. See resolveBossDisplayName. */
export default function BossClearGrid({
  theme, character, entry, realEntry, view, onViewChange, selectedIndex, onSelectedIndexChange,
  levelOverride, arcaneForceOverride, authenticForceOverride, simulated, onOpenSimulator,
}: {
  theme: AppTheme;
  character: StoredCharacterRecord;
  entry: ScouterResultEntry;
  /** The character's real Scouter result, passed only while `simulated` is true, so the Quick
   *  View power strip can show each figure's (+X)/(-X) change from the real value. */
  realEntry?: ScouterResultEntry;
  view: ScouterBookmarkView;
  onViewChange: (v: ScouterBookmarkView) => void;
  selectedIndex: number;
  onSelectedIndexChange: (i: number) => void;
  /** From the Scouter Simulator popup's Level, Arcane Force and Sacred Power inputs, state
   *  ScouterBookmark owns rather than this component. A player-typed what-if used in place of
   *  the character's real values when set. There is no separate close-this-gap toggle, since
   *  typing the boss's own requirement already closes it, leaving computeBossClear's gap math
   *  a single honest calculation either way. */
  levelOverride?: number;
  arcaneForceOverride?: number;
  authenticForceOverride?: number;
  /** Whether a Scouter Simulator "what if" is currently applied. Swaps the Quick View filter
   *  row's launcher button label from "Simulator" to "Edit". */
  simulated: boolean;
  /** Opens the Scouter Simulator popup. Rendered in Quick View's filter row, where the old
   *  single Full HEXA toggle sat, rather than as a separate control bar, so it doesn't add a
   *  new row to the bookmark. */
  onOpenSimulator: () => void;
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

  const level = levelOverride ?? character.level;
  const arcaneForce = arcaneForceOverride ?? (Number(character.stats.arcanePower) || 0);
  const authenticForce = authenticForceOverride ?? (Number(character.stats.sacredPower) || 0);

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
          realEntry={realEntry}
          grouped={grouped}
          filter={filter}
          onFilterChange={setFilter}
          level={level}
          arcaneForce={arcaneForce}
          authenticForce={authenticForce}
          inputs={inputs}
          onSelectBoss={handleSelectBoss}
          simulated={simulated}
          onOpenSimulator={onOpenSimulator}
        />
      )}
      {view === "spotlight" && (
        <BossSpotlight
          theme={theme}
          grouped={grouped}
          selectedIndex={clampedIndex}
          onNavigate={onSelectedIndexChange}
          level={level}
          arcaneForce={arcaneForce}
          authenticForce={authenticForce}
          inputs={inputs}
          onBack={() => onViewChange("quickView")}
        />
      )}
    </div>
  );
}
