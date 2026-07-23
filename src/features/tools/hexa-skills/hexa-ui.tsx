"use client";

import { useRef } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { resourceImageUrl } from "../../../lib/mapleResource";
import { replaceZeroOnDigit, replaceOneOnDigit } from "../numberInputHandlers";
import { ToolNumberInput } from "../shared-ui";
import type { HexaSkillDef, HexaClassDef } from "./hexa-classes";
import type { SkillCostSummary, SectionCost } from "./useHexaSkillsState";
import { MAX_SKILL_LEVEL } from "./hexa-costs";
import { fmtNum } from "./hexa-format";

// ── Skill Icon ───────────────────────────────────────────────────────────────

const skillIconFallbackBase: React.CSSProperties = {
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  flexShrink: 0,
};

const skillIconImgBase: React.CSSProperties = {
  borderRadius: "6px",
  objectFit: "cover",
  flexShrink: 0,
};

const skillNameOverflow: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const masteryNameStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  lineHeight: 1.4,
  ...skillNameOverflow,
};

// Renders the in-game HEXA Matrix icon (haku.network `hexa-skill` id), or an `iconUrl`
// override when no id exists yet. A missing icon or load error falls back to the initial.
export function SkillIcon({ iconId, iconUrl, name, theme, size = 32 }: { iconId: string; iconUrl?: string; name: string; theme: AppTheme; size?: number }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const src = iconUrl ?? (iconId !== "" ? resourceImageUrl("hexa-skill", iconId, "icon.png") : null);

  return (
    <>
      {src && (
        <Image
          ref={imgRef}
          src={src}
          alt={name}
          width={size}
          height={size}
          unoptimized
          onError={() => {
            if (imgRef.current) imgRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "flex";
          }}
          style={{
            ...skillIconImgBase,
            background: theme.panel,
            border: `1px solid ${theme.border}`,
          }}
        />
      )}
      <div
        ref={fallbackRef}
        style={{
          ...skillIconFallbackBase,
          display: src ? "none" : "flex",
          width: size,
          height: size,
          background: theme.accentSoft,
          border: `1px solid ${theme.border}`,
          fontSize: size * 0.35,
          color: theme.accentText,
        }}
      >
        {name.charAt(0)}
      </div>
    </>
  );
}

// ── Cost Badge ───────────────────────────────────────────────────────────────

function CostBadge({ cost, theme }: { cost: SkillCostSummary; theme: AppTheme }) {
  if (cost.solErda === 0 && cost.fragments === 0) {
    return (
      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.accentText }}>
        MAXED
      </span>
    );
  }

  // 0.75rem (12px) is the floor; the old compact 0.68rem read below it.
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
      <span style={{ color: theme.accentText, fontWeight: 800 }}>{fmtNum(cost.solErda)}</span>
      {" Sol Erda  "}
      <span style={{ color: theme.accentText, fontWeight: 800 }}>{fmtNum(cost.fragments)}</span>
      {" Fragments"}
    </span>
  );
}

// ── Level Input ──────────────────────────────────────────────────────────────

const levelInputOverride: React.CSSProperties = {
  textAlign: "center",
  padding: "4px 4px",
  fontSize: "0.75rem",
};

function LevelInput({
  skillName,
  value,
  min = 0,
  desiredValue,
  onDesiredChange,
  onChange,
  theme,
  inputStyle,
}: {
  /** Names the pair of spinbuttons, which otherwise read as two anonymous
   *  numbers separated by a slash. */
  skillName: string;
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
  // Origin starts at level 1, so its resting value is "1"; everything else rests at "0".
  const replaceBaseOnDigit = min === 1 ? replaceOneOnDigit : replaceZeroOnDigit;

  // The two levels are a range: a desired level under the current one has no
  // cost, which used to render as a spurious "MAXED". Reconcile on blur rather
  // than per keystroke, using the value the blur just committed — the prop can
  // be a render behind it.
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
      <span aria-hidden="true" style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>Lv</span>
      <ToolNumberInput
        min={min}
        max={MAX_SKILL_LEVEL}
        integer
        value={value}
        aria-label={`${skillName} current level`}
        onKeyDown={replaceBaseOnDigit}
        onCommit={onChange}
        onCommittedBlur={(v) => {
          if (hasDesired && desiredValue < v) onDesiredChange(v);
        }}
        style={{ ...inputStyle, ...levelInputOverride, width: w }}
      />
      {hasDesired && (
        <>
          <span aria-hidden="true" style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>/</span>
          <ToolNumberInput
            min={min}
            max={MAX_SKILL_LEVEL}
            integer
            value={desiredValue}
            aria-label={`${skillName} desired level`}
            onKeyDown={replaceBaseOnDigit}
            onCommit={onDesiredChange}
            onCommittedBlur={(v) => {
              if (v < value) onDesiredChange(value);
            }}
            style={{ ...inputStyle, ...levelInputOverride, width: w }}
          />
        </>
      )}
    </div>
  );
}

// ── Skill Progress Bar ──────────────────────────────────────────────────────

/** Fill is progress toward the *desired* level, so an untouched skill with no
 *  target reads as empty rather than complete. */
function SkillProgressBar({ level, max = MAX_SKILL_LEVEL, theme }: { level: number; max?: number; theme: AppTheme }) {
  const pct = max > 0 ? Math.min(100, (level / max) * 100) : 0;
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
          width: "100%",
          background: theme.accent,
          borderRadius: "2px",
          transform: `scaleX(${pct / 100})`,
          transformOrigin: "left",
          transition: "transform 0.25s ease",
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
      <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
        {title}
      </h2>
      {cost && <CostBadge cost={cost} theme={theme} />}
    </div>
  );
}

// ── Skill Row ────────────────────────────────────────────────────────────────

function SkillRow({
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
      <SkillIcon iconId={skill.iconId} iconUrl={skill.iconUrl} name={skill.name} theme={theme} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...skillNameOverflow,
            fontSize: "0.82rem",
            fontWeight: 700,
            color: theme.text,
          }}
        >
          {skill.name}
        </div>
        <CostBadge cost={cost} theme={theme} />
        <SkillProgressBar level={level} max={desiredLevel} theme={theme} />
      </div>
      <LevelInput
        skillName={skill.name}
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
      {classDef.mastery.map((node, i) => (
        <div key={node.skills[0]} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0" }}>
          <SkillIcon iconId={node.iconId} iconUrl={node.iconUrl} name={node.skills[0]} theme={theme} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {node.skills.map((skillName) => (
              <div
                key={skillName}
                style={{ ...masteryNameStyle, color: theme.text }}
              >
                {skillName}
              </div>
            ))}
            <CostBadge cost={sectionCost.perSkill[i]} theme={theme} />
            <SkillProgressBar level={levels[i]} max={desiredLevels?.[i]} theme={theme} />
          </div>
          <LevelInput
            skillName={node.skills.join(", ")}
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
