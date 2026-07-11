"use client";

import { useRef } from "react";
import type { AppTheme } from "../../components/themes";
import type { StoredCharacterRecord } from "../characters/model/charactersStore";
import { CharacterPickerRow } from "./CharacterPickerRow";
import { ToolDialog } from "./ToolDialog";
import { toolStyles } from "./tool-styles";

/**
 * Step one of the "add a character" flow shared by the manually-populated
 * trackers: type a name or pick one of the imported characters, then continue.
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
  const focusOnce = (el: HTMLInputElement | null) => {
    if (el && !hasAutoFocusedRef.current) {
      hasAutoFocusedRef.current = true;
      el.focus();
    }
  };

  const footer = (
    <>
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
    </>
  );

  return (
    <ToolDialog theme={theme} title="Add Character" onClose={onClose} footer={footer}>
      <style>{`.char-pick-row:hover { border-color: ${theme.accent} !important; }`}</style>

      {hasAvailable ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
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
              ref={focusOnce}
              className="tool-input"
              style={{
                ...styles.inputStyle,
                width: "calc(100% - 1.5rem)",
                marginLeft: "1.5rem",
              }}
            />
          )}

          <label
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
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
        <input
          type="text"
          placeholder="Character name"
          maxLength={14}
          value={typedName}
          onChange={(e) => onTypedName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && typedName.trim()) onNext();
          }}
          ref={focusOnce}
          className="tool-input"
          style={{ ...styles.inputStyle, width: "100%" }}
        />
      )}
    </ToolDialog>
  );
}
