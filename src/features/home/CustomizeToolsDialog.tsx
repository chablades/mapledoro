"use client";

import { useState, type CSSProperties } from "react";
import ModalShell from "../../components/ModalShell";
import { dialogBtnColors, dialogPrimaryBtnColors, type AppTheme } from "../../components/themes";
import { ALL_QUICK_TOOLS, HOME_TOOLS_COUNT, type QuickLink } from "./quickTools";
import { ToolIcon } from "./ToolIcon";

// Single selectable row in the customize dialog.
function ToolOption({
  theme,
  tool,
  selected,
  disabled,
  onToggle,
}: {
  theme: AppTheme;
  tool: QuickLink;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const optionStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.55rem 0.65rem",
    borderRadius: 12,
    border: `1px solid ${selected ? theme.accent : theme.border}`,
    background: selected ? theme.accentSoft : theme.bg,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    textAlign: "left",
    fontFamily: "inherit",
    width: "100%",
    transition: "border-color 0.15s, background 0.15s",
  };
  const checkStyle: CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: 6,
    flexShrink: 0,
    border: `1px solid ${selected ? theme.accent : theme.border}`,
    background: selected ? theme.accent : "transparent",
    color: theme.accentOn,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.78rem",
    fontWeight: 800,
  };
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      style={optionStyle}
    >
      <div style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <ToolIcon tool={tool} size={26} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: theme.text, lineHeight: 1.2 }}>
          {tool.title}
        </div>
        <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {tool.desc}
        </div>
      </div>
      <span style={checkStyle}>{selected ? "✓" : ""}</span>
    </button>
  );
}

export default function CustomizeToolsDialog({
  theme,
  current,
  onClose,
  onSave,
}: {
  theme: AppTheme;
  current: string[];
  onClose: () => void;
  onSave: (hrefs: string[]) => void;
}) {
  // Captured once on purpose: the dialog is mounted fresh per edit session
  // (`{editing && ...}`), so `current` can't change while it's open.
  const [draft, setDraft] = useState<string[]>(() => current);

  const draftSet = new Set(draft);
  const atMax = draft.length >= HOME_TOOLS_COUNT;
  const canSave = draft.length === HOME_TOOLS_COUNT;

  const toggle = (href: string) => {
    setDraft((prev) => {
      if (prev.includes(href)) return prev.filter((h) => h !== href);
      if (prev.length >= HOME_TOOLS_COUNT) return prev;
      return [...prev, href];
    });
  };

  const save = () => onSave(ALL_QUICK_TOOLS.flatMap((t) => (draftSet.has(t.href) ? [t.href] : [])));

  const countBadgeStyle: CSSProperties = {
    marginLeft: "auto",
    fontSize: "0.78rem",
    fontWeight: 800,
    color: canSave ? theme.accentText : theme.muted,
    background: canSave ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${canSave ? theme.accent + "55" : theme.border}`,
    padding: "2px 9px",
    borderRadius: 999,
    flexShrink: 0,
  };

  return (
    <ModalShell
      theme={theme}
      className="customize-tools-dialog"
      ariaLabel="Customize dashboard tools"
      onClose={onClose}
      style={{ width: "min(560px, 100%)", maxHeight: "85vh", overflow: "hidden" }}
    >
        <style>{`
          dialog.customize-tools-dialog[open] { display: flex; flex-direction: column; }
          @media (min-width: 540px) {
            .customize-tools-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
        <div style={{ padding: "1rem 1.1rem 0.75rem", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.05rem" }}>
              Customize Tools
            </span>
            <span style={countBadgeStyle}>{draft.length} / {HOME_TOOLS_COUNT}</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600, marginTop: 4 }}>
            Pick exactly {HOME_TOOLS_COUNT} tools to show on your dashboard.
          </div>
        </div>

        <div style={{ padding: "0.85rem 1.1rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
          <div className="customize-tools-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
            {ALL_QUICK_TOOLS.map((tool) => {
              const selected = draftSet.has(tool.href);
              return (
                <ToolOption
                  key={tool.href}
                  theme={theme}
                  tool={tool}
                  selected={selected}
                  disabled={!selected && atMax}
                  onToggle={() => toggle(tool.href)}
                />
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem", padding: "0.8rem 1.1rem", borderTop: `1px solid ${theme.border}` }}>
          <button
            type="button"
            onClick={onClose}
            className="tool-btn tool-dialog-btn"
            style={dialogBtnColors(theme)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="tool-btn tool-dialog-btn"
            style={{
              ...dialogPrimaryBtnColors(theme),
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
    </ModalShell>
  );
}
