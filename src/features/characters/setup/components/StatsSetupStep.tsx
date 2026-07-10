"use client";

import { useEffect, useRef, useState } from "react";
import { numericKeyDown, sanitizeDigitsInput, decimalKeyDown, sanitizeDecimalInput } from "../../../../lib/inputUtils";
import { joinWithAnd } from "../../../../lib/textUtils";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { SetupStepDefinition } from "../steps";
import type { SetupFlowId } from "../flows";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip from "./InfoTooltip";
import { CopyFromPreset } from "./CopyFromPreset";
import { statInputStyle, inputSuffixStyle, ChecklistCheckbox, ChecklistGroup, LegionFinalAttackField, InputWarningBubble, scrollToFlaggedField, flaggedValueLinkStyle } from "./QuestionControls";
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
import type { StatFieldId, TripleStatFieldId } from "../data/statFields";
import {
  GENESIS_LIBERATION_LEVEL,
  isArcaneEligible,
  isHyperStatEligible,
  isSacredEligible,
  deriveWeaponAttLabel,
  WEAPON_ATT_WARN_AT,
  normalizeHyperStatDraft,
  parseStatsStepDraft,
  serializeStatsStepDraft,
  isStatsSubstepSane,
  isStatsSubstepComplete,
  TRIPLE_IDS,
  MAIN_STAT_IDS,
  COMBAT_LEFT,
  COMBAT_RIGHT,
  MAIN_STAT_BASE_VALUE_WARN_AT,
  MAIN_STAT_PERCENT_UNAPPLIED_WARN_AT,
  type HyperStatDraft,
  type StatsStepDraft,
  type TripleStatDraft,
} from "../data/statsStepDraft";
import {
  HYPER_STAT_CATEGORIES, HYPER_STAT_PRESET_COUNT,
  hyperStatBudget, hyperStatPresetSpent, sanitizeHyperStatInput,
  type HyperStatCategoryDef,
} from "../data/hyperStatData";
import { IA_LINE_OPTIONS, WH_RANK_OPTIONS, whAutofillSourceFromRoster, type WhAutofillSource } from "../data/scouterQuestionsData";
import type { IADraft } from "../data/innerAbilityData";
import InnerAbilitySetupStep from "./InnerAbilitySetupStep";
import type { StoredCharacterRecord, StoredScouterLegion, WhLegionRank } from "../../model/charactersStore";

// Soul Weapon tooltip illustrations. Every stat-variant "Soul" item (Beefy/Swift/Clever/
// etc.) shares the identical icon, pixel-verified 2026-07-01 — these are just one
// representative id from each family.
const MU_GONG_SOUL_ITEM_ID = "02591038"; // "Beefy Mu Gong Soul"
const EPHENIA_SOUL_ITEM_ID = "02591187"; // "Beefy Ephenia Soul"
const RUIN_FORCE_SHIELD_ITEM_ID = "01099015"; // "Ruin Force Shield"

interface StatsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  flowId?: SetupFlowId;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  direction?: "forward" | "backward";
  targetSubstep?: number | null;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  onSubstepChange?: (substepIndex: number) => void;
  characterLevel?: number;
  characterRoster?: StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldScouterLegion?: StoredScouterLegion;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIPLE_LABELS: Record<TripleStatFieldId, string> = {
  str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "HP",
  attackPower: "Attack Power", magicAtt: "Magic ATT",
};

// Stats where the value is a raw number, not a percentage
const RAW_VALUE_STAT_IDS = new Set<StatFieldId>(["arcanePower", "sacredPower"]);

// Combat stats that are always whole numbers in-game (unlike Boss Damage, Crit Damage, etc.)
const NO_DECIMAL_STAT_IDS = new Set<StatFieldId>(["summonDuration", "buffDuration", "criticalRate"]);

// Ignore Elemental Resistance actually caps at 15% in-game, so this one's a real,
// stable limit worth hard-clamping (unlike the sanity thresholds above).
const IGNORE_ELEMENTAL_RESIST_MAX = 15;

function clampIgnoreElementalResist(raw: string): string {
  const sanitized = sanitizeDecimalInput(raw);
  if (sanitized === "" || sanitized.endsWith(".")) return sanitized;
  // Only reformat when actually over the cap — round-tripping every keystroke through
  // Number()/String() strips trailing zeros (e.g. "5.0" -> 5 -> "5"), fighting the user
  // mid-type whenever they enter a decimal.
  if (Number(sanitized) > IGNORE_ELEMENTAL_RESIST_MAX) return String(IGNORE_ELEMENTAL_RESIST_MAX);
  return sanitized;
}

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

const warningBoxStyle: CSSProperties = {
  marginBottom: "0.8rem",
  background: "rgba(217, 119, 6, 0.08)",
  border: "1px solid rgba(217, 119, 6, 0.35)",
  borderRadius: "10px",
  padding: "0.65rem 0.85rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
};

