/*
  Single source of truth for MapleStory class data shared across guides.
  Both the New Players Guide and the Character Guides import from here.
  Portraits sourced from Nexon CDN via classPortraits.ts.
*/

import React from "react";
import { classPortraitUrl } from "../../../lib/classPortraits";

/* ── Types ────────────────────────────────────────────────────── */

export type Difficulty = "Easy" | "Normal" | "Hard";
export type ClassType = "Warrior" | "Mage" | "Archer" | "Thief" | "Pirate";

export interface ClassEntry {
  name: string;
  slug: string;
  region: string;
  classType: ClassType;
  summary: string;
  difficulty: Difficulty;
  link: string;
  linkSkillName: string;
  linkSkillIcon: string;
  legion: string;
  portrait: string;
}

/* ── Link skill icon URLs (sourced from MapleStory Wiki CDN) ──── */

const CDN = "https://media.maplestorywiki.net/yetidb/";

function ls(skillName: string, iconOverride?: string): { linkSkillName: string; linkSkillIcon: string } {
  const icon = iconOverride
    ?? `${CDN}Skill_${skillName.replace(/ /g, "_").replace(/'/g, "%27")}.png`;
  return { linkSkillName: skillName, linkSkillIcon: icon };
}

const LINK_SKILLS = {
  invincibleBelief:        ls("Invincible Belief"),
  empiricalKnowledge:      ls("Empirical Knowledge"),
  adventurersCuriosity:    ls("Adventurer's Curiosity"),
  thiefsCunning:           ls("Thief's Cunning"),
  pirateBlesssing:         ls("Pirate Blessing"),
  cygnusBlessing:          ls("Cygnus Blessing"),
  knightsWatch:            ls("Knight's Watch"),
  comboKillBlessing:       ls("Combo Kill Blessing"),
  runePersistence:         ls("Rune Persistence"),
  elvenBlessing:           ls("Elven Blessing", `${CDN}Skill_Elven_Blessing_%28Linked%29.png`),
  phantomInstinct:         ls("Phantom Instinct"),
  lightWash:               ls("Light Wash"),
  closeCall:               ls("Close Call"),
  spiritOfFreedom:         ls("Spirit of Freedom"),
  hybridLogic:             ls("Hybrid Logic"),
  furyUnleashed:           ls("Fury Unleashed"),
  wildRage:                ls("Wild Rage"),
  ironWill:                ls("Iron Will"),
  termsAndConditions:      ls("Terms and Conditions"),
  unfairAdvantage:         ls("Unfair Advantage"),
  timeToComplete:          ls("Time to Prepare"),
  rhinnesBlessing:         ls("Rhinne's Blessing"),
  judgment:                ls("Judgment", `${CDN}Skill_Judgment_%28Kinesis%29.png`),
  nobleFire:               ls("Noble Fire"),
  tideOfBattle:            ls("Tide of Battle"),
  innateGift:              ls("Innate Gift"),
  solus:                   ls("Solus"),
  naturesFriend:           ls("Nature's Friend"),
  bravado:                 ls("Bravado"),
  groundedBody:            ls("Grounded Body"),
  moonlitBladeLearnings:   ls("Moonlit Blade Learnings"),
  elementalism:            ls("Elementalism"),
  focusSpirit:             ls("Focus Spirit", `${CDN}Skill_Spirit_Guide_Blessing.png`),
  qiCultivation:           ls("Qi Cultivation"),
  treeOfStars:             ls("Tree of Stars"),
};

/* ── Shared display utilities ─────────────────────────────────── */

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "#2d8a2d",
  Normal: "#c49a2a",
  Hard: "#c44040",
};

const NUM_BLUE = "#4a9eff";

/** Highlight numbers and "Lv" prefixes in blue for readability. */
export function highlightNumbers(text: string): React.ReactNode[] {
  const parts = text.split(/(Lv\d+|\+?\-?\d[\d,.]*%?s?)/g);
  return parts.map((part, i) =>
    /\d/.test(part) || /^Lv/.test(part)
      ? React.createElement("span", { key: i, style: { color: NUM_BLUE, fontWeight: 700 } }, part)
      : React.createElement("span", { key: i }, part),
  );
}

/* ── Slug helpers ─────────────────────────────────────────────── */

function classSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()\/]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ── Regions (display order) ──────────────────────────────────── */

