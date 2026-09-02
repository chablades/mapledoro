"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MarkIcon } from "../../../components/ResourceImage";
import { usePickerCoords } from "../../characters/setup/hooks/usePickerCoords";
import type { AppTheme } from "../../../components/themes";
import { STATUS, statusText } from "../../../components/statusColors";
import { useMounted } from "../../../lib/useMounted";
import { ActionButton } from "../../tools/shared-ui";
import { toolStyles } from "../../tools/tool-styles";
import { usePuzzleRoute } from "../usePuzzleRoute";
import BgmPlayer from "./BgmPlayer";
import ResultsDialog from "./ResultsDialog";
import {
  BGM_GUESSER_ANSWERS,
  MAX_GUESSES,
  currentPuzzleNumber,
  findBgmGuesserAnswer,
  getPuzzle,
  msUntilNextPuzzle,
  puzzleDateMs,
} from "./puzzles";
import {
  computeBgmGuesserStats,
  readPuzzleResult,
  writeBgmGuesserResult,
  type BgmGuesserResult,
} from "./storage";

/* Puzzles roll over at 00:00 UTC, so the date label is formatted in UTC too. */
const PUZZLE_DATE_FMT = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const EMPTY_RESULT: BgmGuesserResult = { guesses: [], won: false, done: false };

const ANSWER_NAMES = BGM_GUESSER_ANSWERS.map((a) => a.name);

const optionBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.65rem",
  width: "100%",
  background: "none",
  border: "none",
  padding: "9px 14px",
  font: "inherit",
  textAlign: "left",
  fontSize: "0.95rem",
  fontWeight: 600,
};

