"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { HexaClassDef, HexaMasteryNode, HexaSkillDef, HexaSkillLevels, HexaStatEntry, HexaStatSlot } from "../../../../features/tools/hexa-skills/hexa-classes";
import { findClassById, COMMON_SKILLS } from "../../../../features/tools/hexa-skills/hexa-classes";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import { HEXA_STAT_OPTIONS, getHexaStatBonus, getMainStatLabel, getAttackLabel } from "../data/hexaStatData";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import SetupStepFrame from "./SetupStepFrame";
import { HexaSkillIcon } from "../../../../components/ResourceImage";

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
// TODO: update with actual Hexa Stat entry max level once confirmed
const MAX_STAT_ENTRY_LEVEL = 10;

// hexa-skill ids from manifests/v268/hexa-skill.json (section: "hexaStat")
const HEXA_STAT_DEFS: HexaSkillDef[] = [
  { iconId: "50000000", name: "Hexa Stat I" },
  { iconId: "50000001", name: "Hexa Stat II" },
  { iconId: "50000002", name: "Hexa Stat III" },
];

function clamp(v: number, max = MAX_LEVEL): number {
  return Math.max(0, Math.min(max, Math.round(v) || 0));
}

function emptyEntry(): HexaStatEntry { return { type: "", level: 0 }; }
function emptySlot(): HexaStatSlot { return { main: emptyEntry(), alt: [emptyEntry(), emptyEntry()] }; }

function isSlotEmpty(slot: HexaStatSlot): boolean {
  return !slot.main.type && !slot.alt[0].type && !slot.alt[1].type &&
    slot.main.level === 0 && slot.alt[0].level === 0 && slot.alt[1].level === 0;
}

// Node 0 is always accessible (HEXA Matrix implies 6th job). Nodes 1 and 2 have character level gates.
function isNodeUnlocked(index: number, characterLevel: number): boolean {
  if (index === 1) return characterLevel >= 265;
  if (index === 2) return characterLevel >= 270;
  return true;
}

function lockHint(index: number): string {
  return index === 1 ? "Lv. 265" : "Lv. 270";
}

// Returns stat types that must be disabled for the main stat dropdown of the given slot.
// Rule 1: types already primary on another node. Rule 2: types already chosen as alts in this node.
function getMainDisabledTypes(
  hexaStat: [HexaStatSlot, HexaStatSlot, HexaStatSlot],
  slotIndex: number
): Set<string> {
  const slot = hexaStat[slotIndex];
  const disabled = new Set<string>();
  hexaStat.forEach((s, i) => { if (i !== slotIndex && s.main.type) disabled.add(s.main.type); });
  if (slot.alt[0].type) disabled.add(slot.alt[0].type);
  if (slot.alt[1].type) disabled.add(slot.alt[1].type);
  return disabled;
}

// Returns stat types that must be disabled for an alt stat dropdown.
// Rule 2: main + sibling alt in this node. Rule 3: types that already appear as alt on 2 other positions.
function getAltDisabledTypes(
  hexaStat: [HexaStatSlot, HexaStatSlot, HexaStatSlot],
  slotIndex: number,
  altIndex: number
): Set<string> {
  const slot = hexaStat[slotIndex];
  const siblingAlt = slot.alt[altIndex === 0 ? 1 : 0];
  const disabled = new Set<string>();
  if (slot.main.type) disabled.add(slot.main.type);
  if (siblingAlt.type) disabled.add(siblingAlt.type);
  // Count alt appearances excluding the current position
  const counts: Record<string, number> = {};
  hexaStat.forEach((s, si) => s.alt.forEach((a, ai) => {
    if ((si !== slotIndex || ai !== altIndex) && a.type) counts[a.type] = (counts[a.type] ?? 0) + 1;
  }));
  Object.entries(counts).forEach(([type, n]) => { if (n >= 2) disabled.add(type); });
  return disabled;
}

function parseEntry(raw: unknown): HexaStatEntry {
  if (!raw || typeof raw !== "object") return emptyEntry();
  const r = raw as Partial<HexaStatEntry>;
  return {
    type: typeof r.type === "string" ? r.type : "",
    level: Math.max(0, Math.min(MAX_STAT_ENTRY_LEVEL, Math.round(Number(r.level)) || 0)),
  };
}

function parseSlot(raw: unknown): HexaStatSlot {
  if (!raw || typeof raw !== "object") return emptySlot();
  const r = raw as Partial<HexaStatSlot>;
  const altRaw = Array.isArray(r.alt) ? r.alt : [];
  return { main: parseEntry(r.main), alt: [parseEntry(altRaw[0]), parseEntry(altRaw[1])] };
}