function presetButtonStyle(theme: AppTheme, on: boolean): CSSProperties {
  return {
    border: `1px solid ${on ? theme.accent : theme.border}`,
    borderRadius: 8,
    background: on ? theme.accent : theme.bg,
    color: on ? "#fff" : theme.text,
    fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
    width: 32, height: 32, cursor: "pointer",
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
    <div style={warningBoxStyle}>
      {others.map((w) => (
        <div key={w.skill?.skillName ?? w.message}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.75rem", color: statusText(theme, "warning"), flexShrink: 0, lineHeight: 1 }}>⚠</span>
            <span style={{ fontSize: "0.82rem", color: statusText(theme, "warning"), fontWeight: 700 }}>{w.message}{w.skill ? ":" : ""}</span>
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
            <span style={{ fontSize: "0.75rem", color: statusText(theme, "warning"), flexShrink: 0, lineHeight: 1 }}>⚠</span>
            <span style={{ fontSize: "0.82rem", color: statusText(theme, "warning"), fontWeight: 700 }}>Do not use the following skills:</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginLeft: "1.2rem" }}>
            {doNotUse.map((w) => w.skill && (
              <SkillIconBadge key={w.skill.skillName} skill={w.skill} theme={theme} size={32} style={{ display: "inline-flex" }} />
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
        {allSkills.map((skill) => (
          <SkillIconBadge key={skill.skillName} skill={skill} theme={theme} />
        ))}
      </div>
    </div>
</>
  );
}

function TripleStatRow({
  id, draft, onUpdate, theme, isMainStat, requireFilled,
}: {
  id: TripleStatFieldId;
  draft: StatsStepDraft;
  onUpdate: (id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) => void;
  theme: AppTheme;
  isMainStat: boolean;
  /** MapleScouter only — a blank field here should jump-to-fix same as a bad value. */
  requireFilled: boolean;
}) {
  const d: TripleStatDraft = draft[id] ?? { base: "", percent: "", percentUnapplied: "" };
  const sub = statInputStyle(theme);
  const label = TRIPLE_LABELS[id];
  // "% Not Applied" is shown for every stat EXCEPT ATT, in all flows. For ATT it's
  // meaningless — it only ever existed as a legacy scouter workaround for
  // pre-remaster Kanna's HP→MATT conversion, and a stray value produces an invalid
  // range; MapleScouter always sends ATT % not applied as 0.
  const isAttack = id === "attackPower" || id === "magicAtt";
  // Only the class's main stat (STR/DEX/INT/LUK) is at risk of the Total-vs-Base
  // mix-up MapleScouter itself warns about — HP/ATT/MATT don't have that ambiguity.
  const showBaseWarning = isMainStat && Number(d.base) >= MAIN_STAT_BASE_VALUE_WARN_AT;
  const showPercentUnappliedWarning = isMainStat && Number(d.percentUnapplied) >= MAIN_STAT_PERCENT_UNAPPLIED_WARN_AT;
  return (
    <div>
      <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
        {label}
      </p>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        <div style={{ flex: 1, position: "relative" }}>
          {showBaseWarning && <InputWarningBubble message={`That looks like your total ${label}, enter your Base Value for ${label}.`} theme={theme} />}
          <input type="text" aria-label={`${label} base value`} value={d.base} placeholder="0" style={sub}
            data-flagged-field={showBaseWarning || (requireFilled && !d.base.trim()) ? "true" : undefined}
            onChange={(e) => onUpdate(id, "base", sanitizeDigitsInput(e.target.value))}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            onKeyDown={numericKeyDown}
          />
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>Base Value</p>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ position: "relative" }}>
            <input type="text" aria-label={`${label} percent value`} value={d.percent} placeholder="0" style={{ ...sub, paddingRight: "1.15rem" }}
              data-flagged-field={requireFilled && !d.percent.trim() ? "true" : undefined}
              onChange={(e) => onUpdate(id, "percent", sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
            <span style={inputSuffixStyle(theme)}>%</span>
          </div>
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>% Value</p>
        </div>
        {!isAttack && (
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative" }}>
              {showPercentUnappliedWarning && <InputWarningBubble message={`That % looks too large, enter your % Value Not Applied for ${label}.`} theme={theme} />}
              <input type="text" aria-label={`${label} percent not applied`} value={d.percentUnapplied} placeholder="0" style={{ ...sub, paddingRight: "1.15rem" }}
                data-flagged-field={showPercentUnappliedWarning || (requireFilled && !d.percentUnapplied.trim()) ? "true" : undefined}
                onChange={(e) => onUpdate(id, "percentUnapplied", sanitizeDigitsInput(e.target.value))}
                onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
                onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
                onKeyDown={numericKeyDown}
              />
              <span style={inputSuffixStyle(theme)}>%</span>
            </div>
            <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>% Not Applied</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HyperPresetBar({ theme, active, onSwitch, onCopy, onClear, trailing }: {
  theme: AppTheme;
  active: number;
  onSwitch: (n: number) => void;
  onCopy: (from: number) => void;
  onClear: () => void;
  trailing?: ReactNode;
}) {
  const indices = Array.from({ length: HYPER_STAT_PRESET_COUNT }, (_, i) => i);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted }}>
          Preset
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {indices.map((i) => {
            const on = i === active;
            return (
              <button
                key={i}
                type="button"
                className="tap-target-44"
                onClick={() => onSwitch(i)}
                style={presetButtonStyle(theme, on)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <CopyFromPreset theme={theme} count={HYPER_STAT_PRESET_COUNT} active={active} onCopy={onCopy} onClear={onClear} />
        {trailing}
      </div>
    </div>
  );
}

function HyperStatCell({
  cat, value, onUpdate, theme,
}: {
  cat: HyperStatCategoryDef;
  value: string;
  onUpdate: (id: string, val: string) => void;
  theme: AppTheme;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text, minWidth: 0 }}>{cat.label}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${cat.label} hyper stat level`}
        value={value}
        placeholder="0"
        style={{ ...statInputStyle(theme, "3.4rem"), textAlign: "center", flexShrink: 0 }}
        onChange={(e) => onUpdate(cat.id, e.target.value)}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        onKeyDown={numericKeyDown}
      />
    </div>
  );
}

function CombatStatCell({
  id, draft, onUpdate, onUpdateCooldown, theme, requireFilled,
}: {
  id: StatFieldId;
  draft: StatsStepDraft;
  onUpdate: (id: string, val: string) => void;
  onUpdateCooldown: (field: "seconds" | "percent", val: string) => void;
  theme: AppTheme;
  /** MapleScouter only — a blank field here should jump-to-fix same as a bad value. */
  requireFilled: boolean;
}) {
  const label = STAT_LABELS[id] ?? id;

  if (id === "cooldownReduction") {
    const cd = draft.cooldownReduction ?? { seconds: "", percent: "" };
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
        <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <input type="text" aria-label={`${label} seconds`} value={cd.seconds} placeholder="0" style={{ ...statInputStyle(theme, "2.9rem"), paddingRight: "1.05rem" }}
              data-flagged-field={requireFilled && !cd.seconds.trim() ? "true" : undefined}
              onChange={(e) => onUpdateCooldown("seconds", sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
            <span style={inputSuffixStyle(theme)}>s</span>
          </div>
          <div style={{ position: "relative" }}>
            <input type="text" aria-label={`${label} percent`} value={cd.percent} placeholder="0" style={{ ...statInputStyle(theme, "2.9rem"), paddingRight: "1.05rem" }}
              data-flagged-field={requireFilled && !cd.percent.trim() ? "true" : undefined}
              onChange={(e) => onUpdateCooldown("percent", sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
            <span style={inputSuffixStyle(theme)}>%</span>
          </div>
        </div>
      </div>
    );
  }

  const raw = (draft as Record<string, unknown>)[id];
  const val = typeof raw === "string" ? raw : "";
  const isRaw = RAW_VALUE_STAT_IDS.has(id);
  const allowsDecimal = !isRaw && !NO_DECIMAL_STAT_IDS.has(id);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <input type="text" aria-label={label} value={val} placeholder="0"
          style={isRaw ? statInputStyle(theme, "4.6rem") : { ...statInputStyle(theme, "4.6rem"), paddingRight: "1.15rem" }}
          data-flagged-field={requireFilled && !val.trim() ? "true" : undefined}
          onChange={(e) => {
            if (id === "ignoreElementalResistance") onUpdate(id, clampIgnoreElementalResist(e.target.value));
            else if (allowsDecimal) onUpdate(id, sanitizeDecimalInput(e.target.value));
            else onUpdate(id, sanitizeDigitsInput(e.target.value));
          }}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
          onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          onKeyDown={allowsDecimal ? decimalKeyDown : numericKeyDown}
        />
        {!isRaw && <span style={inputSuffixStyle(theme)}>%</span>}
      </div>
    </div>
  );
}

// Scouter-only weapon ATT/MATT field — the "+X" attack value shown on the weapon hover.
function WeaponAttField({ label, usesMagicWeapon, value, onUpdate, theme }: {
  label: string;
  usesMagicWeapon: boolean;
  value: string;
  onUpdate: (val: string) => void;
  theme: AppTheme;
}) {
  const statName = usesMagicWeapon ? "Magic ATT" : "Attack Power";
  const statShortName = usesMagicWeapon ? "Magic ATT" : "ATT";
  // MapleScouter flags this Total-vs-Weapon-only mix-up for every class, not just
  // magic ones — same threshold either way.
  const showWeaponAttWarning = Number(value) > WEAPON_ATT_WARN_AT;
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <p style={sectionLabelStyle(theme)}>Weapon</p>
      <div className="stats-weapon-grid" style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", minWidth: 0 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>{label}</span>
            <InfoTooltip
              content={{
                title: label,
                description: `Hover over your weapon in the equipment window and enter the total ${statName} shown (the white number with a +).`,
              }}
              theme={theme}
            />
          </div>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {showWeaponAttWarning && <InputWarningBubble message={`That looks like your total ${statShortName}, enter your weapon's ${statShortName}.`} theme={theme} />}
            <input
              type="text"
              inputMode="numeric"
              aria-label={label}
              value={value}
              placeholder="0"
              style={statInputStyle(theme, "4.6rem")}
              data-flagged-field={showWeaponAttWarning || !value.trim() ? "true" : undefined}
              onChange={(e) => onUpdate(sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Setup options section ─────────────────────────────────────────────────────

function SetupOptionsSection({
  optsDef, draft, onUpdate, theme, characterLevel, required,
}: {
  optsDef: ClassSetupOptionsDef | undefined;
  draft: StatsStepDraft;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  theme: AppTheme;
  characterLevel?: number;
  required?: boolean;
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

  // "No soul weapon" is a real radio option here too, same reasoning as WH rank/IA
  // line — it's the discoverable way to say "none", not a special opt-out.
  const soulOptions = isDA
    ? [
        { value: "ephenia_1", label: "Ephenia Lv 1" },
        { value: "ephenia_2", label: "Ephenia Lv 2" },
        { value: "mugong", label: "Mu Gong Soul" },
        { value: "none", label: "No soul weapon", standalone: true },
      ]
    : [{ value: "mugong", label: "Mu Gong Soul" }];

  return (
    <div>
      {isLiberationEligible && (
        <ChecklistCheckbox
          label="Genesis Liberation complete?"
          checked={opts.isLiberated}
          onToggle={(v) => onUpdate({ isLiberated: v })}
          theme={theme}
          tooltip={{
            title: "Genesis Liberation",
            description: <>Unlocked in Limina (Lv. 255) after defeating the Black Mage in Story Mode at least once. You can start this quest with <a href="https://maplestorywiki.net/w/(Genesis_Weapon)_Trailing_the_Traces_of_the_Black_Mage" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>[Genesis Weapon] Trailing the Traces of the Black Mage</a>. Completing the full questline is called liberation.</>,
            link: { href: "https://maplestorywiki.net/w/Genesis_Weapon", label: "See more on the wiki" },
          }}
        />
      )}
      {optsDef?.ruinForceShield && (
        <ChecklistCheckbox
          label="Ruin Force Shield equipped?"
          checked={opts.hasRuinForceShield}
          onToggle={(v) => onUpdate({ hasRuinForceShield: v })}
          theme={theme}
          tooltip={{
            title: "Ruin Force Shield",
            description: "A secondary weapon exclusive to Demon Slayer and Demon Avenger, providing Final Damage +10% and Max HP +560 at the cost of increased damage taken.",
            imageUrls: [resourceImageUrl("item", RUIN_FORCE_SHIELD_ITEM_ID, "iconRaw.png")],
            link: { href: "https://maplestorywiki.net/w/Ruin_Force_Shield", label: "See more on the wiki" },
          }}
        />
      )}
      {soulOptions.length === 1 && (
        // Only one real soul option for this class — a radio-style group of one
        // reads oddly, so this is a plain checkbox instead, grouped with the other
        // checkboxes above the radio-style questions below.
        <ChecklistCheckbox
          label="Mu Gong Soul applied to your weapon?"
          checked={soulValue === "mugong"}
          onToggle={(v) => handleSoulToggle(v ? "mugong" : null)}
          theme={theme}
          tooltip={{
            title: "Soul Weapons",
            description: <>A Soul Weapon is a weapon with a boss soul applied to it, providing passive stats based on your soul gauge and a unique skill. Mu Gong comes with <a href="https://maplestorywiki.net/w/Memories" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>Memories</a>.</>,
            imageUrls: [resourceImageUrl("item", MU_GONG_SOUL_ITEM_ID, "iconRaw.png")],
            link: { href: "https://maplestorywiki.net/w/Soul_Weapon", label: "See more on the wiki" },
          }}
        />
      )}
      {optsDef?.weaponType && (
        <ChecklistGroup
          question="What weapon type are you using?"
          options={[{ value: "1h", label: "One-Handed" }, { value: "2h", label: "Two-Handed" }]}
          value={opts.weaponHand ?? null}
          onToggle={(v) => onUpdate({ weaponHand: (v as "1h" | "2h") ?? undefined })}
          theme={theme}
          required={required}
          tooltip={{
            title: "Weapon Type",
            description: "Hover over your weapon in your equipment inventory and look to the right of the item icon to find your weapon type.",
          }}
        />
      )}
      {soulOptions.length > 1 && (
        <ChecklistGroup
          question="Which soul have you applied to your weapon?"
          options={soulOptions}
          value={soulValue}
          onToggle={handleSoulToggle}
          theme={theme}
          required={required}
          tooltip={{
            title: "Soul Weapons",
            description: <>A Soul Weapon is a weapon with a boss soul applied to it, providing passive stats based on your soul gauge and a unique skill. Mu Gong comes with <a href="https://maplestorywiki.net/w/Memories" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>Memories</a>, and Ephenia comes with <a href="https://maplestorywiki.net/w/A_Queenly_Fragrance" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>A Queenly Fragrance</a>.</>,
            imageUrls: [resourceImageUrl("item", MU_GONG_SOUL_ITEM_ID, "iconRaw.png"), resourceImageUrl("item", EPHENIA_SOUL_ITEM_ID, "iconRaw.png")],
            link: { href: "https://maplestorywiki.net/w/Soul_Weapon", label: "See more on the wiki" },
          }}
        />
      )}
    </div>
  );
}


// Wild Hunter Legion rank is account-level and hard-locked, so it's shown read-only
// (derived per-world from the roster) — shown in BOTH full_setup and maplescouter_setup.
// Lives under its own "Legion" section since it isn't sourced from any specific
// in-game screen, unlike the Artifacts questions below.
function WildHunterRankQuestion({ sq, whSource, worldLegion, onUpdate, theme, required }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  whSource: WhAutofillSource | null;
  worldLegion: StoredScouterLegion | undefined;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
  required?: boolean;
}) {
  const whWorldRank = worldLegion?.wildHunterRank;
  if (whSource) {
    // A Wild Hunter is in this world's roster — the rank is authoritative, so it's
    // derived and locked (it auto-updates as that character levels). Renders the same
    // ChecklistGroup component as the manual case (for visual consistency), but with
    // only the matching bracket in the option list — the other 5 can never apply here,
    // so showing them would just be dead, unclickable clutter.
    const matchedOption = WH_RANK_OPTIONS.find((o) => o.value === whSource.rank);
    return (
      <div>
        <ChecklistGroup
          question="What's your Wild Hunter's level?"
          options={matchedOption ? [matchedOption] : []}
          value={whSource.rank}
          onToggle={() => {}}
          theme={theme}
          disabled
        />
        <p style={{ margin: "-0.5rem 0 0.9rem", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
          Auto-filled from <span style={{ color: theme.accent }}>{whSource.name}</span> (Lv {whSource.level}).
        </p>
      </div>
    );
  }
  // No Wild Hunter in the roster — let the user set the world's rank manually.
  // Deselect-to-clear: clicking the active bracket clears it, same as picking "No
  // Wild Hunter" explicitly. Both map to the "none" sentinel, NOT undefined — undefined
  // means "untouched this session, inherit the world's stored value" (see
  // resolveWhLegionRank), so writing it here would just make the click look like it
  // did nothing (the displayed value falls right back to whWorldRank below).
  return (
    <ChecklistGroup
      question="What's your Wild Hunter's level?"
      options={WH_RANK_OPTIONS}
      value={sq.whLegion ?? whWorldRank ?? null}
      onToggle={(v) => onUpdate({ whLegion: v ?? "none" })}
      theme={theme}
      required={required}
    />
  );
}

// The two Maple Union artifacts, both sourced from the Legion window's Artifacts tab.
// Scouter-only: full_setup collects the whole 9-crystal board on its own dedicated
// Legion Artifacts step instead of asking these two flattened fields again.
function LegionArtifactQuestions({ sq, worldLegion, onUpdate, theme }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  worldLegion: StoredScouterLegion | undefined;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
}) {
  const finalAtkValue = sq.artifactFinalAttackDmg
    ?? (worldLegion?.artifactFinalAttackDmg != null ? String(worldLegion.artifactFinalAttackDmg) : "");
  return (
    <>
      <ChecklistCheckbox
        label="Increases Bonus EXP stat?"
        checked={sq.artifactExtraTarget ?? worldLegion?.artifactExtraTarget}
        onToggle={(v) => onUpdate({ artifactExtraTarget: v })}
        theme={theme}
        tooltip={{
          title: "Increases Bonus EXP",
          description: <>Found in your Legion window, in the Artifacts tab. Assigning the <strong>Increases Bonus EXP</strong> stat to a crystal also grants <strong>Max AoE Skill Targets: +1</strong>, listed under Artifact Bonuses.</>,
        }}
      />
      <LegionFinalAttackField
        value={finalAtkValue}
        onUpdate={(v) => onUpdate({ artifactFinalAttackDmg: v })}
        theme={theme}
      />
    </>
  );
}

// Inner Ability line is scouter-only (full_setup derives it from the Equipment IA
// card instead) but is a per-character fact like Liberated/Soul/weapon type, so it
// groups with Character Info rather than Artifacts or Legion.
function InnerAbilityLineQuestion({ sq, onUpdate, theme, required }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
  required?: boolean;
}) {
  return (
    <ChecklistGroup
      question="Which Inner Ability line do you use for bossing?"
      options={IA_LINE_OPTIONS}
      value={sq.innerAbilityLine ?? null}
      // Deselect-to-clear maps to the real "neither" option, same as Wild Hunter's
      // rank question maps to "none" — both exist as explicit radio options precisely
      // so clicking the active one again lands on a real, complete answer instead of
      // going fully blank (which would also fail the questionnaire-complete check).
      onToggle={(v) => onUpdate({ innerAbilityLine: v ?? "neither" })}
      theme={theme}
      required={required}
      tooltip={{
        title: "Inner Ability",
        description: <>Found in your Stats window: click <strong>Detail</strong>, then the <strong>Ability</strong> button at the bottom right. Only a Legendary-rank Inner Ability can roll these lines.</>,
      }}
    />
  );
}

// Derives the read-only WH Legion source, scoped to the character's world. Null
// unless WH Legion rank is shown (maplescouter_setup and full_setup).
function deriveScouterWhSource(
  showWhLegion: boolean,
  roster: StoredCharacterRecord[] | undefined,
  worldId: number | undefined,
): WhAutofillSource | null {
  if (!showWhLegion) return null;
  const worldRoster = (roster ?? []).filter((c) => worldId == null || c.worldID === worldId);
  return whAutofillSourceFromRoster(worldRoster);
}

// WH Legion rank is shared between full_setup and maplescouter_setup (full_setup is a
// superset); Legion artifacts + Inner Ability line stay scouter-only. Weapon ATT is
// scouter-ONLY here — full_setup asks it in the Equipment step's weapon picker instead,
// since maplescouter_setup has no Equipment step to move it into.
function deriveScouterVisibility(flowId: SetupFlowId | undefined): { isScouter: boolean; showWhLegion: boolean; showWeaponAtt: boolean } {
  const isScouter = flowId === "maplescouter_setup";
  return { isScouter, showWhLegion: isScouter || flowId === "full_setup", showWeaponAtt: isScouter };
}

// MapleScouter needs real data to calculate correctly, but only the radio-style pick-
// one groups actually need forcing: a checkbox left unchecked already unambiguously
// reads as "no" (there's no distinct "unanswered" state to worry about), and Final
// Attack Skill Damage already defaults to 0 when blank. A radio group is different —
// each option (including "None"/"Neither") is a distinct, deliberate click, so leaving
// the whole group untouched is genuinely ambiguous and worth blocking on.
// full_setup never calls this — its questionnaire stays optional ("fill in what you know").
function isScouterQuestionnaireComplete(
  optsDef: ClassSetupOptionsDef | undefined,
  opts: NonNullable<StatsStepDraft["setupOptions"]> | undefined,
  sq: NonNullable<StatsStepDraft["scouterQuestions"]> | undefined,
  whSource: WhAutofillSource | null,
  whWorldRank: WhLegionRank | undefined,
): boolean {
  const o = opts ?? {};
  const s = sq ?? {};
  const isDA = Boolean(optsDef?.epheniaSoul);
  if (optsDef?.weaponType && o.weaponHand === undefined) return false;
  if (isDA && o.soulType === undefined) return false;
  // A rank already showing on screen via the world fallback (see WildHunterRankQuestion)
  // counts as answered — s.whLegion alone doesn't know about that fallback.
  if (!whSource && s.whLegion === undefined && whWorldRank === undefined) return false;
  if (s.innerAbilityLine === undefined) return false;
  return true;
}

// "X left" / "X over" — pulled out of the main component (rather than an inline
// ternary) purely to keep its cognitive complexity under the sonarjs cap.
function hyperStatBudgetSuffix(budget: number, spent: number): string {
  const remaining = budget - spent;
  return remaining < 0 ? `${Math.abs(remaining).toLocaleString()} over` : `${remaining.toLocaleString()} left`;
}

// Names EVERY over-budget preset, not just whichever isn't on screen right now — all
// 3 presets persist to storage regardless of which is active, so all 3 must
// independently stay within budget, and the message should say so even when the
// currently-displayed preset is one of the offenders (mirrors HEXA Stat's node
// message, which lists every offending node the same way).
function hyperOverBudgetMessage(overBudgetPresetIndices: number[]): string {
  if (overBudgetPresetIndices.length === 0) return "";
  const labels = overBudgetPresetIndices.map((i) => `Preset ${i + 1}`);
  const verb = labels.length > 1 ? "have" : "has";
  const pronoun = labels.length > 1 ? "them" : "it";
  return `${joinWithAnd(labels)} ${verb} used more points than you have at this level. Fix ${pronoun} to continue.`;
}

function statsSubstepDescription(isScouter: boolean): string {
  if (isScouter) {
    return "Follow the requirements below, then enter every stat exactly as shown in your Character Info window. Don't leave any blank, even if the value is 0.";
  }
  return "Follow the requirements below, then enter your stats exactly as shown in your Character Info window.";
}

// Substep 1 — the stat window fields (Basic/Combat/Symbols/Weapon ATT). Pulled into
// its own component (rather than inline like substeps 0/2) purely to keep the main
// component's cognitive complexity under the sonarjs cap — MapleScouter's completion
// gating added enough branches here to push it over.
function StatsWindowSubstep({
  theme, stepNumber, totalSteps, substep, substepCount, substepAnimStyle,
  goToSubstep, hasMoreSubsteps, onNext, onFinish, onValidityChange,
  classData, characterLevel, tripleIds, draft,
  handleTripleUpdate, handleSingleUpdate, handleCooldownUpdate,
  showWeaponAtt, weaponAttLabel, usesMagicWeapon, isScouter,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substep: number;
  substepCount: number;
  substepAnimStyle: CSSProperties;
  goToSubstep: (n: number) => void;
  hasMoreSubsteps: boolean;
  onNext: () => void;
  onFinish: () => void;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  classData: ClassSkillData | undefined;
  characterLevel?: number;
  tripleIds: TripleStatFieldId[];
  draft: StatsStepDraft;
  handleTripleUpdate: (id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) => void;
  handleSingleUpdate: (id: string, val: string) => void;
  handleCooldownUpdate: (field: "seconds" | "percent", val: string) => void;
  showWeaponAtt: boolean;
  weaponAttLabel: string;
  usesMagicWeapon: boolean;
  isScouter: boolean;
}) {
  const primaryStat = classData?.requiredStats.find((s): s is TripleStatFieldId => MAIN_STAT_IDS.has(s));
  const showArcanePower = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredPower = isSacredEligible(characterLevel, classData?.isLegacy);
  const symbolIds = ([showArcanePower && "arcanePower", showSacredPower && "sacredPower"] as const).filter(Boolean) as StatFieldId[];
  const statsComplete = isScouter
    ? isStatsSubstepComplete(draft, tripleIds, showWeaponAtt, primaryStat, showArcanePower, showSacredPower)
    : isStatsSubstepSane(draft, tripleIds, primaryStat, showWeaponAtt);
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <div key={1} ref={rootRef} className="stats-substep-root" style={substepAnimStyle}>
    <style>{`
      .stats-substep-root { container-type: inline-size; }
      /* Collapse to one column on the panel's actual width, not the viewport — the
         setup panel is much narrower than the window, so a viewport query collapsed
         far too late. Gap lives in CSS (not inline) so the query can tighten the
         column seam to match the row gap when the two columns stack. */
      .stats-combat-grid { gap: 0.75rem; }
      /* Grid (not flex) so a single visible symbol — Arcane alone, Lv 200-259 — stays
         pinned to the left column's width instead of a lone flex:1 item stretching to
         fill the whole row and dragging its input far to the right. */
      .stats-symbols-grid, .stats-weapon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
      @container (max-width: 520px) {
        .stats-combat-grid { flex-direction: column; gap: 0.4rem; }
        .stats-symbols-grid, .stats-weapon-grid { grid-template-columns: 1fr; gap: 0.4rem; }
      }
    `}</style>
    <SetupStepFrame
      theme={theme}
      substepIndex={substep}
      substepCount={substepCount}
      stepLabel="Character Info"
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description={statsSubstepDescription(isScouter)}
      onBack={() => goToSubstep(0)}
      onNext={hasMoreSubsteps ? () => goToSubstep(2) : onNext}
      onFinish={onFinish}
      nextLabel={hasMoreSubsteps ? "Continue" : undefined}
      nextDisabled={!statsComplete}
      onValidityChange={onValidityChange}
    >
      <WarningList warnings={[...UNIVERSAL_WARNINGS, ...(classData?.warnings ?? [])]} theme={theme} characterLevel={characterLevel} />
      <BuffGuide classData={classData ?? null} theme={theme} characterLevel={characterLevel} />
      {tripleIds.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.45rem", paddingBottom: "0.25rem", borderBottom: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>Basic Stats</span>
            <InfoTooltip
              content={{
                title: "Basic Stats",
                description: "Hover over each stat in your Character Info window and look under [Applied Value]. Enter Base Value, % Value, and % Value Not Applied exactly as shown there.",
              }}
              theme={theme}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {tripleIds.map((id) => (
              <TripleStatRow key={id} id={id} draft={draft} onUpdate={handleTripleUpdate} theme={theme} isMainStat={id === primaryStat} requireFilled={isScouter} />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "0.75rem" }}>
        <p style={sectionLabelStyle(theme)}>Combat Stats</p>
        <div className="stats-combat-grid" style={{ display: "flex", minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_LEFT.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} requireFilled={isScouter} />
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_RIGHT.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} requireFilled={isScouter} />
            ))}
          </div>
        </div>
      </div>

      {symbolIds.length > 0 && (
        <div>
          <p style={sectionLabelStyle(theme)}>Symbols</p>
          <div className="stats-symbols-grid" style={{ minWidth: 0 }}>
            {symbolIds.map((id) => (
              <div key={id} style={{ minWidth: 0 }}>
                <CombatStatCell id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} requireFilled={isScouter} />
              </div>
            ))}
          </div>
        </div>
      )}

      {showWeaponAtt && (
        <WeaponAttField
          label={weaponAttLabel}
          usesMagicWeapon={usesMagicWeapon}
          value={draft.weaponAtt ?? ""}
          onUpdate={(v) => handleSingleUpdate("weaponAtt", v)}
          theme={theme}
        />
      )}
      {!statsComplete && (
        <button
          type="button"
          onClick={() => scrollToFlaggedField(rootRef.current)}
          style={flaggedValueLinkStyle(theme)}
        >
          {isScouter ? "Fill in every stat above, and fix any flagged values, to continue." : "Fix the flagged value above to continue."}
        </button>
      )}
    </SetupStepFrame>
    </div>
  );
}

// ── Substep 0: quick questions ────────────────────────────────────────────────

function QuickQuestionsSubstep({
  theme, stepNumber, totalSteps, substepCount, substepAnimStyle,
  onBack, onNext, onFinish, onValidityChange,
  classData, draft, whSource, worldScouterLegion, isScouter, showWhLegion, characterLevel,
  handleSetupOptUpdate, handleScouterQUpdate,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substepCount: number;
  substepAnimStyle: CSSProperties;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  classData: ClassSkillData | undefined;
  draft: StatsStepDraft;
  whSource: WhAutofillSource | null;
  worldScouterLegion: StoredScouterLegion | undefined;
  isScouter: boolean;
  showWhLegion: boolean;
  characterLevel?: number;
  handleSetupOptUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  handleScouterQUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
}) {
  const questionnaireComplete = !isScouter || isScouterQuestionnaireComplete(
    classData?.setupOptionsDef, draft.setupOptions, draft.scouterQuestions, whSource, worldScouterLegion?.wildHunterRank,
  );
  return (
    <div key={0} style={substepAnimStyle}>
      <SetupStepFrame
        theme={theme}
        substepIndex={0}
        substepCount={substepCount}
        stepLabel="Quick Questions"
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        description="Answer what applies to your character below."
        onBack={onBack}
        onNext={onNext}
        onFinish={onFinish}
        nextLabel="Continue"
        nextDisabled={isScouter && !questionnaireComplete}
        onValidityChange={onValidityChange}
      >
        <p style={sectionLabelStyle(theme)}>Character Info</p>
        <div style={{ marginBottom: "0.75rem" }}>
          <SetupOptionsSection
            optsDef={classData?.setupOptionsDef}
            draft={draft}
            onUpdate={handleSetupOptUpdate}
            theme={theme}
            characterLevel={characterLevel}
            required={isScouter}
          />
          {isScouter && (
            <InnerAbilityLineQuestion sq={draft.scouterQuestions ?? {}} onUpdate={handleScouterQUpdate} theme={theme} required={isScouter} />
          )}
        </div>

        {isScouter && (
          <div style={{ marginBottom: "0.75rem" }}>
            <p style={sectionLabelStyle(theme)}>Legion Artifact</p>
            <LegionArtifactQuestions
              sq={draft.scouterQuestions ?? {}}
              worldLegion={worldScouterLegion}
              onUpdate={handleScouterQUpdate}
              theme={theme}
            />
          </div>
        )}

        {showWhLegion && (
          <div>
            <p style={sectionLabelStyle(theme)}>Mules</p>
            <WildHunterRankQuestion
              sq={draft.scouterQuestions ?? {}}
              whSource={whSource}
              worldLegion={worldScouterLegion}
              onUpdate={handleScouterQUpdate}
              theme={theme}
              required={isScouter}
            />
          </div>
        )}

        {isScouter && !questionnaireComplete && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
            Answer every starred question above to continue.
          </p>
        )}
      </SetupStepFrame>
    </div>
  );
}

// ── Substep: hyper stat (Lv 140+, full setup only) ──────────────────────────────

function HyperStatSubstep({
  theme, stepNumber, totalSteps, substep, substepCount, substepAnimStyle,
  onBack, onNext, onFinish, onValidityChange,
  characterLevel, classData, hyper,
  handleHyperStatUpdate, switchHyperPreset, copyHyperPreset, clearHyperPreset,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substep: number;
  substepCount: number;
  substepAnimStyle: CSSProperties;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  characterLevel?: number;
  classData: ClassSkillData | undefined;
  hyper: HyperStatDraft;
  handleHyperStatUpdate: (id: string, val: string) => void;
  switchHyperPreset: (n: number) => void;
  copyHyperPreset: (from: number) => void;
  clearHyperPreset: () => void;
}) {
  // Arcane Power only appears in this window once the character can actually have
  // Arcane Force — same eligibility as the Symbols section in the stat-window substep.
  const hyperCategories = HYPER_STAT_CATEGORIES.filter(
    (cat) => cat.id !== "arcanePower" || isArcaneEligible(characterLevel, classData?.isLegacy),
  );
  const hyperHalf = Math.ceil(hyperCategories.length / 2);
  const hyperCols = [hyperCategories.slice(0, hyperHalf), hyperCategories.slice(hyperHalf)];
  const hyperCategoryIds = hyperCategories.map((cat) => cat.id);
  const activeHyperPreset = hyper.presets[hyper.activePreset] ?? {};
  const hyperSpent = hyperStatPresetSpent(activeHyperPreset, hyperCategoryIds);
  const hyperBudget = hyperStatBudget(characterLevel);
  const hyperOverspent = hyperSpent > hyperBudget;
  // All 3 presets persist to storage regardless of which is active, so Continue must
  // stay blocked if ANY preset is over budget — otherwise switching to a valid preset
  // silently bypasses the check while an overspent one is still saved (same class of
  // bug as HEXA Stat's node/preset check).
  const overBudgetPresetIndices = hyper.presets.reduce<number[]>((acc, p, i) => (
    hyperStatPresetSpent(p, hyperCategoryIds) > hyperBudget ? [...acc, i] : acc
  ), []);
  const anyPresetOverBudget = overBudgetPresetIndices.length > 0;
  return (
    <div key={2} className="stats-hyper-root" style={substepAnimStyle}>
    <style>{`
      .stats-hyper-root { container-type: inline-size; }
      /* Gap lives in CSS (not inline) so the container query can override it —
         when the two columns stack, match the inter-column gap to the row gap so
         the seam between the columns isn't wider than the rest of the list. */
      .stats-hyper-grid { gap: 0.75rem; }
      @container (max-width: 520px) { .stats-hyper-grid { flex-direction: column; gap: 0.4rem; } }
    `}</style>
    <SetupStepFrame
      theme={theme}
      substepIndex={substep}
      substepCount={substepCount}
      stepLabel="Hyper Stats"
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your Hyper Stat levels."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
      nextLabel="Continue"
      nextDisabled={anyPresetOverBudget}
      onValidityChange={onValidityChange}
    >
      <HyperPresetBar
        theme={theme}
        active={hyper.activePreset}
        onSwitch={switchHyperPreset}
        onCopy={copyHyperPreset}
        onClear={clearHyperPreset}
        trailing={Number.isFinite(hyperBudget) && (
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: hyperOverspent ? statusText(theme, "danger") : theme.muted }}>
            {hyperSpent.toLocaleString()} / {hyperBudget.toLocaleString()} points used ({hyperStatBudgetSuffix(hyperBudget, hyperSpent)})
          </span>
        )}
      />
      <div className="stats-hyper-grid" style={{ display: "flex", minWidth: 0 }}>
        {hyperCols.map((col, i) => (
          // react-doctor-disable-next-line no-array-index-as-key
          <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {col.map((cat) => (
              <HyperStatCell key={cat.id} cat={cat} value={hyper.presets[hyper.activePreset]?.[cat.id] ?? ""} onUpdate={handleHyperStatUpdate} theme={theme} />
            ))}
          </div>
        ))}
      </div>
      {anyPresetOverBudget && (
        <p role="alert" style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
          {hyperOverBudgetMessage(overBudgetPresetIndices)}
        </p>
      )}
    </SetupStepFrame>
    </div>
  );
}

// ── Substep: inner ability (full setup only) ────────────────────────────────────

function InnerAbilitySubstep({
  theme, stepNumber, totalSteps, substep, substepCount, substepAnimStyle,
  onBack, onNext, onFinish, onValidityChange, draft, onUpdate,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substep: number;
  substepCount: number;
  substepAnimStyle: CSSProperties;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  draft: StatsStepDraft;
  onUpdate: (next: IADraft) => void;
}) {
  return (
    <div key={3} style={substepAnimStyle}>
      <SetupStepFrame
        theme={theme}
        substepIndex={substep}
        substepCount={substepCount}
        stepLabel="Inner Ability"
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        description="Set your Inner Ability."
        onBack={onBack}
        onNext={onNext}
        onFinish={onFinish}
        onValidityChange={onValidityChange}
      >
        <InnerAbilitySetupStep draft={draft.innerAbility} onUpdate={onUpdate} theme={theme} />
      </SetupStepFrame>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsSetupStep({
  theme, flowId, stepNumber, totalSteps, jobName = "", direction = "forward", targetSubstep, onValidityChange, onSubstepChange, characterLevel, characterRoster, confirmedWorldId, worldScouterLegion, value, onChange, onBack, onNext, onFinish,
}: StatsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const draft = parseStatsStepDraft(value);
  // Hyper Stat is a Full-setup detail that MapleScouter never uses, so it gets its
  // own substep everywhere EXCEPT the scouter flow. ("% Not Applied" is NOT flow-
  // specific — it shows for every non-ATT stat in all flows; see TripleStatRow.)
  // Also hidden below Lv 140, same as Genesis Liberation/Arcane/Sacred — a character
  // that can't have Hyper Stats yet shouldn't be asked to fill them in.
  const showHyperStat = flowId !== "maplescouter_setup" && isHyperStatEligible(characterLevel);
  const { isScouter, showWhLegion, showWeaponAtt } = deriveScouterVisibility(flowId);

  // WH Legion rank is read-only/derived, scoped to this character's world.
  const whSource = deriveScouterWhSource(showWhLegion, characterRoster, confirmedWorldId);

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

  function handleScouterQUpdate(patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) {
    updateDraft({ scouterQuestions: { ...(draft.scouterQuestions ?? {}), ...patch } });
  }

  const hyper = normalizeHyperStatDraft(draft.hyperStat);

  function handleHyperStatUpdate(id: string, val: string) {
    const maxLevel = HYPER_STAT_CATEGORIES.find((cat) => cat.id === id)?.maxLevel;
    const presets = hyper.presets.map((p, i) =>
      i === hyper.activePreset ? { ...p, [id]: sanitizeHyperStatInput(val, maxLevel) } : p,
    );
    updateDraft({ hyperStat: { presets, activePreset: hyper.activePreset } });
  }

  function switchHyperPreset(n: number) {
    updateDraft({ hyperStat: { presets: hyper.presets, activePreset: n } });
  }

  function copyHyperPreset(from: number) {
    const presets = hyper.presets.map((p, i) => (i === hyper.activePreset ? hyper.presets[from] : p));
    updateDraft({ hyperStat: { presets, activePreset: hyper.activePreset } });
  }

  function clearHyperPreset() {
    const presets = hyper.presets.map((p, i) => (i === hyper.activePreset ? {} : p));
    updateDraft({ hyperStat: { presets, activePreset: hyper.activePreset } });
  }

  // Inner Ability is a Character Info fact (found in the in-game Stats window) that
  // Full setup collects in its own detailed substep; MapleScouter asks a simpler
  // version of the same question inline in substep 0 instead (no level gate — Inner
  // Ability itself isn't level-locked, unlike Hyper Stat).
  const showInnerAbility = flowId !== "maplescouter_setup";

  // Substeps: questions → stat fields → hyper stat (Lv 140+, full setup only) →
  // inner ability (full setup only). Hyper Stat and Inner Ability each occupy the
  // next free slot in that order, so either can be absent without leaving a gap.
  const hyperStatSubstep = showHyperStat ? 2 : -1;
  let innerAbilitySubstep = -1;
  if (showInnerAbility) innerAbilitySubstep = showHyperStat ? 3 : 2;
  const lastSubstep = Math.max(1, hyperStatSubstep, innerAbilitySubstep);
  const SUBSTEP_COUNT = lastSubstep + 1;

  const [substep, setSubstep] = useState(() => targetSubstep ?? (direction === "backward" ? lastSubstep : 0));
  // Reports the mount-time default once (so entering a step "backward," which starts
  // on a substep other than 0, still gets persisted for resume even if the player
  // reloads before navigating again) — subsequent changes are reported directly from
  // goToSubstep below instead of a substep-watching effect. Fully eliminating this last
  // mount-time report would mean lifting substep into a value the parent controls
  // directly, which isn't worth the blast radius for a bookkeeping report that never
  // causes a visible re-render.
  // react-doctor-disable-next-line no-prop-callback-in-effect, no-pass-live-state-to-parent
  useEffect(() => { onSubstepChange?.(substep); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);

  function goToSubstep(next: number) {
    setHasSubstepSwitched(true);
    setSubstepDirection(next > substep ? "forward" : "backward");
    setSubstep(next);
    onSubstepChange?.(next);
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

  const { usesMagicWeapon, label: weaponAttLabel } = deriveWeaponAttLabel(classData);

  if (substep === 0) {
    return (
      <QuickQuestionsSubstep
        theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
        substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
        onBack={onBack} onNext={() => goToSubstep(1)} onFinish={onFinish} onValidityChange={onValidityChange}
        classData={classData} draft={draft} whSource={whSource} worldScouterLegion={worldScouterLegion}
        isScouter={isScouter} showWhLegion={showWhLegion} characterLevel={characterLevel}
        handleSetupOptUpdate={handleSetupOptUpdate} handleScouterQUpdate={handleScouterQUpdate}
      />
    );
  }

  if (substep === 1) return (
    <StatsWindowSubstep
      theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
      substep={substep} substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
      goToSubstep={goToSubstep} hasMoreSubsteps={SUBSTEP_COUNT > 2} onNext={onNext} onFinish={onFinish} onValidityChange={onValidityChange}
      classData={classData} characterLevel={characterLevel} tripleIds={tripleIds} draft={draft}
      handleTripleUpdate={handleTripleUpdate} handleSingleUpdate={handleSingleUpdate} handleCooldownUpdate={handleCooldownUpdate}
      showWeaponAtt={showWeaponAtt} weaponAttLabel={weaponAttLabel} usesMagicWeapon={usesMagicWeapon} isScouter={isScouter}
    />
  );

  // Substep — Hyper Stat (Full setup, Lv 140+ only). Mirrors the in-game Hyper Stats
  // window: every category, level 0–15, entered directly into a two-column list.
  if (substep === hyperStatSubstep) {
    return (
      <HyperStatSubstep
        theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
        substep={substep} substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
        onBack={() => goToSubstep(1)} onNext={() => goToSubstep(innerAbilitySubstep)} onFinish={onFinish} onValidityChange={onValidityChange}
        characterLevel={characterLevel} classData={classData} hyper={hyper}
        handleHyperStatUpdate={handleHyperStatUpdate} switchHyperPreset={switchHyperPreset}
        copyHyperPreset={copyHyperPreset} clearHyperPreset={clearHyperPreset}
      />
    );
  }

  // Substep — Inner Ability (Full setup only). A Character Info fact, but detailed
  // enough (grade + 3 tiered lines) to warrant its own substep rather than folding
  // into substep 0's questionnaire.
  function handleInnerAbilityUpdate(next: IADraft) {
    updateDraft({ innerAbility: next });
  }
  return (
    <InnerAbilitySubstep
      theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
      substep={substep} substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
      onBack={() => goToSubstep(hyperStatSubstep >= 0 ? hyperStatSubstep : 1)} onNext={onNext} onFinish={onFinish} onValidityChange={onValidityChange}
      draft={draft} onUpdate={handleInnerAbilityUpdate}
    />
  );
}
