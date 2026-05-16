"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import SetupStepFrame from "./SetupStepFrame";
import {
  CLASS_SKILL_DATA,
  UNIVERSAL_BUFF_SKILLS,
  UNIVERSAL_WARNINGS,
  getRequiredStatsForClass,
  type BuffSkill,
  type ClassSetupOptionsDef,
  type ClassSkillData,
  type ClassWarning,
} from "../data/classSkillData";
import { TRIPLE_STAT_FIELDS, type StatFieldId, type TripleStatFieldId } from "../data/statFields";
import {
  parseStatsStepDraft,
  serializeStatsStepDraft,
  type StatsStepDraft,
  type TripleStatDraft,
} from "../data/statsStepDraft";

interface StatsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIPLE_IDS = new Set<string>(TRIPLE_STAT_FIELDS.map((f) => f.id));

const TRIPLE_LABELS: Record<TripleStatFieldId, string> = {
  str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "HP",
  attackPower: "Attack Power", magicAtt: "Magic ATT",
};

const COMBAT_LEFT: StatFieldId[] = [
  "ignoreDefense", "cooldownReduction", "cooldownSkip", "additionalStatusDamage",
];
const COMBAT_RIGHT: StatFieldId[] = [
  "damage", "bossDamage", "criticalRate", "criticalDamage", "buffDuration", "ignoreElementalResistance", "summonDuration",
];

// Stats where the value is a raw number, not a percentage
const RAW_VALUE_STAT_IDS = new Set<StatFieldId>(["arcanePower", "sacredPower"]);

const STAT_LABELS: Partial<Record<StatFieldId, string>> = {
  damage: "Damage",
  bossDamage: "Boss Damage",
  ignoreDefense: "Ignore DEF",
  criticalRate: "Critical Rate",
  criticalDamage: "Critical Damage",
  buffDuration: "Buff Duration",
  cooldownReduction: "Cooldown Reduction",
  cooldownSkip: "Cooldown Not Applied",
  ignoreElementalResistance: "Ignore Elem. Resist.",
  additionalStatusDamage: "Status Damage",
  summonDuration: "Summons Duration",
  arcanePower: "Arcane Power",
  sacredPower: "Sacred Power",
};

// ── Styles ────────────────────────────────────────────────────────────────────

function statInputStyle(theme: AppTheme, width?: string): CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: "7px",
    background: theme.bg,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: "0.82rem",
    fontWeight: 600,
    padding: "0.3rem 0.4rem",
    outline: "2px solid transparent",
    outlineOffset: "2px",
    transition: "outline-color 0.15s ease",
    width: width ?? "100%",
    boxSizing: "border-box" as const,
  };
}