function emptyLevels(classDef: HexaClassDef): HexaSkillLevels {
  return {
    origin: 1,
    mastery: classDef.mastery.map(() => 0),
    enhancement: classDef.enhancement.map(() => 0),
    common: COMMON_SKILLS.map(() => 0),
    ascent: 0,
    hexaStat: [emptySlot(), emptySlot(), emptySlot()],
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
    const rawSlots = Array.isArray(parsed.hexaStat) ? parsed.hexaStat : [];
    return {
      origin: Math.max(1, clamp(Number(parsed.origin) || 1)),
      mastery: pad(parsed.mastery, classDef.mastery.length),
      enhancement: pad(parsed.enhancement, classDef.enhancement.length),
      common: pad(parsed.common, COMMON_SKILLS.length),
      ascent: clamp(Number(parsed.ascent) || 0),
      hexaStat: [parseSlot(rawSlots[0]), parseSlot(rawSlots[1]), parseSlot(rawSlots[2])],
    };
  } catch { return empty; }
}

function SkillIcon({ skill, size = 28 }: { skill: HexaSkillDef; size?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const src = skill.iconUrl ?? (skill.iconId !== "" ? resourceImageUrl("hexa-skill", skill.iconId, "icon.png") : null);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image src={src ?? ""} alt={skill.name} width={size} height={size} unoptimized
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

function LevelInput({ value, onChange, theme, min = 0, max = MAX_LEVEL }: { value: number; onChange: (v: number) => void; theme: AppTheme; min?: number; max?: number }) {
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
          const clamped = isNaN(v) ? min : Math.max(min, clamp(v, max));
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
      <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>/ {max}</span>
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

function SkillRow({ skill, level, onUpdate, theme, dimmed, min, max }: {
  skill: HexaSkillDef;
  level: number;
  onUpdate: (v: number) => void;
  theme: AppTheme;
  dimmed?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", opacity: dimmed ? 0.5 : 1 }}>
      <SkillIcon skill={skill} />
      <p style={{ margin: 0, flex: 1, fontSize: "0.82rem", fontWeight: 700, color: theme.text, minWidth: 0 }}>
        {skill.name}
      </p>
      <LevelInput value={level} onChange={onUpdate} theme={theme} min={min} max={max} />
    </div>
  );
}

function MasteryNodeRow({ node, level, onUpdate, theme }: {
  node: HexaMasteryNode;
  level: number;
  onUpdate: (v: number) => void;
  theme: AppTheme;
}) {
  const nodeAsSkill: HexaSkillDef = { iconId: node.iconId, iconUrl: node.iconUrl, name: node.skills[0] };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      <SkillIcon skill={nodeAsSkill} size={28} />
      <p style={{ margin: 0, flex: 1, fontSize: "0.78rem", fontWeight: 700, color: theme.text, minWidth: 0, lineHeight: 1.3 }}>
        {node.skills.join(" · ")}
      </p>
      <LevelInput value={level} onChange={onUpdate} theme={theme} />
    </div>
  );
}

function StatProgressBar({ level, theme }: { level: number; theme: AppTheme }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {Array.from({ length: MAX_STAT_ENTRY_LEVEL }, (_, i) => (
        <div key={i} style={{
          flex: 1,
          height: "3px",
          borderRadius: "2px",
          background: i < level ? theme.accent : theme.border,
          transition: "background 0.1s ease",
        }} />
      ))}
    </div>
  );
}

function HexaStatRow({ entry, onUpdate, theme, isPrimary, classId, mainStatLabel, attackLabel, isError, disabledTypes }: {
  entry: HexaStatEntry;
  onUpdate: (e: HexaStatEntry) => void;
  theme: AppTheme;
  isPrimary: boolean;
  classId: string;
  mainStatLabel: string;
  attackLabel: string;
  isError?: boolean;
  disabledTypes: Set<string>;
}) {
  const bonus = getHexaStatBonus(entry.type, entry.level, isPrimary, classId);
  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    border: `1px solid ${isError ? "#ef4444" : theme.border}`,
    borderRadius: "6px",
    background: theme.bg,
    color: entry.type ? theme.text : theme.muted,
    fontFamily: "inherit",
    fontSize: "0.82rem",
    fontWeight: 700,
    padding: "0.25rem 0.5rem",
    outline: "2px solid transparent",
    outlineOffset: "2px",
    transition: "outline-color 0.15s ease",
    cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <select
            value={entry.type}
            onChange={(e) => onUpdate({ ...entry, type: e.target.value })}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            style={selectStyle}
          >
            <option value="">Select stat...</option>
            {HEXA_STAT_OPTIONS.map((o) => {
              const dynamicLabels: Record<string, string> = { mainStat: mainStatLabel, attackPower: attackLabel };
              const label = dynamicLabels[o.value] ?? o.label;
              return <option key={o.value} value={o.value} disabled={disabledTypes.has(o.value)}>{label}</option>;
            })}
          </select>
          {bonus && (
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.accent, flexShrink: 0 }}>
              {bonus}
            </span>
          )}
        </div>
        <LevelInput value={entry.level} onChange={(v) => onUpdate({ ...entry, level: v })} theme={theme} max={MAX_STAT_ENTRY_LEVEL} />
      </div>
      <StatProgressBar level={entry.level} theme={theme} />
    </div>
  );
}

