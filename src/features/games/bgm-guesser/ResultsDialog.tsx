"use client";

import { useEffect, useState, type CSSProperties } from "react";
import ModalShell from "../../../components/ModalShell";
import { MarkIcon } from "../../../components/ResourceImage";
import type { AppTheme } from "../../../components/themes";
import { toolStyles } from "../../tools/tool-styles";
import {
  MAX_GUESSES,
  findBgmGuesserAnswer,
  msUntilNextPuzzle,
  type BgmGuesserPuzzle,
} from "./puzzles";
import type { BgmGuesserResult } from "./storage";

// Shares link straight to the day that was played, via the archive route.
const SHARE_BASE_URL = "https://www.mapledoro.com/games/bgm-guesser";

function buildShareText(
  puzzleNumber: number,
  answer: string,
  result: BgmGuesserResult,
): string {
  const score = result.won ? `${result.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const squares = result.guesses
    .map((g) => (g === answer ? "\u{1F7E9}" : "\u{1F7E5}"))
    .join("");
  return `BGM Guesser #${puzzleNumber} ${score}\n${squares}\n${SHARE_BASE_URL}/${puzzleNumber}`;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
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

const revealIconFrame: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const revealCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.85rem",
  margin: "1.1rem 0",
  padding: "0.85rem 1rem",
  borderRadius: 12,
  textAlign: "left",
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
  puzzle: BgmGuesserPuzzle;
  result: BgmGuesserResult;
  onClose: () => void;
}) {
  const styles = toolStyles(theme);
  const [copied, setCopied] = useState(false);
  const answer = findBgmGuesserAnswer(puzzle.answer);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(buildShareText(puzzleNumber, puzzle.answer, result));
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  }

  const score = result.won ? `${result.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;

  return (
    <ModalShell
      theme={theme}
      ariaLabel="BGM Guesser results"
      onClose={onClose}
      style={{ width: "min(420px, calc(100% - 2rem))", padding: "1.5rem" }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: theme.text }}>
          {result.won ? "You got it!" : "Out of guesses!"}
        </div>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted, marginTop: "0.2rem" }}>
          BGM Guesser #{puzzleNumber} — {score}
        </div>

        <div
          style={{ ...revealCard, border: `1px solid ${theme.border}`, background: theme.timerBg }}
        >
          <div style={{ ...revealIconFrame, background: theme.panel, border: `1px solid ${theme.border}` }}>
            {answer && (
              <MarkIcon id={answer.mark} size={44} alt="" style={{ imageRendering: "pixelated" }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 800, color: theme.text }}>
              {puzzle.answer}
            </div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted }}>
              {puzzle.title}
            </div>
          </div>
        </div>

        <div style={{ fontSize: "1.3rem", letterSpacing: "0.15em", marginBottom: "1.1rem" }} aria-hidden="true">
          {result.guesses.map((g, i) => (
            <span key={i}>{g === puzzle.answer ? "\u{1F7E9}" : "\u{1F7E5}"}</span>
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
