"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import { searchAndRank } from "../../../../lib/searchMatch";
import { legionCrystalIconUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { StoredLegionArtifact } from "../../model/charactersStore";
import { usePickerCoords } from "../hooks/usePickerCoords";
import {
  CRYSTAL_STAT_SLOTS,
  LEGION_ARTIFACT_STATS,
  LEGION_CRYSTALS,
  MAX_ARTIFACT_LEVEL,
  MAX_CRYSTAL_LEVEL,
  MIN_CRYSTAL_LEVEL,
  DEFAULT_CRYSTAL_STATS,
  getLegionArtifactStat,
  isCrystalUnlocked,
  parseLegionArtifactBoardDraft,
  serializeLegionArtifactBoardDraft,
  type LegionArtifactStatId,
  type LegionCrystalDef,
  type LegionCrystalDraft,
} from "../data/legionArtifactData";
import SetupStepFrame from "./SetupStepFrame";

interface LegionArtifactsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  worldLegionArtifact?: StoredLegionArtifact;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const PICKER_WIDTH = 230;
const CARD_POPOVER_WIDTH = 240;
const CRYSTAL_TILE_SIZE = 116;
const CRYSTAL_TILE_SIZE_MOBILE = 100;
const CRYSTAL_ICON_SIZE = 80;
const EMPTY_CRYSTAL: LegionCrystalDraft = { level: MIN_CRYSTAL_LEVEL, stats: [...DEFAULT_CRYSTAL_STATS] };

// Keeps the value a string (blank until touched) instead of clamping through Number(),
// which would collapse a typed "0" back to an indistinguishable empty state.
function clampArtifactLevelInput(raw: string): string {
  const digits = sanitizeDigitsInput(raw);
  if (digits === "") return "";
  return String(Math.min(MAX_ARTIFACT_LEVEL, Number(digits)));
}

// ── Styles ────────────────────────────────────────────────────────────────────

function sectionLabelStyle(theme: AppTheme): CSSProperties {
  return {
    margin: "0 0 0.4rem", fontSize: "0.75rem", fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted,
  };
}

function levelInputStyle(theme: AppTheme, width: number): CSSProperties {
  return {
    width, textAlign: "center",
    border: `1px solid ${theme.border}`, borderRadius: 6,
    background: theme.bg, color: theme.text,
    fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
    padding: "0.25rem", boxSizing: "border-box",
  };
}

const crystalGridStyle: CSSProperties = {
  display: "grid", gap: "0.6rem",
};

const crystalIconImgStyle: CSSProperties = { width: "68%", height: "68%", borderRadius: 8, objectFit: "contain" };

function crystalTileStyle(theme: AppTheme, unlocked: boolean, isOpen: boolean): CSSProperties {
  return {
    position: "relative",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, border: `2px solid ${isOpen ? theme.accent : theme.border}`,
    background: unlocked ? theme.bg : `${theme.muted}0d`,
    opacity: unlocked ? 1 : 0.55,
    padding: 0, boxSizing: "border-box",
    cursor: unlocked ? "pointer" : "default",
    fontFamily: "inherit",
    transition: "border-color 0.12s",
  };
}

function crystalLockedBadgeStyle(theme: AppTheme): CSSProperties {
  return {
    fontSize: "0.75rem", fontWeight: 800, color: theme.muted,
    textTransform: "uppercase", letterSpacing: "0.03em",
  };
}

function pipDiamondStyle(theme: AppTheme, filled: boolean, size: number): CSSProperties {
  return {
    width: size, height: size, borderRadius: 1.5,
    background: filled ? theme.accent : "transparent",
    border: `1.5px solid ${filled ? theme.accent : theme.border}`,
    transform: "rotate(45deg)", boxSizing: "border-box", flexShrink: 0, display: "block",
  };
}

function statChipStyle(theme: AppTheme, filled: boolean): CSSProperties {
  return {
    width: "100%", textAlign: "left",
    border: `1px solid ${filled ? theme.accent : theme.border}`, borderRadius: 6,
    background: filled ? `${theme.accent}15` : theme.bg,
    color: filled ? theme.accent : theme.muted,
    fontFamily: "inherit", fontWeight: 700, fontSize: "0.75rem",
    padding: "0.25rem 0.4rem", cursor: "pointer",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    boxSizing: "border-box",
  };
}

const popoverShellStyle: CSSProperties = {
  position: "absolute", width: PICKER_WIDTH, borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)", overflow: "hidden", zIndex: 50,
};

const statSearchInputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: 6,
  fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 600,
  padding: "0.3rem 0.5rem", outline: "none", border: "1px solid",
};

const cardPopoverShellStyle: CSSProperties = {
  position: "absolute", width: CARD_POPOVER_WIDTH, borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 45,
  padding: "0.6rem 0.6rem 0.7rem", boxSizing: "border-box",
};

function cardPopoverTitleStyle(theme: AppTheme): CSSProperties {
  return { margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 800, color: theme.text };
}

const levelRowStyle: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem",
};

function levelRowLabelStyle(theme: AppTheme): CSSProperties {
  return { fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em" };
}

function popoverOptionBackground(theme: AppTheme, active: boolean, isHighlighted: boolean): string {
  if (active) return `${theme.accent}33`;
  if (isHighlighted) return `${theme.accent}22`;
  return "transparent";
}

function popoverOptionStyle(theme: AppTheme, active: boolean, isHighlighted: boolean): CSSProperties {
  return {
    display: "block", width: "100%", textAlign: "left",
    background: popoverOptionBackground(theme, active, isHighlighted), border: "none",
    color: theme.text, fontFamily: "inherit", fontWeight: 600, fontSize: "0.78rem",
    padding: "0.4rem 0.6rem", cursor: "pointer",
  };
}

function popoverClearRowStyle(theme: AppTheme): CSSProperties {
  return {
    display: "block", width: "100%", textAlign: "left",
    background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
    color: theme.muted, fontFamily: "inherit", fontWeight: 700, fontSize: "0.75rem",
    padding: "0.4rem 0.6rem", cursor: "pointer",
  };
}

// ── Level pips (5-diamond indicator, mirrors the in-game crystal card) ─────────

function LevelPipsStatic({ level, theme }: { level: number; theme: AppTheme }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: MAX_CRYSTAL_LEVEL }, (_, i) => (
        <span key={i} style={pipDiamondStyle(theme, i < level, 7)} />
      ))}
    </div>
  );
}

