import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { SetupFlowId } from "../../setup/flows";
import type { SetupStepId } from "../../setup/steps";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle, secondaryButtonStyle, successButtonStyle } from "../components/uiStyles";
import { findClassById, COMMON_SKILLS, type HexaSkillDef, type HexaSkillLevels, type HexaMasteryNode } from "../../../tools/hexa-skills/hexa-classes";
import { SkillIcon as HexaSkillTileIcon } from "../../../tools/hexa-skills/hexa-ui";
import { readCharacterToolData } from "../../../tools/characterToolStorage";
import { resolveClassId, getClassSetupOverrides } from "../../setup/data/nexonJobMapping";
import { CLASS_SKILL_DATA, getClassDataByNexonJobName, isLegacyClass, type ClassSkillData } from "../../setup/data/classSkillData";
import { HEXA_STAT_OPTIONS, getHexaStatBonus, getMainStatLabel, getAttackLabel, type HexaStatNode, type HexaStatEntry, type HexaStatSlot } from "../../setup/data/hexaStatData";
import type { StoredCharacterEquipment, StoredCharacterRecord, StoredCharacterStats, StoredHyperStat, StoredInnerAbility, StoredIATier, StoredTripleStatField, StoredFamiliarSlot } from "../../model/charactersStore";
import { SetupFlowButtons } from "./QuickSetupIntroScreen";
import { STAT_LABELS } from "../../setup/data/statFields";
import { HYPER_STAT_CATEGORIES, type HyperStatCategoryDef } from "../../setup/data/hyperStatData";
import { isHyperStatEligible, isArcaneEligible, isSacredEligible, HYPER_STAT_LEVEL, ARCANE_POWER_LEVEL, SACRED_POWER_LEVEL } from "../../setup/data/statsStepDraft";
import { IA_TIER_LABELS } from "../../setup/data/innerAbilityData";
import { resolveFinalDamagePercent } from "../../setup/data/finalDamageData";
import { computeDamageRange } from "../../setup/data/damageRangeData";
import { resolveComboOrdersTier, type ComboOrdersTier } from "../../setup/data/comboOrdersData";
import { isRebootWorld, rebootFinalDamageBonusPercent } from "../../setup/data/rebootData";
import { TIER_COLORS as IA_TIER_COLORS, familiarStatBonuses, type FamiliarStatBonus } from "../../setup/data/familiarsData";
import { statusText } from "../../../../components/statusColors";
import { HexaSkillIcon } from "../../../../components/ResourceImage";
import InfoTooltip, { type TooltipContent } from "../../setup/components/InfoTooltip";
import { ReadOnlySlotTile, ReadOnlySymbolTile } from "../../setup/components/EquipmentSetupStep";
import { ReadOnlyLeveledIconTile } from "../../setup/components/LeveledIconTile";
import { VMatrixNodeIcon, useVMatrixCatalog, type VMatrixNode } from "../../setup/components/VMatrixSetupStep";
import { ReadOnlyFamiliarSlotCard, ReadOnlyBadgeSlot, PRESET_COUNT as FAMILIAR_PRESET_COUNT, BADGE_SIZE as FAMILIAR_BADGE_SIZE, BADGE_BORDER as FAMILIAR_BADGE_BORDER } from "../../setup/components/FamiliarsSetupStep";
import {
  storedPresetToDraft, toDraftItem, type SlotMap, type SlotKey,
  CENTER_WIDTH, COL1_SLOTS, COL2_SLOTS, COL6_SLOTS, COL7_SLOTS, CENTER_BOTTOM_SLOTS,
  SYMBOL_TILE_SIZE, EQUIPMENT_PAGE_LABELS, navBtnStyle,
} from "../../setup/data/equipmentStepDraft";
import { ARCANE_AREAS, SACRED_AREAS, GRAND_SACRED_AREAS, type SymbolArea } from "../../../tools/symbols/symbol-data";
import type { SymbolState } from "../../../tools/symbols/useSymbolState";

interface CharacterProfileOverviewScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

type Theme = PreviewPaneModel["theme"];
type BookmarkId = "overview" | "gender_marriage" | Exclude<SetupStepId, "gender" | "marriage" | "link_skills" | "legion_artifacts" | "buffs" | "oz_rings"> | "setup";

interface BookmarkDef {
  id: BookmarkId;
  tabLabel: string;
  pageLabel: string;
  flowId: SetupFlowId | null;
}

const ALL_BOOKMARKS: BookmarkDef[] = [
  { id: "overview", tabLabel: "Overview", pageLabel: "Overview", flowId: null },
  { id: "gender_marriage", tabLabel: "Bio", pageLabel: "Biography", flowId: "quick_setup" },
  { id: "stats", tabLabel: "Stats", pageLabel: "Stats", flowId: "stats_flow" },
  { id: "equipment", tabLabel: "Gear", pageLabel: "Equipment", flowId: "equipment_flow" },
  { id: "v_matrix", tabLabel: "V Matrix", pageLabel: "V Matrix", flowId: "v_matrix_flow" },
  { id: "hexa_matrix", tabLabel: "HEXA", pageLabel: "HEXA Matrix", flowId: "hexa_matrix_flow" },
  { id: "familiars", tabLabel: "Familiars", pageLabel: "Familiars", flowId: "familiars_flow" },
  { id: "setup", tabLabel: "Setup", pageLabel: "Setup", flowId: null },
];

const MAIN_STAT_FIELDS = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "HP" } as const;
type MainStatKey = keyof typeof MAIN_STAT_FIELDS;

const GENDER_LABELS: Record<"male" | "female", string> = { male: "Male", female: "Female" };

function exportButtonStyle(theme: Theme): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
    color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit",
  };
}

function pencilButtonStyle(theme: Theme): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 26, height: 26, flexShrink: 0,
    color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: 8, cursor: "pointer",
  };
}

function PencilIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function SetupTabIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function BookmarkPageHeader({ theme, label, onEdit, disabled }: { theme: Theme; label: string; onEdit: (() => void) | null; disabled: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>{label}</h3>
      {onEdit !== null && (
        <button
          type="button"
          className="tap-target-44"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          disabled={disabled}
          onClick={onEdit}
          style={pencilButtonStyle(theme)}
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

function EmptyBookmarkState({ theme, label, onSetup, disabled }: { theme: Theme; label: string; onSetup: (() => void) | null; disabled: boolean }) {
  return (
    <div style={{ display: "grid", gap: 10, padding: "0.4rem 0 1rem", justifyItems: "start" }}>
      <p style={{ margin: 0, fontSize: 13, color: theme.muted, fontWeight: 700 }}>Not set up yet.</p>
      {onSetup !== null && (
        <button
          type="button"
          className="tap-target-44"
          disabled={disabled}
          onClick={onSetup}
          style={{ ...primaryButtonStyle(theme, "0.45rem 0.8rem"), fontSize: "0.8rem" }}
        >
          {`Set up ${label}`}
        </button>
      )}
    </div>
  );
}

function GenderPlaceholderIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.7 2.7 0 1 1 3.9 2.4c-.8.4-1.2 1-1.2 1.9v.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PartnerPlaceholderIcon() {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="8.5" r="3.4" />
      <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
    </svg>
  );
}

// Stretches to fill the bookmark panel (rather than a fixed portrait aspect-ratio) so the
// "Partner" block has more room to later swap in an actual character avatar once marriage
// data links to a tracked character. Each block is its own real button: tapping it jumps
// straight into that one setup step (gender or marriage) instead of a single combined
// "Set up" action.
function biographyBlockStyle(theme: Theme, filled: boolean): CSSProperties {
  return {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, background: theme.bg, cursor: "pointer", fontFamily: "inherit", textAlign: "center",
    border: filled ? `1px solid ${theme.border}` : `1px dashed ${theme.border}`,
  };
}

function BiographyBlock({ theme, icon, label, caption, filled, onClick, disabled }: {
  theme: Theme; icon: ReactNode; label: string; caption: string; filled: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      type="button"
      className="tap-target-44"
      onClick={onClick}
      disabled={disabled}
      style={biographyBlockStyle(theme, filled)}
    >
      <div style={{ color: filled ? theme.accentText : theme.muted }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>{label}</div>
      <div style={{ fontSize: 12, color: theme.muted }}>{caption}</div>
    </button>
  );
}

function resolveMarriageCaption(marriage: StoredCharacterRecord["marriage"] | undefined): string {
  if (!marriage || marriage.isMarried === null) return "No partner yet";
  if (!marriage.isMarried) return "Not married";
  return marriage.partnerName ? `Married to ${marriage.partnerName}` : "Married";
}

function resolveGenderCaption(genderOverride: "male" | "female" | "none" | null | undefined, gender: "male" | "female" | null, locked: boolean): string {
  if (genderOverride === "none") return "No gender for this class";
  if (!gender) return "Not set";
  return locked ? `${GENDER_LABELS[gender]} (Locked)` : GENDER_LABELS[gender];
}

function BiographyPanel({ theme, character, onEditStep, disabled }: {
  theme: Theme; character: StoredCharacterRecord | null; onEditStep: (flowId: SetupFlowId) => void; disabled: boolean;
}) {
  const overrides = character ? getClassSetupOverrides(character.jobName) : null;
  // Both cards always show (never hidden) — a class-level lock is a permanent, correct
  // state to display, not missing data. "none" (Zero: no gender concept at all) is
  // distinct from a fixedGender lock (Mihile: locked to a specific, already-set value).
  const genderLocked = Boolean(overrides?.gender);
  const marriageLocked = Boolean(overrides?.skipMarriage);

  const gender = character?.gender === "male" || character?.gender === "female" ? character.gender : null;
  const marriage = character?.marriage;
  const hasMarriage = Boolean(marriage && marriage.isMarried !== null);

  const genderCaption = resolveGenderCaption(overrides?.gender, gender, genderLocked);
  const marriageCaption = marriageLocked ? "Not available for this class" : resolveMarriageCaption(marriage);

  return (
    <div style={{ display: "flex", gap: 14, flex: 1 }}>
      <BiographyBlock
        theme={theme}
        filled={Boolean(gender) || overrides?.gender === "none"}
        icon={gender ? <GenderIcon gender={gender} /> : <GenderPlaceholderIcon />}
        label="Gender"
        caption={genderCaption}
        onClick={() => onEditStep("gender_flow")}
        disabled={disabled || genderLocked}
      />
      <BiographyBlock
        theme={theme}
        filled={hasMarriage}
        icon={hasMarriage && marriage ? <MarriageIcon married={Boolean(marriage.isMarried)} /> : <PartnerPlaceholderIcon />}
        label="Partner"
        caption={marriageCaption}
        onClick={() => onEditStep("marriage_flow")}
        disabled={disabled || marriageLocked}
      />
    </div>
  );
}

// `locked` marks a field that isn't obtainable yet at this character's level (e.g. Arcane
// Power below Lv 200) — distinct from "eligible but not filled in" (notCollected's plain
// "—"), so it dims the row instead of reading like an ordinary data-entry gap.
// A long unbroken value (e.g. Damage Range's "15,069,287") has no spaces to wrap at, so it
// spills into the next grid column instead of staying inside its own — overflowWrap:"anywhere"
// fixed that but over-applied, forcing even short values like "115.00%" to wrap awkwardly
// mid-string whenever their column got remotely tight. A <wbr/> after each comma group gives
// the browser a break point only where a big number can naturally take one; short values with
// no commas get no forced break point at all, so they render on one line exactly as before.
function BreakableValue({ value }: { value: string }) {
  const parts = value.split(",");
  if (parts.length === 1) return <>{value}</>;
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && <>,<wbr /></>}
        </Fragment>
      ))}
    </>
  );
}

