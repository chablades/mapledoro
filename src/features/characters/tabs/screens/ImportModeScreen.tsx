"use client";

import { useRef, useState } from "react";
import {
  parseImportedCharacterRecord,
  readCharactersStore,
  selectCharacterByIgn,
  selectCharactersList,
  type ImportSectionId,
  type StoredCharacterRecord,
} from "../../model/charactersStore";
import { toCharacterKey } from "../../model/characterKeys";
import { extractJsonFromPng, isPngSignature } from "../../../../lib/pngDataChunk";
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

interface ImportModeScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

type ImportState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "readyToAdd"; record: StoredCharacterRecord }
  // The parsed IGN collides with an existing character. Arriving here does NOT open the
  // conflict dialog by itself -- same as readyToAdd, the user gets a beat to look at the
  // preview first and opens the merge picker deliberately (conflictDialogOpen), matching
  // how championSwap only opens once the user actually clicks Add Character.
  | { status: "conflict"; existing: StoredCharacterRecord; imported: StoredCharacterRecord }
  | { status: "championSwap"; record: StoredCharacterRecord; champions: StoredCharacterRecord[] };

async function readImportFile(file: File): Promise<ImportState> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let jsonText: string;
  if (isPngSignature(bytes)) {
    // Koikatsu-card style: a character exported as an image carries its own data in a
    // custom PNG chunk (see pngDataChunk.ts), so it's exactly as valid an import source
    // as the plain .json export -- everything downstream (shape validation, the
    // isTrustedCharacterImageUrl re-check inside parseImportedCharacterRecord, conflict
    // detection) is untouched and treats it identically either way.
    const extracted = await extractJsonFromPng(bytes);
    if (extracted === null) {
      return { status: "error", message: CHARACTERS_COPY.importCharacter.invalidPngError };
    }
    jsonText = extracted;
  } else {
    jsonText = new TextDecoder().decode(bytes);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    return { status: "error", message: CHARACTERS_COPY.importCharacter.invalidJsonError };
  }

  // A world export (multiple characters + world-scoped Legion data) belongs in the
  // directory's own "Import World" button, not here -- this screen only ever handles
  // one character, and silently redirecting a world file into a totally different bulk
  // flow from an unrelated entry point would be a confusing surprise, not a convenience.
  if (typeof parsedJson === "object" && parsedJson !== null && (parsedJson as Record<string, unknown>).kind === "world") {
    return { status: "error", message: CHARACTERS_COPY.importCharacter.wrongFileTypeWorldError };
  }

  const record = parseImportedCharacterRecord(parsedJson);
  if (!record) {
    return { status: "error", message: CHARACTERS_COPY.importCharacter.invalidShapeError };
  }

  const existing = selectCharacterByIgn(readCharactersStore(), record.characterName);
  return existing
    ? { status: "conflict", existing, imported: record }
    : { status: "readyToAdd", record };
}

export default function ImportModeScreen({ model, actions }: ImportModeScreenProps) {
  const { theme, shell, search, profile } = model;
  const [state, setState] = useState<ImportState>({ status: "idle" });
  const [role, setRole] = useState<RosterRole>("mule");
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setState(await readImportFile(file));
  }

  function handleConflictConfirm(choices: Record<ImportSectionId, "mine" | "imported">) {
    if (state.status !== "conflict") return;
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
    // mule/champion of -- every add path already defaults a world's first-ever character
    // to main, so import matches that here instead of showing a role picker with only
    // one sensible answer.
    const effectiveRole: RosterRole = profile.isAddingCharacter ? role : "main";
    if (effectiveRole !== "champion") {
      actions.importCharacter(record, effectiveRole);
      return;
    }
    const store = readCharactersStore();
    const championKeys = store.championCharacterIdsByWorld[String(record.worldID)] ?? [];
    if (championKeys.length < MAX_CHAMPIONS) {
      actions.importCharacter(record, effectiveRole);
      return;
    }
    // championKeys is capped at MAX_CHAMPIONS (5), and this only runs once per Add
    // Character click with Champion selected and slots full -- a Set would add
    // indirection with no measurable benefit at this scale.
    const champions = selectCharactersList(store).filter((c) => {
      // react-doctor-disable-next-line js-set-map-lookups
      return c.worldID === record.worldID && championKeys.includes(toCharacterKey(c));
    });
    setState({ status: "championSwap", record, champions });
  }

  function handleChampionSwapConfirm(swapOutKey: string) {
    if (state.status !== "championSwap") return;
    actions.importCharacterAsChampionSwap(state.record, swapOutKey);
  }

  // Changing role away from "champion" while the swap dialog is open would otherwise leave
  // it open on a decision the user just abandoned -- collapse back to the plain preview.
  function handleRoleChange(next: RosterRole) {
    setRole(next);
    if (state.status === "championSwap") setState({ status: "readyToAdd", record: state.record });
  }

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
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontWeight: 800, color: theme.text }}>
              <ExportTabIcon strokeWidth={2.5} />
              {CHARACTERS_COPY.importCharacter.subtitleSuffix}
            </span>
          </p>
        </div>
      </div>

      {state.status === "error" && (
        <p style={{ margin: "0 0 1rem", color: statusText(theme, "danger"), fontWeight: 700, fontSize: "0.85rem" }}>
          {state.message}
        </p>
      )}

      {(() => {
        // The same preview card for readyToAdd, conflict (shows the imported file's own
        // data, not the existing character it collides with -- that's what's actually
        // being proposed), and championSwap -- otherwise the screen behind those dialogs
        // goes blank with no indication of which character is even being imported.
        let previewRecord: StoredCharacterRecord | null = null;
        if (state.status === "readyToAdd" || state.status === "championSwap") previewRecord = state.record;
        else if (state.status === "conflict") previewRecord = state.imported;
        if (!previewRecord) return null;
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
              src={previewRecord.characterImgURL}
              alt=""
              width={40}
              height={40}
              style={{ display: "block", borderRadius: "8px", objectFit: "contain", objectPosition: "center bottom" }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "0.84rem", color: theme.text }}>
                {previewRecord.characterName}
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted }}>
                {resolveDisplayJobName(previewRecord.jobName)} · Lv. {previewRecord.level}
              </div>
            </div>
          </div>
        );
      })()}

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
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: "block",
            background: "none",
            border: "none",
            padding: 0,
            font: "inherit",
            textAlign: "left",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: theme.muted,
            cursor: shell.isUiLocked ? "not-allowed" : "pointer",
            marginBottom: "0.75rem",
          }}
        >
          {CHARACTERS_COPY.importCharacter.chooseDifferentFileButton}
        </button>
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,image/png,.json,.png"
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
