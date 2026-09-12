import katex from "katex";
import "katex/dist/katex.min.css";
import type { Route } from "next";
import Link from "next/link";
import Image from "next/image";
import { classPortraitUrl } from "../../../../lib/classPortraits";
import { worldIconUrl } from "../../../../lib/mapleResource";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { useMounted } from "../../../../lib/useMounted";
import { useScrollEdges, edgeFadeMask } from "../../../../lib/useScrollEdges";
import type { SetupFlowId } from "../../setup/flows";
import type { SetupStepId } from "../../setup/steps";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle, secondaryButtonStyle, successButtonStyle } from "../components/uiStyles";
import { findClassById, commonSkillsFor, type HexaSkillDef, type HexaSkillLevels, type HexaMasteryNode } from "../../../tools/hexa-skills/hexa-classes";
import { NavChevron } from "../../DropdownChevron";
import { SkillIcon as HexaSkillTileIcon } from "../../../tools/hexa-skills/hexa-ui";
import { readCharacterToolData } from "../../../tools/characterToolStorage";
import { resolveClassId, getClassSetupOverrides, resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import { CLASS_SKILL_DATA, getClassDataByNexonJobName, isLegacyClass, type ClassSkillData } from "../../setup/data/classSkillData";
import { HEXA_STAT_OPTIONS, getHexaStatBonus, getMainStatLabel, getAttackLabel, type HexaStatNode, type HexaStatEntry, type HexaStatSlot } from "../../setup/data/hexaStatData";
import { EXP_HISTORY_DAY_MS, nexonDayIndex, NEXON_DAILY_UPDATE_CUTOFF_HOUR_UTC, readCharactersStore, selectCharacterByIgn } from "../../model/charactersStore";
import { WORLD_NAMES } from "../../model/constants";
import type { StoredCharacterEquipment, StoredCharacterRecord, StoredCharacterStats, StoredEquipmentItem, StoredHyperStat, StoredInnerAbility, StoredIATier, StoredTripleStatField, StoredFamiliarSlot, ExpHistoryEntry, OverviewSectionId } from "../../model/charactersStore";
import CustomizeOverviewDialog, { type OverviewAnchorDef } from "./CustomizeOverviewDialog";
import { isExpTrackingAvailable, resolveExpDelta, characterExpPercent, netExpGained } from "../../model/expProgress";
import ExpDeltaBadge from "../components/ExpDeltaBadge";
import { formatExpCompact } from "../../../tools/format";
import { PillGroup } from "../../../tools/shared-ui";
import type { Chart, ChartData, ChartOptions, ChartType, Plugin, TooltipItem } from "chart.js";
import { SetupFlowButtons } from "./QuickSetupIntroScreen";
import { STAT_LABELS } from "../../setup/data/statFields";
import { HYPER_STAT_CATEGORIES, type HyperStatCategoryDef } from "../../setup/data/hyperStatData";
import { isHyperStatEligible, isArcaneEligible, isSacredEligible, HYPER_STAT_LEVEL, ARCANE_POWER_LEVEL, SACRED_POWER_LEVEL } from "../../setup/data/statsStepDraft";
import { IA_TIER_LABELS } from "../../setup/data/innerAbilityData";
import { resolveFinalDamagePercent } from "../../setup/data/finalDamageData";
import { computeDamageRange } from "../../setup/data/damageRangeData";
import { resolveComboOrdersTier, type ComboOrdersTier } from "../../setup/data/comboOrdersData";
import { isRebootWorld, rebootFinalDamageBonusPercent } from "../../setup/data/rebootData";
import { TIER_COLORS as IA_TIER_COLORS, TIER_COLORS as FAMILIAR_TIER_COLORS, FAMILIARS, familiarStatBonuses, type FamiliarStatBonus, type FamiliarTier } from "../../setup/data/familiarsData";
import { statusText } from "../../../../components/statusColors";
import { ItemIcon } from "../../../../components/ResourceImage";
import HoverTooltip from "../../../../components/HoverTooltip";
import ScouterFigure, { ScouterRefreshButton } from "../../scouter/ScouterFigure";
import { useScouterResult, type ScouterErrorReason } from "../../scouter/useScouterResult";
import BossClearGrid, { type ScouterBookmarkView } from "../../scouter/BossClearGrid";
import StatEfficiencyPanel from "../../scouter/StatEfficiencyPanel";
import { useScouterSimulator, type ScouterSimulatorController } from "../../scouter/useScouterSimulator";
import ScouterSimulatorDialog from "../../scouter/ScouterSimulatorDialog";
import { dialogBtnColors } from "../../../../components/themes";
import type { ScouterResultEntry } from "../../scouter/scouterCache";
import { groupByBoss, resolveBossDisplayName } from "../../scouter/bossGrouping";
import { BOSSCUT_DATA } from "../../scouter/bosscut-data.generated";
import InfoTooltip, { type TooltipContent } from "../../setup/components/InfoTooltip";
import { ReadOnlySlotTile, ReadOnlySymbolTile } from "../../setup/components/EquipmentSetupStep";
import { ReadOnlyLeveledIconTile } from "../../setup/components/LeveledIconTile";
import { VMatrixNodeIcon, useVMatrixCatalog, type VMatrixNode } from "../../setup/components/VMatrixSetupStep";
import { HexaStatNodeIcon } from "../../setup/components/HexaMatrixSetupStep";
import { ReadOnlyFamiliarSlotCard, ReadOnlyBadgeSlot, FamiliarCardSprite, PRESET_COUNT as FAMILIAR_PRESET_COUNT, BADGE_SIZE as FAMILIAR_BADGE_SIZE, BADGE_BORDER as FAMILIAR_BADGE_BORDER } from "../../setup/components/FamiliarsSetupStep";
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
type BookmarkId = "overview" | "gender_marriage" | Exclude<SetupStepId, "gender" | "marriage" | "maplescouter_import" | "link_skills" | "legion_artifacts" | "buffs" | "oz_rings"> | "exp" | "scouter" | "efficiency" | "setup";

interface BookmarkDef {
  id: BookmarkId;
  tabLabel: string;
  pageLabel: string;
  flowId: SetupFlowId | null;
}

const ALL_BOOKMARKS: BookmarkDef[] = [
  { id: "overview", tabLabel: "Overview", pageLabel: "Overview", flowId: null },
  { id: "gender_marriage", tabLabel: "Bio", pageLabel: "Biography", flowId: "quick_setup" },
  { id: "exp", tabLabel: "EXP", pageLabel: "EXP", flowId: null },
  { id: "scouter", tabLabel: "Scouter", pageLabel: "Scouter", flowId: null },
  { id: "efficiency", tabLabel: "Efficiency", pageLabel: "Stat Efficiency", flowId: null },
  { id: "stats", tabLabel: "Stats", pageLabel: "Stats", flowId: "stats_flow" },
  { id: "equipment", tabLabel: "Gear", pageLabel: "Equipment", flowId: "equipment_flow" },
  { id: "v_matrix", tabLabel: "V Matrix", pageLabel: "V Matrix", flowId: "v_matrix_flow" },
  { id: "hexa_matrix", tabLabel: "HEXA", pageLabel: "HEXA Matrix", flowId: "hexa_matrix_flow" },
  { id: "familiars", tabLabel: "Familiars", pageLabel: "Familiars", flowId: "familiars_flow" },
  { id: "setup", tabLabel: "Setup", pageLabel: "Setup", flowId: null },
];

const GENDER_LABELS: Record<"male" | "female", string> = { male: "Male", female: "Female" };

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

export function ExportTabIcon({ strokeWidth = 1.5 }: { strokeWidth?: number }) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
    </svg>
  );
}