function SummaryRow({ label, value, theme, locked }: { label: string; value: string; theme: Theme; locked?: boolean }) {
  return (
    <div className="summary-row" style={{ padding: "6px 0", borderBottom: `1px solid ${theme.border}`, opacity: locked ? 0.55 : 1 }}>
      <span style={{ fontSize: 12, color: theme.muted }}>{label}</span>
      <span className="summary-row-value" style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
        <BreakableValue value={value} />
      </span>
    </div>
  );
}

function WseSlot({ label, name, theme }: { label: string; name: string | null | undefined; theme: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.bg }}>
      <div style={{ width: 26, height: 26, borderRadius: 4, background: theme.border, flexShrink: 0, opacity: 0.5 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted }}>{label}</div>
        <div style={{ fontSize: 12, color: name ? theme.text : theme.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
          {name ?? "not set up"}
        </div>
      </div>
    </div>
  );
}

function resolveHexaClassDef(classId: string | undefined) {
  return classId ? findClassById(classId) : null;
}

function resolveHexaNotice(hasHexa: boolean, isLegacyClass: boolean): string | null {
  if (!hasHexa) {
    return isLegacyClass
      ? "HEXA Matrix is not available.\nThis job cannot advance to 6th job."
      : "HEXA Matrix unlocks at level 260.";
  }
  return null;
}

// HEXA Matrix unlocks at level 260 and is unavailable to legacy (pre-5th-job) classes — see
// the characters CLAUDE.md "Level/legacy gating" table. Also drives whether BookmarkPageBody
// shows the edit pencil — there's nothing to edit on a gated character.
function isHexaMatrixAvailable(character: StoredCharacterRecord | null): boolean {
  if (!character) return false;
  return character.level >= 260 && !isLegacyClass(character.jobName);
}

function resolveMainStatValue(character: StoredCharacterRecord | null, primaryId: string | undefined): string | null {
  if (!character || !primaryId) return null;
  const s = character.stats;
  if (primaryId === "str") return s.str.base || null;
  if (primaryId === "dex") return s.dex.base || null;
  if (primaryId === "int") return s.int.base || null;
  if (primaryId === "luk") return s.luk.base || null;
  if (primaryId === "hp") return s.hp.base || null;
  return null;
}

function readHexaLevels(charName: string | undefined): HexaSkillLevels | null {
  if (!charName) return null;
  const saved = readCharacterToolData<{ levels?: HexaSkillLevels }>(charName, "hexaSkills");
  return saved?.levels ?? null;
}

function readHexaStatNodes(charName: string | undefined): HexaStatNode[] | null {
  if (!charName) return null;
  const saved = readCharacterToolData<{ nodes?: HexaStatNode[] }>(charName, "hexaStat");
  return saved?.nodes ?? null;
}

function readSymbolLevels(charName: string | undefined): Record<string, SymbolState> | null {
  if (!charName) return null;
  const saved = readCharacterToolData<{ symbols?: Record<string, SymbolState> }>(charName, "symbols");
  return saved?.symbols ?? null;
}

function isStatsFilled(character: StoredCharacterRecord | null): boolean {
  if (!character) return false;
  const s = character.stats;
  return Boolean(s.attackPower.base || s.bossDamage || s.str.base || s.dex.base || s.int.base || s.luk.base || s.hp.base);
}

function OverviewBookmark({ model }: { model: PreviewPaneModel }) {
  const { theme, profile } = model;
  const character = profile.confirmedCharacter;
  const stats = character?.stats;
  const equip = character?.equipment;
  const equipGrid = equip?.presets?.[equip.activePreset] ?? equip?.presets?.[0];

  const [exportFlash, setExportFlash] = useState(false);
  function handleExport() {
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 2000);
  }

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const primaryId = classData?.requiredStats[0];
  const mainStatLabel = (primaryId && primaryId in MAIN_STAT_FIELDS) ? MAIN_STAT_FIELDS[primaryId as MainStatKey] : "Main Stat";
  const mainStatValue = resolveMainStatValue(character, primaryId);

  const keyStats = [
    { label: mainStatLabel, display: mainStatValue ?? "—" },
    { label: "Boss DMG", display: stats?.bossDamage ? `${stats.bossDamage}%` : "—" },
    { label: "IED", display: stats?.ignoreDefense ? `${stats.ignoreDefense}%` : "—" },
    { label: "Crit DMG", display: stats?.criticalDamage ? `${stats.criticalDamage}%` : "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>Overview</h3>
        <button type="button" onClick={handleExport} style={exportButtonStyle(theme)}>
          {!exportFlash && (
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
            </svg>
          )}
          {exportFlash ? "Coming soon" : "Export"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginBottom: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 2 }}>HEXA Stat</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: theme.muted, lineHeight: 1, fontFamily: "var(--font-heading)" }}>—</div>
          </div>
          <div>
            {keyStats.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 12, color: theme.muted }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.display !== "—" ? theme.text : theme.muted }}>{s.display}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 30 }}>
          <WseSlot label="Weapon" name={equipGrid?.weapon?.name} theme={theme} />
          <WseSlot label="Secondary" name={equipGrid?.secondary?.name} theme={theme} />
          <WseSlot label="Emblem" name={equipGrid?.emblem?.name} theme={theme} />
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: theme.muted, fontStyle: "italic" }}>
        Flip to a bookmark on the right for the full details behind each of these numbers.
      </p>
    </div>
  );
}

function GenderIcon({ gender }: { gender: "male" | "female" }) {
  if (gender === "male") {
    return (
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="15" r="6" />
        <path d="M13.5 10.5L20 4M14 4h6v6" />
      </svg>
    );
  }
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v6M9 18h6" />
    </svg>
  );
}

function MarriageIcon({ married }: { married: boolean }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="9" cy="14" r="5" opacity={married ? 1 : 0.4} />
      <circle cx="15" cy="14" r="5" opacity={married ? 1 : 0.4} />
    </svg>
  );
}

const RAW_VALUE_STAT_LABELS = new Set(["arcanePower", "sacredPower"]);
// Mirrors StatsSetupStep.tsx's NO_DECIMAL_STAT_IDS — these 3 combat stats are always whole
// numbers in-game, unlike Boss Damage/Crit Damage/Ignore DEF/etc. which commonly carry 2 decimal
// places. Without this, display consistency depends on whether the player happened to type
// trailing zeros during setup (e.g. "82" vs "82.00" for the exact same in-game value).
const NO_DECIMAL_STAT_LABELS = new Set(["summonDuration", "buffDuration", "criticalRate"]);

function pctStat(raw: string | undefined, id: string): string {
  if (!raw) return "—";
  if (RAW_VALUE_STAT_LABELS.has(id)) return raw;
  if (NO_DECIMAL_STAT_LABELS.has(id)) return `${raw}%`;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? `${numeric.toFixed(2)}%` : `${raw}%`;
}

// MapleStory's own final-stat formula (confirmed against Yuki's in-game tooltips):
// floor(Base Value × (1 + % Value/100)) + % Value Not Applied. The 3 inputs are exactly
// what the Character Info window's [Applied Value] breakdown shows per stat — except that
// window never itemizes familiar stat lines at all, see familiarStatBonuses in familiarsData.ts.
function tripleStatTotal(field: StoredTripleStatField | undefined, familiarBonus?: FamiliarStatBonus): string {
  if (!field?.base) return "—";
  const base = (Number(field.base) || 0) + (familiarBonus?.flat ?? 0);
  const percent = (Number(field.percent) || 0) + (familiarBonus?.percent ?? 0);
  const percentUnapplied = Number(field.percentUnapplied) || 0;
  const total = Math.floor(base * (1 + percent / 100)) + percentUnapplied;
  return total.toLocaleString("en-US");
}

function cooldownReductionValue(cr: { seconds: string; percent: string } | undefined): string {
  if (!cr?.seconds && !cr?.percent) return "—";
  return `${cr.seconds || "0"} sec / ${cr.percent || "0"}%`;
}

// classId is undefined for an unresolved jobName; resolveFinalDamagePercent itself returns
// undefined for legacy classes, which never got a verified baseline (see finalDamageData.ts).
function finalDamageDisplay(
  classId: string | undefined,
  isLiberated: boolean | null | undefined,
  tier: ComboOrdersTier,
  level: number | undefined,
  worldId: number | undefined,
  hasRuinForceShield: boolean | null | undefined,
): string {
  const rebootBonusPercent = level !== undefined && isRebootWorld(worldId) ? rebootFinalDamageBonusPercent(level) : 0;
  const percent = resolveFinalDamagePercent(classId, isLiberated ?? undefined, tier, rebootBonusPercent, hasRuinForceShield ?? false);
  return percent === undefined ? "—" : `${percent.toFixed(2)}%`;
}

// computeDamageRange returns undefined for legacy classes, Zero/Demon Avenger's unhandled
// sub-cases, or a character missing stats — same "—" treatment as every other unavailable cell.
function damageRangeDisplay(
  classId: string | undefined,
  level: number | undefined,
  weaponHand: "1h" | "2h" | null | undefined,
  isLiberated: boolean | null | undefined,
  stats: StoredCharacterStats | undefined,
  tier: ComboOrdersTier,
  familiars: StoredCharacterRecord["familiars"] | undefined,
  worldId: number | undefined,
  hasRuinForceShield: boolean | null | undefined,
): string {
  const result = computeDamageRange(classId, level, weaponHand ?? undefined, isLiberated, stats, tier, familiars, worldId, hasRuinForceShield);
  if (!result) return "—";
  return result.upper.toLocaleString("en-US");
}

// minmax(0, 1fr), not bare 1fr — a bare 1fr column refuses to shrink below its content's
// natural width, so a long label/value SummaryRow pair could force this grid (and everything
// clipped inside .profile-binder's overflow:hidden) wider than the available space.
const statGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", columnGap: 16 };

const statBlockLabelStyle: CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 };

// Nested content panel (DESIGN.md: 14px radius, theme.panel on theme.bg) so each group of
// stats reads as its own block instead of blurring into the per-row underlines below it.
function StatBlock({ label, theme, children, info }: { label: string; theme: Theme; children: ReactNode; info?: TooltipContent }) {
  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: 10 }}>
        <div style={{ ...statBlockLabelStyle, margin: 0, color: theme.muted }}>{label}</div>
        {info && <InfoTooltip content={info} theme={theme} />}
      </div>
      {children}
    </div>
  );
}

// KaTeX's displaystyle metrics (fraction stacking, floor brackets) run large even at a
// small container font-size, and the tooltip popup is only ~240px wide — inline mode
// (displayMode: false) uses KaTeX's more compact textstyle sizing, and the small
// fontSize here shrinks it further to actually fit.
const formulaHtmlStyle: CSSProperties = { overflowX: "auto", padding: "0.2rem 0", fontSize: "0.75rem" };

// Renders a LaTeX string to static HTML via KaTeX at module load — pure function of the
// tex string, no DOM/layout dependency, so this is safe to call outside a component.
function formulaHtml(tex: string): string {
  return katex.renderToString(tex, { throwOnError: false, displayMode: false });
}

function Formula({ tex }: { tex: string }) {
  // eslint-disable-next-line react/no-danger -- KaTeX's own static-HTML output, not user input
  return <div style={formulaHtmlStyle} dangerouslySetInnerHTML={{ __html: formulaHtml(tex) }} />;
}

// Split across 2 Formula blocks (each its own div, stacking naturally) rather than one
// long inline string — at tooltip width, letting this wrap on its own broke mid-formula
// right after the "+", which read as accidental rather than a deliberate line break.
const BASIC_STATS_FORMULA_TEX_LINE1 = String.raw`\lfloor \text{Base Value} \times \left(1 + \dfrac{\%\text{ Value}}{100}\right) \rfloor`;
const BASIC_STATS_FORMULA_TEX_LINE2 = String.raw`+\ \%\text{ Value Not Applied}`;
const COMBAT_STATS_FORMULA_TEX = String.raw`\lfloor \text{Base Value} \times \left(1 + \dfrac{\%\text{ Value}}{100}\right) \rfloor`;

