"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePickerCoords } from "../hooks/usePickerCoords";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import { searchAndRank } from "../../../../lib/searchMatch";
import type { AppTheme } from "../../../../components/themes";
import {
  IA_TIER_LABELS, IA_TIER_ORDER, allowedLineTiers, getLinesForIATier, normalizeIA,
  type IADraft, type IAFull, type IALineFull, type IAPresetFull, type IATier,
} from "../data/innerAbilityData";

const PRESET_COUNT = 3;

type SwatchColor = { bg: string; border: string; text: string };

const IA_TIER_COLORS: Record<IATier, SwatchColor> = {
  rare:      { bg: "#0d1e38", border: "#4080c0", text: "#6ab4ff" },
  epic:      { bg: "#1e0d38", border: "#8040c0", text: "#c084fc" },
  unique:    { bg: "#2a1e00", border: "#c08020", text: "#fbbf24" },
  legendary: { bg: "#001e10", border: "#20a040", text: "#4ade80" },
};

const IA_PICKER_WIDTH = 240;

const iaSearchInputStyle: CSSProperties = {
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

const iaPopoverVisualStyle: CSSProperties = {
  borderRadius: 10,
  boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
  overflow: "hidden",
};

const IA_POPOVER_SHELL: CSSProperties = {
  ...iaPopoverVisualStyle, position: "absolute", top: 0, left: 0, width: IA_PICKER_WIDTH, zIndex: 310,
};

const pickerClearRowStyle = (theme: AppTheme): CSSProperties => ({
  display: "block", width: "100%", padding: "0.35rem 0.5rem", background: "transparent",
  border: "none", borderBottom: `1px solid ${theme.border}`, cursor: "pointer",
  fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700, color: theme.muted, textAlign: "left",
});

const iaGradeButtonStyle = (theme: AppTheme, c: SwatchColor | null): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.5rem 0.7rem", borderRadius: 8,
  border: `1px solid ${c ? c.border : theme.border}`,
  background: c ? c.border : theme.bg,
  color: c ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", textAlign: "left",
  transition: "border-color 0.15s ease, background 0.15s ease",
});

function iaGradeOptionBackground(tc: SwatchColor, active: boolean, isHighlighted: boolean): string {
  if (active) return tc.border;
  if (isHighlighted) return `${tc.border}33`;
  return "transparent";
}

const iaGradeOptionStyle = (theme: AppTheme, tc: SwatchColor, active: boolean, isHighlighted: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0.45rem 0.6rem",
  background: iaGradeOptionBackground(tc, active, isHighlighted), color: active ? "#fff" : theme.text,
  border: "none", borderBottom: `1px solid ${theme.border}`, cursor: "pointer",
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem", textAlign: "left",
});

const iaLineOptionStyle = (theme: AppTheme, isHighlighted: boolean): CSSProperties => ({
  display: "block", width: "100%", padding: "0.3rem 0.5rem", background: isHighlighted ? `${theme.accent}22` : "transparent",
  border: "none", borderBottom: `1px solid ${theme.border}`, cursor: "pointer",
  fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: theme.text, textAlign: "left",
});

const iaLineBarStyle = (theme: AppTheme, c: SwatchColor | null, grade: IATier | ""): CSSProperties => ({
  display: "block", width: "100%", padding: "0.5rem 0.7rem", borderRadius: 8,
  border: c ? `1px solid ${c.border}` : `1px dashed ${theme.border}`,
  background: c ? c.border : theme.bg,
  color: c ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", textAlign: "left",
  cursor: grade ? "pointer" : "not-allowed", opacity: grade ? 1 : 0.55,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});

const iaTierToggleStyle = (theme: AppTheme, tc: SwatchColor, active: boolean): CSSProperties => ({
  flex: 1, padding: "0.3rem", borderRadius: 6,
  border: `1px solid ${active ? tc.border : theme.border}`,
  background: active ? tc.border : theme.bg, color: active ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.72rem", cursor: "pointer",
});