export const CLASS_REGIONS = [
  "Explorers",
  "Cygnus Knights",
  "Heroes of Maple",
  "Resistance",
  "Demons",
  "Nova",
  "Flora",
  "Anima",
  "Other",
  "Sengoku",
  "Jianghu",
  "Shine",
] as const;

export const CLASS_TYPES: ClassType[] = ["Warrior", "Mage", "Archer", "Thief", "Pirate"];

/* ── Class data ───────────────────────────────────────────────── */

const LINK_SKILL_MAP: Record<string, { linkSkillName: string; linkSkillIcon: string }> = {
  "Hero":                       LINK_SKILLS.invincibleBelief,
  "Paladin":                    LINK_SKILLS.invincibleBelief,
  "Dark Knight":                LINK_SKILLS.invincibleBelief,
  "Arch Mage (Fire/Poison)":    LINK_SKILLS.empiricalKnowledge,
  "Arch Mage (Ice/Lightning)":  LINK_SKILLS.empiricalKnowledge,
  "Bishop":                     LINK_SKILLS.empiricalKnowledge,
  "Bow Master":                 LINK_SKILLS.adventurersCuriosity,
  "Marksman":                   LINK_SKILLS.adventurersCuriosity,
  "Pathfinder":                 LINK_SKILLS.adventurersCuriosity,
  "Night Lord":                 LINK_SKILLS.thiefsCunning,
  "Shadower":                   LINK_SKILLS.thiefsCunning,
  "Dual Blade":                 LINK_SKILLS.thiefsCunning,
  "Corsair":                    LINK_SKILLS.pirateBlesssing,
  "Cannoneer":                  LINK_SKILLS.pirateBlesssing,
  "Buccaneer":                  LINK_SKILLS.pirateBlesssing,
  "Dawn Warrior":               LINK_SKILLS.cygnusBlessing,
  "Blaze Wizard":               LINK_SKILLS.cygnusBlessing,
  "Wind Archer":                LINK_SKILLS.cygnusBlessing,
  "Night Walker":               LINK_SKILLS.cygnusBlessing,
  "Thunder Breaker":            LINK_SKILLS.cygnusBlessing,
  "Mihile":                     LINK_SKILLS.knightsWatch,
  "Aran":                       LINK_SKILLS.comboKillBlessing,
  "Evan":                       LINK_SKILLS.runePersistence,
  "Mercedes":                   LINK_SKILLS.elvenBlessing,
  "Phantom":                    LINK_SKILLS.phantomInstinct,
  "Luminous":                   LINK_SKILLS.lightWash,
  "Shade":                      LINK_SKILLS.closeCall,
  "Battle Mage":                LINK_SKILLS.spiritOfFreedom,
  "Wild Hunter":                LINK_SKILLS.spiritOfFreedom,
  "Mechanic":                   LINK_SKILLS.spiritOfFreedom,
  "Blaster":                    LINK_SKILLS.spiritOfFreedom,
  "Xenon":                      LINK_SKILLS.hybridLogic,
  "Demon Slayer":               LINK_SKILLS.furyUnleashed,
  "Demon Avenger":              LINK_SKILLS.wildRage,
  "Kaiser":                     LINK_SKILLS.ironWill,
  "Angelic Buster":             LINK_SKILLS.termsAndConditions,
  "Cadena":                     LINK_SKILLS.unfairAdvantage,
  "Kain":                       LINK_SKILLS.timeToComplete,
  "Illium":                     LINK_SKILLS.tideOfBattle,
  "Ark":                        LINK_SKILLS.solus,
  "Adele":                      LINK_SKILLS.nobleFire,
  "Khali":                      LINK_SKILLS.innateGift,
  "Hoyoung":                    LINK_SKILLS.bravado,
  "Lara":                       LINK_SKILLS.naturesFriend,
  "Ren":                        LINK_SKILLS.groundedBody,
  "Zero":                       LINK_SKILLS.rhinnesBlessing,
  "Kinesis":                    LINK_SKILLS.judgment,
  "Hayato":                     LINK_SKILLS.moonlitBladeLearnings,
  "Kanna":                      LINK_SKILLS.elementalism,
  "Lynn":                       LINK_SKILLS.focusSpirit,
  "Mo Xuan":                    LINK_SKILLS.qiCultivation,
  "Sia Astelle":                LINK_SKILLS.treeOfStars,
};

