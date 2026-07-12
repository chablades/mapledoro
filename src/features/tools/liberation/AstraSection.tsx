"use client";

import { useId } from "react";
import type { AppTheme } from "../../../components/themes";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ProgressBar } from "../../../components/ProgressBar";
import { CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import {
  type AstraBoss,
  ASTRA_BOSSES,
  ASTRA_MISSIONS,
  ASTRA_DAILY_QUESTS,
  ASTRA_TOTAL_TRACES,
  ASTRA_TOTAL_FRAGMENTS,
  MAX_TRACES_CAPACITY,
} from "./astra-data";
import {
  useAstraState,
  type AstraCalcResult,
  getAstraSelection,
  formatDate,
} from "./useAstraState";
import { toolStyles } from "../tool-styles";
import { PanelDivider } from "../shared-ui";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { BossCard } from "./BossCard";
import { ResultsPanel, type ResultRow } from "./ResultsPanel";
import { CLEARED_HINT } from "./copy";

// -- Voucher Input ------------------------------------------------------------

function VoucherInput({
  activeDiff,
  vouchersKept,
  isActive,
  theme,
  inputStyle,
  onVouchersKeptChange,
}: {
  activeDiff: AstraBoss["difficulties"][number];
  vouchersKept: number;
  isActive: boolean;
  theme: AppTheme;
  inputStyle: React.CSSProperties;
  onVouchersKeptChange: (count: number) => void;
}) {
  const uid = useId();
  const maxV = activeDiff.voucherCount ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <label htmlFor={uid} style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>Vouchers</label>
      <input
        id={uid}
        type="number"
        min={0}
        max={maxV}
        value={vouchersKept}
        disabled={!isActive}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={replaceZeroOnDigit}
        onChange={(e) => {
          let v = parseInt(e.target.value) || 0;
          if (v < 0) v = 0;
          if (v > maxV) v = maxV;
          onVouchersKeptChange(v);
        }}
        className="tool-input"
        style={{ ...inputStyle, width: "48px", textAlign: "center", padding: "4px 6px", fontSize: "0.75rem", cursor: isActive ? "text" : "not-allowed" }}
      />
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
        / {activeDiff.voucherCount} ({activeDiff.voucherValue} frags ea.)
      </span>
    </div>
  );
}

// -- Config Section -----------------------------------------------------------

