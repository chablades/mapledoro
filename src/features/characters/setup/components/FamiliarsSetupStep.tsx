"use client";

import { useMemo, useRef, useState, useEffect, type CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import {
  TIER_LABELS, TIER_ORDER, getLinesForTier, BADGE_NAMES,
  FAMILIARS, getFamiliarDisplayLabel,
  type FamiliarTier, type FamiliarEntry,
} from "../data/familiarsData";
import { ItemIcon } from "../../../../components/ResourceImage";
import { resourceImageUrl } from "../../../../lib/mapleResource";
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

const TIER_SHORT: Record<FamiliarTier, string> = {
  common: "C", rare: "R", epic: "E", unique: "U", legendary: "L",
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

const popoverContainerStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: "50%",
  transform: "translateX(-50%)",
  width: 220,
  zIndex: 300,
  borderRadius: 10,
  boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
  overflow: "hidden",
};

// ── Familiar card sprite: mob primary, familiar fallback ───────────────────

function FamiliarCardSprite({ mobId, size }: { mobId: string; size: number }) {
  const primaryRef = useRef<HTMLImageElement>(null);
  const fallbackRef = useRef<HTMLImageElement>(null);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={primaryRef}
        src={resourceImageUrl("mob", mobId, "sprite.png")}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "contain", width: size, height: size, flexShrink: 0 }}
        onError={() => {
          if (primaryRef.current) primaryRef.current.style.display = "none";
          if (fallbackRef.current) fallbackRef.current.style.display = "block";
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={fallbackRef}
        src={resourceImageUrl("familiar", mobId, "sprite.png")}
        alt=""
        width={size}
        height={size}
        style={{ display: "none", objectFit: "contain", width: size, height: size, flexShrink: 0 }}
      />
    </>
  );
}

// ── Familiar slot card ─────────────────────────────────────────────────────

function filterFamiliars(query: string): FamiliarEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return FAMILIARS.slice(0, 50);
  const results: FamiliarEntry[] = [];
  for (const f of FAMILIARS) {
    if (results.length >= 50) break;
    if (getFamiliarDisplayLabel(f).toLowerCase().includes(q)) results.push(f);
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

function FamiliarSlotCard({
  slot, slotId, openId, query, theme,
  onOpen, onQueryChange, onSelect, onClear, onTierChange, onLineChange,
}: {
  slot: FamiliarSlot;
  slotId: string;
  openId: string | null;
  query: string;
  theme: AppTheme;
  onOpen: () => void;
  onQueryChange: (q: string) => void;
  onSelect: (entry: FamiliarEntry) => void;
  onClear: () => void;
  onTierChange: (tier: FamiliarTier | "") => void;
  onLineChange: (field: "line1" | "line2", val: string) => void;
}) {
  const isOpen = openId === slotId;
  const isEmpty = !slot.name;
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => isOpen ? filterFamiliars(query) : [], [isOpen, query]);
  const listId = slot.tier ? `fam-step-lines-${slot.tier}` : undefined;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const cardStyle: CSSProperties = {
    ...slotCardBase,
    borderWidth: isOpen ? 2 : 1,
    borderColor: isOpen ? theme.accent : theme.border,
    borderStyle: isEmpty && !isOpen ? "dashed" : "solid",
    background: isEmpty ? "transparent" : theme.panel,
    justifyContent: isEmpty ? "center" : "flex-start",
  };

  const lineInputStyle: CSSProperties = {
    ...searchInputStyle,
    borderColor: theme.border,
    background: theme.bg,
    color: theme.text,
  };

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
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
              fontSize: "0.75rem", fontWeight: 700, color: theme.text,
              textAlign: "center", overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", maxWidth: "100%", width: "100%",
            }}>
              {slot.name.replace(/ Familiar$/i, "")}
            </span>
            <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
              {TIER_ORDER.map((t) => {
                const c = TIER_COLORS[t];
                const active = slot.tier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    title={TIER_LABELS[t]}
                    onClick={(e) => { e.stopPropagation(); onTierChange(active ? "" : t); }}
                    style={{
                      width: 18, height: 18, borderRadius: 3, padding: 0,
                      border: `1px solid ${active ? c.border : theme.border}`,
                      background: active ? c.bg : "transparent",
                      color: active ? c.text : theme.muted,
                      fontSize: "0.75rem", fontWeight: 800, fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {TIER_SHORT[t]}
                  </button>
                );
              })}
            </div>
            {slot.tier && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
                <input
                  type="text"
                  list={listId}
                  value={slot.line1}
                  placeholder="Line 1…"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onLineChange("line1", e.target.value)}
                  style={lineInputStyle}
                />
                <input
                  type="text"
                  list={listId}
                  value={slot.line2}
                  placeholder="Line 2…"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onLineChange("line2", e.target.value)}
                  style={lineInputStyle}
                />
              </div>
            )}
          </>
        )}
      </div>

      {isOpen && (
        <div style={{ ...popoverContainerStyle, background: theme.panel, border: `1px solid ${theme.accent}` }}>
          <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search familiars…"
              onChange={(e) => onQueryChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                No results
              </p>
            )}
            {filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelect(entry); }}
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
          </div>
        </div>
      )}
    </div>
  );
}

