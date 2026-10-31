"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { numericKeyDown, sanitizeDigitsInput, decimalKeyDown, sanitizeDecimalInput, clampNumber } from "../../../../lib/inputUtils";
import { joinWithAnd } from "../../../../lib/textUtils";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import { alpha } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import HoverTooltip from "../../../../components/HoverTooltip";
import WarningIcon from "../../../../components/WarningIcon";
import type { SetupStepDefinition } from "../steps";
import { isScouterStatsFlow, type SetupFlowId } from "../flows";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip from "./InfoTooltip";
import { PresetBar } from "./PresetBar";
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
import { statChanges } from "../data/statsChanges";
import { deriveWeaponHandFromWeapon } from "../data/classBranch";
import { equipmentLikeFromDraft, parseEquipmentStepDraft, type EquipmentLike } from "../data/equipmentStepDraft";
import {
  GENESIS_LIBERATION_LEVEL,
  isArcaneEligible,
  isHyperStatEligible,
  isSacredEligible,
  deriveIsLiberatedFromWeapon,
  deriveHasRuinForceShield,
  getLiberationWeaponName,
  normalizeHyperStatDraft,
  parseStatsStepDraft,
  storedStatsToStatsStepDraft,
  serializeStatsStepDraft,
  isStatsSubstepSane,
  isStatsSubstepComplete,
  isStatsSubstepAnyFieldFilled,
  requiredStatsSetHasHp,
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

// Soul Weapon tooltip illustrations. Every stat variant of a Soul item, Beefy, Swift, Clever
// and the rest, shares the same icon, so these are one representative id per family.
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
  /** When true, targetSubstep is the substep opened from a profile bookmark's edit pencil and
   *  should present as this step's only substep: no pips, Back exits the step rather than
   *  moving to a sibling, and Next finishes the step rather than advancing to one. */
  confineToSubstep?: boolean;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  onSubstepChange?: (substepIndex: number) => void;
  characterLevel?: number;
  characterRoster?: StoredCharacterRecord[];
  confirmedWorldId?: number;
  confirmedCharacterName?: string;
  worldScouterLegion?: StoredScouterLegion;
  worldLegionArtifact?: StoredLegionArtifact;
  /** This session's live Equipment and Legion Artifacts step drafts, independent of which step
   *  is active. Takes priority over worldLegionArtifact and the roster's persisted equipment
   *  when non-empty, so clearing a weapon or a Legion Artifact line mid-session shows up on
   *  returning to Quick Questions rather than only after a Finish and reopen. */
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

// Ignore DEF compounds as 100 minus 100 times the product of each source's remainder, which
// approaches but never exceeds 100% from real sources. The since-removed Quick Reload node
// granted a flat 100% for its duration, so 100 is a real ceiling worth hard-clamping the same
// way as Ignore Elemental Resistance.
const IGNORE_DEFENSE_MAX = 100;

// Real in-game ceilings for these combat stats, found by spamming a large number into
// official MapleScouter's own input and reading back what it clamps to.
const COMBAT_STAT_MAX: Partial<Record<StatFieldId, number>> = {
  additionalStatusDamage: 30,
  bossDamage: 750,
  criticalDamage: 251,
  buffDuration: 400,
  summonDuration: 42,
  arcanePower: 1750,
  sacredPower: 1750,
  damage: 999,
  criticalRate: 999,
};

function clampDecimalStatInput(raw: string, max: number): string {
  const sanitized = sanitizeDecimalInput(raw);
  if (sanitized === "" || sanitized.endsWith(".")) return sanitized;
  // Only reformat when actually over the cap. Round-tripping every keystroke through Number()
  // and String() strips trailing zeros, turning "5.0" into "5" and fighting the user mid-type
  // whenever they enter a decimal.
  if (Number(sanitized) > max) return String(max);
  return sanitized;
}

function clampIntegerStatInput(raw: string, max: number): string {
  const digits = sanitizeDigitsInput(raw);
  if (digits === "") return digits;
  return String(clampNumber(Number(digits), max));
}

// Cooldown Reduction's own real caps, matching the Scouter Simulator's coolTimeReduce limit
// (ScouterSimulatorDialog.tsx) for seconds and the in-game percent cap.
const COOLDOWN_REDUCTION_SECONDS_MAX = 7;
const COOLDOWN_REDUCTION_PERCENT_MAX = 6;

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

// Both boxes tint from the status hue their own text already uses, at 0.08 fill and 0.35
// border, so the surround follows the active color mode instead of freezing one mode's hue.
const warningBoxStyle = (theme: AppTheme): CSSProperties => ({
  marginBottom: "0.8rem",
  background: alpha(statusText(theme, "warning"), 0.08),
  border: `1px solid ${alpha(statusText(theme, "warning"), 0.35)}`,
  borderRadius: "10px",
  padding: "0.65rem 0.85rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
});

const successBoxStyle = (theme: AppTheme): CSSProperties => ({
  marginBottom: "0.4rem",
  background: alpha(statusText(theme, "success"), 0.08),
  border: `1px solid ${alpha(statusText(theme, "success"), 0.35)}`,
  borderRadius: "10px",
  padding: "0.65rem 0.85rem",
});

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
                if (fallbackRef.current) fallbackRef.current.style.display = "flex";
              }}
              style={{ borderRadius: "6px", display: "block" }}
              unoptimized
            />
          </div>
          <div ref={fallbackRef} style={{
            display: "none", alignItems: "center", justifyContent: "center", width: size, height: size,
            borderRadius: "6px", fontWeight: 800, fontSize: Math.max(12, size * 0.35),
            background: "rgba(127,127,127,0.18)", color: theme.muted,
          }}>
            {skill.skillName.match(/[a-zA-Z0-9]/)?.[0] ?? "?"}
          </div>
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
    <div style={warningBoxStyle(theme)}>
      {others.map((w) => (
        <div key={w.skill?.skillName ?? w.message}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <WarningIcon color={statusText(theme, "warning")} />
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
            <WarningIcon color={statusText(theme, "warning")} />
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
    <div style={successBoxStyle(theme)}>
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

// Fixed 3-column grid for Base Value, % Value and % Not Applied, each field pinned to an
// explicit gridColumn. A stat that skips a column, such as Attack Power being Base-only or HP
// having no % Not Applied for most classes, still lines up under the stats that have all 3
// rather than letting the remaining columns stretch to fill the row.
const tripleStatGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.35rem" };

// Flat data-table construction, not real control flow: a handful of independent booleans
// (hidePercentUnapplied, showBaseWarning, showPercentUnappliedWarning) computed once and read
// straight into one JSX return, mirroring the in-game Character Info row shape.
// react-doctor-disable-next-line no-high-complexity-react-function
function TripleStatRow({
  id, draft, onUpdate, theme, isMainStat, requireFilled, showHpPercentUnapplied,
}: {
  id: TripleStatFieldId;
  draft: StatsStepDraft;
  onUpdate: (id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) => void;
  theme: AppTheme;
  isMainStat: boolean;
  /** MapleScouter only. A blank field here jumps to fix the same way a bad value does. */
  requireFilled: boolean;
  /** Only Demon Avenger's HP feeds a percent-not-applied calculation, through its Demon Fury
   *  scaling. Every other class's HP is context only, so the column would be noise for them.
   *  Guided flows never reach this, since HP already appears in tripleIds only for Demon
   *  Avenger; only showAllStats' every-class profile pencil needs the distinction. */
  showHpPercentUnapplied?: boolean;
}) {
  const saved = useContext(SavedStatValuesContext);
  const d: TripleStatDraft = draft[id] ?? { base: "", percent: "", percentUnapplied: "" };
  const sub = statInputStyle(theme);
  const label = TRIPLE_LABELS[id];
  // "% Not Applied" shows for every stat except ATT and, for classes without a Demon Fury
  // style scaling stat, HP. It is meaningless on ATT, existing only as a legacy scouter
  // workaround for pre-remaster Kanna's HP to MATT conversion, where a stray value produces an
  // invalid range. MapleScouter always sends ATT percent-not-applied as 0.
  const isAttack = id === "attackPower" || id === "magicAtt";
  const hidePercentUnapplied = isAttack || (id === "hp" && !showHpPercentUnapplied);
  // Only the class's main stat is at risk of the Total versus Base mix-up MapleScouter itself
  // warns about. HP, ATT and MATT have no such ambiguity.
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
          <WasHint theme={theme} hint={wasHint(saved, `${id}.base`)} hideBubble={showBaseWarning} block>
            <input type="text" inputMode="numeric" aria-label={`${label} base value`} data-stat-key={`${id}.base`} value={d.base} style={sub}
              data-flagged-field={showBaseWarning || (requireFilled && !d.base.trim()) ? "true" : undefined}
              onChange={(e) => onUpdate(id, "base", sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
          </WasHint>
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>Base Value</p>
        </div>
        <div style={{ gridColumn: 2 }}>
          <div style={{ position: "relative" }}>
            <WasHint theme={theme} hint={wasHint(saved, `${id}.percent`)} block>
              <input type="text" inputMode="numeric" aria-label={`${label} percent value`} data-stat-key={`${id}.percent`} value={d.percent} style={sub}
                data-flagged-field={requireFilled && !d.percent.trim() ? "true" : undefined}
                onChange={(e) => onUpdate(id, "percent", sanitizeDigitsInput(e.target.value))}
                onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
                onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
                onKeyDown={numericKeyDown}
              />
            </WasHint>
          </div>
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>% Value</p>
        </div>
        {!hidePercentUnapplied && (
          <div style={{ gridColumn: 3 }}>
            <div style={{ position: "relative" }}>
              {showPercentUnappliedWarning && <InputWarningBubble message={`That % looks too large, enter your % Value Not Applied for ${label}.`} theme={theme} />}
              <WasHint theme={theme} hint={wasHint(saved, `${id}.percentUnapplied`)} hideBubble={showPercentUnappliedWarning} block>
                <input type="text" inputMode="numeric" aria-label={`${label} percent not applied`} data-stat-key={`${id}.percentUnapplied`} value={d.percentUnapplied} style={sub}
                  data-flagged-field={showPercentUnappliedWarning || (requireFilled && !d.percentUnapplied.trim()) ? "true" : undefined}
                  onChange={(e) => onUpdate(id, "percentUnapplied", sanitizeDigitsInput(e.target.value))}
                  onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
                  onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
                  onKeyDown={numericKeyDown}
                />
              </WasHint>
            </div>
            <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>% Not Applied</p>
          </div>
        )}
      </div>
    </div>
  );
}

// The same heading and boxed-input chrome as TripleStatRow, for a single-value field with no
// percent columns. Keeps the profile-only MP, DF, TF and PP row consistent with the rest of
// Basic Stats rather than using the compact Combat Stats row style.
function SingleStatRow({
  id, label, draft, onUpdate, theme,
}: {
  id: StatFieldId;
  label: string;
  draft: StatsStepDraft;
  onUpdate: (id: string, val: string) => void;
  theme: AppTheme;
}) {
  const saved = useContext(SavedStatValuesContext);
  const raw = (draft as Record<string, unknown>)[id];
  const value = typeof raw === "string" ? raw : "";
  return (
    <div>
      <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
        {label}
      </p>
      <div style={tripleStatGridStyle}>
        <div style={{ gridColumn: 1 }}>
          <WasHint theme={theme} hint={wasHint(saved, id)} block>
            <input type="text" inputMode="numeric" aria-label={`${label} value`} data-stat-key={id} value={value} style={statInputStyle(theme)}
              onChange={(e) => onUpdate(id, sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
          </WasHint>
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>Base Value</p>
        </div>
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

/** Cooldown Reduction's own two-input (seconds + percent) shape, split out of CombatStatCell
 *  since it doesn't share that function's single-input layout. */
function CooldownReductionCell({
  label, draft, onUpdateCooldown, theme, requireFilled,
}: {
  label: string;
  draft: StatsStepDraft;
  onUpdateCooldown: (field: "seconds" | "percent", val: string) => void;
  theme: AppTheme;
  requireFilled: boolean;
}) {
  const saved = useContext(SavedStatValuesContext);
  const cd = draft.cooldownReduction ?? { seconds: "", percent: "" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <WasHint theme={theme} hint={wasHint(saved, "cooldownReduction.seconds")}>
            <input type="text" inputMode="numeric" aria-label={`${label} seconds`} data-stat-key="cooldownReduction.seconds" value={cd.seconds} style={{ ...statInputStyle(theme, "2.9rem"), paddingRight: "1.05rem" }}
              data-flagged-field={requireFilled && !cd.seconds.trim() ? "true" : undefined}
              onChange={(e) => onUpdateCooldown("seconds", sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
          </WasHint>
          <span style={inputSuffixStyle(theme)}>s</span>
        </div>
        <div style={{ position: "relative" }}>
          <WasHint theme={theme} hint={wasHint(saved, "cooldownReduction.percent")}>
            <input type="text" inputMode="numeric" aria-label={`${label} percent`} data-stat-key="cooldownReduction.percent" value={cd.percent} style={{ ...statInputStyle(theme, "2.9rem"), paddingRight: "1.05rem" }}
              data-flagged-field={requireFilled && !cd.percent.trim() ? "true" : undefined}
              onChange={(e) => onUpdateCooldown("percent", sanitizeDigitsInput(e.target.value))}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              onKeyDown={numericKeyDown}
            />
          </WasHint>
          <span style={inputSuffixStyle(theme)}>%</span>
        </div>
      </div>
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
  /** MapleScouter only. A blank field here jumps to fix the same way a bad value does. */
  requireFilled: boolean;
}) {
  const saved = useContext(SavedStatValuesContext);
  const label = STAT_LABELS[id] ?? id;

  if (id === "cooldownReduction") {
    return <CooldownReductionCell label={label} draft={draft} onUpdateCooldown={onUpdateCooldown} theme={theme} requireFilled={requireFilled} />;
  }

  const raw = (draft as Record<string, unknown>)[id];
  const val = typeof raw === "string" ? raw : "";
  const isRaw = RAW_VALUE_STAT_IDS.has(id);
  const allowsDecimal = !isRaw && !NO_DECIMAL_STAT_IDS.has(id);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <WasHint theme={theme} hint={wasHint(saved, id)}>
          <input type="text" inputMode={allowsDecimal ? "decimal" : "numeric"} aria-label={label} data-stat-key={id} value={val}
            style={isRaw ? statInputStyle(theme, "4.6rem") : { ...statInputStyle(theme, "4.6rem"), paddingRight: "1.15rem" }}
            data-flagged-field={requireFilled && !val.trim() ? "true" : undefined}
            onChange={(e) => {
              const max = COMBAT_STAT_MAX[id];
              if (id === "ignoreElementalResistance") onUpdate(id, clampDecimalStatInput(e.target.value, IGNORE_ELEMENTAL_RESIST_MAX));
              else if (id === "ignoreDefense") onUpdate(id, clampDecimalStatInput(e.target.value, IGNORE_DEFENSE_MAX));
              else if (max !== undefined) onUpdate(id, allowsDecimal ? clampDecimalStatInput(e.target.value, max) : clampIntegerStatInput(e.target.value, max));
              else if (allowsDecimal) onUpdate(id, sanitizeDecimalInput(e.target.value));
              else onUpdate(id, sanitizeDigitsInput(e.target.value));
            }}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            onKeyDown={allowsDecimal ? decimalKeyDown : numericKeyDown}
          />
        </WasHint>
        {!isRaw && <span style={inputSuffixStyle(theme)}>%</span>}
      </div>
    </div>
  );
}

// ── Setup options section ─────────────────────────────────────────────────────

// Encodes a {soulType, soulLevel} pair into the flat radio value the Soul Weapon
// ChecklistGroup uses. Ephenia is only ever offered to DA, so a stale "ephenia"
// soulType left over from a class switch reads as unselected for anyone else.
function deriveSoulValue(opts: NonNullable<StatsStepDraft["setupOptions"]>, isDA: boolean): string | null {
  if (opts.soulType === "none") return "none";
  if (opts.soulType === "mugong") {
    if (opts.soulLevel === 1) return "mugong_1";
    if (opts.soulLevel === 2) return "mugong_2";
    return null;
  }
  if (isDA && opts.soulType === "ephenia") {
    if (opts.soulLevel === 1) return "ephenia_1";
    if (opts.soulLevel === 2) return "ephenia_2";
    return null;
  }
  return null;
}

function soulPatchForValue(val: string | null): Partial<NonNullable<StatsStepDraft["setupOptions"]>> {
  if (val === "mugong_1") return { soulType: "mugong", soulLevel: 1 };
  if (val === "mugong_2") return { soulType: "mugong", soulLevel: 2 };
  if (val === "ephenia_1") return { soulType: "ephenia", soulLevel: 1 };
  if (val === "ephenia_2") return { soulType: "ephenia", soulLevel: 2 };
  return { soulType: "none", soulLevel: undefined };
}

/** The weapon-type question's two shapes: a locked single-option display when the active
 *  Equipment preset's weapon already answers it, or the normal editable choice otherwise.
 *  Split out of SetupOptionsSection since it's the one question here with its own internal
 *  branch, unlike the section's other checkboxes/groups, which are one ChecklistX call each. */
function WeaponTypeQuestion({
  derivedWeaponHand, opts, onUpdate, theme, required,
}: {
  derivedWeaponHand: "1h" | "2h" | undefined;
  opts: NonNullable<StatsStepDraft["setupOptions"]>;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  theme: AppTheme;
  required?: boolean;
}) {
  if (derivedWeaponHand !== undefined) {
    return (
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
    );
  }
  return (
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
  );
}

function SetupOptionsSection({
  optsDef, draft, onUpdate, theme, characterLevel, isLegacy, required, existingEquipment,
}: {
  optsDef: ClassSetupOptionsDef | undefined;
  draft: StatsStepDraft;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) => void;
  theme: AppTheme;
  characterLevel?: number;
  isLegacy?: boolean;
  required?: boolean;
  existingEquipment?: EquipmentLike | null;
}) {
  const opts = draft.setupOptions ?? {};
  const isDA = Boolean(optsDef?.epheniaSoul);
  // Legacy classes (pre-5th-job, no Arcane River access) can't reach Limina to start the
  // liberation questline at all, so the question never applies regardless of level.
  const isLiberationEligible = !isLegacy
    && (characterLevel === undefined || characterLevel >= GENESIS_LIBERATION_LEVEL);
  // A weapon on file at the active preset is definitive proof either way. Genesis Liberation's
  // Final Damage bonus lives on the weapon item, so a non-Genesis weapon there proves not
  // liberated as surely as a Genesis or Destiny one proves liberated. So the question shows
  // locked, the same treatment as Wild Hunter rank, whenever the active preset's weapon is
  // known.
  const isLiberatedByWeapon = deriveIsLiberatedFromWeapon(existingEquipment);
  const liberationWeaponName = getLiberationWeaponName(existingEquipment);
  const derivedWeaponHand = deriveWeaponHandFromWeapon(existingEquipment);
  const derivedRuinForceShield = deriveHasRuinForceShield(existingEquipment);

  const soulValue = deriveSoulValue(opts, isDA);
  // Deselecting the active option collapses to "none" rather than an ambiguous unanswered
  // state, the same pattern as WildHunterRankQuestion's onToggle.
  function handleSoulToggle(val: string | null) {
    onUpdate(soulPatchForValue(val));
  }

  // "Neither" is a real radio option here too, on the same reasoning as the WH rank and IA
  // line questions: it is the discoverable way to say none rather than a special opt-out.
  // Named "Neither" rather than "No soul weapon" because a player can have a different,
  // untracked boss soul equipped, and this question only concerns these two types.
  const soulQuestion = isDA
    ? "Do you have a Mu Gong Soul or Ephenia Soul on your weapon?"
    : "Do you have a Mu Gong Soul on your weapon?";
  const soulOptions = isDA
    ? [
        { value: "ephenia_1", label: "Ephenia Lv 1" },
        { value: "ephenia_2", label: "Ephenia Lv 2" },
        { value: "mugong_1", label: "Mu Gong Soul Lv 1" },
        { value: "mugong_2", label: "Mu Gong Soul Lv 2" },
        { value: "none", label: "Neither", standalone: true },
      ]
    : [
        { value: "mugong_1", label: "Mu Gong Soul Lv 1" },
        { value: "mugong_2", label: "Mu Gong Soul Lv 2" },
        { value: "none", label: "Neither", standalone: true },
      ];

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
      {optsDef?.weaponType && (
        <WeaponTypeQuestion derivedWeaponHand={derivedWeaponHand} opts={opts} onUpdate={onUpdate} theme={theme} required={required} />
      )}
      <ChecklistGroup
        question={soulQuestion}
        options={soulOptions}
        value={soulValue}
        onToggle={handleSoulToggle}
        theme={theme}
        required={required}
        tooltip={{
          title: "Soul Weapons",
          description: (
            <>
              A Soul Weapon is a weapon with a boss soul applied to it, that can provide a unique skill.
              <br />
              <br />
              Mu Gong comes with <a href="https://maplestorywiki.net/w/Memories" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>Memories</a>, increasing ATT/Magic ATT.{isDA && <> Ephenia comes with <a href="https://maplestorywiki.net/w/A_Queenly_Fragrance" target="_blank" rel="noreferrer" style={{ color: theme.accent, fontWeight: 700, textDecoration: "none" }}>A Queenly Fragrance</a>, increasing Max HP &amp; MP for party members.</>}
            </>
          ),
          imageUrls: isDA
            ? [resourceImageUrl("item", MU_GONG_SOUL_ITEM_ID, "iconRaw.png"), resourceImageUrl("item", EPHENIA_SOUL_ITEM_ID, "iconRaw.png")]
            : [resourceImageUrl("item", MU_GONG_SOUL_ITEM_ID, "iconRaw.png")],
          link: { href: "https://maplestorywiki.net/w/Soul_Weapon", label: "See more on the wiki" },
        }}
      />
    </div>
  );
}


// Wild Hunter Legion rank is account-level and hard-locked, so it shows read-only, derived
// per-world from the roster, in both full_setup and maplescouter_setup. Lives under its own
// Legion section since it is not sourced from any specific in-game screen, unlike the Artifacts
// questions below.
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
    // A Wild Hunter is in this world's roster, so the rank is authoritative and shows derived
    // and locked, auto-updating as that character levels. Renders the same ChecklistGroup as
    // the manual case for visual consistency, but with only the matching bracket in the option
    // list, since the others can never apply here and would be unclickable clutter.
    const matchedOption = WH_RANK_OPTIONS.find((o) => o.value === whSource.rank);
    return (
      <ChecklistGroup
        question="What is your Wild Hunter's level?"
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
  // No Wild Hunter in the roster, so the user sets the world's rank manually. Clicking the
  // active bracket clears it, the same as explicitly picking "No Wild Hunter". Both map to the
  // "none" sentinel rather than undefined, which means untouched this session and inherit the
  // world's stored value (see resolveWhLegionRank). Writing undefined here would make the
  // click appear to do nothing, since the displayed value falls back to whWorldRank below.
  return (
    <ChecklistGroup
      question="What is your Wild Hunter's level?"
      options={WH_RANK_OPTIONS}
      value={sq.whLegion ?? whWorldRank ?? null}
      onToggle={(v) => onUpdate({ whLegion: v ?? "none" })}
      theme={theme}
      required={required}
    />
  );
}

const LEGION_ARTIFACT_LOCK_TOOLTIP = { title: "Why this is locked", description: "Auto-filled from this world's Legion Artifacts." };

// The two Maple Union artifacts, both from the Legion window's Artifacts tab. Shown in both
// flows: full_setup's dedicated Legion Artifacts step feeds these same two fields (see
// deriveLegionArtifactFields), so they render here too, locked whenever that board is
// customized. Same superset-with-locking treatment as every other field here.
function LegionArtifactQuestions({ sq, worldLegion, board, onUpdate, theme }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  worldLegion: StoredScouterLegion | undefined;
  /** The effective Legion Artifact board, preferring this session's live draft over the
   *  persisted one. See resolveEffectiveLegionBoard. */
  board: LegionArtifactBoardDraft | null;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
}) {
  // A value stored in worldLegion could be an earlier manual answer rather than proof, the
  // same reason Wild Hunter's manual fallback never locks just because a value is on file (see
  // WildHunterRankQuestion). Re-deriving from the real crystal board means each field locks
  // only once it has been assigned to a crystal. Assigning Bonus EXP says nothing about
  // whether Final Attack Damage was touched, so the two lock independently.
  const boardDerived = board ? deriveLegionArtifactFields(board) : undefined;
  const extraTargetDerived = boardDerived?.artifactExtraTarget;
  const finalAtkDerived = boardDerived?.artifactFinalAttackDmg;
  const extraTargetLocked = extraTargetDerived !== undefined;
  const finalAtkLocked = finalAtkDerived !== undefined;
  const manualFinalAtk = sq.artifactFinalAttackDmg ?? (worldLegion?.artifactFinalAttackDmg != null ? String(worldLegion.artifactFinalAttackDmg) : "");
  return (
    <>
      <ChecklistCheckbox
        label="Increases Bonus EXP assigned to a crystal?"
        checked={extraTargetLocked ? extraTargetDerived : (sq.artifactExtraTarget ?? worldLegion?.artifactExtraTarget)}
        onToggle={(v) => onUpdate({ artifactExtraTarget: v })}
        theme={theme}
        disabled={extraTargetLocked}
        tooltip={{
          title: "Increases Bonus EXP",
          description: <>Found in your Legion window, in the Artifacts tab. Assigning the <strong>Increases Bonus EXP</strong> stat to a crystal also grants <strong>Max AoE Skill Targets: +1</strong>, listed under Artifact Bonuses.</>,
        }}
        lockTooltip={LEGION_ARTIFACT_LOCK_TOOLTIP}
      />
      <LegionFinalAttackField
        value={finalAtkLocked ? finalAtkDerived : manualFinalAtk}
        onUpdate={(v) => onUpdate({ artifactFinalAttackDmg: v })}
        theme={theme}
        locked={finalAtkLocked}
        lockTooltip={LEGION_ARTIFACT_LOCK_TOOLTIP}
      />
    </>
  );
}

type InnerAbilityDerivedLine = "passive" | "multiTarget" | "neither" | undefined;

// Inner Ability line is a per-character fact like Liberated/Soul/weapon type, so it
// groups with Character Info rather than Artifacts or Legion. Same superset treatment as
// Weapon Hand/Ruin Force Shield/Legion Artifacts: shown as a normal manual ask in BOTH
// flows whenever the active preset's real lines are not known yet, and locked once they are.
// full_setup having its own Inner Ability substep later in this step is not a reason to hide
// this one, the same reasoning that unhid Legion Artifacts.
function InnerAbilityLineQuestion({ sq, onUpdate, theme, required, derivedLine }: {
  sq: NonNullable<StatsStepDraft["scouterQuestions"]>;
  onUpdate: (patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) => void;
  theme: AppTheme;
  required?: boolean;
  /** The active preset's real line, "neither" when known to be absent, or undefined when no
   *  Inner Ability data has been entered or saved yet. */
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
      // Deselecting maps to the real "neither" option, as the Wild Hunter rank question maps
      // to "none". Both exist as explicit radio options so clicking the active one again lands
      // on a complete answer rather than going blank, which would also fail the
      // questionnaire-complete check.
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

// The Inner Ability line question needs the real active preset, meaning existingActivePreset,
// whichever one the profile's "Set Active" button chose. Not this draft's tab switcher, which
// is a viewing convenience while editing rather than an authoritative statement of what is
// equipped, the same reasoning convertInnerAbilityDraftToStored gives for always saving preset
// 0. Line values still come from the live draft, so an edit made to that preset later in the
// session, through full_setup's Inner Ability substep, shows up immediately.
function deriveKnownInnerAbilityLine(
  draftIA: IADraft | undefined,
  existingActivePreset: number | undefined,
): InnerAbilityDerivedLine {
  const full = normalizeIA(draftIA);
  const known = { activePreset: existingActivePreset ?? 0, presets: full.presets };
  return innerAbilityHasData(known) ? (deriveInnerAbilityLine(known) ?? "neither") : undefined;
}

// WH Legion rank, Legion Artifacts and the Inner Ability line are shared between full_setup
// and maplescouter_setup, full_setup being a superset. See WildHunterRankQuestion,
// LegionArtifactQuestions and InnerAbilityLineQuestion above.
function deriveScouterVisibility(flowId: SetupFlowId | undefined): { isScouter: boolean; showWhLegion: boolean } {
  const isScouter = isScouterStatsFlow(flowId);
  return {
    isScouter,
    showWhLegion: isScouter || flowId === "full_setup",
  };
}

// MapleScouter needs real data to calculate correctly, but only the pick-one radio groups need
// forcing. An unchecked checkbox already reads unambiguously as no, with no distinct unanswered
// state, and Final Attack Skill Damage defaults to 0 when blank. A radio group differs: every
// option, including None and Neither, is a deliberate click, so an untouched group is genuinely
// ambiguous and worth blocking on. full_setup never calls this, keeping its questionnaire
// optional.
function isScouterQuestionnaireComplete(
  optsDef: ClassSetupOptionsDef | undefined,
  opts: NonNullable<StatsStepDraft["setupOptions"]> | undefined,
  sq: NonNullable<StatsStepDraft["scouterQuestions"]> | undefined,
  whSource: WhAutofillSource | null,
  whWorldRank: WhLegionRank | "none" | undefined,
  derivedInnerAbilityLine: InnerAbilityDerivedLine,
  derivedWeaponHand: "1h" | "2h" | undefined,
): boolean {
  const o = opts ?? {};
  const s = sq ?? {};
  // A locked, derived weapon hand (see SetupOptionsSection) counts as answered. It is never
  // written into o.weaponHand, since there is nothing to ask.
  if (optsDef?.weaponType && o.weaponHand === undefined && derivedWeaponHand === undefined) return false;
  if (o.soulType === undefined) return false;
  // A rank already on screen through the world fallback (see WildHunterRankQuestion) counts as
  // answered, since s.whLegion alone does not know about that fallback.
  if (!whSource && s.whLegion === undefined && whWorldRank === undefined) return false;
  // A locked, derived answer (see InnerAbilityLineQuestion) counts as answered. It is never
  // written into s.innerAbilityLine, since there is nothing to ask.
  if (derivedInnerAbilityLine === undefined && s.innerAbilityLine === undefined) return false;
  return true;
}

// Renders "X left" or "X over". Pulled out of the main component rather than left as an inline
// ternary purely to keep its cognitive complexity under the sonarjs cap.
function hyperStatBudgetSuffix(budget: number, spent: number): string {
  const remaining = budget - spent;
  return remaining < 0 ? `${Math.abs(remaining).toLocaleString()} over` : `${remaining.toLocaleString()} left`;
}

// Names every over-budget preset rather than only those off screen. All 3 persist to storage
// regardless of which is active, so all 3 must independently stay within budget, and the
// message says so even when the displayed preset is one of the offenders. Mirrors HEXA Stat's
// node message, which lists every offending node the same way.
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

// Substep 1, the stat window fields for Basic, Combat and Symbols. Pulled into its own
// component rather than left inline like substeps 0 and 2, purely to keep the main component's
// cognitive complexity under the sonarjs cap, which MapleScouter's completion gating pushed it
// over.
/** The substep's validation state: which symbol columns show, and whether every field or just
 *  a sane subset is required. Split out of StatsWindowSubstep since these derivations chain off
 *  each other (showArcanePower/showSacredPower feed anyFieldFilled, which feeds requireComplete,
 *  which feeds statsComplete) independently of anything about rendering. */
function deriveStatsSubstepValidation({
  characterLevel, classData, isScouter, showAllStats, draft, tripleIds, primaryStat,
}: {
  characterLevel: number | undefined;
  classData: ClassSkillData | undefined;
  isScouter: boolean;
  showAllStats: boolean;
  draft: StatsStepDraft;
  tripleIds: TripleStatFieldId[];
  primaryStat: TripleStatFieldId | undefined;
}) {
  const showArcanePower = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredPower = isSacredEligible(characterLevel, classData?.isLegacy);
  const showHpPercentUnapplied = requiredStatsSetHasHp(classData);
  const symbolIds = ([showArcanePower && "arcanePower", showSacredPower && "sacredPower"] as const).filter(Boolean) as StatFieldId[];
  // full_setup stays skippable while untouched, but once a player starts filling it in this
  // treats it like MapleScouter's every-field-required rule. See isStatsSubstepAnyFieldFilled's
  // doc comment for why: players who missed one field and finished setup were confused that
  // MapleScouter could not calculate.
  //
  // stats_flow, the profile's standalone Stats tab and showAllStats here, is excluded. Unlike
  // full_setup it opens pre-seeded from the character's saved stats (see
  // buildSeededStepTestByStep), so any-field-filled would trip on open whether or not anything
  // was touched this session. There is no reliable just-typed signal to gate on, so it stays
  // sanity-only.
  const anyFieldFilled = !isScouter && !showAllStats
    && isStatsSubstepAnyFieldFilled(draft, tripleIds, showArcanePower, showSacredPower);
  const requireComplete = isScouter || anyFieldFilled;
  const statsComplete = requireComplete
    ? isStatsSubstepComplete(draft, tripleIds, primaryStat, showArcanePower, showSacredPower, showHpPercentUnapplied)
    : isStatsSubstepSane(draft, tripleIds, primaryStat);
  return { showHpPercentUnapplied, symbolIds, anyFieldFilled, requireComplete, statsComplete };
}

/** The saved character's stats as a draft, to compare the boxes against, or null for a
 *  character with none saved yet (a first setup), which has nothing to compare. */
function savedStatsDraft(record: StoredCharacterRecord | null): StatsStepDraft | null {
  return record ? storedStatsToStatsStepDraft(record) : null;
}

/** Saved values of the changed boxes by data-stat-key, for each box's "Was …" hover hint. */
const SavedStatValuesContext = createContext<ReadonlyMap<string, string>>(new Map());

function wasHint(saved: ReadonlyMap<string, string>, key: string): string | null {
  const before = saved.get(key);
  return before === undefined ? null : `Was ${before || "blank"}`;
}

/** A stat box's "Was …" hint in the app's tooltip, on hover and while typing. Always wraps the
 *  box, with no bubble while it's unchanged, so changing it never remounts the input mid-typing.
 *  `block` keeps a full-width box full width.
 *
 *  Also marks a changed box with the `stat-changed` class, which a fixed rule in the substep's
 *  stylesheet turns into a bar down the box's left edge (a different shape and color from the
 *  focus ring, so a changed box never reads as selected). A class toggle rather than per-key CSS
 *  text regenerated on every keystroke: style-rewriting browser extensions (dark mode ones in
 *  particular) can miss a <style> element's text changing and keep painting a stale bar.
 *
 *  `hideBubble` keeps the bar but drops the "Was" bubble, for a box whose input warning bubble
 *  already sits in the same spot above it. */
function WasHint({ theme, hint, hideBubble = false, block = false, children }: {
  theme: AppTheme; hint: string | null; hideBubble?: boolean; block?: boolean; children: ReactNode;
}) {
  return (
    <HoverTooltip
      label={hideBubble ? null : hint}
      theme={theme}
      className={hint !== null ? "stat-changed" : undefined}
      style={block ? { display: "block" } : undefined}
    >
      {children}
    </HoverTooltip>
  );
}

function StatsWindowSubstep({
  theme, stepNumber, totalSteps, substep, substepCount, substepAnimStyle,
  goToSubstep, hasMoreSubsteps, onNext, onFinish, onValidityChange,
  confineToSubstep, onExitStep,
  classData, characterLevel, tripleIds, draft,
  handleTripleUpdate, handleSingleUpdate, handleCooldownUpdate,
  isScouter, showAllStats, savedDraft,
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
  /** True when opened from a profile bookmark's edit pencil straight into this substep. See
   *  confineToSubstep on the default export. */
  confineToSubstep?: boolean;
  /** The step-level Back, which leaves the stats step entirely. Used in place of
   *  goToSubstep(0) when confined, since substep 0 is not reachable there. */
  onExitStep: () => void;
  classData: ClassSkillData | undefined;
  characterLevel?: number;
  tripleIds: TripleStatFieldId[];
  draft: StatsStepDraft;
  handleTripleUpdate: (id: TripleStatFieldId, field: keyof TripleStatDraft, val: string) => void;
  handleSingleUpdate: (id: string, val: string) => void;
  handleCooldownUpdate: (field: "seconds" | "percent", val: string) => void;
  isScouter: boolean;
  /** Profile-pencil only, in stats_flow. Shows the resource bar (MP, DF, TF, PP) and
   *  Normal Enemy Damage, which the guided Setup flows never ask for. */
  showAllStats: boolean;
  /** The character's saved stats as a draft, when editing one that has them, for the boxes
   *  changed from them (statsChanges.ts). */
  savedDraft: StatsStepDraft | null;
}) {
  const primaryStat = classData?.requiredStats.find((s): s is TripleStatFieldId => MAIN_STAT_IDS.has(s));
  const resourceLabel = classData?.resourceLabel ?? "MP";
  // Profile-pencil only. Normal Enemy Damage slots in right after Boss Damage and above
  // Critical Rate, matching where it sits in the in-game Character Info window.
  const combatRightIds: StatFieldId[] = showAllStats
    ? [...COMBAT_RIGHT.slice(0, 2), "normalEnemyDamage", ...COMBAT_RIGHT.slice(2)]
    : COMBAT_RIGHT;
  const { showHpPercentUnapplied, symbolIds, anyFieldFilled, requireComplete, statsComplete } = deriveStatsSubstepValidation({
    characterLevel, classData, isScouter, showAllStats, draft, tripleIds, primaryStat,
  });
  const changes = savedDraft
    ? statChanges(draft, savedDraft, tripleIds, (id) => TRIPLE_LABELS[id], [...COMBAT_LEFT, ...combatRightIds, ...symbolIds, ...(showAllStats ? ["mp" as const] : [])])
    : [];
  const savedValues = new Map(changes.map((c) => [c.key, c.before]));
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
      /* Collapse to one column on the panel's own width rather than the viewport. The
         setup panel is much narrower than the window, so a viewport query collapsed far
         too late. Gap lives in CSS rather than inline so the query can tighten the column
         seam to match the row gap when the two columns stack. */
      .stats-combat-grid { gap: 0.75rem; }
      /* Grid rather than flex, so a single visible symbol, meaning Arcane alone at Lv
         200-259, stays pinned to the left column's width instead of a lone flex:1 item
         stretching across the row and dragging its input far to the right. */
      .stats-symbols-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
      @container (max-width: 520px) {
        .stats-combat-grid { flex-direction: column; gap: 0.4rem; }
        .stats-symbols-grid { grid-template-columns: 1fr; gap: 0.4rem; }
      }
      .stats-substep-root .stat-changed input { box-shadow: inset 3px 0 0 ${statusText(theme, "info")}; }
    `}</style>
    <SavedStatValuesContext.Provider value={savedValues}>
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
                isMainStat={id === primaryStat} requireFilled={requireComplete}
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
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} requireFilled={requireComplete} />
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {combatRightIds.map((id) => (
              <CombatStatCell key={id} id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} requireFilled={requireComplete} />
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
                <CombatStatCell id={id} draft={draft} onUpdate={handleSingleUpdate} onUpdateCooldown={handleCooldownUpdate} theme={theme} requireFilled={requireComplete} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!statsComplete && (
        <button
          type="button"
          onClick={() => scrollToFlaggedField(rootRef.current)}
          style={flaggedValueLinkStyle(theme)}
        >
          {(() => {
            if (isScouter) return "Fill in every stat above, and fix any flagged values, to continue.";
            // Full Setup's completeness requirement starts only once the player has filled in
            // something (see anyFieldFilled). Unlike MapleScouter's always-on version of this
            // message, Next locking here is a new state the player just caused rather than a
            // rule already in effect, so it needs its own copy explaining why. Otherwise a
            // sudden lock reads as a bug.
            if (anyFieldFilled) return "Since you filled in at least one stat, fill in the rest above (and fix any flagged values) to continue.";
            return "Fix the flagged value above to continue.";
          })()}
        </button>
      )}
    </SetupStepFrame>
    </SavedStatValuesContext.Provider>
    </div>
  );
}

// ── Substep 0: quick questions ────────────────────────────────────────────────

// A live, unsaved Equipment draft from this session always wins over what was persisted
// before it, so clearing a weapon mid-session shows up immediately rather than after a Finish
// and reopen. Any non-empty raw value counts, since the Equipment step's mount-time backfill
// from storage means even an untouched visit produces a full snapshot rather than a partial
// one. Falls back to the roster's persisted equipment when Equipment was never visited this
// session.
function resolveEffectiveEquipment(
  equipmentRawValue: string | undefined,
  existingEquipment: EquipmentLike | null | undefined,
): EquipmentLike | null | undefined {
  if (!equipmentRawValue?.trim()) return existingEquipment;
  return equipmentLikeFromDraft(parseEquipmentStepDraft(equipmentRawValue));
}

// Same reasoning as resolveEffectiveEquipment above, for Legion Artifacts. Once any crystal is
// touched, the live in-session board draft already carries every other crystal's persisted data
// through updateCrystal's dense rebuild (see LegionArtifactsSetupStep.tsx), making it a
// complete snapshot safe to prefer wholesale.
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
  onBack, onNext, onFinish, onValidityChange, confined,
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
  /** Opened on its own from the Scouter bookmark's pencil, as "Scouter Questions", finishing on
   *  its own Next. */
  confined: boolean;
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
        substepCount={confined ? 1 : substepCount}
        stepLabel={confined ? "Scouter Questions" : "Quick Questions"}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        description="Answer what applies to your character below."
        onBack={onBack}
        onNext={confined ? onFinish : onNext}
        onFinish={onFinish}
        nextLabel={confined ? undefined : "Continue"}
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
            isLegacy={classData?.isLegacy}
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
  /** True when opened from a profile bookmark's edit pencil. The profile already has its own
   *  "Set preset X as active" control, so the first-time-setup hint below, which applies only
   *  before that control has been reached, doesn't apply. */
  confineToSubstep?: boolean;
  characterLevel?: number;
  classData: ClassSkillData | undefined;
  hyper: HyperStatDraft;
  handleHyperStatUpdate: (id: string, val: string) => void;
  switchHyperPreset: (n: number) => void;
  copyHyperPreset: (from: number) => void;
  clearHyperPreset: () => void;
}) {
  // Arcane Power appears only once the character can have Arcane Force, the same eligibility
  // the Symbols section uses in the stat-window substep.
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
  // All 3 presets persist to storage regardless of which is active, so Continue stays blocked
  // while any preset is over budget. Otherwise switching to a valid preset bypasses the check
  // while an overspent one is still saved, the same class of bug as HEXA Stat's preset check.
  const overBudgetPresetIndices = hyper.presets.reduce<number[]>((acc, p, i) => {
    if (hyperStatPresetSpent(p, hyperCategoryIds) > hyperBudget) acc.push(i);
    return acc;
  }, []);
  const anyPresetOverBudget = overBudgetPresetIndices.length > 0;
  return (
    <div key={2} className="stats-hyper-root" style={substepAnimStyle}>
    <style>{`
      .stats-hyper-root { container-type: inline-size; }
      /* Gap lives in CSS rather than inline so the container query can override it. When
         the two columns stack, the inter-column gap matches the row gap, so the seam
         between columns isn't wider than the rest of the list. */
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
      <PresetBar
        theme={theme}
        count={HYPER_STAT_PRESET_COUNT}
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
          Preset 1 is set as active by default. If you boss on a different preset, change that afterward from your profile.
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
  /** True when opened from a profile bookmark's edit pencil. See HyperStatSubstep's same
   *  prop for why this suppresses the first-time-setup active-preset hint. */
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

// A flat substep dispatch (if substep === N return <SubstepComponent/>), each branch its own
// cohesive, self-contained substep; splitting further would just move the same branches into an
// equally-long if/else chain of function calls, the same shape as BookmarkPageBody
// (CharacterProfileOverviewScreen.tsx).
// react-doctor-disable-next-line no-high-complexity-react-function
export default function StatsSetupStep({
  theme, flowId, stepNumber, totalSteps, jobName = "", direction = "forward", targetSubstep, confineToSubstep, onValidityChange, onSubstepChange, characterLevel, characterRoster, confirmedWorldId, confirmedCharacterName, worldScouterLegion, worldLegionArtifact, equipmentRawValue, legionArtifactsRawValue, value, onChange, onBack, onNext, onFinish,
}: StatsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const draft = parseStatsStepDraft(value);
  // This character's saved record, if any. The source for deriving already-known Genesis and
  // Destiny liberation and Inner Ability answers below, since Equipment is not part of this
  // step's draft.
  const existingRecord = confirmedCharacterName
    ? findRosterCharacterByName(characterRoster ?? [], confirmedCharacterName) ?? null
    : null;
  // Hyper Stat is a Full Setup detail MapleScouter never uses, so it gets its own substep in
  // every flow except the scouter one. "% Not Applied" is not flow-specific and shows for every
  // non-ATT stat everywhere (see TripleStatRow). Also hidden below Lv 140, like Genesis
  // Liberation, Arcane and Sacred, since a character who cannot have Hyper Stats yet should not
  // be asked to fill them in.
  const showHyperStat = !isScouterStatsFlow(flowId) && isHyperStatEligible(characterLevel);
  const { isScouter, showWhLegion } = deriveScouterVisibility(flowId);

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
    const max = field === "seconds" ? COOLDOWN_REDUCTION_SECONDS_MAX : COOLDOWN_REDUCTION_PERCENT_MAX;
    updateDraft({ cooldownReduction: { ...cd, [field]: clampIntegerStatInput(val, max) } });
  }

  function handleSetupOptUpdate(patch: Partial<NonNullable<StatsStepDraft["setupOptions"]>>) {
    updateDraft({ setupOptions: { ...draft.setupOptions, ...patch } });
  }

  function handleScouterQUpdate(patch: Partial<NonNullable<StatsStepDraft["scouterQuestions"]>>) {
    updateDraft({ scouterQuestions: { ...draft.scouterQuestions, ...patch } });
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

  // Inner Ability is a Character Info fact from the in-game Stats window. Full Setup collects
  // it in its own detailed substep, while MapleScouter asks a simpler version inline in substep
  // 0. No level gate, since Inner Ability is not level-locked the way Hyper Stat is.
  const showInnerAbility = !isScouterStatsFlow(flowId);

  // Substeps: questions → stat fields → hyper stat (Lv 140+, full setup only) →
  // inner ability (full setup only). Hyper Stat and Inner Ability each occupy the
  // next free slot in that order, so either can be absent without leaving a gap.
  const hyperStatSubstep = showHyperStat ? 2 : -1;
  let innerAbilitySubstep = -1;
  if (showInnerAbility) innerAbilitySubstep = showHyperStat ? 3 : 2;
  const lastSubstep = Math.max(1, hyperStatSubstep, innerAbilitySubstep);
  const SUBSTEP_COUNT = lastSubstep + 1;

  const [substep, setSubstep] = useState(() => targetSubstep ?? (direction === "backward" ? lastSubstep : 0));
  // Reports the mount-time default once, so entering a step backward, which starts on a
  // substep other than 0, is still persisted for resume even if the player reloads before
  // navigating again. Later changes are reported from goToSubstep below rather than a
  // substep-watching effect. Removing this last mount-time report would mean lifting substep
  // into a value the parent controls, which is not worth the blast radius for a bookkeeping
  // report that never causes a visible re-render.
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

  // stats_flow is reached only from the profile bookmark's edit pencil, never from Full Setup
  // or MapleScouter Setup's guided sequence, so it is a safe signal to show every stat field
  // regardless of class. The time-saving gating stays intact for the guided flows.
  const showAllStats = flowId === "stats_flow";
  const classRequiredTripleIds = classData
    ? getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id))
    : [];
  // A class with no known required stats, meaning every legacy job or any jobName not yet
  // mapped in CLASS_SKILL_DATA, would otherwise render zero Basic Stats fields. Not knowing
  // what is required should fall back to showing everything, the same rationale showAllStats
  // uses, rather than hiding the section.
  const tripleIds = showAllStats || classRequiredTripleIds.length === 0
    ? TRIPLE_STAT_FIELDS.map((f) => f.id)
    : classRequiredTripleIds;

  if (substep === 0) {
    return (
      <QuickQuestionsSubstep
        theme={theme} stepNumber={stepNumber} totalSteps={totalSteps}
        substepCount={SUBSTEP_COUNT} substepAnimStyle={substepAnimStyle}
        onBack={onBack} onNext={() => goToSubstep(1)} onFinish={onFinish} onValidityChange={onValidityChange}
        confined={confineToSubstep === true}
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
      isScouter={isScouter}
      showAllStats={showAllStats}
      savedDraft={savedStatsDraft(existingRecord)}
    />
  );

  // Hyper Stat substep, Full Setup at Lv 140 and up only. Mirrors the in-game Hyper Stats
  // window, with every category entered directly into a two-column list.
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

  // Inner Ability substep, Full Setup only. A Character Info fact, but detailed enough at a
  // grade plus 3 tiered lines to warrant its own substep rather than folding into substep 0's
  // questionnaire.
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
