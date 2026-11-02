"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  readCharactersStore,
  selectCharacterByIgn,
  selectCharactersList,
  writeLegionArtifactForWorld,
  writeLinkSkillTotalsForWorld,
  writeScouterLegionForWorld,
  type CharacterExportWorldData,
  type ImportSectionId,
  type StoredCharacterRecord,
} from "../../model/charactersStore";
import { isDefaultLegionArtifact } from "../../setup/data/legionArtifactData";
import { readCharacterFile, type CharacterFileResult, type QrSource } from "../../share/readCharacterFile";
import { clearPendingImport, peekPendingImport } from "../../share/pendingImport";
import { useTouchDevice } from "../../share/useTouchDevice";
import { toCharacterKey } from "../../model/characterKeys";
import { resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import { statusText } from "../../../../components/statusColors";
import { CHARACTERS_COPY } from "../content";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import { MAX_CHAMPIONS, type RosterRole } from "../useCharacterSetupController";
import CharacterAvatar from "../components/CharacterAvatar";
import ImportConflictDialog from "./ImportConflictDialog";
import ChampionSwapDialog from "./ChampionSwapDialog";
import { ExportTabIcon } from "./CharacterProfileOverviewScreen";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../components/uiStyles";

const retryLinksRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  columnGap: "1.25rem",
  rowGap: "0.4rem",
  marginBottom: "0.75rem",
};

function retryLinkStyle(color: string, locked: boolean): CSSProperties {
  return {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    textAlign: "left",
    fontSize: "0.78rem",
    fontWeight: 700,
    color,
    cursor: locked ? "not-allowed" : "pointer",
  };
}

interface ImportModeScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

type ImportState =
  | { status: "idle" }
  // An image is being read; reading its QR can take a few seconds on a phone.
  | { status: "reading" }
  | { status: "error"; message: string }
  | { status: "readyToAdd"; record: StoredCharacterRecord }
  // The parsed IGN collides with an existing character. Arriving here does not open the
  // conflict dialog by itself. As with readyToAdd, the player gets a beat to look at the
  // preview first and opens the merge picker deliberately via conflictDialogOpen, matching
  // how championSwap opens only once they click Add Character.
  | { status: "conflict"; existing: StoredCharacterRecord; imported: StoredCharacterRecord }
  | { status: "championSwap"; record: StoredCharacterRecord; champions: StoredCharacterRecord[] };

/** The same preview card serves readyToAdd, conflict and championSwap. For conflict it shows
 *  the imported file's own data rather than the existing character it collides with, since that
 *  is what's being proposed. Without this the screen behind those dialogs goes blank, with no
 *  indication of which character is being imported. Split out of ImportModeScreen's render. */
function previewRecordForState(state: ImportState): StoredCharacterRecord | null {
  if (state.status === "readyToAdd" || state.status === "championSwap") return state.record;
  if (state.status === "conflict") return state.imported;
  return null;
}

function ImportPreviewCard({ theme, record }: { theme: SearchPaneModel["theme"]; record: StoredCharacterRecord }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        padding: "0.65rem",
        border: `1px solid ${theme.border}`,
        borderRadius: "12px",
        marginBottom: "0.75rem",
      }}
    >
      <CharacterAvatar
        src={record.characterImgURL}
        alt=""
        width={40}
        height={40}
        style={{ display: "block", borderRadius: "8px", objectFit: "contain", objectPosition: "center bottom" }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: "0.84rem", color: theme.text }}>
          {record.characterName}
        </div>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted }}>
          {resolveDisplayJobName(record.jobName)} · Lv. {record.level}
        </div>
      </div>
    </div>
  );
}

/** Fills in the world Legion data an imported file carries, but only when the world holds no
 *  character other than the one being imported. A world with other characters belongs to the
 *  player, and even filling an answer they never gave (say, a friend's artifact Final Attack
 *  damage) would silently change their own characters' Scouter numbers. Re-importing a world's
 *  only character still fills it. Within that, each piece is filled only where missing, so
 *  nothing already there is replaced: Scouter Legion answers fill only unanswered fields, the
 *  artifact board only replaces the untouched automatic default, and link skill totals only
 *  fill an empty slot. */
