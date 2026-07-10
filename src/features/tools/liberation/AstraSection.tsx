"use client";

import Image from "next/image";
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
  type AstraBossSelection,
  type AstraCalcResult,
  getAstraSelection,
  formatDate,
} from "./useAstraState";
import { toolStyles } from "../tool-styles";
import { PanelDivider } from "../shared-ui";
import { ConfirmButton } from "../../../components/ConfirmButton";

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
  const maxV = activeDiff.voucherCount ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>Vouchers</span>
      <input
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
        style={{ ...inputStyle, width: "48px", textAlign: "center", padding: "4px 6px", fontSize: "0.78rem", cursor: isActive ? "text" : "not-allowed" }}
      />
      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
        / {activeDiff.voucherCount} ({activeDiff.voucherValue} frags ea.)
      </span>
    </div>
  );
}

// -- Boss Card ----------------------------------------------------------------

function AstraBossCard({
  boss,
  sel,
  theme,
  inputStyle,
  pillBtn,
  onDifficultyChange,
  onPartySizeChange,
  onClearedChange,
  onVouchersKeptChange,
}: {
  boss: AstraBoss;
  sel: AstraBossSelection;
  theme: AppTheme;
  inputStyle: React.CSSProperties;
  pillBtn: (active: boolean) => React.CSSProperties;
  onDifficultyChange: (diffIdx: number | null) => void;
  onPartySizeChange: (size: number) => void;
  onClearedChange: (cleared: boolean) => void;
  onVouchersKeptChange: (count: number) => void;
}) {
  const isActive = sel.difficultyIdx !== null;
  const activeDiff = isActive ? boss.difficulties[sel.difficultyIdx!] : null;
  const traces = activeDiff ? Math.floor(activeDiff.traces / sel.partySize) : 0;
  const cleared = sel.clearedThisWeek && isActive;

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
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.6rem" }}>
        <Image
          src={boss.icon}
          alt={boss.name}
          width={38}
          height={38}
          unoptimized
          style={{
            borderRadius: "8px",
            objectFit: "cover",
            flexShrink: 0,
            background: theme.panel,
            border: `1px solid ${theme.border}`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: theme.text }}>
            {boss.name}
          </div>
        </div>
        {activeDiff && (
          <div className="tool-badge" style={{ color: theme.accentText, background: theme.accentSoft }}>
            +{traces} / week
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "0.6rem" }}>
        {boss.difficulties.map((diff, di) => (
          <button
            key={diff.label}
            type="button"
            className="btn-reset lib-diff-btn pill-btn"
            onClick={() => onDifficultyChange(sel.difficultyIdx === di ? null : di)}
            style={pillBtn(sel.difficultyIdx === di)}
          >
            {diff.label} ({diff.traces})
            {diff.hasVoucher && " ★"}
          </button>
        ))}
      </div>

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
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>Party</span>
          <input
            type="number"
            min={1}
            max={boss.maxParty}
            value={sel.partySize}
            disabled={!isActive}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 1;
              if (v < 1) v = 1;
              if (v > boss.maxParty) v = boss.maxParty;
              onPartySizeChange(v);
            }}
            className="tool-input"
            style={{ ...inputStyle, width: "48px", textAlign: "center", padding: "4px 6px", fontSize: "0.78rem", cursor: isActive ? "text" : "not-allowed" }}
          />
        </div>

        <button
          type="button"
          className={isActive ? "btn-reset tool-chip-btn lib-btn" : "btn-reset tool-chip-btn"}
          title="Click this if you have already cleared the boss for the week."
          disabled={!isActive}
          onClick={() => onClearedChange(!sel.clearedThisWeek)}
          style={{
            cursor: isActive ? "pointer" : "not-allowed",
            color: cleared ? theme.accentText : theme.muted,
            background: cleared ? theme.accentSoft : "transparent",
            border: `1px solid ${cleared ? theme.accent + "44" : theme.border}`,
          }}
        >
          {cleared ? "Cleared" : "Not cleared"}
        </button>

        {activeDiff?.hasVoucher && (
          <VoucherInput
            activeDiff={activeDiff}
            vouchersKept={sel.vouchersKept}
            isActive={isActive}
            theme={theme}
            inputStyle={inputStyle}
            onVouchersKeptChange={onVouchersKeptChange}
          />
        )}
      </div>
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
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div className="section-label" style={{ color: theme.muted }}>Configuration</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
            Current Mission
          </div>
          <select
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
            Current Traces
          </div>
          <input
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

        <div style={{ flex: "0 1 130px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
            Current Fragments
          </div>
          <input
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
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
      </div>
    </div>
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
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div className="section-label" style={{ color: theme.muted }}>Daily Quests (Erion&apos;s Fragments)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 250px" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
            Highest Daily Quest
          </div>
          <select
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
            Days / Week
          </div>
          <input
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
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.muted, marginBottom: "6px" }}>
          Future Quest Upgrade (optional)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          <div style={{ flex: "0 1 160px" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
              Upgrade Date
            </div>
            <input
              className="tool-input"
              type="date"
              value={futureQuestDate}
              onChange={(e) => onFutureQuestDateChange(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <div style={{ flex: "1 1 250px" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>
              New Quest
            </div>
            <select
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
    </div>
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
        <div className="section-label" style={{ color: theme.muted }}>Traces Progress</div>
        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: theme.accentText }}>
          {tracesCompleted.toLocaleString()} / {ASTRA_TOTAL_TRACES.toLocaleString()}
        </div>
      </div>
      <ProgressBar pct={tracesPct} theme={theme} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
        <span>Mission {missionIdx + 1} of {ASTRA_MISSIONS.length}</span>
        <span>{tracesPct.toFixed(1)}%</span>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <div className="section-label" style={{ color: theme.muted }}>Fragments Progress</div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: theme.accentText }}>
            {fragmentsCompleted.toLocaleString()} / {ASTRA_TOTAL_FRAGMENTS.toLocaleString()}
          </div>
        </div>
        <ProgressBar pct={fragsPct} theme={theme} />
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
  return (
    <div className="fade-in panel-card" style={{ ...sectionPanel, marginBottom: "1.25rem" }}>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginBottom: "1.25rem" }}>
        <div>
          <div className="section-label" style={{ color: theme.muted }}>Completion Date</div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.2rem",
              color: result.completionDate === "Never" ? "#e05a5a" : theme.accent,
            }}
          >
            {result.completionDate === "Never" ? "Never" : formatDate(result.completionDate)}
          </div>
        </div>
        <div>
          <div className="section-label" style={{ color: theme.muted }}>Weeks Remaining</div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.2rem",
              color: result.weeksToComplete === Infinity ? "#e05a5a" : theme.accent,
            }}
          >
            {result.weeksToComplete === Infinity ? "--" : result.weeksToComplete}
          </div>
        </div>
        <div>
          <div className="section-label" style={{ color: theme.muted }}>Traces Remaining</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: theme.text }}>
            {result.totalTracesNeeded.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="section-label" style={{ color: theme.muted }}>Fragments Remaining</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: theme.text }}>
            {result.totalFragmentsNeeded.toLocaleString()}
          </div>
        </div>
      </div>

      {result.missionResults.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="section-label" style={{ color: theme.muted }}>Mission Milestones</div>
          {result.missionResults.map((m) => (
            <div
              key={m.mission.label}
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
              <span style={{ color: theme.text }}>{m.mission.label}</span>
              <span style={{ color: theme.accentText, fontWeight: 800 }}>
                {formatDate(m.completionDate)}
                <span style={{ color: theme.muted, fontWeight: 700, marginLeft: "6px", fontSize: "0.75rem" }}>
                  ({m.weeksFromStart}w)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="section-label" style={{ color: theme.muted }}>Weekly Income Breakdown</div>
      {result.breakdown.every((b) => b.tracesPerWeek === 0 && b.voucherFragmentsPerWeek === 0) ? (
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: theme.muted, fontStyle: "italic" }}>
          Select bosses above to see your weekly income.
        </div>
      ) : (
        <>
          {result.breakdown.reduce<React.ReactNode[]>((acc, b) => {
            if (b.tracesPerWeek > 0 || b.voucherFragmentsPerWeek > 0) acc.push(
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
                <span style={{ color: theme.text }}>{b.bossName}</span>
                <span style={{ color: theme.accentText, fontWeight: 800 }}>
                  +{b.tracesPerWeek} traces
                  {b.voucherFragmentsPerWeek > 0 && (
                    <span style={{ color: theme.muted, marginLeft: "6px" }}>
                      +{b.voucherFragmentsPerWeek} frags
                    </span>
                  )}
                </span>
              </div>
            );
            return acc;
          }, [])}

          <div style={{ paddingTop: "8px", marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: theme.text }}>
                Weekly Traces
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.accentText }}>
                {result.weeklyTraces.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: theme.text }}>
                Weekly Fragments (vouchers)
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.accentText }}>
                {result.weeklyVoucherFragments.toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: theme.text }}>
                Weekly Fragments (dailies)
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.accentText }}>
                {result.weeklyDailyFragments.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// -- Main Component -----------------------------------------------------------

export default function AstraSection({ theme }: { theme: AppTheme }) {
  const state = useAstraState();
  const styles = toolStyles(theme);
  const { inputStyle, sectionPanel } = styles;

  const pillBtn = (active: boolean): React.CSSProperties => ({
    color: active ? theme.accentText : theme.muted,
    background: active ? theme.accentSoft : "transparent",
    border: active ? "none" : `1px solid ${theme.border}`,
  });

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

      <div className="fade-in panel-card" style={sectionPanel}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
            Boss Selection
          </div>
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

        <div
          className="lib-boss-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}
        >
          {ASTRA_BOSSES.map((boss) => {
            const sel = getAstraSelection(state.selections, boss.name);
            return (
              <AstraBossCard
                key={boss.name}
                boss={boss}
                sel={sel}
                theme={theme}
                inputStyle={inputStyle}
                pillBtn={pillBtn}
                onDifficultyChange={(diffIdx) => state.setDifficulty(boss.name, diffIdx)}
                onPartySizeChange={(size) => state.setPartySize(boss.name, size)}
                onClearedChange={(cleared) => state.setCleared(boss.name, cleared)}
                onVouchersKeptChange={(count) => state.setVouchersKept(boss.name, count)}
              />
            );
          })}
        </div>
      </div>

      <AstraResultsSection
        theme={theme}
        sectionPanel={sectionPanel}
        result={state.result}
      />
    </>
  );
}
