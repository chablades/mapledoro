"use client";

import { useState, useSyncExternalStore } from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  BOSSES,
  BOSS_GROUPS,
  PRESETS,
  formatMeso,
} from "./bosses";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";
import { type BossRow, type CharacterEntry, checkBg } from "./boss-crystals-types";
import { useBossCrystalsState } from "./useBossCrystalsState";

// -- Sub-components -----------------------------------------------------------

function CharacterCard({
  theme,
  char,
  income,
  serverMult,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
}: {
  theme: AppTheme;
  char: CharacterEntry;
  income: { meso: number; crystals: number };
  serverMult: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const selected = char.bosses
    .map((b, bi) => ({ ...b, boss: BOSSES[bi] }))
    .filter((b) => b.checked);

  return (
    <div
      className="fade-in bc-card panel-card"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: theme.panel,
        border: `1px solid ${isDropTarget ? theme.accent : theme.border}`,
        borderRadius: "14px",
        padding: "1.25rem",
        position: "relative",
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
    >
      {/* Top-right actions */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          display: "flex",
          gap: "4px",
        }}
      >
        <div
          className="bc-btn"
          onClick={onDelete}
          title="Remove character"
          style={{
            padding: "5px 7px",
            borderRadius: "8px",
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            fontSize: "0.65rem",
            fontWeight: 800,
            color: "#e05a5a",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </div>
        <div
          className="bc-btn"
          onClick={onEdit}
          title="Edit bosses"
          style={{
            padding: "5px",
            borderRadius: "8px",
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill={theme.muted}>
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </div>
      </div>

      {/* Character header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.75rem",
          paddingRight: "4rem",
        }}
      >
        {char.imageURL ? (
          <img
            src={char.imageURL}
            alt={char.name}
            width={48}
            height={48}
            style={{
              borderRadius: "10px",
              background: theme.timerBg,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "10px",
              background: theme.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              color: theme.accent,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {char.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.95rem",
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {char.name}
          </div>
          <div style={{ fontSize: "0.72rem", color: theme.muted, fontWeight: 700 }}>
            {income.crystals}/14 crystals · {formatMeso(income.meso)} mesos
          </div>
        </div>
      </div>

      {/* Boss list */}
      <div
        style={{
          borderTop: `1px solid ${theme.border}`,
          paddingTop: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        {selected.length === 0 ? (
          <div
            style={{
              fontSize: "0.75rem",
              color: theme.muted,
              fontStyle: "italic",
              padding: "0.25rem 0",
            }}
          >
            No bosses selected
          </div>
        ) : (
          selected.map((b) => (
            <div
              key={b.boss.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.72rem",
                color: theme.text,
                fontWeight: 600,
                padding: "1.5px 0",
              }}
            >
              <img
                src={b.boss.icon}
                alt=""
                width={18}
                height={18}
                style={{
                  borderRadius: "3px",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {b.boss.name}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: theme.muted,
                  marginLeft: "4px",
                  flexShrink: 0,
                }}
              >
                {b.partySize > 1 ? `${b.partySize}p · ` : ""}
                {formatMeso(b.boss.meso / b.partySize / serverMult)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddNameDialog({
  theme,
  available,
  nameMode,
  onNameMode,
  typedName,
  onTypedName,
  selectedChar,
  onSelectedChar,
  pendingName,
  onNext,
  onClose,
}: {
  theme: AppTheme;
  available: StoredCharacterRecord[];
  nameMode: "type" | "select";
  onNameMode: (m: "type" | "select") => void;
  typedName: string;
  onTypedName: (v: string) => void;
  selectedChar: StoredCharacterRecord | null;
  onSelectedChar: (c: StoredCharacterRecord) => void;
  pendingName: string;
  onNext: () => void;
  onClose: () => void;
}) {
  const hasAvailable = available.length > 0;

  return (
    <div className="bc-overlay" onClick={onClose}>
      <div
        className="bc-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "1.5rem" }}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: "1.25rem",
          }}
        >
          Add Character
        </div>

        {hasAvailable ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="bc-name-mode"
                checked={nameMode === "type"}
                onChange={() => onNameMode("type")}
                style={{ accentColor: theme.accent }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
                Type a name
              </span>
            </label>
            {nameMode === "type" && (
              <input
                type="text"
                placeholder="Character name"
                maxLength={14}
                value={typedName}
                onChange={(e) => onTypedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typedName.trim()) onNext();
                }}
                autoFocus
                className="tool-input"
                style={{
                  background: theme.timerBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: theme.text,
                  fontSize: "0.85rem",
                  width: "calc(100% - 1.5rem)",
                  marginLeft: "1.5rem",
                  outline: "none",
                }}
              />
            )}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="bc-name-mode"
                checked={nameMode === "select"}
                onChange={() => onNameMode("select")}
                style={{ accentColor: theme.accent }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
                Select from imported characters
              </span>
            </label>
            {nameMode === "select" && (
              <div
                style={{
                  marginLeft: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  maxHeight: "40vh",
                  overflowY: "auto",
                }}
              >
                {available.map((c) => {
                  const isSelected = selectedChar?.characterName === c.characterName;
                  return (
                    <div
                      key={c.characterName}
                      className="bc-char-opt"
                      onClick={() => onSelectedChar(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: isSelected ? theme.accentSoft : theme.timerBg,
                        border: `1px solid ${isSelected ? theme.accent : theme.border}`,
                      }}
                    >
                      {c.characterImgURL ? (
                        <img
                          src={c.characterImgURL}
                          alt={c.characterName}
                          width={32}
                          height={32}
                          style={{
                            borderRadius: "6px",
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "6px",
                            background: theme.accentSoft,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color: theme.accent,
                            flexShrink: 0,
                          }}
                        >
                          {c.characterName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>
                          {c.characterName}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: theme.muted }}>
                          Lv.{c.level} {c.jobName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: "1.25rem" }}>
            <input
              type="text"
              placeholder="Character name"
              maxLength={14}
              value={typedName}
              onChange={(e) => onTypedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && typedName.trim()) onNext();
              }}
              autoFocus
              className="tool-input"
              style={{
                background: theme.timerBg,
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: theme.text,
                fontSize: "0.85rem",
                width: "100%",
                outline: "none",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <div
            className="bc-btn"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.muted,
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
            }}
          >
            Cancel
          </div>
          <div
            className="bc-btn"
            onClick={pendingName ? onNext : undefined}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: pendingName ? theme.accentText : theme.muted,
              background: pendingName ? theme.accentSoft : theme.timerBg,
              border: `1px solid ${pendingName ? theme.accent : theme.border}`,
              opacity: pendingName ? 1 : 0.5,
              cursor: pendingName ? "pointer" : "not-allowed",
            }}
          >
            Next
          </div>
        </div>
      </div>
    </div>
  );
}

function BossSelectionDialog({
  theme,
  title,
  serverMult,
  bosses,
  disabled,
  preview,
  showBack,
  confirmLabel,
  onToggle,
  onPartyChange,
  onPreset,
  onBack,
  onCancel,
  onConfirm,
}: {
  theme: AppTheme;
  title: string;
  serverMult: number;
  bosses: BossRow[];
  disabled: Set<number>;
  preview: { meso: number; crystals: number };
  showBack: boolean;
  confirmLabel: string;
  onToggle: (bi: number) => void;
  onPartyChange: (bi: number, val: number) => void;
  onPreset: (key: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="bc-overlay" onClick={onCancel}>
      <div
        className="bc-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "1.5rem" }}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: "0.5rem",
          }}
        >
          {title}
        </div>

        {/* Presets */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
            paddingBottom: "0.75rem",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              color: theme.muted,
              marginRight: "0.25rem",
            }}
          >
            Presets
          </span>
          {PRESETS.filter((p) => p.key !== "").map((p) => (
            <div
              key={p.key}
              className="bc-btn"
              onClick={() => onPreset(p.key)}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "0.72rem",
                fontWeight: 800,
                color: theme.accentText,
                background: theme.accentSoft,
                border: `1px solid ${theme.border}`,
              }}
            >
              {p.label}
            </div>
          ))}
          <div
            className="bc-btn"
            onClick={() => onPreset("")}
            style={{
              marginLeft: "auto",
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "#e05a5a",
              background: "transparent",
              border: "1px solid #e05a5a33",
            }}
          >
            Clear
          </div>
        </div>

        {/* Boss groups */}
        <div style={{ maxHeight: "50vh", overflowY: "auto", marginBottom: "0.75rem" }}>
          {BOSS_GROUPS.map((group) => (
            <div key={group.label}>
              {group.bossIndices.length > 1 && group.label !== "Cygnus" && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: theme.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "0.5rem 8px 0.15rem",
                  }}
                >
                  {group.label}
                </div>
              )}
              {group.bossIndices.map((bi) => {
                const boss = BOSSES[bi];
                const row = bosses[bi];
                const isDisabled = disabled.has(bi);
                const maxParty = boss.name === "Lotus (Extreme)" ? 2 : 6;
                const checked = row.checked && !isDisabled;

                return (
                  <div
                    key={boss.name}
                    className="bc-boss-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      opacity: isDisabled ? 0.4 : 1,
                    }}
                  >
                    <div
                      onClick={() => {
                        if (!isDisabled) onToggle(bi);
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        border: `2px solid ${checked ? theme.accent : theme.border}`,
                        background: checkBg(isDisabled, row.checked, theme.accent, theme.timerBg),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {checked && (
                        <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 900 }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <img
                      src={boss.icon}
                      alt=""
                      width={22}
                      height={22}
                      style={{
                        borderRadius: "4px",
                        objectFit: "cover",
                        flexShrink: 0,
                        background: theme.panel,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: theme.text,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                      }}
                      onClick={() => {
                        if (!isDisabled) onToggle(bi);
                      }}
                    >
                      {boss.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: theme.muted,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMeso(boss.meso / serverMult)}
                    </span>
                    {checked && (
                      <select
                        value={row.partySize}
                        onChange={(e) => onPartyChange(bi, parseInt(e.target.value))}
                        className="tool-input"
                        style={{
                          background: theme.timerBg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: "6px",
                          padding: "2px 4px",
                          color: theme.text,
                          fontSize: "0.72rem",
                          width: "44px",
                          cursor: "pointer",
                        }}
                      >
                        {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}p
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Preview */}
        <div
          style={{
            paddingTop: "0.75rem",
            borderTop: `1px solid ${theme.border}`,
            fontSize: "0.82rem",
            fontWeight: 700,
            color: theme.text,
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              color: preview.crystals >= 14 ? theme.accent : theme.muted,
            }}
          >
            {preview.crystals}/14
          </span>
          {" crystals · "}
          <span style={{ color: theme.accent }}>{formatMeso(preview.meso)}</span>
          {" mesos"}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          {showBack && (
            <div
              className="bc-btn"
              onClick={onBack}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: theme.muted,
                background: theme.timerBg,
                border: `1px solid ${theme.border}`,
              }}
            >
              Back
            </div>
          )}
          <div
            className="bc-btn"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.muted,
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
            }}
          >
            Cancel
          </div>
          <div
            className="bc-btn"
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.accentText,
              background: theme.accentSoft,
              border: `1px solid ${theme.accent}`,
            }}
          >
            {confirmLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Main Component -----------------------------------------------------------

export default function BossCrystalsWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const {
    server, setServer, characters, charIncomes,
    totalMeso, totalCrystals, serverMult,
    dialog, dialogBosses, dialogDisabled, dialogPreview,
    dialogTitle, showBossDialog, pendingName,
    nameMode, setNameMode, typedName, setTypedName,
    selectedStoreChar, setSelectedStoreChar, availableStoreChars,
    openAdd, proceedToBosses, confirmAdd, openEdit, confirmEdit,
    deleteCharacter, reorderCharacters, toggleDialogBoss, setDialogParty, applyPreset,
    clearData, closeDialog, goBackToAddName, exportXlsx,
  } = useBossCrystalsState(mounted);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    setTimeout(() => setDragIndex(idx), 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== idx) setOverIndex(idx);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== idx) {
      reorderCharacters(dragIndex, idx);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // -- Render -----------------------------------------------------------------

  if (!mounted) return null;

  return (
    <>
      <style>{`
        .bc-card { transition: box-shadow 0.15s, transform 0.15s, opacity 0.15s, border-color 0.15s; }
        .bc-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .bc-card:active { cursor: grabbing; }
        .bc-btn { transition: background 0.15s, transform 0.1s; cursor: pointer; user-select: none; }
        .bc-btn:hover { transform: translateY(-1px); }
        .bc-btn:active { transform: translateY(0); }
        .bc-add-card { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
        .bc-add-card:hover { border-color: ${theme.accent} !important; background: ${theme.accentSoft} !important; }
        .bc-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .bc-dialog { background: ${theme.panel}; border: 1px solid ${theme.border}; border-radius: 16px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
        .bc-boss-row:hover { background: ${theme.accentSoft} !important; }
        .bc-char-opt { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
        .bc-char-opt:hover { border-color: ${theme.accent} !important; }
        @media (max-width: 860px) {
          .bc-main { padding: 1rem !important; }
        }
      `}</style>

      <div
        className="bc-main"
        style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ToolHeader
            theme={theme}
            title="Boss Crystal Tracker"
            description="Select your server type, add characters, and check off the bosses you clear each week to track your meso income."
          />

          {/* Controls */}
          <div
            className="fade-in panel-card"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              padding: "1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: theme.timerBg,
                borderRadius: "10px",
                padding: "3px",
                border: `1px solid ${theme.border}`,
              }}
            >
              {(["heroic", "interactive"] as const).map((s) => (
                <div
                  key={s}
                  className="bc-btn"
                  onClick={() => setServer(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: server === s ? theme.accentText : theme.muted,
                    background: server === s ? theme.accentSoft : "transparent",
                  }}
                >
                  {s === "heroic" ? "Heroic" : "Interactive"}
                </div>
              ))}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <div
                className="bc-btn"
                onClick={clearData}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "#e05a5a",
                  background: "transparent",
                  border: "1px solid #e05a5a33",
                }}
              >
                Clear All
              </div>
              <div
                className="bc-btn"
                onClick={exportXlsx}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accentText,
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                }}
              >
                Export
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div
            className="fade-in"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1rem 1.5rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "1rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.9rem",
                  color: theme.text,
                }}
              >
                Weekly:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.2rem",
                  color: theme.accent,
                }}
              >
                {formatMeso(totalMeso)} mesos
              </span>
            </div>
            <div style={{ width: "1px", height: "24px", background: theme.border }} />
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "10px",
                background: totalCrystals > 180 ? "#e05a5a22" : theme.accentSoft,
                fontSize: "0.78rem",
                fontWeight: 800,
                color: totalCrystals > 180 ? "#e05a5a" : theme.accentText,
              }}
            >
              {totalCrystals} / 180 crystals
            </div>
          </div>

          {/* Card grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            {characters.map((char, ci) => (
              <CharacterCard
                key={ci}
                theme={theme}
                char={char}
                income={charIncomes[ci]}
                serverMult={serverMult}
                isDragging={dragIndex === ci}
                isDropTarget={overIndex === ci && dragIndex !== null && dragIndex !== ci}
                onDragStart={(e) => handleDragStart(e, ci)}
                onDragOver={(e) => handleDragOver(e, ci)}
                onDrop={(e) => handleDrop(e, ci)}
                onDragEnd={handleDragEnd}
                onEdit={() => openEdit(ci)}
                onDelete={() => deleteCharacter(ci)}
              />
            ))}

            {/* Add character card */}
            <div
              className="fade-in bc-add-card panel-card"
              onClick={openAdd}
              title="Add character"
              style={{
                background: theme.timerBg,
                border: `2px dashed ${theme.border}`,
                borderRadius: "14px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 180,
              }}
            >
              <svg viewBox="0 0 24 24" width="36" height="36" fill={theme.muted}>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: theme.muted,
                  marginTop: "0.5rem",
                }}
              >
                Add character
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {dialog?.type === "add-name" && (
        <AddNameDialog
          theme={theme}
          available={availableStoreChars}
          nameMode={nameMode}
          onNameMode={(m) => {
            setNameMode(m);
            if (m === "type") setSelectedStoreChar(null);
            else setTypedName("");
          }}
          typedName={typedName}
          onTypedName={setTypedName}
          selectedChar={selectedStoreChar}
          onSelectedChar={setSelectedStoreChar}
          pendingName={pendingName}
          onNext={proceedToBosses}
          onClose={closeDialog}
        />
      )}

      {showBossDialog && (
        <BossSelectionDialog
          theme={theme}
          title={dialogTitle}
          serverMult={serverMult}
          bosses={dialogBosses}
          disabled={dialogDisabled}
          preview={dialogPreview}
          showBack={dialog?.type === "add-bosses"}
          confirmLabel={dialog?.type === "add-bosses" ? "Add" : "Save"}
          onToggle={toggleDialogBoss}
          onPartyChange={setDialogParty}
          onPreset={applyPreset}
          onBack={goBackToAddName}
          onCancel={closeDialog}
          onConfirm={dialog?.type === "add-bosses" ? confirmAdd : confirmEdit}
        />
      )}
    </>
  );
}
