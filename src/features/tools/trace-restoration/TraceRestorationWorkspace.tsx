"use client";

import { useState } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ItemIcon } from "../../../components/ResourceImage";
import { ToolHeader } from "../../../components/ToolHeader";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import { toolStyles } from "../tool-styles";
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import {
  PITCHED_WHISPER_BOSSES,
  PITCHED_TARGETS,
  DAWN_WHISPER_BOSSES,
  DAWN_TARGET_COST,
  PITCHED_CRYSTAL_ITEM_ID,
  DAWN_CRYSTAL_ITEM_ID,
  TRACE_ITEMS,
  TRACE_BOSSES,
  MAX_POINTS_CAP,
  ENDGAME_PRESET_MISSIONS,
  type WhisperBoss,
  type TraceBoss,
} from "./trace-restoration-data";

/* ------------------------------------------------------------------ */
/*  Indexes                                                            */
/* ------------------------------------------------------------------ */

const MISSION_INDEX = new Map<string, { boss: TraceBoss; exclusiveGroup?: string }>();
for (const boss of TRACE_BOSSES) {
  for (const m of boss.missions) {
    MISSION_INDEX.set(m.id, { boss, exclusiveGroup: m.exclusiveGroup });
  }
}

const TRACE_ITEMS_BY_ID = new Map(TRACE_ITEMS.map((item) => [item.id, item]));

const WEEKLY_TRACE_BOSSES = TRACE_BOSSES.filter((b) => b.frequency === "weekly");
const MONTHLY_TRACE_BOSSES = TRACE_BOSSES.filter((b) => b.frequency === "monthly");

/* ------------------------------------------------------------------ */
/*  Types & storage                                                    */
/* ------------------------------------------------------------------ */

type Tab = "research" | "restoration";

interface StarForceResearchStore {
  pitchedCount: number;
  pitchedBosses: string[];
  pitchedTarget: string;
  dawnCount: number;
  dawnBosses: string[];
}

interface TraceRestorationStore {
  currentPoints: number;
  targetItemId: string;
  selectedMissions: string[];
}

const STORAGE_KEY_RESEARCH = "traceRestorationResearch";
const STORAGE_KEY_RESTORATION = "traceRestorationSystem";

function readResearch(): StarForceResearchStore {
  const stored = readGlobalTool<StarForceResearchStore>(STORAGE_KEY_RESEARCH);
  if (stored && Array.isArray(stored.pitchedBosses)) return stored;
  return { pitchedCount: 0, pitchedBosses: [], pitchedTarget: "pitched-set", dawnCount: 0, dawnBosses: [] };
}

function readRestoration(): TraceRestorationStore {
  const stored = readGlobalTool<TraceRestorationStore>(STORAGE_KEY_RESTORATION);
  if (stored && Array.isArray(stored.selectedMissions)) return stored;
  return { currentPoints: 0, targetItemId: "arcane-umbra", selectedMissions: [] };
}

/* ------------------------------------------------------------------ */
/*  Calculation helpers                                                */
/* ------------------------------------------------------------------ */

function computeEstimate(
  current: number,
  target: number,
  weeklyGain: number,
  monthlyGain: number,
): { date: Date } | null {
  if (target <= current) return { date: new Date() };
  if (weeklyGain === 0 && monthlyGain === 0) return null;

  let accumulated = current;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Next weekly reset (Thursday)
  const nextThurs = new Date(now);
  nextThurs.setDate(nextThurs.getDate() + ((4 - nextThurs.getDay() + 7) % 7 || 7));

  // Next monthly reset (1st of next month)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const weekDate = new Date(nextThurs);
  const monthDate = new Date(nextMonth);

  for (let i = 0; i < 1000; i++) {
    const useWeekly = weeklyGain > 0 && (monthlyGain === 0 || weekDate <= monthDate);

    if (useWeekly) {
      accumulated += weeklyGain;
      if (accumulated >= target) return { date: new Date(weekDate) };
      weekDate.setDate(weekDate.getDate() + 7);
    } else {
      accumulated += monthlyGain;
      if (accumulated >= target) return { date: new Date(monthDate) };
      monthDate.setMonth(monthDate.getMonth() + 1);
    }
  }

  return null;
}

