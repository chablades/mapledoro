"use client";

import { useState } from "react";
import type { AppTheme } from "../../../components/themes";
import type { HexaSkillDef, HexaClassDef } from "./hexa-classes";
import type { SkillCostSummary, SectionCost } from "./useHexaSkillsState";

// ── Helpers ──────────────────────────────────────────────────────────────────

export function fmtNum(n: number): string {
  return n.toLocaleString();
}

// ── Skill Icon ───────────────────────────────────────────────────────────────

export function SkillIcon({ skill, theme, size = 32 }: { skill: HexaSkillDef; theme: AppTheme; size?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === skill.icon;

  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "6px",
          background: theme.accentSoft,
          border: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: 800,
          color: theme.accent,
          flexShrink: 0,
        }}
      >
        {skill.name.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={skill.icon}
      alt={skill.name}
      width={size}
      height={size}
      onError={() => setFailedSrc(skill.icon)}
      style={{
        borderRadius: "6px",
        objectFit: "cover",
        flexShrink: 0,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    />
  );
}

// ── Cost Badge ───────────────────────────────────────────────────────────────

export function CostBadge({ cost, theme, compact }: { cost: SkillCostSummary; theme: AppTheme; compact?: boolean }) {
  if (cost.solErda === 0 && cost.fragments === 0) {
    return (
      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: theme.accent }}>
        MAXED
      </span>
    );
  }

  const fs = compact ? "0.68rem" : "0.75rem";
  return (
    <span style={{ fontSize: fs, fontWeight: 700, color: theme.muted }}>
      <span style={{ color: theme.accent, fontWeight: 800 }}>{fmtNum(cost.solErda)}</span>
      {" Sol Erda  "}
      <span style={{ color: theme.accent, fontWeight: 800 }}>{fmtNum(cost.fragments)}</span>
      {" Fragments"}
    </span>
  );
}

// ── Level Input ──────────────────────────────────────────────────────────────

function clampInput(raw: string, min: number, max: number): number {
  let v = parseInt(raw);
  if (isNaN(v)) v = min;
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

export function LevelInput({
  value,
  min = 0,
  desiredValue,
  onDesiredChange,
  onChange,
  theme,
  inputStyle,
}: {
  value: number;
  min?: number;
  desiredValue?: number;
  onDesiredChange?: (v: number) => void;
  onChange: (v: number) => void;
  theme: AppTheme;
  inputStyle: React.CSSProperties;
}) {
  const hasDesired = desiredValue !== undefined && onDesiredChange !== undefined;
  const w = hasDesired ? "44px" : "52px";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: theme.muted }}>Lv</span>
      <input
        type="number"
        min={min}
        max={30}
        value={value}
        onChange={(e) => onChange(clampInput(e.target.value, min, 30))}
        className="tool-input"
        style={{
          ...inputStyle,
          width: w,
          textAlign: "center",
          padding: "4px 4px",
          fontSize: "0.78rem",
        }}
      />
      {desiredValue !== undefined && onDesiredChange && (
        <>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: theme.muted }}>/</span>
          <input
            type="number"
            min={min}
            max={30}
            value={desiredValue}
            onChange={(e) => onDesiredChange(clampInput(e.target.value, min, 30))}
            className="tool-input"
            style={{
              ...inputStyle,
              width: w,
              textAlign: "center",
              padding: "4px 4px",
              fontSize: "0.78rem",
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Skill Progress Bar ──────────────────────────────────────────────────────

function SkillProgressBar({ level, max = 30, theme }: { level: number; max?: number; theme: AppTheme }) {
  const pct = max > 0 ? Math.min(100, (level / max) * 100) : 100;
  return (
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
          width: `${pct}%`,
          background: theme.accent,
          borderRadius: "2px",
          transition: "width 0.25s ease",
        }}
      />
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, cost, theme }: { title: string; cost?: SkillCostSummary; theme: AppTheme }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "4px",
      }}
    >
      <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
        {title}
      </div>
      {cost && <CostBadge cost={cost} theme={theme} compact />}
    </div>
  );
}

