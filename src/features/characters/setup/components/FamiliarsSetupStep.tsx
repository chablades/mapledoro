"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import {
  TIER_LABELS, TIER_ORDER, getLinesForTier, BADGE_NAMES,
  FAMILIARS, getFamiliarDisplayLabel, getFamiliarImageUrl,
  type FamiliarTier, type FamiliarEntry,
} from "../data/familiarsData";
import SetupStepFrame from "./SetupStepFrame";

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

interface FamiliarSlot {
  familiarId: number | null;
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

const PRESET_COUNT = 5;
const SLOT_COUNT = 3;
const BADGE_COUNT = 8;
const VALID_TIERS = new Set<string>(TIER_ORDER);

function emptySlot(): FamiliarSlot {
  return { familiarId: null, name: "", tier: "", line1: "", line2: "" };
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
  return {
    familiarId: typeof r.familiarId === "number" ? r.familiarId : null,
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

function getClosedLabel(slot: FamiliarSlot): string {
  if (!slot.name) return "";
  const entry = FAMILIARS.find(f => f.id === slot.familiarId);
  return getFamiliarDisplayLabel(entry ?? { id: 0, name: slot.name, level: 0 });
}

const INPUT_STYLE_BASE = {
  border: "1px solid",
  borderRadius: "6px",
  fontFamily: "inherit",
  fontSize: "0.82rem",
  fontWeight: 700,
  padding: "0.3rem 0.5rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  transition: "outline-color 0.15s ease",
  width: "100%",
  boxSizing: "border-box" as const,
};

const CARD_W = 24;
const CARD_H = 32;

function FamiliarCardImage({ name, scale = 1 }: { name: string; scale?: number }) {
  const w = Math.round(CARD_W * scale);
  const h = Math.round(CARD_H * scale);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  if (!name) return <div style={{ width: w, height: h, flexShrink: 0 }} />;
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0, width: w, height: h }}>
        <Image
          src={getFamiliarImageUrl(name)}
          alt={name}
          width={w}
          height={h}
          unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "block";
          }}
          style={{ display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none", width: w, height: h, flexShrink: 0, background: "rgba(128,128,128,0.12)", borderRadius: "2px" }} />
    </>
  );
}

