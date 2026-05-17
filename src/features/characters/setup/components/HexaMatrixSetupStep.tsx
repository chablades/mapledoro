"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { HexaClassDef, HexaSkillDef, HexaSkillLevels } from "../../../../features/tools/hexa-skills/hexa-classes";
import { findClassById, COMMON_SKILLS } from "../../../../features/tools/hexa-skills/hexa-classes";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import SetupStepFrame from "./SetupStepFrame";
import { WikiAttribution } from "../../../../components/WikiAttribution";

interface HexaMatrixSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  direction?: "forward" | "backward";
  characterRoster?: import("../../model/charactersStore").StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldLinkSkills?: string;
  characterLevel?: number;
  confirmedCharacterName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const MAX_LEVEL = 30;

function clamp(v: number): number {
  return Math.max(0, Math.min(MAX_LEVEL, Math.round(v) || 0));
}

function emptyLevels(classDef: HexaClassDef): HexaSkillLevels {
  return {
    origin: 1,
    mastery: classDef.mastery.map(() => 0),
    enhancement: classDef.enhancement.map(() => 0),
    common: COMMON_SKILLS.map(() => 0),
    ascent: 0,
  };
}

function parseDraft(raw: string, classDef: HexaClassDef): HexaSkillLevels {
  const empty = emptyLevels(classDef);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<HexaSkillLevels>;
    if (!parsed || typeof parsed !== "object") return empty;
    const pad = (arr: unknown, len: number): number[] => {
      const a = Array.isArray(arr) ? arr : [];
      const result = a.slice(0, len).map((v) => clamp(Number(v)));
      while (result.length < len) result.push(0);
      return result;
    };
    return {
      origin: Math.max(1, clamp(Number(parsed.origin) || 1)),
      mastery: pad(parsed.mastery, classDef.mastery.length),
      enhancement: pad(parsed.enhancement, classDef.enhancement.length),
      common: pad(parsed.common, COMMON_SKILLS.length),
      ascent: clamp(Number(parsed.ascent) || 0),
    };
  } catch { return empty; }
}

function SkillIcon({ skill, size = 28 }: { skill: HexaSkillDef; size?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image src={skill.icon} alt={skill.name} width={size} height={size} unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "block";
          }}
          style={{ borderRadius: "5px", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none", width: size, height: size, borderRadius: "5px", flexShrink: 0 }} />
    </>
  );
}

function LevelInput({ value, onChange, theme, min = 0 }: { value: number; onChange: (v: number) => void; theme: AppTheme; min?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : String(value)}
        placeholder={String(min)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => {
          e.currentTarget.style.outlineColor = "transparent";
          const v = parseInt(e.currentTarget.value, 10);
          const clamped = isNaN(v) ? min : Math.max(min, clamp(v));
          onChange(clamped);
        }}
        style={{
          width: "2.2rem",
          border: `1px solid ${theme.border}`,
          borderRadius: "6px",
          background: theme.bg,
          color: theme.text,
          fontFamily: "inherit",
          fontSize: "0.82rem",
          fontWeight: 700,
          padding: "0.25rem 0.35rem",
          textAlign: "center",
          outline: "2px solid transparent",
          outlineOffset: "2px",
          transition: "outline-color 0.15s ease",
        }}
      />
      <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>/ {MAX_LEVEL}</span>
    </div>
  );
}

function SectionLabel({ label, theme }: { label: string; theme: AppTheme }) {
  return (
    <p style={{
      margin: 0,
      marginBottom: "0.45rem",
      fontSize: "0.75rem",
      fontWeight: 800,
      color: theme.muted,
      letterSpacing: "0.05em",
      textTransform: "uppercase" as const,
      paddingBottom: "0.25rem",
      borderBottom: `1px solid ${theme.border}`,
    }}>
      {label}
    </p>
  );
}

function SkillRow({ skill, level, onUpdate, theme, dimmed, min }: {
  skill: HexaSkillDef;
  level: number;
  onUpdate: (v: number) => void;
  theme: AppTheme;
  dimmed?: boolean;
  min?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", opacity: dimmed ? 0.5 : 1 }}>
      <SkillIcon skill={skill} />
      <p style={{ margin: 0, flex: 1, fontSize: "0.82rem", fontWeight: 700, color: theme.text, minWidth: 0 }}>
        {skill.name}
      </p>
      <LevelInput value={level} onChange={onUpdate} theme={theme} min={min} />
    </div>
  );
}

