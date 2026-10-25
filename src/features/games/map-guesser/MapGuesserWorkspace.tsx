"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { STATUS, statusText } from "../../../components/statusColors";
import { bgmTrackUrl } from "../../../lib/mapleResource";
import { useMounted } from "../../../lib/useMounted";
import { ActionButton, PillGroup } from "../../tools/shared-ui";
import { toolStyles } from "../../tools/tool-styles";
import { mapName } from "./hierarchy";
import {
  MAX_GUESSES,
  currentPuzzleNumber,
  getPuzzle,
  msUntilNextPuzzle,
  puzzleDateMs,
  type MapGuesserPuzzle,
} from "./puzzles";
import MinimapReveal from "./MinimapReveal";
import ResultsDialog from "./ResultsDialog";
import { feedbackForGuess, type LevelColor } from "./scoring";
import {
  computeMapGuesserStats,
  readMapGuesserResult,
  writeMapGuesserResult,
  type MapGuesserResult,
} from "./storage";
import { TEST_PUZZLES } from "./testPuzzles"; // TEMPORARY (MapGuessr testing)
import WorldMapPicker from "./WorldMapPicker";

/* Puzzles roll over at 00:00 UTC, so the date label is formatted in UTC too. */
const PUZZLE_DATE_FMT = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const EMPTY_RESULT: MapGuesserResult = { guesses: [], won: false, done: false };

const guessSlot: CSSProperties = {
  borderRadius: 10,
  padding: "0.5rem 0.85rem",
  display: "grid",
  gap: "0.25rem",
  fontSize: "0.85rem",
  fontWeight: 700,
  minHeight: 24,
};

const distBar: CSSProperties = {
  borderRadius: 4,
  fontSize: "0.75rem",
  fontWeight: 800,
  padding: "1px 6px",
  textAlign: "right",
  boxSizing: "border-box",
};

function levelColor(theme: AppTheme, color: LevelColor): string {
  if (color === "gray") return theme.muted;
  return statusText(theme, color === "green" ? "success" : "danger");
}

/* ------------------------------------------------------------------ */
/*  Guess rows                                                         */
/* ------------------------------------------------------------------ */