// Hovering previews the level a click would set (star-rating convention), since a bare
// diamond row otherwise gives no hint that it's clickable.
function LevelPipsEditable({ level, theme, onSetLevel }: { level: number; theme: AppTheme; onSetLevel: (level: number) => void }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeCount = hoverIndex !== null ? hoverIndex + 1 : level;
  return (
    <div style={{ display: "flex", gap: 2 }} onMouseLeave={() => setHoverIndex(null)}>
      {Array.from({ length: MAX_CRYSTAL_LEVEL }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Set level to ${i + 1}`}
          onMouseEnter={() => setHoverIndex(i)}
          onClick={() => onSetLevel(i + 1)}
          style={{ background: "none", border: "none", padding: 4, cursor: "pointer" }}
        >
          <span style={pipDiamondStyle(theme, i < activeCount, 12)} />
        </button>
      ))}
    </div>
  );
}

// ── Stat slot chip (opens a popover to pick one of the 16 stats) ───────────────

function StatSlotChip({
  crystalIndex, slotIndex, statId, excludeIds, openId, theme, onToggle, onClose, onAdvance, onPrev, onNext, onPick,
}: {
  crystalIndex: number;
  slotIndex: number;
  statId: LegionArtifactStatId | null;
  excludeIds: ReadonlySet<LegionArtifactStatId>;
  openId: string | null;
  theme: AppTheme;
  onToggle: () => void;
  onClose: () => void;
  /** Called (instead of onClose) after an actual pick — opens the next stat slot in the
   *  crystal, or (on the last slot) jumps to the next unlocked crystal's first slot. Lets a
   *  whole board be filled without re-clicking each chip. viaKeyboard distinguishes an
   *  Enter-driven pick from a mouse click — only a keyboard pick jumps crystals, since a
   *  mouse click means the user's cursor is staying local. */
  onAdvance: (viaKeyboard: boolean) => void;
  onPrev?: () => void;
  /** Tab (no pick) — moves to the next slot untouched; on the last slot, jumps to the
   *  next unlocked crystal's first slot. */
  onNext?: () => void;
  onPick: (statId: LegionArtifactStatId | null) => void;
}) {
  const pickerId = `${crystalIndex}-${slotIndex}`;
  const isOpen = openId === pickerId;
  const { ref, portalRef } = usePickerCoords(isOpen, PICKER_WIDTH);
  const def = statId ? getLegionArtifactStat(statId) : undefined;
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const options = LEGION_ARTIFACT_STATS.filter((s) => !excludeIds.has(s.id) || s.id === statId);
  const filtered = useMemo(
    () => query.trim() ? searchAndRank(options, query, (o) => o.label) : options,
    [options, query],
  );

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (opt) => { onPick(opt.id); onAdvance(true); },
    onClose,
    onPrev,
    onNext,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Backspace" && query === "" && def) {
      e.preventDefault();
      onPick(null);
      onClose();
      return;
    }
    navKeyDown(e);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        data-legion-trigger
        aria-label={`Crystal ${crystalIndex + 1} stat slot ${slotIndex + 1}`}
        onClick={(e) => { e.stopPropagation(); if (!isOpen) { setQuery(""); } onToggle(); }}
        style={statChipStyle(theme, Boolean(def))}
      >
        {def ? def.label : "+ Pick stat"}
      </button>
      {isOpen && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ ...popoverShellStyle, background: theme.panel, border: `1px solid ${theme.accent}` }}
        >
          {def && (
            <button type="button" onClick={() => { onPick(null); onClose(); }} style={popoverClearRowStyle(theme)}>
              — Clear —
            </button>
          )}
          <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search stats"
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ ...statSearchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.map((opt, i) => (
              <button
                key={opt.id}
                ref={itemRef(i)}
                type="button"
                onClick={() => { onPick(opt.id); onAdvance(false); }}
                style={popoverOptionStyle(theme, opt.id === statId, i === highlightedIndex)}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
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

// ── Crystal tile (icon-only card; click opens the level + stat-lines popover) ──

function CrystalTile({
  index, def, crystal, unlocked, isCardOpen, nestedOpenId, theme,
  onToggleCard, onSetLevel, onSetStat, onToggleSlot, onClosePicker, onNextCard,
}: {
  index: number;
  def: LegionCrystalDef;
  crystal: LegionCrystalDraft;
  unlocked: boolean;
  isCardOpen: boolean;
  nestedOpenId: string | null;
  theme: AppTheme;
  onToggleCard: () => void;
  onSetLevel: (level: number) => void;
  onSetStat: (slotIndex: number, statId: LegionArtifactStatId | null) => void;
  onToggleSlot: (slotIndex: number) => void;
  onClosePicker: () => void;
  /** Tab from the last stat slot jumps here — opens the next unlocked crystal's first
   *  slot directly. */
  onNextCard: () => void;
}) {
  const level = Math.max(MIN_CRYSTAL_LEVEL, crystal.level ?? MIN_CRYSTAL_LEVEL);
  const stats = crystal.stats ?? DEFAULT_CRYSTAL_STATS;
  const usedIds = new Set(stats.filter((s): s is LegionArtifactStatId => Boolean(s)));
  const { ref, portalRef } = usePickerCoords(isCardOpen, CARD_POPOVER_WIDTH);
  const iconSrc = legionCrystalIconUrl(index, Math.max(0, level - 1), unlocked ? "icon" : "disabled");

  if (!unlocked) {
    return (
      <div className="legion-crystal-tile" style={crystalTileStyle(theme, false, false)} title={`${def.name} — Lv ${def.requiredArtifactLevel}+ required`}>
        <Image src={iconSrc} alt="" width={CRYSTAL_ICON_SIZE} height={CRYSTAL_ICON_SIZE} unoptimized style={crystalIconImgStyle} />
        <span style={crystalLockedBadgeStyle(theme)}>Lv {def.requiredArtifactLevel}+</span>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="legion-crystal-tile"
        data-legion-trigger
        title={def.name}
        aria-label={`${def.name}, level ${level}`}
        onClick={(e) => { e.stopPropagation(); onToggleCard(); }}
        style={crystalTileStyle(theme, true, isCardOpen)}
      >
        <LevelPipsStatic level={level} theme={theme} />
        <Image src={iconSrc} alt="" width={CRYSTAL_ICON_SIZE} height={CRYSTAL_ICON_SIZE} unoptimized style={crystalIconImgStyle} />
      </button>
      {isCardOpen && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ ...cardPopoverShellStyle, background: theme.panel, border: `1px solid ${theme.accent}` }}
        >
          <p style={cardPopoverTitleStyle(theme)}>{def.name}</p>
          <div style={levelRowStyle}>
            <span style={levelRowLabelStyle(theme)}>Level</span>
            <LevelPipsEditable level={level} theme={theme} onSetLevel={onSetLevel} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Array.from({ length: CRYSTAL_STAT_SLOTS }, (_, slotIndex) => slotIndex).map((slotIndex) => (
              <StatSlotChip
                key={slotIndex}
                crystalIndex={index}
                slotIndex={slotIndex}
                statId={stats[slotIndex] ?? null}
                excludeIds={usedIds}
                openId={nestedOpenId}
                theme={theme}
                onToggle={() => onToggleSlot(slotIndex)}
                onClose={onClosePicker}
                // Only a keyboard pick (Enter) advances — a mouse click means the user's
                // cursor is staying local, so just close for them either way.
                onAdvance={(viaKeyboard) => {
                  if (!viaKeyboard) { onClosePicker(); return; }
                  if (slotIndex < CRYSTAL_STAT_SLOTS - 1) { onToggleSlot(slotIndex + 1); } else { onNextCard(); }
                }}
                onPrev={slotIndex > 0 ? () => onToggleSlot(slotIndex - 1) : undefined}
                onNext={slotIndex < CRYSTAL_STAT_SLOTS - 1 ? () => onToggleSlot(slotIndex + 1) : onNextCard}
                onPick={(statId) => onSetStat(slotIndex, statId)}
              />
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LegionArtifactsSetupStep({
  theme, step, stepNumber, totalSteps, worldLegionArtifact, value, onChange, onBack, onNext, onFinish,
}: LegionArtifactsSetupStepProps) {
  const draft = parseLegionArtifactBoardDraft(value);
  const artifactLevel = draft.artifactLevel
    ?? (worldLegionArtifact?.artifactLevel !== undefined ? String(worldLegionArtifact.artifactLevel) : "");
  const artifactLevelNum = Number(artifactLevel) || 0;
  const crystals: LegionCrystalDraft[] = draft.crystals
    ?? (worldLegionArtifact?.crystals as LegionCrystalDraft[] | undefined)
    ?? [];

  const [openCardIndex, setOpenCardIndex] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Closes both the open crystal card and its nested stat picker on outside clicks. Both
  // popovers are portaled straight to document.body (not nested inside any wrapping "zone"
  // element here) and already stop propagation on their own onMouseDown, so any mousedown
  // that reaches this listener is guaranteed to be outside them — no containment check
  // needed (a zoneRef-based one used to leave dead zones in the grid's blank space, e.g.
  // past the 3-column grid's fixed width inside its wider flex container). Trigger buttons
  // (crystal tiles, stat chips) are excluded too — they only stop propagation on `click`,
  // not `mousedown`, so without this exclusion this listener would force-close things a
  // moment before the trigger's own onClick runs, breaking its own open/close toggle (the
  // toggle's functional update would read the just-forced-null state and reopen instead).
  useEffect(() => {
    if (openCardIndex === null && !openId) return;
    function handleMouseDown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("[data-legion-trigger]")) return;
      setOpenCardIndex(null);
      setOpenId(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openCardIndex, openId]);

  function updateArtifactLevel(next: string) {
    onChange(serializeLegionArtifactBoardDraft({ artifactLevel: next, crystals }));
  }

  function updateCrystal(index: number, patch: Partial<LegionCrystalDraft>) {
    // Build a dense 9-length array (every slot filled) rather than writing into a
    // possibly-shorter array — leaving holes would serialize as `null` via
    // JSON.stringify, which every downstream reader would then have to guard against.
    const nextCrystals = LEGION_CRYSTALS.map((_, i) => crystals[i] ?? EMPTY_CRYSTAL);
    nextCrystals[index] = { ...nextCrystals[index], ...patch };
    onChange(serializeLegionArtifactBoardDraft({ artifactLevel, crystals: nextCrystals }));
  }

  function setCrystalStat(index: number, slotIndex: number, statId: LegionArtifactStatId | null) {
    const current = crystals[index] ?? EMPTY_CRYSTAL;
    const nextStats = [...(current.stats ?? DEFAULT_CRYSTAL_STATS)];
    nextStats[slotIndex] = statId;
    updateCrystal(index, { stats: nextStats });
  }

  function toggleCard(index: number) {
    setOpenCardIndex((cur) => (cur === index ? null : index));
    setOpenId(null);
  }

  function toggleSlot(index: number, slotIndex: number) {
    const id = `${index}-${slotIndex}`;
    setOpenId((cur) => (cur === id ? null : id));
  }

  // Reaching the end of a crystal's 3 stat slots — via Enter-picking the last one or via an
  // explicit Tab — only ever considers the next crystal in sequence (skipping over locked
  // placeholders, which aren't real targets), and only jumps in if it's still untouched
  // (level 1, stats still at the in-game default every crystal starts with — a crystal is
  // never truly "blank" once unlocked, so we can't check for empty/null stats). Barging into
  // a crystal someone already finished (e.g. while correcting an earlier one) would be more
  // surprising than helpful, so it just closes the nested picker instead.
  function goToNextCrystal(fromIndex: number) {
    for (let i = fromIndex + 1; i < LEGION_CRYSTALS.length; i++) {
      if (!isCrystalUnlocked(i, artifactLevelNum)) continue;
      const candidate = crystals[i] ?? EMPTY_CRYSTAL;
      const level = candidate.level ?? MIN_CRYSTAL_LEVEL;
      const stats = candidate.stats ?? DEFAULT_CRYSTAL_STATS;
      const isUntouched = level === MIN_CRYSTAL_LEVEL && DEFAULT_CRYSTAL_STATS.every((s, idx) => stats[idx] === s);
      if (isUntouched) {
        setOpenCardIndex(i);
        setOpenId(`${i}-0`);
      } else {
        setOpenId(null);
      }
      return;
    }
    setOpenId(null);
  }

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Set your Legion Artifact level and crystals."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <p style={{ margin: "0 0 1rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>
        These are shared across all characters on your world, and inherited automatically by new characters.
      </p>
      <div className="legion-artifacts-root" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 460 }}>
        <style>{`
          .legion-artifacts-root { container-type: inline-size; }
          .legion-crystal-grid { grid-template-columns: repeat(3, ${CRYSTAL_TILE_SIZE}px); }
          .legion-crystal-tile { width: ${CRYSTAL_TILE_SIZE}px; height: ${CRYSTAL_TILE_SIZE}px; }
          @container (max-width: 400px) {
            .legion-crystal-grid { grid-template-columns: repeat(3, ${CRYSTAL_TILE_SIZE_MOBILE}px); }
            .legion-crystal-tile { width: ${CRYSTAL_TILE_SIZE_MOBILE}px; height: ${CRYSTAL_TILE_SIZE_MOBILE}px; }
          }
        `}</style>
        <div>
          <p style={sectionLabelStyle(theme)}>Artifact Level</p>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Legion Artifact level"
            value={artifactLevel}
            placeholder="0"
            onChange={(e) => updateArtifactLevel(clampArtifactLevelInput(e.target.value))}
            onKeyDown={numericKeyDown}
            style={levelInputStyle(theme, 56)}
          />
        </div>

        <div className="legion-crystal-grid" style={crystalGridStyle}>
          {LEGION_CRYSTALS.map((def, index) => (
            <CrystalTile
              key={def.id}
              index={index}
              def={def}
              crystal={crystals[index] ?? EMPTY_CRYSTAL}
              unlocked={isCrystalUnlocked(index, artifactLevelNum)}
              isCardOpen={openCardIndex === index}
              nestedOpenId={openId}
              theme={theme}
              onToggleCard={() => toggleCard(index)}
              onSetLevel={(level) => updateCrystal(index, { level })}
              onSetStat={(slotIndex, statId) => setCrystalStat(index, slotIndex, statId)}
              onToggleSlot={(slotIndex) => toggleSlot(index, slotIndex)}
              onClosePicker={() => setOpenId(null)}
              onNextCard={() => goToNextCrystal(index)}
            />
          ))}
        </div>
      </div>
    </SetupStepFrame>
  );
}
