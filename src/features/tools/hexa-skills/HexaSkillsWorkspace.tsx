"use client";

import { useId, useState, useMemo } from "react";
import type { AppTheme } from "../../../components/themes";
import { ProgressBar } from "../../../components/ProgressBar";
import { ToolHeader } from "../../../components/ToolHeader";
import { CHARACTER_DROPDOWN_HEIGHT, CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import {
  COMMON_SKILLS,
  commonSkillsFor,
  getClassGroups,
  getClassesInGroup,
} from "./hexa-classes";
import {
  useHexaSkillsState,
  type SkillCostSummary,
} from "./useHexaSkillsState";
import { COMMON_COSTS, getCostRange } from "./hexa-costs";
import { SkillSection, MasterySection, HexaStatSection } from "./hexa-ui";
import { GuideView, FdBreakdownView } from "./hexa-fd-ui";
import { hasFdData, computeGuide, computeFdBreakdown } from "./hexa-fd";
import { fmtNum } from "./hexa-format";
import { toolStyles } from "../tool-styles";
import { PanelDivider } from "../shared-ui";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { ItemIcon } from "../../../components/ResourceImage";
import { erdaLinkClassKey } from "../erda-link/erda-link-data";
import { ErdaLinkSummary, ErdaLinkTracker } from "../erda-link/ErdaLinkTracker";

type HexaTab = "overview" | "guide" | "fd";
const TAB_LABELS: Record<HexaTab, string> = { overview: "Overview", guide: "Leveling Guide", fd: "FD Breakdown" };
const HEXA_TABS: readonly HexaTab[] = ["overview", "guide", "fd"];

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

type HexaCosts = ReturnType<typeof useHexaSkillsState>["costs"];

/** Grand totals with Sol Janus taken back out, for players who skip it. */
function costsWithoutJanus(costs: HexaCosts, desiredCommon: number[]) {
  // Found by name: COMMON_SKILLS' order is data, and an index would silently
  // start subtracting Sol Hecate if the list were ever reordered.
  const janusIdx = COMMON_SKILLS.findIndex((s) => s.name === "Sol Janus");
  const janusCost = costs.common.perSkill[janusIdx];
  const janusMaxCost = getCostRange(COMMON_COSTS, 0, desiredCommon[janusIdx]);
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
}

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
    setLevel,
    setDesiredLevel,
    resetAll,
    applyGuide,
    costs,
    erdaLevels,
    setErdaLevel,
    setErdaLevels,
    resetErdaLink,
    hexaStatDone,
    hexaStatFromCharacter,
    setHexaStatDone,
  } = useHexaSkillsState();

  // SHINE classes (Sia, Erel) have the Erda Link tree instead of a HEXA Matrix, so the
  // page becomes the Erda Link Tracker for them: same character and class pickers, and the
  // sheet-derived upgrade order in place of the HEXA sections.
  const erdaKey = classDef ? erdaLinkClassKey(classDef.className) : null;

  const [includeJanus, setIncludeJanus] = useState(true);
  const [tab, setTab] = useState<HexaTab>("overview");

  // Sol Janus and Sol Hecate plus this class's own 3rd Common Node.
  const commonSkills = useMemo(() => commonSkillsFor(className), [className]);

  const showFd = classDef != null && erdaKey == null && hasFdData(className);
  const activeTab: HexaTab = showFd ? tab : "overview";

  const guide = useMemo(
    () => (showFd ? computeGuide(className, classDef, levels, desiredLevels, hexaStatDone) : null),
    [showFd, className, classDef, levels, desiredLevels, hexaStatDone],
  );
  const breakdown = useMemo(
    () => (showFd ? computeFdBreakdown(className, classDef, levels, desiredLevels) : null),
    [showFd, className, classDef, levels, desiredLevels],
  );

  const adjusted = useMemo(
    () => (includeJanus ? costs : costsWithoutJanus(costs, desiredLevels.common)),
    [includeJanus, costs, desiredLevels.common],
  );

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
          description="Sol Erda and Fragment cost to max your HEXA skills, per character."
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
              {erdaKey ? (
                <ErdaLinkSummary theme={theme} classKey={erdaKey} levels={erdaLevels} onReset={resetErdaLink} />
              ) : (
                <SummaryPanel
                  theme={theme}
                  grand={adjusted.grand}
                  maxGrand={adjusted.maxGrand}
                  progressPct={adjusted.progressPct}
                  includeJanus={includeJanus}
                  onIncludeJanusChange={setIncludeJanus}
                  onReset={resetAll}
                />
              )}
            </>
          )}
        </div>

        {erdaKey && (
          <ErdaLinkTracker
            theme={theme}
            classKey={erdaKey}
            levels={erdaLevels}
            sectionPanel={sectionPanel}
            inputStyle={inputStyle}
            onLevel={setErdaLevel}
            onLevels={setErdaLevels}
          />
        )}

        {showFd && (
          <div className="fade-in">
            <SegmentedToggle
              theme={theme}
              options={HEXA_TABS}
              value={activeTab}
              labels={TAB_LABELS}
              ariaLabel="HEXA view"
              // flexWrap so the three labels stack instead of overflowing on narrow screens.
              trackStyle={{ marginBottom: "1.25rem", flexWrap: "wrap" }}
              onChange={setTab}
            />
          </div>
        )}

        {!classDef && <EmptyState theme={theme} sectionPanel={sectionPanel} />}

        {activeTab === "guide" && guide && (
          <GuideView theme={theme} guide={guide} sectionPanel={sectionPanel} onApply={applyGuide} />
        )}

        {activeTab === "fd" && breakdown && (
          <FdBreakdownView theme={theme} breakdown={breakdown} sectionPanel={sectionPanel} />
        )}

        {classDef && !erdaKey && activeTab === "overview" && (
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
                onLevelChange={(i, v) => setLevel("origin", i, v)}
                onDesiredLevelChange={(i, v) => setDesiredLevel("origin", i, v)}
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
                  onLevelChange={(i, v) => setLevel("ascent", i, v)}
                  onDesiredLevelChange={(i, v) => setDesiredLevel("ascent", i, v)}
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
                onLevelChange={(i, v) => setLevel("mastery", i, v)}
                onDesiredLevelChange={(i, v) => setDesiredLevel("mastery", i, v)}
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
                onLevelChange={(i, v) => setLevel("enhancement", i, v)}
                onDesiredLevelChange={(i, v) => setDesiredLevel("enhancement", i, v)}
                theme={theme}
                sectionPanel={halfPanel}
                inputStyle={inputStyle}
              />
            </div>

            {/* Common */}
            <SkillSection
              title="Common"
              skills={commonSkills}
              levels={levels.common}
              desiredLevels={desiredLevels.common}
              sectionCost={costs.common}
              onLevelChange={(i, v) => setLevel("common", i, v)}
              onDesiredLevelChange={(i, v) => setDesiredLevel("common", i, v)}
              theme={theme}
              sectionPanel={sectionPanel}
              inputStyle={inputStyle}
            />

            <HexaStatSection
              done={hexaStatDone}
              fromCharacter={hexaStatFromCharacter}
              onChange={setHexaStatDone}
              theme={theme}
              sectionPanel={sectionPanel}
            />
          </>
        )}
      </div>
    </div>
  );
}
