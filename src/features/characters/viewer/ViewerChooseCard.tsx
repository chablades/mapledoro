"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { CHARACTERS_COPY } from "../tabs/content";
import { secondaryButtonStyle, subtitleStyle, titleStyle } from "../tabs/components/uiStyles";
import { ExportTabIcon } from "../tabs/screens/CharacterProfileOverviewScreen";
import { useTouchDevice } from "../share/useTouchDevice";

const COPY = CHARACTERS_COPY.characterViewer;

/** The exported card's layout in outline, measured off the real 750x1050 card at 1/7.5 scale:
 *  the art panel (wordmark and date along its top, the avatar, the name tag, the "Import at"
 *  band along its bottom), then Level / Class / World, the Scouter figure beside the class art,
 *  and the QR with its caption. It shows what to bring rather than decorating the page. */
function CardOutline({ theme }: { theme: AppTheme }) {
  const block = { fill: theme.muted, fillOpacity: 0.16 };
  const faint = { fill: theme.muted, fillOpacity: 0.08 };
  const bar = (x: number, y: number, w: number, h = 2.6) => <rect x={x} y={y} width={w} height={h} rx={h / 2} {...block} />;
  return (
    <svg viewBox="0 0 100 140" aria-hidden="true">
      <rect className="viewer-card-outline" x={1} y={1} width={98} height={138} rx={6} fill="none" strokeWidth={1.4} strokeDasharray="4 3" />
      {/* Art panel, with the band as its bottom strip. */}
      <rect x={5.5} y={5.5} width={89} height={85} rx={3.5} {...faint} />
      <path d="M5.5 84.5 H94.5 V87.2 A3.5 3.5 0 0 1 91 90.7 H9 A3.5 3.5 0 0 1 5.5 87.2 Z" {...block} />
      {bar(38, 86.4, 24, 2)}
      <circle cx={12.4} cy={12.3} r={2.6} {...block} />
      {bar(16.6, 11, 15)}
      {bar(75.5, 11, 15)}
      <rect x={36.5} y={29} width={27} height={40} rx={11} {...block} />
      <rect x={38.2} y={75} width={23.6} height={5.6} rx={2.8} {...block} fillOpacity={0.3} />
      {/* Level, Class, World. */}
      {bar(5.5, 95, 9, 2.2)}
      {bar(5.5, 99.4, 10, 4.4)}
      {bar(36.3, 95, 9, 2.2)}
      {bar(36.3, 99.4, 15, 4.4)}
      {bar(67, 95, 9, 2.2)}
      {bar(67, 99.4, 14, 4.4)}
      {/* Scouter, the class art beside it, and the QR with its caption. */}
      {bar(5.5, 109, 21, 2.2)}
      {bar(5.5, 113.5, 26, 6)}
      <rect x={36.5} y={107} width={22} height={28} rx={8} {...faint} />
      <rect x={67} y={106.7} width={27.6} height={27.6} rx={2.5} {...faint} />
      <g className="viewer-qr-finders" fill="none" stroke={theme.muted} strokeOpacity={0.55} strokeWidth={1.3}>
        <rect x={69.5} y={109.2} width={6} height={6} rx={1} />
        <rect x={85.6} y={109.2} width={6} height={6} rx={1} />
        <rect x={69.5} y={125.3} width={6} height={6} rx={1} />
      </g>
      {bar(71, 135.6, 20, 1.6)}
    </svg>
  );
}

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
      <h1 style={titleStyle()}>{COPY.title}</h1>
      <p style={{ ...subtitleStyle(theme), display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
        {COPY.subtitlePrefix}
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontWeight: 800, color: theme.text }}>
            <ExportTabIcon strokeWidth={2.5} />
            {COPY.subtitleSuffix}
          </span>
          {isTouch ? "," : "."}
        </span>
        {isTouch && COPY.subtitleQr}
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