const BASIC_STATS_INFO: TooltipContent = {
  title: "Basic Stats",
  description: (
    <>
      There may be a slight discrepancy in a stat&apos;s calculated value.
      <br />
      <br />
      Stat bonuses from your active familiar preset are automatically included.
      <br />
      <br />
      Formula used:
      <Formula tex={BASIC_STATS_FORMULA_TEX_LINE1} />
      <Formula tex={BASIC_STATS_FORMULA_TEX_LINE2} />
    </>
  ),
};
// Paladin's buff guide requires the single higher-tier "Combat Orders" (every other class
// requires "Decent Combat Orders"), so the label can't be one static string — see
// comboOrdersData.ts's resolveComboOrdersTier.
function combatStatsInfo(classId: string | undefined): TooltipContent {
  const comboOrdersLabel = classId === "paladin"
    ? "Combat Orders"
    : "Decent Combat Orders and/or Passive Skills +1 Inner Ability";
  return {
    title: "Combat Stats",
    description: (
      <>
        There may be a slight discrepancy in Attack Power, Magic ATT, and Damage Range&apos;s calculated value.
        <br />
        <br />
        Final Damage is calculated from your class&apos;s passive skills with {comboOrdersLabel} active,
        plus a bonus if your world is Reboot. Not available for legacy classes.
        <br />
        <br />
        Formula used (ATT):
        <Formula tex={COMBAT_STATS_FORMULA_TEX} />
        <br />
        Damage Range factors in your class&apos;s weapon multiplier and stat formula, then applies
        DMG% and Final Damage% on top.
      </>
    ),
  };
}

type StatsView = "stats" | "hyperStat" | "ability";

function statsBookmarkHeaderLabel(view: StatsView, defaultLabel: string): string {
  if (view === "hyperStat") return "Hyper Stats";
  if (view === "ability") return "Inner Ability";
  return defaultLabel;
}

function StatsActionBar({ view, theme, onSelect }: { view: StatsView; theme: Theme; onSelect: (v: StatsView) => void }) {
  const btnStyle: CSSProperties = { ...secondaryButtonStyle(theme, "8px 0"), width: "100%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1 }}>
        {view === "stats" && <button type="button" style={btnStyle} onClick={() => onSelect("hyperStat")}><span aria-hidden="true">‹</span> Hyper Stats</button>}
        {view === "ability" && <button type="button" style={btnStyle} onClick={() => onSelect("stats")}><span aria-hidden="true">‹</span> Stats</button>}
      </div>
      <div style={{ flex: 1 }}>
        {view === "stats" && <button type="button" style={btnStyle} onClick={() => onSelect("ability")}>Ability <span aria-hidden="true">›</span></button>}
        {view === "hyperStat" && <button type="button" style={btnStyle} onClick={() => onSelect("stats")}>Stats <span aria-hidden="true">›</span></button>}
      </div>
    </div>
  );
}

function presetTabButtonStyle(theme: Theme, on: boolean): CSSProperties {
  return {
    position: "relative",
    border: `1px solid ${on ? theme.accent : theme.border}`,
    borderRadius: 8,
    background: on ? theme.accent : theme.bg,
    color: on ? theme.accentOn : theme.text,
    fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
    width: 32, height: 32, cursor: "pointer",
  };
}

function PresetTabs({
  theme, active, activePreset, onSelect, onSetActive, count = 3,
}: {
  theme: Theme; active: number; activePreset: number; onSelect: (n: number) => void; onSetActive: ((presetIndex: number) => void) | null; count?: number;
}) {
  const isPreviewingActive = active === activePreset;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted }}>Preset</span>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: count }, (_, i) => i).map((i) => {
            const on = i === active;
            return (
              <button
                key={i}
                type="button"
                className="tap-target-44"
                onClick={() => onSelect(i)}
                title={i === activePreset ? `Preset ${i + 1} (active in-game)` : `Preset ${i + 1}`}
                style={presetTabButtonStyle(theme, on)}
              >
                {i + 1}
                {i === activePreset && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: 999,
                      background: statusText(theme, "success"), border: `1.5px solid ${theme.bg}`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isPreviewingActive ? statusText(theme, "success") : theme.muted }}>
          Preset {activePreset + 1} is active in-game
        </span>
        {/* Always rendered (never unmounted) so its space stays reserved — unmounting on
            preset switch shifted everything below it up/down. Only ever set visibility to
            "hidden" here, never "visible": this component's own outer wrapper (in
            StatsBookmark) is also visibility-toggled when a sibling sub-view is active, and
            visibility is inherited — an explicit "visible" here would override that ancestor
            and punch the button through even while its whole view is hidden. */}
        {onSetActive && (
          <button
            type="button"
            tabIndex={isPreviewingActive ? -1 : 0}
            aria-hidden={isPreviewingActive}
            onClick={() => onSetActive(active)}
            style={{ ...successButtonStyle(theme, "0.2rem 0.5rem"), visibility: isPreviewingActive ? "hidden" : undefined }}
          >
            Set preset {active + 1} as active
          </button>
        )}
      </div>
    </div>
  );
}

// A legacy (pre-revamp) class never gets Arcane/Sacred Power by leveling — it'd need to
// advance past the legacy job entirely — so its locked label can't promise a level, unlike
// an ordinary under-leveled character that will unlock it later. Mirrors resolveHexaNotice's
// same legacy-vs-under-leveled distinction for the HEXA panel below.
function lockedStatLabel(isLegacy: boolean | undefined, unlockLevel: number): string {
  return isLegacy ? "Not available for this class" : `Locked (Lv. ${unlockLevel}+)`;
}

// Arcane Power is a Hyper Stat category too (boosts Arcane Force gain), gated by the same
// eligibility as the Symbols section's Arcane Power stat — Setup filters this category out
// of the grid entirely below that level; the profile dims it + labels it instead, same as
// the Symbols row, so it doesn't read as "eligible but unallocated."
function hyperStatCellDisplay(cat: HyperStatCategoryDef, presetValue: number | undefined, arcaneEligible: boolean, arcaneLockedLabel: string): { value: string; locked: boolean } {
  if (cat.id === "arcanePower" && !arcaneEligible) return { value: arcaneLockedLabel, locked: true };
  return { value: `Lv. ${presetValue ?? 0}`, locked: false };
}

