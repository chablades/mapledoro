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
import InfoTooltip, { LockGlyph } from "./InfoTooltip";
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
import { STAT_LABELS, TRIPLE_STAT_FIELDS, type StatFieldId, type TripleStatFieldId } from "../data/statFields";
import { deriveWeaponHandFromWeapon } from "../data/classBranch";
import { equipmentLikeFromDraft, parseEquipmentStepDraft, type EquipmentLike } from "../data/equipmentStepDraft";
import {
  GENESIS_LIBERATION_LEVEL,
  isArcaneEligible,
  isHyperStatEligible,
  isSacredEligible,
  deriveWeaponAttLabel,
  deriveIsLiberatedFromWeapon,
  deriveHasRuinForceShield,
  getLiberationWeaponName,
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
import { deriveInnerAbilityLine, innerAbilityHasData, normalizeIA, type IADraft } from "../data/innerAbilityData";
import { deriveLegionArtifactFields, parseLegionArtifactBoardDraft, type LegionArtifactBoardDraft, type LegionCrystalDraft } from "../data/legionArtifactData";
import InnerAbilitySetupStep from "./InnerAbilitySetupStep";
import type { StoredCharacterRecord, StoredLegionArtifact, StoredScouterLegion, WhLegionRank } from "../../model/charactersStore";
import { findRosterCharacterByName } from "../../model/characterKeys";

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
  /** When true, targetSubstep is the substep opened from a profile bookmark's edit
   *  pencil — it should present as if it were this step's only substep (no pips,
   *  Back exits the step directly instead of going to a sibling substep, and
   *  Next/Continue finishes the step instead of advancing to one). */
  confineToSubstep?: boolean;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  onSubstepChange?: (substepIndex: number) => void;
  characterLevel?: number;
  characterRoster?: StoredCharacterRecord[];
  confirmedWorldId?: number;
  confirmedCharacterName?: string;
  worldScouterLegion?: StoredScouterLegion;
  worldLegionArtifact?: StoredLegionArtifact;
  /** This session's own live Equipment/Legion Artifacts step drafts, independent of
   *  which step is currently active — takes priority over worldLegionArtifact/the
   *  roster's persisted equipment when non-empty, so clearing a weapon or a Legion
   *  Artifact line mid-session and coming back to Quick Questions reflects it
   *  immediately instead of only after a Finish-then-reopen round trip. */
  equipmentRawValue?: string;
  legionArtifactsRawValue?: string;
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

// Ignore DEF's own compounding formula (100 - 100×product of each source's remainder)
// mathematically approaches but never exceeds 100% from real sources — and the since-removed
// "Quick Reload" node once granted a flat, confirmed 100% Ignore DEF for its duration, so 100
// is a real, stable ceiling worth hard-clamping the same way as Ignore Elemental Resistance.
const IGNORE_DEFENSE_MAX = 100;

function clampIgnoreDefense(raw: string): string {
  const sanitized = sanitizeDecimalInput(raw);
  if (sanitized === "" || sanitized.endsWith(".")) return sanitized;
  if (Number(sanitized) > IGNORE_DEFENSE_MAX) return String(IGNORE_DEFENSE_MAX);
  return sanitized;
}

interface ConfinableFrameProps {
  substepIndex: number;
  substepCount: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}

/** When confined (opened straight from a profile bookmark's edit pencil), a substep
 *  presents as this step's only one: no pips, Back exits the step directly instead of
 *  going to a sibling substep, and Next/Continue finishes the step instead of advancing
 *  to one. Otherwise the substep's own normal sibling-navigation props pass through
 *  unchanged. Centralized here (rather than a confineToSubstep ternary per prop in each
 *  substep) to keep each substep's own cognitive complexity under the sonarjs cap. */
function confinableFrameProps(
  confineToSubstep: boolean | undefined,
  onExitStep: () => void,
  onFinish: () => void,
  normal: ConfinableFrameProps,
): ConfinableFrameProps {
  if (!confineToSubstep) return normal;
  return { substepIndex: 0, substepCount: 1, onBack: onExitStep, onNext: onFinish, nextLabel: undefined };
}

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

// Same alpha-tint derivation as warningBoxStyle above (dark-mode statusText hue, 0.08
// fill / 0.35 border) — rgb(16, 185, 129) is #10b981, dark mode's success statusText.
const successBoxStyle: CSSProperties = {
  marginBottom: "0.4rem",
  background: "rgba(16, 185, 129, 0.08)",
  border: "1px solid rgba(16, 185, 129, 0.35)",
  borderRadius: "10px",
  padding: "0.65rem 0.85rem",
};

function presetButtonStyle(theme: AppTheme, on: boolean): CSSProperties {
  return {
    border: `1px solid ${on ? theme.accent : theme.border}`,
    borderRadius: 8,
    background: on ? theme.accent : theme.bg,
    color: on ? theme.accentOn : theme.text,
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
    <div style={{ width: size, height: size, borderRadius: "6px", background: theme.border }} />
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
          <div ref={wrapperRef} style={{ width: size, height: size, borderRadius: "6px", overflow: "hidden" }}>
            <Image
              src={iconUrl!}
              alt={skill.skillName}
              width={size}
              height={size}
              onError={() => {
                if (wrapperRef.current) wrapperRef.current.style.display = "none";
                if (fallbackRef.current) fallbackRef.current.style.display = "block";
              }}
              style={{ borderRadius: "6px", display: "block" }}
              unoptimized
            />
          </div>
          <div ref={fallbackRef} style={{ display: "none", width: size, height: size, borderRadius: "6px", background: theme.border }} />
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
    <div style={successBoxStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: statusText(theme, "success"), flexShrink: 0, lineHeight: 1 }}>★</span>
        <p style={{ margin: 0, fontSize: "0.82rem", color: statusText(theme, "success"), fontWeight: 700 }}>
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

// Fixed 3-column grid (Base Value / % Value / % Not Applied), each field pinned to an
// explicit gridColumn — a stat that skips a column (Attack Power's Base-only, HP's
// missing % Not Applied for most classes) still lines up under the stats that have
// all 3, instead of the remaining columns stretching to fill the row.
const tripleStatGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.35rem" };

function TripleStatRow({
  id, draft, onUpdate, theme, isMainStat, requireFilled, showHpPercentUnapplied,
}: {
  id: TripleStatFieldId;
  draft: StatsStepDraft;
  onUpdate: (id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) => void;
  theme: AppTheme;
  isMainStat: boolean;
  /** MapleScouter only — a blank field here should jump-to-fix same as a bad value. */
  requireFilled: boolean;
  /** Only Demon Avenger's HP feeds a %-not-applied-style calculation (its Demon Fury
   *  scaling) — every other class's HP is flavor/context only, so this column would be
   *  meaningless noise for them. Guided flows never hit this (HP only ever appears in
   *  tripleIds for Demon Avenger there already); only showAllStats' "every class, every
   *  field" profile pencil actually needs the distinction. */
  showHpPercentUnapplied?: boolean;
}) {
  const d: TripleStatDraft = draft[id] ?? { base: "", percent: "", percentUnapplied: "" };
  const sub = statInputStyle(theme);
  const label = TRIPLE_LABELS[id];
  // "% Not Applied" is shown for every stat EXCEPT ATT (meaningless there — it only
  // ever existed as a legacy scouter workaround for pre-remaster Kanna's HP→MATT
  // conversion, and a stray value produces an invalid range; MapleScouter always sends
  // ATT % not applied as 0) and HP for classes where it isn't their Demon Fury-style
  // scaling stat.
  const isAttack = id === "attackPower" || id === "magicAtt";
  const hidePercentUnapplied = isAttack || (id === "hp" && !showHpPercentUnapplied);
  // Only the class's main stat (STR/DEX/INT/LUK) is at risk of the Total-vs-Base
  // mix-up MapleScouter itself warns about — HP/ATT/MATT don't have that ambiguity.
  const showBaseWarning = isMainStat && Number(d.base) >= MAIN_STAT_BASE_VALUE_WARN_AT;
  const showPercentUnappliedWarning = isMainStat && Number(d.percentUnapplied) >= MAIN_STAT_PERCENT_UNAPPLIED_WARN_AT;
  return (
    <div>
      <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
        {label}
      </p>
      <div style={tripleStatGridStyle}>
        <div style={{ gridColumn: 1, position: "relative" }}>
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
        <div style={{ gridColumn: 2 }}>
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
        {!hidePercentUnapplied && (
          <div style={{ gridColumn: 3 }}>
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

// Same heading + boxed-input chrome as TripleStatRow, for a single-value field (no
// %/% Not Applied columns) — keeps the profile-only MP/DF/TF/PP row visually
// consistent with the rest of Basic Stats instead of the compact Combat Stats row style.
function SingleStatRow({
  id, label, draft, onUpdate, theme,
}: {
  id: StatFieldId;
  label: string;
  draft: StatsStepDraft;
  onUpdate: (id: string, val: string) => void;
  theme: AppTheme;
}) {
  const raw = (draft as Record<string, unknown>)[id];
  const value = typeof raw === "string" ? raw : "";
  return (
    <div>
      <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
        {label}
      </p>
      <div style={tripleStatGridStyle}>
        <div style={{ gridColumn: 1 }}>
          <input type="text" aria-label={`${label} value`} value={value} placeholder="0" style={statInputStyle(theme)}
            onChange={(e) => onUpdate(id, sanitizeDigitsInput(e.target.value))}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            onKeyDown={numericKeyDown}
          />
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>Base Value</p>
        </div>
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
            else if (id === "ignoreDefense") onUpdate(id, clampIgnoreDefense(e.target.value));
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
// Already known (locked, read-only) whenever full_setup or a prior scouter run already
// recorded it (draft.weaponAtt is seeded from scouter.weaponAtt regardless of flow — see
// storedStatsToStatsStepDraft's caller) — only genuinely asks when it's still blank.
function WeaponAttField({ label, usesMagicWeapon, value, onUpdate, theme }: {
  label: string;
  usesMagicWeapon: boolean;
  value: string;
  onUpdate: (val: string) => void;
  theme: AppTheme;
}) {
  const statName = usesMagicWeapon ? "Magic ATT" : "Attack Power";
  const statShortName = usesMagicWeapon ? "Magic ATT" : "ATT";
  const locked = value.trim() !== "";
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
            {locked && (
              <InfoTooltip
                content={{ title: "Why this is locked", description: "Auto-filled from your Equipment." }}
                theme={theme}
                icon={<LockGlyph />}
                label="Why this is locked"
                bordered={false}
              />
            )}
          </div>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {showWeaponAttWarning && <InputWarningBubble message={`That looks like your total ${statShortName}, enter your weapon's ${statShortName}.`} theme={theme} />}
            <input
              type="text"
              inputMode="numeric"
              aria-label={label}
              value={value}
              placeholder="0"
              readOnly={locked}
              style={{ ...statInputStyle(theme, "4.6rem"), ...(locked ? { borderColor: theme.muted, cursor: "default" } : {}) }}
              data-flagged-field={showWeaponAttWarning || !value.trim() ? "true" : undefined}
              onChange={(e) => { if (!locked) onUpdate(sanitizeDigitsInput(e.target.value)); }}
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
  optsDef, draft, onUpdate, theme, characterLevel, required, existingEquipment,
}: {
  optsDef: ClassSetupOptionsDef | undefined;
  draft: StatsStepDraft;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  theme: AppTheme;
  characterLevel?: number;
  required?: boolean;
  existingEquipment?: EquipmentLike | null;
}) {
  const opts = draft.setupOptions ?? {};
  const isDA = Boolean(optsDef?.epheniaSoul);
  const isLiberationEligible = characterLevel === undefined || characterLevel >= GENESIS_LIBERATION_LEVEL;
  // A weapon already on file at the active preset is definitive proof either way —
  // Genesis Liberation's Final Damage bonus lives on the weapon item itself, so a real,
  // non-genesis weapon there proves "not liberated right now" just as surely as a
  // Genesis/Destiny one proves "liberated" — so it's shown locked, same treatment as
  // Wild Hunter rank, whenever the active preset's weapon is known at all.
  const isLiberatedByWeapon = deriveIsLiberatedFromWeapon(existingEquipment);
  const liberationWeaponName = getLiberationWeaponName(existingEquipment);
  const derivedWeaponHand = deriveWeaponHandFromWeapon(existingEquipment);
  const derivedRuinForceShield = deriveHasRuinForceShield(existingEquipment);

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
          checked={isLiberatedByWeapon ?? opts.isLiberated}
          onToggle={(v) => onUpdate({ isLiberated: v })}
          theme={theme}
          disabled={isLiberatedByWeapon !== undefined}
          tooltip={{
            title: "Genesis Liberation",
            description: <>Unlocked in Limina (Lv. 255) after defeating the Black Mage in Story Mode at least once. You can start this quest with <a href="https://maplestorywiki.net/w/(Genesis_Weapon)_Trailing_the_Traces_of_the_Black_Mage" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>[Genesis Weapon] Trailing the Traces of the Black Mage</a>. Completing the full questline is called liberation.</>,
            link: { href: "https://maplestorywiki.net/w/Genesis_Weapon", label: "See more on the wiki" },
          }}
          lockTooltip={{
            title: "Why this is locked",
            description: isLiberatedByWeapon
              ? <>Auto-filled because <strong>{liberationWeaponName}</strong> is in your active Equipment preset.</>
              : "Auto-filled because your active Equipment preset's weapon isn't a Genesis or Destiny weapon.",
          }}
        />
      )}
      {optsDef?.ruinForceShield && (
        <ChecklistCheckbox
          label="Ruin Force Shield equipped?"
          checked={derivedRuinForceShield ?? opts.hasRuinForceShield}
          onToggle={(v) => onUpdate({ hasRuinForceShield: v })}
          theme={theme}
          disabled={derivedRuinForceShield !== undefined}
          tooltip={{
            title: "Ruin Force Shield",
            description: "A secondary weapon exclusive to Demon Slayer and Demon Avenger, providing Final Damage +10% and Max HP +560 at the cost of increased damage taken.",
            imageUrls: [resourceImageUrl("item", RUIN_FORCE_SHIELD_ITEM_ID, "iconRaw.png")],
            link: { href: "https://maplestorywiki.net/w/Ruin_Force_Shield", label: "See more on the wiki" },
          }}
          lockTooltip={{
            title: "Why this is locked",
            description: "Auto-filled from your active Equipment preset's secondary slot.",
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
        derivedWeaponHand !== undefined ? (
          <ChecklistGroup
            question="What weapon type are you using?"
            options={[{ value: derivedWeaponHand, label: derivedWeaponHand === "1h" ? "One-Handed" : "Two-Handed" }]}
            value={derivedWeaponHand}
            onToggle={() => {}}
            theme={theme}
            disabled
            tooltip={{
              title: "Weapon Type",
              description: "Hover over your weapon in your equipment inventory and look to the right of the item icon to find your weapon type.",
            }}
            lockTooltip={{
              title: "Why this is locked",
              description: "Auto-filled from your active Equipment preset's weapon.",
            }}
          />
        ) : (
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
        )
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
      <ChecklistGroup
        question="What's your Wild Hunter's level?"
        options={matchedOption ? [matchedOption] : []}
        value={whSource.rank}
        onToggle={() => {}}
        theme={theme}
        disabled
        lockTooltip={{
          title: "Why this is locked",
          description: <>Auto-filled from <strong>{whSource.name}</strong> (Lv {whSource.level}). Wild Hunter&apos;s rank is shared across your whole Legion in this world.</>,
        }}
      />
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
// Shown in both flows: full_setup's own dedicated Legion Artifacts step feeds these same
// two fields (see deriveLegionArtifactFields), so they render here too, locked whenever
// that board is actually customized — same superset-with-locking treatment as every
// other field in this questionnaire.
function LegionArtifactQuestions({ sq, worldLegion, board, onUpdate, theme }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  worldLegion: StoredScouterLegion | undefined;
  /** The effective (live-session-preferred, else persisted) Legion Artifact board — see
   *  resolveEffectiveLegionBoard. */
  board: LegionArtifactBoardDraft | null;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
}) {
  // A value merely being STORED in worldLegion could just be an earlier manual answer
  // (not proof) — same as Wild Hunter's own manual fallback never locking just because a
  // value is already on file (see WildHunterRankQuestion). Re-derive straight from the
  // real crystal board instead, so each field only locks once IT specifically has been
  // assigned to a crystal — assigning Bonus EXP somewhere says nothing about whether
  // Final Attack Damage has ever been touched, so the two must lock independently.
  const boardDerived = board ? deriveLegionArtifactFields(board) : undefined;
  const extraTargetDerived = boardDerived?.artifactExtraTarget;
  const finalAtkDerived = boardDerived?.artifactFinalAttackDmg;
  const extraTargetLocked = extraTargetDerived !== undefined;
  const finalAtkLocked = finalAtkDerived !== undefined;
  const lockTooltip = { title: "Why this is locked", description: "Auto-filled from this world's Legion Artifacts." };
  const manualFinalAtk = sq.artifactFinalAttackDmg ?? (worldLegion?.artifactFinalAttackDmg != null ? String(worldLegion.artifactFinalAttackDmg) : "");
  return (
    <>
      <ChecklistCheckbox
        label="Increases Bonus EXP stat?"
        checked={extraTargetLocked ? extraTargetDerived : (sq.artifactExtraTarget ?? worldLegion?.artifactExtraTarget)}
        onToggle={(v) => onUpdate({ artifactExtraTarget: v })}
        theme={theme}
        disabled={extraTargetLocked}
        tooltip={{
          title: "Increases Bonus EXP",
          description: <>Found in your Legion window, in the Artifacts tab. Assigning the <strong>Increases Bonus EXP</strong> stat to a crystal also grants <strong>Max AoE Skill Targets: +1</strong>, listed under Artifact Bonuses.</>,
        }}
        lockTooltip={lockTooltip}
      />
      <LegionFinalAttackField
        value={finalAtkLocked ? finalAtkDerived : manualFinalAtk}
        onUpdate={(v) => onUpdate({ artifactFinalAttackDmg: v })}
        theme={theme}
        locked={finalAtkLocked}
        lockTooltip={lockTooltip}
      />
    </>
  );
}

type InnerAbilityDerivedLine = "passive" | "multiTarget" | "neither" | undefined;

// Inner Ability line is a per-character fact like Liberated/Soul/weapon type, so it
// groups with Character Info rather than Artifacts or Legion. Same superset treatment as
// Weapon Hand/Ruin Force Shield/Legion Artifacts: shown as a normal manual ask in BOTH
// flows whenever the active preset's real lines aren't known yet, locked once they are
// — full_setup having its own dedicated Inner Ability substep later in this same step
// doesn't mean hiding this one, same reasoning that unhid Legion Artifacts.
function InnerAbilityLineQuestion({ sq, onUpdate, theme, required, derivedLine }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
  required?: boolean;
  /** The active preset's real line, or "neither" if known-but-absent, or undefined if
   *  there's no Inner Ability data on file/entered yet at all. */
  derivedLine: InnerAbilityDerivedLine;
}) {
  if (derivedLine !== undefined) {
    const matchedOption = IA_LINE_OPTIONS.find((o) => o.value === derivedLine);
    return (
      <ChecklistGroup
        question="Which Inner Ability line do you use for bossing?"
        options={matchedOption ? [matchedOption] : IA_LINE_OPTIONS}
        value={derivedLine}
        onToggle={() => {}}
        theme={theme}
        disabled
        tooltip={{
          title: "Inner Ability",
          description: <>Found in your Stats window: click <strong>Detail</strong>, then the <strong>Ability</strong> button at the bottom right. Only a Legendary-rank Inner Ability can roll these lines.</>,
        }}
        lockTooltip={{
          title: "Why this is locked",
          description: "Auto-filled from your active Inner Ability preset.",
        }}
      />
    );
  }
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

// The Inner Ability line question needs the REAL active preset (whichever one the
// profile's "Set Active" button last confirmed, existingActivePreset) — NOT this
// draft's own tab switcher, which is just a viewing convenience while editing and isn't
// an authoritative "this is what's equipped" choice (same reasoning
// convertInnerAbilityDraftToStored's own comment gives for why it always saves preset 0).
// Line VALUES still come from the live draft, so an edit made to that preset later in
// this same session (full_setup's own Inner Ability substep) is reflected immediately.
function deriveKnownInnerAbilityLine(
  draftIA: IADraft | undefined,
  existingActivePreset: number | undefined,
): InnerAbilityDerivedLine {
  const full = normalizeIA(draftIA);
  const known = { activePreset: existingActivePreset ?? 0, presets: full.presets };
  return innerAbilityHasData(known) ? (deriveInnerAbilityLine(known) ?? "neither") : undefined;
}

// WH Legion rank, Legion Artifacts, and Inner Ability line are all shared between
// full_setup and maplescouter_setup (full_setup is a superset — see WildHunterRankQuestion/
// LegionArtifactQuestions/InnerAbilityLineQuestion above). Weapon ATT is the one deliberate
// exception, scouter-ONLY here — full_setup asks it in the Equipment step's weapon picker
// instead, since maplescouter_setup has no Equipment step to move it into.
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
  derivedInnerAbilityLine: InnerAbilityDerivedLine,
  derivedWeaponHand: "1h" | "2h" | undefined,
): boolean {
  const o = opts ?? {};
  const s = sq ?? {};
  const isDA = Boolean(optsDef?.epheniaSoul);
  // A locked, derived weapon hand (see SetupOptionsSection) counts as answered too — it's
  // never written into o.weaponHand since there's nothing to ask.
  if (optsDef?.weaponType && o.weaponHand === undefined && derivedWeaponHand === undefined) return false;
  if (isDA && o.soulType === undefined) return false;
  // A rank already showing on screen via the world fallback (see WildHunterRankQuestion)
  // counts as answered — s.whLegion alone doesn't know about that fallback.
  if (!whSource && s.whLegion === undefined && whWorldRank === undefined) return false;
  // A locked, derived answer (see InnerAbilityLineQuestion) counts as answered too — it's
  // never written into s.innerAbilityLine since there's nothing to ask.
  if (derivedInnerAbilityLine === undefined && s.innerAbilityLine === undefined) return false;
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
  confineToSubstep, onExitStep,
  classData, characterLevel, tripleIds, draft,
  handleTripleUpdate, handleSingleUpdate, handleCooldownUpdate,
  showWeaponAtt, weaponAttLabel, usesMagicWeapon, isScouter, showAllStats,
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
  /** True when opened from a profile bookmark's edit pencil, straight into this
   *  substep — see confineToSubstep on the default export. */
  confineToSubstep?: boolean;
  /** The step-level Back (leaves the "stats" step entirely) — used in place of
   *  goToSubstep(0) when confined, since substep 0 isn't reachable there. */
  onExitStep: () => void;
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
  /** Profile-pencil only (stats_flow) — shows the resource bar (MP/DF/TF/PP) and
   *  Normal Enemy Damage, which the guided Setup flows never ask for. */
  showAllStats: boolean;
}) {
  const primaryStat = classData?.requiredStats.find((s): s is TripleStatFieldId => MAIN_STAT_IDS.has(s));
  const resourceLabel = classData?.resourceLabel ?? "MP";
  // Profile-pencil only: Normal Enemy Damage slots in right after Boss Damage, above
  // Critical Rate — matching where it sits in the in-game Character Info window.
  const combatRightIds: StatFieldId[] = showAllStats
    ? [...COMBAT_RIGHT.slice(0, 2), "normalEnemyDamage", ...COMBAT_RIGHT.slice(2)]
    : COMBAT_RIGHT;
  const requiredStatsSet = new Set(classData?.requiredStats ?? []);
  const showHpPercentUnapplied = requiredStatsSet.has("hp");
  const showArcanePower = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredPower = isSacredEligible(characterLevel, classData?.isLegacy);
  const symbolIds = ([showArcanePower && "arcanePower", showSacredPower && "sacredPower"] as const).filter(Boolean) as StatFieldId[];
  const statsComplete = isScouter
    ? isStatsSubstepComplete(draft, tripleIds, showWeaponAtt, primaryStat, showArcanePower, showSacredPower)
    : isStatsSubstepSane(draft, tripleIds, primaryStat, showWeaponAtt);
  const rootRef = useRef<HTMLDivElement>(null);
  const frame = confinableFrameProps(confineToSubstep, onExitStep, onFinish, {
    substepIndex: substep,
    substepCount,
    onBack: () => goToSubstep(0),
    onNext: hasMoreSubsteps ? () => goToSubstep(2) : onNext,
    nextLabel: hasMoreSubsteps ? "Continue" : undefined,
  });
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
      substepIndex={frame.substepIndex}
      substepCount={frame.substepCount}
      stepLabel="Character Info"
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description={statsSubstepDescription(isScouter)}
      onBack={frame.onBack}
      onNext={frame.onNext}
      onFinish={onFinish}
      nextLabel={frame.nextLabel}
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
              <TripleStatRow
                key={id} id={id} draft={draft} onUpdate={handleTripleUpdate} theme={theme}
                isMainStat={id === primaryStat} requireFilled={isScouter}
                showHpPercentUnapplied={showHpPercentUnapplied}
              />
            ))}
            {showAllStats && (
              <SingleStatRow id="mp" label={resourceLabel} draft={draft} onUpdate={handleSingleUpdate} theme={theme} />
            )}
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
            {combatRightIds.map((id) => (
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

// A live, not-yet-saved Equipment draft from THIS session (any non-empty raw value —
// the Equipment step's own mount-time backfill from storage means even an untouched-
// this-session visit produces a full snapshot, not a partial one) always wins over
// whatever's already persisted from before this session, so clearing a weapon mid-
// session is reflected immediately instead of only after a Finish-then-reopen round
// trip. Falls back to the roster's persisted equipment when Equipment hasn't been
// visited THIS session at all.
function resolveEffectiveEquipment(
  equipmentRawValue: string | undefined,
  existingEquipment: EquipmentLike | null | undefined,
): EquipmentLike | null | undefined {
  if (!equipmentRawValue?.trim()) return existingEquipment;
  return equipmentLikeFromDraft(parseEquipmentStepDraft(equipmentRawValue));
}

// Same reasoning as resolveEffectiveEquipment above, for Legion Artifacts — a live
// in-session board draft (once any crystal's been touched) already carries forward
// every other crystal's real persisted data via updateCrystal's own dense rebuild (see
// LegionArtifactsSetupStep.tsx), so it's a safe, complete snapshot to prefer wholesale.
function resolveEffectiveLegionBoard(
  legionArtifactsRawValue: string | undefined,
  worldLegionArtifact: StoredLegionArtifact | undefined,
): LegionArtifactBoardDraft | null {
  if (legionArtifactsRawValue?.trim()) return parseLegionArtifactBoardDraft(legionArtifactsRawValue);
  if (!worldLegionArtifact) return null;
  return {
    artifactLevel: worldLegionArtifact.artifactLevel !== undefined ? String(worldLegionArtifact.artifactLevel) : undefined,
    crystals: worldLegionArtifact.crystals as LegionCrystalDraft[] | undefined,
  };
}

function QuickQuestionsSubstep({
  theme, stepNumber, totalSteps, substepCount, substepAnimStyle,
  onBack, onNext, onFinish, onValidityChange,
  classData, draft, whSource, worldScouterLegion, worldLegionArtifact, equipmentRawValue, legionArtifactsRawValue,
  isScouter, showWhLegion, characterLevel, existingRecord,
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
  worldLegionArtifact: StoredLegionArtifact | undefined;
  equipmentRawValue: string | undefined;
  legionArtifactsRawValue: string | undefined;
  isScouter: boolean;
  showWhLegion: boolean;
  characterLevel?: number;
  existingRecord: StoredCharacterRecord | null;
  handleSetupOptUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  handleScouterQUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
}) {
  const effectiveEquipment = resolveEffectiveEquipment(equipmentRawValue, existingRecord?.equipment);
  const effectiveLegionBoard = resolveEffectiveLegionBoard(legionArtifactsRawValue, worldLegionArtifact);
  const derivedInnerAbilityLine = deriveKnownInnerAbilityLine(draft.innerAbility, existingRecord?.stats?.innerAbility?.activePreset);
  const derivedWeaponHand = deriveWeaponHandFromWeapon(effectiveEquipment);
  const questionnaireComplete = !isScouter || isScouterQuestionnaireComplete(
    classData?.setupOptionsDef, draft.setupOptions, draft.scouterQuestions, whSource, worldScouterLegion?.wildHunterRank,
    derivedInnerAbilityLine, derivedWeaponHand,
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
            existingEquipment={effectiveEquipment}
          />
          <InnerAbilityLineQuestion
            sq={draft.scouterQuestions ?? {}}
            onUpdate={handleScouterQUpdate}
            theme={theme}
            required={isScouter}
            derivedLine={derivedInnerAbilityLine}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <p style={sectionLabelStyle(theme)}>Legion Artifact</p>
          <LegionArtifactQuestions
            sq={draft.scouterQuestions ?? {}}
            worldLegion={worldScouterLegion}
            board={effectiveLegionBoard}
            onUpdate={handleScouterQUpdate}
            theme={theme}
          />
        </div>

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
  onBack, onNext, onFinish, onValidityChange, nextLabel, confineToSubstep,
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
  nextLabel?: string;
  /** True when opened from a profile bookmark's edit pencil — the profile already has
   *  its own "Set preset X as active" control, so the first-time-setup hint below
   *  (which only applies before that control has ever been reached) doesn't apply. */
  confineToSubstep?: boolean;
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
  const overBudgetPresetIndices = hyper.presets.reduce<number[]>((acc, p, i) => {
    if (hyperStatPresetSpent(p, hyperCategoryIds) > hyperBudget) acc.push(i);
    return acc;
  }, []);
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
      nextLabel={nextLabel}
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
      {!confineToSubstep && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
          You can set which preset is active in-game later, from your profile.
        </p>
      )}
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
  onBack, onNext, onFinish, onValidityChange, draft, onUpdate, confineToSubstep,
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
  /** True when opened from a profile bookmark's edit pencil — see HyperStatSubstep's
   *  same prop for why this suppresses the first-time-setup active-preset hint. */
  confineToSubstep?: boolean;
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
        <InnerAbilitySetupStep draft={draft.innerAbility} onUpdate={onUpdate} theme={theme} showActivePresetHint={!confineToSubstep} />
      </SetupStepFrame>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsSetupStep({
  theme, flowId, stepNumber, totalSteps, jobName = "", direction = "forward", targetSubstep, confineToSubstep, onValidityChange, onSubstepChange, characterLevel, characterRoster, confirmedWorldId, confirmedCharacterName, worldScouterLegion, worldLegionArtifact, equipmentRawValue, legionArtifactsRawValue, value, onChange, onBack, onNext, onFinish,
}: StatsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const draft = parseStatsStepDraft(value);
  // This character's already-saved record (if any) — the source for deriving already-
  // known Genesis/Destiny liberation and Inner Ability answers below, since Equipment
  // isn't part of this step's own draft at all.
  const existingRecord = confirmedCharacterName
    ? findRosterCharacterByName(characterRoster ?? [], confirmedCharacterName) ?? null
    : null;
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
  // react-doctor-disable-next-line no-prop-callback-in-effect, no-pass-live-state-to-parent, react-doctor/no-pass-data-to-parent
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

  // stats_flow is only ever reached from the profile bookmark's edit pencil (or a
  // future "set up now" empty-state CTA) — never part of Full Setup/MapleScouter
  // Setup's guided sequence, so it's a safe signal to show every stat field
  // regardless of class ("save people time" gating stays intact for the guided flows).
  const showAllStats = flowId === "stats_flow";
  const classRequiredTripleIds = classData
    ? getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id))
    : [];
  // A class with no known required stats (every legacy job, or any jobName not yet
  // mapped in CLASS_SKILL_DATA) would otherwise render zero Basic Stats fields at all —
  // "don't know what's required" should fall back to showing everything, same rationale
  // showAllStats already uses, not silently hide the whole section.
  const tripleIds = showAllStats || classRequiredTripleIds.length === 0
    ? TRIPLE_STAT_FIELDS.map((f) => f.id)
    : classRequiredTripleIds;

  const { usesMagicWeapon, label: weaponAttLabel } = deriveWeaponAttLabel(classData);

  if (substep === 0) {
    return (
      <QuickQuestionsSubstep
        theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
        substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
        onBack={onBack} onNext={() => goToSubstep(1)} onFinish={onFinish} onValidityChange={onValidityChange}
        classData={classData} draft={draft} whSource={whSource} worldScouterLegion={worldScouterLegion} worldLegionArtifact={worldLegionArtifact}
        equipmentRawValue={equipmentRawValue} legionArtifactsRawValue={legionArtifactsRawValue}
        isScouter={isScouter} showWhLegion={showWhLegion} characterLevel={characterLevel} existingRecord={existingRecord}
        handleSetupOptUpdate={handleSetupOptUpdate} handleScouterQUpdate={handleScouterQUpdate}
      />
    );
  }

  if (substep === 1) return (
    <StatsWindowSubstep
      theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
      substep={substep} substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
      goToSubstep={goToSubstep} hasMoreSubsteps={SUBSTEP_COUNT > 2} onNext={onNext} onFinish={onFinish} onValidityChange={onValidityChange}
      confineToSubstep={confineToSubstep} onExitStep={onBack}
      classData={classData} characterLevel={characterLevel} tripleIds={tripleIds} draft={draft}
      handleTripleUpdate={handleTripleUpdate} handleSingleUpdate={handleSingleUpdate} handleCooldownUpdate={handleCooldownUpdate}
      showWeaponAtt={showWeaponAtt} weaponAttLabel={weaponAttLabel} usesMagicWeapon={usesMagicWeapon} isScouter={isScouter}
      showAllStats={showAllStats}
    />
  );

  // Substep — Hyper Stat (Full setup, Lv 140+ only). Mirrors the in-game Hyper Stats
  // window: every category, level 0–15, entered directly into a two-column list.
  if (substep === hyperStatSubstep) {
    const hyperFrame = confinableFrameProps(confineToSubstep, onBack, onFinish, {
      substepIndex: substep,
      substepCount: SUBSTEP_COUNT,
      onBack: () => goToSubstep(1),
      onNext: () => goToSubstep(innerAbilitySubstep),
      nextLabel: "Continue",
    });
    return (
      <HyperStatSubstep
        theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
        substep={hyperFrame.substepIndex} substepCount={hyperFrame.substepCount} substepAnimStyle={substepAnimStyle}
        onBack={hyperFrame.onBack} onNext={hyperFrame.onNext} nextLabel={hyperFrame.nextLabel}
        onFinish={onFinish} onValidityChange={onValidityChange} confineToSubstep={confineToSubstep}
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
  const iaFrame = confinableFrameProps(confineToSubstep, onBack, onFinish, {
    substepIndex: substep,
    substepCount: SUBSTEP_COUNT,
    onBack: () => goToSubstep(hyperStatSubstep >= 0 ? hyperStatSubstep : 1),
    onNext,
  });
  return (
    <InnerAbilitySubstep
      theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
      substep={iaFrame.substepIndex} substepCount={iaFrame.substepCount} substepAnimStyle={substepAnimStyle}
      onBack={iaFrame.onBack}
      onNext={onNext} onFinish={onFinish} onValidityChange={onValidityChange}
      draft={draft} onUpdate={handleInnerAbilityUpdate} confineToSubstep={confineToSubstep}
    />
  );
}
