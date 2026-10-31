import type { CSSProperties, ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import {
  BOOL_BUFFS, primaryStatForClass, getStatPotionTiers, statAbbrev,
  extremePotionIconId, extremePotionLabel, heroEchoSkillId, heroEchoName,
  isHurricaneClass, EXTREME_GREEN_POTION_ITEM_ID,
  type BoolBuffId, type BoolBuffEntry, type StatId, type BoolBuffIconType,
} from "../data/buffsData";
import { CLASS_SKILL_DATA } from "../data/classSkillData";

// Split out of BuffsSetupStep.tsx so that file can stay component-exports-only
// under only-export-components, since a non-component export there defeats Fast Refresh. Used by
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
// their own separate tile. See isHurricaneClass.
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

function extremePotionMergedTooltip(theme: AppTheme, primaryStat: StatId, effect: string): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>{extremePotionLabel(primaryStat)}</span>
      <span style={{ opacity: 0.6, color: theme.muted }}>and</span>
      <span>Extreme Green Potion</span>
      <span style={{ opacity: 0.7 }}>{effect}</span>
    </div>
  );
}

// Each buff's bossing-relevant effect as its own in-game text gives it (HP, MP, DEF and Speed
// left out), shown under its name on hover. Some differ from what the Scouter engine counts:
// Sayram's and Collector's Elixir last 15 and 8 minutes and give way to some class buffs, so the
// engine counts less. Buffs with their own tooltip function below aren't listed here.
const BUFF_EFFECTS: Partial<Record<BoolBuffId, string>> = {
  candiedApple: "+7 All Stats",
  sayramElixir: "+50 ATT/Magic ATT, +10% ATT/Magic ATT, +10% Boss DMG, +16% Crit DMG, +20% Crit Rate",
  collectorElixir: "+100 ATT/Magic ATT, +30 All Stats, +2 Skill Levels",
  honorableElixir: "+60 ATT/Magic ATT",
  extremeGreenPotion: "+1 Attack Speed",
  brightMoonlight: "+20 ATT/Magic ATT",
  legionMight: "+30 ATT/Magic ATT",
  masarayuGift: "+30 ATT/Magic ATT",
  // 10% to 15% by house level; the engine counts the top, as MapleScouter does.
  caretakerSupport: "+15% Boss DMG at the top house level",
  vipBuff: "+15 All Stats, +15 ATT/Magic ATT, +15% Ignore DEF, +15% Boss DMG",
  mvpSuperpower: "+30 ATT/Magic ATT",
  believeInYourself: "+20 ATT/Magic ATT",
  // Its own description says +10, a known error (MapleStory Wiki).
  gourmandPower: "+30 ATT/Magic ATT",
  enlightenedOne: "+5 ATT/Magic ATT for 5 min, once per fight",
  peerlessMarble: "+30 All Stats, ATT/Magic ATT",
  sparklingBlueStar: "+20% Ignore DEF",
  greatHeroBoost: "+10% DMG",
  legendaryHero: "+30 ATT/Magic ATT",
  advWeaponTempering: "+5% Crit DMG",
  ssiwsCheese: "+220 Magic ATT for 2 min, once per fight",
  onyxApple: "+100 ATT/Magic ATT",
  witchStew: "+40 ATT/Magic ATT",
  energizerDrink: "+25 ATT",
  energizerDrinkMagic: "+30 Magic ATT",
  attackPotionV: "+10 ATT",
};

// Max HP from these, only for Demon Avenger, whose damage scales with it (as its in-game text
// gives it; the Scouter engine time-averages the elixirs).
const DEMON_AVENGER_HP: Partial<Record<BoolBuffId, number>> = {
  sayramElixir: 1750, collectorElixir: 400, vipBuff: 1500, brightMoonlight: 2000, extremePotion: 2000, genepass: 1000,
};

/** `effect`, plus the buff's Max HP for a Demon Avenger. */
function withDemonAvengerHp(effect: string, id: BoolBuffId, jobName: string): string {
  const hp = jobName === "Demon Avenger" ? DEMON_AVENGER_HP[id] : undefined;
  return hp === undefined ? effect : `${effect}, +${hp.toLocaleString("en-US")} Max HP`;
}

