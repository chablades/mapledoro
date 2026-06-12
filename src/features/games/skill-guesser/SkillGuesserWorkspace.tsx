"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { useMounted } from "../../../lib/useMounted";
import { ActionButton, Toggle } from "../../tools/shared-ui";
import { toolStyles } from "../../tools/tool-styles";
import { SKILL_GUESSER_CLASSES, findSkillGuesserClass } from "./classes";
import {
  MAX_GUESSES,
  currentPuzzleNumber,
  getPuzzle,
  msUntilNextPuzzle,
  type SkillGuesserPuzzle,
} from "./puzzles";
import PuzzleSkillIcon from "./PuzzleSkillIcon";
import ResultsDialog from "./ResultsDialog";
import {
  computeSkillGuesserStats,
  readSkillGuesserHardMode,
  readSkillGuesserResult,
  writeSkillGuesserHardMode,
  writeSkillGuesserResult,
  type SkillGuesserResult,
} from "./storage";

const HIT_GREEN = "#2d8a2d";
const MISS_RED = "#c44040";

/* Hard mode: blur in px before any guess; reaches 0 on the final guess. */
const HARD_MODE_MAX_BLUR = 7;

/* ------------------------------------------------------------------ */
/*  Class picker (searchable combobox over the answer pool)            */
/* ------------------------------------------------------------------ */

