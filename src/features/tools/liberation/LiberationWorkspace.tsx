"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import {
  type LiberationType,
  type LiberationBoss,
  type LiberationQuest,
  GENESIS_BOSSES,
  GENESIS_QUESTS,
  GENESIS_TOTAL,
  DESTINY_BOSSES,
  DESTINY_QUESTS,
  DESTINY_TOTAL,
  getTracesPerClear,
} from "./liberation-data";

// -- Types --------------------------------------------------------------------

interface BossSelection {
  /** null = not clearing, otherwise index into boss.difficulties */
  difficultyIdx: number | null;
  partySize: number;
  clearedThisWeek: boolean;
}

interface SavedState {
  type: LiberationType;
  currentQuestIdx: number;
  currentTraces: number;
  genesisPass: boolean;
  startDate: string;
  bosses: Record<string, BossSelection>;
}

// -- Storage ------------------------------------------------------------------

const STORAGE_KEY = "liberation-v1";

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: SavedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -- Helpers ------------------------------------------------------------------

function todayStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function makeBossKey(type: LiberationType, bossName: string): string {
  return `${type}:${bossName}`;
}

function defaultSelections(): Record<string, BossSelection> {
  return {};
}

function getSelection(
  selections: Record<string, BossSelection>,
  type: LiberationType,
  bossName: string,
): BossSelection {
  return (
    selections[makeBossKey(type, bossName)] ?? {
      difficultyIdx: null,
      partySize: 1,
      clearedThisWeek: false,
    }
  );
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// -- Calculation --------------------------------------------------------------

interface CalcResult {
  weeklyTraces: number;
  monthlyTraces: number;
  /** effective weekly including monthly amortised */
  effectiveWeekly: number;
  totalRemaining: number;
  weeksToComplete: number;
  completionDate: string;
  breakdown: { bossName: string; traces: number; reset: string }[];
}

function calculate(
  type: LiberationType,
  bosses: LiberationBoss[],
  quests: LiberationQuest[],
  selections: Record<string, BossSelection>,
  questIdx: number,
  currentTraces: number,
  genesisPass: boolean,
  startDate: string,
): CalcResult {
  let weeklyTraces = 0;
  let monthlyTraces = 0;
  let clearedWeeklyTraces = 0;
  const breakdown: CalcResult["breakdown"] = [];

  for (const boss of bosses) {
    const sel = getSelection(selections, type, boss.name);
    if (sel.difficultyIdx === null) continue;
    const diff = boss.difficulties[sel.difficultyIdx];
    if (!diff) continue;
    const traces = getTracesPerClear(diff.traces, sel.partySize, genesisPass, type);
    breakdown.push({ bossName: boss.name, traces, reset: boss.reset });
    if (boss.reset === "monthly") {
      monthlyTraces += traces;
    } else {
      weeklyTraces += traces;
      if (sel.clearedThisWeek) clearedWeeklyTraces += traces;
    }
  }

  // Sum remaining from current quest onward
  let totalRemaining = 0;
  for (let i = questIdx; i < quests.length; i++) {
    totalRemaining += quests[i].required;
  }
  totalRemaining -= currentTraces;
  if (totalRemaining < 0) totalRemaining = 0;

  // Effective weekly (monthly bosses contribute ~1/4.33 per week)
  const effectiveWeekly = weeklyTraces + monthlyTraces / 4.33;

  let weeksToComplete: number;
  if (totalRemaining <= 0) {
    weeksToComplete = 0;
  } else if (effectiveWeekly <= 0) {
    weeksToComplete = Infinity;
  } else {
    // First week: cleared bosses don't contribute (already collected)
    const firstWeekTraces = effectiveWeekly - clearedWeeklyTraces;
    const remainingAfterFirstWeek = totalRemaining - firstWeekTraces;
    if (remainingAfterFirstWeek <= 0) {
      weeksToComplete = 1;
    } else {
      weeksToComplete = 1 + Math.ceil(remainingAfterFirstWeek / effectiveWeekly);
    }
  }

  const completionDate =
    weeksToComplete === Infinity
      ? "Never"
      : addWeeks(startDate, weeksToComplete);

  return {
    weeklyTraces,
    monthlyTraces,
    effectiveWeekly,
    totalRemaining,
    weeksToComplete,
    completionDate,
    breakdown,
  };
}

// -- Component ----------------------------------------------------------------

export default function LiberationWorkspace({ theme }: { theme: AppTheme }) {
  const [type, setType] = useState<LiberationType>("genesis");
  const [questIdx, setQuestIdx] = useState(0);
  const [currentTraces, setCurrentTraces] = useState(0);
  const [genesisPass, setGenesisPass] = useState(false);
  const [startDate, setStartDate] = useState(todayStr);
  const [selections, setSelections] = useState<Record<string, BossSelection>>(
    defaultSelections,
  );
  const [loaded, setLoaded] = useState(false);

  // Load
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setType(saved.type);
      setQuestIdx(saved.currentQuestIdx);
      setCurrentTraces(saved.currentTraces);
      setGenesisPass(saved.genesisPass);
      setStartDate(saved.startDate);
      setSelections(saved.bosses);
    }
    setLoaded(true);
  }, []);

  // Persist
  useEffect(() => {
    if (loaded) {
      saveState({
        type,
        currentQuestIdx: questIdx,
        currentTraces,
        genesisPass,
        startDate,
        bosses: selections,
      });
    }
  }, [type, questIdx, currentTraces, genesisPass, startDate, selections, loaded]);

  const bosses = type === "genesis" ? GENESIS_BOSSES : DESTINY_BOSSES;
  const quests = type === "genesis" ? GENESIS_QUESTS : DESTINY_QUESTS;
  const totalNeeded = type === "genesis" ? GENESIS_TOTAL : DESTINY_TOTAL;

  const setDifficulty = useCallback(
    (bossName: string, diffIdx: number | null) => {
      setSelections((prev) => ({
        ...prev,
        [makeBossKey(type, bossName)]: {
          ...getSelection(prev, type, bossName),
          difficultyIdx: diffIdx,
        },
      }));
    },
    [type],
  );

  const setPartySize = useCallback(
    (bossName: string, size: number) => {
      setSelections((prev) => ({
        ...prev,
        [makeBossKey(type, bossName)]: {
          ...getSelection(prev, type, bossName),
          partySize: size,
        },
      }));
    },
    [type],
  );

  const setCleared = useCallback(
    (bossName: string, cleared: boolean) => {
      setSelections((prev) => ({
        ...prev,
        [makeBossKey(type, bossName)]: {
          ...getSelection(prev, type, bossName),
          clearedThisWeek: cleared,
        },
      }));
    },
    [type],
  );

  const resetBosses = useCallback(() => {
    setSelections((prev) => {
      const next = { ...prev };
      for (const boss of type === "genesis" ? GENESIS_BOSSES : DESTINY_BOSSES) {
        next[makeBossKey(type, boss.name)] = {
          difficultyIdx: null,
          partySize: 1,
          clearedThisWeek: false,
        };
      }
      return next;
    });
  }, [type]);

  // Switch type, clamp quest index
  const switchType = useCallback(
    (t: LiberationType) => {
      setType(t);
      const maxQuest = (t === "genesis" ? GENESIS_QUESTS : DESTINY_QUESTS).length - 1;
      setQuestIdx((prev) => Math.min(prev, maxQuest));
      setCurrentTraces(0);
    },
    [],
  );

  // Calculate
  const result = calculate(
    type,
    bosses,
    quests,
    selections,
    questIdx,
    currentTraces,
    genesisPass,
    startDate,
  );

  // How many total traces collected so far (all completed quests + current progress)
  let tracesCompleted = 0;
  for (let i = 0; i < questIdx; i++) tracesCompleted += quests[i].required;
  tracesCompleted += currentTraces;
  const progressPct = Math.min(100, (tracesCompleted / totalNeeded) * 100);

  // Styles
  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    padding: "6px 10px",
    color: theme.text,
    fontFamily: "'Nunito', sans-serif",
    fontSize: "0.82rem",
    fontWeight: 700,
    outline: "none",
  };

  const pillBtn = (
    active: boolean,
    accent?: boolean,
  ): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: "8px",
    fontSize: "0.78rem",
    fontWeight: 800,
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.15s",
    color: active
      ? accent
        ? "#fff"
        : theme.accentText
      : theme.muted,
    background: active
      ? accent
        ? theme.accent
        : theme.accentSoft
      : "transparent",
    border: active ? "none" : `1px solid ${theme.border}`,
  });

  const sectionPanel: React.CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "18px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 800,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "8px",
  };

  const traceName = type === "genesis" ? "Traces of Darkness" : "Determination";
  const traceNameShort = type === "genesis" ? "Traces" : "Determination";

  return (
    <>
      <style>{`
        .lib-btn { transition: background 0.15s, transform 0.1s; cursor: pointer; user-select: none; }
        .lib-btn:hover { transform: translateY(-1px); }
        .lib-btn:active { transform: translateY(0); }
        .lib-diff-btn { transition: all 0.15s; cursor: pointer; user-select: none; }
        .lib-diff-btn:hover { transform: translateY(-1px); }
        @media (max-width: 860px) {
          .lib-main { padding: 1rem !important; }
          .lib-boss-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="lib-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "1.25rem" }}>
            <Link
              href="/tools"
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                color: theme.accent,
                textDecoration: "none",
              }}
            >
              ← Back to Tools
            </Link>
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.5rem",
                color: theme.text,
                marginTop: "0.5rem",
              }}
            >
              Liberation Calculator
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: theme.muted,
                fontWeight: 600,
                marginTop: "0.15rem",
                lineHeight: 1.5,
              }}
            >
              Estimate your Genesis or Destiny liberation completion date.
            </div>
          </div>

          {/* Type toggle */}
          <div className="fade-in" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: theme.timerBg,
                borderRadius: "10px",
                padding: "3px",
                border: `1px solid ${theme.border}`,
              }}
            >
              {(["genesis", "destiny"] as const).map((t) => (
                <div
                  key={t}
                  className="lib-btn"
                  onClick={() => switchType(t)}
                  style={{
                    flex: 1,
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    textAlign: "center",
                    color:
                      type === t ? theme.accentText : theme.muted,
                    background:
                      type === t ? theme.accentSoft : "transparent",
                  }}
                >
                  {t === "genesis" ? "Genesis Liberation" : "Destiny Liberation"}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="fade-in" style={sectionPanel}>
            <div style={labelStyle}>Configuration</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "flex-end",
              }}
            >
              {/* Current Quest */}
              <div style={{ flex: "1 1 220px" }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: "4px",
                  }}
                >
                  Current Quest
                </div>
                <select
                  value={questIdx}
                  onChange={(e) => {
                    setQuestIdx(Number(e.target.value));
                    setCurrentTraces(0);
                  }}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    cursor: "pointer",
                  }}
                >
                  {quests.map((q, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {q.label} ({q.required.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Traces */}
              <div style={{ flex: "0 1 140px" }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: "4px",
                  }}
                >
                  Current {traceNameShort}
                </div>
                <input
                  type="number"
                  min={0}
                  max={quests[questIdx]?.required ?? 9999}
                  value={currentTraces}
                  onChange={(e) => {
                    let v = parseInt(e.target.value) || 0;
                    if (v < 0) v = 0;
                    const max = quests[questIdx]?.required ?? 9999;
                    if (v > max) v = max;
                    setCurrentTraces(v);
                  }}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>

              {/* Start Date */}
              <div style={{ flex: "0 1 160px" }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: "4px",
                  }}
                >
                  Start Date (UTC)
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>

              {/* Genesis Pass */}
              {type === "genesis" && (
                <div style={{ flex: "0 0 auto" }}>
                  <div
                    className="lib-btn"
                    onClick={() => setGenesisPass((p) => !p)}
                    style={pillBtn(genesisPass, true)}
                  >
                    Genesis Pass {genesisPass ? "ON" : "OFF"}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="fade-in" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "8px",
              }}
            >
              <div style={labelStyle}>Liberation Progress</div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accent,
                }}
              >
                {tracesCompleted.toLocaleString()} / {totalNeeded.toLocaleString()} {traceNameShort}
              </div>
            </div>
            <div
              style={{
                height: "12px",
                borderRadius: "6px",
                background: theme.timerBg,
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: theme.accent,
                  borderRadius: "6px",
                  transition: "width 0.35s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: theme.muted,
              }}
            >
              <span>Quest {questIdx + 1} of {quests.length}</span>
              <span>{progressPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Boss Selection */}
          <div className="fade-in" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ ...labelStyle, marginBottom: 0 }}>
                Boss Selection
              </div>

              <div style={{ marginLeft: "auto" }}>
                <div
                  className="lib-btn"
                  onClick={resetBosses}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#e05a5a",
                    background: "transparent",
                    border: "1px solid #e05a5a33",
                  }}
                >
                  Reset
                </div>
              </div>
            </div>

            <div
              className="lib-boss-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {bosses.map((boss) => {
                const sel = getSelection(selections, type, boss.name);
                const isActive = sel.difficultyIdx !== null;
                const activeDiff = isActive
                  ? boss.difficulties[sel.difficultyIdx!]
                  : null;
                const traces = activeDiff
                  ? getTracesPerClear(
                      activeDiff.traces,
                      sel.partySize,
                      genesisPass,
                      type,
                    )
                  : 0;

                return (
                  <div
                    key={boss.name}
                    style={{
                      background: theme.timerBg,
                      border: `1px solid ${isActive ? theme.accent + "55" : theme.border}`,
                      borderRadius: "14px",
                      padding: "1rem",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* Boss header with icon */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "0.6rem",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={boss.icon}
                        alt={boss.name}
                        width={38}
                        height={38}
                        style={{
                          borderRadius: "8px",
                          objectFit: "cover",
                          flexShrink: 0,
                          background: theme.panel,
                          border: `1px solid ${theme.border}`,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Fredoka One', cursive",
                            fontSize: "0.9rem",
                            color: theme.text,
                          }}
                        >
                          {boss.name}
                        </div>
                      </div>
                      {activeDiff && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            color: theme.accent,
                            padding: "2px 8px",
                            background: theme.accentSoft,
                            borderRadius: "6px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          +{traces} / {boss.reset === "monthly" ? "month" : "week"}
                        </div>
                      )}
                    </div>

                    {/* Difficulty pills */}
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        flexWrap: "wrap",
                        marginBottom: "0.6rem",
                      }}
                    >
                      {boss.difficulties.map((diff, di) => (
                        <div
                          key={diff.label}
                          className="lib-diff-btn"
                          onClick={() => setDifficulty(boss.name, sel.difficultyIdx === di ? null : di)}
                          style={pillBtn(sel.difficultyIdx === di)}
                        >
                          {diff.label} ({diff.traces})
                        </div>
                      ))}
                    </div>

                    {/* Party size + cleared (always visible, disabled when no difficulty) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                        opacity: isActive ? 1 : 0.4,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: theme.muted,
                          }}
                        >
                          Party
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={boss.maxParty}
                          value={sel.partySize}
                          disabled={!isActive}
                          onChange={(e) => {
                            let v = parseInt(e.target.value) || 1;
                            if (v < 1) v = 1;
                            if (v > boss.maxParty) v = boss.maxParty;
                            setPartySize(boss.name, v);
                          }}
                          style={{
                            ...inputStyle,
                            width: "48px",
                            textAlign: "center",
                            padding: "4px 6px",
                            fontSize: "0.78rem",
                            cursor: isActive ? "text" : "not-allowed",
                          }}
                        />
                      </div>

                      <div
                        className={isActive ? "lib-btn" : ""}
                        title="Click this if you have already cleared the boss for the week."
                        onClick={() => {
                          if (isActive) setCleared(boss.name, !sel.clearedThisWeek);
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          cursor: isActive ? "pointer" : "not-allowed",
                          color: sel.clearedThisWeek && isActive
                            ? theme.accentText
                            : theme.muted,
                          background: sel.clearedThisWeek && isActive
                            ? theme.accentSoft
                            : "transparent",
                          border: `1px solid ${sel.clearedThisWeek && isActive ? theme.accent + "44" : theme.border}`,
                        }}
                      >
                        {sel.clearedThisWeek && isActive ? "Cleared" : "Not cleared"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results */}
          <div
            className="fade-in"
            style={{
              ...sectionPanel,
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.15rem",
                color: theme.text,
                marginBottom: "1rem",
                paddingBottom: "0.8rem",
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              Estimated Completion
            </div>

            {/* ETA row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <div style={labelStyle}>Completion Date</div>
                <div
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.2rem",
                    color:
                      result.completionDate === "Never"
                        ? "#e05a5a"
                        : theme.accent,
                  }}
                >
                  {result.completionDate === "Never"
                    ? "Never"
                    : formatDate(result.completionDate)}
                </div>
              </div>
              <div>
                <div style={labelStyle}>Weeks Remaining</div>
                <div
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.2rem",
                    color:
                      result.weeksToComplete === Infinity
                        ? "#e05a5a"
                        : theme.accent,
                  }}
                >
                  {result.weeksToComplete === Infinity
                    ? "--"
                    : result.weeksToComplete}
                </div>
              </div>
              <div>
                <div style={labelStyle}>{traceNameShort} Remaining</div>
                <div
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.2rem",
                    color: theme.text,
                  }}
                >
                  {result.totalRemaining.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Weekly breakdown */}
            <div style={labelStyle}>
              Weekly {traceName} Breakdown
            </div>
            {result.breakdown.length === 0 ? (
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: theme.muted,
                  fontStyle: "italic",
                }}
              >
                Select bosses above to see your weekly {traceNameShort.toLowerCase()} income.
              </div>
            ) : (
              <>
                {result.breakdown.map((b) => (
                  <div
                    key={b.bossName}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "5px 0",
                      borderBottom: `1px solid ${theme.border}`,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: theme.text }}>
                      {b.bossName}
                      {b.reset === "monthly" && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: theme.muted,
                            marginLeft: "6px",
                          }}
                        >
                          (monthly)
                        </span>
                      )}
                    </span>
                    <span style={{ color: theme.accent, fontWeight: 800 }}>
                      +{b.traces}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "8px",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "0.9rem",
                      color: theme.text,
                    }}
                  >
                    Effective Weekly Total
                  </span>
                  <span
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "1rem",
                      color: theme.accent,
                    }}
                  >
                    ~{Math.floor(result.effectiveWeekly).toLocaleString()} {traceNameShort.toLowerCase()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Attribution notice for MapleWiki images */}
          <div
            style={{
              fontSize: "0.68rem",
              color: theme.muted,
              fontWeight: 600,
              lineHeight: 1.6,
              padding: "0 0.25rem",
            }}
          >
            Boss images sourced from{" "}
            <a
              href="https://maplestorywiki.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.accent, textDecoration: "none" }}
            >
              MapleStory Wiki
            </a>
            , licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.accent, textDecoration: "none" }}
            >
              CC BY-NC-SA 4.0
            </a>
            .
          </div>
        </div>
      </div>
    </>
  );
}