// ── Badge slot (pentagon) ──────────────────────────────────────────────────

function filterBadges(query: string): readonly string[] {
  const q = query.trim().toLowerCase();
  if (!q) return BADGE_NAMES;
  return BADGE_NAMES.filter((n) => n.toLowerCase().includes(q));
}

function BadgeSlot({
  badge, slotId, openId, query, theme,
  onOpen, onQueryChange, onSelect, onClear,
}: {
  badge: string;
  slotId: string;
  openId: string | null;
  query: string;
  theme: AppTheme;
  onOpen: () => void;
  onQueryChange: (q: string) => void;
  onSelect: (name: string) => void;
  onClear: () => void;
}) {
  const isOpen = openId === slotId;
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => isOpen ? filterBadges(query) : [], [isOpen, query]);
  const outerSize = BADGE_SIZE + BADGE_BORDER * 2;

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const filledBg = badge ? `${theme.accent}55` : `${theme.muted}28`;
  const outerBg = isOpen ? theme.accent : filledBg;
  const innerBg = badge ? theme.panel : theme.bg;

  return (
    <div style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        title={badge || "Add badge"}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        style={{ cursor: "pointer", position: "relative" }}
      >
        <div style={{ width: outerSize, height: outerSize, clipPath: PENTAGON, background: outerBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: BADGE_SIZE, height: BADGE_SIZE, clipPath: PENTAGON, background: innerBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {badge ? (
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.text, textAlign: "center", lineHeight: 1.2, maxWidth: BADGE_SIZE - 8, overflow: "hidden", display: "block" }}>
                {badge.length > 7 ? badge.slice(0, 7) + "…" : badge}
              </span>
            ) : (
              <span style={{ fontSize: 18, color: theme.muted, lineHeight: 1 }}>+</span>
            )}
          </div>
        </div>
        {badge && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
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
      </div>

      {isOpen && (
        <div style={{ ...popoverContainerStyle, width: 200, background: theme.panel, border: `1px solid ${theme.accent}` }}>
          <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search badges…"
              onChange={(e) => onQueryChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => { e.stopPropagation(); onSelect(name); }}
                style={{
                  display: "block",
                  width: "100%", padding: "0.35rem 0.6rem",
                  background: "transparent", border: "none",
                  borderBottom: `1px solid ${theme.border}`,
                  cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left",
                  fontSize: "0.75rem", fontWeight: 600, color: theme.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
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
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openId]);

  const parsed = parseValue(value);
  const preset = parsed.presets[activePreset];

  function openPicker(id: string) {
    setPickerQuery("");
    setOpenId((prev) => prev === id ? null : id);
  }

  function closePicker() {
    setOpenId(null);
    setPickerQuery("");
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
      {TIER_ORDER.map((tier) => (
        <datalist key={tier} id={`fam-step-lines-${tier}`}>
          {getLinesForTier(tier).map((line) => <option key={line} value={line} />)}
        </datalist>
      ))}

      {/* Preset tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: "0.75rem" }}>
        {Array.from({ length: PRESET_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setActivePreset(i); closePicker(); }}
            style={{
              width: 32, height: 32, borderRadius: "50%", padding: 0,
              border: `2px solid ${i === activePreset ? theme.accent : theme.border}`,
              background: i === activePreset ? theme.accent : "transparent",
              color: i === activePreset ? "#fff" : theme.muted,
              fontFamily: "inherit", fontWeight: 800, fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div ref={zoneRef}>
        {/* 3 familiar cards */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem" }}>
          {preset.familiars.map((slot, i) => {
            const slotId = `f${i}`;
            return (
              <FamiliarSlotCard
                key={`${activePreset}-${i}`}
                slot={slot}
                slotId={slotId}
                openId={openId}
                query={openId === slotId ? pickerQuery : ""}
                theme={theme}
                onOpen={() => openPicker(slotId)}
                onQueryChange={setPickerQuery}
                onSelect={(entry) => {
                  onChange(JSON.stringify(patchSlot(parsed, activePreset, i, { familiarId: entry.id, mobId: entry.mobId, name: entry.name })));
                  closePicker();
                }}
                onClear={() => onChange(JSON.stringify(patchSlot(parsed, activePreset, i, emptySlot())))}
                onTierChange={(tier) => onChange(JSON.stringify(patchSlot(parsed, activePreset, i, { tier, line1: "", line2: "" })))}
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
                    onOpen={() => openPicker(slotId)}
                    onQueryChange={setPickerQuery}
                    onSelect={(name) => { onChange(JSON.stringify(patchBadge(parsed, activePreset, bi, name))); closePicker(); }}
                    onClear={() => onChange(JSON.stringify(patchBadge(parsed, activePreset, bi, "")))}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </SetupStepFrame>
  );
}
