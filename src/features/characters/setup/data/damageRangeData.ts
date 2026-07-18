// Damage Range calculation (strategywiki, confirmed exact against real characters):
//   UpperActual = round(Multiplier × StatValue × TotalJobATT / 100)
//   LowerActual = round(UpperActual × Mastery% / 100)
//   UpperShown  = floor(UpperActual × (1+Damage%/100) × (1+Final%/100))
//   LowerShown  = floor(1 + LowerActual × (1+Damage%/100) × (1+Final%/100))
// Multiplier/TotalJobATT-stat sourced from maplestorywiki.net/w/Damage_Formula, cross-checked
// against strategywiki and real characters (see damageRangeData.generated.ts + project memory for
// the Xenon correction: its own in-game tooltip is wrong, verified 1.3125 not the displayed 1.50).
import type { StoredCharacterStats, StoredTripleStatField, StoredFamiliarsData } from "../../model/charactersStore";
import { CLASS_SKILL_DATA } from "./classSkillData";
import { resolveMasteryPercent } from "./masteryData";
import { resolveFinalDamagePercent } from "./finalDamageData";
import { WEAPON_MULTIPLIER, WEAPON_MULTIPLIER_BY_HAND, MAGIC_ATT_CLASSES } from "./damageRangeData.generated";
import type { ComboOrdersTier } from "./comboOrdersData";
import { familiarStatBonuses, type FamiliarStatBonus } from "./familiarsData";
import { isRebootWorld, rebootFinalDamageBonusPercent } from "./rebootData";

// Familiar stat lines (e.g. a unique-tier "INT: +6%") never appear in the Character Info stat
// tooltip's own Base Value/% Value breakdown, but they're real — see familiarStatBonuses in
// familiarsData.ts. Basic Stats already folds this in; StatValue needs the same treatment or
// Damage Range silently undershoots for any character with an active INT/STR/DEX/LUK/HP-boosting
// familiar line (confirmed 2026-07-18 against a real character: a missing +6% INT familiar line
// alone accounted for the entire remaining gap between computed and real Damage Range).
function tripleStatValue(field: StoredTripleStatField | undefined, familiarBonus?: FamiliarStatBonus): number {
  if (!field?.base) return 0;
  const base = (Number(field.base) || 0) + (familiarBonus?.flat ?? 0);
  const percent = (Number(field.percent) || 0) + (familiarBonus?.percent ?? 0);
  const percentUnapplied = Number(field.percentUnapplied) || 0;
  return Math.floor(base * (1 + percent / 100)) + percentUnapplied;
}

function resolveWeaponMultiplier(classId: string, weaponHand: "1h" | "2h" | undefined): number | undefined {
  const byHand = WEAPON_MULTIPLIER_BY_HAND[classId];
  if (byHand) return weaponHand === "2h" ? byHand["2h"] : byHand["1h"];
  return WEAPON_MULTIPLIER[classId];
}

// strategywiki: Demon Avenger's Pure HP, 4th job and beyond, assuming all AP is invested into HP
// (the standard build — HP is Demon Avenger's entire damage stat, unlike every other class):
// 545 + 90×Level. Not read from any in-game UI field — Nexon doesn't expose Pure HP directly (the
// Character Info HP tooltip only shows the generic Base/%/Not Applied breakdown, confirmed 2026-07-18
// against a real screenshot), this level-derived formula is the only way to get it.
function demonAvengerPureHp(level: number): number {
  return 545 + 90 * level;
}