function GuessRow({ theme, target, guess }: { theme: AppTheme; target: number; guess: number }) {
  const feedback = feedbackForGuess(target, guess);
  const correct = guess === target;
  const verdict = statusText(theme, correct ? "success" : "danger");
  return (
    <div style={{ ...guessSlot, border: `1px solid ${verdict}`, background: theme.panel, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span aria-hidden="true" style={{ color: verdict, fontWeight: 800 }}>
          {correct ? "✓" : "✗"}
        </span>
        <span>{mapName(guess)}</span>
      </div>
      {feedback && !correct && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}>
          {feedback.levels.slice(0, -1).map((level, i) => (
            <span key={i} style={{ display: "inline-flex", gap: "0.3rem" }}>
              {i > 0 && <span style={{ color: theme.muted }}>›</span>}
              <span style={{ color: levelColor(theme, level.color) }}>{level.label}</span>
            </span>
          ))}
          {feedback.direction && (
            <span style={{ marginLeft: "auto", color: theme.text }}>
              <span aria-hidden="true">{feedback.direction.arrow}</span> {feedback.direction.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function GuessSlots({ theme, target, guesses }: { theme: AppTheme; target: number; guesses: number[] }) {
  return (
    <div style={{ display: "grid", gap: "0.45rem" }}>
      {Array.from({ length: MAX_GUESSES }, (_, i) =>
        guesses[i] !== undefined ? (
          <GuessRow key={i} theme={theme} target={target} guess={guesses[i]} />
        ) : (
          <div
            key={i}
            style={{ ...guessSlot, border: `1px dashed ${theme.border}`, background: theme.timerBg, color: theme.muted }}
          >
            <span style={{ fontSize: "0.78rem" }}>Guess {i + 1}</span>
          </div>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hints                                                              */
/* ------------------------------------------------------------------ */

function HintCards({ theme, puzzle, failedCount }: { theme: AppTheme; puzzle: MapGuesserPuzzle; failedCount: number }) {
  const hints = [
    {
      label: "Map BGM",
      unlockAfter: 2,
      value: puzzle.bgm ? (
        <audio controls preload="none" src={bgmTrackUrl(puzzle.bgm)} style={{ width: "100%", height: 32 }} />
      ) : (
        "This map has no music"
      ),
    },
    { label: "Street", unlockAfter: 4, value: puzzle.street ?? "No street name" },
  ];
  return (
    <div className="mg-hints" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
      {hints.map((h) => {
        const unlocked = failedCount >= h.unlockAfter;
        return (
          <div
            key={h.label}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "0.6rem 0.75rem",
              background: unlocked ? theme.panel : theme.timerBg,
              opacity: unlocked ? 1 : 0.75,
            }}
          >
            <div className="tool-field-label" style={{ color: theme.muted }}>
              {h.label}
            </div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: unlocked ? theme.text : theme.muted }}>
              {unlocked ? h.value : `\u{1F512} After ${h.unlockAfter} misses`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats panel                                                        */
/* ------------------------------------------------------------------ */

function StatsPanel({ theme, sectionPanel }: { theme: AppTheme; sectionPanel: CSSProperties }) {
  const stats = computeMapGuesserStats();
  const maxCount = Math.max(1, ...stats.distribution);
  const summary = [
    { label: "Played", value: String(stats.played) },
    { label: "Win Rate", value: `${stats.winRate}%` },
    { label: "Avg Guesses", value: stats.avgGuesses !== null ? stats.avgGuesses.toFixed(2) : "—" },
  ];

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: "0.6rem" }}>
        Your Stats
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: stats.played > 0 ? "0.9rem" : 0 }}>
        {summary.map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: theme.text }}>{s.value}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>{s.label}</div>
          </div>
        ))}
      </div>
      {stats.played > 0 && (
        <div style={{ display: "grid", gap: "0.3rem" }}>
          {stats.distribution.map((count, i) => {
            const label = i < MAX_GUESSES ? String(i + 1) : "X";
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 14, fontSize: "0.75rem", fontWeight: 800, color: theme.muted }}>{label}</span>
                <div
                  style={{
                    ...distBar,
                    width: `${(count / maxCount) * 100}%`,
                    minWidth: count > 0 ? 26 : 8,
                    background: i < MAX_GUESSES ? theme.accent : STATUS.danger.fill,
                    color: i < MAX_GUESSES ? theme.accentOn : STATUS.danger.on,
                    opacity: count > 0 ? 1 : 0.25,
                  }}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single puzzle                                                      */
/* ------------------------------------------------------------------ */

function PuzzleView({
  theme,
  puzzleNumber,
  testIndex,
}: {
  theme: AppTheme;
  puzzleNumber: number;
  /** TEMPORARY (MapGuessr testing): plays TEST_PUZZLES[testIndex] without saving results. */
  testIndex: number | null;
}) {
  const puzzle = useMemo(
    () => (testIndex !== null ? TEST_PUZZLES[testIndex] : getPuzzle(puzzleNumber)),
    [puzzleNumber, testIndex],
  );
  const styles = toolStyles(theme);
  const [result, setResult] = useState(() =>
    testIndex !== null ? EMPTY_RESULT : (readMapGuesserResult(puzzleNumber) ?? EMPTY_RESULT),
  );
  const [staged, setStaged] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const guessed = useMemo(() => new Set(result.guesses), [result.guesses]);
  const failedCount = result.guesses.filter((g) => g !== puzzle.mapId).length;

  function handleSubmit() {
    if (staged === null || result.done || guessed.has(staged)) return;
    const guess = staged;
    setStaged(null);
    setResult((prev) => {
      if (prev.done || prev.guesses.includes(guess)) return prev;
      const guesses = [...prev.guesses, guess];
      const won = guess === puzzle.mapId;
      const next = { guesses, won, done: won || guesses.length >= MAX_GUESSES };
      if (testIndex === null) writeMapGuesserResult(puzzleNumber, next);
      return next;
    });
    const finished = guess === puzzle.mapId || result.guesses.length + 1 >= MAX_GUESSES;
    if (finished) setTimeout(() => setDialogOpen(true), 700);
  }

  return (
    <>
      <div className="fade-in panel-card" style={styles.sectionPanel}>
        <div style={{ display: "grid", justifyItems: "center", gap: "0.4rem", marginBottom: "1.1rem" }}>
          <MinimapReveal
            theme={theme}
            mapId={puzzle.mapId}
            center={testIndex !== null ? [0.5, 0.6] : puzzle.reveal}
            misses={result.done ? null : failedCount}
            viewSrc={testIndex !== null ? `/map-guesser-test/${puzzle.mapId}.webp` : undefined} // TEMPORARY (map render preview)
          />
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            Where is this map? Each miss reveals more of it.
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
            {result.done
              ? `The answer was ${mapName(puzzle.mapId)}`
              : `${MAX_GUESSES - result.guesses.length} of ${MAX_GUESSES} guesses remaining`}
          </div>
        </div>

        <WorldMapPicker
          key={result.done ? "revealed" : "playing"}
          theme={theme}
          staged={staged}
          guessed={guessed}
          disabled={result.done}
          revealMapId={result.done ? puzzle.mapId : null}
          onStage={setStaged}
        />

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", margin: "1.1rem 0" }}>
          {result.done ? (
            <ActionButton theme={theme} label="View Results" onClick={() => setDialogOpen(true)} />
          ) : (
            <>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: staged !== null ? theme.text : theme.muted }}>
                {staged !== null ? mapName(staged) : "No map selected"}
              </span>
              <ActionButton
                theme={theme}
                label="Guess"
                onClick={handleSubmit}
                disabled={staged === null}
                style={{ height: 40, padding: "0 22px" }}
              />
            </>
          )}
        </div>

        <div style={{ display: "grid", gap: "1.1rem" }}>
          <GuessSlots theme={theme} target={puzzle.mapId} guesses={result.guesses} />
          <HintCards theme={theme} puzzle={puzzle} failedCount={failedCount} />
        </div>
      </div>

      <StatsPanel theme={theme} sectionPanel={styles.sectionPanel} />

      {dialogOpen && (
        <ResultsDialog
          theme={theme}
          puzzleNumber={puzzleNumber}
          puzzle={puzzle}
          result={result}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Workspace                                                          */
/* ------------------------------------------------------------------ */

export default function MapGuesserWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [today, setToday] = useState(() => currentPuzzleNumber());
  const [puzzleNumber, setPuzzleNumber] = useState(() => currentPuzzleNumber());
  const [testMode, setTestMode] = useState("daily"); // TEMPORARY (MapGuessr testing)
  const testIndex = testMode === "daily" ? null : Number(testMode);

  // Advance to the next puzzle when the UTC day rolls over while the page is
  // open; carry the viewer along only if they're looking at the latest day.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = currentPuzzleNumber();
      setToday(next);
      setPuzzleNumber((p) => (p === today ? next : p));
    }, msUntilNextPuzzle() + 250);
    return () => clearTimeout(t);
  }, [today]);

  if (!mounted) return null;

  const canPrev = puzzleNumber > 1;
  const canNext = puzzleNumber < today;
  const dateLabel = PUZZLE_DATE_FMT.format(puzzleDateMs(puzzleNumber));
  const arrowStyle = (enabled: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    padding: "0 0.3rem",
    font: "inherit",
    lineHeight: 1,
    color: enabled ? theme.accent : theme.border,
    cursor: enabled ? "pointer" : "not-allowed",
  });

  return (
    <div className="page-content">
      <div className="tool-container" style={{ maxWidth: 720 }}>
        <style>{`@media (max-width: 560px) { .mg-hints { grid-template-columns: 1fr !important; } }`}</style>
        <div className="tool-header">
          <Link href="/games" className="tool-header-back" style={{ color: theme.accentText }}>
            ← Back to Games
          </Link>
          <div className="tool-header-title" style={{ color: theme.text }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", lineHeight: 1 }}>
              <button
                type="button"
                aria-label="Previous puzzle"
                disabled={!canPrev}
                onClick={() => setPuzzleNumber((p) => p - 1)}
                style={arrowStyle(canPrev)}
              >
                ‹
              </button>
              <span>MapGuessr #{puzzleNumber}</span>
              <button
                type="button"
                aria-label="Next puzzle"
                disabled={!canNext}
                onClick={() => setPuzzleNumber((p) => p + 1)}
                style={arrowStyle(canNext)}
              >
                ›
              </button>
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: theme.muted,
                textAlign: "center",
                marginTop: "0.2rem",
              }}
            >
              {dateLabel}
            </div>
          </div>
          <div className="tool-header-desc" style={{ color: theme.muted }}>
            Find the daily map from its minimap in {MAX_GUESSES} tries. Each guess shows how far down the
            world map path you got right, and which way to head next.
          </div>
        </div>

        {/* TEMPORARY (MapGuessr testing): test puzzle switcher. */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <PillGroup
            theme={theme}
            options={[
              { value: "daily", label: "Daily" },
              ...TEST_PUZZLES.map((_, i) => ({ value: String(i), label: `Test ${i + 1}` })),
            ]}
            value={testMode}
            onChange={setTestMode}
          />
        </div>

        <PuzzleView
          key={testIndex !== null ? `test-${testIndex}` : puzzleNumber}
          theme={theme}
          puzzleNumber={puzzleNumber}
          testIndex={testIndex}
        />
      </div>
    </div>
  );
}
