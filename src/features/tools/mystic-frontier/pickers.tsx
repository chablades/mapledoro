"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { AppTheme } from "../../../components/themes";
import { usePickerCoords } from "../../../lib/usePickerCoords";
import { ItemIcon } from "../../../components/ResourceImage";
import { FamiliarCardSprite } from "../../../components/FamiliarCardSprite";
import { MF_FAMILIARS, type MfFamiliar } from "./familiars";
import { getPotential, potentialsForRarity, type ResolvedPotential } from "./potentialEngine";
import {
  MF_BONUS_COLORS, MF_BONUS_FAMILIES, MF_BONUS_FAMILY_DESC, formatBonusEffect, getBonusItem,
  type MfBonusColor, type MfBonusFamily,
} from "./bonusItemsData";
import type { MfRarity } from "./types";

// ── fuzzy search ──────────────────────────────────────────────────────────────
// normalize strips case and non-alphanumerics so "Jr. Cactus" matches "jrcactus";
// matchesQuery requires every whitespace-separated token to appear in the candidate.

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesQuery(candidate: string, query: string): boolean {
  const norm = normalize(candidate);
  const tokens = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => norm.includes(t));
}

// ── shared popover behavior ───────────────────────────────────────────────────

/** Escape closes the popover and hands focus back to its trigger.
 *  Capture phase on `window`: the search inputs call `stopPropagation()` in the bubble
 *  phase, which would otherwise swallow the key before any ancestor listener saw it. */
function useEscapeToClose(
  isOpen: boolean,
  onClose: () => void,
  triggerRef: RefObject<HTMLButtonElement | null>,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeRef.current();
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, triggerRef]);
}

// ── shared popover styles ────────────────────────────────────────────────────

const searchInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "0.3rem 0.5rem",
  borderWidth: 1,
  borderStyle: "solid",
};

const popoverVisualStyle: CSSProperties = {
  borderRadius: 10,
  boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
  overflow: "hidden",
};

// No `background` here: hover and focus-visible are handled by the `.mf-option` rule in
// the workspace's <style> block, and an inline background would outrank it.
function optionButtonStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "0.35rem 0.6rem",
    border: "none",
    borderBottom: `1px solid ${theme.border}`,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: theme.text,
  };
}