function MasteryNodeRow({ node, level, onUpdate, theme }: {
  node: HexaSkillDef[];
  level: number;
  onUpdate: (v: number) => void;
  theme: AppTheme;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <SkillIcon skill={node[0]} size={28} />
      <p style={{ margin: 0, flex: 1, fontSize: "0.78rem", fontWeight: 700, color: theme.text, minWidth: 0, lineHeight: 1.3 }}>
        {node.map((s) => s.name).join(" · ")}
      </p>
      <LevelInput value={level} onChange={onUpdate} theme={theme} />
    </div>
  );
}

export default function HexaMatrixSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", direction = "forward",
  confirmedCharacterName, value, onChange, onBack, onNext, onFinish,
}: HexaMatrixSetupStepProps) {
  const classData = getClassDataByNexonJobName(jobName);
  const hexaClassId = classData?.id === "sia_astelle" ? "sia" : classData?.id;
  const classDef = hexaClassId ? findClassById(hexaClassId) : null;
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (initialValueRef.current) return;
    if (!classDef || !confirmedCharacterName) return;
    const saved = readCharacterToolData<{ levels?: HexaSkillLevels }>(confirmedCharacterName, "hexaSkills");
    if (saved?.levels) {
      onChange(JSON.stringify(saved.levels));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!classDef) {
    return (
      <SetupStepFrame theme={theme} stepLabel={step.label} stepNumber={stepNumber} totalSteps={totalSteps}
        description="Hexa Matrix data is not available for this class yet."
        onBack={onBack} onNext={onNext} onFinish={onFinish}
      >
        <p style={{ margin: 0, fontSize: "0.85rem", color: theme.muted, fontWeight: 700 }}>
          No data available for {jobName || "this class"}.
        </p>
      </SetupStepFrame>
    );
  }

  const levels = parseDraft(value, classDef);
  const [substepAnimStyle] = [direction === "backward"
    ? { animationName: "setupStepSlideBackward", animationDuration: "var(--characters-standard)", animationTimingFunction: "ease", animationFillMode: "both" as const }
    : { animationName: "setupStepSlideForward", animationDuration: "var(--characters-standard)", animationTimingFunction: "ease", animationFillMode: "both" as const }
  ];

  function update(patch: Partial<HexaSkillLevels>) {
    onChange(JSON.stringify({ ...levels, ...patch }));
  }

  return (
    <div style={substepAnimStyle}>
      <SetupStepFrame theme={theme} stepLabel={classDef.className === "Sia" ? "Erda Link" : step.label} stepNumber={stepNumber} totalSteps={totalSteps}
        description="All fields are optional. Fill in what you know."
        onBack={onBack} onNext={onNext} onFinish={onFinish}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div>
            <SectionLabel label="Origin" theme={theme} />
            <SkillRow skill={classDef.origin} level={levels.origin}
              onUpdate={(v) => update({ origin: v })} theme={theme} min={1} />
          </div>

          <div>
            <SectionLabel label="Mastery" theme={theme} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {classDef.mastery.map((node, i) => (
                <MasteryNodeRow key={i} node={node} level={levels.mastery[i] ?? 0}
                  onUpdate={(v) => {
                    const next = [...levels.mastery];
                    next[i] = v;
                    update({ mastery: next });
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel label="Enhancement" theme={theme} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {classDef.enhancement.map((skill, i) => (
                <SkillRow key={skill.name} skill={skill} level={levels.enhancement[i] ?? 0}
                  onUpdate={(v) => {
                    const next = [...levels.enhancement];
                    next[i] = v;
                    update({ enhancement: next });
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>

          {classDef.ascent && (
            <div>
              <SectionLabel label="Ascent" theme={theme} />
              <SkillRow skill={classDef.ascent} level={levels.ascent}
                onUpdate={(v) => update({ ascent: v })} theme={theme} />
            </div>
          )}

          <div>
            <SectionLabel label="Common" theme={theme} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {COMMON_SKILLS.map((skill, i) => (
                <SkillRow key={skill.name} skill={skill} level={levels.common[i] ?? 0}
                  onUpdate={(v) => {
                    const next = [...levels.common];
                    next[i] = v;
                    update({ common: next });
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>

        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <WikiAttribution theme={theme} subject="Skill icons" />
        </div>
      </SetupStepFrame>
    </div>
  );
}
