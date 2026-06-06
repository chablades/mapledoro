"use client";

import { useMemo, useRef, useState, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../hooks/usePickerCoords";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import {
  TIER_LABELS, TIER_ORDER, getLinesForTier, BADGE_NAMES, BADGE_ID_MAP,
  FAMILIARS, getFamiliarDisplayLabel,
  type FamiliarTier, type FamiliarEntry,
} from "../data/familiarsData";
import { ItemIcon } from "../../../../components/ResourceImage";
import { resourceImageUrl, familiarBadgeUrl } from "../../../../lib/mapleResource";
import SetupStepFrame from "./SetupStepFrame";

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

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesQuery(candidate: string, query: string): boolean {
  const norm = normalize(candidate);
  const tokens = query.trim().split(/\s+/).flatMap((t) => { const n = normalize(t); return n ? [n] : []; });
  return tokens.length > 0 && tokens.every((t) => norm.includes(t));
}

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

// ── Familiar card sprite: mob primary, familiar fallback ───────────────────

function FamiliarCardSprite({ mobId, size }: { mobId: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resourceImageUrl("mob", mobId, "sprite.png")}
      alt=""
      width={size}
      height={size}
      style={{ objectFit: "contain", width: size, height: size, flexShrink: 0 }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = resourceImageUrl("familiar", mobId, "sprite.png");
      }}
    />
  );
}

// ── Line picker ───────────────────────────────────────────────────────────

