"use client";

import { useId, useState } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { AppTheme } from "../../../components/themes";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ProgressBar } from "../../../components/ProgressBar";
import { ToolHeader } from "../../../components/ToolHeader";
import { CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import {
  type LiberationType,
  type LiberationQuest,
  getTracesPerClear,
} from "./liberation-data";
import {
  useLiberationState,
  type CalcResult,
  getSelection,
  formatDate,
} from "./useLiberationState";
import { toolStyles } from "../tool-styles";
import { PanelDivider, Toggle } from "../shared-ui";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { BossCard } from "./BossCard";
import { ResultsPanel, type ResultRow } from "./ResultsPanel";
import { CLEARED_HINT } from "./copy";
import AstraSection from "./AstraSection";

type LiberationTab = LiberationType | "astra";

// -- Config Section -----------------------------------------------------------

function LiberationConfigSection({
  theme,
  sectionPanel,
  inputStyle,
  type,
  quests,
  questIdx,
  currentTraces,
  startDate,
  genesisPass,
  traceNameShort,
  onQuestIdxChange,
  onCurrentTracesChange,
  onStartDateChange,
  onGenesisPassToggle,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  inputStyle: React.CSSProperties;
  type: LiberationType;
  quests: LiberationQuest[];
  questIdx: number;
  currentTraces: number;
  startDate: string;
  genesisPass: boolean;
  traceNameShort: string;
  onQuestIdxChange: (v: number) => void;
  onCurrentTracesChange: (v: number) => void;
  onStartDateChange: (v: string) => void;
  onGenesisPassToggle: () => void;
}) {
  const uid = useId();
  const questId = `${uid}-quest`;
  const tracesId = `${uid}-traces`;
  const startId = `${uid}-start`;
  const fieldLabel: React.CSSProperties = { color: theme.muted };

  return (
    <section className="fade-in panel-card" style={sectionPanel}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Configuration</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: "1 1 220px" }}>
          <label className="tool-field-label" htmlFor={questId} style={fieldLabel}>Current Quest</label>
          <select
            id={questId}
            className="tool-select"
            value={questIdx}
            onChange={(e) => {
              onQuestIdxChange(Number(e.target.value));
              onCurrentTracesChange(0);
            }}
            style={{
              ...inputStyle,
              width: "100%",
            }}
          >
            {quests.map((q, i) => (
              <option key={q.label} value={i}>
                {i + 1}. {q.label} ({q.required.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 140px" }}>
          <label className="tool-field-label" htmlFor={tracesId} style={fieldLabel}>Current {traceNameShort}</label>
          <input
            id={tracesId}
            className="tool-input"
            type="number"
            min={0}
            max={quests[questIdx]?.required ?? 9999}
            value={currentTraces}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 0;
              if (v < 0) v = 0;
              const max = quests[questIdx]?.required ?? 9999;
              if (v > max) v = max;
              onCurrentTracesChange(v);
            }}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <label className="tool-field-label" htmlFor={startId} style={fieldLabel}>Start Date (UTC)</label>
          <input
            id={startId}
            className="tool-input"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        {type === "genesis" && (
          <div style={{ flex: "0 0 auto", alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
            {/* Phantom label matching the other columns so the toggle below
                stretches to exactly the input height */}
            <div aria-hidden style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px" }}>
              {"\u00A0"}
            </div>
            <Toggle
              theme={theme}
              label="Genesis Pass"
              checked={genesisPass}
              onChange={onGenesisPassToggle}
              style={{ width: 150, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap" }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// -- Progress Bar -------------------------------------------------------------

function LiberationProgressBar({
  theme,
  tracesCompleted,
  totalNeeded,
  traceNameShort,
  questIdx,
  totalQuests,
  progressPct,
}: {
  theme: AppTheme;
  tracesCompleted: number;
  totalNeeded: number;
  traceNameShort: string;
  questIdx: number;
  totalQuests: number;
  progressPct: number;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "8px",
        }}
      >
        <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>Liberation Progress</h2>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            color: theme.accentText,
          }}
        >
          {tracesCompleted.toLocaleString()} / {totalNeeded.toLocaleString()} {traceNameShort}
        </div>
      </div>
      <ProgressBar pct={progressPct} theme={theme} label={`Liberation progress, ${traceNameShort.toLowerCase()}`} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "6px",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: theme.muted,
        }}
      >
        <span>Quest {questIdx + 1} of {totalQuests}</span>
        <span>{progressPct.toFixed(1)}%</span>
      </div>
    </>
  );
}

// -- Results Section ----------------------------------------------------------

function LiberationResultsSection({
  theme,
  sectionPanel,
  result,
  traceName,
  traceNameShort,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  result: CalcResult;
  traceName: string;
  traceNameShort: string;
}) {
  const never = result.completionDate === "Never";
  const milestones: ResultRow[] = result.milestones.map((m, i) => ({
    key: String(m.questIdx),
    label: m.questLabel,
    note: i === result.milestones.length - 1 ? "liberation" : "bar full",
    value: formatDate(m.completionDate),
    valueNote: `(${m.weeksFromStart}w)`,
  }));
  const breakdown: ResultRow[] = result.breakdown.map((b) => ({
    key: b.bossName,
    label: b.bossName,
    note: b.reset === "monthly" ? "monthly" : undefined,
    value: `+${b.traces}`,
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
        { label: `${traceNameShort} Remaining`, value: result.totalRemaining.toLocaleString() },
      ]}
      milestonesTitle="Milestones"
      milestones={milestones}
      breakdownTitle={`Weekly ${traceName} Breakdown`}
      breakdown={breakdown}
      breakdownEmpty={`Select bosses above to see your weekly ${traceNameShort.toLowerCase()} income.`}
      totals={[
        {
          label: "Effective Weekly Total",
          value: `~${Math.floor(result.effectiveWeekly).toLocaleString()} ${traceNameShort.toLowerCase()}`,
        },
      ]}
    />
  );
}

// -- Main Component -----------------------------------------------------------

export default function LiberationWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const liberation = useLiberationState();
  const {
    characters, selectedCharName, handleCharChange,
    type, questIdx, currentTraces, genesisPass, startDate, selections,
    setQuestIdx, setCurrentTraces, setGenesisPass, setStartDate,
    setDifficulty, setPartySize, setCleared, resetBosses, switchType,
    bosses, quests, totalNeeded, result, tracesCompleted, progressPct,
  } = liberation;

  // `type` is the source of truth for the non-Astra tabs and is restored from a
  // character's saved data on selection; derive activeTab from it so the tab can
  // never desync from the data. Astra has no `type`, so it gets its own flag.
  const [showAstra, setShowAstra] = useState(false);
  const activeTab: LiberationTab = showAstra ? "astra" : type;

  const handleTabChange = (tab: LiberationTab) => {
    if (tab === "astra") {
      setShowAstra(true);
      return;
    }
    setShowAstra(false);
    if (type !== tab) switchType(tab);
  };

  const styles = toolStyles(theme);
  const { inputStyle, sectionPanel } = styles;

  const traceName = type === "genesis" ? "Traces of Darkness" : "Determination";
  const traceNameShort = type === "genesis" ? "Traces" : "Determination";

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @media (max-width: 860px) {
          .segmented-toggle-track { flex-wrap: wrap; }
        }
      `}</style>

      <div className="page-content">
        <div className="tool-container">
          <ToolHeader
            theme={theme}
            title="Liberation Tracker"
            description="Track your Genesis, Destiny, or Astra Secondary progress and view estimated completion dates."
          />

          <div className="fade-in" style={{ marginBottom: "1.25rem" }}>
            <SegmentedToggle
              theme={theme}
              options={["genesis", "destiny", "destiny2", "astra"] as const}
              value={activeTab}
              labels={{
                genesis: "Genesis",
                destiny: "Destiny Pt. 1",
                destiny2: "Destiny Pt. 2",
                astra: "Astra Secondary",
              }}
              ariaLabel="Liberation track"
              btnClassName="tool-btn"
              onChange={handleTabChange}
            />
          </div>

          {showAstra ? (
            <AstraSection theme={theme} />
          ) : (
          <>

          {/* Character + liberation progress share one panel to keep the page
              header area short. */}
          <div className="fade-in panel-card" style={sectionPanel}>
            <CharacterSyncPanel
              theme={theme}
              characters={characters}
              selectedCharName={selectedCharName}
              onCharChange={handleCharChange}
              inputStyle={inputStyle}
            />
            <PanelDivider theme={theme} />
            <LiberationProgressBar
              theme={theme}
              tracesCompleted={tracesCompleted}
              totalNeeded={totalNeeded}
              traceNameShort={traceNameShort}
              questIdx={questIdx}
              totalQuests={quests.length}
              progressPct={progressPct}
            />
          </div>

          <LiberationConfigSection
            theme={theme}
            sectionPanel={sectionPanel}
            inputStyle={inputStyle}
            type={type}
            quests={quests}
            questIdx={questIdx}
            currentTraces={currentTraces}
            startDate={startDate}
            genesisPass={genesisPass}
            traceNameShort={traceNameShort}
            onQuestIdxChange={setQuestIdx}
            onCurrentTracesChange={setCurrentTraces}
            onStartDateChange={setStartDate}
            onGenesisPassToggle={() => setGenesisPass((p) => !p)}
          />

          <section className="fade-in panel-card" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
                Boss Selection
              </h2>

              <div style={{ marginLeft: "auto" }}>
                <ConfirmButton
                  theme={theme}
                  label="Reset"
                  title="Reset boss selection?"
                  message="This clears the bosses and difficulties you've selected for this tab. Your quest progress and current traces stay."
                  onConfirm={resetBosses}
                />
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, margin: "0 0 1rem", lineHeight: 1.4 }}>
              {CLEARED_HINT}
            </p>

            <div className="tool-card-grid">
              {bosses.map((boss) => {
                const sel = getSelection(selections, type, boss.name);
                const activeDiff = sel.difficultyIdx !== null ? boss.difficulties[sel.difficultyIdx] : null;
                const traces = activeDiff
                  ? getTracesPerClear(activeDiff.traces, sel.partySize, genesisPass, type)
                  : 0;

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
                    resetLabel={boss.reset === "monthly" ? "month" : "week"}
                    theme={theme}
                    inputStyle={inputStyle}
                    onDifficultyChange={(diffIdx) => setDifficulty(boss.name, diffIdx)}
                    onPartySizeChange={(size) => setPartySize(boss.name, size)}
                    onClearedChange={(cleared) => setCleared(boss.name, cleared)}
                  />
                );
              })}
            </div>
          </section>

          <LiberationResultsSection
            theme={theme}
            sectionPanel={sectionPanel}
            result={result}
            traceName={traceName}
            traceNameShort={traceNameShort}
          />
          </>
          )}
        </div>
      </div>
    </>
  );
}
