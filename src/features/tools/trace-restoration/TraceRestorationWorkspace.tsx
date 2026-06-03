"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { ItemIcon } from "../../../components/ResourceImage";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
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
        <span style={{ fontWeight: 700, color: theme.accent, fontSize: "0.85rem" }}>
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
  current,
  total,
  remaining,
  progress,
}: {
  theme: AppTheme;
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
  padding: "5px 10px",
  borderRadius: 8,
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  userSelect: "none",
};

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
  padding: "5px 8px",
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
        <span style={{ fontWeight: 700, color: theme.text, fontSize: "1rem" }}>{title}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.25rem" }}>
        <div>
          <div style={styles.labelStyle}>Current Count</div>
          <input
            type="number"
            min={0}
            value={count}
            onChange={(e) => onCountChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{ ...styles.inputStyle, width: 100 }}
          />
        </div>
        {targetOptions && target !== undefined && onTargetChange && (
          <div style={{ flex: "1 1 200px" }}>
            <div style={styles.labelStyle}>Target</div>
            <select
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
            <div style={styles.labelStyle}>Target</div>
            <div style={{ ...styles.inputStyle, background: "transparent", border: "none", padding: 0, fontWeight: 700 }}>
              Dawn Boss Set Equipment (65 crystals)
            </div>
          </div>
        )}
      </div>

      <TrackerProgressBar
        theme={theme}
        current={String(count)}
        total={String(targetCost)}
        remaining={String(remaining)}
        progress={progress}
      />

      {/* Boss selection */}
      {weeklyBosses.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={styles.labelStyle}>Bosses Cleared Weekly</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {weeklyBosses.map((boss) => {
              const active = selectedBosses.includes(boss.id);
              return (
                <div
                  key={boss.id}
                  role="button"
                  tabIndex={0}
                  className="tool-btn"
                  onClick={() => onBossToggle(boss.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBossToggle(boss.id); } }}
                  style={bossChipStyle(theme, active)}
                >
                  {active ? "✓ " : ""}{boss.name}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {monthlyBosses.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={styles.labelStyle}>Bosses Cleared Monthly</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {monthlyBosses.map((boss) => {
              const active = selectedBosses.includes(boss.id);
              return (
                <div
                  key={boss.id}
                  role="button"
                  tabIndex={0}
                  className="tool-btn"
                  onClick={() => onBossToggle(boss.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBossToggle(boss.id); } }}
                  style={bossChipStyle(theme, active)}
                >
                  {active ? "✓ " : ""}{boss.name}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expected date */}
      <div
        style={{
          background: theme.timerBg,
          border: `1px solid ${theme.border}`,
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
          <div style={{ fontWeight: 700, color: theme.text, fontSize: "0.85rem" }}>{boss.name}</div>
          <div style={{ fontSize: "0.75rem", color: theme.muted }}>
            {total}/{boss.maxPoints} pts • {boss.frequency}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {boss.missions.map((mission) => {
          const active = selectedMissions.includes(mission.id);
          return (
            <div
              key={mission.id}
              role="button"
              tabIndex={0}
              className="tool-btn"
              onClick={() => onToggleMission(mission.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleMission(mission.id); } }}
              style={missionBtnStyle(theme, active)}
            >
              <span>{active ? "✓ " : ""}{mission.description}</span>
              <span style={{ fontWeight: 800, fontSize: "0.75rem", color: active ? theme.accent : theme.muted }}>
                +{mission.points}
              </span>
            </div>
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

  const targetItem = TRACE_ITEMS_BY_ID.get(state.targetItemId) ?? TRACE_ITEMS[0];
  const { weekly, monthly } = computeWeeklyPointGain(state.selectedMissions, TRACE_BOSSES);
  const result = computeEstimate(state.currentPoints, targetItem.points, weekly, monthly);
  const remaining = Math.max(0, targetItem.points - state.currentPoints);
  const progress = targetItem.points > 0 ? Math.min(1, state.currentPoints / targetItem.points) : 0;

  return (
    <>
      {/* Target & progress */}
      <div style={panelStyle(theme)}>
        <div style={{ fontWeight: 700, color: theme.text, marginBottom: "1rem", fontSize: "1rem" }}>
          Restoration Target
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end", marginBottom: "1.25rem" }}>
          <div>
            <div style={styles.labelStyle}>Current Points</div>
            <input
              type="number"
              min={0}
              max={MAX_POINTS_CAP}
              value={state.currentPoints}
              onChange={(e) => save({ ...state, currentPoints: Math.min(MAX_POINTS_CAP, Math.max(0, parseInt(e.target.value, 10) || 0)) })}
              style={{ ...styles.inputStyle, width: 110 }}
            />
          </div>
          <div style={{ flex: "1 1 250px" }}>
            <div style={styles.labelStyle}>Target Item</div>
            <select
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

      {/* Boss mission cards */}
      <div style={{ fontWeight: 700, color: theme.text, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
        Weekly Missions
      </div>
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

      <div style={{ fontWeight: 700, color: theme.text, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
        Monthly Missions
      </div>
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

const emptySubscribe = () => () => {};

export default function TraceRestorationWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [tab, setTab] = useState<Tab>("research");
  const styles = toolStyles(theme);

  if (!mounted) return null;

  return (
    <div
      className="tr-main"
      style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}
    >
      <style>{`
        @media (max-width: 860px) {
          .tr-main { padding: 1rem !important; }
        }
      `}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Trace Restoration Calculator"
          description="Track your Star Force Research whisper crystals and Trace Restoration mission progress."
        />

        <SegmentedToggle
          theme={theme}
          options={TAB_OPTIONS}
          value={tab}
          labels={TAB_LABELS}
          sectionPanel={styles.sectionPanel}
          onChange={setTab}
        />

        {tab === "research" && <StarForceResearchTab theme={theme} />}
        {tab === "restoration" && <TraceRestorationTab theme={theme} />}

        <WikiAttribution theme={theme} subject="Boss and item images" />
      </div>
    </div>
  );
}
