"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { SetupStepDefinition } from "../steps";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip, { type TooltipContent } from "./InfoTooltip";
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
  GENESIS_LIBERATION_LEVEL,
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
  direction?: "forward" | "backward";
  characterLevel?: number;
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
  additionalStatusDamage: "Addl. Status Damage",
  summonDuration: "Summons Duration Inc.",
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
    minWidth: 0,
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

// Minimum character level for each jobAdvancement label, used to hide buffs/warnings
// for skills the character hasn't unlocked yet.
const JOB_ADVANCEMENT_MIN_LEVEL: Record<string, number> = {
  "Beginner": 1,
  "1": 10,
  "2": 30,
  "3": 60,
  "4": 100,
  "5": 200,
  "Hyper Skills (140)": 140,
};

function isSkillUnlocked(skill: BuffSkill, characterLevel: number | undefined): boolean {
  if (characterLevel === undefined) return true;
  return characterLevel >= (JOB_ADVANCEMENT_MIN_LEVEL[skill.jobAdvancement] ?? 0);
}

function countSetupOptionsQuestions(optsDef: ClassSetupOptionsDef | undefined, characterLevel: number | undefined): number {
  const isLiberationEligible = characterLevel === undefined || characterLevel >= GENESIS_LIBERATION_LEVEL;
  let count = 1; // "Do you use any of these souls?" is always shown
  if (isLiberationEligible) count += 1;
  if (optsDef?.weaponType) count += 1;
  if (optsDef?.ruinForceShield) count += 1;
  return count;
}

