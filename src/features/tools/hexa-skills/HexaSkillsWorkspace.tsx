"use client";

import { useId, useState, useMemo } from "react";
import type { AppTheme } from "../../../components/themes";
import { ProgressBar } from "../../../components/ProgressBar";
import { ToolHeader } from "../../../components/ToolHeader";
import { CHARACTER_DROPDOWN_HEIGHT, CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import {
  COMMON_SKILLS,
  getClassGroups,
  getClassesInGroup,
} from "./hexa-classes";
import {
  useHexaSkillsState,
  type SkillCostSummary,
} from "./useHexaSkillsState";
import { COMMON_COSTS, MAX_SKILL_LEVEL, getCostRange } from "./hexa-costs";
import { SkillSection, MasterySection } from "./hexa-ui";
import { fmtNum } from "./hexa-format";
import { toolStyles } from "../tool-styles";
import { PanelDivider } from "../shared-ui";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { ItemIcon } from "../../../components/ResourceImage";

// Item ids (manifests/v269/item.json): Sol Erda, Sol Erda Fragment
const SOL_ERDA_ITEM_ID = "05066300";
const SOL_ERDA_FRAGMENT_ITEM_ID = "04009613";

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
  userSelect: "none",
};

const shineNoticeStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.82rem",
  fontWeight: 600,
  lineHeight: 1.5,
};

// ── Class Selector ───────────────────────────────────────────────────────────

function ClassSelector({
  theme,
  inputStyle,
  selectedClassName,
  onClassChange,
  disabled,
}: {
  theme: AppTheme;
  inputStyle: React.CSSProperties;
  selectedClassName: string | null;
  onClassChange: (name: string | null) => void;
  disabled?: boolean;
}) {
  const uid = useId();
  const groups = getClassGroups();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      <label
        htmlFor={uid}
        className="section-label"
        style={{ color: theme.muted, marginBottom: 0 }}
      >
        Class
      </label>
      <select
        id={uid}
        className="tool-select"
        value={selectedClassName ?? ""}
        onChange={(e) => onClassChange(e.target.value || null)}
        disabled={disabled}
        style={{
          ...inputStyle,
          flex: 1,
          maxWidth: "280px",
          // Matches the character picker beside it, which sizes to its avatar.
          height: CHARACTER_DROPDOWN_HEIGHT,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <option value="">Select a class…</option>
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
  );
}

// ── Summary Stat ────────────────────────────────────────────────────────────

/** Label and sub-caption left, the one number that matters right, on a tint.
 *  Not a bordered box: a card inside a card is always wrong. */
function ResourceRow({
  label,
  iconId,
  value,
  max,
  theme,
}: {
  label: string;
  iconId: string;
  value: number;
  max: number;
  theme: AppTheme;
}) {
  const accumulated = max - value;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: theme.timerBg,
        borderRadius: "10px",
        padding: "10px 14px",
      }}
    >
      <ItemIcon id={iconId} size={28} alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>
          {label} remaining
        </div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
          {fmtNum(accumulated)} / {fmtNum(max)} accumulated
        </div>
      </div>
      <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>
        {fmtNum(value)}
      </span>
    </div>
  );
}

// ── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({
  theme,
  grand,
  maxGrand,
  progressPct,
  includeJanus,
  onIncludeJanusChange,
  onReset,
}: {
  theme: AppTheme;
  grand: SkillCostSummary;
  maxGrand: SkillCostSummary;
  progressPct: number;
  includeJanus: boolean;
  onIncludeJanusChange: (v: boolean) => void;
  onReset: () => void;
}) {
  return (
    <>
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
        <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
          Overall Progress
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label
            style={{ ...checkboxLabelStyle, color: theme.muted }}
          >
            <input
              type="checkbox"
              checked={includeJanus}
              onChange={(e) => onIncludeJanusChange(e.target.checked)}
              style={{ accentColor: theme.accent, cursor: "pointer" }}
            />
            Include Janus in Total?
          </label>
          <ConfirmButton
            theme={theme}
            label="Reset"
            title="Reset skill levels?"
            message="This sets every HEXA skill's current level back to its minimum. Your selected class and desired levels stay."
            onConfirm={onReset}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "0.5rem",
          marginBottom: "12px",
        }}
      >
        <ResourceRow
          label="Sol Erda"
          iconId={SOL_ERDA_ITEM_ID}
          value={grand.solErda}
          max={maxGrand.solErda}
          theme={theme}
        />
        <ResourceRow
          label="Sol Erda Fragments"
          iconId={SOL_ERDA_FRAGMENT_ITEM_ID}
          value={grand.fragments}
          max={maxGrand.fragments}
          theme={theme}
        />
      </div>

      <ProgressBar pct={progressPct} theme={theme} label="Overall HEXA skill progress" />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "4px",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: theme.muted,
        }}
      >
        {progressPct.toFixed(1)}% Complete
      </div>
    </>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ theme, sectionPanel }: { theme: AppTheme; sectionPanel: React.CSSProperties }) {
  return (
    <section
      className="fade-in panel-card"
      style={{
        ...sectionPanel,
        textAlign: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <h2 className="tool-panel-title" style={{ color: theme.text }}>
        Select a class above to start tracking your HEXA skills.
      </h2>
      <p style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600, margin: 0 }}>
        Choose a character to auto-fill your class, or pick one manually.
      </p>
    </section>
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
    // Found by name: COMMON_SKILLS' order is data, and an index would silently
    // start subtracting Sol Hecate if the list were ever reordered.
    const janusIdx = COMMON_SKILLS.findIndex((s) => s.name === "Sol Janus");
    const janusCost = costs.common.perSkill[janusIdx] ?? { solErda: 0, fragments: 0 };
    const janusMaxCost = janusIdx < 0
      ? { solErda: 0, fragments: 0 }
      : getCostRange(COMMON_COSTS, 0, desiredLevels.common[janusIdx] ?? MAX_SKILL_LEVEL);
    const grand = {
      solErda: costs.grand.solErda - janusCost.solErda,
      fragments: costs.grand.fragments - janusCost.fragments,
    };
    const maxGrand = {
      solErda: costs.maxGrand.solErda - janusMaxCost.solErda,
      fragments: costs.maxGrand.fragments - janusMaxCost.fragments,
    };
    const spent = { solErda: maxGrand.solErda - grand.solErda, fragments: maxGrand.fragments - grand.fragments };
    const progressPct = maxGrand.fragments > 0 ? Math.min(100, (spent.fragments / maxGrand.fragments) * 100) : 0;
    return { grand, maxGrand, progressPct };
  }, [includeJanus, costs, desiredLevels.common]);

  const styles = toolStyles(theme);
  const { sectionPanel, inputStyle } = styles;

  const halfPanel: React.CSSProperties = {
    ...sectionPanel,
    flex: "1 1 45%",
    minWidth: "280px",
    marginBottom: 0,
  };

  if (!mounted) return null;

  return (
    <div className="page-content">
      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="HEXA Skill Tracker"
          description="Select your class, set each skill's current level, and see the total Sol Erda and Fragments needed to max."
        />

        {/* Character + class + cost summary share one panel to keep the page
            header area short. */}
        <div className="fade-in panel-card" style={sectionPanel}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem 2rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px" }}>
              <CharacterSyncPanel
                theme={theme}
                characters={characters}
                selectedCharName={selectedCharName}
                onCharChange={handleCharChange}
                inputStyle={inputStyle}
              />
            </div>

            <div style={{ flex: "1 1 280px" }}>
              <ClassSelector
                theme={theme}
                inputStyle={inputStyle}
                selectedClassName={className}
                onClassChange={setClassName}
                disabled={selectedCharName != null}
              />
            </div>
          </div>

          {classDef && (
            <>
              <PanelDivider theme={theme} />
              <SummaryPanel
                theme={theme}
                grand={adjusted.grand}
                maxGrand={adjusted.maxGrand}
                progressPct={adjusted.progressPct}
                includeJanus={includeJanus}
                onIncludeJanusChange={setIncludeJanus}
                onReset={resetAll}
              />
            </>
          )}
        </div>

        {classDef && classDef.group === "SHINE" && (
          <div
            className="fade-in panel-card"
            style={{
              ...sectionPanel,
              ...shineNoticeStyle,
              background: theme.accentSoft,
              border: `1px solid ${theme.accent}`,
              color: theme.text,
            }}
          >
            <strong>Note:</strong> {classDef.className} uses the Erda Link system instead of the traditional HEXA skill system.
            The fragment costs shown below are placeholder values based on standard classes.
            Accurate Erda Link costs will be supported in a future update.
          </div>
        )}

        {classDef ? (
          <>
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
      </div>
    </div>
  );
}