function AstraConfigSection({
  theme,
  sectionPanel,
  inputStyle,
  missionIdx,
  currentTraces,
  currentFragments,
  startDate,
  onMissionIdxChange,
  onCurrentTracesChange,
  onCurrentFragmentsChange,
  onStartDateChange,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  inputStyle: React.CSSProperties;
  missionIdx: number;
  currentTraces: number;
  currentFragments: number;
  startDate: string;
  onMissionIdxChange: (v: number) => void;
  onCurrentTracesChange: (v: number) => void;
  onCurrentFragmentsChange: (v: number) => void;
  onStartDateChange: (v: string) => void;
}) {
  const uid = useId();
  const fieldLabel: React.CSSProperties = { color: theme.muted };

  return (
    <section className="fade-in panel-card" style={sectionPanel}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Configuration</h2>
      <div className="tool-control-row">
        <div style={{ flex: "1 1 180px" }}>
          <label className="tool-field-label" htmlFor={`${uid}-mission`} style={fieldLabel}>Current Mission</label>
          <select
            id={`${uid}-mission`}
            className="tool-select"
            value={missionIdx}
            onChange={(e) => {
              onMissionIdxChange(Number(e.target.value));
              onCurrentTracesChange(0);
              onCurrentFragmentsChange(0);
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {ASTRA_MISSIONS.map((m, i) => (
              <option key={m.label} value={i}>
                {m.label} ({m.tracesRequired} traces / {m.fragmentsRequired.toLocaleString()} frags)
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 130px" }}>
          <label className="tool-field-label" htmlFor={`${uid}-traces`} style={fieldLabel}>Current Traces</label>
          <input
            id={`${uid}-traces`}
            className="tool-input"
            type="number"
            min={0}
            max={MAX_TRACES_CAPACITY}
            value={currentTraces}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 0;
              if (v < 0) v = 0;
              if (v > MAX_TRACES_CAPACITY) v = MAX_TRACES_CAPACITY;
              onCurrentTracesChange(v);
            }}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <div style={{ flex: "0 1 165px" }}>
          <label className="tool-field-label" htmlFor={`${uid}-frags`} style={fieldLabel}>Current Fragments</label>
          <input
            id={`${uid}-frags`}
            className="tool-input"
            type="number"
            min={0}
            value={currentFragments}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 0;
              if (v < 0) v = 0;
              onCurrentFragmentsChange(v);
            }}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <label className="tool-field-label" htmlFor={`${uid}-start`} style={fieldLabel}>Start Date (UTC)</label>
          <input
            id={`${uid}-start`}
            className="tool-input"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
      </div>
    </section>
  );
}

// -- Daily Quests Section -----------------------------------------------------

function AstraDailyQuestSection({
  theme,
  sectionPanel,
  inputStyle,
  dailyQuestId,
  daysPerWeek,
  futureQuestDate,
  futureQuestId,
  onDailyQuestIdChange,
  onDaysPerWeekChange,
  onFutureQuestDateChange,
  onFutureQuestIdChange,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  inputStyle: React.CSSProperties;
  dailyQuestId: string;
  daysPerWeek: number;
  futureQuestDate: string;
  futureQuestId: string;
  onDailyQuestIdChange: (v: string) => void;
  onDaysPerWeekChange: (v: number) => void;
  onFutureQuestDateChange: (v: string) => void;
  onFutureQuestIdChange: (v: string) => void;
}) {
  const uid = useId();
  const fieldLabel: React.CSSProperties = { color: theme.muted };

  return (
    <section className="fade-in panel-card" style={sectionPanel}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Daily Quests (Erion&apos;s Fragments)</h2>
      <div className="tool-control-row">
        <div style={{ flex: "1 1 250px" }}>
          <label className="tool-field-label" htmlFor={`${uid}-quest`} style={fieldLabel}>Highest Daily Quest</label>
          <select
            id={`${uid}-quest`}
            className="tool-select"
            value={dailyQuestId}
            onChange={(e) => onDailyQuestIdChange(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            {ASTRA_DAILY_QUESTS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label} ({q.fragments} frags / day)
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 100px" }}>
          <label className="tool-field-label" htmlFor={`${uid}-days`} style={fieldLabel}>Days / Week</label>
          <input
            id={`${uid}-days`}
            className="tool-input"
            type="number"
            min={0}
            max={7}
            value={daysPerWeek}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 0;
              if (v < 0) v = 0;
              if (v > 7) v = 7;
              onDaysPerWeekChange(v);
            }}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
      </div>

      <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: `1px solid ${theme.border}` }}>
        <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted, margin: "0 0 6px" }}>
          Future Quest Upgrade (optional)
        </h3>
        <div className="tool-control-row">
          <div style={{ flex: "0 1 160px" }}>
            <label className="tool-field-label" htmlFor={`${uid}-upgrade-date`} style={fieldLabel}>Upgrade Date</label>
            <input
              id={`${uid}-upgrade-date`}
              className="tool-input"
              type="date"
              value={futureQuestDate}
              onChange={(e) => onFutureQuestDateChange(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <div style={{ flex: "1 1 250px" }}>
            <label className="tool-field-label" htmlFor={`${uid}-new-quest`} style={fieldLabel}>New Quest</label>
            <select
              id={`${uid}-new-quest`}
              className="tool-select"
              value={futureQuestId}
              onChange={(e) => onFutureQuestIdChange(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            >
              <option value="">(none)</option>
              {ASTRA_DAILY_QUESTS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label} ({q.fragments} frags / day)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

// -- Progress -----------------------------------------------------------------

function AstraProgressSection({
  theme,
  tracesCompleted,
  fragmentsCompleted,
  missionIdx,
}: {
  theme: AppTheme;
  tracesCompleted: number;
  fragmentsCompleted: number;
  missionIdx: number;
}) {
  const tracesPct = Math.min(100, (tracesCompleted / ASTRA_TOTAL_TRACES) * 100);
  const fragsPct = Math.min(100, (fragmentsCompleted / ASTRA_TOTAL_FRAGMENTS) * 100);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>Traces Progress</h2>
        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.accentText }}>
          {tracesCompleted.toLocaleString()} / {ASTRA_TOTAL_TRACES.toLocaleString()}
        </div>
      </div>
      <ProgressBar pct={tracesPct} theme={theme} label="Astra fierce battle traces progress" />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
        <span>Mission {missionIdx + 1} of {ASTRA_MISSIONS.length}</span>
        <span>{tracesPct.toFixed(1)}%</span>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>Fragments Progress</h2>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.accentText }}>
            {fragmentsCompleted.toLocaleString()} / {ASTRA_TOTAL_FRAGMENTS.toLocaleString()}
          </div>
        </div>
        <ProgressBar pct={fragsPct} theme={theme} label="Astra Erion's fragments progress" />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
          <span>{fragsPct.toFixed(1)}%</span>
        </div>
      </div>
    </>
  );
}

