"use client";

import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { ProgressBar } from "../../../components/ProgressBar";
import { SkillIcon } from "./hexa-ui";
import { fmtNum } from "./hexa-format";
import type { FdBreakdown, GuideResult, GuideStep, FdNodeContribution } from "./hexa-fd";

const KIND_LABEL: Record<GuideStep["kind"], string> = {
  origin: "Origin",
  ascent: "Ascent",
  mastery: "Mastery",
  enhancement: "Enhancement",
  common: "Common",
};

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

// Cap the rendered next-to-level list; a fresh character has ~330 steps and the
// guide's job is what to do next, not to print the whole path.
const VISIBLE_STEPS = 60;

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

const scrollBox: CSSProperties = {
  maxHeight: "560px",
  overflowY: "auto",
  paddingRight: "4px",
};

const rankStyle: CSSProperties = {
  width: "1.6rem",
  flexShrink: 0,
  textAlign: "right",
  fontSize: "0.75rem",
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
};

const statRight: CSSProperties = {
  flexShrink: 0,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "10px",
};

// ── Guide ────────────────────────────────────────────────────────────────────

function GuideStepRow({ step, rank, theme }: { step: GuideStep; rank: number; theme: AppTheme }) {
  return (
    <div style={rowStyle}>
      <span style={{ ...rankStyle, color: theme.muted }}>{rank}</span>
      <SkillIcon iconId={step.iconId} iconUrl={step.iconUrl} name={step.name} theme={theme} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...nameStyle, color: theme.text }}>
          {step.name}
          {step.extraSkills.length > 0 && (
            <span style={{ color: theme.muted, fontWeight: 600 }}> +{step.extraSkills.length}</span>
          )}
        </div>
        <div style={{ ...subStyle, color: theme.muted }}>
          {KIND_LABEL[step.kind]} · Lv {step.fromLevel} → {step.toLevel} · {fmtNum(step.fragCost)} frags
        </div>
      </div>
      <div style={statRight}>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.accentText }}>
          +{fmtPct(step.fdGain)}
        </div>
        <div style={{ ...subStyle, color: theme.muted }}>
          {step.fdPerFrag.toFixed(4)} /frag
        </div>
      </div>
    </div>
  );
}

export function GuideView({
  theme,
  guide,
  sectionPanel,
}: {
  theme: AppTheme;
  guide: GuideResult;
  sectionPanel: CSSProperties;
}) {
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
    <section className="fade-in panel-card" style={sectionPanel}>
      <div style={headerRow}>
        <div>
          <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
            Leveling Guide
          </h2>
          <p style={{ ...subStyle, color: theme.muted, margin: "2px 0 0" }}>
            Ordered by final-damage gained per Sol Erda Fragment.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.accentText }}>
            +{fmtPct(guide.remainingFd)} FD left
          </div>
          <div style={{ ...subStyle, color: theme.muted }}>
            {guide.steps.length} levels · {fmtNum(guide.totalFrag)} frags
          </div>
        </div>
      </div>

      <div style={scrollBox}>
        {guide.steps.slice(0, VISIBLE_STEPS).map((step, i) => (
          <GuideStepRow key={`${step.code}-${step.toLevel}`} step={step} rank={i + 1} theme={theme} />
        ))}
      </div>

      {guide.steps.length > VISIBLE_STEPS && (
        <p style={{ ...subStyle, color: theme.muted, margin: "10px 0 0", textAlign: "center" }}>
          + {guide.steps.length - VISIBLE_STEPS} more levels to reach your desired levels.
        </p>
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
        <div style={{ textAlign: "right" }}>
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
