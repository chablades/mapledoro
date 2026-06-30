import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MAX_QUERY_LENGTH } from "../../model/constants";
import { resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import { CHARACTERS_COPY } from "../content";
import type { SearchPaneActions, SearchPaneModel, SetupDraftSummary } from "../paneModels";
import CharacterAvatar from "../components/CharacterAvatar";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../components/uiStyles";

type Theme = SearchPaneModel["theme"];

interface SearchEntryScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

function draftStatusLine(draft: SetupDraftSummary): string {
  if (!draft.started) return "Not started";
  const step = Math.min(Math.max(draft.stepIndex, 1), draft.stepCount);
  const base = `${draft.flowLabel} · Step ${step}/${draft.stepCount}`;
  return draft.expired ? `${base} · may be outdated` : base;
}

function DraftOption({
  draft,
  theme,
  disabled,
  onResume,
  onClear,
}: {
  draft: SetupDraftSummary;
  theme: Theme;
  disabled: boolean;
  onResume: () => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.3rem", alignItems: "stretch" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onResume}
        className="draft-option"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          background: "none",
          border: "none",
          borderRadius: "8px",
          padding: "0.4rem 0.5rem",
          font: "inherit",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          minWidth: 0,
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: "7px", overflow: "hidden", flexShrink: 0, border: `1px solid ${theme.border}` }}>
          {draft.imgUrl ? (
            <CharacterAvatar
              src={draft.imgUrl}
              alt=""
              width={32}
              height={32}
              style={{ display: "block", objectFit: "cover" }}
            />
          ) : null}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.84rem", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {draft.characterName}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
            {resolveDisplayJobName(draft.jobName)}
            {draft.jobName ? "  ·  " : ""}
            {draftStatusLine(draft)}
          </div>
        </div>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        title="Clear draft"
        aria-label={`Clear setup draft for ${draft.characterName}`}
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          borderRadius: "8px",
          padding: "0 0.55rem",
          font: "inherit",
          fontSize: "0.82rem",
          fontWeight: 800,
          color: theme.muted,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}

function DraftPicker({
  drafts,
  theme,
  disabled,
  actions,
}: {
  drafts: SetupDraftSummary[];
  theme: Theme;
  disabled: boolean;
  actions: SearchPaneActions;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  const triggerStyle: CSSProperties = {
    ...secondaryButtonStyle(theme, "0.5rem 0.7rem"),
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "0.82rem",
    fontWeight: 800,
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", marginTop: "0.55rem" }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={triggerStyle}
      >
        <span>Resume a setup in progress ({drafts.length})</span>
        <span aria-hidden>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 0.35rem)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            padding: "0.3rem",
            maxHeight: "300px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.1rem",
          }}
        >
          {drafts.map((draft) => (
            <DraftOption
              key={draft.characterKey}
              draft={draft}
              theme={theme}
              disabled={disabled}
              onResume={() => {
                setOpen(false);
                actions.resumeDraft(draft.characterKey);
              }}
              onClear={() => actions.clearDraft(draft.characterKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchEntryScreen({ model, actions }: SearchEntryScreenProps) {
  const { theme, shell, search, profile } = model;
  const drafts = search.drafts;

  return (
    <>
      <style>{`
        .draft-option:not(:disabled):hover { background: rgba(127,127,127,0.14); }
      `}</style>
      <div
        style={{
          marginBottom: "0.75rem",
        }}
      >
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={() => {
            if (shell.isUiLocked) return;
            if (profile.isAddingCharacter) {
              if (search.hasCompletedRequiredFlow) {
                actions.backFromAddCharacter();
                return;
              }
              actions.runBackToIntroTransition();
              return;
            }
            if (search.hasCompletedRequiredFlow) {
              actions.backToCharactersDirectory();
              return;
            }
            actions.runBackToIntroTransition();
          }}
          style={{
            ...secondaryButtonStyle(theme, "0.38rem 0.62rem"),
            fontSize: "0.76rem",
            fontWeight: 800,
            borderRadius: "999px",
            marginBottom: "0.65rem",
          }}
        >
          {search.hasCompletedRequiredFlow
            ? CHARACTERS_COPY.searchEntry.backToCharactersButton
            : CHARACTERS_COPY.searchEntry.backButton}
        </button>
        <div>
          <h1 style={titleStyle()}>{CHARACTERS_COPY.searchEntry.title}</h1>
          <p style={subtitleStyle(theme)}>{CHARACTERS_COPY.searchEntry.subtitle}</p>
          {drafts.length > 0 && (
            <DraftPicker drafts={drafts} theme={theme} disabled={shell.isUiLocked} actions={actions} />
          )}
        </div>
      </div>

      <form onSubmit={actions.searchSubmit} className="characters-search-row">
        <input
          type="text"
          disabled={shell.isUiLocked}
          value={search.query}
          onChange={(event) => actions.queryChange(event.target.value)}
          placeholder="In-Game Name"
          maxLength={MAX_QUERY_LENGTH}
          style={{
            width: "100%",
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            background: theme.bg,
            color: theme.text,
            fontFamily: "inherit",
            fontSize: "0.95rem",
            fontWeight: 600,
            padding: "0.8rem 0.9rem",
            outline: "2px solid transparent",
            outlineOffset: "2px",
            transition: "outline-color 0.2s ease",
          }}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
          onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        />
        <button
          type="submit"
          disabled={search.isSearching || search.queryInvalid || shell.isUiLocked}
          style={{
            ...primaryButtonStyle(theme, "0.75rem 1rem"),
            borderRadius: "12px",
            background: search.isSearching || search.queryInvalid ? theme.muted : theme.accent,
            cursor:
              search.isSearching || search.queryInvalid || shell.isUiLocked
                ? "not-allowed"
                : "pointer",
          }}
        >
          {search.isSearching
            ? CHARACTERS_COPY.searchEntry.searchingButton
            : CHARACTERS_COPY.searchEntry.searchButton}
        </button>
      </form>

      <div
        style={{
          marginTop: "0.75rem",
          border: `1px solid ${theme.border}`,
          background: theme.bg,
          borderRadius: "14px",
          padding: "0.8rem 0.95rem",
        }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            color: search.statusTone === "error" ? "#dc2626" : theme.muted,
            fontWeight: 700,
            margin: 0,
          }}
        >
          {search.statusMessage}
        </p>
        {search.degradedCode && (
          <p style={{ margin: 0, marginTop: "0.5rem", fontSize: "0.78rem", color: "#d97706", fontWeight: 700 }}>
            Server issue [{search.degradedCode}]. Please let the developers know.
          </p>
        )}
      </div>
    </>
  );
}