function applyImportedWorldData(record: StoredCharacterRecord, world: CharacterExportWorldData) {
  const store = readCharactersStore();
  const worldId = record.worldID;
  const importedKey = toCharacterKey(record);
  const hasOtherCharacters = selectCharactersList(store)
    .some((c) => c.worldID === worldId && toCharacterKey(c) !== importedKey);
  if (hasOtherCharacters) return;
  const key = String(worldId);
  const existingLegion = store.scouterLegionByWorld[key];
  if (world.scouterLegion) {
    // Only answered fields win; a key present but undefined must not erase the imported value.
    const answered = Object.fromEntries(Object.entries(existingLegion ?? {}).filter(([, v]) => v !== undefined));
    const merged = { ...world.scouterLegion, ...answered };
    if (JSON.stringify(merged) !== JSON.stringify(existingLegion ?? {})) writeScouterLegionForWorld(worldId, merged);
  }
  const existingBoard = store.legionArtifactByWorld[key];
  if (world.legionArtifact && (!existingBoard || isDefaultLegionArtifact(existingBoard))) {
    writeLegionArtifactForWorld(worldId, world.legionArtifact);
  }
  if (world.linkSkillTotals && !store.linkSkillTotalsByWorld[key]) {
    writeLinkSkillTotalsForWorld(worldId, world.linkSkillTotals);
  }
}

interface ImportFileResult {
  state: ImportState;
  /** The file's world Legion data, applied only once the character is actually added. */
  world: CharacterExportWorldData;
  /** Set when read from a card's QR rather than full data (see QrSource). */
  qrSource?: QrSource;
}

const { importCharacter: IMPORT_COPY } = CHARACTERS_COPY;