function FamiliarPicker({ slot, theme, onUpdate }: {
  slot: FamiliarSlot;
  theme: AppTheme;
  onUpdate: (patch: Partial<FamiliarSlot>) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAMILIARS.slice(0, 50);
    const results: FamiliarEntry[] = [];
    for (const f of FAMILIARS) {
      if (results.length >= 50) break;
      if (getFamiliarDisplayLabel(f).toLowerCase().includes(q)) results.push(f);
    }
    return results;
  }, [query]);

  function handleSelect(entry: FamiliarEntry) {
    onUpdate({ familiarId: entry.id, name: entry.name });
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    onUpdate({ familiarId: null, name: "" });
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        <input
          type="text"
          value={open ? query : getClosedLabel(slot)}
          readOnly={!open}
          placeholder="Type to search familiars…"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; setOpen(true); }}
          onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } }}
          style={{ ...INPUT_STYLE_BASE, flex: 1, borderColor: theme.border, background: theme.bg, color: theme.text, cursor: open ? "text" : "pointer" }}
        />
        {slot.name && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear familiar"
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: "6px",
              background: theme.bg,
              color: theme.muted,
              fontFamily: "inherit",
              fontSize: "0.85rem",
              lineHeight: 1,
              padding: "0.3rem 0.5rem",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >×</button>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 3px)",
          left: 0,
          right: 0,
          zIndex: 200,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          borderRadius: "8px",
          maxHeight: "220px",
          overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
        }}>
          {filtered.length === 0 && (
            <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: theme.muted, fontWeight: 700 }}>
              No results
            </p>
          )}
          {filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleSelect(entry)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.35rem 0.6rem",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${theme.border}`,
                cursor: "pointer",
                textAlign: "left" as const,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}18`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <FamiliarCardImage name={entry.name} />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                {getFamiliarDisplayLabel(entry)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FamiliarCard({ slot, label, theme, onUpdate }: {
  slot: FamiliarSlot;
  label: string;
  theme: AppTheme;
  onUpdate: (patch: Partial<FamiliarSlot>) => void;
}) {
  const listId = slot.tier ? `fam-step-lines-${slot.tier}` : undefined;

  return (
    <div style={{
      border: `1px solid ${theme.border}`,
      borderRadius: "10px",
      padding: "0.7rem 0.85rem",
      background: theme.bg,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <FamiliarCardImage name={slot.name} scale={1.2} />
        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, color: theme.muted, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
          {label}
        </p>
      </div>
      <div>
        <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: theme.muted, marginBottom: "0.2rem" }}>Name</label>
        <FamiliarPicker slot={slot} theme={theme} onUpdate={onUpdate} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: theme.muted, marginBottom: "0.2rem" }}>Tier</label>
          <select
            value={slot.tier}
            onChange={(e) => onUpdate({ tier: e.target.value as FamiliarTier | "", line1: "", line2: "" })}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            style={{ ...INPUT_STYLE_BASE, borderColor: theme.border, background: theme.bg, color: slot.tier ? theme.text : theme.muted, cursor: "pointer" }}
          >
            <option value="">— Select tier —</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div />
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: theme.muted, marginBottom: "0.2rem" }}>Potential Line 1</label>
          <input
            type="text"
            list={listId}
            value={slot.line1}
            placeholder={slot.tier ? "Type to search…" : "Select a tier first"}
            disabled={!slot.tier}
            onChange={(e) => onUpdate({ line1: e.target.value })}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            style={{ ...INPUT_STYLE_BASE, borderColor: theme.border, background: theme.bg, color: theme.text, opacity: slot.tier ? 1 : 0.5 }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: theme.muted, marginBottom: "0.2rem" }}>Potential Line 2</label>
          <input
            type="text"
            list={listId}
            value={slot.line2}
            placeholder={slot.tier ? "Type to search…" : "Select a tier first"}
            disabled={!slot.tier}
            onChange={(e) => onUpdate({ line2: e.target.value })}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            style={{ ...INPUT_STYLE_BASE, borderColor: theme.border, background: theme.bg, color: theme.text, opacity: slot.tier ? 1 : 0.5 }}
          />
        </div>
      </div>
    </div>
  );
}

function BadgesSection({ badges, theme, onUpdate }: {
  badges: string[];
  theme: AppTheme;
  onUpdate: (idx: number, val: string) => void;
}) {
  return (
    <div>
      <p style={{
        margin: 0,
        marginBottom: "0.45rem",
        fontSize: "0.75rem",
        fontWeight: 800,
        color: theme.muted,
        letterSpacing: "0.05em",
        textTransform: "uppercase" as const,
        paddingBottom: "0.25rem",
        borderBottom: `1px solid ${theme.border}`,
      }}>
        Equipped Badges
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem" }}>
        {badges.map((badge, i) => (
          <div key={i}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: theme.muted, marginBottom: "0.2rem" }}>
              Badge {i + 1}
            </label>
            <input
              type="text"
              list="fam-step-badge-names"
              value={badge}
              placeholder="Type to search…"
              onChange={(e) => onUpdate(i, e.target.value)}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              style={{ ...INPUT_STYLE_BASE, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FamiliarsSetupStep({
  theme, step, stepNumber, totalSteps, confirmedCharacterName, value, onChange, onBack, onNext, onFinish,
}: FamiliarsSetupStepProps) {
  const [activePreset, setActivePreset] = useState(0);
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (initialValueRef.current) return;
    if (!confirmedCharacterName) return;
    const saved = readCharacterToolData<FamiliarsValue>(confirmedCharacterName, "familiars");
    if (saved) onChange(JSON.stringify(saved));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = parseValue(value);
  const currentPreset = parsed.presets[activePreset];

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
      <datalist id="fam-step-badge-names">
        {BADGE_NAMES.map((name) => <option key={name} value={name} />)}
      </datalist>
      {TIER_ORDER.map((tier) => (
        <datalist key={tier} id={`fam-step-lines-${tier}`}>
          {getLinesForTier(tier).map((line) => (
            <option key={line} value={line} />
          ))}
        </datalist>
      ))}

      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" as const }}>
        {Array.from({ length: PRESET_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActivePreset(i)}
            style={{
              border: `1px solid ${i === activePreset ? theme.accent : theme.border}`,
              borderRadius: "7px",
              background: i === activePreset ? `${theme.accent}18` : theme.bg,
              color: i === activePreset ? theme.accent : theme.text,
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: "0.78rem",
              padding: "0.25rem 0.7rem",
              cursor: "pointer",
            }}
          >
            Preset {i + 1}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
        {currentPreset.familiars.map((slot, i) => (
          <FamiliarCard
            key={`${activePreset}-${i}`}
            slot={slot}
            label={`Familiar ${i + 1}`}
            theme={theme}
            onUpdate={(patch) => onChange(JSON.stringify(patchSlot(parsed, activePreset, i, patch)))}
          />
        ))}
      </div>

      <BadgesSection
        badges={currentPreset.badges}
        theme={theme}
        onUpdate={(idx, val) => onChange(JSON.stringify(patchBadge(parsed, activePreset, idx, val)))}
      />
    </SetupStepFrame>
  );
}
