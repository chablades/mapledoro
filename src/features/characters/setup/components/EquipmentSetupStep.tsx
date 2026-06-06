"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { ItemIcon } from "../../../../components/ResourceImage";
import CharacterAvatar from "../../tabs/components/CharacterAvatar";
import SetupStepFrame from "./SetupStepFrame";

// ── Types ──────────────────────────────────────────────────────────────────

interface EquipmentItem {
  id: number;
  name: string;
}

type SlotKey =
  | "ring1" | "ring2" | "ring3" | "ring4"
  | "face" | "eye" | "earring" | "pendant1" | "pendant2" | "belt" | "pocket"
  | "hat" | "cape" | "top" | "glove" | "bottom" | "shoe" | "shoulder" | "medal"
  | "weapon" | "secondary" | "emblem" | "android" | "heart" | "badge";

type EquipmentDraft = Partial<Record<SlotKey, EquipmentItem | null>>;

interface EquipmentSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  confirmedCharacterName?: string;
  confirmedCharacterImgURL?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SLOT_LABELS: Record<SlotKey, string> = {
  ring1: "Ring", ring2: "Ring", ring3: "Ring", ring4: "Ring",
  face: "Face", eye: "Eye", earring: "Earring",
  pendant1: "Pendant", pendant2: "Pendant",
  belt: "Belt", pocket: "Pocket",
  hat: "Hat", cape: "Cape", top: "Top",
  glove: "Gloves", bottom: "Bottom", shoe: "Shoes",
  shoulder: "Shoulder", medal: "Medal",
  weapon: "Weapon", secondary: "Sub Wpn", emblem: "Emblem",
  android: "Android", heart: "Heart", badge: "Badge",
};

// Maps each slot to which public JSON file to fetch for item search.
const SLOT_DATA_FILE: Record<SlotKey, string> = {
  ring1: "ring", ring2: "ring", ring3: "ring", ring4: "ring",
  face: "face", eye: "eye", earring: "earring",
  pendant1: "pendant", pendant2: "pendant",
  belt: "belt", pocket: "pocket",
  hat: "hat", cape: "cape", top: "top",
  glove: "glove", bottom: "bottom", shoe: "shoe",
  shoulder: "shoulder", medal: "medal",
  weapon: "weapon", secondary: "secondary", emblem: "emblem",
  android: "android", heart: "heart", badge: "badge",
};

const SLOT_SIZE = 52;
const SEARCH_LIMIT = 60;

// ── Parse / serialise ──────────────────────────────────────────────────────

function parseDraft(raw: string): EquipmentDraft {
  try { return JSON.parse(raw) as EquipmentDraft; } catch { return {}; }
}

function serialiseDraft(draft: EquipmentDraft): string {
  return JSON.stringify(draft);
}

// ── Item search ─────────────────────────────────────────────────────────────