const presetButtonStyle = (theme: AppTheme, on: boolean): CSSProperties => ({
  border: `1px solid ${on ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: on ? theme.accent : theme.bg,
  color: on ? "#fff" : theme.text,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  width: 34, height: 32, cursor: "pointer",
});

function IAPresetBar({ theme, active, onSwitch }: {
  theme: AppTheme;
  active: number;
  onSwitch: (n: number) => void;
}) {
  const indices = Array.from({ length: PRESET_COUNT }, (_, i) => i);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted }}>
        Preset
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {indices.map((i) => {
          const on = i === active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSwitch(i)}
              style={presetButtonStyle(theme, on)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Colored grade banner ("Legendary Ability") that opens a 4-tier grade selector. */
function IAGradeHeader({ grade, openId, theme, onToggle, onClose, onSelect, onClear }: {
  grade: IATier | "";
  openId: string | null;
  theme: AppTheme;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (tier: IATier) => void;
  onClear: () => void;
}) {
  const isOpen = openId === "ia-grade";
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, IA_PICKER_WIDTH);
  const c = grade ? IA_TIER_COLORS[grade] : null;

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: IA_TIER_ORDER,
    resetKey: isOpen,
    onSelect: (t) => { onSelect(t); onClose(); },
  });

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if ((e.key === "Backspace" || e.key === "Delete") && grade) {
      e.preventDefault();
      onClear();
      onClose();
      return;
    }
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); onToggle(); }
      return;
    }
    navKeyDown(e);
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onKeyDown={handleTriggerKeyDown}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; if (!c) e.currentTarget.style.background = theme.panel; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = c ? c.border : theme.border; if (!c) e.currentTarget.style.background = theme.bg; }}
        style={iaGradeButtonStyle(theme, c)}
      >
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
          <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
        </svg>
        {grade ? `${IA_TIER_LABELS[grade]} Ability` : "Set Ability Grade"}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ marginLeft: "auto", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && createPortal(
        <div ref={portalRef} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          style={{ ...IA_POPOVER_SHELL, background: theme.panel, border: `1px solid ${theme.accent}` }}>
          {grade && (
            <button type="button" onClick={() => { onClear(); onClose(); }} style={pickerClearRowStyle(theme)}>
              — Clear —
            </button>
          )}
          {IA_TIER_ORDER.map((t, i) => {
            const tc = IA_TIER_COLORS[t];
            const active = grade === t;
            return (
              <button key={t} ref={itemRef(i)} type="button" onClick={() => { onSelect(t); onClose(); }}
                style={iaGradeOptionStyle(theme, tc, active, i === highlightedIndex)}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = tc.border; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.text; } }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: tc.border, flexShrink: 0 }} />
                {IA_TIER_LABELS[t]} Ability
              </button>
            );
          })}
        </div>,
        document.body!
      )}
    </div>
  );
}

/** Search + value list for a line's chosen tier. Mounts when the line popover opens. */
function IALineOptions({ tier, currentValue, theme, onPick, onClose }: {
  tier: IATier;
  currentValue: string;
  theme: AppTheme;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const options = getLinesForIATier(tier).filter((l) => l !== currentValue);
  const filtered = query ? searchAndRank(options, query, (l) => l) : options;

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (line) => onPick(line),
    onClose,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Backspace" && query === "" && currentValue) {
      e.preventDefault();
      onPick("");
      return;
    }
    navKeyDown(e);
  }

  return (
    <>
      {currentValue && (
        <button type="button" onClick={() => onPick("")}
          style={pickerClearRowStyle(theme)}>
          — Clear —
        </button>
      )}
      <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
        <input ref={inputRef} type="text" aria-label="Search Inner Ability lines" value={query} placeholder="Search…"
          onChange={(e) => setQuery(e.target.value)} onKeyDown={handleSearchKeyDown}
          style={{ ...iaSearchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }} />
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {filtered.map((line, i) => (
          <button key={line} ref={itemRef(i)} type="button" onClick={() => onPick(line)}
            style={iaLineOptionStyle(theme, i === highlightedIndex)}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            {line}
          </button>
        ))}
        {filtered.length === 0 && (
          <p style={{ margin: 0, padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>No results</p>
        )}
      </div>
    </>
  );
}

/** One colored line bar (tier color + value), opening a popover to pick its tier (≤ grade) and value. */
function IALineBar({ lineIdx, line, grade, openId, theme, onToggle, onClose, onSetTier, onSetValue }: {
  lineIdx: number;
  line: IALineFull;
  grade: IATier | "";
  openId: string | null;
  theme: AppTheme;
  onToggle: () => void;
  onClose: () => void;
  onSetTier: (tier: IATier) => void;
  onSetValue: (tier: IATier, value: string) => void;
}) {
  const isOpen = openId === `ia-line-${lineIdx}`;
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, IA_PICKER_WIDTH);
  const allowed = grade ? allowedLineTiers(grade, lineIdx) : [];
  // Line 1's tier is the grade; a line with a single allowed tier takes it implicitly.
  let tier: IATier | "" = "";
  if (lineIdx === 0) tier = grade;
  else if (line.tier) tier = line.tier;
  else if (allowed.length === 1) tier = allowed[0];
  const showTierRow = lineIdx > 0 && allowed.length > 1;
  const c = tier ? IA_TIER_COLORS[tier] : null;
  const label = !grade ? "Set ability grade first" : (line.value || `Line ${lineIdx + 1}`);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button type="button" disabled={!grade} onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={iaLineBarStyle(theme, c, grade)}>
        {label}
      </button>
      {isOpen && grade && createPortal(
        <div ref={portalRef} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          style={{ ...IA_POPOVER_SHELL, background: theme.panel, border: `1px solid ${theme.accent}` }}>
          {showTierRow && (
            <div style={{ display: "flex", gap: 4, padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
              {allowed.map((t) => {
                const tc = IA_TIER_COLORS[t];
                const active = line.tier === t;
                return (
                  <button key={t} type="button" onClick={() => onSetTier(t)}
                    style={iaTierToggleStyle(theme, tc, active)}>
                    {IA_TIER_LABELS[t]}
                  </button>
                );
              })}
            </div>
          )}
          {tier ? (
            <IALineOptions tier={tier} currentValue={line.value} theme={theme}
              onPick={(v) => { onSetValue(tier, v); onClose(); }} onClose={onClose} />
          ) : (
            <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.78rem", color: theme.muted, fontWeight: 600 }}>Pick a tier first</p>
          )}
        </div>,
        document.body!
      )}
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
// Self-contained Inner Ability editor: preset bar + grade banner + 3 line bars, each
// opening a portal popover. Owns its own "which popover is open" state and closes it
// on an outside click, scoped to its own zone ref (popovers stop propagation).

export default function InnerAbilitySetupStep({ draft, onUpdate, theme }: {
  draft: IADraft | undefined;
  onUpdate: (next: IADraft) => void;
  theme: AppTheme;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const ia: IAFull = normalizeIA(draft);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function setPreset(n: number) {
    setOpenId(null); // close any open line/grade popover; it belongs to the preset we're leaving
    if (n === ia.activePreset) return;
    onUpdate({ ...ia, activePreset: n });
  }

  function setLine(lineIdx: number, patch: Partial<IALineFull>) {
    const presets = ia.presets.map((p, i) => {
      if (i !== ia.activePreset) return p;
      const lines = p.lines.map((l, j) => (j === lineIdx ? { ...l, ...patch } : l)) as IAPresetFull["lines"];
      return { lines };
    }) as IAFull["presets"];
    onUpdate({ ...ia, presets });
  }

  // Sets the overall ability grade (= line 1's tier) and re-clamps lines 2-3 that now fall
  // outside their allowed range, clearing the affected line (value pools differ per tier).
  function setGrade(grade: IATier) {
    const active = ia.presets[ia.activePreset];
    if (active.lines[0].tier === grade) return;
    const lines = active.lines.map((l, idx) => {
      if (idx === 0) return { tier: grade, value: "" };
      return allowedLineTiers(grade, idx).includes(l.tier as IATier) ? l : { tier: "", value: "" };
    }) as IAPresetFull["lines"];
    const presets = ia.presets.map((p, i) => (i === ia.activePreset ? { lines } : p)) as IAFull["presets"];
    onUpdate({ ...ia, presets });
  }

  // Clears the grade back to unset, wiping all 3 lines with it (their allowed
  // tiers/values are only meaningful relative to a chosen grade).
  function clearGrade() {
    const active = ia.presets[ia.activePreset];
    if (!active.lines[0].tier) return;
    const lines = active.lines.map(() => ({ tier: "" as IATier | "", value: "" })) as IAPresetFull["lines"];
    const presets = ia.presets.map((p, i) => (i === ia.activePreset ? { lines } : p)) as IAFull["presets"];
    onUpdate({ ...ia, presets });
  }

  // Closes the line/grade picker on outside clicks, scoped to this section's zone
  // (its portal popovers stop propagation, so they don't trigger this themselves).
  useEffect(() => {
    if (!openId) return;
    function handleMouseDown(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openId]);

  return (
    <div ref={zoneRef} style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 6 }}>
      <IAPresetBar theme={theme} active={ia.activePreset} onSwitch={setPreset} />
      <IAGradeHeader
        grade={ia.presets[ia.activePreset].lines[0].tier}
        openId={openId}
        theme={theme}
        onToggle={() => toggle("ia-grade")}
        onClose={() => setOpenId(null)}
        onSelect={setGrade}
        onClear={clearGrade}
      />
      {ia.presets[ia.activePreset].lines.map((line, i) => (
        <IALineBar
          key={i}
          lineIdx={i}
          line={line}
          grade={ia.presets[ia.activePreset].lines[0].tier}
          openId={openId}
          theme={theme}
          onToggle={() => toggle(`ia-line-${i}`)}
          onClose={() => setOpenId(null)}
          onSetTier={(t) => setLine(i, { tier: t, value: "" })}
          onSetValue={(t, v) => setLine(i, { tier: t, value: v })}
        />
      ))}
    </div>
  );
}