// -- Results ------------------------------------------------------------------

function AstraResultsSection({
  theme,
  sectionPanel,
  result,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  result: AstraCalcResult;
}) {
  const never = result.completionDate === "Never";
  const milestones: ResultRow[] = result.missionResults.map((m) => ({
    key: m.mission.label,
    label: m.mission.label,
    value: formatDate(m.completionDate),
    valueNote: `(${m.weeksFromStart}w)`,
  }));
  const breakdown: ResultRow[] = result.breakdown
    .filter((b) => b.tracesPerWeek > 0 || b.voucherFragmentsPerWeek > 0)
    .map((b) => ({
      key: b.bossName,
      label: b.bossName,
      value: `+${b.tracesPerWeek} traces`,
      valueNote: b.voucherFragmentsPerWeek > 0 ? `+${b.voucherFragmentsPerWeek} frags` : undefined,
    }));

  return (
    <ResultsPanel
      theme={theme}
      sectionPanel={sectionPanel}
      metrics={[
        { label: "Completion Date", value: never ? "Never" : formatDate(result.completionDate), danger: never },
        {
          label: "Weeks Remaining",
          value: result.weeksToComplete === Infinity ? "--" : String(result.weeksToComplete),
          danger: result.weeksToComplete === Infinity,
        },
        { label: "Traces Remaining", value: result.totalTracesNeeded.toLocaleString() },
        { label: "Fragments Remaining", value: result.totalFragmentsNeeded.toLocaleString() },
      ]}
      milestonesTitle="Mission Milestones"
      milestones={milestones}
      breakdownTitle="Weekly Income Breakdown"
      breakdown={breakdown}
      breakdownEmpty="Select bosses above to see your weekly income."
      totals={[
        { label: "Weekly Traces", value: result.weeklyTraces.toLocaleString() },
        { label: "Weekly Fragments (vouchers)", value: result.weeklyVoucherFragments.toLocaleString() },
        { label: "Weekly Fragments (dailies)", value: result.weeklyDailyFragments.toLocaleString() },
      ]}
    />
  );
}


// -- Main Component -----------------------------------------------------------