const RAW_CLASSES: Omit<ClassEntry, "slug" | "portrait" | "linkSkillName" | "linkSkillIcon">[] = [
  // ── Explorers ──
  { name: "Hero", region: "Explorers", classType: "Warrior", summary: "Warrior who wields greatswords with powerful combo attacks.", difficulty: "Easy", link: "Invincible Belief: Restores Max HP every 1s for 3s. [Lv1: 20% HP, CD 410s | Lv2: 23%, CD 370s | Lv3: 26%, CD 330s | Lv4: 29%, CD 290s | Lv5: 32%, CD 250s | Lv6: 35%, CD 210s | Lv7: 38%, CD 170s | Lv8: 41%, CD 130s | Lv9: 44%, CD 90s]", legion: "STR +10/20/40/80/100" },
  { name: "Paladin", region: "Explorers", classType: "Warrior", summary: "Holy warrior with elemental charges and high survivability.", difficulty: "Easy", link: "Invincible Belief: Restores Max HP every 1s for 3s. [Lv1: 20% HP, CD 410s | Lv2: 23%, CD 370s | Lv3: 26%, CD 330s | Lv4: 29%, CD 290s | Lv5: 32%, CD 250s | Lv6: 35%, CD 210s | Lv7: 38%, CD 170s | Lv8: 41%, CD 130s | Lv9: 44%, CD 90s]", legion: "STR +10/20/40/80/100" },
  { name: "Dark Knight", region: "Explorers", classType: "Warrior", summary: "Spear-wielding warrior who sacrifices HP for devastating power.", difficulty: "Easy", link: "Invincible Belief: Restores Max HP every 1s for 3s. [Lv1: 20% HP, CD 410s | Lv2: 23%, CD 370s | Lv3: 26%, CD 330s | Lv4: 29%, CD 290s | Lv5: 32%, CD 250s | Lv6: 35%, CD 210s | Lv7: 38%, CD 170s | Lv8: 41%, CD 130s | Lv9: 44%, CD 90s]", legion: "Max HP +2/3/4/5/6%" },
  { name: "Arch Mage (Fire/Poison)", region: "Explorers", classType: "Mage", summary: "Mage specializing in fire and poison DoT magic.", difficulty: "Normal", link: "Empirical Knowledge: Chance to identify enemy weakness, granting +Damage and +IED per stack. [Lv1: 15% chance, +1% | Lv2: 17%, +1% | Lv3: 19%, +2% | Lv4: 21%, +2% | Lv5: 23%, +3% | Lv6: 25%, +3% | Lv7: 27%, +4% | Lv8: 29%, +4% | Lv9: 31%, +5%]", legion: "Max MP +2/3/4/5/6%" },
  { name: "Arch Mage (Ice/Lightning)", region: "Explorers", classType: "Mage", summary: "Mage specializing in ice and lightning AoE spells.", difficulty: "Normal", link: "Empirical Knowledge: Chance to identify enemy weakness, granting +Damage and +IED per stack. [Lv1: 15% chance, +1% | Lv2: 17%, +1% | Lv3: 19%, +2% | Lv4: 21%, +2% | Lv5: 23%, +3% | Lv6: 25%, +3% | Lv7: 27%, +4% | Lv8: 29%, +4% | Lv9: 31%, +5%]", legion: "INT +10/20/40/80/100" },
  { name: "Bishop", region: "Explorers", classType: "Mage", summary: "Support mage with healing, buffs, and holy damage.", difficulty: "Normal", link: "Empirical Knowledge: Chance to identify enemy weakness, granting +Damage and +IED per stack. [Lv1: 15% chance, +1% | Lv2: 17%, +1% | Lv3: 19%, +2% | Lv4: 21%, +2% | Lv5: 23%, +3% | Lv6: 25%, +3% | Lv7: 27%, +4% | Lv8: 29%, +4% | Lv9: 31%, +5%]", legion: "INT +10/20/40/80/100" },
  { name: "Bow Master", region: "Explorers", classType: "Archer", summary: "Archer who rains down arrows with blazing speed.", difficulty: "Normal", link: "Adventurer's Curiosity: Increases Critical Rate and Monster Collection chance. [Lv1: +3% Crit, +10% Collection | Lv2: +4%, +15% | Lv3: +6%, +20% | Lv4: +7%, +25% | Lv5: +9%, +30% | Lv6: +10%, +35% | Lv7: +12%, +40% | Lv8: +13%, +45% | Lv9: +15%, +50%]", legion: "DEX +10/20/40/80/100" },
  { name: "Marksman", region: "Explorers", classType: "Archer", summary: "Sniper archer with long-range, high-damage precision shots.", difficulty: "Normal", link: "Adventurer's Curiosity: Increases Critical Rate and Monster Collection chance. [Lv1: +3% Crit, +10% Collection | Lv2: +4%, +15% | Lv3: +6%, +20% | Lv4: +7%, +25% | Lv5: +9%, +30% | Lv6: +10%, +35% | Lv7: +12%, +40% | Lv8: +13%, +45% | Lv9: +15%, +50%]", legion: "Critical Rate +1/2/3/4/5%" },
  { name: "Pathfinder", region: "Explorers", classType: "Archer", summary: "Ancient archer who channels relic powers through a bow.", difficulty: "Easy", link: "Adventurer's Curiosity: Increases Critical Rate and Monster Collection chance. [Lv1: +3% Crit, +10% Collection | Lv2: +4%, +15% | Lv3: +6%, +20% | Lv4: +7%, +25% | Lv5: +9%, +30% | Lv6: +10%, +35% | Lv7: +12%, +40% | Lv8: +13%, +45% | Lv9: +15%, +50%]", legion: "DEX +10/20/40/80/100" },
  { name: "Night Lord", region: "Explorers", classType: "Thief", summary: "Throwing-star assassin with massive burst damage.", difficulty: "Normal", link: "Thief's Cunning: Upon debuffing enemy, +Damage for 10s (CD: 20s). [Lv1: +3% | Lv2: +6% | Lv3: +9% | Lv4: +12% | Lv5: +15% | Lv6: +18% | Lv7: +21% | Lv8: +24% | Lv9: +27%]", legion: "Critical Rate +1/2/3/4/5%" },
  { name: "Shadower", region: "Explorers", classType: "Thief", summary: "Dagger-wielding thief who strikes from the shadows.", difficulty: "Normal", link: "Thief's Cunning: Upon debuffing enemy, +Damage for 10s (CD: 20s). [Lv1: +3% | Lv2: +6% | Lv3: +9% | Lv4: +12% | Lv5: +15% | Lv6: +18% | Lv7: +21% | Lv8: +24% | Lv9: +27%]", legion: "LUK +10/20/40/80/100" },
  { name: "Dual Blade", region: "Explorers", classType: "Thief", summary: "Agile dual-wielding thief with flashy combo chains.", difficulty: "Normal", link: "Thief's Cunning: Upon debuffing enemy, +Damage for 10s (CD: 20s). [Lv1: +3% | Lv2: +6% | Lv3: +9% | Lv4: +12% | Lv5: +15% | Lv6: +18% | Lv7: +21% | Lv8: +24% | Lv9: +27%]", legion: "LUK +10/20/40/80/100" },
  { name: "Corsair", region: "Explorers", classType: "Pirate", summary: "Gunslinger pirate with summoned crew and ship cannons.", difficulty: "Normal", link: "Pirate Blessing: +All Stat, +Max HP/MP, -Damage Taken. [Lv1: +20 stat, +350 HP/MP, -5% | Lv2: +30, +525, -7% | Lv3: +40, +700, -9% | Lv4: +50, +875, -11% | Lv5: +60, +1050, -13% | Lv6: +70, +1225, -15% | Lv7: +80, +1400, -17% | Lv8: +90, +1575, -19% | Lv9: +100, +1750, -21%]", legion: "Summon Duration +4/6/8/10/12%" },
  { name: "Cannoneer", region: "Explorers", classType: "Pirate", summary: "Pirate blasting enemies with a massive hand cannon.", difficulty: "Easy", link: "Pirate Blessing: +All Stat, +Max HP/MP, -Damage Taken. [Lv1: +20 stat, +350 HP/MP, -5% | Lv2: +30, +525, -7% | Lv3: +40, +700, -9% | Lv4: +50, +875, -11% | Lv5: +60, +1050, -13% | Lv6: +70, +1225, -15% | Lv7: +80, +1400, -17% | Lv8: +90, +1575, -19% | Lv9: +100, +1750, -21%]", legion: "STR +10/20/40/80/100" },
  { name: "Buccaneer", region: "Explorers", classType: "Pirate", summary: "Brawling pirate who fights with fists and transformation power.", difficulty: "Easy", link: "Pirate Blessing: +All Stat, +Max HP/MP, -Damage Taken. [Lv1: +20 stat, +350 HP/MP, -5% | Lv2: +30, +525, -7% | Lv3: +40, +700, -9% | Lv4: +50, +875, -11% | Lv5: +60, +1050, -13% | Lv6: +70, +1225, -15% | Lv7: +80, +1400, -17% | Lv8: +90, +1575, -19% | Lv9: +100, +1750, -21%]", legion: "STR +10/20/40/80/100" },
  // ── Cygnus Knights ──
  { name: "Dawn Warrior", region: "Cygnus Knights", classType: "Warrior", summary: "Cygnus knight wielding the power of light and dark swords.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "Max HP +250/500/1000/2000/2500" },
  { name: "Blaze Wizard", region: "Cygnus Knights", classType: "Mage", summary: "Cygnus fire mage who controls orbital flames.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "INT +10/20/40/80/100" },
  { name: "Wind Archer", region: "Cygnus Knights", classType: "Archer", summary: "Cygnus archer who commands the power of wind.", difficulty: "Normal", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "DEX +10/20/40/80/100" },
  { name: "Night Walker", region: "Cygnus Knights", classType: "Thief", summary: "Cygnus assassin who strikes from darkness with throwing stars.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "LUK +10/20/40/80/100" },
  { name: "Thunder Breaker", region: "Cygnus Knights", classType: "Pirate", summary: "Cygnus pirate channeling lightning through martial arts.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "STR +10/20/40/80/100" },
  { name: "Mihile", region: "Cygnus Knights", classType: "Warrior", summary: "Cygnus knight with a royal guard shield mechanic.", difficulty: "Hard", link: "Knight's Watch: +100 Status Resistance (CD: 120s). [Lv1: 10s | Lv2: 15s | Lv3: 20s]", legion: "Max HP +250/500/1000/2000/2500" },
  // ── Heroes of Maple ──
  { name: "Aran", region: "Heroes of Maple", classType: "Warrior", summary: "Polearm hero of legend with fast combo attacks.", difficulty: "Easy", link: "Combo Kill Blessing: Combo Kill Marble EXP bonus. [Lv1: +400% | Lv2: +650% | Lv3: +900%]", legion: "70% chance to recover 2/4/6/8/10% Max HP on attack" },
  { name: "Evan", region: "Heroes of Maple", classType: "Mage", summary: "Dragon master who fights alongside the dragon Mir.", difficulty: "Normal", link: "Rune Persistence: Increases Rune duration. [Lv1: +30% | Lv2: +50% | Lv3: +70%]", legion: "70% chance to recover 2/4/6/8/10% Max MP on attack" },
  { name: "Mercedes", region: "Heroes of Maple", classType: "Archer", summary: "Elf queen with dual bowguns and acrobatic combos.", difficulty: "Hard", link: "Elven Blessing: Permanent EXP bonus. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Skill Cooldown -2/3/4/5/6%" },
  { name: "Phantom", region: "Heroes of Maple", classType: "Thief", summary: "Gentleman thief who steals and uses other classes' skills.", difficulty: "Hard", link: "Phantom Instinct: Increases Critical Rate. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Mesos Obtained +1/2/3/4/5%" },
  { name: "Luminous", region: "Heroes of Maple", classType: "Mage", summary: "Mage of light and dark with screen-clearing attacks.", difficulty: "Easy", link: "Light Wash: Ignore Enemy DEF. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "INT +10/20/40/80/100" },
  { name: "Shade", region: "Heroes of Maple", classType: "Pirate", summary: "Lonely spirit fighter with fox spirit powers.", difficulty: "Easy", link: "Close Call: Chance to survive a lethal attack. [Lv1: 5% | Lv2: 10% | Lv3: 15%]", legion: "Critical Damage +1/2/3/5/6%" },
  // ── Resistance ──
  { name: "Battle Mage", region: "Resistance", classType: "Mage", summary: "Resistance mage using a staff in close-range combat with auras.", difficulty: "Normal", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "INT +10/20/40/80/100" },
  { name: "Wild Hunter", region: "Resistance", classType: "Archer", summary: "Resistance archer who rides a jaguar into battle.", difficulty: "Normal", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "20% chance for +4/8/12/16/20% damage on attack" },
  { name: "Mechanic", region: "Resistance", classType: "Pirate", summary: "Resistance engineer piloting a mech suit with gadgets.", difficulty: "Normal", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "Buff Duration +5/10/15/20/25%" },
  { name: "Blaster", region: "Resistance", classType: "Warrior", summary: "Resistance warrior with a massive arm cannon and combo dashes.", difficulty: "Hard", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "IED +1/2/3/5/6%" },
  { name: "Xenon", region: "Resistance", classType: "Thief", summary: "Hybrid thief/pirate android with three stat lines.", difficulty: "Normal", link: "Hybrid Logic: Increases All Stats. [Lv1: +5% | Lv2: +10% | Lv3: +15%]", legion: "STR/DEX/LUK +5/10/20/40/50" },
  // ── Demons ──
  { name: "Demon Slayer", region: "Demons", classType: "Warrior", summary: "Demon warrior using Fury to unleash devastating axe attacks.", difficulty: "Easy", link: "Fury Unleashed: Increases Boss Damage. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Abnormal Status Resistance +1/2/3/4/5" },
  { name: "Demon Avenger", region: "Demons", classType: "Warrior", summary: "Demon who sacrifices HP instead of MP for powerful attacks.", difficulty: "Easy", link: "Wild Rage: Increases Damage. [Lv1: +5% | Lv2: +10% | Lv3: +15%]", legion: "Boss Damage +1/2/3/5/6%" },
  // ── Nova ──
  { name: "Kaiser", region: "Nova", classType: "Warrior", summary: "Dragon warrior who transforms into a powerful dragon form.", difficulty: "Normal", link: "Iron Will: Increases Max HP. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "STR +10/20/40/80/100" },
  { name: "Angelic Buster", region: "Nova", classType: "Pirate", summary: "Magical girl pirate with flashy energy blasts.", difficulty: "Easy", link: "Terms and Conditions: +Damage for 10s. [Lv1: +30%, CD 90s | Lv2: +45%, CD 60s | Lv3: +60%, CD 60s]", legion: "DEX +10/20/40/80/100" },
  { name: "Cadena", region: "Nova", classType: "Thief", summary: "Chain-wielding thief with fast, fluid combo attacks.", difficulty: "Hard", link: "Unfair Advantage: +Damage to weaker and afflicted enemies. [Lv1: +3% each | Lv2: +6% each | Lv3: +9% each]", legion: "LUK +10/20/40/80/100" },
  { name: "Kain", region: "Nova", classType: "Archer", summary: "Archer wielding a malice-infused weapon with transformation skills.", difficulty: "Normal", link: "Time to Prepare: After 8 kills or 5 boss hits, gain stacks; at 5 stacks +Damage (CD: 40s). [Lv1: +9% | Lv2: +17% | Lv3: +25%]", legion: "DEX +10/20/40/80/100" },
  // ── Flora ──
  { name: "Illium", region: "Flora", classType: "Mage", summary: "Mage who commands crystal wings and magical constructs.", difficulty: "Normal", link: "Tide of Battle: +Damage per stack (max 4 stacks, 10s). [Lv1: +2% per stack | Lv2: +3% | Lv3: +4%]", legion: "INT +10/20/40/80/100" },
  { name: "Ark", region: "Flora", classType: "Pirate", summary: "Pirate who channels chaotic flora powers through martial arts.", difficulty: "Normal", link: "Solus: After 5s combat, +1% Damage, +Damage per stack (max 5). [Lv1: +1% per stack | Lv2: +2% | Lv3: +3%]", legion: "STR +10/20/40/80/100" },
  { name: "Adele", region: "Flora", classType: "Warrior", summary: "Knight who summons ethereal swords to fight alongside her.", difficulty: "Easy", link: "Noble Fire: +Boss Damage, +Damage per party member. [Lv1: +2% boss, +1%/member (max +4%) | Lv2: +4%, +2% (max +8%) | Lv3: +6%, +3% (max +12%)]", legion: "STR +10/20/40/80/100" },
  { name: "Khali", region: "Flora", classType: "Thief", summary: "Thief who wields chakrams with swift aerial combos.", difficulty: "Normal", link: "Innate Gift: +Damage; on attack, recover HP/MP for 5s (CD: 30s). [Lv1: +3%, 1% HP/MP | Lv2: +5%, 2% | Lv3: +7%, 3%]", legion: "LUK +10/20/40/80/100" },
  // ── Anima ──
  { name: "Hoyoung", region: "Anima", classType: "Thief", summary: "Sage who uses talismans, clones, and flashy Eastern magic.", difficulty: "Hard", link: "Bravado: +IED, +Damage vs full HP enemies. [Lv1: +5% IED, +9% dmg | Lv2: +10%, +14% | Lv3: +15%, +19%]", legion: "LUK +10/20/40/80/100" },
  { name: "Lara", region: "Anima", classType: "Mage", summary: "Nature mage who channels mountain energy and bell magic.", difficulty: "Normal", link: "Nature's Friend: +Damage; after 20 normal monster kills, +Normal Monster Damage for 30s (CD: 30s). [Lv1: +3%, +7% | Lv2: +5%, +11% | Lv3: +7%, +15%]", legion: "INT +10/20/40/80/100" },
  { name: "Ren", region: "Anima", classType: "Warrior", summary: "Sword-wielding warrior who channels Imugi spirit powers.", difficulty: "Normal", link: "Grounded Body: Reduces damage taken (including %-based). [Lv1: -2% | Lv2: -4% | Lv3: -6%]", legion: "Movement Speed +2/4/6/8/10%" },
  // ── Other ──
  { name: "Zero", region: "Other", classType: "Warrior", summary: "Tag-team duo wielding a sword and lapis — two characters in one.", difficulty: "Hard", link: "Rhinne's Blessing: -Damage Taken, +IED. [Lv1: -3%, +2% | Lv2: -6%, +4% | Lv3: -9%, +6% | Lv4: -12%, +8% | Lv5: -15%, +10% | Lv6: -18%, +12%]", legion: "EXP Obtained +4/6/8/10/12%" },
  { name: "Kinesis", region: "Other", classType: "Mage", summary: "Psychic who hurls objects and controls gravity with telekinesis.", difficulty: "Hard", link: "Judgment: Increases Critical Damage. [Lv1: +2% | Lv2: +4% | Lv3: +6%]", legion: "INT +10/20/40/80/100" },
  // ── Sengoku ──
  { name: "Hayato", region: "Sengoku", classType: "Warrior", summary: "Samurai with quick-draw sword techniques.", difficulty: "Normal", link: "Moonlit Blade Learnings: +Critical Damage (requires 100% Crit Rate and 50%+ Crit Damage). [Lv1: +3% | Lv2: +5% | Lv3: +7%]", legion: "Critical Damage +1/2/3/5/6%" },
  { name: "Kanna", region: "Sengoku", classType: "Mage", summary: "Fox spirit mage with fan-based attacks and Kishin summons.", difficulty: "Normal", link: "Elementalism: After 40 attack skill activations, +Damage for 12s. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Boss Damage +1/2/3/5/6%" },
  // ── Jianghu ──
  { name: "Lynn", region: "Jianghu", classType: "Warrior", summary: "Swordswoman with a unique stance-switching combat system.", difficulty: "Normal", link: "Focus Spirit: +Boss Damage, +Crit Rate, +Max HP/MP. [Lv1: +4% boss, +4% crit, +3% HP/MP | Lv2: +7%, +7%, +4% | Lv3: +10%, +10%, +5%]", legion: "IED +1/2/3/5/6%" },
  { name: "Mo Xuan", region: "Jianghu", classType: "Pirate", summary: "Martial arts pirate with fluid stance-switching and combo chains.", difficulty: "Hard", link: "Qi Cultivation: +Boss Damage; against bosses, +Damage per attack (max 6 stacks). [Lv1: +2%, +1%/stack | Lv2: +4%, +2%/stack | Lv3: +6%, +3%/stack]", legion: "Critical Damage +1/2/3/5/6%" },
  // ── Shine ──
  { name: "Sia Astelle", region: "Shine", classType: "Mage", summary: "Constellation mage who fuses marking skills into powerful stellar attacks.", difficulty: "Normal", link: "Tree of Stars: +Buff Duration, +Critical Damage. [Lv1: +4% duration, +1% crit dmg | Lv2: +7%, +2% | Lv3: +10%, +3%]", legion: "Abnormal Status Damage +1/2/3/5/6%" },
];

export const CLASSES: ClassEntry[] = RAW_CLASSES.map((cls) => ({
  ...cls,
  slug: classSlug(cls.name),
  portrait: classPortraitUrl(cls.name),
  ...(LINK_SKILL_MAP[cls.name] ?? { linkSkillName: cls.name, linkSkillIcon: "" }),
}));

export function findClassBySlug(slug: string): ClassEntry | undefined {
  return CLASSES.find((c) => c.slug === slug);
}