/** The Advanced Stat Potion tile's tooltip, for the Buffs step and the Scouter Simulator alike:
 *  the Tier X potion (or its pill) for each of the class's main stats, then their +30. */
export function statPotionTooltip(theme: AppTheme, stats: StatId[]): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {stats.flatMap((s) => {
        const t = getStatPotionTiers(s)[9];
        return [
          <span key={`${s}-potion`}>{t.name}</span>,
          <span key={`${s}-pill`} style={{ opacity: 0.6, color: theme.muted, paddingLeft: "0.6em" }}>or {t.pillName}</span>,
        ];
      })}
      <span style={{ opacity: 0.7 }}>+30 {stats.map(statAbbrev).join(", ")}</span>
    </div>
  );
}

/** A buff's name over its effect, the same shape as the multi-item tooltips. */
function namedEffectTooltip(name: string, effect: string): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>{name}</span>
      <span style={{ opacity: 0.7 }}>{effect}</span>
    </div>
  );
}

/** A tile standing for several items with the same effect: their names joined by "or", then the
 *  effect, the same shape as fishBuffTooltip. */
function sameEffectTooltip(theme: AppTheme, names: string[], effect: string): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {names.flatMap((name, i) => [
        ...(i > 0 ? [<span key={`or-${name}`} style={{ opacity: 0.6, color: theme.muted }}>or</span>] : []),
        <span key={name}>{name}</span>,
      ])}
      <span style={{ opacity: 0.7 }}>{effect}</span>
    </div>
  );
}

/** The tooltips that depend on the class: which items a tile stands for, or its attack type. */
function classTileLabel(id: BoolBuffEntry["id"], primaryStat: StatId, theme: AppTheme, jobName: string): ReactNode | undefined {
  // Cider raises only ATT, so it only stands in for Tengu's Judgement on a physical class.
  if (id === "tengusJudgement") {
    const magic = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName)?.requiredStats.includes("magicAtt") ?? false;
    return sameEffectTooltip(theme, ["Tengu's Judgement", "Cold Winter Energy", ...(magic ? [] : ["Cider"])], magic ? "+20 Magic ATT" : "+20 ATT");
  }
  if (id === "heroEcho") return namedEffectTooltip(heroEchoName(jobName), "+4% ATT/Magic ATT");
  if (id === "extremePotion") {
    const att = withDemonAvengerHp(primaryStat === "int" ? "+30 Magic ATT" : "+30 ATT", id, jobName);
    return isHurricaneClass(jobName) ? namedEffectTooltip(extremePotionLabel(primaryStat), att) : extremePotionMergedTooltip(theme, primaryStat, `${att}, +1 Attack Speed`);
  }
  return undefined;
}

export function boolBuffLabel(id: BoolBuffEntry["id"], primaryStat: ReturnType<typeof primaryStatForClass>, theme: AppTheme, jobName: string): ReactNode | undefined {
  const classLabel = classTileLabel(id, primaryStat, theme, jobName);
  if (classLabel) return classLabel;
  if (id === "magicPotionV") return sameEffectTooltip(theme, ["Yakisoba", "Advanced Magic Potion V"], "+10 Magic ATT");
  if (id === "sparklingRedStar") return sparklingRedStarTooltip(theme);
  if (id === "fishBuff") return fishBuffTooltip(theme);
  const effect = BUFF_EFFECTS[id];
  if (effect) return namedEffectTooltip(BOOL_BUFFS.find((b) => b.id === id)?.name ?? id, withDemonAvengerHp(effect, id, jobName));
  // Its stats as the Scouter engine applies them (genePassBoost in scouterLocal.ts).
  if (id === "genepass") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>Power of the Adversary</span>
      <span style={{ opacity: 0.7 }}>{withDemonAvengerHp("+20 All Stats, +20 ATT/Magic ATT, +10% Boss DMG, +10% Ignore DEF, +150 Arcane Power", id, jobName)}</span>
      <span style={{ opacity: 0.7, color: theme.muted }}>Buff from the Genesis Pass, applies to Arcane River bosses, Lotus and Damien</span>
    </div>
  );
  return undefined;
}