function computeWeeklyPointGain(selectedMissions: string[], bosses: TraceBoss[]): { weekly: number; monthly: number } {
  const selected = new Set(selectedMissions);
  let weekly = 0;
  let monthly = 0;
  for (const boss of bosses) {
    let bossTotal = 0;
    for (const mission of boss.missions) {
      if (selected.has(mission.id)) {
        bossTotal += mission.points;
      }
    }
    if (boss.frequency === "weekly") {
      weekly += bossTotal;
    } else {
      monthly += bossTotal;
    }
  }
  return { weekly, monthly };
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EstimateResult({
  theme,
  result,
  emptyMessage,
}: {
  theme: AppTheme;
  result: { date: Date } | null;
  emptyMessage: string;
}) {
  if (result) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.round((result.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return (
        <span style={{ fontWeight: 700, color: theme.accentText, fontSize: "0.85rem" }}>
          Target reached!
        </span>
      );
    }
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    let timeLabel: string;
    if (weeks > 0) {
      const weekStr = weeks === 1 ? "1 week" : `${weeks} weeks`;
      timeLabel = remainingDays > 0 ? `${weekStr}, ${remainingDays}d` : weekStr;
    } else {
      timeLabel = diffDays === 1 ? "1 day" : `${diffDays} days`;
    }
    return (
      <span style={{ fontSize: "0.85rem", color: theme.text }}>
        <span style={{ fontWeight: 700 }}>Expected: </span>
        {formatDateShort(result.date)} ({timeLabel})
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.85rem", color: theme.muted }}>
      {emptyMessage}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Star Force Research Tab                                            */
/* ------------------------------------------------------------------ */

function TrackerProgressBar({
  theme,
  label,
  current,
  total,
  remaining,
  progress,
}: {
  theme: AppTheme;
  label: string;
  current: string;
  total: string;
  remaining: string;
  progress: number;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
          {current} / {total}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
          {remaining} remaining
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${current} of ${total}`}
        style={{
          height: 8,
          background: theme.timerBg,
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            height: "100%",
            background: theme.accent,
            borderRadius: 4,
            transform: `scaleX(${progress})`,
            transformOrigin: "left",
            transition: "transform 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

function panelStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  };
}

const bossChipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  padding: "5px 10px",
  borderRadius: 8,
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  userSelect: "none",
};

const checkSlotStyle: CSSProperties = { visibility: "hidden" };

function bossChipStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    ...bossChipBase,
    color: active ? theme.accentText : theme.muted,
    background: active ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${active ? theme.accent : theme.border}`,
  };
}

const missionBtnBase: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: 34,
  padding: "5px 8px",
  border: "none",
  borderRadius: 6,
  fontSize: "0.75rem",
  cursor: "pointer",
  userSelect: "none",
};

function missionBtnStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    ...missionBtnBase,
    background: active ? theme.accentSoft : "transparent",
    color: active ? theme.accentText : theme.text,
    fontWeight: active ? 700 : 500,
  };
}

function presetBtnStyle(theme: AppTheme, primary: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 9,
    fontSize: "0.82rem",
    fontWeight: 800,
    cursor: "pointer",
    border: `1px solid ${primary ? theme.accent : theme.border}`,
    background: primary ? theme.accent : theme.timerBg,
    color: primary ? theme.accentOn : theme.text,
    boxShadow: primary ? `0 2px 6px ${theme.accent}44` : "none",
  };
}

