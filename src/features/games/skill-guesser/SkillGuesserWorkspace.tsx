"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { STATUS, statusText } from "../../../components/statusColors";
import { useMounted } from "../../../lib/useMounted";
import { ActionButton } from "../../tools/shared-ui";
import { toolStyles } from "../../tools/tool-styles";
import { SKILL_GUESSER_CLASSES, findSkillGuesserClass } from "./classes";
import {
  MAX_GUESSES,
  allSkillNames,
  currentPuzzleNumber,
  getPuzzle,
  msUntilNextPuzzle,
  puzzleDateMs,
  type SkillGuesserPuzzle,
} from "./puzzles";
import PuzzleSkillIcon from "./PuzzleSkillIcon";
import ResultsDialog from "./ResultsDialog";
import {
  computeSkillGuesserStats,
  readPuzzleResults,
  writeSkillGuesserResult,
  type GameMode,
  type SkillGuesserResult,
} from "./storage";


/* Puzzles roll over at 00:00 UTC, so the date label is formatted in UTC too. */
const PUZZLE_DATE_FMT = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const EMPTY_RESULT: SkillGuesserResult = { guesses: [], won: false, done: false };

const optionBtn: CSSProperties = {
  display: "block",
  width: "100%",
  background: "none",
  border: "none",
  padding: "7px 12px",
  font: "inherit",
  textAlign: "left",
  fontSize: "0.82rem",
  fontWeight: 600,
};

