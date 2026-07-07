"use client";

import { useMemo, useRef, useState, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../hooks/usePickerCoords";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import { searchAndRank } from "../../../../lib/searchMatch";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { readCharactersStore, selectCharacterByIgn } from "../../model/charactersStore";
import {
  TIER_LABELS, TIER_ORDER, getLinesForTier, BADGE_NAMES, BADGE_ID_MAP,
  FAMILIARS, getFamiliarDisplayLabel,
  type FamiliarTier, type FamiliarEntry,
} from "../data/familiarsData";
import { resourceImageUrl, familiarBadgeUrl } from "../../../../lib/mapleResource";
import SetupStepFrame from "./SetupStepFrame";
import { CopyFromPreset } from "./CopyFromPreset";

// ── Types ──────────────────────────────────────────────────────────────────

interface FamiliarSlot {
  familiarId: number | null;
  mobId: string;
  name: string;
  tier: FamiliarTier | "";
  line1: string;
  line2: string;
}

interface FamiliarPreset {
  familiars: FamiliarSlot[];
  badges: string[];
}

interface FamiliarsValue {
  presets: FamiliarPreset[];
}

interface FamiliarsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  confirmedCharacterName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PRESET_COUNT = 5;
const SLOT_COUNT = 3;
const BADGE_COUNT = 8;
const VALID_TIERS = new Set<string>(TIER_ORDER);

const FAM_CARD_SIZE = 64;
const FAM_LIST_SIZE = 32;
const BADGE_SIZE = 52;
const BADGE_BORDER = 4;
const PENTAGON = "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)";

const TIER_COLORS: Record<FamiliarTier, { bg: string; border: string; text: string }> = {
  common:    { bg: "#2a2a2a", border: "#777",    text: "#ccc" },
  rare:      { bg: "#0d1e38", border: "#4080c0", text: "#6ab4ff" },
  epic:      { bg: "#1e0d38", border: "#8040c0", text: "#c084fc" },
  unique:    { bg: "#2a1e00", border: "#c08020", text: "#fbbf24" },
  legendary: { bg: "#001e10", border: "#20a040", text: "#4ade80" },
};


// ── Parse / patch helpers ──────────────────────────────────────────────────

function emptySlot(): FamiliarSlot {
  return { familiarId: null, mobId: "", name: "", tier: "", line1: "", line2: "" };
}

function emptyPreset(): FamiliarPreset {
  return {
    familiars: Array.from({ length: SLOT_COUNT }, emptySlot),
    badges: Array<string>(BADGE_COUNT).fill(""),
  };
}

function emptyValue(): FamiliarsValue {
  return { presets: Array.from({ length: PRESET_COUNT }, emptyPreset) };
}

function parseSlot(raw: unknown): FamiliarSlot {
  if (!raw || typeof raw !== "object") return emptySlot();
  const r = raw as Record<string, unknown>;
  const tier = typeof r.tier === "string" && VALID_TIERS.has(r.tier) ? (r.tier as FamiliarTier) : "";
  const familiarId = typeof r.familiarId === "number" ? r.familiarId : null;
  const storedMobId = typeof r.mobId === "string" ? r.mobId : "";
  const mobId = storedMobId || (familiarId !== null ? (FAMILIARS.find((f) => f.id === familiarId)?.mobId ?? "") : "");
  return {
    familiarId,
    mobId,
    name: typeof r.name === "string" ? r.name : "",
    tier,
    line1: typeof r.line1 === "string" ? r.line1 : "",
    line2: typeof r.line2 === "string" ? r.line2 : "",
  };
}

function parsePreset(raw: unknown): FamiliarPreset {
  if (!raw || typeof raw !== "object") return emptyPreset();
  const r = raw as Record<string, unknown>;
  const rawFamiliars = Array.isArray(r.familiars) ? (r.familiars as unknown[]) : [];
  const rawBadges = Array.isArray(r.badges) ? (r.badges as unknown[]) : [];
  return {
    familiars: Array.from({ length: SLOT_COUNT }, (_, i) => parseSlot(rawFamiliars[i])),
    badges: Array.from({ length: BADGE_COUNT }, (_, i) =>
      typeof rawBadges[i] === "string" ? (rawBadges[i] as string) : "",
    ),
  };
}

function parseValue(raw: string): FamiliarsValue {
  if (!raw) return emptyValue();
  try {
    const parsed = JSON.parse(raw) as { presets?: unknown[] };
    if (!parsed?.presets || !Array.isArray(parsed.presets)) return emptyValue();
    return { presets: Array.from({ length: PRESET_COUNT }, (_, i) => parsePreset(parsed.presets![i])) };
  } catch { return emptyValue(); }
}

function patchSlot(value: FamiliarsValue, pi: number, si: number, patch: Partial<FamiliarSlot>): FamiliarsValue {
  return {
    presets: value.presets.map((preset, pIdx) => pIdx !== pi ? preset : {
      ...preset,
      familiars: preset.familiars.map((slot, sIdx) => sIdx !== si ? slot : { ...slot, ...patch }),
    }),
  };
}

function patchBadge(value: FamiliarsValue, pi: number, bi: number, val: string): FamiliarsValue {
  return {
    presets: value.presets.map((preset, pIdx) => pIdx !== pi ? preset : {
      ...preset,
      badges: preset.badges.map((b, bIdx) => bIdx !== bi ? b : val),
    }),
  };
}

const FAM_PICKER_WIDTH = 220;
const BADGE_PICKER_WIDTH = 200;
const LINE_PICKER_WIDTH = 240;

// ── Shared styles ──────────────────────────────────────────────────────────

const searchInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: "0.78rem",
  fontWeight: 600,
  padding: "0.3rem 0.5rem",
  outline: "none",
  border: "1px solid",
};

const lineSelectStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "0.25rem 0.4rem",
  border: "1px solid",
};

const popoverVisualStyle: CSSProperties = {
  borderRadius: 10,
  boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
  overflow: "hidden",
};

type TierColor = { bg: string; border: string; text: string };

const clearRowStyle = (theme: AppTheme): CSSProperties => ({
  display: "block", width: "100%", padding: "0.3rem 0.6rem",
  background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
});

const lineOptionStyle = (theme: AppTheme, isHighlighted: boolean): CSSProperties => ({
  display: "block", width: "100%", padding: "0.3rem 0.5rem",
  background: isHighlighted ? `${theme.accent}22` : "transparent",
  border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: "0.75rem", fontWeight: 600, color: theme.text, textAlign: "left",
});

const tierBackButtonStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6,
  background: "transparent", border: "none", cursor: "pointer",
  color: theme.muted, fontFamily: "inherit", fontSize: "0.75rem",
  fontWeight: 700, padding: "0.1rem 0", marginBottom: 2,
});

const tierOptionStyle = (theme: AppTheme, c: TierColor, isHighlighted: boolean): CSSProperties => ({
  background: c.bg, border: `1px solid ${c.border}`, color: c.text,
  borderRadius: 6, padding: "0.3rem 0.6rem",
  fontWeight: 700, fontSize: "0.8rem", fontFamily: "inherit",
  cursor: "pointer", textAlign: "left",
  boxShadow: isHighlighted ? `0 0 0 2px ${theme.accent}` : "none",
});

const selectedFamiliarRowStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.4rem 0.6rem", border: "none", borderBottom: `1px solid ${theme.border}`,
  background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
});

const tierBadgeStyle = (c: TierColor): CSSProperties => ({
  flexShrink: 0, padding: "0.1rem 0.4rem", borderRadius: 4,
  fontSize: "0.75rem", fontWeight: 800,
  background: c.bg, border: `1px solid ${c.border}`, color: c.text,
});

const familiarOptionStyle = (theme: AppTheme, isHighlighted: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8,
  width: "100%", padding: "0.3rem 0.6rem",
  background: isHighlighted ? `${theme.accent}22` : "transparent", border: "none",
  borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
});

const badgeOptionStyle = (theme: AppTheme, isHighlighted: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6,
  width: "100%", padding: "0.3rem 0.6rem",
  background: isHighlighted ? `${theme.accent}22` : "transparent", border: "none",
  borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  textAlign: "left",
  fontSize: "0.75rem", fontWeight: 600, color: theme.text,
});

const presetSquareStyle = (theme: AppTheme, active: boolean): CSSProperties => ({
  width: 32, height: 32, borderRadius: 7, padding: 0,
  border: `2px solid ${active ? theme.accent : theme.border}`,
  background: active ? theme.accent : "transparent",
  color: active ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  cursor: "pointer",
});