function ClassPicker({
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SKILL_GUESSER_CLASSES;
    return SKILL_GUESSER_CLASSES.filter((c) => c.name.toLowerCase().includes(q));
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
    const exact = filtered.find((c) => c.name.toLowerCase() === search.trim().toLowerCase());
    if (exact && !guessed.has(exact.name)) {
      setOpen(false);
      onSubmit(exact.name);
      return;
    }
    const first = filtered.find((c) => !guessed.has(c.name));
    if (first) pick(first.name);
  }

  const menuStyle: CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 240,
    overflowY: "auto",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    zIndex: 10,
    marginTop: 4,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 220 }}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="sg-class-listbox"
        aria-label="Guess a class"
        value={search}
        placeholder="Search classes…"
        className="tool-input"
        onChange={(e) => {
          onSearchChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        style={{ ...toolStyles(theme).inputStyle, width: "100%", height: 40, boxSizing: "border-box" }}
      />
      {open && (
        <div id="sg-class-listbox" role="listbox" style={menuStyle}>
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: "0.8rem", color: theme.muted, textAlign: "center" }}>
              No classes found
            </div>
          )}
          {filtered.map((c) => {
            const used = guessed.has(c.name);
            return (
              <button
                key={c.name}
                type="button"
                role="option"
                aria-selected={search === c.name}
                className="sg-option"
                disabled={used}
                onClick={() => pick(c.name)}
                style={{
                  display: "block",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: "7px 12px",
                  font: "inherit",
                  textAlign: "left",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: used ? theme.muted : theme.text,
                  textDecoration: used ? "line-through" : "none",
                  cursor: used ? "not-allowed" : "pointer",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Guess slots + hints                                                */
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
        const filled: CSSProperties = guess
          ? {
              border: `1px solid ${correct ? HIT_GREEN : MISS_RED}`,
              background: theme.panel,
              color: theme.text,
            }
          : {
              border: `1px dashed ${theme.border}`,
              background: theme.timerBg,
              color: theme.muted,
            };
        return (
          <div
            key={i}
            style={{
              ...filled,
              borderRadius: 10,
              padding: "0.5rem 0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              minHeight: 24,
            }}
          >
            {guess ? (
              <>
                <span aria-hidden="true" style={{ color: correct ? HIT_GREEN : MISS_RED, fontWeight: 800 }}>
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

function HintCards({
  theme,
  puzzle,
  failedCount,
}: {
  theme: AppTheme;
  puzzle: SkillGuesserPuzzle;
  failedCount: number;
}) {
  const cls = findSkillGuesserClass(puzzle.className);
  if (!cls) return null;
  const hints = [
    { label: "Main Stat", value: cls.mainStat, unlockAfter: 2 },
    { label: "Secondary", value: cls.secondary, unlockAfter: 3 },
    { label: "Main Weapon", value: cls.weapon, unlockAfter: 4 },
  ];
  return (
    <div className="sg-hints" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
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
  const stats = computeSkillGuesserStats();
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
                    width: `${(count / maxCount) * 100}%`,
                    minWidth: count > 0 ? 26 : 8,
                    background: i < MAX_GUESSES ? theme.accent : MISS_RED,
                    opacity: count > 0 ? 1 : 0.25,
                    borderRadius: 4,
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    padding: "1px 6px",
                    textAlign: "right",
                    boxSizing: "border-box",
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
/*  Game board                                                         */
/* ------------------------------------------------------------------ */

function GameBoard({
  theme,
  puzzleNumber,
  hardMode,
  onHardModeChange,
}: {
  theme: AppTheme;
  puzzleNumber: number;
  hardMode: boolean;
  onHardModeChange: (on: boolean) => void;
}) {
  const puzzle = useMemo(() => getPuzzle(puzzleNumber), [puzzleNumber]);
  const styles = toolStyles(theme);
  const [result, setResult] = useState<SkillGuesserResult>(
    () => readSkillGuesserResult(puzzleNumber) ?? { guesses: [], won: false, done: false },
  );
  const [search, setSearch] = useState("");
  const [staged, setStaged] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const guessed = useMemo(() => new Set(result.guesses), [result.guesses]);
  const failedCount = result.guesses.filter((g) => g !== puzzle.className).length;

  // Hard mode: fully blurred before the first guess, sharpening linearly so
  // the icon is only fully clear on the last guess (or once the game ends).
  const blurPx =
    hardMode && !result.done
      ? (HARD_MODE_MAX_BLUR * (MAX_GUESSES - 1 - result.guesses.length)) / (MAX_GUESSES - 1)
      : 0;

  function handleSubmit(name?: string) {
    const guess = name ?? staged;
    if (!guess || result.done || guessed.has(guess)) return;
    setStaged(null);
    setSearch("");
    setResult((prev) => {
      if (prev.done || prev.guesses.includes(guess)) return prev;
      const guesses = [...prev.guesses, guess];
      const won = guess === puzzle.className;
      const next = { guesses, won, done: won || guesses.length >= MAX_GUESSES };
      writeSkillGuesserResult(puzzleNumber, next);
      return next;
    });
    const finished = guess === puzzle.className || result.guesses.length + 1 >= MAX_GUESSES;
    if (finished) setTimeout(() => setDialogOpen(true), 700);
  }

  return (
    <>
      <div className="fade-in panel-card" style={styles.sectionPanel}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", marginBottom: "1.1rem" }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 14,
              border: `1px solid ${theme.border}`,
              background: theme.timerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PuzzleSkillIcon
              puzzle={puzzle}
              size={64}
              alt="Mystery skill icon"
              style={{
                imageRendering: "pixelated",
                filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                transition: "filter 0.45s ease",
              }}
            />
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            Which class learns this skill?
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
            {result.done
              ? `The answer was ${puzzle.className} — ${puzzle.skillName}`
              : `${MAX_GUESSES - result.guesses.length} of ${MAX_GUESSES} guesses remaining`}
          </div>
          <Toggle
            theme={theme}
            label="Hard Mode"
            checked={hardMode}
            onChange={onHardModeChange}
            style={{ marginTop: "0.2rem" }}
          />
        </div>

        {result.done ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.1rem" }}>
            <ActionButton theme={theme} label="View Results" onClick={() => setDialogOpen(true)} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
            <ClassPicker
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

        <div style={{ display: "grid", gap: "1.1rem" }}>
          <GuessSlots theme={theme} guesses={result.guesses} answer={puzzle.className} />
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

export default function SkillGuesserWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [puzzleNumber, setPuzzleNumber] = useState(() => currentPuzzleNumber());
  const [hardMode, setHardMode] = useState(() => readSkillGuesserHardMode());

  // Move to the next puzzle when the UTC day rolls over while the page is open.
  useEffect(() => {
    const t = setTimeout(() => setPuzzleNumber(currentPuzzleNumber()), msUntilNextPuzzle() + 250);
    return () => clearTimeout(t);
  }, [puzzleNumber]);

  function handleHardModeChange(on: boolean) {
    setHardMode(() => {
      writeSkillGuesserHardMode(on);
      return on;
    });
  }

  if (!mounted) return null;

  return (
    <div className="page-content">
      <div className="tool-container" style={{ maxWidth: 560 }}>
        <style>{`.sg-option:hover:not(:disabled) { background: ${theme.accentSoft}; }
@media (max-width: 560px) { .sg-hints { grid-template-columns: 1fr !important; } }`}</style>
        <div className="tool-header">
          <Link href="/games" className="tool-header-back" style={{ color: theme.accent }}>
            ← Back to Games
          </Link>
          <div className="tool-header-title" style={{ color: theme.text }}>
            Mapledle #{puzzleNumber}
          </div>
          <div className="tool-header-desc" style={{ color: theme.muted }}>
            Guess which class learns the daily skill in {MAX_GUESSES} tries. A new puzzle arrives
            every day at 00:00 UTC.
          </div>
        </div>

        <GameBoard
          key={puzzleNumber}
          theme={theme}
          puzzleNumber={puzzleNumber}
          hardMode={hardMode}
          onHardModeChange={handleHardModeChange}
        />
      </div>
    </div>
  );
}
