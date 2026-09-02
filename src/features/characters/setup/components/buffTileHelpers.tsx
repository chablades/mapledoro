import type { CSSProperties, ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import {
  primaryStatForClass,
  extremePotionIconId, extremePotionLabel, heroEchoSkillId, heroEchoName,
  isHurricaneClass, EXTREME_GREEN_POTION_ITEM_ID,
  type BoolBuffId, type BoolBuffEntry, type StatId, type BoolBuffIconType,
} from "../data/buffsData";

// Split out of BuffsSetupStep.tsx so that file can stay component-exports-only
// (only-export-components -- a non-component export there defeats Fast Refresh). Used by
// BuffsSetupStep.tsx's own tile rendering and ScouterSimulatorDialog.tsx's condensed Buffs tab.

export const boolTileStyle = (active: boolean, theme: AppTheme): CSSProperties => ({
  width: 52, height: 52, flexShrink: 0,
  border: `1px solid ${active ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: active ? `${theme.accent}15` : theme.bg,
  cursor: "pointer", padding: 0, lineHeight: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
});

export const renownInputStyle = (theme: AppTheme, active: boolean): CSSProperties => ({
  width: 40, textAlign: "center",
  border: `1px solid ${active ? theme.accent : theme.border}`,
  borderRadius: 6,
  background: active ? `${theme.accent}10` : theme.bg,
  color: theme.text,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
  padding: "0.2rem", boxSizing: "border-box",
});

export const pickOneGroupStyle = (theme: AppTheme): CSSProperties => ({
  position: "relative",
  display: "flex", gap: 8, flexWrap: "wrap",
  border: `1px dashed ${theme.border}`,
  borderRadius: 8, padding: "6px 6px 4px",
  marginTop: 6,
});

export const pickOneLabelStyle = (theme: AppTheme): CSSProperties => ({
  position: "absolute", top: -9, left: 8,
  fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.04em", color: theme.muted,
  background: theme.bg, padding: "0 4px",
});

// A couple of bool buffs swap their catalog icon for a class/stat-specific one.
export function buffIconOverride(id: BoolBuffId, primaryStat: StatId, jobName: string): BoolBuffIconType | undefined {
  if (id === "extremePotion") return { kind: "item", id: extremePotionIconId(primaryStat) };
  if (id === "heroEcho") return { kind: "skill", id: heroEchoSkillId(jobName) };
  return undefined;
}

// Non-Hurricane classes get Extreme Green Potion layered onto the Extreme Potion tile instead of
// their own separate tile — see isHurricaneClass.
export function buffSecondIconOverride(id: BoolBuffId, jobName: string): BoolBuffIconType | undefined {
  if (id === "extremePotion" && !isHurricaneClass(jobName)) return { kind: "item", id: EXTREME_GREEN_POTION_ITEM_ID };
  return undefined;
}

function sparklingRedStarTooltip(theme: AppTheme): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>Sparkling Red Star Potion</span>
      <span style={{ color: statusText(theme, "danger"), paddingLeft: "0.6em", fontStyle: "italic" }}>cannot be used with Blue Star Potion</span>
      <span style={{ opacity: 0.6, color: theme.muted }}>or</span>
      <span>Advanced Boss Rush Boost Potion</span>
      <span style={{ opacity: 0.7 }}>+20% Boss DMG</span>
    </div>
  );
}

function fishBuffTooltip(theme: AppTheme): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>Tree Ornament</span>
      <span style={{ opacity: 0.6, color: theme.muted }}>or</span>
      <span>A Flurry of Snow</span>
      <span style={{ opacity: 0.6, color: theme.muted }}>or</span>
      <span>Warm and Fuzzy Winter</span>
      <span style={{ opacity: 0.7 }}>+30 ATT/Magic ATT</span>
    </div>
  );
}

function extremePotionMergedTooltip(theme: AppTheme, primaryStat: StatId): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>{extremePotionLabel(primaryStat)}</span>
      <span style={{ opacity: 0.6, color: theme.muted }}>and</span>
      <span>Extreme Green Potion</span>
    </div>
  );
}

export function boolBuffLabel(id: BoolBuffEntry["id"], primaryStat: ReturnType<typeof primaryStatForClass>, theme: AppTheme, jobName: string): ReactNode | undefined {
  if (id === "heroEcho") return heroEchoName(jobName);
  if (id === "extremePotion") return isHurricaneClass(jobName) ? extremePotionLabel(primaryStat) : extremePotionMergedTooltip(theme, primaryStat);
  if (id === "sparklingRedStar") return sparklingRedStarTooltip(theme);
  if (id === "fishBuff") return fishBuffTooltip(theme);
  if (id === "genepass") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>Power of the Adversary</span>
      <span style={{ opacity: 0.7, color: theme.muted }}>Buff from the Genesis Pass, only applies to Arcane River bosses</span>
    </div>
  );
  if (id === "maxedSacredSymbol") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>Lv. 11 Sacred Symbols</span>
      <span style={{ opacity: 0.7, color: theme.muted }}>+20% DMG vs. each region&apos;s boss</span>
    </div>
  );
  return undefined;
}
