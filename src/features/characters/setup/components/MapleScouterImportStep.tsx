"use client";

import { useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import type { StoredCharacterRecord, StoredScouterLegion } from "../../model/charactersStore";
import {
  parseMapleScouterExport,
  compareImportToStored,
  type MapleScouterImportError,
  type MapleScouterImportResult,
  type ImportFieldDiff,
} from "../data/maplescouterImportData";
import SetupStepFrame from "./SetupStepFrame";

interface MapleScouterImportStepProps {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  characterLevel?: number;
  characterRoster?: StoredCharacterRecord[];
  confirmedCharacterName?: string;
  confirmedWorldId?: number;
  worldScouterLegion?: StoredScouterLegion;
  /** The uploaded file's JSON text, persisted as this step's draft so a resumed setup can
   *  re-parse it. The player never sees or edits this directly -- they upload a file. */
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  /** Applies a successfully parsed export to the other steps' drafts. */
  onImport?: (result: MapleScouterImportResult) => void;
}

function errorMessage(error: MapleScouterImportError, detail: string | undefined): string {
  switch (error) {
    case "not-json":
      return "That file isn't valid JSON. Upload the .json file MapleScouter downloaded, without editing it.";
    case "wrong-file-type":
      return "That's not a MapleScouter character preset file. Use the file you get from Save Preset on MapleScouter.";
    case "no-data":
      return "This file is missing its character data. Try exporting again from MapleScouter.";
    case "unknown-class":
      return detail
        ? `MapleDoro doesn't recognize the class "${detail}" in this file.`
        : "MapleDoro doesn't recognize the class in this file.";
    case "class-mismatch":
      return detail
        ? `This is a ${detail} preset, but you're setting up a different class.`
        : "This preset is for a different class than the character you're setting up.";
    case "wrong-region":
      return detail
        ? `This preset was made for ${detail}. MapleDoro only supports GMS.`
        : "This preset wasn't made for GMS. MapleDoro only supports GMS.";
  }
}

const MAPLESCOUTER_INPUT_URL = "https://maplescouter.com/en/input";

/** Matches MapleScouter's own "Save Preset" button icon: a down arrow above an
 *  open-topped tray. */
function SavePresetIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

/** Matches MapleScouter's per-preset "export to file" icon: a document with a folded
 *  top-right corner and a down arrow inside its body. */
function ExportPresetIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 11v6" />
      <path d="m9 14 3 3 3-3" />
    </svg>
  );
}

const labelStyle = (theme: AppTheme): CSSProperties => ({
  margin: "0 0 0.4rem",
  fontSize: "0.75rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.muted,
});

const howToBoxStyle = (theme: AppTheme): CSSProperties => ({
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "0.8rem 1rem",
  background: theme.panel,
});

/** Inline "button chip" that mimics one of MapleScouter's own UI controls, so the
 *  instruction text points at something the player can recognize by shape. */
function UiChip({ theme, label, icon }: { theme: AppTheme; label?: string; icon: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        border: `1px solid ${theme.border}`,
        borderRadius: 6,
        padding: label ? "0.15rem 0.4rem" : "0.15rem 0.3rem",
        background: theme.bg,
        fontSize: "0.75rem",
        fontWeight: 700,
        lineHeight: 1,
        color: theme.text,
        verticalAlign: "middle",
      }}
    >
      {label}
      {icon}
    </span>
  );
}

function dropZoneBorderColor(theme: AppTheme, dragging: boolean, hasError: boolean): string {
  if (dragging) return theme.accent;
  if (hasError) return statusText(theme, "danger");
  return theme.border;
}

const dropZoneStyle = (theme: AppTheme, dragging: boolean, hasError: boolean): CSSProperties => ({
  border: `1.5px dashed ${dropZoneBorderColor(theme, dragging, hasError)}`,
  borderRadius: 12,
  padding: "1.4rem 1rem",
  background: dragging ? theme.accentSoft : "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.6rem",
  textAlign: "center",
  transition: "border-color 0.15s ease, background 0.15s ease",
});

const pickButtonStyle = (theme: AppTheme): CSSProperties => ({
  border: "none",
  borderRadius: 8,
  background: theme.accent,
  color: theme.accentOn,
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: "0.8rem",
  padding: "0.5rem 1rem",
  cursor: "pointer",
});

const applyButtonStyle = (theme: AppTheme): CSSProperties => ({
  border: "none",
  borderRadius: 8,
  background: theme.accent,
  color: theme.accentOn,
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: "0.8rem",
  padding: "0.5rem 0.9rem",
  cursor: "pointer",
});