function HyperStatView({
  theme, hyperStat, onSetActivePreset, eligible, arcaneEligible, arcaneLockedLabel,
}: {
  theme: Theme; hyperStat: StoredHyperStat | undefined; onSetActivePreset: ((presetIndex: number) => void) | null; eligible: boolean; arcaneEligible: boolean; arcaneLockedLabel: string;
}) {
  const activePreset = hyperStat?.activePreset ?? 0;
  const [presetIdx, setPresetIdx] = useState(activePreset);
  // Mirrors resolveHexaNotice's pattern below (HEXA panel) — a whole-panel lock message
  // instead of preset switching that wouldn't make sense pre-unlock anyway.
  if (!eligible) {
    return <p style={{ fontSize: 12, color: theme.muted, fontStyle: "italic", margin: 0 }}>{`Hyper Stats unlock at Lv. ${HYPER_STAT_LEVEL}.`}</p>;
  }
  const preset = hyperStat?.presets?.[presetIdx];
  const half = Math.ceil(HYPER_STAT_CATEGORIES.length / 2);
  const cols = [HYPER_STAT_CATEGORIES.slice(0, half), HYPER_STAT_CATEGORIES.slice(half)];
  return (
    <div>
      <PresetTabs theme={theme} active={presetIdx} activePreset={activePreset} onSelect={setPresetIdx} onSetActive={hyperStat ? onSetActivePreset : null} />
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        {cols.map((col, i) => (
          // react-doctor-disable-next-line no-array-index-as-key
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            {col.map((cat) => {
              const cell = hyperStatCellDisplay(cat, preset?.[cat.id], arcaneEligible, arcaneLockedLabel);
              return <SummaryRow key={cat.id} label={cat.label} value={cell.value} theme={theme} locked={cell.locked} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mirrors InnerAbilitySetupStep's iaGradeButtonStyle/iaLineBarStyle so the profile's
// read-only view matches the setup step's selector visual, minus the interactive affordances.
const iaGradeChipStyle = (theme: Theme, c: { border: string } | null): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.5rem 0.7rem", borderRadius: 8,
  border: `1px solid ${c ? c.border : theme.border}`,
  background: c ? c.border : theme.bg,
  color: c ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.9rem", textAlign: "left",
});

const iaLineChipStyle = (theme: Theme, c: { border: string } | null, grade: StoredIATier | ""): CSSProperties => ({
  display: "block", width: "100%", padding: "0.5rem 0.7rem", borderRadius: 8,
  border: c ? `1px solid ${c.border}` : `1px dashed ${theme.border}`,
  background: c ? c.border : theme.bg,
  color: c ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", textAlign: "left",
  opacity: grade ? 1 : 0.55,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});

function AbilityGradeChip({ grade, theme }: { grade: StoredIATier | ""; theme: Theme }) {
  const c = grade ? IA_TIER_COLORS[grade] : null;
  return (
    <div style={iaGradeChipStyle(theme, c)}>
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
      </svg>
      {grade ? `${IA_TIER_LABELS[grade]} Ability` : "No Ability Grade"}
    </div>
  );
}

function IALineChip({ line, grade, theme }: { line: { tier: StoredIATier; value: string }; grade: StoredIATier | ""; theme: Theme }) {
  const c = line.tier ? IA_TIER_COLORS[line.tier] : null;
  return <div style={iaLineChipStyle(theme, c, grade)}>{line.value || "Unset"}</div>;
}

function AbilityView({
  theme, innerAbility, onSetActivePreset,
}: {
  theme: Theme; innerAbility: StoredInnerAbility | undefined; onSetActivePreset: ((presetIndex: number) => void) | null;
}) {
  const activePreset = innerAbility?.activePreset ?? 0;
  const [presetIdx, setPresetIdx] = useState(activePreset);
  const preset = innerAbility?.presets?.[presetIdx];
  const grade = preset?.lines?.[0]?.tier ?? "";
  return (
    <div>
      <PresetTabs theme={theme} active={presetIdx} activePreset={activePreset} onSelect={setPresetIdx} onSetActive={innerAbility ? onSetActivePreset : null} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxWidth: 360 }}>
        <AbilityGradeChip grade={grade} theme={theme} />
        {[0, 1, 2].map((i) => (
          <IALineChip key={i} line={preset?.lines?.[i] ?? { tier: "", value: "" }} grade={grade} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function StatsBookmark({
  theme, character, view, onViewChange, onSetActivePreset,
}: {
  theme: Theme; character: StoredCharacterRecord | null; view: StatsView; onViewChange: (v: StatsView) => void;
  onSetActivePreset: (field: "hyperStat" | "innerAbility", presetIndex: number) => void;
}) {
  const s = character?.stats;
  const notCollected = "—";
  const classId = character ? resolveClassId(character.jobName) : undefined;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const resourceLabel = classData?.resourceLabel ?? "MP";
  const familiarBonus = familiarStatBonuses(character?.familiars);
  const comboOrdersTier = resolveComboOrdersTier(classId, s?.innerAbility, character?.scouter?.innerAbilityLine);

  // Order mirrors the in-game Character Info window, row by row (left column then right column).
  const primaryCells: { label: string; value: string }[] = [
    { label: "HP", value: tripleStatTotal(s?.hp, familiarBonus.hp) },
    { label: resourceLabel, value: s?.mp || notCollected },
    { label: "STR", value: tripleStatTotal(s?.str, familiarBonus.str) },
    { label: "DEX", value: tripleStatTotal(s?.dex, familiarBonus.dex) },
    { label: "INT", value: tripleStatTotal(s?.int, familiarBonus.int) },
    { label: "LUK", value: tripleStatTotal(s?.luk, familiarBonus.luk) },
  ];

  const combatCells: { label: string; value: string }[] = [
    { label: "Damage Range", value: damageRangeDisplay(classId, character?.level, character?.weaponHand, character?.isLiberated, s, comboOrdersTier, character?.familiars, character?.worldId, character?.hasRuinForceShield) },
    { label: STAT_LABELS.damage ?? "Damage", value: pctStat(s?.damage, "damage") },
    { label: "Final Damage", value: finalDamageDisplay(classId, character?.isLiberated, comboOrdersTier, character?.level, character?.worldId, character?.hasRuinForceShield) },
    { label: STAT_LABELS.bossDamage ?? "Boss Damage", value: pctStat(s?.bossDamage, "bossDamage") },
    { label: STAT_LABELS.ignoreDefense ?? "Ignore DEF", value: pctStat(s?.ignoreDefense, "ignoreDefense") },
    { label: STAT_LABELS.normalEnemyDamage ?? "Normal Enemy Damage", value: pctStat(s?.normalEnemyDamage, "normalEnemyDamage") },
    { label: "Attack Power", value: tripleStatTotal(s?.attackPower) },
    { label: STAT_LABELS.criticalRate ?? "Critical Rate", value: pctStat(s?.criticalRate, "criticalRate") },
    { label: "Magic ATT", value: tripleStatTotal(s?.magicAtt) },
    { label: STAT_LABELS.criticalDamage ?? "Critical Damage", value: pctStat(s?.criticalDamage, "criticalDamage") },
    { label: STAT_LABELS.cooldownReduction ?? "Cooldown Reduction", value: cooldownReductionValue(s?.cooldownReduction) },
    { label: STAT_LABELS.buffDuration ?? "Buff Duration", value: pctStat(s?.buffDuration, "buffDuration") },
    { label: STAT_LABELS.cooldownSkip ?? "Cooldown Not Applied", value: pctStat(s?.cooldownSkip, "cooldownSkip") },
    { label: STAT_LABELS.ignoreElementalResistance ?? "Ignore Elem. Resist.", value: pctStat(s?.ignoreElementalResistance, "ignoreElementalResistance") },
    { label: STAT_LABELS.additionalStatusDamage ?? "Addl. Status Damage", value: pctStat(s?.additionalStatusDamage, "additionalStatusDamage") },
    { label: STAT_LABELS.summonDuration ?? "Summons Duration Inc.", value: pctStat(s?.summonDuration, "summonDuration") },
  ];

  const showArcanePower = isArcaneEligible(character?.level, classData?.isLegacy);
  const showSacredPower = isSacredEligible(character?.level, classData?.isLegacy);
  const arcaneLockedLabel = lockedStatLabel(classData?.isLegacy, ARCANE_POWER_LEVEL);
  const powerCells: { label: string; value: string; locked?: boolean }[] = [
    showArcanePower
      ? { label: STAT_LABELS.arcanePower ?? "Arcane Power", value: pctStat(s?.arcanePower, "arcanePower") }
      : { label: STAT_LABELS.arcanePower ?? "Arcane Power", value: arcaneLockedLabel, locked: true },
    showSacredPower
      ? { label: STAT_LABELS.sacredPower ?? "Sacred Power", value: pctStat(s?.sacredPower, "sacredPower") }
      : { label: STAT_LABELS.sacredPower ?? "Sacred Power", value: lockedStatLabel(classData?.isLegacy, SACRED_POWER_LEVEL), locked: true },
  ];

  // The 3 views are stacked in the same grid cell (all present, only one visible) so the
  // row auto-sizes to the tallest of the three — visibility:hidden keeps its box for that
  // sizing (unlike display:none), which is what stops the action bar below from jumping
  // up when a shorter view (Hyper Stat/Ability) becomes active. The outer flex:1 fills
  // whatever height the panel's own min-height reserves beyond this bookmark's actual
  // content, and marginTop: "auto" on the action bar's wrapper pins it to the panel's real
  // bottom edge instead of sitting right under a shorter view's content.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "grid" }}>
        <div style={{ gridArea: "1 / 1", visibility: view === "stats" ? "visible" : "hidden", display: "flex", flexDirection: "column", gap: 12 }}>
          <StatBlock label="Basic Stats" theme={theme} info={BASIC_STATS_INFO}>
            <div style={statGridStyle}>
              {primaryCells.map((c) => (
                <SummaryRow key={c.label} label={c.label} value={c.value} theme={theme} />
              ))}
            </div>
          </StatBlock>
          <StatBlock label="Combat Stats" theme={theme} info={combatStatsInfo(classId)}>
            <div style={statGridStyle}>
              {combatCells.map((c) => (
                <SummaryRow key={c.label} label={c.label} value={c.value} theme={theme} />
              ))}
            </div>
          </StatBlock>
          <StatBlock label="Symbols" theme={theme}>
            <div style={statGridStyle}>
              {powerCells.map((c) => (
                <SummaryRow key={c.label} label={c.label} value={c.value} theme={theme} locked={c.locked} />
              ))}
            </div>
          </StatBlock>
        </div>
        <div style={{ gridArea: "1 / 1", visibility: view === "hyperStat" ? "visible" : "hidden" }}>
          <HyperStatView
            key={character?.characterName}
            theme={theme}
            hyperStat={s?.hyperStat}
            eligible={isHyperStatEligible(character?.level)}
            arcaneEligible={showArcanePower}
            arcaneLockedLabel={arcaneLockedLabel}
            onSetActivePreset={(presetIndex) => onSetActivePreset("hyperStat", presetIndex)}
          />
        </div>
        <div style={{ gridArea: "1 / 1", visibility: view === "ability" ? "visible" : "hidden" }}>
          <AbilityView
            key={character?.characterName}
            theme={theme}
            innerAbility={s?.innerAbility}
            onSetActivePreset={(presetIndex) => onSetActivePreset("innerAbility", presetIndex)}
          />
        </div>
      </div>
      <div style={{ paddingTop: 14, marginTop: "auto" }}>
        <StatsActionBar view={view} theme={theme} onSelect={onViewChange} />
      </div>
    </div>
  );
}

type EquipmentBookmarkView = "gear" | "titles" | "pets";
type SymbolViewTab = "arcane" | "sacred";

function equipmentBookmarkHeaderLabel(view: EquipmentBookmarkView, defaultLabel: string): string {
  if (view === "titles") return "Titles, Totems & Symbols";
  if (view === "pets") return "Pets";
  return defaultLabel;
}

const equipmentActionArrowStyle: CSSProperties = { flexShrink: 0 };

function EquipmentActionBar({ view, theme, onSelect }: { view: EquipmentBookmarkView; theme: Theme; onSelect: (v: EquipmentBookmarkView) => void }) {
  // height: "100%" + the parent row's default stretch alignment keeps both buttons equal
  // height even when one label (e.g. "Titles, Totems & Symbols") wraps to 2 lines and its
  // sibling doesn't. The label is its own <span> (not a bare text node beside the arrow's
  // span) so it wraps as a normal flex item instead of the arrow drifting to the edge.
  const btnStyle: CSSProperties = { ...secondaryButtonStyle(theme, "8px 0"), width: "100%", height: "100%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1 }}>
        {view === "gear" && (
          <button type="button" style={btnStyle} onClick={() => onSelect("titles")}>
            <span aria-hidden="true" style={equipmentActionArrowStyle}>‹</span>
            <span className="equipment-action-label-full">Titles, Totems & Symbols</span>
            <span className="equipment-action-label-short">Titles & Symbols</span>
          </button>
        )}
        {view === "pets" && (
          <button type="button" style={btnStyle} onClick={() => onSelect("gear")}>
            <span aria-hidden="true" style={equipmentActionArrowStyle}>‹</span>
            <span>Gear</span>
          </button>
        )}
      </div>
      <div style={{ flex: 1 }}>
        {view === "gear" && (
          <button type="button" style={btnStyle} onClick={() => onSelect("pets")}>
            <span>Pets</span>
            <span aria-hidden="true" style={equipmentActionArrowStyle}>›</span>
          </button>
        )}
        {view === "titles" && (
          <button type="button" style={btnStyle} onClick={() => onSelect("gear")}>
            <span>Gear</span>
            <span aria-hidden="true" style={equipmentActionArrowStyle}>›</span>
          </button>
        )}
      </div>
    </div>
  );
}

function BookmarkSectionLabel({ label, theme }: { label: string; theme: Theme }) {
  return (
    <p style={{ margin: "0 0 6px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted }}>
      {label}
    </p>
  );
}

function ReadOnlySlotColumn({ slots, grid, theme }: { slots: SlotKey[]; grid: SlotMap; theme: Theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
      {slots.map((slot) => (
        <ReadOnlySlotTile key={slot} slotKey={slot} item={grid[slot]} theme={theme} />
      ))}
    </div>
  );
}

const SYMBOL_VIEW_TABS: { key: SymbolViewTab; label: string }[] = [
  { key: "arcane", label: "Arcane" },
  { key: "sacred", label: "Sacred" },
];

function symbolTabButtonStyle(theme: Theme, active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? theme.accent : theme.border}`,
    borderRadius: 8,
    background: active ? theme.accent : theme.bg,
    color: active ? theme.accentOn : theme.text,
    fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
    padding: "0.4rem 0.8rem", cursor: "pointer",
  };
}

function symbolAreaLevel(levels: Record<string, SymbolState> | null, area: SymbolArea): number {
  return levels?.[area.name]?.level ?? 0;
}

// Every area always renders (never hidden) — an area the character hasn't reached yet shows
// as a locked tile (dimmed icon + its unlock level) via ReadOnlySymbolTile's `locked` prop,
// rather than vanishing outright. Covers per-zone gaps within an eligible tier (Chu Chu
// Island at 210 while Arcane-eligible from 200) the same way it covers a whole tier being
// out of reach (Grand Sacred at 290+ while only Sacred-eligible) — hiding any of these read
// as "bugged or missing" rather than "not unlocked yet" per Yuki's ask. Legacy is handled a
// level up, in SymbolLevelsDisplay, so this only ever runs for a non-legacy character.
function SymbolAreaGroup({ label, areas, levels, loadImages, characterLevel, theme }: {
  label: string; areas: SymbolArea[]; levels: Record<string, SymbolState> | null; loadImages: boolean; characterLevel: number | undefined; theme: Theme;
}) {
  return (
    <div>
      <BookmarkSectionLabel label={label} theme={theme} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${SYMBOL_TILE_SIZE}px)`, gap: 4 }}>
        {areas.map((area) => {
          const locked = characterLevel !== undefined && characterLevel < area.requiredLevel;
          return <ReadOnlySymbolTile key={area.name} area={area} level={symbolAreaLevel(levels, area)} locked={locked} loadImage={loadImages} theme={theme} />;
        })}
      </div>
    </div>
  );
}

function SymbolLevelsDisplay({
  theme, levels, loadImages, characterLevel, isLegacy, activeTab, onTabChange,
}: {
  theme: Theme;
  levels: Record<string, SymbolState> | null;
  loadImages: boolean;
  characterLevel: number | undefined;
  isLegacy: boolean | undefined;
  activeTab: SymbolViewTab;
  onTabChange: (tab: SymbolViewTab) => void;
}) {
  // A legacy class can never advance to unlock any symbol type at all, so it gets one
  // blanket message with no tab switcher and no per-tier labels — nothing here to switch
  // between, showing the buttons anyway would just invite clicking through to the same
  // message twice.
  if (isLegacy) {
    return <p style={{ margin: 0, fontSize: 12, color: theme.muted, fontStyle: "italic" }}>Not available for this class.</p>;
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: "0.6rem" }}>
        {SYMBOL_VIEW_TABS.map((tab) => (
          <button key={tab.key} type="button" onClick={() => onTabChange(tab.key)} style={symbolTabButtonStyle(theme, tab.key === activeTab)}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "arcane" ? (
        <SymbolAreaGroup label="Arcane" areas={ARCANE_AREAS} levels={levels} loadImages={loadImages} characterLevel={characterLevel} theme={theme} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <SymbolAreaGroup label="Sacred" areas={SACRED_AREAS} levels={levels} loadImages={loadImages} characterLevel={characterLevel} theme={theme} />
          <SymbolAreaGroup label="Grand Sacred" areas={GRAND_SACRED_AREAS} levels={levels} loadImages={loadImages} characterLevel={characterLevel} theme={theme} />
        </div>
      )}
    </div>
  );
}

function TitlesView({
  theme, equip, symbolLevels, loadSymbolImages, characterLevel, isLegacy, symbolTab, onSymbolTabChange,
}: {
  theme: Theme;
  equip: StoredCharacterEquipment | undefined;
  symbolLevels: Record<string, SymbolState> | null;
  loadSymbolImages: boolean;
  characterLevel: number | undefined;
  isLegacy: boolean | undefined;
  symbolTab: SymbolViewTab;
  onSymbolTabChange: (tab: SymbolViewTab) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <BookmarkSectionLabel label="Title" theme={theme} />
        <ReadOnlySlotTile slotKey="title" item={toDraftItem(equip?.title ?? null)} theme={theme} />
      </div>
      <div>
        <BookmarkSectionLabel label="Totems" theme={theme} />
        <div style={{ display: "flex", gap: 4 }}>
          {(["totem1", "totem2", "totem3"] as const).map((slotKey, i) => (
            <ReadOnlySlotTile key={slotKey} slotKey={slotKey} item={toDraftItem(equip?.totems?.[i] ?? null)} theme={theme} />
          ))}
        </div>
      </div>
      <div>
        <BookmarkSectionLabel label="Symbols" theme={theme} />
        <SymbolLevelsDisplay
          theme={theme}
          levels={symbolLevels}
          loadImages={loadSymbolImages}
          characterLevel={characterLevel}
          isLegacy={isLegacy}
          activeTab={symbolTab}
          onTabChange={onSymbolTabChange}
        />
      </div>
    </div>
  );
}

const GEAR_PET_TRIPLES: readonly [SlotKey, SlotKey, string][] = [
  ["pet1", "petEquip1", "Pet 1"],
  ["pet2", "petEquip2", "Pet 2"],
  ["pet3", "petEquip3", "Pet 3"],
];

function PetsView({ theme, equip }: { theme: Theme; equip: StoredCharacterEquipment | undefined }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {GEAR_PET_TRIPLES.map(([petKey, equipKey, label], i) => (
        <div key={petKey}>
          <BookmarkSectionLabel label={label} theme={theme} />
          <div style={{ display: "flex", gap: 4 }}>
            <ReadOnlySlotTile slotKey={petKey} item={toDraftItem(equip?.pets?.[i] ?? null)} theme={theme} />
            <ReadOnlySlotTile slotKey={equipKey} item={toDraftItem(equip?.petEquips?.[i] ?? null)} theme={theme} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipmentBookmark({
  theme, character, view, onViewChange, onSetActivePreset,
}: {
  theme: Theme; character: StoredCharacterRecord | null; view: EquipmentBookmarkView; onViewChange: (v: EquipmentBookmarkView) => void;
  onSetActivePreset: (presetIndex: number) => void;
}) {
  const equip = character?.equipment;
  const activePresetStored = equip?.activePreset ?? 0;
  const [presetIdx, setPresetIdx] = useState(activePresetStored);
  const [symbolTab, setSymbolTab] = useState<SymbolViewTab>("arcane");
  const [mobileGridPage, setMobileGridPage] = useState(0);
  // Titles/Pets stay mounted (visibility-toggled, not conditionally rendered) so the panel
  // auto-sizes to the tallest of the 3 sub-views instead of jumping height on switch — but
  // that means every icon across every sub-view loads immediately on arrival, even ones never
  // clicked into, hammering the image host for no reason. Deferring real item/symbol data
  // until a sub-view's first visit (see equip={} below) keeps the exact same box sizes (an
  // empty slot renders at the same dimensions as a filled one) so the sizing trick is
  // unaffected, while the actual <Image> elements simply don't exist until then.
  const [visitedViews, setVisitedViews] = useState<Set<EquipmentBookmarkView>>(() => new Set([view]));
  if (!visitedViews.has(view)) setVisitedViews((prev) => new Set(prev).add(view));

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;

  const preset = equip?.presets?.[presetIdx];
  const activeGrid: SlotMap = preset ? storedPresetToDraft(preset) : {};

  const charName = character?.characterName;
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const symbolLevels = useMemo(() => {
    if (!mounted) return null;
    const fromState = (character?.tools?.symbols as { symbols?: Record<string, SymbolState> } | undefined)?.symbols;
    if (fromState) return fromState;
    return readSymbolLevels(charName);
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `charName` primitive, not the whole `character` object, to avoid re-running when unrelated fields change, mirrors readHexaLevels' own pattern above
  }, [mounted, charName, character?.tools]);

  // The 3 views are stacked in the same grid cell (all present, only one visible) so the
  // row auto-sizes to the tallest of the three, matching StatsBookmark's own pattern —
  // including the outer flex:1 + action bar's marginTop: "auto" that pins it to the panel's
  // real bottom edge, see StatsBookmark's own comment above for why.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "grid" }}>
        <div style={{ gridArea: "1 / 1", visibility: view === "gear" ? "visible" : "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
          <PresetTabs theme={theme} active={presetIdx} activePreset={activePresetStored} onSelect={setPresetIdx} onSetActive={equip ? onSetActivePreset : null} />
          {/* Same container-query carousel as EquipmentSetupStep's EquipmentGridSubstep — kicks
              in once the panel itself (not the viewport) narrows past ~520px, reusing the same
              .eq-* global classes so a narrow Gear bookmark gets the identical prev/next,
              one-section-at-a-time behavior instead of trying to cram all 3 columns in. */}
          <div className="eq-substep-root">
            <style>{`
              .eq-substep-root {
                container-type: inline-size;
              }
              @container (max-width: 520px) {
                .eq-page-0 .eq-section-1, .eq-page-0 .eq-section-2,
                .eq-page-1 .eq-section-0, .eq-page-1 .eq-section-2,
                .eq-page-2 .eq-section-0, .eq-page-2 .eq-section-1 { display: none; }
                .eq-page-label.eq-page-label { display: block; }
                .eq-page-nav-btn.eq-page-nav-btn { display: flex; align-items: center; justify-content: center; }
              }
            `}</style>
            <p className="eq-page-label" style={{ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
              {EQUIPMENT_PAGE_LABELS[mobileGridPage]}
            </p>
            <div className={`eq-page-${mobileGridPage}`}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                <button type="button" className="eq-page-nav-btn" aria-label="Previous section" onClick={() => setMobileGridPage((p) => (p + 2) % 3)} style={navBtnStyle(theme)}>‹</button>
                <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
                  <div className="eq-section eq-section-0" style={{ gap: 4, flexShrink: 0 }}>
                    <ReadOnlySlotColumn slots={COL1_SLOTS} grid={activeGrid} theme={theme} />
                    <ReadOnlySlotColumn slots={COL2_SLOTS} grid={activeGrid} theme={theme} />
                  </div>
                  <div className="eq-section eq-section-1" style={{ flexDirection: "column", justifyContent: "flex-end", gap: 4, flexShrink: 0, width: CENTER_WIDTH }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {CENTER_BOTTOM_SLOTS.map((slot) => (
                        <ReadOnlySlotTile key={slot} slotKey={slot} item={activeGrid[slot]} theme={theme} />
                      ))}
                    </div>
                  </div>
                  <div className="eq-section eq-section-2" style={{ gap: 4, flexShrink: 0 }}>
                    <ReadOnlySlotColumn slots={COL6_SLOTS} grid={activeGrid} theme={theme} />
                    <ReadOnlySlotColumn slots={COL7_SLOTS} grid={activeGrid} theme={theme} />
                  </div>
                </div>
                <button type="button" className="eq-page-nav-btn" aria-label="Next section" onClick={() => setMobileGridPage((p) => (p + 1) % 3)} style={navBtnStyle(theme)}>›</button>
              </div>
            </div>
          </div>
        </div>
        <div style={{ gridArea: "1 / 1", visibility: view === "titles" ? "visible" : "hidden" }}>
          <TitlesView
            theme={theme}
            equip={visitedViews.has("titles") ? equip : undefined}
            symbolLevels={visitedViews.has("titles") ? symbolLevels : null}
            loadSymbolImages={visitedViews.has("titles")}
            characterLevel={character?.level}
            isLegacy={classData?.isLegacy}
            symbolTab={symbolTab}
            onSymbolTabChange={setSymbolTab}
          />
        </div>
        <div style={{ gridArea: "1 / 1", visibility: view === "pets" ? "visible" : "hidden" }}>
          <PetsView theme={theme} equip={visitedViews.has("pets") ? equip : undefined} />
        </div>
      </div>
      <div style={{ paddingTop: 14, marginTop: "auto" }}>
        <EquipmentActionBar view={view} theme={theme} onSelect={onViewChange} />
      </div>
    </div>
  );
}

const EMPTY_FAMILIAR_SLOT: StoredFamiliarSlot = { familiarId: null, mobId: "", name: "", tier: "", line1: "", line2: "" };
const EMPTY_FAMILIAR_SLOTS: StoredFamiliarSlot[] = Array(3).fill(EMPTY_FAMILIAR_SLOT);
const EMPTY_FAMILIAR_BADGES: string[] = Array(8).fill("");

// Mirrors FamiliarsSetupStep's own 3-card + staggered-4+4-badge layout, read-only. No
// EmptyBookmarkState (matches V Matrix/Equipment/HEXA's convention) — the read view shows
// empty dashed cards/pentagons when nothing's set up yet, so the edit pencil is always
// available instead of gated behind a separate "Set up" button.
function FamiliarsBookmark({
  theme, character, onSetActivePreset,
}: {
  theme: Theme; character: StoredCharacterRecord | null; onSetActivePreset: (presetIndex: number) => void;
}) {
  const data = character?.familiars;
  const activePresetStored = data?.activePreset ?? 0;
  const [presetIdx, setPresetIdx] = useState(activePresetStored);
  const preset = data?.presets?.[presetIdx];
  const familiars = preset?.familiars ?? EMPTY_FAMILIAR_SLOTS;
  const badges = preset?.badges ?? EMPTY_FAMILIAR_BADGES;
  const badgeRowOffset = (FAMILIAR_BADGE_SIZE + FAMILIAR_BADGE_BORDER * 2 + 8) / 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Gated on `character`, not `data` -- Familiars is an optional standalone flow never
          bundled into required setup, so a character can exist with no saved familiars data
          at all. onSetActivePreset (see useCharacterSetupController) builds an empty shell
          on demand, so this works even before the step has ever been visited. */}
      <PresetTabs theme={theme} active={presetIdx} activePreset={activePresetStored} onSelect={setPresetIdx} onSetActive={character ? onSetActivePreset : null} count={FAMILIAR_PRESET_COUNT} />
      <div style={{ display: "flex", gap: 8 }}>
        {familiars.map((slot, i) => (
          // react-doctor-disable-next-line no-array-index-as-key
          <ReadOnlyFamiliarSlotCard key={i} slot={slot} theme={theme} />
        ))}
      </div>
      <div>
        <p style={{ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Equipped Badges
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {badges.slice(0, 4).map((badge, i) => (
              // react-doctor-disable-next-line no-array-index-as-key
              <ReadOnlyBadgeSlot key={i} badge={badge} theme={theme} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: badgeRowOffset }}>
            {badges.slice(4).map((badge, i) => (
              // react-doctor-disable-next-line no-array-index-as-key
              <ReadOnlyBadgeSlot key={i} badge={badge} theme={theme} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Reuses StatBlock (DESIGN.md: 14px radius, theme.panel on theme.bg) so each node group reads
// as its own boxed section, matching the in-game V Matrix panel's per-category framing.
function VMatrixNodeSection({ label, nodes, levels, theme }: {
  label: string; nodes: VMatrixNode[]; levels: Record<string, number>; theme: Theme;
}) {
  if (nodes.length === 0) return null;
  return (
    <StatBlock label={label} theme={theme}>
      <div className="vmatrix-grid" style={{ display: "grid", gap: "0.4rem" }}>
        {nodes.map(([id, name, max]) => (
          <ReadOnlyLeveledIconTile key={name} icon={<VMatrixNodeIcon id={id} name={name} size={32} />} name={name} level={levels[name] ?? 0} max={max} theme={theme} />
        ))}
      </div>
    </StatBlock>
  );
}

function LockIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function gatedFeatureNoticeStyle(theme: Theme): CSSProperties {
  return {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "2.75rem 1.5rem", borderRadius: 14, background: theme.bg,
    border: `1px dashed ${theme.border}`, textAlign: "center",
  };
}

// Mirrors the Bio bookmark's own empty-state language (dashed border + centered icon/label/
// caption) rather than a bare line of text under the header, so an entirely-gated bookmark
// still reads as a deliberate, full-size state instead of an empty panel with a stray caption.
function GatedFeatureNotice({ theme, title, description }: { theme: Theme; title: string; description: string }) {
  return (
    <div style={gatedFeatureNoticeStyle(theme)}>
      <div style={{ color: theme.muted }}><LockIcon /></div>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>{title}</div>
      <div style={{ fontSize: 13, color: theme.muted, maxWidth: 280, whiteSpace: "pre-line" }}>{description}</div>
    </div>
  );
}

// V Matrix unlocks at level 200 and is unavailable to legacy (pre-5th-job) classes — mirrors
// flows.ts's isStepSkippedForLevel, the setup step's own gate for this same step. See the
// characters CLAUDE.md "Level/legacy gating" table: the bookmark has to re-check this itself
// since it renders independently of the setup step registry. Also drives whether
// BookmarkPageBody shows the edit pencil — there's nothing to edit on a gated character.
function isVMatrixAvailable(character: StoredCharacterRecord | null): boolean {
  if (!character) return false;
  return character.level >= 200 && !isLegacyClass(character.jobName);
}

function resolveVMatrixNotice(hasVMatrix: boolean, legacy: boolean): string | null {
  if (!hasVMatrix) {
    return legacy ? "V Matrix is not available.\nThis job cannot advance to 5th job." : "V Matrix unlocks at level 200.";
  }
  return null;
}

// Reuses VMatrixSetupStep's own catalog fetch (same classId → same node grid), read-only, so
// the bookmark always shows the same node layout the setup step does: all-zero dimmed tiles
// when nothing's set up yet, leveled tiles once it is, instead of the old bare summary line.
function VMatrixBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const legacy = character ? isLegacyClass(character.jobName) : false;
  const hasVMatrix = isVMatrixAvailable(character);
  const notice = resolveVMatrixNotice(hasVMatrix, legacy);
  const classId = character ? getClassDataByNexonJobName(character.jobName)?.id : undefined;
  const { catalog, loadFailed } = useVMatrixCatalog(hasVMatrix ? classId : undefined);
  const levels = character?.vMatrix?.levels ?? {};

  if (notice !== null) {
    return <GatedFeatureNotice theme={theme} title="Not Available" description={notice} />;
  }
  if (!classId || loadFailed) {
    return <GatedFeatureNotice theme={theme} title="Not Available" description="Not available for this class." />;
  }
  if (!catalog) return null;

  return (
    <div className="vmatrix-root" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <style>{`
        .vmatrix-root { container-type: inline-size; }
        .vmatrix-grid { grid-template-columns: repeat(6, 68px); }
        /* 6 tiles × 68px + 5 × 0.4rem gaps = 440px, plus StatBlock's own 14px padding + 1px
           border on each side (30px) the grid sits inside here — the fixed 6-column grid needs
           the container to be at least 470px before it fits without overflowing the card. */
        @container (max-width: 480px) {
          .vmatrix-grid { grid-template-columns: repeat(auto-fill, 68px); }
        }
      `}</style>
      <VMatrixNodeSection label="Job Nodes" nodes={catalog.job} levels={levels} theme={theme} />
      <VMatrixNodeSection label="Boost Nodes" nodes={catalog.boost} levels={levels} theme={theme} />
      <VMatrixNodeSection label="Common Nodes" nodes={catalog.common} levels={levels} theme={theme} />
    </div>
  );
}

type HexaBookmarkView = "skills" | "stat";

// A character with no saved HEXA Skills tool data at all (level-eligible but never ran the
// step) used to render nothing below the header — this fills in the same all-zero, dimmed
// shape VMatrixBookmark shows for an untouched V Matrix, instead of a blank panel.
const EMPTY_HEXA_LEVELS: HexaSkillLevels = { origin: 0, ascent: 0, mastery: [], enhancement: [], common: [] };

function hexaMatrixBookmarkHeaderLabel(view: HexaBookmarkView, defaultLabel: string): string {
  return view === "stat" ? "HEXA Stat" : defaultLabel;
}

function HexaActionBar({ view, theme, onSelect }: { view: HexaBookmarkView; theme: Theme; onSelect: (v: HexaBookmarkView) => void }) {
  const btnStyle: CSSProperties = { ...secondaryButtonStyle(theme, "8px 0"), width: "100%", height: "100%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ flex: 1 }}>
        {view === "stat" && (
          <button type="button" style={btnStyle} onClick={() => onSelect("skills")}>
            <span aria-hidden="true" style={equipmentActionArrowStyle}>‹</span>
            <span>HEXA Skills</span>
          </button>
        )}
      </div>
      <div style={{ flex: 1 }}>
        {view === "skills" && (
          <button type="button" style={btnStyle} onClick={() => onSelect("stat")}>
            <span>HEXA Stat</span>
            <span aria-hidden="true" style={equipmentActionArrowStyle}>›</span>
          </button>
        )}
      </div>
    </div>
  );
}

const HEXA_STAT_NODE_LABELS = ["HEXA Stat I", "HEXA Stat II", "HEXA Stat III"];
// Node I is always accessible (HEXA Matrix implies 6th job); II/III have their own level
// gates on top of that — mirrors HexaMatrixSetupStep's own isNodeUnlocked.
const HEXA_STAT_UNLOCK_LEVELS = [0, 265, 270];
// Mirrors HexaMatrixSetupStep's own MAX_STAT_ENTRY_LEVEL — each HEXA Stat line caps at 10.
const HEXA_STAT_ENTRY_MAX_LEVEL = 10;
// Mirrors HexaMatrixSetupStep's own local HEXA_STAT_DEFS iconIds (from the "hexaStat" section
// of the hexa-skill manifest) — not exported there, duplicated here like the unlock levels above.
const HEXA_STAT_NODE_ICON_IDS = ["50000000", "50000001", "50000002"];

function emptyHexaStatEntry(): HexaStatEntry {
  return { type: "", level: 0 };
}

function emptyHexaStatSlot(): HexaStatSlot {
  return { main: emptyHexaStatEntry(), alt: [emptyHexaStatEntry(), emptyHexaStatEntry()] };
}

function emptyHexaStatNode(): HexaStatNode {
  return { presets: [emptyHexaStatSlot(), emptyHexaStatSlot()], activePreset: 0 };
}

// Mirrors HexaMatrixSetupStep's own isNodeEmpty — true when neither preset of a node has any
// stat chosen, used to dim a node's tab icon the same way the setup step does.
function isHexaStatNodeEmpty(node: HexaStatNode): boolean {
  const slotEmpty = (s: HexaStatSlot) => !s.main.type && !s.alt[0].type && !s.alt[1].type;
  return slotEmpty(node.presets[0]) && slotEmpty(node.presets[1]);
}

function hexaStatLockedNodesCaption(unlocked: boolean[]): string {
  const parts = HEXA_STAT_NODE_LABELS
    .map((label, i) => (unlocked[i] ? null : `${label} unlocks at level ${HEXA_STAT_UNLOCK_LEVELS[i]}`))
    .filter((s): s is string => s !== null);
  return parts.length > 0 ? `${parts.join(", ")}.` : "";
}

function hexaStatNodeTabStyle(theme: Theme, isActive: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    border: `2px solid ${isActive ? theme.accent : theme.border}`, borderRadius: 8, padding: 3,
    background: "transparent", cursor: "pointer",
  };
}

function hexaStatLineLabel(type: string, mainStatLabel: string, attackLabel: string): string {
  if (type === "mainStat") return mainStatLabel;
  if (type === "attackPower") return attackLabel;
  return HEXA_STAT_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

// Mirrors HexaMatrixSetupStep's own StatProgressBar (10 filled/unfilled segments), read-only.
function HexaStatProgressBar({ level, theme }: { level: number; theme: Theme }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: HEXA_STAT_ENTRY_MAX_LEVEL }, (_, i) => (
        // react-doctor-disable-next-line no-array-index-as-key
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i < level ? theme.accent : theme.border }} />
      ))}
    </div>
  );
}

// Mirrors HexaMatrixSetupStep's own HexaStatRow layout (stat name + accent-colored bonus on
// the left, level on the right, with a segmented progress bar below) instead of a single
// flattened string.
function HexaStatLine({ entry, isPrimary, classId, mainStatLabel, attackLabel, theme }: {
  entry: HexaStatEntry; isPrimary: boolean; classId: string | undefined;
  mainStatLabel: string; attackLabel: string; theme: Theme;
}) {
  const hasValue = Boolean(entry.type);
  const bonus = hasValue ? getHexaStatBonus(entry.type, entry.level, isPrimary, classId) : "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: hasValue ? theme.text : theme.muted }}>
            {hasValue ? hexaStatLineLabel(entry.type, mainStatLabel, attackLabel) : "Not set"}
          </span>
          {bonus && <span style={{ fontSize: 12, fontWeight: 800, color: theme.accentText }}>{bonus}</span>}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted, flexShrink: 0 }}>Lv {entry.level}</span>
      </div>
      <HexaStatProgressBar level={entry.level} theme={theme} />
    </div>
  );
}

// Mirrors HexaMatrixSetupStep's own HexaStatSubstep as closely as a read-only view can: node
// icon tabs to switch between HEXA Stat I/II/III, then the same PresetTabs (2 presets, not the
// usual 3) Stats/Equipment already use to preview + correct which preset is really active
// in-game, and the same Main Stat/Alt rows below. Each node has its own independent preset
// pair, so presetIdx resets to that node's real activePreset on every node switch.
function HexaStatBookmarkView({ theme, character, classData, hexaStatNodes, onSetActivePreset }: {
  theme: Theme; character: StoredCharacterRecord | null; classData: ClassSkillData | undefined;
  hexaStatNodes: HexaStatNode[] | null; onSetActivePreset: (nodeIndex: number, presetIndex: number) => void;
}) {
  const level = character?.level ?? 0;
  const unlocked = HEXA_STAT_UNLOCK_LEVELS.map((min) => level >= min);
  const nodes = HEXA_STAT_NODE_LABELS.map((_, i) => hexaStatNodes?.[i] ?? emptyHexaStatNode());
  const [activeSlot, setActiveSlot] = useState(0);
  const [presetIdx, setPresetIdx] = useState(nodes[0].activePreset);

  function selectNode(i: number) {
    setActiveSlot(i);
    setPresetIdx(nodes[i].activePreset);
  }

  const activeNode = nodes[activeSlot];
  const slot = activeNode.presets[presetIdx];
  const primaryStat = classData?.requiredStats[0] ?? "";
  const mainStatLabel = getMainStatLabel(classData?.id ?? "", primaryStat);
  const attackLabel = getAttackLabel(primaryStat);
  const lockedCaption = hexaStatLockedNodesCaption(unlocked);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {HEXA_STAT_NODE_LABELS.map((label, i) => unlocked[i] && (
            <button key={label} type="button" className="tap-target-44" onClick={() => selectNode(i)}
              aria-label={label} aria-pressed={activeSlot === i} style={hexaStatNodeTabStyle(theme, activeSlot === i)}>
              <HexaSkillIcon id={HEXA_STAT_NODE_ICON_IDS[i]} size={36} disabled={isHexaStatNodeEmpty(nodes[i])} />
            </button>
          ))}
        </div>
        {lockedCaption && <p style={{ margin: "6px 0 0", fontSize: 12, color: theme.muted, fontWeight: 700 }}>{lockedCaption}</p>}
      </div>

      {/* Gated on `character`, not `hexaStatNodes` -- HEXA Stat is a substep of an optional
          flow, so a character can exist with no saved HEXA Stat data at all. onSetActivePreset
          (see useCharacterSetupController) builds an empty node shell on demand, so this works
          even before the substep has ever been visited. */}
      <PresetTabs
        theme={theme}
        active={presetIdx}
        activePreset={activeNode.activePreset}
        onSelect={setPresetIdx}
        onSetActive={character ? (p) => onSetActivePreset(activeSlot, p) : null}
        count={2}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <StatBlock label="Main Stat" theme={theme}>
          <HexaStatLine entry={slot.main} isPrimary={true} classId={classData?.id} mainStatLabel={mainStatLabel} attackLabel={attackLabel} theme={theme} />
        </StatBlock>
        <StatBlock label="Alternative Stats" theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <HexaStatLine entry={slot.alt[0]} isPrimary={false} classId={classData?.id} mainStatLabel={mainStatLabel} attackLabel={attackLabel} theme={theme} />
            <HexaStatLine entry={slot.alt[1]} isPrimary={false} classId={classData?.id} mainStatLabel={mainStatLabel} attackLabel={attackLabel} theme={theme} />
          </div>
        </StatBlock>
      </div>
    </div>
  );
}

// Mirrors HexaMatrixSetupStep's own MAX_LEVEL — every HEXA skill/mastery/boost/common node
// caps at 30.
const HEXA_SKILL_MAX_LEVEL = 30;

function hexaMasteryNodeToSkillDef(node: HexaMasteryNode): HexaSkillDef {
  return { name: node.skills.join(" / "), iconId: node.iconId, iconUrl: node.iconUrl };
}

// Same StatBlock + grid treatment as VMatrixNodeSection — one tile per real node, no padding
// for slots the class doesn't have (matches both VMatrixBookmark and the setup step's own
// substep, neither of which model "reserved future slots").
function HexaSkillNodeSection({ label, skills, levels, theme }: {
  label: string; skills: HexaSkillDef[]; levels: number[]; theme: Theme;
}) {
  if (skills.length === 0) return null;
  return (
    <StatBlock label={label} theme={theme}>
      <div className="hexa-skill-grid" style={{ display: "grid", gap: "0.4rem" }}>
        {skills.map((skill, i) => (
          <ReadOnlyLeveledIconTile
            key={skill.name}
            icon={<HexaSkillTileIcon iconId={skill.iconId} iconUrl={skill.iconUrl} name={skill.name} theme={theme} size={32} />}
            name={skill.name}
            level={levels[i] ?? 0}
            max={HEXA_SKILL_MAX_LEVEL}
            theme={theme}
          />
        ))}
      </div>
    </StatBlock>
  );
}

// Reuses VMatrixBookmark's own card-grid look (StatBlock sections of ReadOnlyLeveledIconTile),
// so HEXA Skills reads as the same established pattern instead of the old multicolor flat grid.
function HexaSkillsBookmarkView({ theme, hexaClassDef, hexaLevels }: {
  theme: Theme; hexaClassDef: ReturnType<typeof resolveHexaClassDef>; hexaLevels: HexaSkillLevels;
}) {
  const skillNodes: HexaSkillDef[] = [hexaClassDef?.origin, hexaClassDef?.ascent].filter((s): s is HexaSkillDef => Boolean(s));
  const skillLevels = [hexaLevels.origin ?? 0, hexaLevels.ascent ?? 0];
  const masteryNodes = (hexaClassDef?.mastery ?? []).map(hexaMasteryNodeToSkillDef);
  const boostNodes = hexaClassDef?.enhancement ?? [];

  return (
    <div className="hexa-skills-root" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <style>{`
        .hexa-skills-root { container-type: inline-size; }
        .hexa-skill-grid { grid-template-columns: repeat(6, 68px); }
        @container (max-width: 480px) {
          .hexa-skill-grid { grid-template-columns: repeat(auto-fill, 68px); }
        }
      `}</style>
      <HexaSkillNodeSection label="Skill Nodes" skills={skillNodes} levels={skillLevels} theme={theme} />
      <HexaSkillNodeSection label="Mastery Nodes" skills={masteryNodes} levels={hexaLevels.mastery ?? []} theme={theme} />
      <HexaSkillNodeSection label="Boost Nodes" skills={boostNodes} levels={hexaLevels.enhancement ?? []} theme={theme} />
      <HexaSkillNodeSection label="Common Nodes" skills={COMMON_SKILLS} levels={hexaLevels.common ?? []} theme={theme} />
    </div>
  );
}

function HexaMatrixBookmark({ theme, character, view, onViewChange, onSetActivePreset }: {
  theme: Theme; character: StoredCharacterRecord | null; view: HexaBookmarkView; onViewChange: (v: HexaBookmarkView) => void;
  onSetActivePreset: (nodeIndex: number, presetIndex: number) => void;
}) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const charName = character?.characterName;
  const hexaLevels = useMemo(() => {
    if (!mounted) return null;
    const fromState = (character?.tools?.hexaSkills as { levels?: HexaSkillLevels } | undefined)?.levels;
    if (fromState) return fromState;
    return readHexaLevels(charName);
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `charName` primitive, not the whole `character` object, to avoid re-running when unrelated fields change
  }, [mounted, charName, character?.tools]);
  const hexaStatNodes = useMemo(() => {
    if (!mounted) return null;
    const fromState = (character?.tools?.hexaStat as { nodes?: HexaStatNode[] } | undefined)?.nodes;
    if (fromState) return fromState;
    return readHexaStatNodes(charName);
  // react-doctor-disable-next-line exhaustive-deps -- same narrowed-dependency reasoning as hexaLevels above
  }, [mounted, charName, character?.tools]);

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const hexaClassDef = resolveHexaClassDef(classId);
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const hasHexa = isHexaMatrixAvailable(character);
  const hexaNotice = resolveHexaNotice(hasHexa, character ? isLegacyClass(character.jobName) : false);

  if (hexaNotice !== null) {
    return <GatedFeatureNotice theme={theme} title="Not Available" description={hexaNotice} />;
  }

  // The 2 views are stacked in the same grid cell (both present, only one visible) so the
  // row auto-sizes to the taller of the two, matching EquipmentBookmark's own pattern —
  // including the outer flex:1 + action bar's marginTop: "auto", see StatsBookmark's own
  // comment for why.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "grid" }}>
        <div style={{ gridArea: "1 / 1", visibility: view === "skills" ? "visible" : "hidden" }}>
          <HexaSkillsBookmarkView theme={theme} hexaClassDef={hexaClassDef} hexaLevels={hexaLevels ?? EMPTY_HEXA_LEVELS} />
        </div>
        <div style={{ gridArea: "1 / 1", visibility: view === "stat" ? "visible" : "hidden" }}>
          <HexaStatBookmarkView theme={theme} character={character} classData={classData} hexaStatNodes={hexaStatNodes} onSetActivePreset={onSetActivePreset} />
        </div>
      </div>
      <div style={{ paddingTop: 14, marginTop: "auto" }}>
        <HexaActionBar view={view} theme={theme} onSelect={onViewChange} />
      </div>
    </div>
  );
}

function isHexaMatrixFilled(character: StoredCharacterRecord, mounted: boolean): boolean {
  if (character.level < 260) return false;
  if (isLegacyClass(character.jobName)) return true;
  if (!mounted) return false;
  const fromState = (character.tools?.hexaSkills as { levels?: HexaSkillLevels } | undefined)?.levels;
  return Boolean(fromState ?? readHexaLevels(character.characterName));
}

function isBookmarkFilled(id: BookmarkId, character: StoredCharacterRecord | null, mounted: boolean): boolean {
  if (!character) return false;
  switch (id) {
    case "overview": return true;
    case "gender_marriage": return character.gender !== null || (character.marriage !== null && character.marriage.isMarried !== null);
    case "stats": return isStatsFilled(character);
    case "equipment": {
      const equip = character.equipment;
      const preset = equip?.presets?.[equip.activePreset] ?? equip?.presets?.[0];
      return Boolean(equip?.title || preset && Object.values(preset).some((v) => v && typeof v === "object" && "name" in v && v.name));
    }
    case "familiars": {
      const preset = character.familiars?.presets?.[character.familiars.activePreset];
      return Boolean(preset && (preset.familiars.some((f) => f.name) || preset.badges.length > 0));
    }
    case "v_matrix": {
      const levels = character.vMatrix?.levels;
      return Boolean(levels && Object.values(levels).some((v) => v > 0));
    }
    case "hexa_matrix": return isHexaMatrixFilled(character, mounted);
    default: return false;
  }
}

const BOOKMARK_CONTENT: Record<Exclude<BookmarkId, "overview" | "setup" | "gender_marriage" | "stats" | "equipment" | "v_matrix" | "hexa_matrix" | "familiars">, (props: { theme: Theme; character: StoredCharacterRecord | null }) => ReactNode> = {};

function SetupBookmark({ model, actions }: { model: PreviewPaneModel; actions: PreviewPaneActions }) {
  const { theme } = model;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 12, color: theme.muted, fontWeight: 700 }}>
        Re-run a whole setup flow for this character without starting over from the directory.
      </p>
      <SetupFlowButtons model={model} actions={actions} isProfileBookmark />
    </div>
  );
}

// The Stats step's substeps are 0: quick questions, 1: Character Info (Basic/Combat/
// Symbols — everything the "stats" bookmark view shows), then Hyper Stat and Inner
// Ability, whose indices shift depending on Hyper Stat eligibility (StatsSetupStep
// hides that substep below Lv 140). Mirrors that same substep numbering so the edit
// pencil opens on the substep the bookmark is actually showing, not substep 0.
function statsTargetSubstep(view: StatsView, characterLevel: number | undefined): number {
  const hyperEligible = isHyperStatEligible(characterLevel);
  if (view === "hyperStat") return hyperEligible ? 2 : 1;
  if (view === "ability") return hyperEligible ? 3 : 2;
  return 1;
}

// equipment_flow has exactly one step ("equipment") with 3 fixed substeps (0: main grid,
// 1: titles/totems/symbols, 2: pets — see EquipmentSetupStep.tsx's SUBSTEP_COUNT), so
// unlike statsTargetSubstep there's no eligibility-based index shifting to account for.
function equipmentTargetSubstep(view: EquipmentBookmarkView): number {
  if (view === "titles") return 1;
  if (view === "pets") return 2;
  return 0;
}

// hexa_matrix_flow's HexaMatrixSetupStep has 2 substeps (0: skill levels, 1: HEXA Stat) for
// every flow that reaches this bookmark's edit pencil (only maplescouter_setup skips HEXA
// Stat entirely, and that flow has no profile bookmark pencil of its own).
function hexaMatrixTargetSubstep(view: HexaBookmarkView): number {
  return view === "stat" ? 1 : 0;
}

function BookmarkPageBody({
  model, actions, active, filled, ContentComponent, onEdit, onEditStep,
}: {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
  active: BookmarkDef;
  filled: boolean;
  ContentComponent: ((props: { theme: Theme; character: StoredCharacterRecord | null }) => ReactNode) | null;
  onEdit: () => void;
  onEditStep: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) => void;
}) {
  const { theme, profile, setup } = model;
  const character = profile.confirmedCharacter;
  const [statsView, setStatsView] = useState<StatsView>(() => {
    const remembered = setup.lastActiveBookmarkSubView;
    return active.id === "stats" && (remembered === "hyperStat" || remembered === "ability") ? remembered : "stats";
  });
  const [equipmentView, setEquipmentView] = useState<EquipmentBookmarkView>(() => {
    const remembered = setup.lastActiveBookmarkSubView;
    return active.id === "equipment" && (remembered === "titles" || remembered === "pets") ? remembered : "gear";
  });
  const [hexaView, setHexaView] = useState<HexaBookmarkView>(() => {
    const remembered = setup.lastActiveBookmarkSubView;
    return active.id === "hexa_matrix" && remembered === "stat" ? remembered : "skills";
  });

  if (active.id === "overview") return <OverviewBookmark model={model} />;

  if (active.id === "setup") {
    // SetupFlowButtons calls actions.startOptionalFlow directly (it's also reused
    // standalone on the first-run intro screen, which has no bookmark to remember), so
    // route its calls through onEditStep here to keep the remembered-bookmark tracking
    // correct for Quick/Full/MapleScouter Setup launched from this bookmark too.
    const setupBookmarkActions: PreviewPaneActions = { ...actions, startOptionalFlow: onEditStep };
    return (
      <>
        <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={null} disabled={setup.isUiLocked} />
        <SetupBookmark model={model} actions={setupBookmarkActions} />
      </>
    );
  }

  // Gender and marriage each edit independently (tap a block to jump straight into that
  // step), so there's no single combined "edit this bookmark" action for the header
  // pencil or a bottom "Set up" button the way every other bookmark has.
  if (active.id === "gender_marriage") {
    return (
      <>
        <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={null} disabled={setup.isUiLocked} />
        <BiographyPanel theme={theme} character={character} onEditStep={onEditStep} disabled={setup.isUiLocked} />
      </>
    );
  }

  // Stats has 3 swappable sub-views (Stats/Hyper Stat/Ability) sharing one edit flow, so
  // the pencil needs to know which one is showing to open the matching substep instead of
  // always restarting at substep 0 — see statsTargetSubstep. Always confined to that one
  // substep (no Back/Next into its siblings), filled or not — each sub-view's pencil edits
  // just that piece of data, the same way every other bookmark's pencil is scoped to it.
  if (active.id === "stats") {
    const editStats = () => { if (active.flowId) onEditStep(active.flowId, statsTargetSubstep(statsView, character?.level), true, statsView); };
    const statsHeaderLabel = statsBookmarkHeaderLabel(statsView, active.pageLabel);
    return (
      <>
        <BookmarkPageHeader theme={theme} label={statsHeaderLabel} onEdit={editStats} disabled={setup.isUiLocked} />
        <StatsBookmark
          theme={theme}
          character={character}
          view={statsView}
          onViewChange={setStatsView}
          onSetActivePreset={actions.setStatsActivePreset}
        />
      </>
    );
  }

  // Same shape as Stats above: 3 swappable sub-views sharing the equipment_flow's 3 fixed
  // substeps (see equipmentTargetSubstep), pencil always confined to whichever sub-view is
  // showing, no EmptyBookmarkState — the read view shows empty-slot placeholders instead.
  if (active.id === "equipment") {
    const editEquipment = () => { if (active.flowId) onEditStep(active.flowId, equipmentTargetSubstep(equipmentView), true, equipmentView); };
    const equipmentHeaderLabel = equipmentBookmarkHeaderLabel(equipmentView, active.pageLabel);
    return (
      <>
        <BookmarkPageHeader theme={theme} label={equipmentHeaderLabel} onEdit={editEquipment} disabled={setup.isUiLocked} />
        <EquipmentBookmark
          key={character?.characterName}
          theme={theme}
          character={character}
          view={equipmentView}
          onViewChange={setEquipmentView}
          onSetActivePreset={actions.setEquipmentActivePreset}
        />
      </>
    );
  }

  // Same shape as Equipment above: no EmptyBookmarkState — the read view mirrors
  // VMatrixSetupStep's own node grid with all-zero tiles when nothing's set up yet, so the
  // edit pencil is always available instead of gated behind a separate "Set up" button.
  if (active.id === "v_matrix") {
    return (
      <>
        <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={isVMatrixAvailable(character) ? onEdit : null} disabled={setup.isUiLocked} />
        <VMatrixBookmark theme={theme} character={character} />
      </>
    );
  }

  // Same shape as V Matrix above: gated by level/legacy (isHexaMatrixAvailable), no
  // EmptyBookmarkState, pencil hidden when gated. 2 swappable sub-views (Skills/Stat)
  // sharing hexa_matrix_flow's 2 fixed substeps (see hexaMatrixTargetSubstep), pencil
  // confined to whichever sub-view is showing, same as Equipment/Stats.
  if (active.id === "hexa_matrix") {
    const hexaAvailable = isHexaMatrixAvailable(character);
    const editHexa = () => { if (active.flowId) onEditStep(active.flowId, hexaMatrixTargetSubstep(hexaView), true, hexaView); };
    const hexaHeaderLabel = hexaMatrixBookmarkHeaderLabel(hexaView, active.pageLabel);
    return (
      <>
        <BookmarkPageHeader theme={theme} label={hexaHeaderLabel} onEdit={hexaAvailable ? editHexa : null} disabled={setup.isUiLocked} />
        <HexaMatrixBookmark theme={theme} character={character} view={hexaView} onViewChange={setHexaView} onSetActivePreset={actions.setHexaStatActivePreset} />
      </>
    );
  }

  // Same shape as V Matrix above: no gating (Familiars has none) and no sub-views, so this
  // needs neither an eligibility check nor a targetSubstep helper — the pencil just opens
  // familiars_flow's single step directly.
  if (active.id === "familiars") {
    return (
      <>
        <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={onEdit} disabled={setup.isUiLocked} />
        <FamiliarsBookmark theme={theme} character={character} onSetActivePreset={actions.setFamiliarsActivePreset} />
      </>
    );
  }

  return (
    <>
      <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={filled ? onEdit : null} disabled={setup.isUiLocked} />
      {filled && ContentComponent ? <ContentComponent theme={theme} character={character} /> : null}
      {!filled && <EmptyBookmarkState theme={theme} label={active.pageLabel} onSetup={onEdit} disabled={setup.isUiLocked} />}
    </>
  );
}

function BookmarkSpine({
  theme, bookmarks, activeId, onSelect,
}: {
  theme: Theme;
  bookmarks: BookmarkDef[];
  activeId: BookmarkId;
  onSelect: (id: BookmarkId) => void;
}) {
  const tabRefs = useRef<Map<BookmarkId, HTMLButtonElement>>(new Map());

  // A page tablist should switch content immediately as focus moves (WAI-ARIA APG's
  // automatic-activation pattern) — unlike this codebase's picker-oriented
  // useKeyboardListNav hook, which highlights first and only confirms on Enter.
  function handleKeyDown(e: KeyboardEvent, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowDown") nextIndex = (index + 1) % bookmarks.length;
    else if (e.key === "ArrowUp") nextIndex = (index - 1 + bookmarks.length) % bookmarks.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = bookmarks.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    const next = bookmarks[nextIndex];
    onSelect(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  return (
    <div className="profile-binder-spine" role="tablist" aria-label="Character profile sections" aria-orientation="vertical">
      {bookmarks.map((b, i) => {
        const active = b.id === activeId;
        const tab = (
          <button
            key={b.id}
            ref={(el) => { if (el) tabRefs.current.set(b.id, el); else tabRefs.current.delete(b.id); }}
            type="button"
            role="tab"
            id={`profile-tab-${b.id}`}
            aria-selected={active}
            aria-controls={`profile-page-${b.id}`}
            tabIndex={active ? 0 : -1}
            className={["profile-bookmark-tab", "tap-target-44", active ? "profile-bookmark-tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => onSelect(b.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            style={{
              background: active ? `${theme.accent}18` : "transparent",
              color: active ? theme.accentText : theme.muted,
              gap: 6,
            }}
          >
            {b.id === "setup" && <SetupTabIcon />}
            {b.tabLabel}
          </button>
        );
        if (b.id !== "setup") return tab;
        // Pinned to the bottom of the spine's own box (not just the end of the list) via
        // margin-top: auto on this wrapper, with its own standalone divider above the tab
        // (not a border on the button itself, which caused an optical illusion where the
        // label read as off-center even though its padding was symmetric).
        return (
          <div key={b.id} className="profile-bookmark-pinned-group">
            <div className="profile-bookmark-divider" />
            {tab}
          </div>
        );
      })}
    </div>
  );
}

export default function CharacterProfileOverviewScreen({
  model,
  actions,
}: CharacterProfileOverviewScreenProps) {
  const { theme, profile } = model;
  const character = profile.confirmedCharacter;
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

  const bookmarks = ALL_BOOKMARKS;
  // Restores whichever bookmark was active before an optional flow was started from
  // here — this screen unmounts while the flow runs, so plain useState("overview")
  // would otherwise always land back on Overview once the flow finishes.
  const [activeId, setActiveId] = useState<BookmarkId>(() => {
    const remembered = model.setup.lastActiveBookmarkId;
    return remembered && bookmarks.some((b) => b.id === remembered) ? (remembered as BookmarkId) : "overview";
  });
  const active = bookmarks.find((b) => b.id === activeId) ?? bookmarks[0];

  // The remembered bookmark/sub-view is only meant for this one restore, read via the lazy
  // initializer above — clear it so a later switch away and back (BookmarkPageBody remounts
  // per key={active.id} below) doesn't keep re-restoring the same stale sub-view.
  // react-doctor-disable-next-line no-prop-callback-in-effect, no-pass-live-state-to-parent
  useEffect(() => { actions.clearRestoredBookmark(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filled = isBookmarkFilled(active.id, character, mounted);
  const ContentComponent = active.id === "overview" || active.id === "setup" || active.id === "gender_marriage" || active.id === "stats" || active.id === "equipment" || active.id === "v_matrix" || active.id === "hexa_matrix" || active.id === "familiars" ? null : BOOKMARK_CONTENT[active.id];

  function startOptionalFlowRemembered(flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) {
    actions.rememberActiveBookmark(active.id, subView);
    actions.startOptionalFlow(flowId, targetSubstep, confineToSubstep);
  }

  function handleEdit() {
    if (active.flowId) startOptionalFlowRemembered(active.flowId);
  }

  return (
    <div className="profile-binder">
      <div
        className="profile-binder-page"
        role="tabpanel"
        id={`profile-page-${active.id}`}
        aria-labelledby={`profile-tab-${active.id}`}
        tabIndex={0}
      >
        <div key={active.id} className="profile-binder-page-content">
          <BookmarkPageBody model={model} actions={actions} active={active} filled={filled} ContentComponent={ContentComponent} onEdit={handleEdit} onEditStep={startOptionalFlowRemembered} />
        </div>
      </div>
      <BookmarkSpine theme={theme} bookmarks={bookmarks} activeId={active.id} onSelect={setActiveId} />
    </div>
  );
}