const guessSlot: CSSProperties = {
  borderRadius: 10,
  padding: "0.5rem 0.85rem",
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
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

/* ------------------------------------------------------------------ */
/*  Guess picker (searchable combobox over the area/boss answer pool)  */
/* ------------------------------------------------------------------ */

function GuessPicker({
  theme,
  search,
  guessed,
  onSearchChange,
  onStage,
  onSubmit,
}: {
  theme: AppTheme;
  search: string;
  guessed: Set<string>;
  onSearchChange: (v: string) => void;
  onStage: (name: string) => void;
  onSubmit: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Menu width is measured from the input on open rather than fixed, so the portaled
  // popover lines up with the field at every breakpoint.
  const [menuWidth, setMenuWidth] = useState(320);
  // `.panel-card` sets `overflow: hidden`, so an absolutely-positioned menu is clipped by
  // the panel's bottom edge. Portal it to <body> and position it against the anchor, the
  // same way the character setup and Mystic Frontier pickers do.
  const { ref, portalRef } = usePickerCoords(open, menuWidth);

  function openMenu() {
    if (ref.current) setMenuWidth(ref.current.offsetWidth);
    setOpen(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || portalRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, portalRef]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ANSWER_NAMES;
    return ANSWER_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  function pick(name: string) {
    onStage(name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const exact = filtered.find((name) => name.toLowerCase() === search.trim().toLowerCase());
    if (exact && !guessed.has(exact)) {
      setOpen(false);
      onSubmit(exact);
      return;
    }
    const first = filtered.find((name) => !guessed.has(name));
    if (first) pick(first);
  }

  const menuStyle: CSSProperties = {
    position: "absolute",
    width: menuWidth,
    maxHeight: 300,
    overflowY: "auto",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    zIndex: 300,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 220 }}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="bg-guess-listbox"
        aria-label="Guess an area or boss"
        value={search}
        placeholder="Search areas and bosses…"
        className="tool-input"
        onChange={(e) => {
          onSearchChange(e.target.value);
          openMenu();
        }}
        onFocus={openMenu}
        onKeyDown={handleKeyDown}
        style={{ ...toolStyles(theme).inputStyle, width: "100%", height: 40, boxSizing: "border-box" }}
      />
      {open && typeof document !== "undefined" && createPortal(
        <div ref={portalRef} id="bg-guess-listbox" role="listbox" style={menuStyle}>
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: "0.8rem", color: theme.muted, textAlign: "center" }}>
              No matches found
            </div>
          )}
          {filtered.map((name) => {
            const used = guessed.has(name);
            const answer = findBgmGuesserAnswer(name);
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={search === name}
                className="bg-option"
                disabled={used}
                onClick={() => pick(name)}
                style={{
                  ...optionBtn,
                  color: used ? theme.muted : theme.text,
                  textDecoration: used ? "line-through" : "none",
                  cursor: used ? "not-allowed" : "pointer",
                }}
              >
                {answer && (
                  <MarkIcon id={answer.mark} size={30} alt="" style={{ imageRendering: "pixelated" }} />
                )}
                {name}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guess slots                                                        */
/* ------------------------------------------------------------------ */

function GuessSlots({
  theme,
  guesses,
  answer,
}: {
  theme: AppTheme;
  guesses: string[];
  answer: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.45rem" }}>
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const guess = guesses[i];
        const correct = guess === answer;
        const verdict = statusText(theme, correct ? "success" : "danger");
        const filled: CSSProperties = guess
          ? { border: `1px solid ${verdict}`, background: theme.panel, color: theme.text }
          : { border: `1px dashed ${theme.border}`, background: theme.timerBg, color: theme.muted };
        return (
          <div key={i} style={{ ...filled, ...guessSlot }}>
            {guess ? (
              <>
                <span aria-hidden="true" style={{ color: verdict, fontWeight: 800 }}>
                  {correct ? "✓" : "✗"}
                </span>
                <span>{guess}</span>
              </>
            ) : (
              <span style={{ fontSize: "0.78rem" }}>Guess {i + 1}</span>
            )}
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
  const stats = computeBgmGuesserStats(MAX_GUESSES);
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
              // react-doctor-disable-next-line no-array-index-as-key -- `label` is the row's identity, not its position: a fixed-length guess histogram (1..MAX_GUESSES then X) that never reorders or filters
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

function PuzzleView({ theme, puzzleNumber }: { theme: AppTheme; puzzleNumber: number }) {
  const puzzle = useMemo(() => getPuzzle(puzzleNumber), [puzzleNumber]);
  const styles = toolStyles(theme);
  const [result, setResult] = useState(() => readPuzzleResult(puzzleNumber) ?? EMPTY_RESULT);
  const [search, setSearch] = useState("");
  const [staged, setStaged] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const guessed = useMemo(() => new Set(result.guesses), [result.guesses]);

  function handleSubmit(name?: string) {
    const guess = name ?? staged;
    if (!guess || result.done || guessed.has(guess)) return;
    setStaged(null);
    setSearch("");
    setResult((prev) => {
      if (prev.done || prev.guesses.includes(guess)) return prev;
      const guesses = [...prev.guesses, guess];
      const won = guess === puzzle.answer;
      const next = { guesses, won, done: won || guesses.length >= MAX_GUESSES };
      writeBgmGuesserResult(puzzleNumber, next);
      return next;
    });
    const finished = guess === puzzle.answer || result.guesses.length + 1 >= MAX_GUESSES;
    if (finished) setTimeout(() => setDialogOpen(true), 700);
  }

  return (
    <>
      <div className="fade-in panel-card" style={styles.sectionPanel}>
        <div style={{ display: "grid", gap: "0.9rem", marginBottom: "1.1rem" }}>
          <BgmPlayer theme={theme} group={puzzle.group} track={puzzle.track} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
              Which area or boss plays this music?
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginTop: "0.15rem" }}>
              {result.done
                ? `The answer was ${puzzle.answer} — ${puzzle.title}`
                : `${MAX_GUESSES - result.guesses.length} of ${MAX_GUESSES} guesses remaining`}
            </div>
          </div>
        </div>

        {result.done ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.1rem" }}>
            <ActionButton theme={theme} label="View Results" onClick={() => setDialogOpen(true)} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
            <GuessPicker
              theme={theme}
              search={search}
              guessed={guessed}
              onSearchChange={(v) => {
                setSearch(v);
                setStaged(null);
              }}
              onStage={(name) => {
                setStaged(name);
                setSearch(name);
              }}
              onSubmit={handleSubmit}
            />
            <ActionButton
              theme={theme}
              label="Guess"
              onClick={() => handleSubmit()}
              disabled={staged === null || guessed.has(staged)}
              style={{ height: 40, padding: "0 22px" }}
            />
          </div>
        )}

        <GuessSlots theme={theme} guesses={result.guesses} answer={puzzle.answer} />
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

export default function BgmGuesserWorkspace({
  theme,
  urlPuzzle,
}: {
  theme: AppTheme;
  /** Archive route segment, absent on the daily route. */
  urlPuzzle?: string;
}) {
  const mounted = useMounted();
  const [today, setToday] = useState(() => currentPuzzleNumber());
  const [puzzleNumber, setPuzzleNumber] = usePuzzleRoute("/games/bgm-guesser", urlPuzzle, today);

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
  // react-doctor-disable-next-line no-locale-format-in-render -- unreachable during SSR: sits below the `if (!mounted) return null` gate above
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
      <div className="tool-container" style={{ maxWidth: 560 }}>
        <style>{`.bg-option:hover:not(:disabled) { background: ${theme.accentSoft}; }`}</style>
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
              <span>BGM Guesser #{puzzleNumber}</span>
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
            Name the area or boss the daily track plays for in {MAX_GUESSES} tries. Use the arrows to
            replay earlier days.
          </div>
        </div>

        <PuzzleView key={puzzleNumber} theme={theme} puzzleNumber={puzzleNumber} />
      </div>
    </div>
  );
}