// StatValue's primary/secondary stat roles derived from a class's own requiredStats order, which
// already matches strategywiki's Primary/Secondary Stat table exactly (verified 2026-07-18): a
// 2-stat class is [primary, secondary]; the 3-stat "luk,dex,str" shape (Dual Blade/Shadower/Cadena)
// is primary LUK + secondary DEX+STR. Xenon (str,dex,luk, no secondary) and Demon Avenger (hp,str,
// its own formula) are handled as special cases in computeDamageRange, not here.
function resolveStatValue(classId: string, stats: StoredCharacterStats, familiarBonus: ReturnType<typeof familiarStatBonuses>): number | undefined {
  const classData = CLASS_SKILL_DATA.find((c) => c.id === classId);
  const required = classData?.requiredStats.filter((id) => id !== "attackPower" && id !== "magicAtt");
  if (!required || required.length === 0) return undefined;

  const value = (id: string): number => {
    if (id === "str") return tripleStatValue(stats.str, familiarBonus.str);
    if (id === "dex") return tripleStatValue(stats.dex, familiarBonus.dex);
    if (id === "int") return tripleStatValue(stats.int, familiarBonus.int);
    if (id === "luk") return tripleStatValue(stats.luk, familiarBonus.luk);
    return 0;
  };

  if (required.length === 2) {
    const [primary, secondary] = required;
    return value(primary) * 4 + value(secondary);
  }
  if (required.length === 3 && required[0] === "luk" && required[1] === "dex" && required[2] === "str") {
    return value("luk") * 4 + (value("dex") + value("str"));
  }
  return undefined;
}

export interface DamageRangeResult {
  lower: number;
  upper: number;
}

export function computeDamageRange(
  classId: string | undefined,
  level: number | undefined,
  weaponHand: "1h" | "2h" | undefined,
  isLiberated: boolean | null | undefined,
  stats: StoredCharacterStats | undefined,
  tier: ComboOrdersTier,
  familiars: StoredFamiliarsData | undefined,
  worldId: number | undefined,
  hasRuinForceShield?: boolean | null,
): DamageRangeResult | undefined {
  if (!classId || !stats || level === undefined) return undefined;

  const multiplier = resolveWeaponMultiplier(classId, weaponHand);
  const rebootBonusPercent = isRebootWorld(worldId) ? rebootFinalDamageBonusPercent(level) : 0;
  const finalDamagePercent = resolveFinalDamagePercent(classId, isLiberated ?? undefined, tier, rebootBonusPercent, hasRuinForceShield ?? false);
  const masteryPercent = resolveMasteryPercent(classId, weaponHand, tier);
  if (multiplier === undefined || finalDamagePercent === undefined || masteryPercent === undefined) return undefined;

  const familiarBonus = familiarStatBonuses(familiars);

  let statValue: number;
  if (classId === "demon_avenger") {
    const hp = tripleStatValue(stats.hp, familiarBonus.hp);
    const pureHp = demonAvengerPureHp(level);
    statValue = Math.floor(pureHp / 3.5) + 0.8 * Math.floor((hp - pureHp) / 3.5) + tripleStatValue(stats.str, familiarBonus.str);
  } else if (classId === "xenon") {
    statValue = 4 * (tripleStatValue(stats.str, familiarBonus.str) + tripleStatValue(stats.dex, familiarBonus.dex) + tripleStatValue(stats.luk, familiarBonus.luk));
  } else {
    const resolved = resolveStatValue(classId, stats, familiarBonus);
    if (resolved === undefined) return undefined;
    statValue = resolved;
  }

  const totalJobAtt = MAGIC_ATT_CLASSES.includes(classId) ? tripleStatValue(stats.magicAtt) : tripleStatValue(stats.attackPower);
  const damagePercent = Number(stats.damage) || 0;

  const upperActual = Math.round((multiplier * statValue * totalJobAtt) / 100);
  if (upperActual === 0) return undefined;
  const lowerActual = Math.round((upperActual * masteryPercent) / 100);

  const upperShown = Math.floor(upperActual * (1 + damagePercent / 100) * (1 + finalDamagePercent / 100));
  const lowerShown = Math.floor(1 + lowerActual * (1 + damagePercent / 100) * (1 + finalDamagePercent / 100));

  return { lower: lowerShown, upper: upperShown };
}
