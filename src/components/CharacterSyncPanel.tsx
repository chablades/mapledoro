"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
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
  /** Panel chrome around the picker row. Omit to render the bare row for
   *  embedding in an existing panel. */
  sectionPanel?: React.CSSProperties;
}

const AVATAR_SIZE = 34;

/** Avatar + 2×5px padding + 2×1px border. The trigger borrows `.tool-input` for
 *  its chrome but is a div wrapping an avatar, so it sets its own height rather
 *  than growing to whatever the text controls happen to be. Exported so a
 *  control sitting beside the picker can match it. */
export const CHARACTER_DROPDOWN_HEIGHT = AVATAR_SIZE + 12;

/** Display labels for a non-character row (the null option or an extra option). */
interface OptionLabels {
  label: string;
  subtitle: string;
}

const NULL_OPTION_DEFAULT: OptionLabels = {
  label: "None (global)",
  subtitle: "Shared across characters",
};

// Bordered avatar box. `record` null renders the placeholder; a record
// without an image falls back to its first initial.
export function CharacterAvatarBox({
  theme,
  record,
  size = AVATAR_SIZE,
}: {
  theme: AppTheme;
  record: StoredCharacterRecord | null;
  size?: number;
}) {
  const boxStyle: React.CSSProperties = {
    width: size,
    height: size,
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
        width={size}
        height={size}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}

// Avatar + name + subtitle, shared by the trigger and the dropdown options.
// `fallback` supplies the text when there is no character record.
function CharacterLabel({
  theme,
  record,
  fallback = NULL_OPTION_DEFAULT,
}: {
  theme: AppTheme;
  record: StoredCharacterRecord | null;
  fallback?: OptionLabels;
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
          {record ? record.characterName : fallback.label}
        </div>
        <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
          {record ? `Lv.${record.level} ${record.jobName}` : fallback.subtitle}
        </div>
      </div>
    </>
  );
}

function CharacterOption({
  theme,
  record,
  fallback,
  selected,
  onSelect,
}: {
  theme: AppTheme;
  record: StoredCharacterRecord | null;
  fallback?: OptionLabels;
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
      <CharacterLabel theme={theme} record={record} fallback={fallback} />
    </div>
  );
}

interface CharacterDropdownProps {
  theme: AppTheme;
  characters: StoredCharacterRecord[];
  selectedCharName: string | null;
  onCharChange: (name: string | null) => void;
  inputStyle: React.CSSProperties;
  /** Labels for the no-character row (defaults to the sync-panel wording). */
  nullOption?: OptionLabels;
  /** Extra row appended after the characters; selecting it reports its `value`. */
  extraOption?: OptionLabels & { value: string };
  /** Size/layout overrides for the trigger. */
  triggerStyle?: React.CSSProperties;
}

/** Avatar + name dropdown for picking a stored character. The menu is portaled
 *  to <body> with fixed positioning so it escapes any clipping or stacking
 *  context from the nested panel/flex layout it lives in. */
export function CharacterDropdown({
  theme,
  characters,
  selectedCharName,
  onCharChange,
  inputStyle,
  nullOption = NULL_OPTION_DEFAULT,
  extraOption,
  triggerStyle,
}: CharacterDropdownProps) {
  const [open, setOpen] = useState(false);
  // Fixed-position coords for the portaled menu, measured from the trigger.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const positionMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
  };

  // Effect Event so the open-menu effect can call the latest positionMenu
  // from its listeners without re-subscribing them on every render.
  const repositionMenu = useEffectEvent(positionMenu);

  // While open: reposition on scroll/resize, close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const reposition = () => repositionMenu();
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
  }, [open]);

  const selected = characters.find((c) => c.characterName === selectedCharName) ?? null;
  const extraSelected = extraOption !== undefined && selectedCharName === extraOption.value;

  const toggleOpen = () => {
    if (!open) positionMenu();
    setOpen((v) => !v);
  };

  const choose = (name: string | null) => {
    onCharChange(name);
    setOpen(false);
  };

  const mergedTriggerStyle: React.CSSProperties = {
    ...inputStyle,
    flex: 1,
    minWidth: 220,
    maxWidth: 320,
    height: CHARACTER_DROPDOWN_HEIGHT,
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "5px 10px",
    cursor: "pointer",
    ...triggerStyle,
  };

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: menuPos?.top,
    left: menuPos?.left,
    width: menuPos?.width,
    zIndex: 90,
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    maxHeight: "320px",
    overflowY: "auto",
    padding: "4px",
  };

  const menu =
    open &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        className="csp-dropdown"
        style={menuStyle}
      >
        <CharacterOption
          theme={theme}
          record={null}
          fallback={nullOption}
          selected={selectedCharName === null}
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
        {extraOption && (
          <CharacterOption
            theme={theme}
            record={null}
            fallback={extraOption}
            selected={extraSelected}
            onSelect={() => choose(extraOption.value)}
          />
        )}
      </div>,
      document.body,
    );

  return (
    <>
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
        style={mergedTriggerStyle}
      >
        <CharacterLabel
          theme={theme}
          record={selected}
          fallback={extraSelected ? extraOption : nullOption}
        />
        <span
          style={{
            color: theme.muted,
            fontSize: "0.75rem",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          ▼
        </span>
      </div>
      {menu}
    </>
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
  const row = (
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
      <CharacterDropdown
        theme={theme}
        characters={characters}
        selectedCharName={selectedCharName}
        onCharChange={onCharChange}
        inputStyle={inputStyle}
      />
    </div>
  );

  if (!sectionPanel) return row;

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      {row}
    </div>
  );
}