// ── Familiar card sprite: mob → familiar → card icon → "?" placeholder ─────
// Sequential fallback chain (per CLAUDE.md image policy: swap via onError, no
// re-render). A single <img> walks the candidate list one request at a time —
// on error it advances its src to the next source, and once exhausted it hides
// itself and reveals the "?" placeholder. This is terminal: a fully spriteless
// familiar (e.g. False Daimyo) settles on its card icon or the "?" instead of
// re-fetching a broken URL forever. `key` remounts a fresh chain per slot.

function FamiliarCardSprite({ mobId, familiarId, cardId, size, theme }: { mobId: string; familiarId: number | null; cardId: string; size: number; theme: AppTheme }) {
  const sources = [
    resourceImageUrl("mob", mobId, "sprite.png"),
    // "familiar" sprites are keyed by the familiar's OWN id, not mobId — these are
    // "direct sprite" familiars (spriteFrom: "familiar") with no real monster to
    // borrow a mob sprite from.
    ...(familiarId !== null ? [resourceImageUrl("familiar", String(familiarId), "sprite.png")] : []),
    ...(cardId ? [resourceImageUrl("item", cardId, "icon.png")] : []),
  ];
  return (
    <span style={{ width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${mobId}/${familiarId}/${cardId}`}
        src={sources[0]}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "contain", width: size, height: size, display: "block" }}
        onError={(e) => {
          const img = e.currentTarget;
          const next = Number(img.dataset.step ?? "0") + 1;
          if (next < sources.length) {
            img.dataset.step = String(next);
            img.src = sources[next];
          } else {
            img.style.display = "none";
            const ph = img.nextElementSibling as HTMLElement | null;
            if (ph) ph.style.display = "block";
          }
        }}
      />
      <span aria-hidden style={{ display: "none", fontSize: size * 0.5, fontWeight: 300, lineHeight: 1, color: theme.muted }}>?</span>
    </span>
  );
}

// ── Line picker ───────────────────────────────────────────────────────────

function LinePicker({ id, openId, onToggle, onClose, value, tier, placeholder, theme, onChange }: {
  id: string;
  openId: string | null;
  onToggle: () => void;
  onClose: () => void;
  value: string;
  tier: FamiliarTier;
  placeholder: string;
  theme: AppTheme;
  onChange: (val: string) => void;
}) {
  const isOpen = openId === id;
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, LINE_PICKER_WIDTH);
  const lines = getLinesForTier(tier);
  const options = lines.filter((l) => l !== value);
  const filtered = query ? searchAndRank(options, query, (l) => l) : options;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function select(line: string) {
    onChange(line);
    onClose();
  }

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (line) => select(line),
    onClose,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Backspace" && query === "" && value) {
      e.preventDefault();
      select("");
      return;
    }
    navKeyDown(e);
  }

  const triggerStyle: CSSProperties = {
    ...lineSelectStyle,
    borderColor: theme.border,
    background: theme.bg,
    color: value ? theme.text : theme.muted,
    textAlign: "left",
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  };

  const pickerStyle: CSSProperties = {
    ...popoverVisualStyle,
    position: "absolute",
    top: 0,
    left: 0,
    width: LINE_PICKER_WIDTH,
    zIndex: 310,
    background: theme.panel,
    border: `1px solid ${theme.accent}`,
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) setQuery("");
          onToggle();
        }}
        title={value || placeholder}
        style={triggerStyle}
      >
        {value || placeholder}
      </button>
      {isOpen && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={pickerStyle}
        >
          {value && (
            <div style={{ padding: "0.4rem 0.6rem", borderBottom: `1px solid ${theme.border}` }}>
              <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: theme.muted }}>Currently Selected</p>
              <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.text }}>{value}</p>
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => select("")}
              style={clearRowStyle(theme)}
            >
              — Clear —
            </button>
          )}
          <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search potential lines"
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.map((line, i) => (
              <button
                key={line}
                ref={itemRef(i)}
                type="button"
                onClick={() => select(line)}
                style={lineOptionStyle(theme, i === highlightedIndex)}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {line}
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                No results
              </p>
            )}
          </div>
        </div>,
        document.body!
      )}
    </div>
  );
}

// ── Familiar slot card ─────────────────────────────────────────────────────

// Same-name entries that render a pixel-identical sprite (e.g. periodic card
// reissues) are excluded from search — they'd otherwise show as two indistinguishable
// results. The "duplicate" entry stays in FAMILIARS itself so an already-saved
// character that picked one still resolves correctly via FAMILIARS.find().
const SELECTABLE_FAMILIARS = FAMILIARS.filter((f) => f.duplicateOf === undefined);

function filterFamiliars(query: string, excludeId: number | null): FamiliarEntry[] {
  const pool = excludeId == null ? SELECTABLE_FAMILIARS : SELECTABLE_FAMILIARS.filter((f) => f.id !== excludeId);
  if (!query.trim()) return pool.slice(0, 50);
  return searchAndRank(pool, query, getFamiliarDisplayLabel).slice(0, 50);
}

const slotCardBase: CSSProperties = {
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0.75rem 0.5rem 0.6rem",
  gap: "0.4rem",
  cursor: "pointer",
  minHeight: 140,
  transition: "border-color 0.12s",
  userSelect: "none",
};

function TierPickerView({ entry, theme, onBack, onSelect }: {
  entry: FamiliarEntry;
  theme: AppTheme;
  onBack: () => void;
  onSelect: (tier: FamiliarTier) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { containerRef.current?.focus(); }, []);

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: TIER_ORDER,
    resetKey: entry.id,
    onSelect: (t) => onSelect(t),
  });

  function handleContainerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onBack(); return; }
    navKeyDown(e);
  }

  return (
    <div ref={containerRef} tabIndex={-1} onKeyDown={handleContainerKeyDown}
      style={{ padding: "0.5rem 0.6rem", display: "flex", flexDirection: "column", gap: 5, outline: "none" }}>
      <button
        type="button"
        onClick={onBack}
        style={tierBackButtonStyle(theme)}
      >
        ← {getFamiliarDisplayLabel(entry)}
      </button>
      <p style={{ margin: "0 0 2px", fontSize: "0.75rem", color: theme.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Pick rarity
      </p>
      {TIER_ORDER.map((t, i) => {
        const c = TIER_COLORS[t];
        return (
          <button
            key={t}
            ref={itemRef(i)}
            type="button"
            onClick={() => onSelect(t)}
            style={tierOptionStyle(theme, c, i === highlightedIndex)}
          >
            {TIER_LABELS[t]}
          </button>
        );
      })}
    </div>
  );
}

function FamiliarSlotCard({
  slot, slotId, openId, query, pendingEntry, theme,
  onOpen, onQueryChange, onSelect, onClear, onLineChange, onSetPending,
  onTogglePicker, onClosePicker,
}: {
  slot: FamiliarSlot;
  slotId: string;
  openId: string | null;
  query: string;
  pendingEntry: FamiliarEntry | null;
  theme: AppTheme;
  onOpen: () => void;
  onQueryChange: (q: string) => void;
  onSelect: (entry: FamiliarEntry, tier: FamiliarTier) => void;
  onClear: () => void;
  onLineChange: (field: "line1" | "line2", val: string) => void;
  onSetPending: (entry: FamiliarEntry | null) => void;
  onTogglePicker: (id: string) => void;
  onClosePicker: () => void;
}) {
  const isOpen = openId === slotId;
  const isEmpty = !slot.name;
  const displayName = slot.name.replace(/ Familiar$/i, "");
  const matchedEntry = FAMILIARS.find((f) => f.id === slot.familiarId);
  const cardId = matchedEntry?.cardId ?? "";
  const spriteMobId = matchedEntry?.spriteMobId ?? slot.mobId;
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, FAM_PICKER_WIDTH);
  const filtered = useMemo(() => isOpen ? filterFamiliars(query, slot.familiarId) : [], [isOpen, query, slot.familiarId]);
  useEffect(() => {
    if (isOpen && !pendingEntry) inputRef.current?.focus();
  }, [isOpen, pendingEntry]);

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (entry) => onSetPending(entry),
    onClose: onClosePicker,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Backspace" && query === "" && !isEmpty) {
      e.preventDefault();
      onClear();
      return;
    }
    navKeyDown(e);
  }

  const tierBorderColor = slot.tier ? TIER_COLORS[slot.tier].border : null;
  const cardStyle: CSSProperties = {
    ...slotCardBase,
    borderWidth: isOpen ? 2 : 1,
    borderColor: isOpen ? theme.accent : (tierBorderColor ?? theme.border),
    borderStyle: isEmpty && !isOpen ? "dashed" : "solid",
    background: isEmpty ? "transparent" : theme.panel,
    justifyContent: isEmpty ? "center" : "flex-start",
  };


  const pickerStyle: CSSProperties = {
    ...popoverVisualStyle,
    position: "absolute",
    top: 0,
    left: 0,
    width: FAM_PICKER_WIDTH,
    zIndex: 300,
    background: theme.panel,
    border: `1px solid ${theme.accent}`,
  };

  return (
    <div ref={wrapperRef} style={{ flex: 1, minWidth: 0, position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => { onOpen(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        style={cardStyle}
      >
        {isEmpty ? (
          <span style={{ fontSize: 24, color: theme.muted, lineHeight: 1, fontWeight: 300 }}>+</span>
        ) : (
          <>
            <HoverTooltip label={displayName} theme={theme}>
              <FamiliarCardSprite mobId={spriteMobId} familiarId={slot.familiarId} cardId={cardId} size={FAM_CARD_SIZE} theme={theme} />
            </HoverTooltip>
            {slot.tier && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                <LinePicker
                  id={`${slotId}-line1`}
                  openId={openId}
                  onToggle={() => onTogglePicker(`${slotId}-line1`)}
                  onClose={onClosePicker}
                  value={slot.line1}
                  tier={slot.tier}
                  placeholder="Line 1…"
                  theme={theme}
                  onChange={(v) => onLineChange("line1", v)}
                />
                <LinePicker
                  id={`${slotId}-line2`}
                  openId={openId}
                  onToggle={() => onTogglePicker(`${slotId}-line2`)}
                  onClose={onClosePicker}
                  value={slot.line2}
                  tier={slot.tier}
                  placeholder="Line 2…"
                  theme={theme}
                  onChange={(v) => onLineChange("line2", v)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {isOpen && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={pickerStyle}
        >
          {!isEmpty && !pendingEntry && (
            <button
              type="button"
              onClick={() => {
                const entry = FAMILIARS.find((f) => f.id === slot.familiarId);
                if (entry) onSetPending(entry);
              }}
              style={selectedFamiliarRowStyle(theme)}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <FamiliarCardSprite mobId={spriteMobId} familiarId={slot.familiarId} cardId={cardId} size={28} theme={theme} />
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: theme.muted }}>Currently Selected</p>
                <p title={displayName} style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
              </div>
              {slot.tier && (
                <span style={tierBadgeStyle(TIER_COLORS[slot.tier])}>
                  {TIER_LABELS[slot.tier]}
                </span>
              )}
              <span style={{ flexShrink: 0, color: theme.muted, fontSize: "0.85rem" }}>›</span>
            </button>
          )}
          {!isEmpty && !pendingEntry && (
            <button
              type="button"
              onClick={onClear}
              style={clearRowStyle(theme)}
            >
              — Clear slot —
            </button>
          )}
          {pendingEntry ? (
            <TierPickerView
              entry={pendingEntry}
              theme={theme}
              onBack={() => onSetPending(null)}
              onSelect={(tier) => { onSelect(pendingEntry, tier); }}
            />
          ) : (
            <>
              <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="Search familiars"
                  value={query}
                  placeholder="Search familiars…"
                  onChange={(e) => onQueryChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={handleSearchKeyDown}
                  style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
                />
              </div>
              {query && <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {filtered.length === 0 && (
                  <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                    No results
                  </p>
                )}
                {filtered.map((entry, i) => (
                  <button
                    key={entry.id}
                    ref={itemRef(i)}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSetPending(entry); }}
                    title={getFamiliarDisplayLabel(entry)}
                    style={familiarOptionStyle(theme, i === highlightedIndex)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <FamiliarCardSprite mobId={entry.spriteMobId ?? entry.mobId} familiarId={entry.id} cardId={entry.cardId} size={FAM_LIST_SIZE} theme={theme} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getFamiliarDisplayLabel(entry)}
                    </span>
                  </button>
                ))}
              </div>}
            </>
          )}
        </div>,
        document.body!
      )}
    </div>
  );
}

// ── Badge slot (pentagon) ──────────────────────────────────────────────────

function filterBadges(query: string, excluded: ReadonlySet<string>): readonly string[] {
  const available = BADGE_NAMES.filter((n) => !excluded.has(n));
  if (!query.trim()) return available;
  return searchAndRank(available, query, (n) => n);
}

function BadgeSlot({
  badge, slotId, openId, query, theme, usedBadges,
  onOpen, onQueryChange, onSelect, onClear, onClosePicker,
}: {
  badge: string;
  slotId: string;
  openId: string | null;
  query: string;
  theme: AppTheme;
  usedBadges: ReadonlySet<string>;
  onOpen: () => void;
  onQueryChange: (q: string) => void;
  onSelect: (name: string) => void;
  onClear: () => void;
  onClosePicker: () => void;
}) {
  const isOpen = openId === slotId;
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, BADGE_PICKER_WIDTH);
  const filtered = useMemo(() => isOpen ? filterBadges(query, usedBadges) : [], [isOpen, query, usedBadges]);
  const outerSize = BADGE_SIZE + BADGE_BORDER * 2;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (name) => onSelect(name),
    onClose: onClosePicker,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && query === "" && badge) {
      e.preventDefault();
      onClear();
      return;
    }
    navKeyDown(e);
  }

  const emptyBg = isOpen ? theme.accent : `${theme.muted}28`;
  const badgePickerStyle: CSSProperties = {
    ...popoverVisualStyle,
    position: "absolute",
    top: 0,
    left: 0,
    width: BADGE_PICKER_WIDTH,
    zIndex: 300,
    background: theme.panel,
    border: `1px solid ${theme.accent}`,
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        title={badge || "Add badge"}
        aria-label={badge || "Add badge"}
        onClick={() => { onOpen(); }}
        style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
      >
        <div style={{ width: outerSize, height: outerSize, clipPath: PENTAGON, background: emptyBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {badge ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={familiarBadgeUrl(BADGE_ID_MAP[badge])}
              alt={badge}
              width={outerSize}
              height={outerSize}
              style={{ objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={{ fontSize: 18, color: theme.muted, lineHeight: 1 }}>+</span>
          )}
        </div>
      </button>
      {isOpen && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={badgePickerStyle}
        >
          {badge && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0.4rem 0.6rem", borderBottom: `1px solid ${theme.border}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={familiarBadgeUrl(BADGE_ID_MAP[badge])} alt="" width={28} height={28} style={{ objectFit: "contain", flexShrink: 0 }} />
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: theme.muted }}>Currently Selected</p>
                <p title={badge} style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{badge}</p>
              </div>
            </div>
          )}
          {badge && (
            <button
              type="button"
              onClick={onClear}
              style={clearRowStyle(theme)}
            >
              — Clear slot —
            </button>
          )}
          <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search badges"
              value={query}
              placeholder="Search badges…"
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                No results
              </p>
            )}
            {filtered.map((name, i) => (
              <button
                key={name}
                ref={itemRef(i)}
                type="button"
                onClick={() => onSelect(name)}
                style={badgeOptionStyle(theme, i === highlightedIndex)}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={familiarBadgeUrl(BADGE_ID_MAP[name])} alt="" width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} />
                {name}
              </button>
            ))}
          </div>
        </div>,
        document.body!
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FamiliarsSetupStep({
  theme, step, stepNumber, totalSteps, confirmedCharacterName, value, onChange, onBack, onNext, onFinish,
}: FamiliarsSetupStepProps) {
  const [activePreset, setActivePreset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pendingFamiliar, setPendingFamiliar] = useState<FamiliarEntry | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (initialValueRef.current) return;
    if (!confirmedCharacterName) return;
    const saved = selectCharacterByIgn(readCharactersStore(), confirmedCharacterName)?.familiars as FamiliarsValue | undefined;
    if (saved) onChange(JSON.stringify(saved));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openId) return;
    function handleMouseDown(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setOpenId(null);
        setPickerQuery("");
        setPendingFamiliar(null);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openId]);

  const parsed = parseValue(value);
  const preset = parsed.presets[activePreset];

  function openPicker(id: string) {
    setPickerQuery("");
    setPendingFamiliar(null);
    setOpenId((prev) => prev === id ? null : id);
  }

  function closePicker() {
    setOpenId(null);
    setPickerQuery("");
    setPendingFamiliar(null);
  }

  function copyPreset(from: number) {
    onChange(JSON.stringify({
      presets: parsed.presets.map((p, i) => i === activePreset ? parsed.presets[from] : p),
    }));
    closePicker();
  }

  function clearPreset() {
    onChange(JSON.stringify({
      presets: parsed.presets.map((p, i) => i === activePreset ? emptyPreset() : p),
    }));
    closePicker();
  }

  const badgeRowOffset = (BADGE_SIZE + BADGE_BORDER * 2 + 8) / 2;

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Choose your familiars and badges."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      {/* Preset tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.65rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>Preset</span>
        {Array.from({ length: PRESET_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActivePreset(i); closePicker(); }}
            style={presetSquareStyle(theme, i === activePreset)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <CopyFromPreset theme={theme} count={PRESET_COUNT} active={activePreset} onCopy={copyPreset} onClear={clearPreset} />
      </div>

      <div>
        {/* 3 familiar cards */}
        <div ref={zoneRef} style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
          {preset.familiars.map((slot, i) => {
            const slotId = `f${i}`;
            return (
              <FamiliarSlotCard
                key={`${activePreset}-${i}`}
                slot={slot}
                slotId={slotId}
                openId={openId}
                query={openId === slotId ? pickerQuery : ""}
                pendingEntry={openId === slotId ? pendingFamiliar : null}
                theme={theme}
                onOpen={() => openPicker(slotId)}
                onQueryChange={setPickerQuery}
                onSetPending={setPendingFamiliar}
                onSelect={(entry, tier) => {
                  onChange(JSON.stringify(patchSlot(parsed, activePreset, i, { familiarId: entry.id, mobId: entry.mobId, name: entry.name, tier, line1: "", line2: "" })));
                  closePicker();
                }}
                onClear={() => { onChange(JSON.stringify(patchSlot(parsed, activePreset, i, emptySlot()))); closePicker(); }}
                onLineChange={(field, val) => onChange(JSON.stringify(patchSlot(parsed, activePreset, i, { [field]: val })))}
                onTogglePicker={openPicker}
                onClosePicker={closePicker}
              />
            );
          })}
        </div>

        {/* Badge slots — staggered 4+4 like in-game */}
        <div>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Equipped Badges
          </p>
          {(() => {
            const usedBadges = new Set(preset.badges.filter(Boolean));
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {preset.badges.slice(0, 4).map((badge, i) => {
                    const slotId = `b${i}`;
                    return (
                      <BadgeSlot
                        key={i}
                        badge={badge}
                        slotId={slotId}
                        openId={openId}
                        query={openId === slotId ? pickerQuery : ""}
                        theme={theme}
                        usedBadges={usedBadges}
                        onOpen={() => openPicker(slotId)}
                        onQueryChange={setPickerQuery}
                        onSelect={(name) => { onChange(JSON.stringify(patchBadge(parsed, activePreset, i, name))); closePicker(); }}
                        onClear={() => { onChange(JSON.stringify(patchBadge(parsed, activePreset, i, ""))); closePicker(); }}
                        onClosePicker={closePicker}
                      />
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, marginLeft: badgeRowOffset }}>
                  {preset.badges.slice(4).map((badge, i) => {
                    const bi = i + 4;
                    const slotId = `b${bi}`;
                    return (
                      <BadgeSlot
                        key={bi}
                        badge={badge}
                        slotId={slotId}
                        openId={openId}
                        query={openId === slotId ? pickerQuery : ""}
                        theme={theme}
                        usedBadges={usedBadges}
                        onOpen={() => openPicker(slotId)}
                        onQueryChange={setPickerQuery}
                        onSelect={(name) => { onChange(JSON.stringify(patchBadge(parsed, activePreset, bi, name))); closePicker(); }}
                        onClear={() => { onChange(JSON.stringify(patchBadge(parsed, activePreset, bi, ""))); closePicker(); }}
                        onClosePicker={closePicker}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

    </SetupStepFrame>
  );
}