const changeFileButtonStyle = (theme: AppTheme): CSSProperties => ({
  alignSelf: "flex-start",
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: theme.muted,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
  whiteSpace: "nowrap",
  cursor: "pointer",
});

const summaryCardStyle = (theme: AppTheme): CSSProperties => ({
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: "0.9rem 1rem",
  background: theme.panel,
  display: "flex",
  flexDirection: "column",
  gap: "0.7rem",
});

const warningNoticeStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex",
  gap: "0.4rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  lineHeight: 1.4,
  color: statusText(theme, "warning"),
  border: `1px solid ${statusText(theme, "warning")}44`,
  background: `${statusText(theme, "warning")}14`,
  borderRadius: 8,
  padding: "0.5rem 0.6rem",
});

const diffToggleStyle = (theme: AppTheme): CSSProperties => ({
  background: "none",
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  padding: "0.5rem 0.6rem",
  fontFamily: "inherit",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: theme.text,
  textAlign: "left",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "0.5rem",
});

const diffRowStyle = (theme: AppTheme): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "1fr 5.5rem 5.5rem",
  gap: "0.4rem 0.6rem",
  alignItems: "baseline",
  fontSize: "0.75rem",
  padding: "0.35rem 0",
  borderTop: `1px solid ${theme.border}`,
});

/** Right-aligned, tabular-figure cell so the digit columns stack cleanly. */
const diffValueCellStyle: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  wordBreak: "break-word",
};

/** The static "how to export from MapleScouter" instructions. */
function HowToBox({ theme }: { theme: AppTheme }) {
  const liStyle: CSSProperties = { fontSize: "0.8rem", color: theme.text, lineHeight: 1.5 };
  return (
    <div style={howToBoxStyle(theme)}>
      <div style={{ ...labelStyle(theme), marginBottom: "0.5rem" }}>How to get the file</div>
      <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <li style={liStyle}>
          Go to{" "}
          <a
            href={MAPLESCOUTER_INPUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}
          >
            MapleScouter&apos;s Input page →
          </a>
        </li>
        <li style={liStyle}>
          Click <UiChip theme={theme} label="Save Preset" icon={<SavePresetIcon color={theme.text} />} />
        </li>
        <li style={liStyle}>
          Click the export icon{" "}
          <UiChip theme={theme} icon={<ExportPresetIcon color={theme.text} />} />
          {" "}for the preset that matches this character.
        </li>
      </ol>
    </div>
  );
}

/** The upload target: a drop zone with a file picker, or -- after a rejected upload -- the
 *  same zone with the error shown inside it and a retry button. */
function UploadZone({ theme, dragging, error, errorClassName, onPick, onDragOver, onDragLeave, onDrop }: {
  theme: AppTheme;
  dragging: boolean;
  error: MapleScouterImportError | null;
  errorClassName: string | undefined;
  onPick: () => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div style={dropZoneStyle(theme, dragging, error !== null)} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {error ? (
        <>
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: statusText(theme, "danger") }}>
            {errorMessage(error, errorClassName)}
          </p>
          <button type="button" onClick={onPick} style={pickButtonStyle(theme)}>Choose another file</button>
        </>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>
            Drop your <code style={{ fontSize: "0.78rem" }}>scouter-preset-....json</code> here
          </p>
          <button type="button" onClick={onPick} style={pickButtonStyle(theme)}>Choose file</button>
        </>
      )}
    </div>
  );
}

/** Collapsible "N values in this preset differ from your saved data" panel, shown when the
 *  character being imported onto already has its own MapleScouter data that disagrees. */
