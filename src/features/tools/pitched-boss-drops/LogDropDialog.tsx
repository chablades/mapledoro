"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";
import { localDateStr } from "../date";
import { toolStyles } from "../tool-styles";
import { ItemIcon } from "./pitched-boss-ui";
import {
  DROP_CATEGORIES,
  DROP_ITEMS,
  DROP_ITEMS_BY_ID,
  categoryLabel,
} from "./pitched-items";

export interface LogDropPayload {
  characterName: string;
  itemId: string;
  channel: number;
  date: string;
  note: string;
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

function fieldStyle(theme: AppTheme): CSSProperties {
  // Shared input colors + context sizing; static settings come from `.tool-input`.
  return {
    ...toolStyles(theme).inputStyle,
    width: "100%",
    height: 38,
    boxSizing: "border-box",
  };
}

function labelStyle(theme: AppTheme): CSSProperties {
  return {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: theme.muted,
    marginBottom: 4,
  };
}

function avatarFallbackStyle(theme: AppTheme): CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: theme.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    color: theme.accent,
    fontWeight: 800,
    flexShrink: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Character picker (card list, mirrors Boss Crystals dialog)         */
/* ------------------------------------------------------------------ */

function CharacterPicker({
  theme,
  characters,
  value,
  onChange,
}: {
  theme: AppTheme;
  characters: StoredCharacterRecord[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div
      className="pbd-char-list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        maxHeight: 340,
        overflowY: "auto",
      }}
    >
      {characters.map((c) => {
        const selected = value === c.characterName;
        return (
          <div
            key={c.characterName}
            className="pbd-char-opt"
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            onClick={() => onChange(c.characterName)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onChange(c.characterName);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "6px 10px",
              borderRadius: 10,
              background: selected ? theme.accentSoft : theme.timerBg,
              border: `1px solid ${selected ? theme.accent : theme.border}`,
              cursor: "pointer",
            }}
          >
            {c.characterImgURL ? (
              <Image
                src={c.characterImgURL}
                alt={c.characterName}
                width={32}
                height={32}
                unoptimized
                style={{ borderRadius: 6, objectFit: "contain", flexShrink: 0 }}
              />
            ) : (
              <div style={avatarFallbackStyle(theme)}>
                {c.characterName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>
                {c.characterName}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.muted }}>
                Lv.{c.level} {c.jobName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grouped, searchable item picker                                    */
/* ------------------------------------------------------------------ */

function ItemPicker({
  theme,
  value,
  onChange,
}: {
  theme: AppTheme;
  value: string;
  onChange: (itemId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DROP_ITEMS;
    return DROP_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q),
    );
  }, [search]);

  const selected = value ? DROP_ITEMS_BY_ID.get(value) ?? null : null;

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  const menuStyle: CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 260,
    overflowY: "auto",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    zIndex: 10,
    marginTop: 4,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        className="pbd-combobox tool-input"
        role="combobox"
        tabIndex={0}
        aria-expanded={open}
        aria-controls="pbd-item-listbox"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{ ...fieldStyle(theme), display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
      >
        {selected && !open && <ItemIcon id={selected.itemId} />}
        <input
          type="text"
          value={open ? search : (selected?.name ?? "")}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          placeholder="Search items…"
          style={{
            border: "none",
            background: "transparent",
            color: theme.text,
            outline: "none",
            width: "100%",
            fontSize: "0.85rem",
            padding: 0,
            cursor: "inherit",
          }}
        />
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: theme.muted, pointerEvents: "none" }}>
          ▼
        </span>
      </div>
      {open && (
        <div id="pbd-item-listbox" role="listbox" style={menuStyle}>
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: "0.8rem", color: theme.muted, textAlign: "center" }}>
              No items found
            </div>
          )}
          {DROP_CATEGORIES.map((cat) => {
            const items = filtered.filter((i) => i.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id}>
                <div
                  style={{
                    padding: "8px 12px 4px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: theme.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {cat.label}
                </div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="pbd-option"
                    role="option"
                    tabIndex={0}
                    aria-selected={value === item.id}
                    onClick={() => pick(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        pick(item.id);
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    <ItemIcon id={item.itemId} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dialog                                                             */
/* ------------------------------------------------------------------ */

export default function LogDropDialog({
  theme,
  characters,
  onClose,
  onSubmit,
}: {
  theme: AppTheme;
  characters: StoredCharacterRecord[];
  onClose: () => void;
  onSubmit: (payload: LogDropPayload) => void;
}) {
  const [charName, setCharName] = useState("");
  const [itemId, setItemId] = useState("");
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState(localDateStr);
  const [note, setNote] = useState("");

  const styles = toolStyles(theme);

  const ready = charName !== "" && itemId !== "" && channel !== "" && date !== "";

  function handleSubmit() {
    if (!ready) return;
    onSubmit({ characterName: charName, itemId, channel: parseInt(channel, 10), date, note: note.trim() });
  }

  return createPortal(
    <div
      className="pbd-overlay"
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <style>{`
        .pbd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .pbd-dialog { background: ${theme.panel}; border: 1px solid ${theme.border}; border-radius: 16px; max-width: 640px; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.15); padding: 1.5rem 1.5rem 1.75rem; }
        .pbd-char-list { scrollbar-width: none; -ms-overflow-style: none; }
        .pbd-char-list::-webkit-scrollbar { width: 0; height: 0; background: transparent; }
        .pbd-char-list::-webkit-scrollbar-thumb { background: transparent; }
        @media (max-width: 560px) {
          .pbd-char-list { max-height: 176px !important; }
        }
        .pbd-option:hover { background: ${theme.accentSoft}; }
        .pbd-char-opt:hover { border-color: ${theme.accent} !important; }
        .pbd-dlg-btn { transition: background 0.15s, transform 0.1s; cursor: pointer; user-select: none; }
        .pbd-dlg-btn:active { transform: scale(0.97); }
      `}</style>
      <div
        className="pbd-dialog"
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: "1.25rem",
          }}
        >
          Log a Drop
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
          {/* Character column */}
          <div style={{ flex: "1 1 220px", minWidth: 220 }}>
            <span style={labelStyle(theme)}>Character</span>
            <CharacterPicker
              theme={theme}
              characters={characters}
              value={charName}
              onChange={setCharName}
            />
          </div>

          {/* Drop details column */}
          <div style={{ flex: "1 1 260px", minWidth: 260, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <span style={labelStyle(theme)}>Item Dropped</span>
              <ItemPicker theme={theme} value={itemId} onChange={setItemId} />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <label style={{ ...labelStyle(theme), flex: "0 0 90px" }}>
                Channel
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={channel}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="1"
                  className="tool-input"
                  style={fieldStyle(theme)}
                />
              </label>
              <label style={{ ...labelStyle(theme), flex: 1 }}>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="tool-input"
                  style={fieldStyle(theme)}
                />
              </label>
            </div>

            <label style={labelStyle(theme)}>
              Note (optional)
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. next in line, sold for…"
                className="tool-input"
                style={fieldStyle(theme)}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
          <div
            className="pbd-dlg-btn tool-dialog-btn"
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClose();
              }
            }}
            style={styles.dialogBtnStyle}
          >
            Cancel
          </div>
          <div
            className="pbd-dlg-btn tool-dialog-btn"
            role="button"
            tabIndex={0}
            onClick={ready ? handleSubmit : undefined}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && ready) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            style={{
              ...styles.dialogPrimaryBtnStyle,
              opacity: ready ? 1 : 0.5,
              cursor: ready ? "pointer" : "not-allowed",
            }}
          >
            Add Drop
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
