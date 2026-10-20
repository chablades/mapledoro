"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import ModalShell from "../../../components/ModalShell";
import type { AppTheme } from "../../../components/themes";
import { mapBackUrl, mapMinimapUrl } from "../../../lib/mapleResource";
import { toolStyles } from "../../tools/tool-styles";
import { mapName } from "./hierarchy";
import { MAX_GUESSES, msUntilNextPuzzle, type MapGuesserPuzzle } from "./puzzles";
import { shareSquaresForGuess } from "./scoring";
import type { MapGuesserResult } from "./storage";

const SHARE_URL = "https://www.mapledoro.com/games/map-guesser";

function buildShareText(puzzleNumber: number, puzzle: MapGuesserPuzzle, result: MapGuesserResult): string {
  const score = result.won ? `${result.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const rows = result.guesses.map((g) => shareSquaresForGuess(puzzle.mapId, g)).join("\n");
  return `MapGuessr #${puzzleNumber} ${score}\n${rows}\n${SHARE_URL}`;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

function NextPuzzleCountdown({ theme }: { theme: AppTheme }) {
  const [remaining, setRemaining] = useState(() => msUntilNextPuzzle());

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>
      Next puzzle in{" "}
      <span style={{ color: theme.accentText, fontVariantNumeric: "tabular-nums" }}>
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

const revealCard: CSSProperties = {
  display: "grid",
  gap: "0.6rem",
  justifyItems: "center",
  margin: "1.1rem 0",
  padding: "0.85rem 1rem",
  borderRadius: 12,
};

const revealMinimap: CSSProperties = {
  position: "relative",
  width: "100%",
  height: 110,
};

export default function ResultsDialog({
  theme,
  puzzleNumber,
  puzzle,
  result,
  onClose,
}: {
  theme: AppTheme;
  puzzleNumber: number;
  puzzle: MapGuesserPuzzle;
  result: MapGuesserResult;
  onClose: () => void;
}) {
  const styles = toolStyles(theme);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(buildShareText(puzzleNumber, puzzle, result));
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  }

  const score = result.won ? `${result.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;

  return (
    <ModalShell
      theme={theme}
      ariaLabel="MapGuessr results"
      onClose={onClose}
      style={{ width: "min(420px, calc(100% - 2rem))", padding: "1.5rem" }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: theme.text }}>
          {result.won ? "You found it!" : "Out of guesses!"}
        </div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted, marginTop: "0.2rem" }}>
          MapGuessr #{puzzleNumber} — {score}
        </div>

        <div style={{ ...revealCard, border: `1px solid ${theme.border}`, background: theme.timerBg }}>
          <div style={revealMinimap}>
            <Image
              src={mapBackUrl(puzzle.mapId)}
              alt=""
              fill
              unoptimized
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              style={{ objectFit: "contain", imageRendering: "pixelated" }}
            />
            <Image
              src={mapMinimapUrl(puzzle.mapId)}
              alt={mapName(puzzle.mapId)}
              fill
              unoptimized
              style={{ objectFit: "contain", imageRendering: "pixelated" }}
            />
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 800, color: theme.text }}>{mapName(puzzle.mapId)}</div>
            {puzzle.street && (
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted }}>{puzzle.street}</div>
            )}
          </div>
        </div>

        <div style={{ fontSize: "1rem", lineHeight: 1.35, marginBottom: "1.1rem" }} aria-hidden="true">
          {result.guesses.map((g, i) => (
            <div key={i}>{shareSquaresForGuess(puzzle.mapId, g)}</div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            type="button"
            className="tool-btn tool-dialog-btn"
            onClick={handleShare}
            style={styles.dialogPrimaryBtnStyle}
          >
            {copied ? "Copied!" : "Share Result"}
          </button>
          <button
            type="button"
            className="tool-btn tool-dialog-btn"
            onClick={onClose}
            style={styles.dialogBtnStyle}
          >
            Close
          </button>
        </div>

        <NextPuzzleCountdown theme={theme} />
      </div>
    </ModalShell>
  );
}
