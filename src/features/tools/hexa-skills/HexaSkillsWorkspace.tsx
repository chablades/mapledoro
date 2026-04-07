"use client";

import { useState, useMemo } from "react";
import type { AppTheme } from "../../../components/themes";
import { ProgressBar } from "../../../components/ProgressBar";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import { CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import {
  COMMON_SKILLS,
  getClassGroups,
  getClassesInGroup,
} from "./hexa-classes";
import {
  useHexaSkillsState,
  type SkillCostSummary,
} from "./useHexaSkillsState";
import { fmtNum, SkillSection, MasterySection } from "./hexa-ui";

// ── Class Selector ───────────────────────────────────────────────────────────

function ClassSelector({
  theme,
  inputStyle,
  sectionPanel,
  selectedClassName,
  onClassChange,
  disabled,
}: {
  theme: AppTheme;
  inputStyle: React.CSSProperties;
  sectionPanel: React.CSSProperties;
  selectedClassName: string | null;
  onClassChange: (name: string | null) => void;
  disabled?: boolean;
}) {
  const groups = getClassGroups();

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          className="section-label"
          style={{ color: theme.muted, marginBottom: 0 }}
        >
          Class
        </div>
        <select
          className="tool-input"
          value={selectedClassName ?? ""}
          onChange={(e) => onClassChange(e.target.value || null)}
          disabled={disabled}
          style={{
            ...inputStyle,
            flex: 1,
            maxWidth: "280px",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <option value="">Select a class...</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {getClassesInGroup(group).map((c) => (
                <option key={c.className} value={c.className}>
                  {c.className}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Summary Stat ────────────────────────────────────────────────────────────

function SummaryStat({ label, value, max, theme }: { label: string; value: number; max: number; theme: AppTheme }) {
  return (
    <div>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: theme.muted, marginBottom: "2px" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>
        <span style={{ color: theme.accent }}>{fmtNum(value)}</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}> / {fmtNum(max)}</span>
      </div>
    </div>
  );
}

// ── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({
  theme,
  sectionPanel,
  grand,
  maxGrand,
  progressPct,
  includeJanus,
  onIncludeJanusChange,
  onReset,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  grand: SkillCostSummary;
  maxGrand: SkillCostSummary;
  progressPct: number;
  includeJanus: boolean;
  onIncludeJanusChange: (v: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
          Total Remaining
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: theme.muted,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={includeJanus}
              onChange={(e) => onIncludeJanusChange(e.target.checked)}
              style={{ accentColor: theme.accent, cursor: "pointer" }}
            />
            Include Janus in Total?
          </label>
          <div
            className="pill-btn"
            onClick={onReset}
            style={{
              padding: "3px 10px",
              borderRadius: "8px",
              fontSize: "0.68rem",
              fontWeight: 800,
              color: theme.muted,
              background: "transparent",
              border: `1px solid ${theme.border}`,
              cursor: "pointer",
            }}
          >
            Reset All
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "2rem", marginBottom: "12px", flexWrap: "wrap" }}>
        <SummaryStat label="Sol Erda" value={grand.solErda} max={maxGrand.solErda} theme={theme} />
        <SummaryStat label="Sol Erda Fragments" value={grand.fragments} max={maxGrand.fragments} theme={theme} />
      </div>

      <ProgressBar pct={progressPct} theme={theme} />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "4px",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: theme.muted,
        }}
      >
        {progressPct.toFixed(1)}% Complete
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ theme, sectionPanel }: { theme: AppTheme; sectionPanel: React.CSSProperties }) {
  return (
    <div
      className="fade-in panel-card"
      style={{
        ...sectionPanel,
        textAlign: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
        Select a class above to start tracking your HEXA skills.
      </div>
      <div style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600 }}>
        Choose a character to auto-fill your class, or pick one manually.
      </div>
    </div>
  );
}

// ── Main Workspace ───────────────────────────────────────────────────────────

export default function HexaSkillsWorkspace({ theme }: { theme: AppTheme }) {
  const {
    mounted,
    characters,
    selectedCharName,
    handleCharChange,
    className,
    classDef,
    setClassName,
    levels,
    desiredLevels,
    setOriginLevel,
    setAscentLevel,
    setMasteryLevel,
    setEnhancementLevel,
    setCommonLevel,
    setDesiredOriginLevel,
    setDesiredAscentLevel,
    setDesiredMasteryLevel,
    setDesiredEnhancementLevel,
    setDesiredCommonLevel,
    resetAll,
    costs,
  } = useHexaSkillsState();

  const [includeJanus, setIncludeJanus] = useState(true);

  const adjusted = useMemo(() => {
    if (includeJanus) return { grand: costs.grand, maxGrand: costs.maxGrand, progressPct: costs.progressPct };
    const grand = {
      solErda: costs.grand.solErda - costs.common.total.solErda,
      fragments: costs.grand.fragments - costs.common.total.fragments,
    };
    const maxGrand = {
      solErda: costs.maxGrand.solErda - costs.maxCommon.solErda,
      fragments: costs.maxGrand.fragments - costs.maxCommon.fragments,
    };
    const spent = { solErda: maxGrand.solErda - grand.solErda, fragments: maxGrand.fragments - grand.fragments };
    const progressPct = maxGrand.fragments > 0 ? Math.min(100, (spent.fragments / maxGrand.fragments) * 100) : 0;
    return { grand, maxGrand, progressPct };
  }, [includeJanus, costs]);

  const sectionPanel: React.CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  const halfPanel: React.CSSProperties = {
    ...sectionPanel,
    flex: "1 1 45%",
    minWidth: "280px",
    marginBottom: 0,
  };

  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontSize: "0.82rem",
  };

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="HEXA Skill Tracker"
          description="Track Sol Erda and Sol Erda Fragment costs to max your HEXA skills."
        />

        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          {characters.length > 0 && (
            <CharacterSyncPanel
              theme={theme}
              characters={characters}
              selectedCharName={selectedCharName}
              onCharChange={handleCharChange}
              inputStyle={inputStyle}
              sectionPanel={halfPanel}
            />
          )}

          <ClassSelector
            theme={theme}
            inputStyle={inputStyle}
            sectionPanel={halfPanel}
            selectedClassName={className}
            onClassChange={setClassName}
            disabled={selectedCharName != null}
          />
        </div>

        {classDef ? (
          <>
            <SummaryPanel
              theme={theme}
              sectionPanel={sectionPanel}
              grand={adjusted.grand}
              maxGrand={adjusted.maxGrand}
              progressPct={adjusted.progressPct}
              includeJanus={includeJanus}
              onIncludeJanusChange={setIncludeJanus}
              onReset={resetAll}
            />

            {/* Origin + Ascent */}
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <SkillSection
                title="Origin"
                skills={[classDef.origin]}
                levels={[levels.origin]}
                minLevel={1}
                desiredLevels={[desiredLevels.origin]}
                sectionCost={costs.origin}
                onLevelChange={(_i, v) => setOriginLevel(v)}
                onDesiredLevelChange={(_i, v) => setDesiredOriginLevel(v)}
                theme={theme}
                sectionPanel={halfPanel}
                inputStyle={inputStyle}
              />
              {classDef.ascent && (
                <SkillSection
                  title="Ascent"
                  skills={[classDef.ascent]}
                  levels={[levels.ascent]}
                  desiredLevels={[desiredLevels.ascent]}
                  sectionCost={costs.ascent}
                  onLevelChange={(_i, v) => setAscentLevel(v)}
                  onDesiredLevelChange={(_i, v) => setDesiredAscentLevel(v)}
                  theme={theme}
                  sectionPanel={halfPanel}
                  inputStyle={inputStyle}
                />
              )}
            </div>

            {/* Mastery + Enhancement */}
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <MasterySection
                classDef={classDef}
                levels={levels.mastery}
                desiredLevels={desiredLevels.mastery}
                sectionCost={costs.mastery}
                onLevelChange={setMasteryLevel}
                onDesiredLevelChange={setDesiredMasteryLevel}
                theme={theme}
                sectionPanel={halfPanel}
                inputStyle={inputStyle}
              />
              <SkillSection
                title={`Enhancement (${classDef.enhancement.length})`}
                skills={classDef.enhancement}
                levels={levels.enhancement}
                desiredLevels={desiredLevels.enhancement}
                sectionCost={costs.enhancement}
                onLevelChange={setEnhancementLevel}
                onDesiredLevelChange={setDesiredEnhancementLevel}
                theme={theme}
                sectionPanel={halfPanel}
                inputStyle={inputStyle}
              />
            </div>

            {/* Common */}
            <SkillSection
              title="Common"
              skills={COMMON_SKILLS}
              levels={levels.common}
              desiredLevels={desiredLevels.common}
              sectionCost={costs.common}
              onLevelChange={setCommonLevel}
              onDesiredLevelChange={setDesiredCommonLevel}
              theme={theme}
              sectionPanel={sectionPanel}
              inputStyle={inputStyle}
            />
          </>
        ) : (
          <EmptyState theme={theme} sectionPanel={sectionPanel} />
        )}

        <WikiAttribution theme={theme} subject="Skill icons" />
      </div>
    </div>
  );
}
