"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import type { AppTheme } from "../../components/themes";
import type { StoredCharacterRecord } from "../characters/model/charactersStore";
import { CharacterPickerRow } from "./CharacterPickerRow";
import { toolStyles } from "./tool-styles";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

function panelStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    maxWidth: 600,
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    padding: "1.5rem",
  };
}

/**
 * Step one of the "add a character" flow shared by the manually-populated
 * trackers: type a name or pick one of the imported characters, then continue.
 * Self-contained overlay so any tool can drop it in without extra CSS.
 */
export function AddCharacterNameDialog({
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
  const styles = toolStyles(theme);
  // Focus once on mount only — re-running this on every render would fight the
  // user for focus (e.g. after they click away to select text elsewhere).
  const hasAutoFocusedRef = useRef(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
      style={overlayStyle}
    >
      <style>{`.char-pick-row:hover { border-color: ${theme.accent} !important; }`}</style>
      <div
        className="tool-dialog-scroll"
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
        style={panelStyle(theme)}
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
                name="tool-name-mode"
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
                ref={(el) => {
                  if (el && !hasAutoFocusedRef.current) {
                    hasAutoFocusedRef.current = true;
                    el.focus();
                  }
                }}
                className="tool-input"
                style={{
                  ...styles.inputStyle,
                  width: "calc(100% - 1.5rem)",
                  marginLeft: "1.5rem",
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
                name="tool-name-mode"
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
                className="tool-dialog-scroll"
                style={{
                  marginLeft: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  maxHeight: "40vh",
                  overflowY: "auto",
                }}
              >
                {available.map((c) => (
                  <CharacterPickerRow
                    key={c.characterName}
                    theme={theme}
                    character={c}
                    selected={selectedChar?.characterName === c.characterName}
                    onSelect={() => onSelectedChar(c)}
                  />
                ))}
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
              ref={(el) => el?.focus()}
              className="tool-input"
              style={{ ...styles.inputStyle, width: "100%" }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button
            type="button"
            className="tool-btn tool-dialog-btn"
            onClick={onClose}
            style={styles.dialogBtnStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tool-btn tool-dialog-btn"
            disabled={!pendingName}
            onClick={onNext}
            style={{
              ...(pendingName ? styles.dialogPrimaryBtnStyle : styles.dialogBtnStyle),
              opacity: pendingName ? 1 : 0.5,
              cursor: pendingName ? "pointer" : "not-allowed",
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