function ClearRow({ theme, label, onClear }: { theme: AppTheme; label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      style={{
        display: "block", width: "100%", padding: "0.3rem 0.6rem",
        background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
        cursor: "pointer", fontFamily: "inherit",
        fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

// ── familiar picker ──────────────────────────────────────────────────────────

const FAM_PICKER_WIDTH = 260;

// Same-name reissues (`duplicateOf`) stay in MF_FAMILIARS so saved lineups still resolve,
// but are hidden from the picker like the character setup flow's SELECTABLE_FAMILIARS.
const SELECTABLE_FAMILIARS = MF_FAMILIARS.filter((f) => f.duplicateOf === undefined);

function filterFamiliars(query: string): MfFamiliar[] {
  if (!query.trim()) return SELECTABLE_FAMILIARS.slice(0, 50);
  const out: MfFamiliar[] = [];
  for (const f of SELECTABLE_FAMILIARS) {
    if (out.length >= 50) break;
    if (matchesQuery(f.label, query)) out.push(f);
  }
  return out;
}

export function FamiliarPicker({
  theme, familiarId, isOpen, onToggle, onClose, onSelect, children,
}: {
  theme: AppTheme;
  familiarId: number | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (id: number | null) => void;
  children: React.ReactNode; // the trigger content (sprite / placeholder)
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, FAM_PICKER_WIDTH);
  const filtered = useMemo(() => (isOpen ? filterFamiliars(query) : []), [isOpen, query]);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEscapeToClose(isOpen, onClose, triggerRef);

  function select(id: number | null) { onSelect(id); onClose(); triggerRef.current?.focus(); }

  const pickerStyle: CSSProperties = {
    ...popoverVisualStyle, position: "absolute", top: 0, left: 0,
    width: FAM_PICKER_WIDTH, zIndex: 300, background: theme.panel, border: `1px solid ${theme.accent}`,
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => { if (!isOpen) { setQuery(""); } onToggle(); }}
        style={{ background: "none", border: "none", padding: 0, font: "inherit", width: "100%", cursor: "pointer" }}
      >
        {children}
      </button>
      {isOpen && createPortal(
        <div ref={portalRef} role="dialog" aria-label="Select familiar" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={pickerStyle}>
          {familiarId !== null && <ClearRow theme={theme} label="— Clear slot —" onClear={() => select(null)} />}
          <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search familiars"
              value={query}
              placeholder="Search familiars…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          {query && (
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {filtered.length === 0 && (
                <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>No results</p>
              )}
              {filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="mf-option"
                  onClick={() => select(f.id)}
                  style={optionButtonStyle(theme)}
                >
                  <FamiliarCardSprite mobId={f.spriteMobId ?? f.mobId} familiarId={f.id} cardId={f.cardId} name={f.label} size={28} theme={theme} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── potential line picker ────────────────────────────────────────────────────

const LINE_PICKER_WIDTH = 320;

const lineTriggerStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: "0.75rem",
  fontWeight: 600,
  padding: "0.3rem 0.45rem",
  borderWidth: 1,
  borderStyle: "solid",
  textAlign: "left",
  cursor: "pointer",
  lineHeight: 1.3,
};

export function LinePicker({
  theme, value, rarity, isOpen, placeholder, onToggle, onClose, onChange,
}: {
  theme: AppTheme;
  value: number | null;
  rarity: MfRarity;
  isOpen: boolean;
  placeholder: string;
  onToggle: () => void;
  onClose: () => void;
  onChange: (id: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, LINE_PICKER_WIDTH);

  const options = useMemo(() => potentialsForRarity(rarity), [rarity]);
  // Looked up by id, not in `options`: a saved id may be a duplicate the pool dropped.
  const selected = useMemo<ResolvedPotential | undefined>(
    () => (value === null ? undefined : getPotential(value)),
    [value],
  );
  const filtered = useMemo(() => {
    const pool = selected ? options.filter((p) => p.label !== selected.label) : options;
    return query ? pool.filter((p) => matchesQuery(p.label, query)) : pool;
  }, [options, selected, query]);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEscapeToClose(isOpen, onClose, triggerRef);

  function select(id: number | null) { onChange(id); onClose(); triggerRef.current?.focus(); }

  const pickerStyle: CSSProperties = {
    ...popoverVisualStyle, position: "absolute", top: 0, left: 0,
    width: LINE_PICKER_WIDTH, zIndex: 310, background: theme.panel, border: `1px solid ${theme.accent}`,
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => { if (!isOpen) { setQuery(""); } onToggle(); }}
        style={{
          ...lineTriggerStyle, borderColor: theme.border, background: theme.bg,
          color: selected ? theme.text : theme.muted,
        }}
      >
        {selected ? selected.label : placeholder}
      </button>
      {isOpen && createPortal(
        <div ref={portalRef} role="dialog" aria-label="Select potential line" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={pickerStyle}>
          {selected && <ClearRow theme={theme} label="— Clear line —" onClear={() => select(null)} />}
          <div style={{ padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search potential lines"
              value={query}
              placeholder="Search lines…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ ...searchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>No results</p>
            )}
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="mf-option"
                onClick={() => select(p.id)}
                style={{ ...optionButtonStyle(theme), lineHeight: 1.3 }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── bonus item picker (two-step: dice type → rarity) ──────────────────────────

const BONUS_PICKER_WIDTH = 300;

function bonusOptionLabel(theme: AppTheme, title: string, sub: string) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <span style={{ fontWeight: 800 }}>{title}</span>
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>{sub}</span>
    </span>
  );
}

function BonusFamilyList({ theme, onPick }: {
  theme: AppTheme; onPick: (f: MfBonusFamily) => void;
}) {
  return (
    <div style={{ maxHeight: 300, overflowY: "auto" }}>
      {MF_BONUS_FAMILIES.map((family) => (
        <button
          key={family}
          type="button"
          className="mf-option"
          onClick={() => onPick(family)}
          style={optionButtonStyle(theme)}
        >
          <ItemIcon id={getBonusItem(family, "White").id} size={28} />
          {bonusOptionLabel(theme, `${family} Dice`, MF_BONUS_FAMILY_DESC[family])}
        </button>
      ))}
    </div>
  );
}

function BonusColorList({ theme, family, onPick }: {
  theme: AppTheme; family: MfBonusFamily; onPick: (f: MfBonusFamily, c: MfBonusColor) => void;
}) {
  return (
    <div style={{ maxHeight: 300, overflowY: "auto" }}>
      {MF_BONUS_COLORS.map((color) => {
        const item = getBonusItem(family, color);
        return (
          <button
            key={color}
            type="button"
            className="mf-option"
            onClick={() => onPick(family, color)}
            style={optionButtonStyle(theme)}
          >
            <ItemIcon id={item.id} size={28} />
            {bonusOptionLabel(theme, color, formatBonusEffect(item))}
          </button>
        );
      })}
    </div>
  );
}

export function BonusItemPicker({
  theme, isOpen, onToggle, onClose, onSelect, children,
}: {
  theme: AppTheme;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (family: MfBonusFamily, color: MfBonusColor) => void;
  children: React.ReactNode; // the trigger content (the "Add Bonus Item" affordance)
}) {
  const [family, setFamily] = useState<MfBonusFamily | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, BONUS_PICKER_WIDTH);

  useEscapeToClose(isOpen, onClose, triggerRef);

  function pickColor(pickedFamily: MfBonusFamily, color: MfBonusColor) {
    onSelect(pickedFamily, color);
    setFamily(null);
    onClose();
    triggerRef.current?.focus();
  }

  const pickerStyle: CSSProperties = {
    ...popoverVisualStyle, position: "absolute", top: 0, left: 0,
    width: BONUS_PICKER_WIDTH, zIndex: 310, background: theme.panel, border: `1px solid ${theme.accent}`,
  };

  return (
    // stopPropagation keeps the workspace's outside-click handler from intercepting the
    // trigger toggle (this picker lives outside the lineup's click zone).
    <div ref={wrapperRef} onMouseDown={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => { if (!isOpen) { setFamily(null); } onToggle(); }}
        style={{ background: "none", border: "none", padding: 0, font: "inherit", width: "100%", cursor: "pointer" }}
      >
        {children}
      </button>
      {isOpen && createPortal(
        <div ref={portalRef} role="dialog" aria-label="Select bonus item" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={pickerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.4rem 0.6rem", borderBottom: `1px solid ${theme.border}` }}>
            {family && (
              <button
                type="button"
                onClick={() => setFamily(null)}
                style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", color: theme.muted, fontSize: "0.75rem", fontWeight: 700 }}
              >
                ‹ Back
              </button>
            )}
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.text }}>
              {family ? `${family} Dice — pick rarity` : "Select dice type"}
            </span>
          </div>
          {family
            ? <BonusColorList theme={theme} family={family} onPick={pickColor} />
            : <BonusFamilyList theme={theme} onPick={setFamily} />}
        </div>,
        document.body,
      )}
    </div>
  );
}
