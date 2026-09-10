"use client";

import { useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { ProgressBar } from "../../../components/ProgressBar";
import HoverTooltip from "../../../components/HoverTooltip";
import ConfirmModal from "../../../components/ConfirmModal";
import { SkillIcon } from "./hexa-ui";
import { fmtNum } from "./hexa-format";
import type { FdBreakdown, GuideResult, GuideStep, FdNodeContribution } from "./hexa-fd";

const KIND_LABEL: Record<GuideStep["kind"], string> = {
  origin: "Origin",
  ascent: "Ascent",
  mastery: "Mastery",
  enhancement: "Enhancement",
  common: "Common",
  hexaStat: "HEXA Stat",
};

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ── Shared row chrome ────────────────────────────────────────────────────────

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 0",
};

const nameStyle: CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const subStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
};

const statRight: CSSProperties = {
  flexShrink: 0,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

// ── Guide ────────────────────────────────────────────────────────────────────

const GUIDE_CELL_WIDTH = 76;

// Fixed-width columns, centered as a block; items fill left-to-right so each row
// stays left-aligned while the whole grid centers under the header.
const guideGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, ${GUIDE_CELL_WIDTH}px)`,
  justifyContent: "center",
  justifyItems: "start",
  rowGap: "6px",
};

// Each cell is a fixed tile + trailing arrow, so every row ends with an arrow and
// the icons line up in clean columns regardless of where the row wraps.
const guideCell: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const guideTile: CSSProperties = {
  width: 56,
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "3px",
  padding: "6px 7px",
  borderRadius: "8px",
  font: "inherit",
  textAlign: "inherit",
  cursor: "pointer",
};

const guideLevelText: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1,
};

const guideArrow: CSSProperties = {
  width: 20,
  flexShrink: 0,
  textAlign: "center",
  fontSize: "0.9rem",
  fontWeight: 700,
  lineHeight: 1,
  userSelect: "none",
};

const hecateBanner: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: 600,
  lineHeight: 1.5,
  marginBottom: "12px",
};

function GuideTip({ step, rank, theme }: { step: GuideStep; rank: number; theme: AppTheme }) {
  // A HEXA Stat core is rolled, not leveled, so it has no level range, no fixed final damage
  // and no fixed fragment cost. The tooltip just names it and says where it lands in the order.
  if (step.kind === "hexaStat") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
        <span style={{ fontWeight: 800 }}>{step.name}</span>
        <span style={{ color: theme.muted, fontWeight: 600 }}>#{rank} · {KIND_LABEL[step.kind]}</span>
        <span style={{ color: theme.muted, fontWeight: 600 }}>Rolled, so its cost and final damage vary.</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
      <span style={{ fontWeight: 800 }}>{step.name}</span>
      {step.extraSkills.map((s) => (
        <span key={s} style={{ color: theme.muted, fontWeight: 600 }}>{s}</span>
      ))}
      <span style={{ color: theme.muted, fontWeight: 600 }}>
        #{rank} · {KIND_LABEL[step.kind]} · Lv {step.fromLevel} → {step.toLevel}
      </span>
      <span style={{ fontWeight: 700, color: theme.accentText }}>+{fmtPct(step.fdGain)} final damage</span>
      <span style={{ color: theme.muted, fontWeight: 600 }}>
        {fmtNum(step.fragCost)} frags · {step.fdPerFrag.toFixed(4)} FD/frag
      </span>
    </div>
  );
}

function GuideTile({ step, rank, theme, onClick }: { step: GuideStep; rank: number; theme: AppTheme; onClick: () => void }) {
  const tileStyle: CSSProperties = {
    ...guideTile,
    background: theme.panel,
    border: `1px solid ${theme.border}`,
  };
  const body = (
    <>
      <SkillIcon iconId={step.iconId} iconUrl={step.iconUrl} name={step.name} theme={theme} />
      <span style={{ ...guideLevelText, color: theme.text }}>
        {step.fromLevel}
        <span style={{ color: theme.muted }}>→</span>
        {step.toLevel}
      </span>
    </>
  );

  // A HEXA Stat marker isn't a step you can record, so it's a plain tile rather than a
  // button: clicking it would "mark as done" something the tracker doesn't hold a level for.
  if (step.kind === "hexaStat") {
    return (
      <HoverTooltip theme={theme} label={<GuideTip step={step} rank={rank} theme={theme} />}>
        <div style={tileStyle}>
          <SkillIcon iconId={step.iconId} iconUrl={step.iconUrl} name={step.name} theme={theme} />
          <span style={{ ...guideLevelText, color: theme.muted }}>Stat</span>
        </div>
      </HoverTooltip>
    );
  }

  return (
    <HoverTooltip theme={theme} label={<GuideTip step={step} rank={rank} theme={theme} />}>
      <button type="button" onClick={onClick} style={tileStyle}>
        {body}
      </button>
    </HoverTooltip>
  );
}

/** "Sol Hecate", or "Sol Hecate and HEXA Twilight Bloom". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "Sol Janus to Lv 10, Blade Storm to Lv 5 and …": each skill's final level across `steps`. */
function describeSteps(steps: GuideStep[]): string {
  const finals = new Map<string, string>();
  // HEXA Stat cores aren't leveled, so they never appear in what gets recorded.
  for (const step of steps) {
    if (step.kind === "hexaStat") continue;
    finals.set(step.code, `${step.name} to Lv ${step.toLevel}`);
  }
  const parts = [...finals.values()];
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function GuideView({
  theme,
  guide,
  sectionPanel,
  onApply,
}: {
  theme: AppTheme;
  guide: GuideResult;
  sectionPanel: CSSProperties;
  /** Record the given guide steps as leveled in game. */
  onApply: (steps: GuideStep[]) => void;
}) {
  // Rank (1-based) of the clicked tile; confirming applies that step and every one before it.
  const [pendingRank, setPendingRank] = useState<number | null>(null);
  const pendingSteps = pendingRank == null ? [] : guide.steps.slice(0, pendingRank);

  if (guide.steps.length === 0) {
    return (
      <section className="fade-in panel-card" style={{ ...sectionPanel, textAlign: "center", padding: "3rem 1.5rem" }}>
        <h2 className="tool-panel-title" style={{ color: theme.text }}>
          Every skill is at its desired level.
        </h2>
        <p style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600, margin: 0 }}>
          Lower a skill&apos;s current level, or raise a desired level, to see what to level next.
        </p>
      </section>
    );
  }

  return (
    // overflow visible so the tile tooltips can draw over the panel's border
    // (.panel-card clips to its rounded corners by default).
    <section className="fade-in panel-card" style={{ ...sectionPanel, overflow: "visible" }}>
      <div style={headerRow}>
        <div>
          <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
            Leveling Guide
          </h2>
          <p style={{ ...subStyle, color: theme.muted, margin: "2px 0 0" }}>
            Level left to right, ordered by final damage per Sol Erda Fragment. Hover a skill for details, or click one you&apos;ve leveled in game to update your progress.
          </p>
        </div>
        <div className="hexa-header-stat">
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.accentText }}>
            +{fmtPct(guide.remainingFd)} FD left
          </div>
          <div style={{ ...subStyle, color: theme.muted }}>
            {guide.steps.length} steps · {fmtNum(guide.totalFrag)} frags
          </div>
        </div>
      </div>

      {guide.missingFdNodes.length > 0 && (
        <div style={{ ...hecateBanner, background: theme.timerBg, border: `1px solid ${theme.border}`, color: theme.muted }}>
          Final damage values for {listNames(guide.missingFdNodes)} aren&apos;t available yet, so{" "}
          {guide.missingFdNodes.length > 1 ? "they aren't" : "it isn't"} in this guide. Check your class Discord for the latest leveling order.
        </div>
      )}

      <div style={guideGrid}>
        {guide.steps.map((step, i) => (
          <div key={`${step.code}-${step.toLevel}`} style={guideCell}>
            <GuideTile step={step} rank={i + 1} theme={theme} onClick={() => setPendingRank(i + 1)} />
            {i < guide.steps.length - 1 && (
              <span aria-hidden="true" style={{ ...guideArrow, color: theme.muted }}>
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {pendingRank != null && (
        <ConfirmModal
          theme={theme}
          title={pendingRank === 1 ? "Mark step 1 as done?" : `Mark steps 1 to ${pendingRank} as done?`}
          description={`This raises ${describeSteps(pendingSteps)} in your tracker.`}
          warning="Only confirm if you've already leveled these skills in game."
          confirmLabel="Mark done"
          onConfirm={() => {
            onApply(pendingSteps);
            setPendingRank(null);
          }}
          onCancel={() => setPendingRank(null)}
        />
      )}
    </section>
  );
}

// ── FD Breakdown ─────────────────────────────────────────────────────────────

function BreakdownRow({ item, maxContribution, theme }: { item: FdNodeContribution; maxContribution: number; theme: AppTheme }) {
  const { node, currentFd, maxFd } = item;
  const barPct = maxContribution > 0 ? (currentFd / maxContribution) * 100 : 0;
  return (
    <div style={rowStyle}>
      <SkillIcon iconId={node.iconId} iconUrl={node.iconUrl} name={node.name} theme={theme} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...nameStyle, color: theme.text }}>
          {node.name}
          {node.extraSkills.length > 0 && (
            <span style={{ color: theme.muted, fontWeight: 600 }}> +{node.extraSkills.length}</span>
          )}
        </div>
        <div style={{ ...subStyle, color: theme.muted }}>
          {KIND_LABEL[node.kind]} · Lv {node.level} / 30
        </div>
        <div
          style={{
            height: "4px",
            borderRadius: "2px",
            background: theme.timerBg,
            marginTop: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              background: theme.accent,
              borderRadius: "2px",
              transform: `scaleX(${barPct / 100})`,
              transformOrigin: "left",
              transition: "transform 0.25s ease",
            }}
          />
        </div>
      </div>
      <div style={statRight}>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.accentText }}>
          {fmtPct(currentFd)}
        </div>
        <div style={{ ...subStyle, color: theme.muted }}>
          of {fmtPct(maxFd)}
        </div>
      </div>
    </div>
  );
}

export function FdBreakdownView({
  theme,
  breakdown,
  sectionPanel,
}: {
  theme: AppTheme;
  breakdown: FdBreakdown;
  sectionPanel: CSSProperties;
}) {
  const pct = breakdown.totalMax > 0 ? (breakdown.totalCurrent / breakdown.totalMax) * 100 : 0;
  // Contributions share one scale so the bars compare against the biggest node.
  const maxContribution = breakdown.nodes.reduce((m, n) => Math.max(m, n.maxFd), 0);

  return (
    <section className="fade-in panel-card" style={sectionPanel}>
      <div style={headerRow}>
        <div>
          <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
            FD Breakdown
          </h2>
          <p style={{ ...subStyle, color: theme.muted, margin: "2px 0 0" }}>
            Final damage from HEXA skills at your current levels.
          </p>
        </div>
        <div className="hexa-header-stat">
          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>
            {fmtPct(breakdown.totalCurrent)}
          </div>
          <div style={{ ...subStyle, color: theme.muted }}>
            of {fmtPct(breakdown.totalMax)} maxed
          </div>
        </div>
      </div>

      <ProgressBar pct={pct} theme={theme} label="HEXA final damage earned" />
      <div style={{ height: "12px" }} />

      {breakdown.nodes.map((item) => (
        <BreakdownRow key={item.node.code} item={item} maxContribution={maxContribution} theme={theme} />
      ))}
    </section>
  );
}