export default function AstraSection({ theme }: { theme: AppTheme }) {
  const state = useAstraState();
  const styles = toolStyles(theme);
  const { inputStyle, sectionPanel } = styles;

  if (!state.mounted) return null;

  return (
    <>
      {/* Character + mission progress share one panel to keep the page header
          area short. */}
      <div className="fade-in panel-card" style={sectionPanel}>
        <CharacterSyncPanel
          theme={theme}
          characters={state.characters}
          selectedCharName={state.selectedCharName}
          onCharChange={state.handleCharChange}
          inputStyle={inputStyle}
        />
        <PanelDivider theme={theme} />
        <AstraProgressSection
          theme={theme}
          tracesCompleted={state.tracesCompleted}
          fragmentsCompleted={state.fragmentsCompleted}
          missionIdx={state.missionIdx}
        />
      </div>

      <AstraConfigSection
        theme={theme}
        sectionPanel={sectionPanel}
        inputStyle={inputStyle}
        missionIdx={state.missionIdx}
        currentTraces={state.currentTraces}
        currentFragments={state.currentFragments}
        startDate={state.startDate}
        onMissionIdxChange={state.setMissionIdx}
        onCurrentTracesChange={state.setCurrentTraces}
        onCurrentFragmentsChange={state.setCurrentFragments}
        onStartDateChange={state.setStartDate}
      />

      <AstraDailyQuestSection
        theme={theme}
        sectionPanel={sectionPanel}
        inputStyle={inputStyle}
        dailyQuestId={state.dailyQuestId}
        daysPerWeek={state.daysPerWeek}
        futureQuestDate={state.futureQuestDate}
        futureQuestId={state.futureQuestId}
        onDailyQuestIdChange={state.setDailyQuestId}
        onDaysPerWeekChange={state.setDaysPerWeek}
        onFutureQuestDateChange={state.setFutureQuestDate}
        onFutureQuestIdChange={state.setFutureQuestId}
      />

      <section className="fade-in panel-card" style={sectionPanel}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
          <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
            Boss Selection
          </h2>
          <div style={{ marginLeft: "auto" }}>
            <ConfirmButton
              theme={theme}
              label="Reset"
              title="Reset boss selection?"
              message="This clears the Astra bosses and difficulties you've selected. Your mission progress and current totals stay."
              onConfirm={state.resetBosses}
            />
          </div>
        </div>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, margin: "0 0 1rem", lineHeight: 1.4 }}>
          {CLEARED_HINT} A ★ marks a difficulty that also drops boss vouchers.
        </p>

        <div className="tool-card-grid">
          {ASTRA_BOSSES.map((boss) => {
            const sel = getAstraSelection(state.selections, boss.name);
            const activeDiff = sel.difficultyIdx !== null ? boss.difficulties[sel.difficultyIdx] : null;
            const traces = activeDiff ? Math.floor(activeDiff.traces / sel.partySize) : 0;
            return (
              <BossCard
                key={boss.name}
                name={boss.name}
                icon={boss.icon}
                difficulties={boss.difficulties}
                maxParty={boss.maxParty}
                difficultyIdx={sel.difficultyIdx}
                partySize={sel.partySize}
                clearedThisWeek={sel.clearedThisWeek}
                traces={traces}
                resetLabel="week"
                theme={theme}
                inputStyle={inputStyle}
                onDifficultyChange={(diffIdx) => state.setDifficulty(boss.name, diffIdx)}
                onPartySizeChange={(size) => state.setPartySize(boss.name, size)}
                onClearedChange={(cleared) => state.setCleared(boss.name, cleared)}
              >
                {activeDiff?.hasVoucher && (
                  <VoucherInput
                    activeDiff={activeDiff}
                    vouchersKept={sel.vouchersKept}
                    isActive
                    theme={theme}
                    inputStyle={inputStyle}
                    onVouchersKeptChange={(count) => state.setVouchersKept(boss.name, count)}
                  />
                )}
              </BossCard>
            );
          })}
        </div>
      </section>

      <AstraResultsSection
        theme={theme}
        sectionPanel={sectionPanel}
        result={state.result}
      />
    </>
  );
}