function LinePicker({ value, tier, placeholder, theme, onChange }: {
  value: string;
  tier: FamiliarTier;
  placeholder: string;
  theme: AppTheme;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = getLinesForTier(tier);
  const filtered = query ? lines.filter((l) => matchesQuery(l, query)) : lines;

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function select(line: string) {
    onChange(line);
    setOpen(false);
    setQuery("");
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

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        style={triggerStyle}
      >
        {value || placeholder}
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
            zIndex: 310, borderRadius: 8, overflow: "hidden",
            border: `1px solid ${theme.accent}`,
            background: theme.panel,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search potential lines"
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto" }}>
            {value && (
              <button
                type="button"
                onClick={() => select("")}
                style={{
                  display: "block", width: "100%", padding: "0.3rem 0.5rem",
                  background: "transparent", border: "none",
                  borderBottom: `1px solid ${theme.border}`,
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
                }}
              >
                — Clear —
              </button>
            )}
            {filtered.map((line) => (
              <button
                key={line}
                type="button"
                onClick={() => select(line)}
                style={{
                  display: "block", width: "100%", padding: "0.3rem 0.5rem",
                  background: line === value ? `${theme.accent}33` : "transparent",
                  border: "none", borderBottom: `1px solid ${theme.border}`,
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: "0.75rem", fontWeight: 600, color: theme.text, textAlign: "left",
                }}
                onMouseEnter={(e) => { if (line !== value) e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { if (line !== value) e.currentTarget.style.background = "transparent"; }}
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
        </div>
      )}
    </div>
  );
}

// ── Familiar slot card ─────────────────────────────────────────────────────

function filterFamiliars(query: string): FamiliarEntry[] {
  if (!query.trim()) return FAMILIARS.slice(0, 50);
  const results: FamiliarEntry[] = [];
  for (const f of FAMILIARS) {
    if (results.length >= 50) break;
    if (matchesQuery(getFamiliarDisplayLabel(f), query)) results.push(f);
  }
  return results;
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
  return (
    <div style={{ padding: "0.5rem 0.6rem", display: "flex", flexDirection: "column", gap: 5 }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: "none", cursor: "pointer",
          color: theme.muted, fontFamily: "inherit", fontSize: "0.75rem",
          fontWeight: 700, padding: "0.1rem 0", marginBottom: 2,
        }}
      >
        ← {getFamiliarDisplayLabel(entry)}
      </button>
      <p style={{ margin: "0 0 2px", fontSize: "0.75rem", color: theme.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Pick rarity
      </p>
      {TIER_ORDER.map((t) => {
        const c = TIER_COLORS[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            style={{
              background: c.bg, border: `1px solid ${c.border}`, color: c.text,
              borderRadius: 6, padding: "0.3rem 0.6rem",
              fontWeight: 700, fontSize: "0.8rem", fontFamily: "inherit",
              cursor: "pointer", textAlign: "left",
            }}
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
}) {
  const isOpen = openId === slotId;
  const isEmpty = !slot.name;
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: wrapperRef, coords: pickerCoords, compute } = usePickerCoords(isOpen, FAM_PICKER_WIDTH);
  const filtered = useMemo(() => isOpen ? filterFamiliars(query) : [], [isOpen, query]);
  useEffect(() => {
    if (isOpen && !pendingEntry) inputRef.current?.focus();
  }, [isOpen, pendingEntry]);

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
    position: "fixed",
    top: pickerCoords.top,
    left: pickerCoords.left,
    width: FAM_PICKER_WIDTH,
    zIndex: 300,
    background: theme.panel,
    border: `1px solid ${theme.accent}`,
  };

  return (
    <div ref={wrapperRef} style={{ flex: 1, position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => { compute(); onOpen(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compute(); onOpen(); } }}
        style={cardStyle}
      >
        {isEmpty ? (
          <span style={{ fontSize: 24, color: theme.muted, lineHeight: 1, fontWeight: 300 }}>+</span>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <FamiliarCardSprite mobId={slot.mobId} size={FAM_CARD_SIZE} />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                aria-label="Remove familiar"
                style={{
                  position: "absolute", top: -5, right: -5,
                  width: 16, height: 16, borderRadius: "50%",
                  border: `1px solid ${theme.border}`,
                  background: theme.bg, color: theme.muted,
                  fontSize: "0.75rem", lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", padding: 0, fontFamily: "inherit",
                }}
              >×</button>
            </div>
            <span style={{
              fontSize: "0.75rem", fontWeight: 700, color: slot.tier ? TIER_COLORS[slot.tier].text : theme.text,
              textAlign: "center", overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", maxWidth: "100%", width: "100%",
            }}>
              {slot.name.replace(/ Familiar$/i, "")}
            </span>
            {slot.tier && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                <LinePicker value={slot.line1} tier={slot.tier} placeholder="Line 1…" theme={theme} onChange={(v) => onLineChange("line1", v)} />
                <LinePicker value={slot.line2} tier={slot.tier} placeholder="Line 2…" theme={theme} onChange={(v) => onLineChange("line2", v)} />
              </div>
            )}
          </>
        )}
      </div>

      {isOpen && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={pickerStyle}
        >
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
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
                />
              </div>
              {query && <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {filtered.length === 0 && (
                  <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                    No results
                  </p>
                )}
                {filtered.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSetPending(entry); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "0.3rem 0.6rem",
                      background: "transparent", border: "none",
                      borderBottom: `1px solid ${theme.border}`,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {entry.cardId && <ItemIcon id={entry.cardId} size={FAM_LIST_SIZE} shadow />}
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
  const q = query.trim().toLowerCase();
  const available = BADGE_NAMES.filter((n) => !excluded.has(n));
  if (!q) return available;
  return available.filter((n) => n.toLowerCase().includes(q));
}

function BadgeSlot({
  badge, slotId, openId, query, theme, usedBadges,
  onOpen, onQueryChange, onSelect, onClear,
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
}) {
  const isOpen = openId === slotId;
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: wrapperRef, coords: pickerCoords, compute } = usePickerCoords(isOpen, BADGE_PICKER_WIDTH);
  // Exclude badges used in other slots; the current slot's own badge stays available for re-selection
  const excluded = useMemo(() => {
    const s = new Set(usedBadges);
    if (badge) s.delete(badge);
    return s;
  }, [usedBadges, badge]);
  const filtered = useMemo(() => isOpen ? filterBadges(query, excluded) : [], [isOpen, query, excluded]);
  const outerSize = BADGE_SIZE + BADGE_BORDER * 2;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const emptyBg = isOpen ? theme.accent : `${theme.muted}28`;
  const badgePickerStyle: CSSProperties = {
    ...popoverVisualStyle,
    position: "fixed",
    top: pickerCoords.top,
    left: pickerCoords.left,
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
        onClick={() => { compute(); onOpen(); }}
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
      {badge && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove badge"
          style={{
            position: "absolute", top: 0, right: 0,
            width: 14, height: 14, borderRadius: "50%",
            border: `1px solid ${theme.border}`,
            background: theme.bg, color: theme.muted,
            fontSize: "0.75rem", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, fontFamily: "inherit",
          }}
        >×</button>
      )}

      {isOpen && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={badgePickerStyle}
        >
          <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search badges"
              value={query}
              placeholder="Search badges…"
              onChange={(e) => onQueryChange(e.target.value)}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                No results
              </p>
            )}
            {filtered.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  width: "100%", padding: "0.3rem 0.6rem",
                  background: "transparent", border: "none",
                  borderBottom: `1px solid ${theme.border}`,
                  cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left",
                  fontSize: "0.75rem", fontWeight: 600, color: theme.text,
                }}
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
    const saved = readCharacterToolData<FamiliarsValue>(confirmedCharacterName, "familiars");
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

  const badgeRowOffset = (BADGE_SIZE + BADGE_BORDER * 2 + 8) / 2;

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="All fields are optional. Fill in what you know."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      {/* Preset tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>Preset</span>
        {Array.from({ length: PRESET_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActivePreset(i); closePicker(); }}
            style={{
              width: 28, height: 24, borderRadius: 6, padding: 0,
              border: `2px solid ${i === activePreset ? theme.accent : theme.border}`,
              background: i === activePreset ? theme.accent : "transparent",
              color: i === activePreset ? "#fff" : theme.muted,
              fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {i + 1}
          </button>
        ))}
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
                onClear={() => onChange(JSON.stringify(patchSlot(parsed, activePreset, i, emptySlot())))}
                onLineChange={(field, val) => onChange(JSON.stringify(patchSlot(parsed, activePreset, i, { [field]: val })))}
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
                        onClear={() => onChange(JSON.stringify(patchBadge(parsed, activePreset, i, "")))}
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
                        onClear={() => onChange(JSON.stringify(patchBadge(parsed, activePreset, bi, "")))}
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
