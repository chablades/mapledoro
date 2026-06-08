"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CharacterAvatar from "../features/characters/tabs/components/CharacterAvatar";
import type { AppTheme } from "./themes";
import type { StoredCharacterRecord } from "../features/characters/model/charactersStore";

interface CharacterSyncPanelProps {
  theme: AppTheme;
  characters: StoredCharacterRecord[];
  selectedCharName: string | null;
  onCharChange: (name: string | null) => void;
  inputStyle: React.CSSProperties;
  sectionPanel: React.CSSProperties;
}

const AVATAR_SIZE = 34;

// Bordered avatar box. `record` null renders the "global" placeholder; a record
// without an image falls back to its first initial.
function CharacterAvatarBox({
  theme,
  record,
}: {
  theme: AppTheme;
  record: StoredCharacterRecord | null;
}) {
  const boxStyle: React.CSSProperties = {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: "8px",
    overflow: "hidden",
    flexShrink: 0,
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.muted,
    fontSize: "0.9rem",
    fontWeight: 800,
  };

  if (!record) return <div style={boxStyle}>◇</div>;
  if (!record.characterImgURL) {
    return <div style={boxStyle}>{record.characterName.charAt(0).toUpperCase()}</div>;
  }
  return (
    <div style={boxStyle}>
      <CharacterAvatar
        src={record.characterImgURL}
        alt={record.characterName}
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}

// Avatar + name + subtitle, shared by the trigger and the dropdown options.
function CharacterLabel({
  theme,
  record,
}: {
  theme: AppTheme;
  record: StoredCharacterRecord | null;
}) {
  return (
    <>
      <CharacterAvatarBox theme={theme} record={record} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: theme.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {record ? record.characterName : "None (global)"}
        </div>
        <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
          {record ? `Lv.${record.level} ${record.jobName}` : "Shared across characters"}
        </div>
      </div>
    </>
  );
}

function CharacterOption({
  theme,
  record,
  selected,
  onSelect,
}: {
  theme: AppTheme;
  record: StoredCharacterRecord | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      className={selected ? "csp-option csp-option-selected" : "csp-option"}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "6px 10px",
        cursor: "pointer",
        background: selected ? theme.accentSoft : "transparent",
      }}
    >
      <CharacterLabel theme={theme} record={record} />
    </div>
  );
}

export function CharacterSyncPanel({
  theme,
  characters,
  selectedCharName,
  onCharChange,
  inputStyle,
  sectionPanel,
}: CharacterSyncPanelProps) {
  const [open, setOpen] = useState(false);
  // Fixed-position coords for the portaled menu, measured from the trigger.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const positionMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  // While open: reposition on scroll/resize, close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const reposition = () => positionMenu();
    const handlePointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, positionMenu]);

  if (characters.length === 0) return null;

  const selected = characters.find((c) => c.characterName === selectedCharName) ?? null;

  const toggleOpen = () => {
    if (!open) positionMenu();
    setOpen((v) => !v);
  };

  const choose = (name: string | null) => {
    onCharChange(name);
    setOpen(false);
  };

  // Portaled to <body> with fixed positioning so it escapes any clipping or
  // stacking context from the nested panel/flex layout it lives in.
  const menu =
    open &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        className="csp-dropdown"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 90,
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          maxHeight: "320px",
          overflowY: "auto",
          padding: "4px",
        }}
      >
        <CharacterOption
          theme={theme}
          record={null}
          selected={selected === null}
          onSelect={() => choose(null)}
        />
        {characters.map((c) => (
          <CharacterOption
            key={c.characterName}
            theme={theme}
            record={c}
            selected={c.characterName === selectedCharName}
            onSelect={() => choose(c.characterName)}
          />
        ))}
      </div>,
      document.body,
    );

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <style>{`
        .csp-option { transition: background 0.15s; border-radius: 8px; }
        .csp-option:not(.csp-option-selected):hover { background: rgba(127,127,127,0.14); }
        .csp-trigger { transition: border-color 0.15s; }
        .csp-trigger:hover { border-color: ${theme.accent} !important; }
        .csp-dropdown { scrollbar-width: thin; scrollbar-color: rgba(127,127,127,0.45) transparent; }
        .csp-dropdown::-webkit-scrollbar { width: 8px; }
        .csp-dropdown::-webkit-scrollbar-track { background: transparent; }
        .csp-dropdown::-webkit-scrollbar-thumb { background: rgba(127,127,127,0.45); border-radius: 4px; }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
          Character
        </div>
        <div
          ref={triggerRef}
          className="tool-input csp-trigger"
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggleOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleOpen();
            }
          }}
          style={{
            ...inputStyle,
            flex: 1,
            minWidth: 220,
            maxWidth: 320,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          <CharacterLabel theme={theme} record={selected} />
          <span
            style={{
              color: theme.muted,
              fontSize: "0.7rem",
              flexShrink: 0,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            ▼
          </span>
        </div>
        {menu}
        {selectedCharName && (
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.accent }}>
            Synced
          </span>
        )}
      </div>
    </div>
  );
}