function CrystalSection({
  theme,
  title,
  iconId,
  count,
  onCountChange,
  bosses,
  selectedBosses,
  onBossToggle,
  target,
  targetOptions,
  onTargetChange,
  targetCost,
}: {
  theme: AppTheme;
  title: string;
  iconId: string;
  count: number;
  onCountChange: (n: number) => void;
  bosses: WhisperBoss[];
  selectedBosses: string[];
  onBossToggle: (id: string) => void;
  target?: string;
  targetOptions?: { id: string; name: string; cost: number }[];
  onTargetChange?: (id: string) => void;
  targetCost: number;
}) {
  const styles = toolStyles(theme);

  const weeklyBosses = bosses.filter((b) => b.frequency === "weekly");
  const monthlyBosses = bosses.filter((b) => b.frequency === "monthly");
  const weeklyGain = weeklyBosses.filter((b) => selectedBosses.includes(b.id)).length;
  const monthlyGain = monthlyBosses.filter((b) => selectedBosses.includes(b.id)).length;
  const result = computeEstimate(count, targetCost, weeklyGain, monthlyGain);

  const remaining = Math.max(0, targetCost - count);
  const progress = targetCost > 0 ? Math.min(1, count / targetCost) : 0;

  return (
    <div style={panelStyle(theme)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
        <ItemIcon id={iconId} size={24} />
        <h2 style={{ margin: 0, fontWeight: 700, color: theme.text, fontSize: "1rem" }}>{title}</h2>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.25rem" }}>
        <div>
          <div className="tool-field-label" style={styles.labelStyle}>Current Count</div>
          <input
            className="tool-input"
            type="number"
            min={0}
            aria-label={`${title} current count`}
            value={count}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => onCountChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{ ...styles.inputStyle, width: 100 }}
          />
        </div>
        {targetOptions && target !== undefined && onTargetChange && (
          <div style={{ flex: "1 1 200px" }}>
            <div className="tool-field-label" style={styles.labelStyle}>Target</div>
            <select
              className="tool-select"
              aria-label={`${title} target`}
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              style={{ ...styles.selectStyle, width: "100%" }}
            >
              {targetOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.cost} crystals)
                </option>
              ))}
            </select>
          </div>
        )}
        {!targetOptions && (
          <div>
            <div className="tool-field-label" style={styles.labelStyle}>Target</div>
            <div className="tool-input" style={{ ...styles.inputStyle, background: "transparent", border: "none", padding: 0, fontWeight: 700 }}>
              Dawn Boss Set Equipment (65 crystals)
            </div>
          </div>
        )}
      </div>

      <TrackerProgressBar
        theme={theme}
        label={`${title} progress`}
        current={String(count)}
        total={String(targetCost)}
        remaining={String(remaining)}
        progress={progress}
      />

      {/* Boss selection */}
      {weeklyBosses.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div className="tool-field-label" style={styles.labelStyle}>Bosses Cleared Weekly</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {weeklyBosses.map((boss) => {
              const active = selectedBosses.includes(boss.id);
              return (
                <button
                  key={boss.id}
                  type="button"
                  className="tool-btn"
                  onClick={() => onBossToggle(boss.id)}
                  style={bossChipStyle(theme, active)}
                >
                  <span aria-hidden="true" style={active ? undefined : checkSlotStyle}>✓</span> {boss.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {monthlyBosses.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div className="tool-field-label" style={styles.labelStyle}>Bosses Cleared Monthly</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {monthlyBosses.map((boss) => {
              const active = selectedBosses.includes(boss.id);
              return (
                <button
                  key={boss.id}
                  type="button"
                  className="tool-btn"
                  onClick={() => onBossToggle(boss.id)}
                  style={bossChipStyle(theme, active)}
                >
                  <span aria-hidden="true" style={active ? undefined : checkSlotStyle}>✓</span> {boss.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expected date */}
      <div
        style={{
          background: theme.timerBg,
          borderRadius: 10,
          padding: "0.75rem 1rem",
        }}
      >
        <EstimateResult theme={theme} result={result} emptyMessage="Select bosses to estimate completion date" />
      </div>
    </div>
  );
}

function StarForceResearchTab({ theme }: { theme: AppTheme }) {
  const [state, setState] = useState<StarForceResearchStore>(readResearch);

  function save(next: StarForceResearchStore) {
    setState(next);
    writeGlobalTool(STORAGE_KEY_RESEARCH, next);
  }

  function toggleBoss(type: "pitched" | "dawn", id: string) {
    const current = type === "pitched" ? state.pitchedBosses : state.dawnBosses;
    const next = current.includes(id)
      ? current.filter((b) => b !== id)
      : [...current, id];

    if (type === "pitched") {
      save({ ...state, pitchedBosses: next });
    } else {
      save({ ...state, dawnBosses: next });
    }
  }

  const pitchedTarget = PITCHED_TARGETS.find((t) => t.id === state.pitchedTarget) ?? PITCHED_TARGETS[0];

  return (
    <>
      <CrystalSection
        theme={theme}
        title="Pitched Whisper Crystals"
        iconId={PITCHED_CRYSTAL_ITEM_ID}
        count={state.pitchedCount}
        onCountChange={(n) => save({ ...state, pitchedCount: n })}
        bosses={PITCHED_WHISPER_BOSSES}
        selectedBosses={state.pitchedBosses}
        onBossToggle={(id) => toggleBoss("pitched", id)}
        target={state.pitchedTarget}
        targetOptions={PITCHED_TARGETS}
        onTargetChange={(id) => save({ ...state, pitchedTarget: id })}
        targetCost={pitchedTarget.cost}
      />

      <CrystalSection
        theme={theme}
        title="Dawn Whisper Crystals"
        iconId={DAWN_CRYSTAL_ITEM_ID}
        count={state.dawnCount}
        onCountChange={(n) => save({ ...state, dawnCount: n })}
        bosses={DAWN_WHISPER_BOSSES}
        selectedBosses={state.dawnBosses}
        onBossToggle={(id) => toggleBoss("dawn", id)}
        targetCost={DAWN_TARGET_COST}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Trace Restoration Tab                                              */
/* ------------------------------------------------------------------ */

function BossMissionCard({
  theme,
  boss,
  selectedMissions,
  onToggleMission,
}: {
  theme: AppTheme;
  boss: TraceBoss;
  selectedMissions: string[];
  onToggleMission: (id: string) => void;
}) {
  const selected = boss.missions.filter((m) => selectedMissions.includes(m.id));
  const total = selected.reduce((sum, m) => sum + m.points, 0);

  return (
    <div
      style={{
        background: theme.timerBg,
        border: `1px solid ${total > 0 ? theme.accent + "55" : theme.border}`,
        borderRadius: 14,
        padding: "1rem",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
        <Image src={boss.icon} alt="" width={32} height={32} unoptimized className="pixelated-img" />
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, color: theme.text, fontSize: "0.85rem" }}>{boss.name}</h3>
          <div style={{ fontSize: "0.75rem", color: theme.muted }}>
            {total}/{boss.maxPoints} pts • {boss.frequency}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {boss.missions.map((mission) => {
          const active = selectedMissions.includes(mission.id);
          return (
            <button
              key={mission.id}
              type="button"
              className="tool-btn"
              onClick={() => onToggleMission(mission.id)}
              style={missionBtnStyle(theme, active)}
            >
              <span>
                <span aria-hidden="true" style={active ? undefined : checkSlotStyle}>✓</span> {mission.description}
              </span>
              <span style={{ fontWeight: 800, fontSize: "0.75rem", color: active ? theme.accentText : theme.muted }}>
                +{mission.points}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TraceRestorationTab({ theme }: { theme: AppTheme }) {
  const [state, setState] = useState<TraceRestorationStore>(readRestoration);
  const styles = toolStyles(theme);

  function save(next: TraceRestorationStore) {
    setState(next);
    writeGlobalTool(STORAGE_KEY_RESTORATION, next);
  }

  function toggleMission(id: string) {
    if (state.selectedMissions.includes(id)) {
      save({ ...state, selectedMissions: state.selectedMissions.filter((m) => m !== id) });
      return;
    }
    const entry = MISSION_INDEX.get(id);
    if (!entry) return;

    let next = state.selectedMissions;
    if (entry.exclusiveGroup) {
      const conflicting = new Set<string>();
      for (const m of entry.boss.missions) {
        if (m.exclusiveGroup === entry.exclusiveGroup && m.id !== id) conflicting.add(m.id);
      }
      next = next.filter((m) => !conflicting.has(m));
    }
    save({ ...state, selectedMissions: [...next, id] });
  }

  function applyEndgamePreset() {
    save({ ...state, selectedMissions: [...ENDGAME_PRESET_MISSIONS] });
  }

  function resetMissions() {
    save({ ...state, selectedMissions: [] });
  }

  const targetItem = TRACE_ITEMS_BY_ID.get(state.targetItemId) ?? TRACE_ITEMS[0];
  const { weekly, monthly } = computeWeeklyPointGain(state.selectedMissions, TRACE_BOSSES);
  const result = computeEstimate(state.currentPoints, targetItem.points, weekly, monthly);
  const remaining = Math.max(0, targetItem.points - state.currentPoints);
  const progress = targetItem.points > 0 ? Math.min(1, state.currentPoints / targetItem.points) : 0;

  return (
    <>
      <style>{`
        .trace-preset-btn { transition: transform 0.1s ease, filter 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .trace-preset-btn:hover { filter: brightness(1.08); transform: translateY(-1px); border-color: ${theme.accent}; }
        .trace-preset-btn:active { transform: translateY(0); }
      `}</style>

      {/* Target & progress */}
      <div style={panelStyle(theme)}>
        <h2 style={{ margin: 0, marginBottom: "1rem", fontWeight: 700, color: theme.text, fontSize: "1rem" }}>
          Restoration Target
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.25rem" }}>
          <div>
            <div className="tool-field-label" style={styles.labelStyle}>Current Points</div>
            <input
              className="tool-input"
              type="number"
              min={0}
              max={MAX_POINTS_CAP}
              aria-label="Current points"
              value={state.currentPoints}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={replaceZeroOnDigit}
              onChange={(e) => save({ ...state, currentPoints: Math.min(MAX_POINTS_CAP, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
              style={{ ...styles.inputStyle, width: 110 }}
            />
          </div>
          <div style={{ flex: "1 1 250px" }}>
            <div className="tool-field-label" style={styles.labelStyle}>Target Item</div>
            <select
              className="tool-select"
              aria-label="Target item"
              value={state.targetItemId}
              onChange={(e) => save({ ...state, targetItemId: e.target.value })}
              style={{ ...styles.selectStyle, width: "100%" }}
            >
              {TRACE_ITEMS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.points.toLocaleString()} pts)
                </option>
              ))}
            </select>
          </div>
        </div>

        <TrackerProgressBar
          theme={theme}
          label="Restoration progress"
          current={state.currentPoints.toLocaleString()}
          total={targetItem.points.toLocaleString()}
          remaining={remaining.toLocaleString()}
          progress={progress}
        />

        {/* Weekly point summary */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: "0.82rem", color: theme.text }}>
            <span style={{ fontWeight: 700 }}>Weekly gain: </span>{weekly} pts
          </div>
          <div style={{ fontSize: "0.82rem", color: theme.text }}>
            <span style={{ fontWeight: 700 }}>Monthly bonus: </span>{monthly} pts
          </div>
        </div>

        {/* Expected date */}
        <div
          style={{
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: "0.75rem 1rem",
          }}
        >
          <EstimateResult theme={theme} result={result} emptyMessage="Select missions to estimate completion date" />
        </div>
      </div>

      {/* Point cap note */}
      <div style={{ fontSize: "0.75rem", color: theme.muted, marginBottom: "1rem", fontStyle: "italic" }}>
        Max {MAX_POINTS_CAP.toLocaleString()} points can be accumulated. Missions must be completed solo (no Champion Mode).
      </div>

      {/* Preset / reset controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <button
          type="button"
          className="tool-btn trace-preset-btn"
          onClick={applyEndgamePreset}
          style={presetBtnStyle(theme, true)}
        >
          Endgame Preset
        </button>
        <button
          type="button"
          className="tool-btn trace-preset-btn"
          onClick={resetMissions}
          style={presetBtnStyle(theme, false)}
        >
          Reset
        </button>
      </div>

      {/* Boss mission cards */}
      <h2 style={{ margin: 0, marginBottom: "0.75rem", fontWeight: 700, color: theme.text, fontSize: "0.9rem" }}>
        Weekly Missions
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {WEEKLY_TRACE_BOSSES.map((boss) => (
          <BossMissionCard
            key={boss.id}
            theme={theme}
            boss={boss}
            selectedMissions={state.selectedMissions}
            onToggleMission={toggleMission}
          />
        ))}
      </div>

      <h2 style={{ margin: 0, marginBottom: "0.75rem", fontWeight: 700, color: theme.text, fontSize: "0.9rem" }}>
        Monthly Missions
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {MONTHLY_TRACE_BOSSES.map((boss) => (
          <BossMissionCard
            key={boss.id}
            theme={theme}
            boss={boss}
            selectedMissions={state.selectedMissions}
            onToggleMission={toggleMission}
          />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main workspace                                                     */
/* ------------------------------------------------------------------ */

const TAB_OPTIONS = ["research", "restoration"] as const;
const TAB_LABELS: Record<Tab, string> = {
  research: "Star Force Research",
  restoration: "Trace Restoration",
};

export default function TraceRestorationWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("research");
  const styles = toolStyles(theme);

  if (!mounted) return null;

  return (
    <div className="page-content">
      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Trace Restoration Tracker"
          description="Track your Star Force Research whisper crystals and Trace Restoration mission progress."
        />

        <SegmentedToggle
          theme={theme}
          options={TAB_OPTIONS}
          value={tab}
          labels={TAB_LABELS}
          ariaLabel="Tracker section"
          sectionPanel={styles.sectionPanel}
          onChange={setTab}
        />

        {tab === "research" && <StarForceResearchTab theme={theme} />}
        {tab === "restoration" && <TraceRestorationTab theme={theme} />}
      </div>
    </div>
  );
}