const modeTabBtn: CSSProperties = {
  padding: "5px 14px",
  border: "none",
  borderRadius: 8,
  fontSize: "0.75rem",
  fontWeight: 700,
  userSelect: "none",
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

const iconFrame: CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/* ------------------------------------------------------------------ */
/*  Guess picker (searchable combobox over the active answer pool)     */
/*  Normal mode picks a class; hard mode picks the skill name.         */
/* ------------------------------------------------------------------ */

function GuessPicker({
  theme,
  options,
  placeholder,
  ariaLabel,
  search,
  guessed,
  onSearchChange,
  onStage,
  onSubmit,
}: {
  theme: AppTheme;
  options: string[];
  placeholder: string;
  ariaLabel: string;
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
    if (!q) return options;
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [search, options]);

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
        aria-controls="sg-guess-listbox"
        aria-label={ariaLabel}
        value={search}
        placeholder={placeholder}
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
        <div id="sg-guess-listbox" role="listbox" style={menuStyle}>
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: "0.8rem", color: theme.muted, textAlign: "center" }}>
              No matches found
            </div>
          )}
          {filtered.map((name) => {
            const used = guessed.has(name);
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={search === name}
                className="sg-option"
                disabled={used}
                onClick={() => pick(name)}
                style={{
                  ...optionBtn,
                  color: used ? theme.muted : theme.text,
                  textDecoration: used ? "line-through" : "none",
                  cursor: used ? "not-allowed" : "pointer",
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mode tabs (Normal / Hard — hard locked until normal is finished)   */
/* ------------------------------------------------------------------ */

function ModeTabs({
  theme,
  mode,
  hardUnlocked,
  hardCleared,
  onChange,
}: {
  theme: AppTheme;
  mode: GameMode;
  hardUnlocked: boolean;
  hardCleared: boolean;
  onChange: (m: GameMode) => void;
}) {
  let hardLabel = "\u{1F512} Hard";
  if (hardUnlocked) hardLabel = hardCleared ? "Hard ✓" : "Hard";
  const tabs: { value: GameMode; label: string; disabled: boolean }[] = [
    { value: "normal", label: "Normal", disabled: false },
    { value: "hard", label: hardLabel, disabled: !hardUnlocked },
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: theme.timerBg,
        borderRadius: 10,
        padding: 3,
        border: `1px solid ${theme.border}`,
      }}
    >
      {tabs.map((t) => {
        const active = mode === t.value;
        return (
          <button
            key={t.value}
            type="button"
            className="tool-btn"
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            title={t.disabled ? "Finish Normal Mode to unlock" : undefined}
            style={{
              ...modeTabBtn,
              color: active ? "#fff" : theme.muted,
              background: active ? theme.accent : "transparent",
              opacity: t.disabled ? 0.5 : 1,
              cursor: t.disabled ? "not-allowed" : "pointer",
            }}
          >
            {t.label}
          </button>
        );
      })}
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
        const verdict = statusText(theme, correct ? "success" : "danger");
        const filled: CSSProperties = guess
          ? {
              border: `1px solid ${verdict}`,
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
            style={{ ...filled, ...guessSlot }}
          >
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

function StatsPanel({
  theme,
  mode,
  sectionPanel,
}: {
  theme: AppTheme;
  mode: GameMode;
  sectionPanel: CSSProperties;
}) {
  const stats = computeSkillGuesserStats(mode);
  const maxCount = Math.max(1, ...stats.distribution);
  const summary = [
    { label: "Played", value: String(stats.played) },
    { label: "Win Rate", value: `${stats.winRate}%` },
    { label: "Avg Guesses", value: stats.avgGuesses !== null ? stats.avgGuesses.toFixed(2) : "—" },
  ];

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: "0.6rem" }}>
        Your Stats — {mode === "hard" ? "Hard" : "Normal"}
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
/*  Single puzzle (owns both modes' results + the active mode)         */
/* ------------------------------------------------------------------ */

function PuzzleView({ theme, puzzleNumber }: { theme: AppTheme; puzzleNumber: number }) {
  const puzzle = useMemo(() => getPuzzle(puzzleNumber), [puzzleNumber]);
  const styles = toolStyles(theme);
  const [results, setResults] = useState(() => readPuzzleResults(puzzleNumber));
  const [mode, setMode] = useState<GameMode>("normal");
  const [search, setSearch] = useState("");
  const [staged, setStaged] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hardUnlocked = results.normal?.done === true;
  // The skill name stays hidden until the player wins (clears) hard mode.
  const skillNameRevealed = results.hard?.won === true;
  const result = results[mode] ?? EMPTY_RESULT;

  // Normal mode scores guesses against the class; hard mode asks for the skill
  // name itself (drawn from the whole skill pool). Everything downstream — the
  // picker, guess slots, share squares — keys off this one answer.
  const answer = mode === "hard" ? puzzle.skillName : puzzle.className;
  const options = useMemo(
    () => (mode === "hard" ? allSkillNames() : SKILL_GUESSER_CLASSES.map((c) => c.name)),
    [mode],
  );

  const guessed = useMemo(() => new Set(result.guesses), [result.guesses]);
  const failedCount = result.guesses.filter((g) => g !== answer).length;

  const answerLine = skillNameRevealed
    ? `The answer was ${puzzle.className} — ${puzzle.skillName}`
    : `The answer was ${puzzle.className}`;

  function handleModeChange(next: GameMode) {
    setMode(next);
    setSearch("");
    setStaged(null);
    setDialogOpen(false);
  }

  function handleSubmit(name?: string) {
    const guess = name ?? staged;
    if (!guess || result.done || guessed.has(guess)) return;
    setStaged(null);
    setSearch("");
    setResults((prev) => {
      const current = prev[mode] ?? EMPTY_RESULT;
      if (current.done || current.guesses.includes(guess)) return prev;
      const guesses = [...current.guesses, guess];
      const won = guess === answer;
      const next = { guesses, won, done: won || guesses.length >= MAX_GUESSES };
      writeSkillGuesserResult(puzzleNumber, mode, next);
      return { ...prev, [mode]: next };
    });
    const finished = guess === answer || result.guesses.length + 1 >= MAX_GUESSES;
    if (finished) setTimeout(() => setDialogOpen(true), 700);
  }

  return (
    <>
      <div className="fade-in panel-card" style={styles.sectionPanel}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", marginBottom: "1.1rem" }}>
          <div
            style={{ ...iconFrame, border: `1px solid ${theme.border}`, background: theme.timerBg }}
          >
            <PuzzleSkillIcon
              puzzle={puzzle}
              size={64}
              alt="Mystery skill icon"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            {mode === "hard" ? "What is this skill called?" : "Which class learns this skill?"}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
            {result.done
              ? answerLine
              : `${MAX_GUESSES - result.guesses.length} of ${MAX_GUESSES} guesses remaining`}
          </div>
          {mode === "normal" && result.done && !skillNameRevealed && (
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
              Clear Hard Mode to reveal the skill name.
            </div>
          )}
          <ModeTabs
            theme={theme}
            mode={mode}
            hardUnlocked={hardUnlocked}
            hardCleared={skillNameRevealed}
            onChange={handleModeChange}
          />
        </div>

        {result.done ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.1rem" }}>
            <ActionButton theme={theme} label="View Results" onClick={() => setDialogOpen(true)} />
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.1rem", flexWrap: "wrap" }}>
            <GuessPicker
              theme={theme}
              options={options}
              placeholder={mode === "hard" ? "Search skills…" : "Search classes…"}
              ariaLabel={mode === "hard" ? "Guess a skill" : "Guess a class"}
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
          <GuessSlots theme={theme} guesses={result.guesses} answer={answer} />
          <HintCards theme={theme} puzzle={puzzle} failedCount={failedCount} />
        </div>
      </div>

      <StatsPanel theme={theme} mode={mode} sectionPanel={styles.sectionPanel} />

      {dialogOpen && (
        <ResultsDialog
          theme={theme}
          puzzleNumber={puzzleNumber}
          puzzle={puzzle}
          mode={mode}
          result={result}
          answer={answer}
          skillNameRevealed={skillNameRevealed}
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
  const [today, setToday] = useState(() => currentPuzzleNumber());
  const [puzzleNumber, setPuzzleNumber] = useState(() => currentPuzzleNumber());

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
      <div className="tool-container" style={{ maxWidth: 560 }}>
        <style>{`.sg-option:hover:not(:disabled) { background: ${theme.accentSoft}; }
@media (max-width: 560px) { .sg-hints { grid-template-columns: 1fr !important; } }`}</style>
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
              <span>Mapledle #{puzzleNumber}</span>
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
            Guess which class learns the daily skill in {MAX_GUESSES} tries. Finish Normal Mode to
            unlock Hard Mode, and use the arrows to replay earlier days.
          </div>
        </div>

        <PuzzleView key={puzzleNumber} theme={theme} puzzleNumber={puzzleNumber} />
      </div>
    </div>
  );
}