function normalize(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function matchQuery(name: string, tokens: string[]): boolean {
  const n = normalize(name);
  return tokens.length > 0 && tokens.every((t) => n.includes(t));
}

function filterItems(items: EquipmentItem[], query: string): EquipmentItem[] {
  if (!query.trim()) return items.slice(0, SEARCH_LIMIT);
  const tokens = query.trim().split(/\s+/).flatMap((t) => { const n = normalize(t); return n ? [n] : []; });
  const out: EquipmentItem[] = [];
  for (const item of items) {
    if (out.length >= SEARCH_LIMIT) break;
    if (matchQuery(item.name, tokens)) out.push(item);
  }
  return out;
}

// ── Item picker ────────────────────────────────────────────────────────────

const cachedSlotItems: Partial<Record<string, EquipmentItem[]>> = {};

function ItemPicker({ slot, current, theme, onSelect, onClose }: {
  slot: SlotKey;
  current: EquipmentItem | null | undefined;
  theme: AppTheme;
  onSelect: (item: EquipmentItem | null) => void;
  onClose: () => void;
}) {
  // loadedItems drives a re-render after async fetch; cache is read directly at render time.
  const [loadedItems, setLoadedItems] = useState<EquipmentItem[] | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const file = SLOT_DATA_FILE[slot];
  const items = cachedSlotItems[file] ?? loadedItems;

  useEffect(() => {
    inputRef.current?.focus();
    if (cachedSlotItems[file]) return;
    fetch(`/data/equipment/${file}.json`)
      .then((r) => r.json())
      .then((raw: [number, string][]) => {
        const parsed = raw.map(([id, name]) => ({ id, name }));
        cachedSlotItems[file] = parsed;
        setLoadedItems(parsed);
      })
      .catch(() => setLoadedItems([]));
  }, [slot, file]);

  const filtered = items ? filterItems(items, query) : null;

  const pickerStyle: CSSProperties = {
    border: `1px solid ${theme.accent}`,
    borderRadius: 10,
    background: theme.panel,
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    overflow: "hidden",
  };

  const searchStyle: CSSProperties = {
    width: "100%",
    border: "none",
    borderBottom: `1px solid ${theme.border}`,
    borderRadius: 0,
    background: theme.bg,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "0.45rem 0.6rem",
    outline: "none",
  };

  return (
    <div style={pickerStyle}>
      <div style={{ padding: "0.3rem 0.5rem", borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {SLOT_LABELS[slot]}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: theme.muted, fontSize: "1rem", lineHeight: 1, padding: "0 0.1rem" }}
          aria-label="Close picker"
        >
          ✕
        </button>
      </div>
      <input
        ref={inputRef}
        type="text"
        aria-label={`Search ${SLOT_LABELS[slot]} items`}
        value={query}
        placeholder="Search items…"
        onChange={(e) => setQuery(e.target.value)}
        style={searchStyle}
      />
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {current && (
          <button
            type="button"
            onClick={() => { onSelect(null); onClose(); }}
            style={{
              display: "block", width: "100%", padding: "0.3rem 0.5rem",
              background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
              cursor: "pointer", fontFamily: "inherit",
              fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
            }}
          >
            — Clear slot —
          </button>
        )}
        {filtered === null && (
          <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 600 }}>
            Loading…
          </p>
        )}
        {filtered !== null && filtered.length === 0 && (
          <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 600 }}>
            No results
          </p>
        )}
        {filtered?.map((item) => {
          const isCurrent = item.id === current?.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.45rem",
                width: "100%", padding: "0.25rem 0.5rem",
                background: isCurrent ? `${theme.accent}33` : "transparent",
                border: "none", borderBottom: `1px solid ${theme.border}`,
                cursor: "pointer", fontFamily: "inherit",
                fontSize: "0.8rem", fontWeight: 600, color: theme.text, textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = `${theme.accent}22`; }}
              onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
            >
              <ItemIcon id={String(item.id)} size={24} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Slot cell ──────────────────────────────────────────────────────────────

function SlotCell({ slotKey, item, theme, isActive, onClick }: {
  slotKey: SlotKey;
  item: EquipmentItem | null | undefined;
  theme: AppTheme;
  isActive: boolean;
  onClick: () => void;
}) {
  const cellStyle: CSSProperties = {
    width: SLOT_SIZE, height: SLOT_SIZE,
    border: `1px solid ${isActive ? theme.accent : theme.border}`,
    borderRadius: 8,
    background: isActive ? `${theme.accent}15` : theme.bg,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 2, cursor: "pointer", flexShrink: 0,
    outline: "2px solid transparent", outlineOffset: 2,
    transition: "border-color 0.15s, background 0.15s",
    overflow: "hidden", padding: "2px 3px",
    boxSizing: "border-box",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={item ? `${SLOT_LABELS[slotKey]}: ${item.name}` : `Set ${SLOT_LABELS[slotKey]}`}
      style={cellStyle}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = `${theme.accent}88`; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = theme.border; }}
      onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
      onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
    >
      {item ? (
        <>
          <ItemIcon id={String(item.id)} size={28} />
          <span style={{
            fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            maxWidth: SLOT_SIZE - 6, display: "block",
          }}>
            {item.name}
          </span>
        </>
      ) : (
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>
          {SLOT_LABELS[slotKey]}
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

const slotColStyle: CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4, flexShrink: 0,
};

const slotRowStyle: CSSProperties = {
  display: "flex", flexDirection: "row", gap: 4,
};

export default function EquipmentSetupStep({
  theme,
  step,
  stepNumber,
  totalSteps,
  confirmedCharacterImgURL,
  value,
  onChange,
  onBack,
  onNext,
  onFinish,
}: EquipmentSetupStepProps) {
  const [draft, setDraft] = useState<EquipmentDraft>(() => parseDraft(value));
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);

  function updateSlot(slot: SlotKey, item: EquipmentItem | null) {
    const next = { ...draft, [slot]: item };
    setDraft(next);
    onChange(serialiseDraft(next));
  }

  function toggleSlot(slot: SlotKey) {
    setActiveSlot((prev) => (prev === slot ? null : slot));
  }

  const spriteBoxStyle: CSSProperties = {
    flex: 1, minWidth: 80,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    border: `1px solid ${theme.border}`,
    borderRadius: 10, background: theme.bg,
    overflow: "hidden", alignSelf: "stretch",
    minHeight: 6 * (SLOT_SIZE + 4) - 4,
  };

  const weaponBarStyle: CSSProperties = {
    display: "flex", flexDirection: "row", gap: 4,
    flexWrap: "wrap", marginTop: 4,
  };

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Record the items you have equipped."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      {/* Equipment grid: left accessories | sprite | right armor */}
      <div style={{ display: "flex", flexDirection: "row", gap: 6, alignItems: "flex-start" }}>

        {/* Left column: rings + accessories */}
        <div style={slotColStyle}>
          <div style={slotRowStyle}>
            <SlotCell slotKey="ring1" item={draft.ring1} theme={theme} isActive={activeSlot === "ring1"} onClick={() => toggleSlot("ring1")} />
            <SlotCell slotKey="ring2" item={draft.ring2} theme={theme} isActive={activeSlot === "ring2"} onClick={() => toggleSlot("ring2")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="ring3" item={draft.ring3} theme={theme} isActive={activeSlot === "ring3"} onClick={() => toggleSlot("ring3")} />
            <SlotCell slotKey="ring4" item={draft.ring4} theme={theme} isActive={activeSlot === "ring4"} onClick={() => toggleSlot("ring4")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="face" item={draft.face} theme={theme} isActive={activeSlot === "face"} onClick={() => toggleSlot("face")} />
            <SlotCell slotKey="eye" item={draft.eye} theme={theme} isActive={activeSlot === "eye"} onClick={() => toggleSlot("eye")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="earring" item={draft.earring} theme={theme} isActive={activeSlot === "earring"} onClick={() => toggleSlot("earring")} />
            <SlotCell slotKey="pendant1" item={draft.pendant1} theme={theme} isActive={activeSlot === "pendant1"} onClick={() => toggleSlot("pendant1")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="pendant2" item={draft.pendant2} theme={theme} isActive={activeSlot === "pendant2"} onClick={() => toggleSlot("pendant2")} />
            <SlotCell slotKey="belt" item={draft.belt} theme={theme} isActive={activeSlot === "belt"} onClick={() => toggleSlot("belt")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="pocket" item={draft.pocket} theme={theme} isActive={activeSlot === "pocket"} onClick={() => toggleSlot("pocket")} />
          </div>
        </div>

        {/* Center: character sprite */}
        <div style={spriteBoxStyle}>
          {confirmedCharacterImgURL ? (
            <CharacterAvatar
              src={confirmedCharacterImgURL}
              alt="Character preview"
              width={90}
              height={180}
              style={{ objectFit: "contain", width: 90, height: 180 }}
            />
          ) : (
            <div style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: 700, padding: "1rem", textAlign: "center" }}>
              No preview
            </div>
          )}
        </div>

        {/* Right column: armor */}
        <div style={slotColStyle}>
          <div style={slotRowStyle}>
            <SlotCell slotKey="hat" item={draft.hat} theme={theme} isActive={activeSlot === "hat"} onClick={() => toggleSlot("hat")} />
            <SlotCell slotKey="cape" item={draft.cape} theme={theme} isActive={activeSlot === "cape"} onClick={() => toggleSlot("cape")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="top" item={draft.top} theme={theme} isActive={activeSlot === "top"} onClick={() => toggleSlot("top")} />
            <SlotCell slotKey="glove" item={draft.glove} theme={theme} isActive={activeSlot === "glove"} onClick={() => toggleSlot("glove")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="bottom" item={draft.bottom} theme={theme} isActive={activeSlot === "bottom"} onClick={() => toggleSlot("bottom")} />
            <SlotCell slotKey="shoe" item={draft.shoe} theme={theme} isActive={activeSlot === "shoe"} onClick={() => toggleSlot("shoe")} />
          </div>
          <div style={slotRowStyle}>
            <SlotCell slotKey="shoulder" item={draft.shoulder} theme={theme} isActive={activeSlot === "shoulder"} onClick={() => toggleSlot("shoulder")} />
            <SlotCell slotKey="medal" item={draft.medal} theme={theme} isActive={activeSlot === "medal"} onClick={() => toggleSlot("medal")} />
          </div>
        </div>

      </div>

      {/* Weapon / special bar */}
      <div style={weaponBarStyle}>
        {(["weapon", "secondary", "emblem", "android", "heart", "badge"] as SlotKey[]).map((slot) => (
          <SlotCell key={slot} slotKey={slot} item={draft[slot]} theme={theme} isActive={activeSlot === slot} onClick={() => toggleSlot(slot)} />
        ))}
      </div>

      {/* Active slot picker */}
      {activeSlot && (
        <div style={{ marginTop: 8 }}>
          <ItemPicker
            slot={activeSlot}
            current={draft[activeSlot]}
            theme={theme}
            onSelect={(item) => updateSlot(activeSlot, item)}
            onClose={() => setActiveSlot(null)}
          />
        </div>
      )}
    </SetupStepFrame>
  );
}