function isSetupOptionsComplete(
  optsDef: ClassSetupOptionsDef | undefined,
  opts: NonNullable<StatsStepDraft["setupOptions"]>,
  characterLevel: number | undefined,
): boolean {
  const isLiberationEligible = characterLevel === undefined || characterLevel >= GENESIS_LIBERATION_LEVEL;
  if (isLiberationEligible && opts.isLiberated === undefined) return false;
  if (opts.soulType === undefined) return false;
  if (optsDef?.weaponType && opts.weaponHand === undefined) return false;
  if (optsDef?.ruinForceShield && opts.hasRuinForceShield === undefined) return false;
  return true;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkillIconBadge({ skill, theme, size = 32, style }: { skill: BuffSkill; theme: AppTheme; size?: number; style?: CSSProperties }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const iconUrl = skill.skillIconUrl;
  const placeholder = (
    <div style={{ width: size, height: size, borderRadius: "4px", background: theme.border }} />
  );
  return (
    <HoverTooltip
      label={<>
        <div>{skill.skillName}</div>
        <div style={{ color: theme.muted, fontWeight: 600, fontStyle: "italic" }}>{formatJobAdvancement(skill.jobAdvancement)}</div>
      </>}
      theme={theme}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", ...style }}
    >
      {iconUrl ? (
        <>
          <div ref={wrapperRef} style={{ width: size, height: size, borderRadius: "4px", overflow: "hidden" }}>
            <Image
              src={iconUrl!}
              alt={skill.skillName}
              width={size}
              height={size}
              onError={() => {
                if (wrapperRef.current) wrapperRef.current.style.display = "none";
                if (fallbackRef.current) fallbackRef.current.style.display = "block";
              }}
              style={{ borderRadius: "4px", display: "block" }}
              unoptimized
            />
          </div>
          <div ref={fallbackRef} style={{ display: "none", width: size, height: size, borderRadius: "4px", background: theme.border }} />
        </>
      ) : placeholder}
    </HoverTooltip>
  );
}

function WarningList({ warnings, theme, characterLevel }: { warnings: ClassWarning[]; theme: AppTheme; characterLevel?: number }) {
  const unlocked = warnings.filter((w) => !w.skill || isSkillUnlocked(w.skill, characterLevel));
  if (!unlocked.length) return null;

  const doNotUse = unlocked.filter((w) => w.skill && w.message === "Do not use");
  const others = unlocked.filter((w) => !(w.skill && w.message === "Do not use"));

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
        <div key={i}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#d97706", flexShrink: 0, lineHeight: 1 }}>⚠</span>
            <span style={{ fontSize: "0.82rem", color: "#d97706", fontWeight: 700 }}>{w.message}{w.skill ? ":" : ""}</span>
            {w.tooltip && <InfoTooltip content={w.tooltip} theme={theme} />}
          </div>
          {w.skill && (
            <div style={{ marginTop: "0.35rem", marginLeft: "1.2rem" }}>
              <SkillIconBadge skill={w.skill} theme={theme} size={32} style={{ display: "inline-flex" }} />
            </div>
          )}
        </div>
      ))}
      {doNotUse.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.45rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#d97706", flexShrink: 0, lineHeight: 1 }}>⚠</span>
            <span style={{ fontSize: "0.82rem", color: "#d97706", fontWeight: 700 }}>Do not use the following skills:</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginLeft: "1.2rem" }}>
            {doNotUse.map((w, i) => w.skill && (
              <SkillIconBadge key={i} skill={w.skill} theme={theme} size={32} style={{ display: "inline-flex" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BuffGuide({ classData, theme, characterLevel }: { classData: ClassSkillData | null; theme: AppTheme; characterLevel?: number }) {
  const allSkills = [...UNIVERSAL_BUFF_SKILLS, ...(classData?.buffSkills ?? [])]
    .filter((skill) => isSkillUnlocked(skill, characterLevel));
  return (
    <>
    <div style={{
      marginBottom: "0.4rem",
      background: "rgba(22, 163, 74, 0.07)",
      border: "1px solid rgba(22, 163, 74, 0.35)",
      borderRadius: "10px",
      padding: "0.65rem 0.85rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: "#16a34a", flexShrink: 0, lineHeight: 1 }}>★</span>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#16a34a", fontWeight: 700 }}>
          Activate these buffs before entering stats:
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginLeft: "1.2rem" }}>
        {allSkills.map((skill, i) => (
          <SkillIconBadge key={i} skill={skill} theme={theme} />
        ))}
      </div>
    </div>
</>
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
          <input type="text" aria-label={`${TRIPLE_LABELS[id]} base value`} value={d.base} placeholder="0" style={sub}
            onChange={(e) => onUpdate(id, "base", e.target.value)}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          />
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>Base Value</p>
        </div>
        <div style={{ flex: 1.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.15rem" }}>
            <input type="text" aria-label={`${TRIPLE_LABELS[id]} percent value`} value={d.percent} placeholder="0" style={sub}
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
            <input type="text" aria-label={`${TRIPLE_LABELS[id]} percent not applied`} value={d.percentUnapplied} placeholder="0" style={sub}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
        <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
          <input type="text" aria-label={`${label} seconds`} value={cd.seconds} placeholder="0" style={statInputStyle(theme, "2.6rem")}
            onChange={(e) => onUpdateCooldown("seconds", e.target.value)}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          />
          <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>s</span>
          <input type="text" aria-label={`${label} percent`} value={cd.percent} placeholder="0" style={statInputStyle(theme, "2.6rem")}
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.15rem", flexShrink: 0 }}>
        <input type="text" aria-label={label} value={val} placeholder="0" style={statInputStyle(theme, "4rem")}
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
  question, options, value, onToggle, theme, tooltip,
}: {
  question: string;
  options: { value: string; label: string }[];
  value: string | null;
  /** Clicking the active option deselects it (returns null). */
  onToggle: (value: string | null) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
}) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: theme.text }}>
          {question}
        </p>
        {tooltip && <InfoTooltip content={tooltip} theme={theme} />}
      </div>
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

const BOOL_TOGGLE_OPTIONS = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
function BoolToggle({ question, value, onToggle, theme, tooltip }: {
  question: string;
  value: boolean | undefined;
  onToggle: (value: boolean | undefined) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
}) {
  const strValue = value === true ? "yes" : null;
  const finalValue = value === false ? "no" : strValue;
  return (
    <QuestionToggle
      question={question}
      options={BOOL_TOGGLE_OPTIONS}
      value={finalValue}
      onToggle={(v) => {
        if (v === "yes") onToggle(true);
        else if (v === "no") onToggle(false);
        else onToggle(undefined);
      }}
      theme={theme}
      tooltip={tooltip}
    />
  );
}

function SetupOptionsSection({
  optsDef, draft, onUpdate, theme, characterLevel,
}: {
  optsDef: ClassSetupOptionsDef | undefined;
  draft: StatsStepDraft;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  theme: AppTheme;
  characterLevel?: number;
}) {
  const opts = draft.setupOptions ?? {};
  const isDA = Boolean(optsDef?.epheniaSoul);
  const isLiberationEligible = characterLevel === undefined || characterLevel >= GENESIS_LIBERATION_LEVEL;

  let soulValue: string | null = null;
  if (opts.soulType === "mugong") soulValue = "mugong";
  else if (opts.soulType === "none") soulValue = "none";
  if (isDA) {
    if (opts.soulType === "ephenia" && opts.epheniaLevel === 1) soulValue = "ephenia_1";
    else if (opts.soulType === "ephenia" && opts.epheniaLevel === 2) soulValue = "ephenia_2";
  }

  function handleSoulToggle(val: string | null) {
    if (val === null) onUpdate({ soulType: undefined, epheniaLevel: undefined });
    else if (val === "none") onUpdate({ soulType: "none", epheniaLevel: undefined });
    else if (val === "mugong") onUpdate({ soulType: "mugong", epheniaLevel: undefined });
    else if (val === "ephenia_1") onUpdate({ soulType: "ephenia", epheniaLevel: 1 });
    else if (val === "ephenia_2") onUpdate({ soulType: "ephenia", epheniaLevel: 2 });
  }

  const soulOptions = isDA
    ? [
        { value: "none", label: "None" },
        { value: "ephenia_1", label: "Ephenia Lv 1" },
        { value: "ephenia_2", label: "Ephenia Lv 2" },
        { value: "mugong", label: "Mu Gong Soul" },
      ]
    : [{ value: "none", label: "None" }, { value: "mugong", label: "Mu Gong Soul" }];

  return (
    <div>
      {isLiberationEligible && (
        <BoolToggle
          question="Are you Liberated?"
          value={opts.isLiberated}
          onToggle={(v) => onUpdate({ isLiberated: v })}
          theme={theme}
          tooltip={{
            title: "Genesis Liberation",
            description: <>Unlocked in Limina (Lv. 255) after defeating the Black Mage in Story Mode at least once. You can start this quest with <a href="https://maplestorywiki.net/w/(Genesis_Weapon)_Trailing_the_Traces_of_the_Black_Mage" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>[Genesis Weapon] Trailing the Traces of the Black Mage</a>. Completing the full questline is called liberation.</>,
            link: { href: "https://maplestorywiki.net/w/Genesis_Weapon", label: "See more on the wiki" },
          }}
        />
      )}
      {optsDef?.weaponType && (
        <QuestionToggle
          question="What weapon type are you using?"
          options={[{ value: "1h", label: "One-Handed" }, { value: "2h", label: "Two-Handed" }]}
          value={opts.weaponHand ?? null}
          onToggle={(v) => onUpdate({ weaponHand: (v as "1h" | "2h") ?? undefined })}
          theme={theme}
          tooltip={{
            title: "Weapon Type",
            description: "Hover over your weapon in your equipment inventory and look to the right of the item icon to find your weapon type.",
          }}
        />
      )}
      <QuestionToggle
        question="Do you use any of these souls?"
        options={soulOptions}
        value={soulValue}
        onToggle={handleSoulToggle}
        theme={theme}
        tooltip={{
          title: "Soul Weapons",
          description: isDA ? (
            <>A Soul Weapon is a weapon with a boss soul applied to it, providing passive stats based on your soul gauge and a unique skill. Mu Gong comes with <a href="https://maplestorywiki.net/w/Memories" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>Memories</a>, and Ephenia comes with <a href="https://maplestorywiki.net/w/A_Queenly_Fragrance" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>A Queenly Fragrance</a>.</>
          ) : (
            <>A Soul Weapon is a weapon with a boss soul applied to it, providing passive stats based on your soul gauge and a unique skill. Mu Gong comes with <a href="https://maplestorywiki.net/w/Memories" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>Memories</a>.</>
          ),
          imageUrls: isDA
            ? ["https://media.maplestorywiki.net/yetidb/Use_Mu_Gong_Soul.png", "https://media.maplestorywiki.net/yetidb/Use_Ephenia_Soul.png"]
            : ["https://media.maplestorywiki.net/yetidb/Use_Mu_Gong_Soul.png"],
          link: { href: "https://maplestorywiki.net/w/Soul_Weapon", label: "See more on the wiki" },
        }}
      />
      {optsDef?.ruinForceShield && (
        <BoolToggle
          question="Do you have a Ruin Force Shield equipped?"
          value={opts.hasRuinForceShield}
          onToggle={(v) => onUpdate({ hasRuinForceShield: v })}
          theme={theme}
          tooltip={{
            title: "Ruin Force Shield",
            description: "A secondary weapon exclusive to Demon Slayer and Demon Avenger, providing Final Damage +10% and Max HP +560 at the cost of increased damage taken.",
            imageUrls: ["https://media.maplestorywiki.net/yetidb/Eqp_Ruin_Force_Shield.png"],
            link: { href: "https://maplestorywiki.net/w/Ruin_Force_Shield", label: "See more on the wiki" },
          }}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", direction = "forward", characterLevel, value, onChange, onBack, onNext, onFinish,
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

  const [substep, setSubstep] = useState(() => direction === "backward" ? 1 : 0);
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);

  function goToSubstep(next: number) {
    setHasSubstepSwitched(true);
    setSubstepDirection(next > substep ? "forward" : "backward");
    setSubstep(next);
  }

  const substepAnimStyle = hasSubstepSwitched ? {
    animationName: substepDirection === "forward" ? "setupStepSlideForward" : "setupStepSlideBackward",
    animationDuration: "var(--characters-standard)",
    animationTimingFunction: "ease",
    animationFillMode: "both" as const,
  } : {};

  const tripleIds = classData
    ? getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id))
    : [];

  if (substep === 0) {
    return (
      <div key={0} style={substepAnimStyle}>
        <SetupStepFrame
          theme={theme}
          stepLabel={step.label}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          description={
            countSetupOptionsQuestions(classData?.setupOptionsDef, characterLevel) === 1
              ? "One quick question about your character first:"
              : "A few quick questions about your character first:"
          }
          onBack={onBack}
          onNext={() => goToSubstep(1)}
          onFinish={onFinish}
          nextLabel="Continue"
          nextDisabled={!isSetupOptionsComplete(classData?.setupOptionsDef, draft.setupOptions ?? {}, characterLevel)}
        >
          <SetupOptionsSection optsDef={classData?.setupOptionsDef} draft={draft} onUpdate={handleSetupOptUpdate} theme={theme} characterLevel={characterLevel} />
        </SetupStepFrame>
      </div>
    );
  }

  return (
    <div key={1} style={substepAnimStyle}>
    <style>{`
      @media (max-width: 480px) {
        .stats-combat-grid, .stats-symbols-grid { flex-direction: column; }
      }
    `}</style>
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="All fields are optional. Fill in what you can."
      onBack={() => goToSubstep(0)}
      onNext={onNext}
      onFinish={onFinish}
    >
      <WarningList warnings={[...UNIVERSAL_WARNINGS, ...(classData?.warnings ?? [])]} theme={theme} characterLevel={characterLevel} />
      <BuffGuide classData={classData ?? null} theme={theme} characterLevel={characterLevel} />
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
        <div className="stats-combat-grid" style={{ display: "flex", gap: "0.75rem", minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_LEFT.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} />
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_RIGHT.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <p style={sectionLabelStyle(theme)}>Symbols</p>
        <div className="stats-symbols-grid" style={{ display: "flex", gap: "0.75rem", minWidth: 0 }}>
          {(["arcanePower", "sacredPower"] as StatFieldId[]).map((id) => (
            <div key={id} style={{ flex: 1, minWidth: 0 }}>
              <CombatStatCell id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} />
            </div>
          ))}
        </div>
      </div>
    </SetupStepFrame>
    </div>
  );
}
