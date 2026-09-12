"use client";

import { useState, type CSSProperties } from "react";
import ModalShell from "../../../../components/ModalShell";
import { dialogBtnColors, dialogPrimaryBtnColors, type AppTheme } from "../../../../components/themes";
import {
  IMPORT_SECTION_DEFS,
  type ImportSectionId,
  type StoredCharacterRecord,
} from "../../model/charactersStore";
import { CHARACTERS_COPY } from "../content";
import { useScrollEdges, edgeFadeMask } from "../../../../lib/useScrollEdges";

type Choice = "mine" | "imported";

function rowStyle(theme: AppTheme, isLast: boolean): CSSProperties {
  return {
    gap: "0.4rem",
    padding: "0.55rem 0",
    borderBottom: isLast ? "none" : `1px solid ${theme.border}`,
  };
}

function pillStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? theme.accent : theme.border}`,
    borderRadius: "999px",
    background: active ? theme.accentSoft : theme.bg,
    color: theme.text,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.78rem",
    padding: "0.35rem 0.7rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function ChoiceRow({
  theme,
  label,
  value,
  onChange,
  isLast,
}: {
  theme: AppTheme;
  label: string;
  value: Choice;
  onChange: (next: Choice) => void;
  isLast: boolean;
}) {
  return (
    <div className="import-conflict-row" style={rowStyle(theme, isLast)}>
      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: theme.text }}>{label}</span>
      <div className="import-conflict-pills" style={{ display: "flex", gap: "0.4rem" }}>
        <button
          type="button"
          aria-pressed={value === "mine"}
          onClick={() => onChange("mine")}
          style={pillStyle(theme, value === "mine")}
        >
          {CHARACTERS_COPY.importConflict.keepMine}
        </button>
        <button
          type="button"
          aria-pressed={value === "imported"}
          onClick={() => onChange("imported")}
          style={pillStyle(theme, value === "imported")}
        >
          {CHARACTERS_COPY.importConflict.useImported}
        </button>
      </div>
    </div>
  );
}

// Expands a bulk choice, or an existing per-section map, into a full per-section map. Shared
// by the dialog's own all-"mine" default and by a caller that already has a row-level bulk
// choice of Keep existing or Use imported selected before Customize opens, so the dialog
// starts reflecting what's already chosen instead of always
// resetting to Keep existing regardless of the row's own visible state.
function expandInitialChoices(initial: Choice | Record<ImportSectionId, Choice> | undefined): Record<ImportSectionId, Choice> {
  return IMPORT_SECTION_DEFS.reduce((acc, section) => {
    acc[section.id] = typeof initial === "object" ? initial[section.id] : (initial ?? "mine");
    return acc;
  }, {} as Record<ImportSectionId, Choice>);
}

export default function ImportConflictDialog({
  theme,
  existing,
  initialChoice,
  roleControl,
  onClose,
  onConfirm,
}: {
  theme: AppTheme;
  existing: StoredCharacterRecord;
  /** The row's current bulk choice, "mine" or "imported", or an already-customized per-section
   *  map when one exists. Omit to start every section at "mine", which is the single-character
   *  import flow's behavior, since it has no outer bulk toggle. */
  initialChoice?: Choice | Record<ImportSectionId, Choice>;
  /** Only present for World Import's Customize usage. A single-character export has
   *  no role data at all (Main/Champion is world-scoped state, not a character-record
   *  field), so ImportModeScreen's own usage omits this and the role row doesn't render.
   *  The role's own current/file values are already shown on the outer conflict row's
   *  transition label, so this dialog only needs the starting choice, not the values. */
  roleControl?: {
    initialUseFileRole: boolean;
  };
  onClose: () => void;
  onConfirm: (choices: Record<ImportSectionId, Choice>, useFileRole?: boolean) => void;
}) {
  const [choices, setChoices] = useState<Record<ImportSectionId, Choice>>(() => expandInitialChoices(initialChoice));
  const [useFileRole, setUseFileRole] = useState(() => roleControl?.initialUseFileRole ?? false);

  // Fades whichever edge has more to scroll to (see useScrollEdges and edgeFadeMask), the
  // same treatment as every other scrollable list in the import flows.
  const { ref: sectionsRef, atStart: sectionsAtStart, atEnd: sectionsAtEnd } =
    useScrollEdges<HTMLDivElement>([Boolean(roleControl)], "vertical");
  const sectionsMask = edgeFadeMask(sectionsAtStart, sectionsAtEnd, 28, "vertical");

  function applyToAllSections(choice: Choice) {
    setChoices(
      IMPORT_SECTION_DEFS.reduce((acc, section) => {
        acc[section.id] = choice;
        return acc;
      }, {} as Record<ImportSectionId, Choice>),
    );
    // Role now renders as the first row in the same list (see the return below), so a
    // bulk "Keep all existing"/"Use all imported" reads as "every row here," including it.
    if (roleControl) setUseFileRole(choice === "imported");
  }

  return (
    <ModalShell
      theme={theme}
      ariaLabel="Resolve character import conflict"
      onClose={onClose}
      style={{ width: "min(480px, 100%)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <style>{`
        .import-conflict-row { display: flex; flex-direction: column; align-items: flex-start; }
        .import-conflict-pills { width: 100%; }
        .import-conflict-pills button { flex: 1; }
        @media (min-width: 420px) {
          .import-conflict-row { flex-direction: row; align-items: center; justify-content: space-between; }
          .import-conflict-pills { width: auto; }
          .import-conflict-pills button { flex: none; }
        }
      `}</style>
      <div style={{ padding: "1rem 1.1rem 0.75rem", borderBottom: `1px solid ${theme.border}` }}>
        <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.05rem" }}>
          {existing.characterName} {CHARACTERS_COPY.importConflict.titleSuffix}
        </span>
        <div style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600, marginTop: 4 }}>
          {CHARACTERS_COPY.importConflict.subtitle}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1.1rem 0" }}>
        <button
          type="button"
          onClick={() => applyToAllSections("mine")}
          className="tool-btn tool-dialog-btn"
          style={{ ...dialogBtnColors(theme), color: theme.text }}
        >
          {CHARACTERS_COPY.importConflict.keepAllMine}
        </button>
        <button
          type="button"
          onClick={() => applyToAllSections("imported")}
          className="tool-btn tool-dialog-btn"
          style={{ ...dialogBtnColors(theme), color: theme.text }}
        >
          {CHARACTERS_COPY.importConflict.useAllImported}
        </button>
      </div>

      <div
        ref={sectionsRef}
        style={{
          padding: "0.2rem 1.1rem",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          WebkitMaskImage: sectionsMask,
          maskImage: sectionsMask,
        }}
      >
        {roleControl && (
          <ChoiceRow
            theme={theme}
            label={CHARACTERS_COPY.importConflict.roleLabel}
            value={useFileRole ? "imported" : "mine"}
            onChange={(next) => setUseFileRole(next === "imported")}
            isLast={false}
          />
        )}
        {IMPORT_SECTION_DEFS.map((section, index) => (
          <ChoiceRow
            key={section.id}
            theme={theme}
            label={section.label}
            value={choices[section.id]}
            onChange={(next) => setChoices((prev) => ({ ...prev, [section.id]: next }))}
            isLast={index === IMPORT_SECTION_DEFS.length - 1}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem", padding: "0.8rem 1.1rem", borderTop: `1px solid ${theme.border}` }}>
        <button type="button" onClick={onClose} className="tool-btn tool-dialog-btn" style={dialogBtnColors(theme)}>
          {CHARACTERS_COPY.importConflict.cancelButton}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(choices, roleControl ? useFileRole : undefined)}
          className="tool-btn tool-dialog-btn"
          style={dialogPrimaryBtnColors(theme)}
        >
          {CHARACTERS_COPY.importConflict.confirmButton}
        </button>
      </div>
    </ModalShell>
  );
}