const qrNoteStyle = (theme: SearchPaneModel["theme"]) => ({ margin: "-0.25rem 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: theme.muted, lineHeight: 1.45 });

/** What a QR import left out, and why, plus when the avatar arrives. */
function QrImportNote({ theme, source }: { theme: SearchPaneModel["theme"]; source: QrSource }) {
  return (
    <div style={qrNoteStyle(theme)}>
      {source !== "strippedPng" ? (
        <p style={{ margin: 0 }}>
          {IMPORT_COPY.qrImportNoteBefore} <strong style={{ color: theme.text }}>{IMPORT_COPY.qrImportNoteBold}</strong> {IMPORT_COPY.qrImportNoteAfter}
        </p>
      ) : (
        <p style={{ margin: 0 }}>{IMPORT_COPY.qrImportStrippedPngNote}</p>
      )}
      <p style={{ margin: "0.3rem 0 0" }}>{IMPORT_COPY.qrImportAvatarNote}</p>
    </div>
  );
}

const importError = (message: string): ImportFileResult => ({ state: { status: "error", message }, world: {} });

function importResult(record: StoredCharacterRecord, world: CharacterExportWorldData, qrSource?: QrSource): ImportFileResult {
  const existing = selectCharacterByIgn(readCharactersStore(), record.characterName);
  return {
    state: existing ? { status: "conflict", existing, imported: record } : { status: "readyToAdd", record },
    world,
    qrSource,
  };
}

function importFileResult(result: CharacterFileResult): ImportFileResult {
  return result.ok ? importResult(result.record, result.world, result.qrSource) : importError(result.message);
}

/** The character the viewer handed over with "Add to directory", if any (see pendingImport.ts). */
function initialImport(): ImportFileResult | null {
  const pending = peekPendingImport();
  return pending ? importResult(pending.record, pending.world, pending.qrSource) : null;
}

// Nesting depth 1 throughout: handleAddCharacter is a flat chain of early returns over the
// import state machine, and the render is a series of independent `state.status === "..."`
// sibling checks, not nested control flow. The preview-card derivation is already split out
// above (previewRecordForState/ImportPreviewCard).
// react-doctor-disable-next-line no-high-complexity-react-function
export default function ImportModeScreen({ model, actions }: ImportModeScreenProps) {
  const { theme, shell, search, profile } = model;
  const [initial] = useState(initialImport);
  const [state, setState] = useState<ImportState>(initial?.state ?? { status: "idle" });
  const [role, setRole] = useState<RosterRole>("mule");
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const importedWorldRef = useRef<CharacterExportWorldData>(initial?.world ?? {});
  const [qrSource, setQrSource] = useState<QrSource | undefined>(initial?.qrSource);
  const isTouch = useTouchDevice();
  // Picked up once; cleared after mount rather than while reading it, since a Strict Mode
  // double render would otherwise find it already gone.
  useEffect(() => { clearPendingImport(); }, []);

  function handleBack() {
    if (shell.isUiLocked) return;
    if (profile.isAddingCharacter) {
      actions.backFromAddCharacter();
      return;
    }
    actions.runBackToIntroTransition();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setRole("mule");
    setConflictDialogOpen(false);
    if (file.type.startsWith("image/")) setState({ status: "reading" });
    const result = importFileResult(await readCharacterFile(file));
    importedWorldRef.current = result.world;
    setQrSource(result.qrSource);
    setState(result.state);
  }

  function handleConflictConfirm(choices: Record<ImportSectionId, "mine" | "imported">) {
    if (state.status !== "conflict") return;
    applyImportedWorldData(state.imported, importedWorldRef.current);
    actions.importCharacterMerged(state.existing, state.imported, choices);
  }

  function handleAddCharacter() {
    if (state.status === "conflict") {
      setConflictDialogOpen(true);
      return;
    }
    if (state.status !== "readyToAdd") return;
    const record = state.record;
    // First-time setup (no roster yet, isAddingCharacter is false) has nothing to be a
    // mule or champion of. Every add path already defaults a world's first-ever character
    // to main, so import matches that here instead of showing a role picker with one
    // sensible answer.
    const effectiveRole: RosterRole = profile.isAddingCharacter ? role : "main";
    if (effectiveRole !== "champion") {
      applyImportedWorldData(record, importedWorldRef.current);
      actions.importCharacter(record, effectiveRole);
      return;
    }
    const store = readCharactersStore();
    const championKeys = store.championCharacterIdsByWorld[String(record.worldID)] ?? [];
    if (championKeys.length < MAX_CHAMPIONS) {
      applyImportedWorldData(record, importedWorldRef.current);
      actions.importCharacter(record, effectiveRole);
      return;
    }
    // championKeys is capped at MAX_CHAMPIONS, which is 5, and this runs once per Add
    // Character click with Champion selected and slots full, so a Set would add
    // indirection with no measurable benefit at this scale.
    const champions = selectCharactersList(store).filter((c) => {
      // react-doctor-disable-next-line js-set-map-lookups
      return c.worldID === record.worldID && championKeys.includes(toCharacterKey(c));
    });
    setState({ status: "championSwap", record, champions });
  }

  function handleChampionSwapConfirm(swapOutKey: string) {
    if (state.status !== "championSwap") return;
    applyImportedWorldData(state.record, importedWorldRef.current);
    actions.importCharacterAsChampionSwap(state.record, swapOutKey);
  }

  // Changing role away from "champion" while the swap dialog is open would otherwise leave
  // it open on a decision just abandoned, so collapse back to the plain preview.
  function handleRoleChange(next: RosterRole) {
    setRole(next);
    if (state.status === "championSwap") setState({ status: "readyToAdd", record: state.record });
  }

  const previewRecord = previewRecordForState(state);

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={shell.isUiLocked}
            onClick={handleBack}
            style={{
              ...secondaryButtonStyle(theme, "0.38rem 0.62rem"),
              fontSize: "0.76rem",
              fontWeight: 800,
              borderRadius: "999px",
            }}
          >
            {search.hasCompletedRequiredFlow
              ? CHARACTERS_COPY.searchEntry.backToCharactersButton
              : CHARACTERS_COPY.importCharacter.backButton}
          </button>
          <button
            type="button"
            disabled={shell.isUiLocked}
            onClick={() => actions.runTransitionToMode("search")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              font: "inherit",
              fontSize: "0.76rem",
              fontWeight: 700,
              color: theme.muted,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              cursor: shell.isUiLocked ? "not-allowed" : "pointer",
            }}
          >
            {CHARACTERS_COPY.firstTimeSetup.searchButton}
          </button>
        </div>
        <div>
          <h1 style={titleStyle()}>{CHARACTERS_COPY.importCharacter.title}</h1>
          <p style={{ ...subtitleStyle(theme), display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
            {CHARACTERS_COPY.importCharacter.subtitlePrefix}
            {/* The punctuation shares the bold label's flex item so the row's gap doesn't land before it. */}
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontWeight: 800, color: theme.text }}>
                <ExportTabIcon strokeWidth={2.5} />
                {CHARACTERS_COPY.importCharacter.subtitleSuffix}
              </span>
              {isTouch ? "," : "."}
            </span>
            {isTouch && CHARACTERS_COPY.importCharacter.subtitleQr}
          </p>
        </div>
      </div>

      {state.status === "error" && (
        <p style={{ margin: "0 0 1rem", color: statusText(theme, "danger"), fontWeight: 700, fontSize: "0.85rem" }}>
          {state.message}
        </p>
      )}

      {state.status === "reading" && (
        <p role="status" style={{ margin: "0 0 1rem", color: theme.muted, fontWeight: 700, fontSize: "0.85rem" }}>
          {IMPORT_COPY.readingImage}
        </p>
      )}

      {previewRecord && <ImportPreviewCard theme={theme} record={previewRecord} />}

      {previewRecord && qrSource && <QrImportNote theme={theme} source={qrSource} />}

      {profile.isAddingCharacter && (state.status === "readyToAdd" || state.status === "championSwap") && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
            {CHARACTERS_COPY.importCharacter.roleLabel}
          </span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {(["mule", "champion", "main"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={role === option}
                disabled={shell.isUiLocked}
                onClick={() => handleRoleChange(option)}
                style={{
                  border: `1px solid ${role === option ? theme.accent : theme.border}`,
                  borderRadius: "999px",
                  background: role === option ? theme.accentSoft : theme.bg,
                  color: theme.text,
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  padding: "0.35rem 0.7rem",
                  cursor: shell.isUiLocked ? "not-allowed" : "pointer",
                }}
              >
                {option === "mule" && CHARACTERS_COPY.importCharacter.roleMule}
                {option === "main" && CHARACTERS_COPY.importCharacter.roleMain}
                {option === "champion" && CHARACTERS_COPY.importCharacter.roleChampion}
              </button>
            ))}
          </div>
        </div>
      )}

      {(state.status === "readyToAdd" || state.status === "championSwap" || state.status === "conflict") && (
        <div style={retryLinksRowStyle}>
          <button
            type="button"
            disabled={shell.isUiLocked}
            onClick={() => fileInputRef.current?.click()}
            style={retryLinkStyle(theme.muted, shell.isUiLocked)}
          >
            {CHARACTERS_COPY.importCharacter.chooseDifferentFileButton}
          </button>
          {isTouch && (
            <button
              type="button"
              disabled={shell.isUiLocked}
              onClick={() => scanInputRef.current?.click()}
              style={retryLinkStyle(theme.muted, shell.isUiLocked)}
            >
              {CHARACTERS_COPY.importCharacter.scanDifferentQrButton}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        {(state.status === "readyToAdd" || state.status === "championSwap" || state.status === "conflict") && (
          <button
            type="button"
            disabled={shell.isUiLocked || state.status === "championSwap"}
            onClick={handleAddCharacter}
            style={primaryButtonStyle(theme)}
          >
            {CHARACTERS_COPY.importCharacter.addCharacterButton}
          </button>
        )}
        {(state.status === "idle" || state.status === "error") && (
          <button
            type="button"
            disabled={shell.isUiLocked || search.isSearching}
            onClick={() => fileInputRef.current?.click()}
            style={secondaryButtonStyle(theme)}
          >
            {CHARACTERS_COPY.importCharacter.pickFileButton}
          </button>
        )}
        {isTouch && (state.status === "idle" || state.status === "error") && (
          <button
            type="button"
            disabled={shell.isUiLocked || search.isSearching}
            onClick={() => scanInputRef.current?.click()}
            style={secondaryButtonStyle(theme)}
          >
            {CHARACTERS_COPY.importCharacter.scanQrButton}
          </button>
        )}
      </div>

      {/* Any image is accepted: a card PNG imports in full, and anything else (a WebP dragged
          out of Discord, a screenshot) falls back to reading the card's QR. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,image/*,.json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {/* On phones `capture` opens the camera to photograph a card's QR; on computers it opens
          the file picker for a screenshot or photo of one. */}
      <input
        ref={scanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {state.status === "conflict" && conflictDialogOpen && (
        <ImportConflictDialog
          theme={theme}
          existing={state.existing}
          onClose={() => setConflictDialogOpen(false)}
          onConfirm={handleConflictConfirm}
        />
      )}

      {state.status === "championSwap" && (
        <ChampionSwapDialog
          theme={theme}
          champions={state.champions}
          onClose={() => setState({ status: "readyToAdd", record: state.record })}
          onConfirm={handleChampionSwapConfirm}
        />
      )}
    </>
  );
}