// Reads fresh from the store rather than trusting the `character` object passed down,
// mirroring readHexaLevels and readHexaStatNodes above, which exist for the same reason: tool
// writes elsewhere in the app do not always reach an already rendered `character` prop.
// Exports the whole record, stats, equipment, tools and the rest, so it doubles as an import
// source, being the shape a re-import needs to reconstruct the character.
function exportCharacterJson(charName: string | undefined) {
  if (!charName) return;
  const character = selectCharacterByIgn(readCharactersStore(), charName);
  if (!character) return;
  const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mapledoro-${charName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function BookmarkPageHeader({ theme, label, onEdit, disabled, extraAction }: {
  theme: Theme; label: string; onEdit: (() => void) | null; disabled: boolean; extraAction?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>{label}</h3>
        {extraAction}
      </div>
      {onEdit !== null && (
        <HoverTooltip label={`Edit ${label}`} theme={theme}>
          <button
            type="button"
            className="tap-target-44"
            aria-label={`Edit ${label}`}
            disabled={disabled}
            onClick={onEdit}
            style={pencilButtonStyle(theme)}
          >
            <PencilIcon />
          </button>
        </HoverTooltip>
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
    <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.7 2.7 0 1 1 3.9 2.4c-.8.4-1.2 1-1.2 1.9v.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="16.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PartnerPlaceholderIcon() {
  return (
    <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="8.5" r="3.4" />
      <path d="M5.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" strokeLinecap="round" />
    </svg>
  );
}

// The manifest's world/server ids are just the lowercased WORLD_NAMES display name
// (Bera -> "bera", Hyperion -> "hyperion", ...), so no separate id map is needed. A world
// name that doesn't resolve (unknown worldID) still 404s gracefully into the hand-drawn
// globe fallback below.
function WorldIcon({ worldName, size = 56 }: { worldName: string; size?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<SVGSVGElement>(null);
  return (
    <>
      <div ref={wrapperRef} style={{ width: size, height: size, flexShrink: 0 }}>
        <Image
          src={worldIconUrl(worldName.toLowerCase())}
          alt={worldName}
          width={size}
          height={size}
          unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "flex";
          }}
          style={{ width: size, height: size, objectFit: "contain", display: "block" }}
        />
      </div>
      <svg
        ref={fallbackRef}
        style={{ display: "none" }}
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
}

function TrackedSinceIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

// Simple "leaderboard" bars, for the server rank fun fact.
function RankIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M5 19V13M12 19V8M19 19V4" strokeLinecap="round" />
    </svg>
  );
}

// classPortraitUrl returns an empty string for a class with no official Nexon artwork, such
// as a resolveDisplayJobName output that does not exactly match the map's keys. That case
// shows the class's initial rather than a broken image, the same fallback the character-guides
// page uses for this lookup.
function ClassPortrait({ className, theme, size = 72 }: { className: string; theme: Theme; size?: number }) {
  const url = classPortraitUrl(className);
  if (!url) {
    return <span style={{ fontSize: size * 0.4, fontWeight: 800, color: theme.accentText }}>{className.charAt(0)}</span>;
  }
  return (
    <Image src={url} alt={className} width={size} height={size} style={{ width: size, height: size, objectFit: "contain" }} />
  );
}

// Two rows of two cards each, centered vertically in the panel.
const biographyRowWrapperStyle: CSSProperties = {
  display: "flex", flexDirection: "column", gap: 14, flex: 1, alignItems: "center", justifyContent: "center",
};

// minHeight makes these fill the vertical space when centered, so with the larger icon and
// padding they read as proper cards rather than small buttons.
const biographyBlockMinHeight = 200;

function biographyBlockStyle(theme: Theme, filled: boolean): CSSProperties {
  return {
    position: "relative",
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
    borderRadius: 14, background: theme.bg, textAlign: "center",
    border: filled ? `1px solid ${theme.border}` : `1px dashed ${theme.border}`,
    minHeight: biographyBlockMinHeight,
    padding: "1rem 0.5rem",
  };
}

// Every other bookmark's edit affordance is a pencil button, and BookmarkPageHeader's
// pencilButtonStyle and PencilIcon are reused here. Only the pencil is clickable rather than
// the whole card, so label and caption text such as a partner's name stays plain selectable
// text instead of being swallowed by one large button that treats any tap as edit.
function BiographyBlock({ theme, icon, label, caption, filled, onClick, disabled }: {
  theme: Theme; icon: ReactNode; label: string; caption: string; filled: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <div style={biographyBlockStyle(theme, filled)}>
      <HoverTooltip label={`Edit ${label}`} theme={theme} style={{ position: "absolute", top: 8, right: 8 }}>
        <button
          type="button"
          className="tap-target-44"
          aria-label={`Edit ${label}`}
          disabled={disabled}
          onClick={onClick}
          style={pencilButtonStyle(theme)}
        >
          <PencilIcon />
        </button>
      </HoverTooltip>
      <div style={{ color: filled ? theme.accentText : theme.muted }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>{label}</div>
      <div style={{ fontSize: 13, color: theme.muted }}>{caption}</div>
    </div>
  );
}

// Fades the class portrait toward transparent on every edge, heaviest at the bottom where the
// trait row sits, so it blends into the panel background without needing to know that
// background's color: an ellipse mask reveals whatever is behind it. The -webkit- duplicate is
// required for Safari and iOS.
const classPortraitFadeStyle: CSSProperties = {
  maskImage: "radial-gradient(ellipse 70% 62% at 50% 36%, black 42%, transparent 92%)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 62% at 50% 36%, black 42%, transparent 92%)",
};

// 5 columns, 3 stats plus 2 hairline dividers, and 3 rows for icon, label and value. CSS Grid
// gives every column in a row the height of that row's tallest cell, so whichever label wraps
// to two lines, which varies by column width and label length and is not knowable up front,
// pushes every column's value down together rather than only its own. No breakpoint to tune,
// and it stays correct at any width.
function bioTraitGridStyle(): CSSProperties {
  return { display: "grid", gridTemplateColumns: "auto 1px auto 1px auto", columnGap: 20, rowGap: 6, justifyContent: "center", alignItems: "center" };
}

function bioTraitDividerStyle(theme: Theme, column: number): CSSProperties {
  return { gridColumn: column, gridRow: "1 / span 3", width: 1, background: theme.border };
}

// Sits under the faded portrait and reads as a continuation of it rather than a separate card,
// with no background or border of its own, just an icon, label and value per trait. Renders as
// 3 grid children, one per row, rather than a wrapping div, so its row heights are shared with
// its sibling columns. See bioTraitGridStyle.
function BioTraitStat({ theme, icon, label, value, column }: {
  theme: Theme; icon: ReactNode; label: string; value: string; column: number;
}) {
  return (
    <>
      <div style={{ gridColumn: column, gridRow: 1, display: "flex", alignItems: "center", justifyContent: "center", height: 30, color: theme.accentText }}>{icon}</div>
      <div style={{ gridColumn: column, gridRow: 2, fontSize: 12, fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
      <div style={{ gridColumn: column, gridRow: 3, fontSize: 15, fontWeight: 800, color: theme.text, textAlign: "center", whiteSpace: "nowrap" }}>{value}</div>
    </>
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
  // Both cards always show, since a class-level lock is a permanent state worth displaying
  // rather than missing data. "none", as with Zero which has no gender concept, is distinct
  // from a fixedGender lock like Mihile, which is locked to a specific already-set value.
  const genderLocked = Boolean(overrides?.gender);
  const marriageLocked = Boolean(overrides?.skipMarriage);

  const gender = character?.gender === "male" || character?.gender === "female" ? character.gender : null;
  const marriage = character?.marriage;
  const hasMarriage = Boolean(marriage && marriage.isMarried !== null);

  const genderCaption = resolveGenderCaption(overrides?.gender, gender, genderLocked);
  const marriageCaption = marriageLocked ? "Not available for this class" : resolveMarriageCaption(marriage);
  const className = character ? resolveDisplayJobName(character.jobName) : "—";
  const worldName = character ? WORLD_NAMES[character.worldID] ?? `World ${character.worldID}` : "—";
  const rankLabel = character?.overallRank ? `#${character.overallRank.toLocaleString("en-US")}` : "Unranked";
  const trackedSinceLabel = character
    ? new Date(character.meta.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div style={biographyRowWrapperStyle}>
      <div style={{ display: "flex", gap: 14, width: "100%", maxWidth: 520 }}>
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
      <div style={{ borderTop: `1px solid ${theme.border}`, width: "100%", maxWidth: 520 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 520 }}>
        <div style={classPortraitFadeStyle}>
          <ClassPortrait className={className} theme={theme} size={240} />
        </div>
        <div style={{ ...bioTraitGridStyle(), marginTop: -8 }}>
          <BioTraitStat theme={theme} icon={<WorldIcon worldName={worldName} size={30} />} label="World" value={worldName} column={1} />
          <div style={bioTraitDividerStyle(theme, 2)} />
          <BioTraitStat theme={theme} icon={<RankIcon size={30} />} label="Server Rank" value={rankLabel} column={3} />
          <div style={bioTraitDividerStyle(theme, 4)} />
          <BioTraitStat theme={theme} icon={<TrackedSinceIcon size={30} />} label="Tracked Since" value={trackedSinceLabel} column={5} />
        </div>
      </div>
    </div>
  );
}

// `locked` marks a field not obtainable yet at this character's level, such as Arcane Power
// below Lv 200. That is distinct from eligible but not filled in, which notCollected renders
// as a plain dash, so it dims the row rather than reading as an ordinary data-entry gap.
//
// A long unbroken value such as Damage Range's "15,069,287" has no spaces to wrap at and
// spills into the next grid column. `overflowWrap: "anywhere"` fixed that but over-applied,
// forcing short values like "115.00%" to wrap mid-string whenever their column got tight. A
// `<wbr/>` after each comma group gives the browser a break point only where a large number
// can take one, and short values with no commas get none, so they render on one line.
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

function wseSlotButtonStyle(theme: Theme, filled: boolean): CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bg,
    display: "flex", alignItems: "center", justifyContent: "center", opacity: filled ? 1 : 0.4, flexShrink: 0,
    padding: 0, font: "inherit", cursor: "pointer",
  };
}

// Compact icon-only slot, with name and status in the tooltip, so Weapon, Secondary and Emblem
// fit one tight row rather than three bordered label and name boxes. An empty slot shows the
// label's first letter rather than an empty placeholder square, since three identical grey
// boxes gave no clue what they were without hovering each one.
function WseSlot({ label, item, theme, onNavigate }: {
  label: string; item: StoredEquipmentItem | null | undefined; theme: Theme; onNavigate: () => void;
}) {
  const name = item?.name;
  return (
    <HoverTooltip label={name ? `${label}: ${name}` : `${label}: not set up`} theme={theme}>
      <button type="button" onClick={onNavigate} style={wseSlotButtonStyle(theme, Boolean(item))}>
        {item?.id ? <ItemIcon id={item.id} size={36} /> : <span style={{ fontSize: 12, fontWeight: 800, color: theme.muted }}>{label[0]}</span>}
      </button>
    </HoverTooltip>
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

// HEXA Matrix unlocks at level 260 and is unavailable to legacy, pre-5th-job classes. See the
// "Level / legacy gating" table in the characters CLAUDE.md. Also drives whether
// BookmarkPageBody shows the edit pencil, since a gated character has nothing to edit.
function isHexaMatrixAvailable(character: StoredCharacterRecord | null): boolean {
  if (!character) return false;
  return character.level >= 260 && !isLegacyClass(character.jobName);
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

// Pre-mount fallback for ScouterFigure (scouter/ScouterFigure.tsx) while `mounted` and
// `character` are not ready, rendering the label with a placeholder value.
function OverviewFigure({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: theme.muted, lineHeight: 1, fontFamily: "var(--font-heading)" }}>{value}</div>
    </div>
  );
}

function overviewGroupHeaderRowStyle(theme: Theme): CSSProperties {
  return { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: 8, marginBottom: 12, borderBottom: `1px solid ${theme.border}` };
}

// Matching BookmarkPageHeader's plain-body h3 traded one collision, against the small-caps
// sub-labels below it, for another against HexaStatLine's stat values, which sit at nearly the
// same weight in the same body font. Using the app's heading typeface (`--font-heading`,
// Fredoka against the body's Nunito, as LegionPanel, BossCard and CharacterDirectoryScreen do)
// separates a section title from data by typeface rather than size alone, so it competes with
// neither neighbor.
function overviewGroupHeaderButtonStyle(theme: Theme): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 4,
    background: "none", border: "none", padding: 0, font: "inherit", textAlign: "inherit", cursor: "pointer",
    fontFamily: "var(--font-heading)", fontSize: "1.05rem", fontWeight: 700, color: theme.text,
  };
}

function overviewToolLinkStyle(theme: Theme): CSSProperties {
  return { display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, flexShrink: 0, color: theme.muted };
}

function OverviewToolLinkIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// Shared by every Overview section header that links out to a standalone calculator tool. The
// tools read the character back through the `?character=` convention
// (useApplyCharacterQueryParam), so this only builds a matching URL.
function overviewToolHref(base: Route, charName: string | undefined): Route | undefined {
  return charName ? `${base}?character=${encodeURIComponent(charName)}` : undefined;
}

function optimizeToolLinkStyle(theme: Theme): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: theme.accentText, textDecoration: "none" };
}

/** Bottom-of-panel link from a Stats bookmark sub-view into the Stat Optimizer tool,
 *  preselecting this character and, for HEXA, its mode via `?mode=hexa` (see
 *  useStatOptimizer's initialModeFromQueryParam). Omitted with no character selected, like
 *  every other tool link in this file. `marginTop` is caller-supplied because the two
 *  sub-views stack up to it differently: HEXA's StatBlock sections carry their own bottom
 *  spacing where Hyper Stat's flat row list does not. */
function OptimizeToolLink({ theme, charName, mode, label, marginTop }: { theme: Theme; charName: string | undefined; mode: "hexa" | null; label: string; marginTop: number }) {
  if (!charName) return null;
  const href: Route = mode
    ? `/tools/stat-optimizer?character=${encodeURIComponent(charName)}&mode=${mode}`
    : `/tools/stat-optimizer?character=${encodeURIComponent(charName)}`;
  return (
    <div style={{ textAlign: "center", marginTop }}>
      <Link href={href} style={optimizeToolLinkStyle(theme)}>
        {label}
        <OverviewToolLinkIcon />
      </Link>
    </div>
  );
}

// Every Overview section header doubles as a link to the matching profile bookmark, a
// same-page tab switch and so always the primary click target. bookmarkLabel names that
// target's page label, such as "Equipment" or "HEXA Matrix", for the hover tooltip, since the
// section label shown here does not always match: Gear and Arcane Symbols both land on the
// Equipment bookmark.
//
// Sections that also have a standalone tool covering the same data, currently HEXA Skills and
// Arcane Symbols, get a second visually distinct icon-button link to it, since one click
// target cannot mean two destinations. HEXA Stat has no tool yet, as hexa-skills only tracks
// Skill progress. toolHref carries the character through the tools' shared `?character=`
// convention (useApplyCharacterQueryParam) so the tool opens pre-loaded, and toolLabel is the
// tool's own name from its /tools card, such as "HEXA Skill Tracker", which likewise does not
// always match the section label.
function OverviewGroupHeader({ label, theme, onNavigate, bookmarkLabel, toolHref, toolLabel }: {
  label: string; theme: Theme; onNavigate: () => void; bookmarkLabel: string; toolHref?: Route; toolLabel?: string;
}) {
  return (
    <div style={overviewGroupHeaderRowStyle(theme)}>
      <HoverTooltip label={`View in ${bookmarkLabel} bookmark`} theme={theme}>
        <button type="button" onClick={onNavigate} style={overviewGroupHeaderButtonStyle(theme)}>
          {label}
          <span aria-hidden="true" style={{ fontFamily: "var(--font-body)", fontSize: 17, fontWeight: 700, lineHeight: 1 }}>›</span>
        </button>
      </HoverTooltip>
      {toolHref && (
        <HoverTooltip label={`Open in ${toolLabel ?? label}`} theme={theme}>
          <Link href={toolHref} aria-label={`Open in ${toolLabel ?? label}`} style={overviewToolLinkStyle(theme)}>
            <OverviewToolLinkIcon />
          </Link>
        </HoverTooltip>
      )}
    </div>
  );
}

function overviewSubLabelStyle(theme: Theme): CSSProperties {
  return { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted, marginBottom: 8 };
}

// classData.requiredStats always holds the raw main stats followed by attackPower or magicAtt.
// Most classes have 2 raw stats, Warrior being str and dex, but Dual Blade, Shadower, Cadena
// and Xenon are genuinely tri-stat, so indices cannot be hardcoded. Filtering by isRawStatId
// picks out however many raw stats a class has and excludes the trailing attack entry, which
// is handled separately. Uses tripleStatTotal for the same Applied Value total the Stats
// bookmark shows rather than a base-only number.
const RAW_STAT_LABELS = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "HP" } as const;
type RawStatId = keyof typeof RAW_STAT_LABELS;

function isRawStatId(id: string): id is RawStatId {
  return id in RAW_STAT_LABELS;
}

function rawStatDisplay(s: StoredCharacterStats | undefined, familiarBonus: ReturnType<typeof familiarStatBonuses>, id: RawStatId): { label: string; value: string } {
  return { label: RAW_STAT_LABELS[id], value: tripleStatTotal(s?.[id], familiarBonus[id]) };
}

// Per classSkillData.ts's top-of-file convention, an unpopulated requiredStats, as with
// Noblesse, legacy's unbranched "Pirate" stub or an unresolved classId, means the stats this
// class uses are unknown. The UI then falls back to showing every main stat rather than a
// single blank placeholder. HP is excluded as Demon Avenger's special case, already assigned
// correctly and never a fallback candidate.
const ALL_MAIN_STAT_IDS: RawStatId[] = ["str", "dex", "int", "luk"];

// The most-glanced-at stats: every main stat total the class uses, plus the 3 big
// damage-multiplier percentages. Shown regardless of HEXA eligibility, since unlike the
// sections below these do not depend on 6th job. Deliberately not a link to the Stats bookmark
// like the other Overview sections, because these numbers are the kind someone drag-selects
// and pastes elsewhere, and wrapping them in a button would fire navigation on that click.
function OverviewKeyStatsSection({ theme, character, classData }: {
  theme: Theme; character: StoredCharacterRecord | null; classData: ClassSkillData | undefined;
}) {
  const s = character?.stats;
  const familiarBonus = familiarStatBonuses(character?.familiars);
  const rawStatIds = (classData?.requiredStats ?? []).filter(isRawStatId);
  const effectiveStatIds = rawStatIds.length > 0 ? rawStatIds : ALL_MAIN_STAT_IDS;
  const statCells = effectiveStatIds.map((id) => rawStatDisplay(s, familiarBonus, id));
  const cells = [
    ...statCells,
    { label: STAT_LABELS.bossDamage ?? "Boss Damage", value: pctStat(s?.bossDamage, "bossDamage") },
    { label: STAT_LABELS.ignoreDefense ?? "Ignore DEF", value: pctStat(s?.ignoreDefense, "ignoreDefense") },
    { label: STAT_LABELS.criticalDamage ?? "Critical Damage", value: pctStat(s?.criticalDamage, "criticalDamage") },
  ];
  return (
    <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
      {cells.map((c) => (
        <div key={c.label}>
          <div style={{ fontSize: 12, color: theme.muted, marginBottom: 2 }}>{c.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.value !== "—" ? theme.text : theme.muted }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// The same node tabs and Main/Alt stat readout as HexaStatBookmarkView, flattened without the
// StatBlock panel or preset toggle to match the plainer 6th job section look. Always reads the
// node's own activePreset rather than letting the user switch, since Overview is a glance
// rather than an editor.
function OverviewHexaStatSection({ theme, character, classData, hexaStatNodes, onNavigateToBookmark }: {
  theme: Theme; character: StoredCharacterRecord | null; classData: ClassSkillData | undefined; hexaStatNodes: HexaStatNode[] | null;
  onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const level = character?.level ?? 0;
  const unlocked = HEXA_STAT_UNLOCK_LEVELS.map((min) => level >= min);
  const nodes = HEXA_STAT_NODE_LABELS.map((_, i) => hexaStatNodes?.[i] ?? emptyHexaStatNode());
  const [activeSlot, setActiveSlot] = useState(0);
  const activeNode = nodes[activeSlot];
  const slot = activeNode.presets[activeNode.activePreset];
  const primaryStat = classData?.requiredStats[0] ?? "";
  const mainStatLabel = getMainStatLabel(classData?.id ?? "", primaryStat);
  const attackLabel = getAttackLabel(primaryStat);

  return (
    <div>
      <OverviewGroupHeader label="HEXA Stat" theme={theme} onNavigate={() => onNavigateToBookmark("hexa_matrix", "stat")} bookmarkLabel="HEXA" />
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: 14 }}>
        {HEXA_STAT_NODE_LABELS.map((label, i) => unlocked[i] && (
          <button key={label} type="button" className="tap-target-44" onClick={() => setActiveSlot(i)}
            aria-label={label} aria-pressed={activeSlot === i} style={hexaStatNodeTabStyle(theme, activeSlot === i)}>
            <HexaStatNodeIcon id={HEXA_STAT_NODE_ICON_IDS[i]} slot={i + 1} theme={theme} size={36} disabled={isHexaStatNodeEmpty(nodes[i])} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={overviewSubLabelStyle(theme)}>Main Stat</div>
          <HexaStatLine entry={slot.main} isPrimary={true} classId={classData?.id} mainStatLabel={mainStatLabel} attackLabel={attackLabel} theme={theme} />
        </div>
        <div>
          <div style={overviewSubLabelStyle(theme)}>Alternative Stats</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <HexaStatLine entry={slot.alt[0]} isPrimary={false} classId={classData?.id} mainStatLabel={mainStatLabel} attackLabel={attackLabel} theme={theme} />
            <HexaStatLine entry={slot.alt[1]} isPrimary={false} classId={classData?.id} mainStatLabel={mainStatLabel} attackLabel={attackLabel} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Smaller than ReadOnlyLeveledIconTile's 68px, since the level renders as a badge over the
// icon rather than a text row beneath it, making a group of tiles roughly half the height.
// Shared by the HEXA and V Matrix sections below, each supplying its own icon, as both are the
// same read-only glance shape.
const OVERVIEW_TILE_SIZE = 48;

// Static, with no theme or prop dependency: a fixed dark scrim and white text in every theme,
// so the level number stays readable over any icon art where a theme token would not.
const overviewLevelBadgeStyle: CSSProperties = {
  position: "absolute", left: 2, right: 2, bottom: 2, textAlign: "center",
  fontSize: 12, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.6)", borderRadius: 4, lineHeight: 1.5,
};

function OverviewLevelTile({ icon, name, level, theme }: { icon: ReactNode; name: string; level: number; theme: Theme }) {
  const active = level > 0;
  return (
    <HoverTooltip label={name} theme={theme}>
      <div style={{
        position: "relative", width: OVERVIEW_TILE_SIZE, height: OVERVIEW_TILE_SIZE, flexShrink: 0,
        borderRadius: 8, border: `1px solid ${active ? theme.accent : theme.border}`, background: theme.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: active ? 1 : 0.35, filter: active ? "none" : "grayscale(1)",
      }}>
        {icon}
        {active && <div style={overviewLevelBadgeStyle}>{level}</div>}
      </div>
    </HoverTooltip>
  );
}

function OverviewHexaTile({ skill, level, theme }: { skill: HexaSkillDef; level: number; theme: Theme }) {
  return (
    <OverviewLevelTile
      icon={<HexaSkillTileIcon iconId={skill.iconId} iconUrl={skill.iconUrl} name={skill.name} theme={theme} size={OVERVIEW_TILE_SIZE - 10} />}
      name={skill.name}
      level={level}
      theme={theme}
    />
  );
}

function OverviewHexaTileGroup({ label, skills, levels, theme }: {
  label: string; skills: HexaSkillDef[]; levels: number[]; theme: Theme;
}) {
  if (skills.length === 0) return null;
  return (
    <div>
      <div style={overviewSubLabelStyle(theme)}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {skills.map((skill, i) => (
          <OverviewHexaTile key={skill.name} skill={skill} level={levels[i] ?? 0} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function OverviewVMatrixTile({ id, name, level, theme }: { id: string; name: string; level: number; theme: Theme }) {
  return (
    <OverviewLevelTile
      icon={<VMatrixNodeIcon id={id} name={name} theme={theme} size={OVERVIEW_TILE_SIZE - 10} />}
      name={name}
      level={level}
      theme={theme}
    />
  );
}

function OverviewVMatrixTileGroup({ label, nodes, levels, theme }: {
  label: string; nodes: VMatrixNode[]; levels: Record<string, number>; theme: Theme;
}) {
  if (nodes.length === 0) return null;
  return (
    <div>
      <div style={overviewSubLabelStyle(theme)}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {nodes.map(([id, name]) => (
          <OverviewVMatrixTile key={name} id={id} name={name} level={levels[name] ?? 0} theme={theme} />
        ))}
      </div>
    </div>
  );
}

// The middle gating tier: level 200-259 non-legacy characters have real V Matrix data (unlike
// under-200/legacy, which have nothing here) but aren't 260 yet, so this fills the same slot
// OverviewHexaStatSection/OverviewHexaSkillsSection occupy for a 260+ character, instead of
// showing a blank "Not Available" notice for a whole 60-level range that has real data.
function OverviewVMatrixSection({ theme, character, onNavigateToBookmark }: {
  theme: Theme; character: StoredCharacterRecord | null; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const classId = character ? getClassDataByNexonJobName(character.jobName)?.id : undefined;
  const { catalog, loadFailed } = useVMatrixCatalog(classId);
  const levels = character?.vMatrix?.levels ?? {};

  if (!classId || loadFailed) {
    return <GatedFeatureNotice theme={theme} title="Not Available" description="Not available for this class." />;
  }
  if (!catalog) return null;

  return (
    <div>
      <OverviewGroupHeader label="V Matrix" theme={theme} onNavigate={() => onNavigateToBookmark("v_matrix")} bookmarkLabel="V Matrix" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <OverviewVMatrixTileGroup label="Job" nodes={catalog.job} levels={levels} theme={theme} />
        <OverviewVMatrixTileGroup label="Boost" nodes={catalog.boost} levels={levels} theme={theme} />
        <OverviewVMatrixTileGroup label="Common" nodes={catalog.common} levels={levels} theme={theme} />
      </div>
    </div>
  );
}

// Arcane unlocks at Lv 200, the same as V Matrix, and stays relevant past 260 since Sacred
// layers on top rather than replacing it. So this shows alongside whichever V Matrix or HEXA
// section applies instead of being swapped between tiers the way those are.
//
// An Arcane area the character has not reached yet, such as Chu Chu Island with its higher
// per-zone requiredLevel, shows as a dimmed 0-level tile, the same treatment the HEXA and V
// Matrix tiles give an unleveled node. Unlike those, the tooltip also names the unlock level,
// since a fresh Lv 200 player has no other way to learn a locked area exists or when they
// will get it.
function OverviewSymbolTile({ area, level, locked, theme }: { area: SymbolArea; level: number; locked: boolean; theme: Theme }) {
  const name = locked ? `${area.name} (unlocks at Lv. ${area.requiredLevel})` : area.name;
  return <OverviewLevelTile icon={<ItemIcon id={area.itemId} size={OVERVIEW_TILE_SIZE - 10} />} name={name} level={level} theme={theme} />;
}

// A row of tiles for one symbol group, Arcane, Sacred or Grand Sacred. Extracted so
// OverviewSymbolSection can stack several groups once Sacred unlocks at 260, the same layering
// the Equipment bookmark's SymbolAreaGroup already does for this data.
function OverviewSymbolAreaRow({ areas, symbolLevels, characterLevel, theme }: {
  areas: SymbolArea[]; symbolLevels: Record<string, SymbolState> | null; characterLevel: number | undefined; theme: Theme;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {areas.map((area) => {
        const locked = characterLevel !== undefined && characterLevel < area.requiredLevel;
        return <OverviewSymbolTile key={area.name} area={area} level={symbolAreaLevel(symbolLevels, area)} locked={locked} theme={theme} />;
      })}
    </div>
  );
}

// Sacred layers on top of Arcane rather than replacing it. Per the "Level / legacy gating"
// table in the characters CLAUDE.md, Arcane unlocks at 200 and Sacred at 260, both excluded
// for legacy classes. So this section grows a second tile row, and a third for Grand Sacred,
// as a character reaches those points, instead of swapping Arcane out.
function OverviewSymbolSection({ theme, symbolLevels, characterLevel, isLegacy, charName, onNavigateToBookmark }: {
  theme: Theme; symbolLevels: Record<string, SymbolState> | null; characterLevel: number | undefined; isLegacy: boolean | undefined; charName: string | undefined;
  onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const showSacred = isSacredEligible(characterLevel, isLegacy);
  return (
    <div>
      <OverviewGroupHeader
        label="Symbols"
        theme={theme}
        onNavigate={() => onNavigateToBookmark("equipment", "titles")}
        bookmarkLabel="Gear"
        toolHref={overviewToolHref("/tools/symbols", charName)}
        toolLabel="Symbol Tracker"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <OverviewSymbolAreaRow areas={ARCANE_AREAS} symbolLevels={symbolLevels} characterLevel={characterLevel} theme={theme} />
        {showSacred && (
          <>
            <OverviewSymbolAreaRow areas={SACRED_AREAS} symbolLevels={symbolLevels} characterLevel={characterLevel} theme={theme} />
            <OverviewSymbolAreaRow areas={GRAND_SACRED_AREAS} symbolLevels={symbolLevels} characterLevel={characterLevel} theme={theme} />
          </>
        )}
      </div>
    </div>
  );
}

// Skill and Common on the left, Mastery and Boost on the right with a vertical divider
// between. More compact than a flat chip row, and it keeps Skill and Mastery paired with their
// own Common and Boost rather than putting all four in one undifferentiated grid. HEXA Stat
// has its own section in OverviewHexaStatSection rather than being squeezed in here.
function OverviewHexaSkillsSection({ theme, hexaClassDef, hexaLevels, charName, onNavigateToBookmark }: {
  theme: Theme; hexaClassDef: ReturnType<typeof resolveHexaClassDef>; hexaLevels: HexaSkillLevels; charName: string | undefined;
  onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const skillNodes: HexaSkillDef[] = [hexaClassDef?.origin, hexaClassDef?.ascent].filter((s): s is HexaSkillDef => Boolean(s));
  const skillLevels = [hexaLevels.origin ?? 0, hexaLevels.ascent ?? 0];
  const masteryNodes = (hexaClassDef?.mastery ?? []).map(hexaMasteryNodeToSkillDef);
  const boostNodes = hexaClassDef?.enhancement ?? [];

  return (
    <div>
      <OverviewGroupHeader
        label="HEXA Skills"
        theme={theme}
        onNavigate={() => onNavigateToBookmark("hexa_matrix", "skills")}
        bookmarkLabel="HEXA"
        toolHref={overviewToolHref("/tools/hexa-skills", charName)}
        toolLabel="HEXA Skill Tracker"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1.2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <OverviewHexaTileGroup label="Skill" skills={skillNodes} levels={skillLevels} theme={theme} />
          <OverviewHexaTileGroup label="Common" skills={commonSkillsFor(hexaClassDef?.className ?? null)} levels={hexaLevels.common ?? []} theme={theme} />
        </div>
        <div style={{ width: 1, background: theme.border }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <OverviewHexaTileGroup label="Mastery" skills={masteryNodes} levels={hexaLevels.mastery ?? []} theme={theme} />
          <OverviewHexaTileGroup label="Boost" skills={boostNodes} levels={hexaLevels.enhancement ?? []} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// A legacy character never has V Matrix, HEXA or Arcane, so gear is effectively their whole
// build. Shows the entire grid, armor and accessories, rather than the curated 7-piece armor
// set tried first. Weapon, Secondary and Emblem have their own row up top, so
// CENTER_BOTTOM_SLOTS is not repeated here.
function OverviewGearSection({ theme, equipGrid, onNavigateToBookmark }: {
  theme: Theme; equipGrid: SlotMap; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  return (
    <div>
      <OverviewGroupHeader label="Gear" theme={theme} onNavigate={() => onNavigateToBookmark("equipment", "gear")} bookmarkLabel="Gear" />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={overviewSubLabelStyle(theme)}>Armor</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[...COL6_SLOTS, ...COL7_SLOTS].map((slotKey) => (
              <ReadOnlySlotTile key={slotKey} slotKey={slotKey} item={equipGrid[slotKey]} theme={theme} />
            ))}
          </div>
        </div>
        <div>
          <div style={overviewSubLabelStyle(theme)}>Accessories</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[...COL1_SLOTS, ...COL2_SLOTS].map((slotKey) => (
              <ReadOnlySlotTile key={slotKey} slotKey={slotKey} item={equipGrid[slotKey]} theme={theme} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Bigger than the shared OVERVIEW_TILE_SIZE. With only 3 tiles in this row, against the much
// longer HEXA and V Matrix node lists, there is width to spare, and 48px left this section
// looking sparser than the rest of the panel.
const OVERVIEW_FAMILIAR_TILE_SIZE = 96;

// There is no numeric level to overlay, since a familiar's tier is not a 1 to 30 progress
// number the way HEXA and V Matrix nodes are, so the tier shows as the tile's border color
// instead, using the same FAMILIAR_TIER_COLORS as the Familiars bookmark's card border.
function OverviewFamiliarTile({ slot, theme }: { slot: StoredFamiliarSlot; theme: Theme }) {
  const filled = Boolean(slot.name);
  const matchedEntry = FAMILIARS.find((f) => f.id === slot.familiarId);
  const cardId = matchedEntry?.cardId ?? "";
  const spriteMobId = matchedEntry?.spriteMobId ?? slot.mobId;
  const tier = filled && slot.tier in FAMILIAR_TIER_COLORS ? (slot.tier as FamiliarTier) : null;
  const displayName = slot.name.replace(/ Familiar$/i, "");
  const familiarLines = [slot.line1, slot.line2].filter(Boolean);
  // The name gets its own bolder row with the lines dimmed below. Otherwise all 3 rows read at
  // the same weight, since hover-tip-bubble's styling applies uniformly to a plain string and
  // cannot distinguish the title from the stats under it.
  const tooltipLabel = filled ? (
    <>
      <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>{displayName}</div>
      {familiarLines.length > 0 && (
        <div style={{ fontWeight: 500, opacity: 0.7, marginTop: 2 }}>
          {familiarLines.map((line) => <div key={line}>{line}</div>)}
        </div>
      )}
    </>
  ) : "Empty";
  return (
    <HoverTooltip label={tooltipLabel} theme={theme}>
      <div style={{
        width: OVERVIEW_FAMILIAR_TILE_SIZE, height: OVERVIEW_FAMILIAR_TILE_SIZE, flexShrink: 0,
        borderRadius: 8, border: `1px solid ${tier ? FAMILIAR_TIER_COLORS[tier].border : theme.border}`, background: theme.bg,
        display: "flex", alignItems: "center", justifyContent: "center", opacity: filled ? 1 : 0.4,
      }}>
        {filled ? (
          <FamiliarCardSprite mobId={spriteMobId} familiarId={slot.familiarId} cardId={cardId} name={displayName} size={OVERVIEW_FAMILIAR_TILE_SIZE - 16} theme={theme} />
        ) : (
          <span style={{ fontSize: 12, fontWeight: 800, color: theme.muted }}>?</span>
        )}
      </div>
    </HoverTooltip>
  );
}

function OverviewFamiliarsSection({ theme, character, onNavigateToBookmark }: {
  theme: Theme; character: StoredCharacterRecord | null; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const data = character?.familiars;
  const preset = data?.presets?.[data.activePreset];
  const familiars = preset?.familiars ?? EMPTY_FAMILIAR_SLOTS;
  return (
    <div>
      <OverviewGroupHeader label="Familiars" theme={theme} onNavigate={() => onNavigateToBookmark("familiars")} bookmarkLabel="Familiars" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {familiars.map((slot, i) => (
          // react-doctor-disable-next-line no-array-index-as-key
          <OverviewFamiliarTile key={i} slot={slot} theme={theme} />
        ))}
      </div>
    </div>
  );
}

// The same AbilityGradeChip and IALineChip as AbilityView, but always reads the character's
// activePreset rather than offering a tab switcher, on the same glance-not-editor reasoning as
// OverviewHexaStatSection.
function OverviewInnerAbilitySection({ theme, innerAbility, onNavigateToBookmark }: {
  theme: Theme; innerAbility: StoredInnerAbility | undefined; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const preset = innerAbility?.presets?.[innerAbility?.activePreset ?? 0];
  const grade = preset?.lines?.[0]?.tier ?? "";
  return (
    <div>
      <OverviewGroupHeader label="Inner Ability" theme={theme} onNavigate={() => onNavigateToBookmark("stats", "ability")} bookmarkLabel="Stats" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 360 }}>
        <AbilityGradeChip grade={grade} theme={theme} />
        {[0, 1, 2].map((i) => (
          <IALineChip key={i} line={preset?.lines?.[i] ?? { tier: "", value: "" }} grade={grade} theme={theme} />
        ))}
      </div>
    </div>
  );
}

// A fixed 7-day window with no range picker, since Overview is a glance rather than the EXP
// bookmark's interactive chart. `windowExpHistory` and `ExpGainBarChart` are defined further
// down alongside the ExpBookmark they were built for; both are plain function declarations, so
// hoisting makes the reference here safe.
function OverviewExpBarSection({ theme, character, onNavigateToBookmark }: {
  theme: Theme; character: StoredCharacterRecord | null; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const expWindow = windowExpHistory(character?.expHistory ?? [], 7);
  return (
    <div>
      <OverviewGroupHeader label="Daily EXP" theme={theme} onNavigate={() => onNavigateToBookmark("exp")} bookmarkLabel="EXP" />
      {expWindow.entries.length >= 2 ? (
        <ExpGainBarChart theme={theme} entries={expWindow.entries} anchor={expWindow.anchor} />
      ) : (
        <p style={{ margin: 0, fontSize: "0.78rem", color: theme.muted }}>Not enough data yet.</p>
      )}
    </div>
  );
}

function OverviewExpLevelSection({ theme, character, onNavigateToBookmark }: {
  theme: Theme; character: StoredCharacterRecord | null; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}) {
  const expWindow = windowExpHistory(character?.expHistory ?? [], 7);
  return (
    <div>
      <OverviewGroupHeader label="Level Progress" theme={theme} onNavigate={() => onNavigateToBookmark("exp")} bookmarkLabel="EXP" />
      {expWindow.entries.length >= 2 ? (
        <ExpChart theme={theme} entries={expWindow.entries} anchor={expWindow.anchor} />
      ) : (
        <p style={{ margin: 0, fontSize: "0.78rem", color: theme.muted }}>Not enough data yet.</p>
      )}
    </div>
  );
}

// Canonical catalog of every customizable Overview section, in the default browse order
// CustomizeOverviewDialog shows. Excludes Key Stats and the Scouter figure and WSE row, which
// stay fixed chrome at the top of OverviewBookmark, since Key Stats makes sense for every
// layout regardless of tier, as do those two. `isLarge` flags the sections whose tile grids
// can wrap across a lot of content, meaning Gear's full armor and accessory grid and V
// Matrix's node lists. Everything else renders as a roughly fixed-size block.
const OVERVIEW_SECTION_DEFS: { id: OverviewSectionId; label: string; isLarge: boolean }[] = [
  { id: "arcaneSymbols", label: "Symbols", isLarge: false },
  { id: "hexaStat", label: "HEXA Stat", isLarge: false },
  { id: "hexaSkills", label: "HEXA Skills", isLarge: false },
  { id: "vMatrix", label: "V Matrix", isLarge: true },
  { id: "gear", label: "Gear", isLarge: true },
  { id: "familiars", label: "Familiars", isLarge: false },
  { id: "innerAbility", label: "Inner Ability", isLarge: false },
  { id: "expBar", label: "Daily EXP", isLarge: false },
  { id: "expLevel", label: "Level Progress", isLarge: false },
];

// Curated bundles for the two large sections, Gear and V Matrix, being the only combinations
// vetted to fit alongside one. CustomizeOverviewDialog offers these as one-click anchors
// rather than letting either combine freely with arbitrary add-ons.
const OVERVIEW_ANCHORS: OverviewAnchorDef[] = [
  { id: "hexa", label: "HEXA (Stat + Skills)", sections: ["hexaStat", "hexaSkills"] },
  { id: "vmatrix_arcane", label: "V Matrix + Symbols", sections: ["vMatrix", "arcaneSymbols"] },
  { id: "gear_arcane", label: "Gear + Symbols", sections: ["gear", "arcaneSymbols"] },
  { id: "vmatrix_alone", label: "V Matrix", sections: ["vMatrix"] },
  { id: "gear_alone", label: "Gear", sections: ["gear"] },
];

// Overview is a quick-glance summary rather than a full profile, so capping how many add-ons
// sit on top of an anchor, or stand alone without one, keeps it compact.
const MAX_OVERVIEW_ADDONS = 2;

// Eligibility asks whether the character has the data at all, which is separate from whether a
// section shows by default. See the "Level / legacy gating" table in the characters CLAUDE.md.
// Customization chooses among eligible sections and can never force one the character does not
// qualify for.
function isOverviewSectionEligible(
  id: OverviewSectionId,
  character: StoredCharacterRecord | null,
  classData: ClassSkillData | undefined,
  hasHexa: boolean,
  hasVMatrix: boolean,
): boolean {
  switch (id) {
    case "gear":
    case "familiars":
    case "innerAbility":
      return true;
    case "arcaneSymbols":
      return isArcaneEligible(character?.level, classData?.isLegacy);
    case "hexaStat":
    case "hexaSkills":
      return hasHexa;
    case "vMatrix":
      return hasVMatrix;
    case "expBar":
    case "expLevel":
      return character ? isExpTrackingAvailable(character.level) : false;
  }
}

// The tier defaults from the pre-customization design, used whenever a character has no saved
// overviewLayout. Key Stats is no longer in this list, being fixed chrome. Each of these
// matches one of the OVERVIEW_ANCHORS below, or for the sub-200 tier a plain two-add-on combo
// with no anchor, so CustomizeOverviewDialog can pre-select the right anchor when it opens.
function defaultOverviewSections(hasHexa: boolean, hasVMatrix: boolean, legacy: boolean): OverviewSectionId[] {
  if (hasHexa) return ["hexaStat", "hexaSkills"];
  if (hasVMatrix) return ["arcaneSymbols", "vMatrix"];
  if (legacy) return ["gear"];
  return ["familiars", "innerAbility"];
}

function CustomizeLayoutIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

interface OverviewSectionRenderCtx {
  theme: Theme;
  character: StoredCharacterRecord | null;
  classData: ClassSkillData | undefined;
  hexaClassDef: ReturnType<typeof resolveHexaClassDef>;
  hexaLevels: HexaSkillLevels | null;
  hexaStatNodes: HexaStatNode[] | null;
  symbolLevels: Record<string, SymbolState> | null;
  charName: string | undefined;
  draftEquipGrid: SlotMap;
  onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
}

function renderOverviewSection(id: OverviewSectionId, ctx: OverviewSectionRenderCtx): ReactNode {
  const { theme, character, classData, hexaClassDef, hexaLevels, hexaStatNodes, symbolLevels, charName, draftEquipGrid, onNavigateToBookmark } = ctx;
  switch (id) {
    case "arcaneSymbols":
      return (
        <OverviewSymbolSection
          theme={theme}
          symbolLevels={symbolLevels}
          characterLevel={character?.level}
          isLegacy={classData?.isLegacy}
          charName={charName}
          onNavigateToBookmark={onNavigateToBookmark}
        />
      );
    case "hexaStat":
      return <OverviewHexaStatSection theme={theme} character={character} classData={classData} hexaStatNodes={hexaStatNodes} onNavigateToBookmark={onNavigateToBookmark} />;
    case "hexaSkills":
      return <OverviewHexaSkillsSection theme={theme} hexaClassDef={hexaClassDef} hexaLevels={hexaLevels ?? EMPTY_HEXA_LEVELS} charName={charName} onNavigateToBookmark={onNavigateToBookmark} />;
    case "vMatrix":
      return <OverviewVMatrixSection theme={theme} character={character} onNavigateToBookmark={onNavigateToBookmark} />;
    case "gear":
      return <OverviewGearSection theme={theme} equipGrid={draftEquipGrid} onNavigateToBookmark={onNavigateToBookmark} />;
    case "familiars":
      return <OverviewFamiliarsSection theme={theme} character={character} onNavigateToBookmark={onNavigateToBookmark} />;
    case "innerAbility":
      return <OverviewInnerAbilitySection theme={theme} innerAbility={character?.stats?.innerAbility} onNavigateToBookmark={onNavigateToBookmark} />;
    case "expBar":
      return <OverviewExpBarSection theme={theme} character={character} onNavigateToBookmark={onNavigateToBookmark} />;
    case "expLevel":
      return <OverviewExpLevelSection theme={theme} character={character} onNavigateToBookmark={onNavigateToBookmark} />;
  }
}

function OverviewBookmark({ model, onNavigateToBookmark, onNavigateToGearSlot, onSetOverviewLayout, scouterSimulator }: {
  model: PreviewPaneModel; onNavigateToBookmark: (id: BookmarkId, subView?: string) => void; onNavigateToGearSlot: (slotKey: SlotKey) => void; onSetOverviewLayout: (layout: OverviewSectionId[] | null) => void;
  scouterSimulator: ScouterSimulatorController;
}) {
  const { theme, profile } = model;
  const character = profile.confirmedCharacter;
  const equip = character?.equipment;
  const equipGrid = equip?.presets?.[equip.activePreset] ?? equip?.presets?.[0];

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const hexaClassDef = resolveHexaClassDef(classId);

  const mounted = useMounted();
  const charName = character?.characterName;
  const [customizing, setCustomizing] = useState(false);
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
  const symbolLevels = useMemo(() => {
    if (!mounted) return null;
    const fromState = (character?.tools?.symbols as { symbols?: Record<string, SymbolState> } | undefined)?.symbols;
    if (fromState) return fromState;
    return readSymbolLevels(charName);
  // react-doctor-disable-next-line exhaustive-deps -- same narrowed-dependency reasoning as hexaLevels above
  }, [mounted, charName, character?.tools]);

  // Three tiers, mirroring the gating table in the characters CLAUDE.md. Non-legacy 260 and
  // up gets HEXA as the endgame default. Non-legacy 200 to 259 has real V Matrix data worth
  // showing instead of a blank notice. The bottom tier splits again by legacy.
  //
  // A legacy character's gear grid is its whole build, with no V Matrix, HEXA or Arcane ever,
  // and a second legendary Inner Ability line is rare enough on legacy classes not to earn a
  // default slot. A non-legacy character below 200 is still leveling, so Familiars, which has
  // no level gate and is commonly touched well before 200, plus Inner Ability read as more in
  // progress than static gear. Hyper Stat was considered here but has its own gate at 140,
  // which would put gated content in the gated tier's default.
  //
  // These tiers are only the default. A saved `overviewLayout` overrides them entirely (see
  // CustomizeOverviewDialog), still filtered against eligibility below in case saved data and
  // current eligibility disagree, as with stale localStorage.
  const hasHexa = isHexaMatrixAvailable(character);
  const hasVMatrix = isVMatrixAvailable(character);
  const legacy = character ? isLegacyClass(character.jobName) : false;
  const draftEquipGrid: SlotMap = equipGrid ? storedPresetToDraft(equipGrid) : {};

  const effectiveSections = (character?.overviewLayout ?? defaultOverviewSections(hasHexa, hasVMatrix, legacy))
    .filter((id) => isOverviewSectionEligible(id, character, classData, hasHexa, hasVMatrix));
  const eligibleSections = OVERVIEW_SECTION_DEFS.filter(({ id }) => isOverviewSectionEligible(id, character, classData, hasHexa, hasVMatrix));
  const eligibleAnchors = OVERVIEW_ANCHORS.filter((a) => a.sections.every((id) => isOverviewSectionEligible(id, character, classData, hasHexa, hasVMatrix)));
  const renderCtx: OverviewSectionRenderCtx = { theme, character, classData, hexaClassDef, hexaLevels, hexaStatNodes, symbolLevels, charName, draftEquipGrid, onNavigateToBookmark };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>Overview</h3>
        <HoverTooltip label="Customize Layout" theme={theme}>
          <button
            type="button"
            aria-label="Customize Layout"
            onClick={() => setCustomizing(true)}
            style={pencilButtonStyle(theme)}
          >
            <CustomizeLayoutIcon />
          </button>
        </HoverTooltip>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        {mounted && character
          ? <ScouterFigure character={character} theme={theme} simulator={scouterSimulator} />
          : <OverviewFigure label="Scouter" value="—" theme={theme} />}
        <div style={{ display: "flex", gap: 6 }}>
          <WseSlot label="Weapon" item={equipGrid?.weapon} theme={theme} onNavigate={() => onNavigateToGearSlot("weapon")} />
          <WseSlot label="Secondary" item={equipGrid?.secondary} theme={theme} onNavigate={() => onNavigateToGearSlot("secondary")} />
          <WseSlot label="Emblem" item={equipGrid?.emblem} theme={theme} onNavigate={() => onNavigateToGearSlot("emblem")} />
        </div>
      </div>

      <OverviewKeyStatsSection theme={theme} character={character} classData={classData} />

      {effectiveSections.map((id) => <Fragment key={id}>{renderOverviewSection(id, renderCtx)}</Fragment>)}

      {customizing && (
        <CustomizeOverviewDialog
          theme={theme}
          eligibleSections={eligibleSections}
          anchors={eligibleAnchors}
          maxAddons={MAX_OVERVIEW_ADDONS}
          current={effectiveSections}
          canReset={character?.overviewLayout != null}
          onClose={() => setCustomizing(false)}
          onSave={(next) => {
            onSetOverviewLayout(next);
            setCustomizing(false);
          }}
          onReset={() => {
            onSetOverviewLayout(null);
            setCustomizing(false);
          }}
        />
      )}
    </div>
  );
}

function GenderIcon({ gender }: { gender: "male" | "female" }) {
  if (gender === "male") {
    return (
      <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="15" r="6" />
        <path d="M13.5 10.5L20 4M14 4h6v6" />
      </svg>
    );
  }
  return (
    <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v6M9 18h6" />
    </svg>
  );
}

function MarriageIcon({ married }: { married: boolean }) {
  return (
    <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="9" cy="14" r="5" opacity={married ? 1 : 0.4} />
      <circle cx="15" cy="14" r="5" opacity={married ? 1 : 0.4} />
    </svg>
  );
}

const RAW_VALUE_STAT_LABELS = new Set(["arcanePower", "sacredPower"]);
// Mirrors NO_DECIMAL_STAT_IDS in StatsSetupStep.tsx. These 3 combat stats are always whole
// numbers in game, unlike Boss Damage, Crit Damage and Ignore DEF, which commonly carry 2
// decimal places. Without this, display consistency depends on whether the player typed
// trailing zeros during setup, giving "82" or "82.00" for the same in-game value.
const NO_DECIMAL_STAT_LABELS = new Set(["summonDuration", "buffDuration", "criticalRate"]);

function pctStat(raw: string | undefined, id: string): string {
  if (!raw) return "—";
  if (RAW_VALUE_STAT_LABELS.has(id)) return raw;
  if (NO_DECIMAL_STAT_LABELS.has(id)) return `${raw}%`;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? `${numeric.toFixed(2)}%` : `${raw}%`;
}

// MapleStory's final-stat formula:
// floor(Base Value × (1 + % Value / 100)) + % Value Not Applied. The 3 inputs are what the
// Character Info window's Applied Value breakdown shows per stat, except that window never
// itemizes familiar stat lines. See familiarStatBonuses in familiarsData.ts.
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

// computeDamageRange returns undefined for legacy classes, Zero and Demon Avenger's unhandled
// sub-cases, and a character missing stats, all shown the same way as any unavailable cell.
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

// `minmax(0, 1fr)` rather than a bare `1fr`, which refuses to shrink below its content's
// natural width. A long SummaryRow label and value pair could then force this grid, and
// everything clipped inside `.profile-binder`'s overflow, wider than the available space.
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

// KaTeX's displaystyle metrics, meaning fraction stacking and floor brackets, run large even at
// a small container font-size, and the tooltip is only about 240px wide. Inline mode
// (`displayMode: false`) uses KaTeX's more compact textstyle sizing, and the small fontSize
// here shrinks it further to fit.
const formulaHtmlStyle: CSSProperties = { overflowX: "auto", padding: "0.2rem 0", fontSize: "0.75rem" };

// Renders a LaTeX string to static HTML via KaTeX at module load. A pure function of the tex
// string with no DOM or layout dependency, so it is safe to call outside a component.
function formulaHtml(tex: string): string {
  return katex.renderToString(tex, { throwOnError: false, displayMode: false });
}

function Formula({ tex }: { tex: string }) {
  return <div style={formulaHtmlStyle} dangerouslySetInnerHTML={{ __html: formulaHtml(tex) }} />;
}

// Split across 2 Formula blocks, each its own div so they stack naturally, rather than one
// long inline string. At tooltip width, letting it wrap on its own broke mid-formula right
// after the plus sign, which read as accidental rather than a deliberate line break.
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
// Paladin's buff guide requires the higher-tier "Combat Orders" where every other class
// requires "Decent Combat Orders", so the label cannot be one static string. See
// resolveComboOrdersTier in comboOrdersData.ts.
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

// A legacy, pre-revamp class never gets Arcane or Sacred Power by leveling, since it would
// have to advance past the legacy job entirely, so its locked label cannot promise a level the
// way an under-leveled character's can. Mirrors the same legacy versus under-leveled
// distinction resolveHexaNotice makes for the HEXA panel below.
function lockedStatLabel(isLegacy: boolean | undefined, unlockLevel: number): string {
  return isLegacy ? "Not available for this class" : `Locked (Lv. ${unlockLevel}+)`;
}

// Arcane Power is also a Hyper Stat category, boosting Arcane Force gain, gated by the same
// eligibility as the Symbols section's Arcane Power stat. Setup filters the category out of
// the grid below that level, while the profile dims and labels it as the Symbols row does, so
// it does not read as eligible but unallocated.
function hyperStatCellDisplay(cat: HyperStatCategoryDef, presetValue: number | undefined, arcaneEligible: boolean, arcaneLockedLabel: string): { value: string; locked: boolean } {
  if (cat.id === "arcanePower" && !arcaneEligible) return { value: arcaneLockedLabel, locked: true };
  return { value: `Lv. ${presetValue ?? 0}`, locked: false };
}

function HyperStatView({
  theme, hyperStat, onSetActivePreset, eligible, arcaneEligible, arcaneLockedLabel, charName,
}: {
  theme: Theme; hyperStat: StoredHyperStat | undefined; onSetActivePreset: ((presetIndex: number) => void) | null; eligible: boolean; arcaneEligible: boolean; arcaneLockedLabel: string; charName: string | undefined;
}) {
  const activePreset = hyperStat?.activePreset ?? 0;
  const [presetIdx, setPresetIdx] = useState(activePreset);
  // Mirrors resolveHexaNotice's pattern for the HEXA panel below: a whole-panel lock message
  // rather than preset switching that would not make sense before unlock.
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
      <OptimizeToolLink theme={theme} charName={charName} mode={null} label="Optimize Hyper Stats" marginTop={16} />
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

  // The 3 views stack in one grid cell, all present with only one visible, so the row
  // auto-sizes to the tallest. `visibility: hidden` keeps each box for that sizing where
  // `display: none` would not, which is what stops the action bar below from jumping up when
  // a shorter view like Hyper Stat or Ability becomes active. The outer `flex: 1` fills
  // whatever height the panel's min-height reserves beyond this bookmark's content, and
  // `marginTop: auto` on the action bar's wrapper pins it to the panel's bottom edge rather
  // than leaving it under a shorter view's content.
  //
  // Mobile has no panel min-height to fill (see `.profile-binder`'s mobile override), so the
  // same trick would instead reserve the full Stats view's height behind a much shorter one.
  // `.bookmark-subview`'s mobile CSS switches the inactive panes to real `display: none`
  // there, so the grid sizes to whichever view is showing.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "grid" }}>
        <div className={`bookmark-subview${view === "stats" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "stats" ? "visible" : "hidden", display: "flex", flexDirection: "column", gap: 12 }}>
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
        <div className={`bookmark-subview${view === "hyperStat" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "hyperStat" ? "visible" : "hidden" }}>
          <HyperStatView
            key={character?.characterName}
            theme={theme}
            hyperStat={s?.hyperStat}
            eligible={isHyperStatEligible(character?.level)}
            arcaneEligible={showArcanePower}
            arcaneLockedLabel={arcaneLockedLabel}
            onSetActivePreset={(presetIndex) => onSetActivePreset("hyperStat", presetIndex)}
            charName={character?.characterName}
          />
        </div>
        <div className={`bookmark-subview${view === "ability" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "ability" ? "visible" : "hidden" }}>
          <AbilityView
            key={character?.characterName}
            theme={theme}
            innerAbility={s?.innerAbility}
            onSetActivePreset={(presetIndex) => onSetActivePreset("innerAbility", presetIndex)}
          />
        </div>
      </div>
      <div className="bookmark-page-nav" style={{ paddingTop: 14, marginTop: "auto" }}>
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

// Every area renders. An area the character has not reached shows as a locked tile, a dimmed
// icon with its unlock level, via ReadOnlySymbolTile's `locked` prop, rather than vanishing.
// This covers per-zone gaps inside an eligible tier, such as Chu Chu Island at 210 while
// Arcane-eligible from 200, the same way it covers a whole tier being out of reach, such as
// Grand Sacred at 290 while only Sacred-eligible. Hiding either would read as missing rather
// than not yet unlocked. Legacy is handled a level up in SymbolLevelsDisplay, so this runs
// only for non-legacy characters.
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
  // A legacy class can never advance to unlock any symbol type, so it gets one blanket message
  // with no tab switcher and no per-tier labels. There is nothing to switch between, and
  // showing the buttons would invite clicking through to the same message twice.
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
  theme, character, view, onViewChange, onSetActivePreset, highlightSlotKey, onHighlightSlotConsumed,
}: {
  theme: Theme; character: StoredCharacterRecord | null; view: EquipmentBookmarkView; onViewChange: (v: EquipmentBookmarkView) => void;
  onSetActivePreset: (presetIndex: number) => void;
  highlightSlotKey?: SlotKey | null;
  onHighlightSlotConsumed?: () => void;
}) {
  const equip = character?.equipment;
  const activePresetStored = equip?.activePreset ?? 0;
  const [presetIdx, setPresetIdx] = useState(activePresetStored);
  const [symbolTab, setSymbolTab] = useState<SymbolViewTab>("arcane");
  // Starts on the Weapon page when arriving to highlight a WSE slot, since Overview's Weapon,
  // Secondary and Emblem tiles all live in that page's CENTER_BOTTOM_SLOTS section. Otherwise
  // a mobile visitor lands on Accessories and the highlighted slot is never on screen.
  const [mobileGridPage, setMobileGridPage] = useState(() => (highlightSlotKey && CENTER_BOTTOM_SLOTS.includes(highlightSlotKey) ? 1 : 0));
  const gearGridRef = useRef<HTMLDivElement>(null);

  // One-shot scroll to and flash of the slot Overview linked to, the same jump-highlight pulse
  // the setup flow uses for a flagged or missing field (scrollToFlaggedField in
  // QuestionControls.tsx). Reused through the same CSS class rather than that helper, since
  // this targets one specific slot rather than the first flagged field.
  //
  // Mount-only. This component remounts whenever the profile switches into the Equipment
  // bookmark (BookmarkPageBody's key={active.id} above), so an empty deps array is the right
  // scope, and onHighlightSlotConsumed clears the parent's state immediately after, so
  // switching away and back does not replay it.
  // react-doctor-disable-next-line no-prop-callback-in-effect, no-pass-live-state-to-parent
  useEffect(() => {
    if (!highlightSlotKey) return;
    const target = gearGridRef.current?.querySelector<HTMLElement>(`[data-slot-key="${highlightSlotKey}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("jump-highlight");
      window.setTimeout(() => target.classList.remove("jump-highlight"), 1100);
    }
    onHighlightSlotConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only, see comment above
  }, []);
  // Titles and Pets stay mounted, toggled by visibility rather than conditionally rendered, so
  // the panel auto-sizes to the tallest of the 3 sub-views instead of jumping height on
  // switch. That would otherwise load every icon across every sub-view on arrival, including
  // ones never opened, hammering the image host for nothing. Deferring real item and symbol
  // data until a sub-view's first visit (see `equip={}` below) keeps the same box sizes, since
  // an empty slot renders at the dimensions of a filled one, so the sizing trick still works
  // while the `<Image>` elements do not exist until then.
  const [visitedViews, setVisitedViews] = useState<Set<EquipmentBookmarkView>>(() => new Set([view]));
  if (!visitedViews.has(view)) setVisitedViews((prev) => new Set(prev).add(view));

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;

  const preset = equip?.presets?.[presetIdx];
  const activeGrid: SlotMap = preset ? storedPresetToDraft(preset) : {};

  const charName = character?.characterName;
  const mounted = useMounted();
  const symbolLevels = useMemo(() => {
    if (!mounted) return null;
    const fromState = (character?.tools?.symbols as { symbols?: Record<string, SymbolState> } | undefined)?.symbols;
    if (fromState) return fromState;
    return readSymbolLevels(charName);
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `charName` primitive, not the whole `character` object, to avoid re-running when unrelated fields change, mirrors readHexaLevels' own pattern above
  }, [mounted, charName, character?.tools]);

  // The 3 views stack in one grid cell, all present with only one visible, so the row
  // auto-sizes to the tallest, matching StatsBookmark's pattern. That includes the outer
  // `flex: 1` and the action bar's `marginTop: auto` pinning it to the panel's bottom edge;
  // see StatsBookmark's comment above for why, including the mobile `display: none` carve-out
  // in `.bookmark-subview`, which is CSS-only and does not affect visitedViews below.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "grid" }}>
        <div className={`bookmark-subview${view === "gear" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "gear" ? "visible" : "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
          <PresetTabs theme={theme} active={presetIdx} activePreset={activePresetStored} onSelect={setPresetIdx} onSetActive={equip ? onSetActivePreset : null} />
          {/* Same container-query carousel as EquipmentSetupStep's EquipmentGridSubstep — kicks
              in once the panel itself (not the viewport) narrows past ~520px, reusing the same
              .eq-* global classes so a narrow Gear bookmark gets the identical prev/next,
              one-section-at-a-time behavior instead of trying to cram all 3 columns in. */}
          <div className="eq-substep-root" ref={gearGridRef}>
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
                <button type="button" className="eq-page-nav-btn" aria-label="Previous section" onClick={() => setMobileGridPage((p) => (p + 2) % 3)} style={navBtnStyle(theme)}><NavChevron direction="prev" /></button>
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
                <button type="button" className="eq-page-nav-btn" aria-label="Next section" onClick={() => setMobileGridPage((p) => (p + 1) % 3)} style={navBtnStyle(theme)}><NavChevron direction="next" /></button>
              </div>
            </div>
          </div>
        </div>
        <div className={`bookmark-subview${view === "titles" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "titles" ? "visible" : "hidden" }}>
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
        <div className={`bookmark-subview${view === "pets" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "pets" ? "visible" : "hidden" }}>
          <PetsView theme={theme} equip={visitedViews.has("pets") ? equip : undefined} />
        </div>
      </div>
      <div className="bookmark-page-nav" style={{ paddingTop: 14, marginTop: "auto" }}>
        <EquipmentActionBar view={view} theme={theme} onSelect={onViewChange} />
      </div>
    </div>
  );
}

const EMPTY_FAMILIAR_SLOT: StoredFamiliarSlot = { familiarId: null, mobId: "", name: "", tier: "", line1: "", line2: "" };
const EMPTY_FAMILIAR_SLOTS: StoredFamiliarSlot[] = Array(3).fill(EMPTY_FAMILIAR_SLOT);
const EMPTY_FAMILIAR_BADGES: string[] = Array(8).fill("");

// Mirrors FamiliarsSetupStep's 3-card and staggered badge layout, read-only. No
// EmptyBookmarkState, matching the V Matrix, Equipment and HEXA convention: the read view
// shows empty dashed cards and pentagons when nothing is set up, so the edit pencil is always
// available rather than gated behind a separate "Set up" button.
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
          <div className="familiar-badge-row" style={{ display: "flex", gap: 8 }}>
            {badges.slice(0, 4).map((badge, i) => (
              // react-doctor-disable-next-line no-array-index-as-key
              <ReadOnlyBadgeSlot key={i} badge={badge} theme={theme} />
            ))}
          </div>
          <div className="familiar-badge-row familiar-badge-row-offset" style={{ display: "flex", gap: 8, marginLeft: badgeRowOffset }}>
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
          <ReadOnlyLeveledIconTile key={name} icon={<VMatrixNodeIcon id={id} name={name} theme={theme} size={32} />} name={name} level={levels[name] ?? 0} max={max} theme={theme} />
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
function GatedFeatureNotice({ theme, title, description, action }: { theme: Theme; title: string; description: string; action?: ReactNode }) {
  return (
    <div style={gatedFeatureNoticeStyle(theme)}>
      <div style={{ color: theme.muted }}><LockIcon /></div>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>{title}</div>
      <div style={{ fontSize: 13, color: theme.muted, maxWidth: 280, whiteSpace: "pre-line" }}>{description}</div>
      {action}
    </div>
  );
}

// V Matrix unlocks at level 200 and is unavailable to legacy, pre-5th-job classes, mirroring
// isStepSkippedForLevel in flows.ts, the setup step's gate for this same step. Per the "Level /
// legacy gating" table in the characters CLAUDE.md, the bookmark re-checks this itself because
// it renders independently of the step registry. Also drives whether BookmarkPageBody shows the
// edit pencil, since a gated character has nothing to edit.
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

// A character with no saved HEXA Skills tool data, meaning level-eligible but never ran the
// step, would render nothing below the header. This fills in the same all-zero dimmed shape
// VMatrixBookmark shows for an untouched V Matrix rather than a blank panel. Origin starts at
// level 1 once HEXA-eligible, which defaultLevels and emptyLevels elsewhere already agree on;
// 0 here made an untouched character's bookmark read 0 of 30 while the setup step's draft
// correctly showed 1 of 30.
const EMPTY_HEXA_LEVELS: HexaSkillLevels = { origin: 1, ascent: 0, mastery: [], enhancement: [], common: [] };

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
// Node I is always accessible, since HEXA Matrix implies 6th job, while II and III have their
// own level gates on top. Mirrors isNodeUnlocked in HexaMatrixSetupStep.
const HEXA_STAT_UNLOCK_LEVELS = [0, 265, 270];
// Mirrors MAX_STAT_ENTRY_LEVEL in HexaMatrixSetupStep. Each HEXA Stat line caps at 10.
const HEXA_STAT_ENTRY_MAX_LEVEL = 10;
// Mirrors the local HEXA_STAT_DEFS iconIds in HexaMatrixSetupStep, taken from the hexaStat
// section of the hexa-skill manifest. Not exported there, so duplicated here like the unlock
// levels above.
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

// Mirrors isNodeEmpty in HexaMatrixSetupStep. True when neither preset of a node has a stat
// chosen, used to dim a node's tab icon the way the setup step does.
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
              <HexaStatNodeIcon id={HEXA_STAT_NODE_ICON_IDS[i]} slot={i + 1} theme={theme} size={36} disabled={isHexaStatNodeEmpty(nodes[i])} />
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
      <OptimizeToolLink theme={theme} charName={character?.characterName} mode="hexa" label="Optimize HEXA Stat" marginTop={0} />
    </div>
  );
}

// Mirrors MAX_LEVEL in HexaMatrixSetupStep. Every HEXA skill, mastery, boost and common node
// caps at 30.
const HEXA_SKILL_MAX_LEVEL = 30;

function hexaMasteryNodeToSkillDef(node: HexaMasteryNode): HexaSkillDef {
  return { name: node.skills.join(" / "), iconId: node.iconId, iconUrl: node.iconUrl };
}

// The same StatBlock and grid treatment as VMatrixNodeSection: one tile per real node, with no
// padding for slots the class does not have. Matches both VMatrixBookmark and the setup step's
// substep, neither of which model reserved future slots.
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
      <HexaSkillNodeSection label="Common Nodes" skills={commonSkillsFor(hexaClassDef?.className ?? null)} levels={hexaLevels.common ?? []} theme={theme} />
    </div>
  );
}

function HexaMatrixBookmark({ theme, character, view, onViewChange, onSetActivePreset }: {
  theme: Theme; character: StoredCharacterRecord | null; view: HexaBookmarkView; onViewChange: (v: HexaBookmarkView) => void;
  onSetActivePreset: (nodeIndex: number, presetIndex: number) => void;
}) {
  const mounted = useMounted();
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

  // The 2 views stack in one grid cell, both present with only one visible, so the row
  // auto-sizes to the taller, matching EquipmentBookmark's pattern. That includes the outer
  // `flex: 1` and the action bar's `marginTop: auto`; see StatsBookmark's comment for why,
  // including the mobile `display: none` carve-out in `.bookmark-subview`.
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ display: "grid" }}>
        <div className={`bookmark-subview${view === "skills" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "skills" ? "visible" : "hidden" }}>
          <HexaSkillsBookmarkView theme={theme} hexaClassDef={hexaClassDef} hexaLevels={hexaLevels ?? EMPTY_HEXA_LEVELS} />
        </div>
        <div className={`bookmark-subview${view === "stat" ? " bookmark-subview-active" : ""}`} style={{ gridArea: "1 / 1", visibility: view === "stat" ? "visible" : "hidden" }}>
          <HexaStatBookmarkView theme={theme} character={character} classData={classData} hexaStatNodes={hexaStatNodes} onSetActivePreset={onSetActivePreset} />
        </div>
      </div>
      <div className="bookmark-page-nav" style={{ paddingTop: 14, marginTop: "auto" }}>
        <HexaActionBar view={view} theme={theme} onSelect={onViewChange} />
      </div>
    </div>
  );
}

// EXP percent is arithmetic on level and exp (characterExpPercent), real for every class past
// level 200. Unlike V Matrix and HEXA there is no legacy-class exclusion; the EXP table in
// exp-calculator-data.ts covers 200 to 300, the same floor the calculator uses.
function resolveExpNotice(character: StoredCharacterRecord | null): string | null {
  if (!character) return null;
  return isExpTrackingAvailable(character.level) ? null : "EXP tracking unlocks at level 200.";
}

const EXP_OVER_TIME_INFO: TooltipContent = {
  title: "EXP Over Time",
  description: (
    <>
      Character rankings refresh once per day, starting around 16:00 UTC and usually
      finishing within an hour or two.
      <br />
      <br />
      This chart reflects that daily snapshot, not your live in-game progress, so it only
      updates once each real-world day at most.
      <br />
      <br />
      The very first tracked day for a character won&apos;t show a bar on Daily EXP, since
      there&apos;s nothing earlier yet to measure a gain against. It&apos;ll start filling in
      from the next update onward.
      <br />
      <br />
      Refreshing right as that daily update is finishing (roughly 17:00-18:00 UTC) can
      occasionally merge that day&apos;s gain into the previous day&apos;s bar instead of
      getting its own.
    </>
  ),
};

const EXP_RANGE_OPTIONS: { value: ExpRangeDays; label: string }[] = [
  { value: "7", label: "7D" },
  { value: "14", label: "14D" },
  { value: "30", label: "30D" },
  { value: "90", label: "90D" },
];
type ExpRangeDays = "7" | "14" | "30" | "90";

type LineChartComponent = (typeof import("react-chartjs-2"))["Line"];
type BarChartComponent = (typeof import("react-chartjs-2"))["Bar"];

// Dynamically imports chart.js and react-chartjs-2 rather than importing them statically,
// mirroring StarForceWorkspace's HistogramPanel, so the chart libraries stay out of every
// profile load for characters that never open this bookmark.
interface ExpChartPoint {
  x: number;
  y: number;
  level: number;
  percent: number;
  expGained: number | null;
}

// The number of real calendar days between labeled ticks. A fixed tick count breaks down
// whenever the day span is not a clean multiple of it: 14 daily points split into 6 ticks
// alternates between 2-day and 3-day steps, reading as jittery even though every point is one
// real day apart. A fixed day interval, leaving the final partial interval's point unlabeled,
// makes every labeled gap identical. The values divide the common window sizes evenly, giving
// 7, 6 and 6 ticks respectively, and a small window has room to label every day.
function resolveExpTickIntervalDays(n: number): number {
  if (n <= 8) return 1;
  if (n <= 16) return 2;
  if (n <= 35) return 5;
  return 15;
}

// Rough minimum pixel width one date tick label needs to avoid running into its neighbor.
// `maxRotation: 0` and `autoSkip: false` are both deliberately set on the x-axis (see
// pickTickIndices below) so the two charts always agree on which dates to show, which also
// means Chart.js's built-in overlap avoidance never applies here.
const MIN_TICK_LABEL_WIDTH_PX = 44;

// Indices of the data points, already one per Nexon day (see nexonDayAnchorMs above), that get
// an axis tick, meaning every interval-th day from the first point. Shared by the line chart
// on a linear scale and the bar chart on a category scale so both land on the same dates. The
// last point is not forced in when it does not fall on the interval, matching how most chart
// libraries space ticks; forcing it back in is what crammed and stretched the end of the axis.
//
// axisWidthPx is the x-axis's rendered width, read from Chart.js's layout at afterBuildTicks
// time. It widens the interval beyond what resolveExpTickIntervalDays alone picks whenever the
// chart is narrow enough that even that interval's labels would overlap, as on a 360px window
// where a 7-point range's one-tick-per-day default overlapped every date label. It only ever
// widens, and only changes anything below roughly 300px, trading the interval's usual clean
// divisibility for an uneven one in that case. There is no interval that both divides cleanly
// and fits an arbitrarily narrow width.
function pickTickIndices(n: number, axisWidthPx: number): number[] {
  let interval = resolveExpTickIntervalDays(n);
  while (axisWidthPx > 0 && interval < n && Math.ceil(n / interval) * MIN_TICK_LABEL_WIDTH_PX > axisWidthPx) {
    interval += 1;
  }
  const indices: number[] = [];
  for (let i = 0; i < n; i += interval) indices.push(i);
  return indices;
}

// Normalizes a raw entry timestamp to a stable anchor for its Nexon day (see nexonDayIndex in
// charactersStore.ts), the same boundary used to decide which day an EXP snapshot belongs to
// when recorded. Refreshes land at whatever time of day they happened, so plotting the raw
// timestamp made x-spacing wobble by however many hours apart two adjacent same-day-count
// entries were recorded. A 2am refresh followed by an 11pm one reads as a 45 hour gap even
// though the real day gap matched every other pair. Anchoring removes that jitter while still
// showing real multi-day gaps, measured in whole days. Keeping it in UTC rather than the
// viewer's local midnight means every viewer sees the same date labels for a given snapshot.
function nexonDayAnchorMs(timestamp: number): number {
  return nexonDayIndex(timestamp) * EXP_HISTORY_DAY_MS + NEXON_DAILY_UPDATE_CUTOFF_HOUR_UTC * 60 * 60 * 1000;
}

// Shared by ExpChart and ExpGainBarChart below. y is a fractional level, level plus percent
// over 100, rather than the raw EXP percent, which drops back toward 0 on every level-up in
// the window and reads as a regression even though real progress only goes up. Folding the
// level in keeps the line climbing while still landing on real level numbers on the axis, and
// `percent` is kept per point for the tooltip's level and percent breakdown.
//
// expGained is the raw EXP earned since the previous entry, or since `anchor` for the first
// point, that being the last snapshot before the selected window if one exists, so the first
// in-window day gets a real diff rather than being nulled out. It is null only when nothing
// precedes it, meaning the first snapshot ever recorded. A same-level expGained is a signed
// diff rather than netExpGained, which clamps a loss to 0, so a real EXP loss from dying to a
// boss comes through as negative instead of being hidden. Same reasoning as resolveExpDelta
// in expProgress.ts.
function computeExpChartPoints(entries: ExpHistoryEntry[], anchor: ExpHistoryEntry | null = null): ExpChartPoint[] {
  return entries.map((e, i) => {
    const percent = characterExpPercent(e.level, e.exp);
    const y = e.level + percent / 100;
    const x = nexonDayAnchorMs(e.date);
    const prev = i === 0 ? anchor : entries[i - 1];
    if (!prev) return { x, y, level: e.level, percent, expGained: null };
    const expGained = prev.level === e.level ? e.exp - prev.exp : netExpGained(prev.level, prev.exp, e.level, e.exp);
    return { x, y, level: e.level, percent, expGained };
  });
}

// Chart.js's tooltip only updates from real pointer events landing on the canvas. A mouse gets
// a mouseleave for free when it wanders off, but a tap has no equivalent, so on mobile a
// tapped point's tooltip stays open once you tap elsewhere on the page. This listens for a
// pointerdown outside the chart's canvas and clears the active tooltip and elements. Shared by
// both EXP charts, line and bar, since both behave the same way.
function useDismissChartTooltipOnOutsideTap<TType extends ChartType>(chartRef: React.RefObject<Chart<TType> | null>) {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const chart = chartRef.current;
      if (!chart || chart.canvas.contains(event.target as Node)) return;
      chart.setActiveElements([]);
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      chart.update();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [chartRef]);
}

function ExpChart({ theme, entries, anchor }: { theme: Theme; entries: ExpHistoryEntry[]; anchor: ExpHistoryEntry | null }) {
  const [Line, setLine] = useState<LineChartComponent | null>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  useDismissChartTooltipOnOutsideTap(chartRef);

  useEffect(() => {
    let mounted = true;
    async function loadChart() {
      const [chartModule, lineModule] = await Promise.all([import("chart.js"), import("react-chartjs-2")]);
      chartModule.Chart.register(
        chartModule.LinearScale, chartModule.PointElement, chartModule.LineElement, chartModule.Tooltip, chartModule.Filler,
      );
      if (mounted) setLine(() => lineModule.Line as LineChartComponent);
    }
    loadChart();
    return () => { mounted = false; };
  }, []);

  const points = useMemo(() => computeExpChartPoints(entries, anchor), [entries, anchor]);

  const data: ChartData<"line"> = useMemo(() => ({
    datasets: [{
      data: points,
      borderColor: theme.accent,
      backgroundColor: `${theme.accent}33`,
      fill: true,
      tension: 0,
      pointRadius: 3,
      pointBackgroundColor: theme.accent,
    }],
  }), [points, theme.accent]);

  const options: ChartOptions<"line"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    // Hovering anywhere along a point's x-slice shows its tooltip, not only the exact pixel
    // the dot sits on. That matters most for the bar chart's use of this same interaction
    // mode, where a 0 EXP day renders as a zero-height bar with nothing to land on, but it is
    // applied here too so both charts behave alike.
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.panel,
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: theme.border,
        borderWidth: 1,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => new Date((items[0].raw as ExpChartPoint).x).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
          label: (item: TooltipItem<"line">) => {
            const raw = item.raw as ExpChartPoint;
            return `Lv ${raw.level} · ${raw.percent.toFixed(3)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        // Bounded to the first and last plotted point rather than the selected range's exact
        // start and end. Entries land at whatever time of day a refresh happened rather than
        // exactly now or now minus N days, so pinning to the range's timestamps left visible
        // gaps between the axis edges and the dots.
        min: points[0]?.x,
        max: points[points.length - 1]?.x,
        // A linear scale's default ticks are evenly spaced by value across min to max rather
        // than snapped to real data points, so a tick could land between two points and read
        // as belonging to whichever it sits closer to. pickTickIndices uses a fixed real-day
        // interval instead, shared with the bar chart below so both axes agree on which dates
        // to show, making every labeled gap identical.
        afterBuildTicks: (axis) => {
          const indices = pickTickIndices(points.length, axis.width);
          axis.ticks = indices.map((i) => ({ value: points[i].x }));
        },
        ticks: {
          color: theme.muted,
          maxRotation: 0,
          callback: (value) => new Date(value as number).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }),
        },
        grid: { display: false },
      },
      y: {
        // Not beginAtZero, since y is a fractional level rather than a percent, so starting
        // the axis at 0 would flatten the climb into an unreadable sliver near the top. Ticks
        // split the fractional part back out into a level and percent, mirroring MapleRanks'
        // axis style, rounded to a whole percent because sub-percent precision is not
        // meaningful as an axis label. The tooltip carries the exact figure.
        ticks: {
          color: theme.muted,
          callback: (value) => {
            const v = Number(value);
            const level = Math.floor(v);
            return `${level} ${Math.round((v - level) * 100)}%`;
          },
        },
        grid: { color: theme.border },
      },
    },
  }), [theme.panel, theme.text, theme.border, theme.muted, points]);

  return (
    <div style={{ height: 220 }} role="img" aria-label={`Line chart: EXP percent over time across ${points.length} data points.`}>
      {Line ? <Line ref={chartRef} key={points.length} data={data} options={options} /> : null}
    </div>
  );
}

interface DailyExpPoint {
  label: string;
  expGained: number;
}

// expHistory gets an entry on every refresh and setup-flow lookup rather than once a day (see
// appendExpHistoryEntry in charactersStore.ts), so a bar per raw entry could put several bars
// under one calendar date and desync from the x-axis ticks. Summing into one bar per calendar
// day, keyed by the same locale string used as its label so the two cannot drift, keeps Daily
// EXP honest and each label under its own bar.
function aggregateDailyExpGain(entries: ExpHistoryEntry[], anchor: ExpHistoryEntry | null): DailyExpPoint[] {
  const points = computeExpChartPoints(entries, anchor).filter((p): p is ExpChartPoint & { expGained: number } => p.expGained !== null);
  const byDay = new Map<string, DailyExpPoint>();
  for (const p of points) {
    const label = new Date(p.x).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
    const existing = byDay.get(label);
    if (existing) existing.expGained += p.expGained;
    else byDay.set(label, { label, expGained: p.expGained });
  }
  return Array.from(byDay.values());
}

// Above this bar count, an always-on amount label per bar overlaps too much to read, as the
// 14-day range's bars are already narrow enough to collide. The tooltip still shows the same
// amount on hover at any range, so this keeps the labels to the 7-day range.
const DAILY_EXP_LABEL_MAX_POINTS = 7;

// A gain reads bare and only a loss gets a sign, since everyone opening this chart is here to
// see progress and a plus on every normal day is noise.
function formatSignedExp(n: number): string {
  return n < 0 ? `-${formatExpCompact(-n).toUpperCase()}` : formatExpCompact(n).toUpperCase();
}

function ExpGainBarChart({ theme, entries, anchor }: { theme: Theme; entries: ExpHistoryEntry[]; anchor: ExpHistoryEntry | null }) {
  const [Bar, setBar] = useState<BarChartComponent | null>(null);
  const chartRef = useRef<Chart<"bar"> | null>(null);
  useDismissChartTooltipOnOutsideTap(chartRef);

  useEffect(() => {
    let mounted = true;
    async function loadChart() {
      const [chartModule, barModule] = await Promise.all([import("chart.js"), import("react-chartjs-2")]);
      chartModule.Chart.register(
        chartModule.CategoryScale, chartModule.LinearScale, chartModule.BarElement, chartModule.Tooltip,
      );
      if (mounted) setBar(() => barModule.Bar as BarChartComponent);
    }
    loadChart();
    return () => { mounted = false; };
  }, []);

  const points = useMemo(() => aggregateDailyExpGain(entries, anchor), [entries, anchor]);

  // Draws a "+1.89t"-style total above each bar, mirroring MapleRanks' always-visible
  // per-bar amount (the line chart used to do this per-point before Daily EXP took over
  // that job). A plugin rather than a dataset label option since it needs the bar's
  // rendered pixel position, and scoped to this chart instance via the `plugins` prop
  // rather than Chart.register so it doesn't leak into other bar charts (e.g.
  // StarForceWorkspace's histogram) sharing the same chart.js runtime.
  const dailyExpLabelPlugin = useMemo<Plugin<"bar">>(() => ({
    id: "dailyExpLabels",
    afterDatasetsDraw(chart) {
      if (points.length > DAILY_EXP_LABEL_MAX_POINTS) return;
      const meta = chart.getDatasetMeta(0);
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = "700 10px 'Nunito', sans-serif";
      ctx.fillStyle = theme.muted;
      ctx.textBaseline = "bottom";
      const edgePad = 4;
      // Same staleness guard as the old line-chart label plugin: meta.data can briefly lag
      // one render behind `points` when the dataset length changes (e.g. switching ranges).
      if (meta.data.length !== points.length) { ctx.restore(); return; }
      // Skips all labels rather than some, so adjacent ones cannot run into each other on a
      // narrow chart, which they did badly at 360px wide. The tooltip shows the same amount on
      // hover or tap at any range, so hiding them loses no information. Measures the widest
      // label against the tightest gap between bar centers, since categoryPercentage and
      // barPercentage keep bars evenly spaced but the chart itself can still be too narrow.
      let minGap = Infinity;
      for (let i = 1; i < meta.data.length; i++) minGap = Math.min(minGap, meta.data[i].x - meta.data[i - 1].x);
      const widestLabelWidth = Math.max(...points.map((p) => ctx.measureText(formatSignedExp(p.expGained)).width));
      if (Number.isFinite(minGap) && widestLabelWidth > minGap - edgePad) { ctx.restore(); return; }
      meta.data.forEach((el, index) => {
        const point = points[index];
        if (!point) return;
        if (el.x <= chartArea.left + edgePad) ctx.textAlign = "left";
        else if (el.x >= chartArea.right - edgePad) ctx.textAlign = "right";
        else ctx.textAlign = "center";
        ctx.fillText(formatSignedExp(point.expGained), el.x, el.y - 4);
      });
      ctx.restore();
    },
  }), [points, theme.muted]);

  const data: ChartData<"bar"> = useMemo(() => ({
    labels: points.map((p) => p.label),
    datasets: [{
      data: points.map((p) => p.expGained),
      backgroundColor: theme.accent,
      borderRadius: 3,
      categoryPercentage: 0.8,
      barPercentage: 0.8,
    }],
  }), [points, theme.accent]);

  const options: ChartOptions<"bar"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 16 } },
    // Hovering anywhere in a bar's x-slice shows its tooltip, not only the bar itself, since a
    // 0 EXP day renders as a zero-height bar with no pixels to land on.
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.panel,
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: theme.border,
        borderWidth: 1,
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => points[items[0].dataIndex]?.label ?? "",
          label: (item: TooltipItem<"bar">) => {
            const p = points[item.dataIndex];
            return p ? formatSignedExp(p.expGained) : "";
          },
        },
      },
    },
    scales: {
      x: {
        // A category scale's own autoSkip picks evenly-spaced-by-index labels using its own
        // internal rules, which can disagree with the line chart's picks. Using the same
        // pickTickIndices logic as the line chart's x-axis instead keeps both charts showing
        // the exact same subset of dates.
        afterBuildTicks: (axis) => {
          const indices = pickTickIndices(points.length, axis.width);
          axis.ticks = indices.map((value) => ({ value }));
        },
        ticks: { color: theme.muted, maxRotation: 0, autoSkip: false },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.muted, callback: (value) => formatSignedExp(Number(value)) },
        grid: { color: theme.border },
      },
    },
  }), [points, theme.panel, theme.text, theme.border, theme.muted]);

  return (
    <div style={{ height: 160 }} role="img" aria-label={`Bar chart: daily EXP gained across ${points.length} days.`}>
      {Bar ? <Bar ref={chartRef} key={points.length} data={data} options={options} plugins={[dailyExpLabelPlugin]} /> : null}
    </div>
  );
}

interface ExpHistoryWindow {
  entries: ExpHistoryEntry[];
  // The last snapshot before the window start, if any, so the first in-window point can still
  // compute a real expGained diff (see computeExpChartPoints) rather than being treated as a
  // baseline with nothing before it. That dropped the day's bar entirely and made a 7-day
  // range show only 6 days.
  anchor: ExpHistoryEntry | null;
  start: number;
  end: number;
}

function windowExpHistory(entries: ExpHistoryEntry[], days: number): ExpHistoryWindow {
  const end = Date.now();
  const start = end - days * EXP_HISTORY_DAY_MS;
  const before = entries.filter((e) => e.date < start);
  return { entries: entries.filter((e) => e.date >= start), anchor: before[before.length - 1] ?? null, start, end };
}

// Read-only, auto-populated from every refresh and setup-flow lookup (see
// appendExpHistoryEntry in charactersStore.ts), so no edit pencil, like Overview and Setup.
function ExpBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const [range, setRange] = useState<ExpRangeDays>("7");
  const notice = resolveExpNotice(character);
  if (notice !== null) return <GatedFeatureNotice theme={theme} title="Not Available" description={notice} />;
  if (!character) return null;

  const expWindow = windowExpHistory(character.expHistory ?? [], Number(range));
  const percent = characterExpPercent(character.level, character.exp);
  const delta = resolveExpDelta(character);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <StatBlock label="Current Progress" theme={theme}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.6rem", fontWeight: 800, color: theme.text }}>{percent.toFixed(3)}%</span>
          {delta && <ExpDeltaBadge theme={theme} delta={delta} fontSize="0.85rem" />}
        </div>
        <div style={{ fontSize: "0.75rem", color: theme.muted, marginTop: 4 }}>Level {character.level}</div>
      </StatBlock>
      <StatBlock label="EXP Over Time" theme={theme} info={EXP_OVER_TIME_INFO}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted }}>Progress since the start of this range.</p>
          <PillGroup theme={theme} options={EXP_RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
        {expWindow.entries.length >= 2 ? (
          <>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>Daily EXP</p>
            <ExpGainBarChart theme={theme} entries={expWindow.entries} anchor={expWindow.anchor} />
            <p style={{ margin: "1rem 0 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>Level Progress</p>
            <ExpChart theme={theme} entries={expWindow.entries} anchor={expWindow.anchor} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: "0.8rem", color: theme.muted, textAlign: "center", padding: "2rem 0" }}>
            Not enough data yet. Check back after refreshing this character a few more times.
          </p>
        )}
      </StatBlock>
    </div>
  );
}

// The same reasons ScouterFigure's tooltip covers, restated as full sentences since this
// bookmark has room for prose rather than a hover popup.
const SCOUTER_ERROR_REASON_TEXT: Record<ScouterErrorReason, string> = {
  rate_limited: "You're refreshing too fast. Wait a moment and try again.",
  timeout: "MapleScouter's API timed out. Try again in a moment.",
  bad_response: "MapleScouter's API returned something unexpected. Try again in a moment.",
  network: "Couldn't reach MapleScouter's API. Try again in a moment.",
};

function ScouterBookmarkNotice({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: "0.8rem", color: theme.muted, textAlign: "center", padding: "2rem 0" }}>{children}</p>;
}

function scouterBookmarkHeaderLabel(view: ScouterBookmarkView, defaultLabel: string, spotlightBoss: string): string {
  return view === "spotlight" ? spotlightBoss : defaultLabel;
}

// Read-only display of what is already in ScouterResultEntry. Refreshing is manual by design
// (see useScouterResult's doc comment), triggered from the Scouter figure on Overview or this
// bookmark's own header below.
/** The four not-ready states every MapleScouter-backed bookmark shares, being class
 *  unsupported, setup incomplete, never calculated and last refresh failed, plus the stale
 *  result banner, kept in one place so Scouter and Stat Efficiency cannot drift apart. Also
 *  owns this bookmark's page header, sharing the same useScouterResult call as the body below
 *  it, since a second independent call would let a header-triggered refresh disagree with the
 *  body about what just happened. */
function ScouterResultGate({ theme, character, label, disabled, simulated, onEditStep, children }: {
  theme: Theme; character: StoredCharacterRecord; label: string; disabled: boolean; simulated: boolean;
  onEditStep: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) => void;
  children: (entry: ScouterResultEntry) => ReactNode;
}) {
  const { status, loading, canRefresh, refresh, justRefreshed, justRefreshedUnchanged } = useScouterResult(character);
  const header = (
    <BookmarkPageHeader
      theme={theme}
      label={label}
      onEdit={null}
      disabled={disabled}
      extraAction={<ScouterRefreshButton theme={theme} status={status} loading={loading} canRefresh={canRefresh} refresh={refresh} justRefreshed={justRefreshed} justRefreshedUnchanged={justRefreshedUnchanged} disabled={simulated} />}
    />
  );

  if (status.kind === "unsupported") {
    return (
      <>
        {header}
        <GatedFeatureNotice theme={theme} title="Not Available" description="MapleScouter doesn't support this class yet." />
      </>
    );
  }
  if (status.kind === "incomplete") {
    // Not confined and with no target substep, so the flow opens on its first step, Import
    // from MapleScouter, and Back and Next walk the rest. A character that never ran
    // MapleScouter Setup is usually missing more than the one gated substep, since Oz Rings,
    // Link Skills, HEXA and Buffs are not gated here but still matter, and the import step can
    // pre-fill all of it from a MapleScouter export. Someone who already ran Full Setup clicks
    // through the filled steps, which costs a few clicks and nothing more.
    return (
      <>
        {header}
        <GatedFeatureNotice
          theme={theme}
          title="Not Available"
          description={"Fill out MapleScouter Setup\nbefore viewing this."}
          action={(
            <button
              type="button"
              className="tool-dialog-btn"
              style={scouterGapButtonStyle(theme)}
              onClick={() => onEditStep("maplescouter_setup")}
            >
              Go to MapleScouter Setup
            </button>
          )}
        />
      </>
    );
  }
  if (status.kind === "empty") {
    return (
      <>
        {header}
        <ScouterBookmarkNotice theme={theme}>Not calculated yet. Refresh your Scouter figure to see these numbers.</ScouterBookmarkNotice>
      </>
    );
  }
  if (status.kind === "error") {
    return (
      <>
        {header}
        <ScouterBookmarkNotice theme={theme}>
          {status.reason ? SCOUTER_ERROR_REASON_TEXT[status.reason] : "MapleScouter's API didn't respond. Refresh your Scouter figure to try again."}
        </ScouterBookmarkNotice>
      </>
    );
  }

  return (
    <>
      {header}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 10 }}>
        {status.stale && (
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: statusText(theme, "warning") }}>
            {status.reason
              ? <>Showing the last known values. {SCOUTER_ERROR_REASON_TEXT[status.reason]}</>
              : "Showing the results for the last known values. Refresh your Scouter figure to update."}
          </p>
        )}
        {children(status.entry)}
      </div>
    </>
  );
}

// The flat power figures (Boss 300/380, Converted Power, Dojo) live inside BossClearGrid's
// Quick View as a header strip rather than a separate sub-view here, since they are the raw
// inputs feeding every row below them rather than unrelated data.
//
// BossClearGrid owns the Quick View and Spotlight sub-view split internally, including its own
// "back to Quick View" button, so this only passes view and onViewChange through. The bottom
// action-bar nav was removed: its forward direction duplicated clicking a boss banner or using
// the Quick View dropdown, and the back-only button left over did not earn a dedicated row, so
// it moved into BossSpotlight's header.
function ScouterBookmark({ theme, character, label, disabled, view, onViewChange, selectedBossIndex, onSelectedBossIndexChange, onEditStep, scouterSimulator }: {
  theme: Theme; character: StoredCharacterRecord; label: string; disabled: boolean; view: ScouterBookmarkView; onViewChange: (v: ScouterBookmarkView) => void;
  selectedBossIndex: number; onSelectedBossIndexChange: (i: number) => void;
  onEditStep: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) => void;
  scouterSimulator: ScouterSimulatorController;
}) {
  const [simulatorDialogOpen, setSimulatorDialogOpen] = useState(false);
  const simulated = scouterSimulator.active;
  return (
    <ScouterResultGate theme={theme} character={character} label={label} disabled={disabled} simulated={simulated !== null} onEditStep={onEditStep}>
      {(entry) => (
        <>
          <SimulatedValuesMarker theme={theme} visible={simulated !== null} onReset={scouterSimulator.reset} />
          <BossClearGrid
            theme={theme}
            character={character}
            entry={simulated?.entry ?? entry}
            realEntry={simulated ? entry : undefined}
            view={view}
            onViewChange={onViewChange}
            selectedIndex={selectedBossIndex}
            onSelectedIndexChange={onSelectedBossIndexChange}
            levelOverride={simulated?.overrides.level}
            arcaneForceOverride={simulated?.overrides.arcaneForceOverride}
            authenticForceOverride={simulated?.overrides.authenticForceOverride}
            simulated={simulated !== null}
            onOpenSimulator={() => setSimulatorDialogOpen(true)}
          />
          {simulatorDialogOpen && (
            <ScouterSimulatorDialog
              theme={theme}
              character={character}
              applying={scouterSimulator.applying}
              previousOverrides={simulated?.overrides ?? null}
              onApply={async (overrides) => {
                const result = await scouterSimulator.apply(overrides);
                if (result.status === "ok") setSimulatorDialogOpen(false);
                return result;
              }}
              onReset={scouterSimulator.reset}
              onClose={() => setSimulatorDialogOpen(false)}
            />
          )}
        </>
      )}
    </ScouterResultGate>
  );
}

function simulatedValuesMarkerStyle(theme: Theme): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    padding: "0.5rem 0.7rem", borderRadius: 10, marginBottom: 10,
    background: `${theme.accent}15`, border: `1px solid ${theme.accent}`,
  };
}

/** Sits above BossClearGrid on the Scouter bookmark while a Scouter Simulator what-if is
 *  applied, marking the figures below as simulated rather than the character's saved result,
 *  since a simulation deliberately replaces the real result in place. Also offers a reset back
 *  to real without reopening the popup. The launcher that opens the popup lives in
 *  BossClearGrid's Quick View filter row, the slot the old Full HEXA toggle occupied. Renders
 *  nothing when no simulation is active. */
function SimulatedValuesMarker({ theme, visible, onReset }: { theme: Theme; visible: boolean; onReset: () => void }) {
  if (!visible) return null;
  return (
    <div style={simulatedValuesMarkerStyle(theme)}>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.accentText }}>
        Showing simulated values
      </span>
      <button type="button" onClick={onReset} className="tool-btn tool-dialog-btn" style={{ ...dialogBtnColors(theme), padding: "4px 10px", fontSize: "0.75rem" }}>
        Reset
      </button>
    </div>
  );
}

// The same MapleScouter response the Scouter bookmark reads, but a different slice: the
// per-unit marginal damage table (statEfficiency.ts) rather than the boss-clear figures. Both
// sections render on one page, so unlike Scouter there is no sub-view to remember.
//
// A fifth not-ready state, a result predating specEfficiency or returned without it, belongs
// to this bookmark alone and so sits here rather than in the shared gate, since Scouter's own
// figures are all present in that same entry. Keyed by character so the table's typed amounts
// and unit choice do not carry onto the next one, the same guard EquipmentBookmark's key
// provides.
function StatEfficiencyBookmark({ theme, character, label, disabled, onEditStep }: {
  theme: Theme; character: StoredCharacterRecord; label: string; disabled: boolean;
  onEditStep: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) => void;
}) {
  return (
    <ScouterResultGate theme={theme} character={character} label={label} disabled={disabled} simulated={false} onEditStep={onEditStep}>
      {(entry) => (entry.specEfficiency ? (
        <StatEfficiencyPanel key={character.characterName} theme={theme} character={character} eff={entry.specEfficiency} />
      ) : (
        <ScouterBookmarkNotice theme={theme}>
          MapleScouter didn&apos;t return efficiency numbers for this result. Refresh your Scouter figure to try again.
        </ScouterBookmarkNotice>
      ))}
    </ScouterResultGate>
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
    case "exp": return true;
    case "scouter": return true;
    case "efficiency": return true;
    default: return false;
  }
}

const BOOKMARK_CONTENT: Record<Exclude<BookmarkId, "overview" | "setup" | "gender_marriage" | "stats" | "equipment" | "v_matrix" | "hexa_matrix" | "familiars" | "exp" | "scouter" | "efficiency">, (props: { theme: Theme; character: StoredCharacterRecord | null }) => ReactNode> = {};

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

function scouterGapButtonStyle(theme: Theme): CSSProperties {
  return {
    marginTop: 4,
    background: theme.accent,
    borderColor: theme.accent,
    color: theme.accentOn,
  };
}

// The Stats step's substeps run 0 for quick questions, 1 for Character Info covering Basic,
// Combat and Symbols, everything the stats bookmark view shows, then Hyper Stat and Inner
// Ability, whose indices shift with Hyper Stat eligibility since StatsSetupStep hides that
// substep below Lv 140. Mirrors that numbering so the edit pencil opens on the substep the
// bookmark is showing rather than substep 0.
function statsTargetSubstep(view: StatsView, characterLevel: number | undefined): number {
  const hyperEligible = isHyperStatEligible(characterLevel);
  if (view === "hyperStat") return hyperEligible ? 2 : 1;
  if (view === "ability") return hyperEligible ? 3 : 2;
  return 1;
}

// equipment_flow has one step with 3 fixed substeps: 0 for the main grid, 1 for titles, totems
// and symbols, 2 for pets (see SUBSTEP_COUNT in EquipmentSetupStep.tsx). Unlike
// statsTargetSubstep there is no eligibility-based index shifting to account for.
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

// A flat dispatch of per-bookmark branches; each branch is its own cohesive, low-complexity
// block, splitting further would just move the same branches into an equally-long if/else
// chain of function calls.
// eslint-disable-next-line sonarjs/cognitive-complexity
function BookmarkPageBody({
  model, actions, active, filled, ContentComponent, onEdit, onEditStep, onNavigateToBookmark, onNavigateToGearSlot, highlightSlotKey, onHighlightSlotConsumed,
}: {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
  active: BookmarkDef;
  filled: boolean;
  ContentComponent: ((props: { theme: Theme; character: StoredCharacterRecord | null }) => ReactNode) | null;
  onEdit: () => void;
  onEditStep: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) => void;
  onNavigateToBookmark: (id: BookmarkId, subView?: string) => void;
  onNavigateToGearSlot: (slotKey: SlotKey) => void;
  highlightSlotKey: SlotKey | null;
  onHighlightSlotConsumed: () => void;
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
  const [scouterView, setScouterView] = useState<ScouterBookmarkView>(() => {
    const remembered = setup.lastActiveBookmarkSubView;
    return active.id === "scouter" && remembered === "spotlight" ? remembered : "quickView";
  });
  const [scouterSelectedBossIndex, setScouterSelectedBossIndex] = useState(0);
  // Shared between ScouterFigure, inside OverviewBookmark below, and ScouterBookmark in the
  // scouter branch further down. See useScouterSimulator's own comment for why it lives here
  // rather than inside either component.
  const scouterSimulator = useScouterSimulator(character);

  if (active.id === "overview") return <OverviewBookmark model={model} onNavigateToBookmark={onNavigateToBookmark} onNavigateToGearSlot={onNavigateToGearSlot} onSetOverviewLayout={actions.setOverviewLayout} scouterSimulator={scouterSimulator} />;

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

  // Stats has 3 swappable sub-views, Stats, Hyper Stat and Ability, sharing one edit flow, so
  // the pencil needs to know which is showing to open the matching substep rather than
  // restarting at substep 0. See statsTargetSubstep. Always confined to that substep with no
  // Back or Next into its siblings, filled or not, since each sub-view's pencil edits just
  // that piece of data the way every other bookmark's pencil is scoped to its own.
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

  // Same shape as Stats above: 3 swappable sub-views sharing equipment_flow's 3 fixed substeps
  // (see equipmentTargetSubstep), with the pencil confined to whichever sub-view is showing
  // and no EmptyBookmarkState, since the read view shows empty-slot placeholders instead.
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
          highlightSlotKey={highlightSlotKey}
          onHighlightSlotConsumed={onHighlightSlotConsumed}
        />
      </>
    );
  }

  // Same shape as Equipment above, with no EmptyBookmarkState: the read view mirrors
  // VMatrixSetupStep's node grid with all-zero tiles when nothing is set up, so the edit
  // pencil is always available rather than gated behind a separate "Set up" button.
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

  // Same shape as V Matrix above, but Familiars has no gating and no sub-views, so it needs
  // neither an eligibility check nor a targetSubstep helper. The pencil opens familiars_flow's
  // single step directly.
  if (active.id === "familiars") {
    return (
      <>
        <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={onEdit} disabled={setup.isUiLocked} />
        <FamiliarsBookmark theme={theme} character={character} onSetActivePreset={actions.setFamiliarsActivePreset} />
      </>
    );
  }

  // Read-only and auto-populated (see ExpBookmark's own comment), so no edit pencil. Same shape
  // as Overview, Setup and Bio rather than the gated-but-editable Equipment and V Matrix.
  if (active.id === "exp") {
    return (
      <>
        <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={null} disabled={setup.isUiLocked} />
        <ExpBookmark theme={theme} character={character} />
      </>
    );
  }

  // Read-only, the same shape as EXP above. Nothing here is user-editable; it displays whatever
  // MapleScouter's API last returned. useScouterResult needs a real character, the same
  // constraint ScouterFigure has on Overview, so the null check happens at this call site
  // rather than inside ScouterBookmark.
  if (active.id === "scouter") {
    const scouterSpotlightBoss = resolveBossDisplayName(groupByBoss(BOSSCUT_DATA), scouterSelectedBossIndex);
    const scouterHeaderLabel = scouterBookmarkHeaderLabel(scouterView, active.pageLabel, scouterSpotlightBoss);
    if (!character) {
      return <BookmarkPageHeader theme={theme} label={scouterHeaderLabel} onEdit={null} disabled={setup.isUiLocked} />;
    }
    return (
      <ScouterBookmark
        theme={theme}
        character={character}
        label={scouterHeaderLabel}
        disabled={setup.isUiLocked}
        view={scouterView}
        onViewChange={setScouterView}
        selectedBossIndex={scouterSelectedBossIndex}
        onSelectedBossIndexChange={setScouterSelectedBossIndex}
        onEditStep={onEditStep}
        scouterSimulator={scouterSimulator}
      />
    );
  }

  if (active.id === "efficiency") {
    if (!character) {
      return <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={null} disabled={setup.isUiLocked} />;
    }
    return <StatEfficiencyBookmark theme={theme} character={character} label={active.pageLabel} disabled={setup.isUiLocked} onEditStep={onEditStep} />;
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
  theme, bookmarks, activeId, onSelect, charName,
}: {
  theme: Theme;
  bookmarks: BookmarkDef[];
  activeId: BookmarkId;
  onSelect: (id: BookmarkId) => void;
  charName: string | undefined;
}) {
  // react-doctor false positive: empty new Map() is a trivial allocation, not worth lazy-init ceremony.
  // react-doctor-disable-next-line react-doctor/rerender-lazy-ref-init
  const tabRefs = useRef<Map<BookmarkId, HTMLButtonElement>>(new Map());
  // Only the mobile layout (`.profile-binder-spine`'s max-width media query) scrolls
  // horizontally. Desktop's vertical column never overflows, where a solid mask, both atStart
  // and atEnd being true with no horizontal overflow, is a visual no-op. So this applies
  // unconditionally rather than being gated on viewport width.
  const { ref: spineRef, atStart: spineAtStart, atEnd: spineAtEnd } = useScrollEdges<HTMLDivElement>([bookmarks.length]);
  const spineMask = edgeFadeMask(spineAtStart, spineAtEnd);
  // exportCharacterJson triggers a silent browser download with no confirmation, and some
  // mobile browsers show no download bar at all, so tapping Export would otherwise give no
  // feedback. Flashes the same accent tint the active bookmark tab uses, slightly stronger
  // (see the button's style below), rather than swapping its label or adding a toast.
  const [exported, setExported] = useState(false);
  useEffect(() => {
    if (!exported) return;
    const t = setTimeout(() => setExported(false), 400);
    return () => clearTimeout(t);
  }, [exported]);

  // A page tablist should switch content as focus moves, per the WAI-ARIA APG's
  // automatic-activation pattern, unlike this codebase's picker-oriented useKeyboardListNav
  // hook, which highlights first and confirms on Enter.
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
    <div
      ref={spineRef}
      className="profile-binder-spine"
      role="tablist"
      aria-label="Character profile sections"
      aria-orientation="vertical"
      // Set as a custom property rather than a literal maskImage style, since the mobile media
      // query in CharacterSetupFlow.styles.ts is the only place that consumes it into a real
      // mask. Desktop's vertical column never overflows horizontally and has no `overflow`
      // set, so scrollWidth and clientWidth are not meaningful scroll-edge signals there, and
      // applying the gradient unconditionally clipped the desktop list.
      style={{ "--edge-fade-mask": spineMask } as CSSProperties}
    >
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
            <button
              type="button"
              className="profile-bookmark-tab tap-target-44"
              onClick={() => { exportCharacterJson(charName); setExported(true); }}
              style={{
                background: exported ? `${theme.accent}33` : "transparent",
                color: exported ? theme.accentText : theme.muted,
                gap: 6,
                transition: "background 0.3s ease, color 0.3s ease",
              }}
            >
              <ExportTabIcon />
              Export
            </button>
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
  const mounted = useMounted();

  const bookmarks = ALL_BOOKMARKS;
  // Restores whichever bookmark was active before an optional flow started from here. This
  // screen unmounts while the flow runs, so a plain useState("overview") would land back on
  // Overview every time the flow finished.
  const [activeId, setActiveId] = useState<BookmarkId>(() => {
    const remembered = model.setup.lastActiveBookmarkId;
    return remembered && bookmarks.some((b) => b.id === remembered) ? (remembered as BookmarkId) : "overview";
  });
  const active = bookmarks.find((b) => b.id === activeId) ?? bookmarks[0];

  // The remembered bookmark and sub-view are meant for one restore, read via a lazy
  // initializer, the one above for activeId and BookmarkPageBody's own for the sub-view.
  // Clearing after every switch rather than only on the initial mount stops a later switch
  // away and back, which remounts BookmarkPageBody per key={active.id} below, from restoring
  // a stale sub-view. Covers both the flow-restore case, where the screen remounts and this
  // fires once, and OverviewBookmark's section links below, where the screen stays mounted
  // and only activeId changes, which is why the effect keys off it.
  // react-doctor-disable-next-line no-prop-callback-in-effect, no-pass-live-state-to-parent
  useEffect(() => { actions.clearRestoredBookmark(); }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filled = isBookmarkFilled(active.id, character, mounted);
  const ContentComponent = active.id === "overview" || active.id === "setup" || active.id === "gender_marriage" || active.id === "stats" || active.id === "equipment" || active.id === "v_matrix" || active.id === "hexa_matrix" || active.id === "familiars" || active.id === "exp" || active.id === "scouter" || active.id === "efficiency" ? null : BOOKMARK_CONTENT[active.id];

  function startOptionalFlowRemembered(flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean, subView?: string) {
    actions.rememberActiveBookmark(active.id, subView);
    actions.startOptionalFlow(flowId, targetSubstep, confineToSubstep);
  }

  function handleEdit() {
    if (active.flowId) startOptionalFlowRemembered(active.flowId);
  }

  // Lets Overview's section links, such as HEXA Stat jumping to the HEXA bookmark, switch tabs
  // and, unlike a plain setActiveId, also seed the target bookmark's sub-view state through the
  // same remembered-bookmark mechanism startOptionalFlowRemembered uses for flow restores. Safe
  // to reuse because the clear effect above keys off activeId rather than firing once on mount.
  function navigateToBookmark(id: BookmarkId, subView?: string) {
    actions.rememberActiveBookmark(id, subView);
    setActiveId(id);
  }

  // Same navigation as above, plus which Gear slot to scroll to and flash once the
  // Equipment bookmark mounts (see EquipmentBookmark's own highlightSlotKey effect).
  const [highlightSlotKey, setHighlightSlotKey] = useState<SlotKey | null>(null);
  function navigateToGearSlot(slotKey: SlotKey) {
    setHighlightSlotKey(slotKey);
    navigateToBookmark("equipment", "gear");
  }

  return (
    <div className={`profile-binder${model.setup.isDeleteTransitioning ? " profile-binder-closing" : ""}`}>
      <div
        className="profile-binder-page"
        role="tabpanel"
        id={`profile-page-${active.id}`}
        aria-labelledby={`profile-tab-${active.id}`}
        tabIndex={0}
      >
        <div key={active.id} className="profile-binder-page-content">
          <BookmarkPageBody
            model={model}
            actions={actions}
            active={active}
            filled={filled}
            ContentComponent={ContentComponent}
            onEdit={handleEdit}
            onEditStep={startOptionalFlowRemembered}
            onNavigateToBookmark={navigateToBookmark}
            onNavigateToGearSlot={navigateToGearSlot}
            highlightSlotKey={highlightSlotKey}
            onHighlightSlotConsumed={() => setHighlightSlotKey(null)}
          />
        </div>
      </div>
      <BookmarkSpine theme={theme} bookmarks={bookmarks} activeId={active.id} onSelect={setActiveId} charName={character?.characterName} />
    </div>
  );
}