// ── Skill Row ────────────────────────────────────────────────────────────────

export function SkillRow({
  skill,
  level,
  min,
  desiredLevel,
  cost,
  onChange,
  onDesiredLevelChange,
  theme,
  inputStyle,
}: {
  skill: HexaSkillDef;
  level: number;
  min?: number;
  desiredLevel?: number;
  cost: SkillCostSummary;
  onChange: (v: number) => void;
  onDesiredLevelChange?: (v: number) => void;
  theme: AppTheme;
  inputStyle: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 0",
      }}
    >
      <SkillIcon skill={skill} theme={theme} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: theme.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {skill.name}
        </div>
        <CostBadge cost={cost} theme={theme} compact />
        <SkillProgressBar level={level} max={desiredLevel} theme={theme} />
      </div>
      <LevelInput
        value={level}
        min={min}
        desiredValue={desiredLevel}
        onDesiredChange={onDesiredLevelChange}
        onChange={onChange}
        theme={theme}
        inputStyle={inputStyle}
      />
    </div>
  );
}

// ── Skill Section ────────────────────────────────────────────────────────────

export function SkillSection({
  title,
  skills,
  levels,
  minLevel,
  desiredLevels,
  sectionCost,
  onLevelChange,
  onDesiredLevelChange,
  theme,
  sectionPanel,
  inputStyle,
}: {
  title: string;
  skills: HexaSkillDef[];
  levels: number[];
  minLevel?: number;
  desiredLevels?: number[];
  sectionCost: SectionCost;
  onLevelChange: (idx: number, v: number) => void;
  onDesiredLevelChange?: (idx: number, v: number) => void;
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  inputStyle: React.CSSProperties;
}) {
  if (skills.length === 0) return null;

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <SectionHeader
        title={title}
        cost={skills.length > 1 ? sectionCost.total : undefined}
        theme={theme}
      />
      {skills.map((skill, i) => (
        <SkillRow
          key={skill.name}
          skill={skill}
          level={levels[i]}
          min={minLevel}
          desiredLevel={desiredLevels?.[i]}
          cost={sectionCost.perSkill[i]}
          onChange={(v) => onLevelChange(i, v)}
          onDesiredLevelChange={onDesiredLevelChange ? (v) => onDesiredLevelChange(i, v) : undefined}
          theme={theme}
          inputStyle={inputStyle}
        />
      ))}
    </div>
  );
}

// ── Mastery Section ─────────────────────────────────────────────────────

export function MasterySection({
  classDef,
  levels,
  desiredLevels,
  sectionCost,
  onLevelChange,
  onDesiredLevelChange,
  theme,
  sectionPanel,
  inputStyle,
}: {
  classDef: HexaClassDef;
  levels: number[];
  desiredLevels?: number[];
  sectionCost: SectionCost;
  onLevelChange: (idx: number, v: number) => void;
  onDesiredLevelChange?: (idx: number, v: number) => void;
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  inputStyle: React.CSSProperties;
}) {
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <SectionHeader
        title={`Mastery (${classDef.mastery.length} nodes)`}
        cost={sectionCost.total}
        theme={theme}
      />
      {classDef.mastery.map((nodeSkills, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
          <SkillIcon skill={nodeSkills[0]} theme={theme} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {nodeSkills.map((skill) => (
              <div
                key={skill.name}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: theme.text,
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {skill.name}
              </div>
            ))}
            <CostBadge cost={sectionCost.perSkill[i]} theme={theme} compact />
            <SkillProgressBar level={levels[i]} max={desiredLevels?.[i]} theme={theme} />
          </div>
          <LevelInput
            value={levels[i]}
            desiredValue={desiredLevels?.[i]}
            onDesiredChange={onDesiredLevelChange ? (v) => onDesiredLevelChange(i, v) : undefined}
            onChange={(v) => onLevelChange(i, v)}
            theme={theme}
            inputStyle={inputStyle}
          />
        </div>
      ))}
    </div>
  );
}
