"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { CHARACTERS_COPY } from "../tabs/content";
import { secondaryButtonStyle, subtitleStyle, titleStyle } from "../tabs/components/uiStyles";
import ExportMention from "../tabs/components/ExportMention";
import { useTouchDevice } from "../share/useTouchDevice";
import BackToHubLink from "../tabs/components/BackToHubLink";
import CardOutline from "../share/CardOutline";

const COPY = CHARACTERS_COPY.characterViewer;

export const viewerChooseStyles = `
  .viewer-drop {
    display: grid; justify-items: center; gap: 0.55rem;
    margin: 0.4rem auto 0; padding: 0.75rem 1rem 0.6rem;
    background: none; border: none; border-radius: 14px;
    font: inherit; color: inherit; cursor: pointer;
  }
  .viewer-drop:disabled { cursor: progress; }
  .viewer-drop svg { width: 148px; height: auto; display: block; }
  .viewer-card-outline { stroke: var(--viewer-line); transition: stroke 180ms ease; }
  .viewer-drop:not(:disabled):hover .viewer-card-outline,
  .viewer-drop:focus-visible .viewer-card-outline,
  .viewer-drop.is-dragging .viewer-card-outline { stroke: var(--viewer-accent); }
  .viewer-drop:focus-visible { outline: 2px solid var(--viewer-accent); outline-offset: 2px; }
  .viewer-drop.is-reading .viewer-qr-finders { animation: viewerScan 0.9s ease-in-out infinite alternate; }
  @keyframes viewerScan { from { stroke-opacity: 0.2; } to { stroke-opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .viewer-drop.is-reading .viewer-qr-finders { animation: none; }
  }
`;

const captionTitleStyle: CSSProperties = { fontSize: "0.92rem", fontWeight: 800 };

/** What /characters/view shows before a card is open (and what the hub's View tile opens). */
export default function ViewerChooseCard({ theme, reading, error, onFile }: {
  theme: AppTheme;
  reading: boolean;
  error: string | null;
  onFile: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const isTouch = useTouchDevice();

  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !reading) onFile(file);
  }

  const dropClassName = ["viewer-drop", dragging ? "is-dragging" : "", reading ? "is-reading" : ""].filter(Boolean).join(" ");
  const dropVars = { "--viewer-line": theme.border, "--viewer-accent": theme.accent } as CSSProperties;

  return (
    <>
      <div style={{ marginBottom: "0.65rem" }}>
        <BackToHubLink theme={theme} />
      </div>
      <h1 style={titleStyle()}>{COPY.title}</h1>
      <p style={subtitleStyle(theme)}>
        {COPY.subtitlePrefix}{" "}
        <ExportMention theme={theme} label={COPY.subtitleSuffix} punctuation={isTouch ? "," : "."} />
        {isTouch && " " + COPY.subtitleQr}
      </p>
      <p style={{ ...subtitleStyle(theme), marginTop: "0.25rem" }}>{COPY.subtitleNote}</p>

      {error && (
        <p role="alert" style={{ margin: "0.9rem 0 0", color: statusText(theme, "danger"), fontWeight: 700, fontSize: "0.85rem" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className={dropClassName}
        style={dropVars}
        disabled={reading}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <CardOutline theme={theme} />
        <span role="status" style={{ display: "grid", justifyItems: "center", gap: "0.1rem" }}>
          {reading ? (
            <span style={{ ...captionTitleStyle, color: theme.muted }}>{COPY.reading}</span>
          ) : (
            <>
              <span style={{ ...captionTitleStyle, color: theme.text }}>{isTouch ? COPY.dropHintTouch : COPY.dropTitle}</span>
              {!isTouch && <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>{COPY.dropHint}</span>}
            </>
          )}
        </span>
      </button>

      {isTouch && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
          <button
            type="button"
            disabled={reading}
            onClick={() => scanInputRef.current?.click()}
            style={secondaryButtonStyle(theme)}
          >
            {COPY.scanQrButton}
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="application/json,image/*,.json" onChange={handleInput} style={{ display: "none" }} />
      <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handleInput} style={{ display: "none" }} />
    </>
  );
}
