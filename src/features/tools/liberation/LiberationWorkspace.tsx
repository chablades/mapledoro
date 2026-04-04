"use client";

import type { AppTheme } from "../../../components/themes";
import { ProgressBar } from "../../../components/ProgressBar";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import { CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import {
  type LiberationType,
  type LiberationBoss,
  type LiberationQuest,
  getTracesPerClear,
} from "./liberation-data";
import {
  useLiberationState,
  type BossSelection,
  type CalcResult,
  getSelection,
  formatDate,
} from "./useLiberationState";

// -- Boss Card ----------------------------------------------------------------

function BossCard({
  boss,
  sel,
  isActive,
  activeDiff,
  traces,
  theme,
  inputStyle,
  pillBtn,
  onDifficultyChange,
  onPartySizeChange,
  onClearedChange,
}: {
  boss: LiberationBoss;
  sel: BossSelection;
  isActive: boolean;
  activeDiff: LiberationBoss["difficulties"][number] | null;
  traces: number;
  theme: AppTheme;
  inputStyle: React.CSSProperties;
  pillBtn: (active: boolean) => React.CSSProperties;
  onDifficultyChange: (diffIdx: number | null) => void;
  onPartySizeChange: (size: number) => void;
  onClearedChange: (cleared: boolean) => void;
}) {
  return (
    <div
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
              fontFamily: "var(--font-heading)",
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
            className="lib-diff-btn pill-btn"
            onClick={() => onDifficultyChange(sel.difficultyIdx === di ? null : di)}
            style={pillBtn(sel.difficultyIdx === di)}
          >
            {diff.label} ({diff.traces})
          </div>
        ))}
      </div>

      {/* Party size + cleared */}
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
              onPartySizeChange(v);
            }}
            className="tool-input"
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
            if (isActive) onClearedChange(!sel.clearedThisWeek);
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
}

// -- Config Section -----------------------------------------------------------

function LiberationConfigSection({
  theme,
  sectionPanel,
  inputStyle,
  pillBtn,
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
  pillBtn: (active: boolean, accent?: boolean) => React.CSSProperties;
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
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div className="section-label" style={{ color: theme.muted }}>Configuration</div>
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
            className="tool-input"
            value={questIdx}
            onChange={(e) => {
              onQuestIdxChange(Number(e.target.value));
              onCurrentTracesChange(0);
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
            className="tool-input"
            type="number"
            min={0}
            max={quests[questIdx]?.required ?? 9999}
            value={currentTraces}
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
            className="tool-input"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        {/* Genesis Pass */}
        {type === "genesis" && (
          <div style={{ flex: "0 0 auto" }}>
            <div
              className="lib-btn pill-btn"
              onClick={onGenesisPassToggle}
              style={pillBtn(genesisPass, true)}
            >
              Genesis Pass {genesisPass ? "ON" : "OFF"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Progress Bar -------------------------------------------------------------

function LiberationProgressBar({
  theme,
  sectionPanel,
  tracesCompleted,
  totalNeeded,
  traceNameShort,
  questIdx,
  totalQuests,
  progressPct,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  tracesCompleted: number;
  totalNeeded: number;
  traceNameShort: string;
  questIdx: number;
  totalQuests: number;
  progressPct: number;
}) {
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "8px",
        }}
      >
        <div className="section-label" style={{ color: theme.muted }}>Liberation Progress</div>
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
      <ProgressBar pct={progressPct} theme={theme} />
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
        <span>Quest {questIdx + 1} of {totalQuests}</span>
        <span>{progressPct.toFixed(1)}%</span>
      </div>
    </div>
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
  return (
    <div
      className="fade-in"
      style={{
        ...sectionPanel,
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
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
          <div className="section-label" style={{ color: theme.muted }}>Completion Date</div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
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
          <div className="section-label" style={{ color: theme.muted }}>Weeks Remaining</div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
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
          <div className="section-label" style={{ color: theme.muted }}>{traceNameShort} Remaining</div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.2rem",
              color: theme.text,
            }}
          >
            {result.totalRemaining.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Weekly breakdown */}
      <div className="section-label" style={{ color: theme.muted }}>
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
                fontFamily: "var(--font-heading)",
                fontSize: "0.9rem",
                color: theme.text,
              }}
            >
              Effective Weekly Total
            </span>
            <span
              style={{
                fontFamily: "var(--font-heading)",
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
  );
}

// -- Main Component -----------------------------------------------------------

export default function LiberationWorkspace({ theme }: { theme: AppTheme }) {
  const {
    characters, selectedCharName, handleCharChange,
    type, questIdx, currentTraces, genesisPass, startDate, selections,
    setQuestIdx, setCurrentTraces, setGenesisPass, setStartDate,
    setDifficulty, setPartySize, setCleared, resetBosses, switchType,
    bosses, quests, totalNeeded, result, tracesCompleted, progressPct,
  } = useLiberationState();

  // Styles
  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    padding: "6px 10px",
    color: theme.text,
    fontSize: "0.82rem",
  };

  const pillBtn = (
    active: boolean,
    accent?: boolean,
  ): React.CSSProperties => {
    let color: string;
    let background: string;
    if (active) {
      color = accent ? "#fff" : theme.accentText;
      background = accent ? theme.accent : theme.accentSoft;
    } else {
      color = theme.muted;
      background = "transparent";
    }
    return { color, background, border: active ? "none" : `1px solid ${theme.border}` };
  };

  const sectionPanel: React.CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
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
          <ToolHeader
            theme={theme}
            title="Liberation Tracker"
            description="Estimate your Genesis or Destiny liberation completion date."
          />

          <CharacterSyncPanel
            theme={theme}
            characters={characters}
            selectedCharName={selectedCharName}
            onCharChange={handleCharChange}
            inputStyle={inputStyle}
            sectionPanel={sectionPanel}
          />

          <SegmentedToggle
            theme={theme}
            options={["genesis", "destiny"] as const}
            value={type}
            labels={{ genesis: "Genesis Liberation", destiny: "Destiny Liberation" }}
            sectionPanel={sectionPanel}
            btnClassName="lib-btn"
            onChange={switchType}
          />

          <LiberationConfigSection
            theme={theme}
            sectionPanel={sectionPanel}
            inputStyle={inputStyle}
            pillBtn={pillBtn}
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

          <LiberationProgressBar
            theme={theme}
            sectionPanel={sectionPanel}
            tracesCompleted={tracesCompleted}
            totalNeeded={totalNeeded}
            traceNameShort={traceNameShort}
            questIdx={questIdx}
            totalQuests={quests.length}
            progressPct={progressPct}
          />

          {/* Boss Selection */}
          <div className="fade-in panel-card" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
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
                  <BossCard
                    key={boss.name}
                    boss={boss}
                    sel={sel}
                    isActive={isActive}
                    activeDiff={activeDiff}
                    traces={traces}
                    theme={theme}
                    inputStyle={inputStyle}
                    pillBtn={pillBtn}
                    onDifficultyChange={(diffIdx) => setDifficulty(boss.name, diffIdx)}
                    onPartySizeChange={(size) => setPartySize(boss.name, size)}
                    onClearedChange={(cleared) => setCleared(boss.name, cleared)}
                  />
                );
              })}
            </div>
          </div>

          <LiberationResultsSection
            theme={theme}
            sectionPanel={sectionPanel}
            result={result}
            traceName={traceName}
            traceNameShort={traceNameShort}
          />

          <WikiAttribution theme={theme} subject="Boss images" />
        </div>
      </div>
    </>
  );
}