function DiffPanel({ theme, diffs }: { theme: AppTheme; diffs: ImportFieldDiff[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} style={diffToggleStyle(theme)}>
        <span>
          {diffs.length} {diffs.length === 1 ? "value in this MapleScouter preset differs" : "values in this MapleScouter preset differ"} from your saved data
        </span>
        <span aria-hidden="true" style={{ color: theme.muted }}>{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div style={{ marginTop: "0.4rem" }}>
          <div style={{ ...diffRowStyle(theme), borderTop: "none", fontWeight: 800, color: theme.muted }}>
            <span />
            <span style={diffValueCellStyle}>Yours</span>
            <span style={diffValueCellStyle}>Import</span>
          </div>
          {diffs.map((d) => (
            <div key={d.label} style={diffRowStyle(theme)}>
              <span style={{ color: theme.text, fontWeight: 700 }}>{d.label}</span>
              <span style={{ ...diffValueCellStyle, color: theme.muted }}>{d.mine}</span>
              <span style={{ ...diffValueCellStyle, color: theme.text, fontWeight: 700 }}>{d.imported}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MapleScouterImportStep({
  theme, stepNumber, totalSteps, jobName = "", characterLevel,
  characterRoster, confirmedCharacterName, confirmedWorldId, worldScouterLegion,
  value, onChange, onBack, onNext, onFinish, onImport,
}: MapleScouterImportStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** The stored record for the character being set up, if it already exists in the roster. */
  const storedSelf = confirmedCharacterName
    ? characterRoster?.find((c) => c.characterName.toLowerCase() === confirmedCharacterName.toLowerCase()) ?? null
    : null;

  const parseCtx = { jobName, level: characterLevel, worldId: confirmedWorldId };

  /** How the export's values differ from what's already saved (empty if the character
   *  isn't set up yet, or nothing differs). */
  function diffAgainstStored(parsed: MapleScouterImportResult): ImportFieldDiff[] {
    if (!storedSelf || confirmedWorldId === undefined) return [];
    const ctx = { scouterLegionByWorld: worldScouterLegion ? { [String(confirmedWorldId)]: worldScouterLegion } : {} };
    return compareImportToStored(parsed, storedSelf, ctx);
  }
  // Re-parse a resumed draft's stored JSON once on mount so its summary card shows again
  // without re-uploading (the file name itself isn't persisted, only its contents).
  const [initialParse] = useState(() =>
    value.trim() ? parseMapleScouterExport(value.trim(), parseCtx) : null,
  );
  const [result, setResult] = useState<MapleScouterImportResult | null>(
    initialParse?.ok ? initialParse : null,
  );
  const [diffs, setDiffs] = useState<ImportFieldDiff[]>(
    initialParse?.ok ? diffAgainstStored(initialParse) : [],
  );
  const [error, setError] = useState<MapleScouterImportError | null>(
    initialParse && !initialParse.ok ? initialParse.error : null,
  );
  const [errorClassName, setErrorClassName] = useState<string | undefined>(
    initialParse && !initialParse.ok ? initialParse.foundClassName : undefined,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [applied, setApplied] = useState(false);

  function ingestText(raw: string, name: string) {
    onChange(raw);
    setFileName(name);
    setApplied(false);
    const parsed = parseMapleScouterExport(raw.trim(), parseCtx);
    if (parsed.ok) {
      setResult(parsed);
      setDiffs(diffAgainstStored(parsed));
      setError(null);
      setErrorClassName(undefined);
    } else {
      setResult(null);
      setDiffs([]);
      setError(parsed.error);
      setErrorClassName(parsed.foundClassName);
    }
  }

  async function readFile(file: File) {
    const text = await file.text();
    ingestText(text, file.name);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void readFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  }

  function handleApply() {
    if (!result) return;
    onImport?.(result);
    setApplied(true);
    onNext();
  }

  // A rejected file doesn't count as "have a file" -- the drop zone stays up so they can
  // try another, with the error shown inside it. Only a successful parse (result set)
  // swaps the drop zone out for the summary card.
  const showDropZone = result === null;

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel="Import from MapleScouter"
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Optional. If you already saved a preset for this character on MapleScouter, upload its export file and the next steps will be pre-filled for you to double-check. Skip this to fill everything in yourself."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
      nextLabel="Skip this step"
      nextVariant="quiet"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 520 }}>
        <HowToBox theme={theme} />

        {showDropZone && (
          <UploadZone
            theme={theme}
            dragging={dragging}
            error={error}
            errorClassName={errorClassName}
            onPick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          />
        )}

        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChange} style={{ display: "none" }} />

        {result && (
          <div style={summaryCardStyle(theme)}>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>
                {result.className} &middot; Lv. {result.level}
              </div>
              <div style={{ fontSize: "0.78rem", color: theme.muted, marginTop: "0.15rem", wordBreak: "break-word" }}>
                {result.label ? `Preset: ${result.label}` : fileName ?? "Uploaded file"}
              </div>
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={changeFileButtonStyle(theme)}>
              Choose a different file
            </button>

            {result.warnings.map((w) => (
              <div key={w.id} style={warningNoticeStyle(theme)}>
                <span aria-hidden="true">⚠</span>
                <span>{w.message}</span>
              </div>
            ))}

            {diffs.length > 0 && <DiffPanel theme={theme} diffs={diffs} />}

            <button type="button" onClick={handleApply} style={applyButtonStyle(theme)}>
              {applied ? "Applied" : "Use these values and continue"}
            </button>
          </div>
        )}
      </div>
    </SetupStepFrame>
  );
}