export default function HexaMatrixSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", direction = "forward",
  confirmedCharacterName, characterLevel, value, onChange, onBack, onNext, onFinish,
}: HexaMatrixSetupStepProps) {
  const classData = getClassDataByNexonJobName(jobName);
  const hexaClassId = classData?.id === "sia_astelle" ? "sia" : classData?.id;
  const classDef = hexaClassId ? findClassById(hexaClassId) : null;
  const initialValueRef = useRef(value);

  const [substep, setSubstep] = useState(() => direction === "backward" ? 1 : 0);
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);

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

  function goToSubstep(next: number) {
    setHasSubstepSwitched(true);
    setSubstepDirection(next > substep ? "forward" : "backward");
    setSubstep(next);
  }

  const substepAnimStyle: React.CSSProperties = hasSubstepSwitched ? {
    animationName: substepDirection === "forward" ? "setupStepSlideForward" : "setupStepSlideBackward",
    animationDuration: "var(--characters-standard)",
    animationTimingFunction: "ease",
    animationFillMode: "both",
  } : {};

  const levels = parseDraft(value, classDef);
  const hexaStat = levels.hexaStat ?? [emptySlot(), emptySlot(), emptySlot()];

  function update(patch: Partial<HexaSkillLevels>) {
    onChange(JSON.stringify({ ...levels, ...patch }));
  }

  if (substep === 0) {
    return (
      <div key={0} style={substepAnimStyle}>
        <SetupStepFrame theme={theme} stepLabel={classDef.className === "Sia" ? "Erda Link" : step.label} stepNumber={stepNumber} totalSteps={totalSteps}
          description="All fields are optional. Fill in what you know."
          onBack={onBack} onNext={() => goToSubstep(1)} onFinish={onFinish}
          nextLabel="Continue"
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
        </SetupStepFrame>
      </div>
    );
  }

  const charLevel = characterLevel ?? Infinity;
  const slot = hexaStat[activeSlot];
  const mainDisabled = getMainDisabledTypes(hexaStat, activeSlot);
  const altDisabled: [Set<string>, Set<string>] = [
    getAltDisabledTypes(hexaStat, activeSlot, 0),
    getAltDisabledTypes(hexaStat, activeSlot, 1),
  ];
  const mainError = !!slot.main.type && mainDisabled.has(slot.main.type);
  const altErrors: [boolean, boolean] = [
    !!slot.alt[0].type && altDisabled[0].has(slot.alt[0].type),
    !!slot.alt[1].type && altDisabled[1].has(slot.alt[1].type),
  ];
  const primaryStat = classData?.requiredStats[0] ?? "";
  const mainStatLabel = getMainStatLabel(classData?.id ?? "", primaryStat);
  const attackLabel = getAttackLabel(primaryStat);

  function setSlot(s: HexaStatSlot) {
    const next: [HexaStatSlot, HexaStatSlot, HexaStatSlot] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    next[activeSlot] = s;
    update({ hexaStat: next });
  }

  return (
    <div key={1} style={substepAnimStyle}>
      <SetupStepFrame theme={theme} stepLabel="HEXA Stat" stepNumber={stepNumber} totalSteps={totalSteps}
        description="All fields are optional. Fill in what you know."
        onBack={() => goToSubstep(0)} onNext={onNext} onFinish={onFinish}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
            {HEXA_STAT_DEFS.map((def, i) => {
              const locked = !isNodeUnlocked(i, charLevel);
              const hint = locked ? lockHint(i) : null;
              const isActive = activeSlot === i && !locked;
              const iconDisabled = locked || isSlotEmpty(hexaStat[i]);
              const tabStyle: React.CSSProperties = {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                border: `2px solid ${isActive ? theme.accent : theme.border}`,
                borderRadius: "8px",
                padding: "3px",
                background: "transparent",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.5 : 1,
                transition: "border-color 0.15s ease, opacity 0.15s ease",
              };
              return (
                <div key={i}
                  onClick={locked ? undefined : () => setActiveSlot(i)}
                  role={locked ? undefined : "button"}
                  tabIndex={locked ? undefined : 0}
                  onKeyDown={locked ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") setActiveSlot(i); }}
                  style={tabStyle}
                >
                  <HexaSkillIcon id={def.iconId} size={36} disabled={iconDisabled} />
                  {hint && (
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: theme.muted, lineHeight: 1 }}>
                      {hint}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <SectionLabel label="Main Stat" theme={theme} />
            <HexaStatRow entry={slot.main} theme={theme} isPrimary={true} isError={mainError}
              disabledTypes={mainDisabled}
              classId={classData?.id ?? ""} mainStatLabel={mainStatLabel} attackLabel={attackLabel}
              onUpdate={(e) => setSlot({ ...slot, main: e })} />
          </div>

          <div>
            <SectionLabel label="Alternative Stats" theme={theme} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {slot.alt.map((entry, i) => (
                <HexaStatRow key={i} entry={entry} theme={theme} isPrimary={false} isError={altErrors[i]}
                  disabledTypes={altDisabled[i]}
                  classId={classData?.id ?? ""} mainStatLabel={mainStatLabel} attackLabel={attackLabel}
                  onUpdate={(e) => {
                    const newAlt: [HexaStatEntry, HexaStatEntry] = [slot.alt[0], slot.alt[1]];
                    newAlt[i] = e;
                    setSlot({ ...slot, alt: newAlt });
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </SetupStepFrame>
    </div>
  );
}