function sectionLabelStyle(theme: AppTheme): CSSProperties {
  return {
    margin: 0,
    marginBottom: "0.45rem",
    fontSize: "0.75rem",
    fontWeight: 800,
    color: theme.muted,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    paddingBottom: "0.25rem",
    borderBottom: `1px solid ${theme.border}`,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const JOB_ORDINALS: Record<string, string> = {
  "1": "1st Job", "2": "2nd Job", "3": "3rd Job", "4": "4th Job", "5": "5th Job",
};

function formatJobAdvancement(raw: string): string {
  return JOB_ORDINALS[raw] ?? raw;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkillIconBadge({ skill, theme }: { skill: BuffSkill; theme: AppTheme }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const iconUrl = skill.skillIconUrl;
  const placeholder = (
    <div style={{ width: 32, height: 32, borderRadius: "4px", background: theme.border }} />
  );
  return (
    <div
      title={`${skill.skillName} — ${formatJobAdvancement(skill.jobAdvancement)}`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem" }}
    >
      {iconUrl ? (
        <>
          <div ref={wrapperRef} style={{ width: 32, height: 32, borderRadius: "4px", overflow: "hidden" }}>
            <Image
              src={iconUrl!}
              alt={skill.skillName}
              width={32}
              height={32}
              onError={() => {
                if (wrapperRef.current) wrapperRef.current.style.display = "none";
                if (fallbackRef.current) fallbackRef.current.style.display = "block";
              }}
              style={{ borderRadius: "4px", display: "block" }}
              unoptimized
            />
          </div>
          <div ref={fallbackRef} style={{ display: "none", width: 32, height: 32, borderRadius: "4px", background: theme.border }} />
        </>
      ) : placeholder}
      <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
        {skill.skillName}
      </span>
    </div>
  );
}

function WarningList({ warnings }: { warnings: ClassWarning[] }) {
  if (!warnings.length) return null;

  const doNotUse = warnings.filter((w) => w.skill && w.message === "Do not use");
  const others = warnings.filter((w) => !(w.skill && w.message === "Do not use"));

  return (
    <div style={{
      marginBottom: "0.8rem",
      background: "rgba(217, 119, 6, 0.08)",
      border: "1px solid rgba(217, 119, 6, 0.35)",
      borderRadius: "10px",
      padding: "0.65rem 0.85rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
    }}>
      {others.map((w, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#d97706", flexShrink: 0 }}>⚠</span>
          <span style={{ fontSize: "0.82rem", color: "#d97706", fontWeight: 700, flex: 1 }}>{w.message}</span>
          {w.skill?.skillIconUrl && (
            <div title={`${w.skill.skillName} — ${formatJobAdvancement(w.skill.jobAdvancement)}`} style={{ flexShrink: 0 }}>
              <Image src={w.skill.skillIconUrl} alt={w.skill.skillName} width={28} height={28} style={{ borderRadius: "5px", display: "block" }} unoptimized />
            </div>
          )}
        </div>
      ))}
      {doNotUse.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.45rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#d97706", flexShrink: 0 }}>⚠</span>
            <span style={{ fontSize: "0.82rem", color: "#d97706", fontWeight: 700 }}>Do not use the following skills:</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            {doNotUse.map((w, i) => w.skill && (
              <div
                key={i}
                title={`${w.skill.skillName} — ${formatJobAdvancement(w.skill.jobAdvancement)}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}
              >
                {w.skill.skillIconUrl && (
                  <Image src={w.skill.skillIconUrl} alt={w.skill.skillName} width={36} height={36} style={{ borderRadius: "6px", display: "block" }} unoptimized />
                )}
                <span style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: 700, textAlign: "center", lineHeight: 1.2, maxWidth: "4.5rem" }}>
                  {w.skill.skillName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BuffGuide({ classData, theme }: { classData: ClassSkillData | null; theme: AppTheme }) {
  const allSkills = [...UNIVERSAL_BUFF_SKILLS, ...(classData?.buffSkills ?? [])];
  return (
    <div style={{
      marginBottom: "0.8rem",
      background: "rgba(22, 163, 74, 0.07)",
      border: "1px solid rgba(22, 163, 74, 0.35)",
      borderRadius: "10px",
      padding: "0.65rem 0.85rem",
    }}>
      <p style={{ margin: 0, marginBottom: "0.5rem", fontSize: "0.82rem", color: "#16a34a", fontWeight: 700 }}>
        Activate these buffs before entering stats:
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        {allSkills.map((skill, i) => (
          <SkillIconBadge key={i} skill={skill} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function TripleStatRow({
  id, draft, onUpdate, theme,
}: {
  id: TripleStatFieldId;
  draft: StatsStepDraft;
  onUpdate: (id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) => void;
  theme: AppTheme;
}) {
  const d: TripleStatDraft = draft[id] ?? { base: "", percent: "", percentUnapplied: "" };
  const sub = statInputStyle(theme);
  return (
    <div>
      <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
        {TRIPLE_LABELS[id]}
      </p>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        <div style={{ flex: 2 }}>
          <input type="text" value={d.base} placeholder="0" style={sub}
            onChange={(e) => onUpdate(id, "base", e.target.value)}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          />
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>Base Value</p>
        </div>
        <div style={{ flex: 1.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
            <input type="text" value={d.percent} placeholder="0" style={sub}
              onChange={(e) => onUpdate(id, "percent", e.target.value)}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            />
            <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, flexShrink: 0 }}>%</span>
          </div>
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>% Value</p>
        </div>
        <div style={{ flex: 1.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
            <input type="text" value={d.percentUnapplied} placeholder="0" style={sub}
              onChange={(e) => onUpdate(id, "percentUnapplied", e.target.value)}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            />
            <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, flexShrink: 0 }}>%</span>
          </div>
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>% Not Applied</p>
        </div>
      </div>
    </div>
  );
}

function CombatStatCell({
  id, draft, onUpdate, onUpdateCooldown, theme,
}: {
  id: StatFieldId;
  draft: StatsStepDraft;
  onUpdate: (id: string, val: string) => void;
  onUpdateCooldown: (field: "seconds" | "percent", val: string) => void;
  theme: AppTheme;
}) {
  const label = STAT_LABELS[id] ?? id;

  if (id === "cooldownReduction") {
    const cd = draft.cooldownReduction ?? { seconds: "", percent: "" };
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
        <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input type="text" value={cd.seconds} placeholder="0" style={statInputStyle(theme, "2.6rem")}
            onChange={(e) => onUpdateCooldown("seconds", e.target.value)}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          />
          <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>s</span>
          <input type="text" value={cd.percent} placeholder="0" style={statInputStyle(theme, "2.6rem")}
            onChange={(e) => onUpdateCooldown("percent", e.target.value)}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          />
          <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>%</span>
        </div>
      </div>
    );
  }

  const raw = (draft as Record<string, unknown>)[id];
  const val = typeof raw === "string" ? raw : "";
  const isRaw = RAW_VALUE_STAT_IDS.has(id);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
        <input type="text" value={val} placeholder="0" style={statInputStyle(theme, "4rem")}
          onChange={(e) => onUpdate(id, e.target.value)}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
          onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        />
        {!isRaw && <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, flexShrink: 0 }}>%</span>}
      </div>
    </div>
  );
}

// ── Setup options section ─────────────────────────────────────────────────────

function QuestionToggle({
  question, options, value, onToggle, theme,
}: {
  question: string;
  options: { value: string; label: string }[];
  value: string | null;
  /** Clicking the active option deselects it (returns null). */
  onToggle: (value: string | null) => void;
  theme: AppTheme;
}) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <p style={{ margin: 0, marginBottom: "0.4rem", fontSize: "0.88rem", fontWeight: 800, color: theme.text }}>
        {question}
      </p>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(active ? null : opt.value)}
              style={{
                border: `1px solid ${active ? theme.accent : theme.border}`,
                borderRadius: "9px",
                background: active ? `${theme.accent}22` : theme.bg,
                color: active ? theme.accent : theme.text,
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: "0.85rem",
                padding: "0.4rem 0.85rem",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SetupOptionsSection({
  optsDef, draft, onUpdate, theme,
}: {
  optsDef: ClassSetupOptionsDef | undefined;
  draft: StatsStepDraft;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  theme: AppTheme;
}) {
  const opts = draft.setupOptions ?? {};
  const isDA = Boolean(optsDef?.ephinEaSoul);

  let soulValue: string | null = null;
  if (opts.soulType === "mugong") soulValue = "mugong";
  else if (opts.soulType === "none") soulValue = "none";
  if (isDA) {
    if (opts.soulType === "ephinea" && opts.ephineaLevel === 1) soulValue = "ephinea_1";
    else if (opts.soulType === "ephinea" && opts.ephineaLevel === 2) soulValue = "ephinea_2";
  }

  function handleSoulToggle(val: string | null) {
    if (val === null) onUpdate({ soulType: undefined, ephineaLevel: undefined });
    else if (val === "none") onUpdate({ soulType: "none", ephineaLevel: undefined });
    else if (val === "mugong") onUpdate({ soulType: "mugong", ephineaLevel: undefined });
    else if (val === "ephinea_1") onUpdate({ soulType: "ephinea", ephineaLevel: 1 });
    else if (val === "ephinea_2") onUpdate({ soulType: "ephinea", ephineaLevel: 2 });
  }

  const soulOptions = isDA
    ? [
        { value: "none", label: "None" },
        { value: "ephinea_1", label: "Ephinea Lv 1" },
        { value: "ephinea_2", label: "Ephinea Lv 2" },
        { value: "mugong", label: "Mu Gong Soul" },
      ]
    : [{ value: "none", label: "None" }, { value: "mugong", label: "Mu Gong Soul" }];

  function boolToYesNo(val: boolean | undefined): string | null {
    if (val === true) return "yes";
    if (val === false) return "no";
    return null;
  }

  function yesNoToBool(val: string | null): boolean | undefined {
    if (val === "yes") return true;
    if (val === "no") return false;
    return undefined;
  }

  return (
    <div>
      <QuestionToggle
        question="Are you Genesis Liberated?"
        options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
        value={boolToYesNo(opts.isLiberated ?? undefined)}
        onToggle={(v) => onUpdate({ isLiberated: yesNoToBool(v) })}
        theme={theme}
      />
      {optsDef?.weaponType && (
        <QuestionToggle
          question="What weapon type are you using?"
          options={[{ value: "1h", label: "One-Handed" }, { value: "2h", label: "Two-Handed" }]}
          value={opts.weaponHand ?? null}
          onToggle={(v) => onUpdate({ weaponHand: (v as "1h" | "2h") ?? undefined })}
          theme={theme}
        />
      )}
      <QuestionToggle
        question="Do you use any of these souls?"
        options={soulOptions}
        value={soulValue}
        onToggle={handleSoulToggle}
        theme={theme}
      />
      {optsDef?.ruinForceShield && (
        <QuestionToggle
          question="Do you have a Ruin Force Shield equipped?"
          options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
          value={boolToYesNo(opts.hasRuinForceShield ?? undefined)}
          onToggle={(v) => onUpdate({ hasRuinForceShield: yesNoToBool(v) })}
          theme={theme}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", value, onChange, onBack, onNext, onFinish,
}: StatsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const draft = parseStatsStepDraft(value);

  function updateDraft(patch: Partial<StatsStepDraft>) {
    onChange(serializeStatsStepDraft({ ...draft, ...patch }));
  }

  function handleTripleUpdate(id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) {
    const existing = draft[id] ?? { base: "", percent: "", percentUnapplied: "" };
    updateDraft({ [id]: { ...existing, [field]: val } });
  }

  function handleSingleUpdate(id: string, val: string) {
    updateDraft({ [id]: val } as Partial<StatsStepDraft>);
  }

  function handleCooldownUpdate(field: "seconds" | "percent", val: string) {
    const cd = draft.cooldownReduction ?? { seconds: "", percent: "" };
    updateDraft({ cooldownReduction: { ...cd, [field]: val } });
  }

  function handleSetupOptUpdate(patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) {
    updateDraft({ setupOptions: { ...(draft.setupOptions ?? {}), ...patch } });
  }

  const [substep, setSubstep] = useState(0);

  const tripleIds = classData
    ? getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id))
    : [];

  if (substep === 0) {
    return (
      <SetupStepFrame
        theme={theme}
        stepLabel={step.label}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        description="Configure your character before entering stats."
        onBack={onBack}
        onNext={() => setSubstep(1)}
        onFinish={onFinish}
        nextLabel="Continue"
      >
        <SetupOptionsSection optsDef={classData?.setupOptionsDef} draft={draft} onUpdate={handleSetupOptUpdate} theme={theme} />
      </SetupStepFrame>
    );
  }

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="All fields are optional. Fill in what you know."
      onBack={() => setSubstep(0)}
      onNext={onNext}
      onFinish={onFinish}
    >
      <WarningList warnings={[...UNIVERSAL_WARNINGS, ...(classData?.warnings ?? [])]} />
      <BuffGuide classData={classData ?? null} theme={theme} />
      {tripleIds.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <p style={sectionLabelStyle(theme)}>Basic Stats</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {tripleIds.map((id) => (
              <TripleStatRow key={id} id={id} draft={draft} onUpdate={handleTripleUpdate} theme={theme} />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "0.75rem" }}>
        <p style={sectionLabelStyle(theme)}>Combat Stats</p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_LEFT.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} />
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_RIGHT.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <p style={sectionLabelStyle(theme)}>Symbols</p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {(["arcanePower", "sacredPower"] as StatFieldId[]).map((id) => (
            <div key={id} style={{ flex: 1 }}>
              <CombatStatCell id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} />
            </div>
          ))}
        </div>
      </div>
    </SetupStepFrame>
  );
}
