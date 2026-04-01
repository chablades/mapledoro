"use client";

/*
  New Players Guide page.
  A long-form guide with text sections and images for MapleStory beginners.
*/
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "../../../components/AppShell";
import type { AppTheme } from "../../../components/themes";

/* ── Section data ──────────────────────────────────────────────── */

interface GuideSection {
  id: string;
  title: string;
  /* image path inside /public/guides/new-players/ */
  image?: string;
  imageAlt?: string;
  body: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to MapleStory",
    image: undefined, // e.g. "/guides/new-players/welcome.png"
    imageAlt: "",
    body: `Welcome to MapleStory. MapleStory is a free-to-play 2D side-scrolling MMORPG that has been running since 2003. You play as a character in the Maple World, leveling from 1 all the way to the cap of 300 by fighting monsters, completing quests, and tackling increasingly difficult bosses.

The gameplay loop revolves around dailies, weekly bossing, farming, and gear progression. Each day you'll complete daily quests and bosses to earn resources and strengthen your character. Each week you'll take on harder bosses for mesos and rare drops. In between, you'll farm maps for EXP and mesos, and pour those gains into upgrading your equipment through systems like Star Force, cubing, and flaming.

In this guide, you'll learn how to get started, pick a class, understand the core systems, and begin progressing your character. Whether you're completely new or returning after a long break, this will walk you through the essentials.`,
  },
  {
    id: "choosing-class",
    title: "Choosing Your Class",
    image: undefined,
    imageAlt: "",
    body: `MapleStory has over 50 playable classes, and the best one to pick is whichever one you think looks cool.
    
    Some classes are flashy and fast, others are tanky and methodical. Some have huge mobbing skills that wipe the map, others excel at bossing with high single-target damage. You don't need to commit right away either — making multiple characters is actually encouraged since they provide passive stat boosts to your whole account through the Legion system.

Can't decide? Hit the button below and let fate choose for you.`,
  },
  {
    id: "early-leveling",
    title: "Early Leveling",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
  {
    id: "core-mechanics",
    title: "Core Mechanics",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
  {
    id: "tips",
    title: "Useful Tips",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
];

/* ── Class data for randomizer ─────────────────────────────────── */

type Difficulty = "Easy" | "Normal" | "Hard";

interface MapleClass {
  name: string;
  region: string;
  summary: string;
  difficulty: Difficulty;
  link: string;
  legion: string;
  /** portrait URL — official Nexon CDN art */
  portrait?: string;
}

import { classPortraitUrl } from "../../../lib/classPortraits";

const CLASS_REGIONS = [
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

const CLASSES: MapleClass[] = [
  // ── Explorers ──
  { name: "Hero", region: "Explorers", summary: "Warrior who wields greatswords with powerful combo attacks.", difficulty: "Easy", link: "Invincible Belief: Restores Max HP every 1s for 3s. [Lv1: 20% HP, CD 410s | Lv2: 23%, CD 370s | Lv3: 26%, CD 330s | Lv4: 29%, CD 290s | Lv5: 32%, CD 250s | Lv6: 35%, CD 210s | Lv7: 38%, CD 170s | Lv8: 41%, CD 130s | Lv9: 44%, CD 90s]", legion: "STR +10/20/40/80/100" },
  { name: "Paladin", region: "Explorers", summary: "Holy warrior with elemental charges and high survivability.", difficulty: "Easy", link: "Invincible Belief: Restores Max HP every 1s for 3s. [Lv1: 20% HP, CD 410s | Lv2: 23%, CD 370s | Lv3: 26%, CD 330s | Lv4: 29%, CD 290s | Lv5: 32%, CD 250s | Lv6: 35%, CD 210s | Lv7: 38%, CD 170s | Lv8: 41%, CD 130s | Lv9: 44%, CD 90s]", legion: "STR +10/20/40/80/100" },
  { name: "Dark Knight", region: "Explorers", summary: "Spear-wielding warrior who sacrifices HP for devastating power.", difficulty: "Easy", link: "Invincible Belief: Restores Max HP every 1s for 3s. [Lv1: 20% HP, CD 410s | Lv2: 23%, CD 370s | Lv3: 26%, CD 330s | Lv4: 29%, CD 290s | Lv5: 32%, CD 250s | Lv6: 35%, CD 210s | Lv7: 38%, CD 170s | Lv8: 41%, CD 130s | Lv9: 44%, CD 90s]", legion: "Max HP +2/3/4/5/6%" },
  { name: "Arch Mage (Fire/Poison)", region: "Explorers", summary: "Mage specializing in fire and poison DoT magic.", difficulty: "Normal", link: "Empirical Knowledge: Chance to identify enemy weakness, granting +Damage and +IED per stack. [Lv1: 15% chance, +1% | Lv2: 17%, +1% | Lv3: 19%, +2% | Lv4: 21%, +2% | Lv5: 23%, +3% | Lv6: 25%, +3% | Lv7: 27%, +4% | Lv8: 29%, +4% | Lv9: 31%, +5%]", legion: "Max MP +2/3/4/5/6%" },
  { name: "Arch Mage (Ice/Lightning)", region: "Explorers", summary: "Mage specializing in ice and lightning AoE spells.", difficulty: "Normal", link: "Empirical Knowledge: Chance to identify enemy weakness, granting +Damage and +IED per stack. [Lv1: 15% chance, +1% | Lv2: 17%, +1% | Lv3: 19%, +2% | Lv4: 21%, +2% | Lv5: 23%, +3% | Lv6: 25%, +3% | Lv7: 27%, +4% | Lv8: 29%, +4% | Lv9: 31%, +5%]", legion: "INT +10/20/40/80/100" },
  { name: "Bishop", region: "Explorers", summary: "Support mage with healing, buffs, and holy damage.", difficulty: "Normal", link: "Empirical Knowledge: Chance to identify enemy weakness, granting +Damage and +IED per stack. [Lv1: 15% chance, +1% | Lv2: 17%, +1% | Lv3: 19%, +2% | Lv4: 21%, +2% | Lv5: 23%, +3% | Lv6: 25%, +3% | Lv7: 27%, +4% | Lv8: 29%, +4% | Lv9: 31%, +5%]", legion: "INT +10/20/40/80/100" },
  { name: "Bow Master", region: "Explorers", summary: "Archer who rains down arrows with blazing speed.", difficulty: "Normal", link: "Adventurer's Curiosity: Increases Critical Rate and Monster Collection chance. [Lv1: +3% Crit, +10% Collection | Lv2: +4%, +15% | Lv3: +6%, +20% | Lv4: +7%, +25% | Lv5: +9%, +30% | Lv6: +10%, +35% | Lv7: +12%, +40% | Lv8: +13%, +45% | Lv9: +15%, +50%]", legion: "DEX +10/20/40/80/100" },
  { name: "Marksman", region: "Explorers", summary: "Sniper archer with long-range, high-damage precision shots.", difficulty: "Normal", link: "Adventurer's Curiosity: Increases Critical Rate and Monster Collection chance. [Lv1: +3% Crit, +10% Collection | Lv2: +4%, +15% | Lv3: +6%, +20% | Lv4: +7%, +25% | Lv5: +9%, +30% | Lv6: +10%, +35% | Lv7: +12%, +40% | Lv8: +13%, +45% | Lv9: +15%, +50%]", legion: "Critical Rate +1/2/3/4/5%" },
  { name: "Pathfinder", region: "Explorers", summary: "Ancient archer who channels relic powers through a bow.", difficulty: "Easy", link: "Adventurer's Curiosity: Increases Critical Rate and Monster Collection chance. [Lv1: +3% Crit, +10% Collection | Lv2: +4%, +15% | Lv3: +6%, +20% | Lv4: +7%, +25% | Lv5: +9%, +30% | Lv6: +10%, +35% | Lv7: +12%, +40% | Lv8: +13%, +45% | Lv9: +15%, +50%]", legion: "DEX +10/20/40/80/100" },
  { name: "Night Lord", region: "Explorers", summary: "Throwing-star assassin with massive burst damage.", difficulty: "Normal", link: "Thief's Cunning: Upon debuffing enemy, +Damage for 10s (CD: 20s). [Lv1: +3% | Lv2: +6% | Lv3: +9% | Lv4: +12% | Lv5: +15% | Lv6: +18% | Lv7: +21% | Lv8: +24% | Lv9: +27%]", legion: "Critical Rate +1/2/3/4/5%" },
  { name: "Shadower", region: "Explorers", summary: "Dagger-wielding thief who strikes from the shadows.", difficulty: "Normal", link: "Thief's Cunning: Upon debuffing enemy, +Damage for 10s (CD: 20s). [Lv1: +3% | Lv2: +6% | Lv3: +9% | Lv4: +12% | Lv5: +15% | Lv6: +18% | Lv7: +21% | Lv8: +24% | Lv9: +27%]", legion: "LUK +10/20/40/80/100" },
  { name: "Dual Blade", region: "Explorers", summary: "Agile dual-wielding thief with flashy combo chains.", difficulty: "Normal", link: "Thief's Cunning: Upon debuffing enemy, +Damage for 10s (CD: 20s). [Lv1: +3% | Lv2: +6% | Lv3: +9% | Lv4: +12% | Lv5: +15% | Lv6: +18% | Lv7: +21% | Lv8: +24% | Lv9: +27%]", legion: "LUK +10/20/40/80/100" },
  { name: "Corsair", region: "Explorers", summary: "Gunslinger pirate with summoned crew and ship cannons.", difficulty: "Normal", link: "Pirate Blessing: +All Stat, +Max HP/MP, -Damage Taken. [Lv1: +20 stat, +350 HP/MP, -5% | Lv2: +30, +525, -7% | Lv3: +40, +700, -9% | Lv4: +50, +875, -11% | Lv5: +60, +1050, -13% | Lv6: +70, +1225, -15% | Lv7: +80, +1400, -17% | Lv8: +90, +1575, -19% | Lv9: +100, +1750, -21%]", legion: "Summon Duration +4/6/8/10/12%" },
  { name: "Cannoneer", region: "Explorers", summary: "Pirate blasting enemies with a massive hand cannon.", difficulty: "Easy", link: "Pirate Blessing: +All Stat, +Max HP/MP, -Damage Taken. [Lv1: +20 stat, +350 HP/MP, -5% | Lv2: +30, +525, -7% | Lv3: +40, +700, -9% | Lv4: +50, +875, -11% | Lv5: +60, +1050, -13% | Lv6: +70, +1225, -15% | Lv7: +80, +1400, -17% | Lv8: +90, +1575, -19% | Lv9: +100, +1750, -21%]", legion: "STR +10/20/40/80/100" },
  { name: "Buccaneer", region: "Explorers", summary: "Brawling pirate who fights with fists and transformation power.", difficulty: "Easy", link: "Pirate Blessing: +All Stat, +Max HP/MP, -Damage Taken. [Lv1: +20 stat, +350 HP/MP, -5% | Lv2: +30, +525, -7% | Lv3: +40, +700, -9% | Lv4: +50, +875, -11% | Lv5: +60, +1050, -13% | Lv6: +70, +1225, -15% | Lv7: +80, +1400, -17% | Lv8: +90, +1575, -19% | Lv9: +100, +1750, -21%]", legion: "STR +10/20/40/80/100" },
  // ── Cygnus Knights ──
  { name: "Dawn Warrior", region: "Cygnus Knights", summary: "Cygnus knight wielding the power of light and dark swords.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "Max HP +250/500/1000/2000/2500" },
  { name: "Blaze Wizard", region: "Cygnus Knights", summary: "Cygnus fire mage who controls orbital flames.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "INT +10/20/40/80/100" },
  { name: "Wind Archer", region: "Cygnus Knights", summary: "Cygnus archer who commands the power of wind.", difficulty: "Normal", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "DEX +10/20/40/80/100" },
  { name: "Night Walker", region: "Cygnus Knights", summary: "Cygnus assassin who strikes from darkness with throwing stars.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "LUK +10/20/40/80/100" },
  { name: "Thunder Breaker", region: "Cygnus Knights", summary: "Cygnus pirate channeling lightning through martial arts.", difficulty: "Hard", link: "Cygnus Blessing: +ATT/MATT, +Status Resist, +Elemental Resist. [Lv1: +7 ATT, +2 SR, +1% ER | Lv2: +9, +3, +3% | Lv3: +11, +4, +4% | Lv4: +13, +6, +6% | Lv5: +15, +7, +7% | ... | Lv15: +35, +22, +22%]", legion: "STR +10/20/40/80/100" },
  { name: "Mihile", region: "Cygnus Knights", summary: "Cygnus knight with a royal guard shield mechanic.", difficulty: "Hard", link: "Knight's Watch: +100 Status Resistance (CD: 120s). [Lv1: 10s | Lv2: 15s | Lv3: 20s]", legion: "Max HP +250/500/1000/2000/2500" },
  // ── Heroes of Maple ──
  { name: "Aran", region: "Heroes of Maple", summary: "Polearm hero of legend with fast combo attacks.", difficulty: "Easy", link: "Combo Kill Blessing: Combo Kill Marble EXP bonus. [Lv1: +400% | Lv2: +650% | Lv3: +900%]", legion: "70% chance to recover 2/4/6/8/10% Max HP on attack" },
  { name: "Evan", region: "Heroes of Maple", summary: "Dragon master who fights alongside the dragon Mir.", difficulty: "Normal", link: "Rune Persistence: Increases Rune duration. [Lv1: +30% | Lv2: +50% | Lv3: +70%]", legion: "70% chance to recover 2/4/6/8/10% Max MP on attack" },
  { name: "Mercedes", region: "Heroes of Maple", summary: "Elf queen with dual bowguns and acrobatic combos.", difficulty: "Hard", link: "Elven Blessing: Permanent EXP bonus. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Skill Cooldown -2/3/4/5/6%" },
  { name: "Phantom", region: "Heroes of Maple", summary: "Gentleman thief who steals and uses other classes' skills.", difficulty: "Hard", link: "Phantom Instinct: Increases Critical Rate. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Mesos Obtained +1/2/3/4/5%" },
  { name: "Luminous", region: "Heroes of Maple", summary: "Mage of light and dark with screen-clearing attacks.", difficulty: "Easy", link: "Light Wash: Ignore Enemy DEF. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "INT +10/20/40/80/100" },
  { name: "Shade", region: "Heroes of Maple", summary: "Lonely spirit fighter with fox spirit powers.", difficulty: "Easy", link: "Close Call: Chance to survive a lethal attack. [Lv1: 5% | Lv2: 10% | Lv3: 15%]", legion: "Critical Damage +1/2/3/5/6%" },
  // ── Resistance ──
  { name: "Battle Mage", region: "Resistance", summary: "Resistance mage using a staff in close-range combat with auras.", difficulty: "Normal", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "INT +10/20/40/80/100" },
  { name: "Wild Hunter", region: "Resistance", summary: "Resistance archer who rides a jaguar into battle.", difficulty: "Normal", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "20% chance for +4/8/12/16/20% damage on attack" },
  { name: "Mechanic", region: "Resistance", summary: "Resistance engineer piloting a mech suit with gadgets.", difficulty: "Normal", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "Buff Duration +5/10/15/20/25%" },
  { name: "Blaster", region: "Resistance", summary: "Resistance warrior with a massive arm cannon and combo dashes.", difficulty: "Hard", link: "Spirit of Freedom: Invincibility after revival. [Lv1: 1s | Lv2: 2s | Lv3: 3s | Lv4: 4s | Lv5: 5s | Lv6: 6s | Lv7: 7s | Lv8: 8s | Lv9: 9s | Lv10: 10s | Lv11: 11s | Lv12: 12s]", legion: "IED +1/2/3/5/6%" },
  { name: "Xenon", region: "Resistance", summary: "Hybrid thief/pirate android with three stat lines.", difficulty: "Normal", link: "Hybrid Logic: Increases All Stats. [Lv1: +5% | Lv2: +10% | Lv3: +15%]", legion: "STR/DEX/LUK +5/10/20/40/50" },
  // ── Demons ──
  { name: "Demon Slayer", region: "Demons", summary: "Demon warrior using Fury to unleash devastating axe attacks.", difficulty: "Easy", link: "Fury Unleashed: Increases Boss Damage. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Abnormal Status Resistance +1/2/3/4/5" },
  { name: "Demon Avenger", region: "Demons", summary: "Demon who sacrifices HP instead of MP for powerful attacks.", difficulty: "Easy", link: "Wild Rage: Increases Damage. [Lv1: +5% | Lv2: +10% | Lv3: +15%]", legion: "Boss Damage +1/2/3/5/6%" },
  // ── Nova ──
  { name: "Kaiser", region: "Nova", summary: "Dragon warrior who transforms into a powerful dragon form.", difficulty: "Normal", link: "Iron Will: Increases Max HP. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "STR +10/20/40/80/100" },
  { name: "Angelic Buster", region: "Nova", summary: "Magical girl pirate with flashy energy blasts.", difficulty: "Easy", link: "Terms and Conditions: +Damage for 10s. [Lv1: +30%, CD 90s | Lv2: +45%, CD 60s | Lv3: +60%, CD 60s]", legion: "DEX +10/20/40/80/100" },
  { name: "Cadena", region: "Nova", summary: "Chain-wielding thief with fast, fluid combo attacks.", difficulty: "Hard", link: "Unfair Advantage: +Damage to weaker and afflicted enemies. [Lv1: +3% each | Lv2: +6% each | Lv3: +9% each]", legion: "LUK +10/20/40/80/100" },
  { name: "Kain", region: "Nova", summary: "Archer wielding a malice-infused weapon with transformation skills.", difficulty: "Normal", link: "Time to Prepare: After 8 kills or 5 boss hits, gain stacks; at 5 stacks +Damage (CD: 40s). [Lv1: +9% | Lv2: +17% | Lv3: +25%]", legion: "DEX +10/20/40/80/100" },
  // ── Flora ──
  { name: "Illium", region: "Flora", summary: "Mage who commands crystal wings and magical constructs.", difficulty: "Normal", link: "Tide of Battle: +Damage per stack (max 4 stacks, 10s). [Lv1: +2% per stack | Lv2: +3% | Lv3: +4%]", legion: "INT +10/20/40/80/100" },
  { name: "Ark", region: "Flora", summary: "Pirate who channels chaotic flora powers through martial arts.", difficulty: "Normal", link: "Solus: After 5s combat, +1% Damage, +Damage per stack (max 5). [Lv1: +1% per stack | Lv2: +2% | Lv3: +3%]", legion: "STR +10/20/40/80/100" },
  { name: "Adele", region: "Flora", summary: "Knight who summons ethereal swords to fight alongside her.", difficulty: "Easy", link: "Noble Fire: +Boss Damage, +Damage per party member. [Lv1: +2% boss, +1%/member (max +4%) | Lv2: +4%, +2% (max +8%) | Lv3: +6%, +3% (max +12%)]", legion: "STR +10/20/40/80/100" },
  { name: "Khali", region: "Flora", summary: "Thief who wields chakrams with swift aerial combos.", difficulty: "Normal", link: "Innate Gift: +Damage; on attack, recover HP/MP for 5s (CD: 30s). [Lv1: +3%, 1% HP/MP | Lv2: +5%, 2% | Lv3: +7%, 3%]", legion: "LUK +10/20/40/80/100" },
  // ── Anima ──
  { name: "Hoyoung", region: "Anima", summary: "Sage who uses talismans, clones, and flashy Eastern magic.", difficulty: "Hard", link: "Bravado: +IED, +Damage vs full HP enemies. [Lv1: +5% IED, +9% dmg | Lv2: +10%, +14% | Lv3: +15%, +19%]", legion: "LUK +10/20/40/80/100" },
  { name: "Lara", region: "Anima", summary: "Nature mage who channels mountain energy and bell magic.", difficulty: "Normal", link: "Nature's Friend: +Damage; after 20 normal monster kills, +Normal Monster Damage for 30s (CD: 30s). [Lv1: +3%, +7% | Lv2: +5%, +11% | Lv3: +7%, +15%]", legion: "INT +10/20/40/80/100" },
  { name: "Ren", region: "Anima", summary: "Sword-wielding warrior who channels Imugi spirit powers.", difficulty: "Normal", link: "Grounded Body: Reduces damage taken (including %-based). [Lv1: -2% | Lv2: -4% | Lv3: -6%]", legion: "Movement Speed +2/4/6/8/10%" },
  // ── Other ──
  { name: "Zero", region: "Other", summary: "Tag-team duo wielding a sword and lapis — two characters in one.", difficulty: "Hard", link: "Rhinne's Blessing: -Damage Taken, +IED. [Lv1: -3%, +2% | Lv2: -6%, +4% | Lv3: -9%, +6% | Lv4: -12%, +8% | Lv5: -15%, +10% | Lv6: -18%, +12%]", legion: "EXP Obtained +4/6/8/10/12%" },
  { name: "Kinesis", region: "Other", summary: "Psychic who hurls objects and controls gravity with telekinesis.", difficulty: "Hard", link: "Judgment: Increases Critical Damage. [Lv1: +2% | Lv2: +4% | Lv3: +6%]", legion: "INT +10/20/40/80/100" },
  // ── Sengoku ──
  { name: "Hayato", region: "Sengoku", summary: "Samurai with quick-draw sword techniques.", difficulty: "Normal", link: "Moonlit Blade Learnings: +Critical Damage (requires 100% Crit Rate and 50%+ Crit Damage). [Lv1: +3% | Lv2: +5% | Lv3: +7%]", legion: "Critical Damage +1/2/3/5/6%" },
  { name: "Kanna", region: "Sengoku", summary: "Fox spirit mage with fan-based attacks and Kishin summons.", difficulty: "Normal", link: "Elementalism: After 40 attack skill activations, +Damage for 12s. [Lv1: +10% | Lv2: +15% | Lv3: +20%]", legion: "Boss Damage +1/2/3/5/6%" },
  // ── Jianghu ──
  { name: "Lynn", region: "Jianghu", summary: "Swordswoman with a unique stance-switching combat system.", difficulty: "Normal", link: "Focus Spirit: +Boss Damage, +Crit Rate, +Max HP/MP. [Lv1: +4% boss, +4% crit, +3% HP/MP | Lv2: +7%, +7%, +4% | Lv3: +10%, +10%, +5%]", legion: "IED +1/2/3/5/6%" },
  { name: "Mo Xuan", region: "Jianghu", summary: "Martial arts pirate with fluid stance-switching and combo chains.", difficulty: "Hard", link: "Qi Cultivation: +Boss Damage; against bosses, +Damage per attack (max 6 stacks). [Lv1: +2%, +1%/stack | Lv2: +4%, +2%/stack | Lv3: +6%, +3%/stack]", legion: "Critical Damage +1/2/3/5/6%" },
  // ── Shine ──
  { name: "Sia Astelle", region: "Shine", summary: "Constellation mage who fuses marking skills into powerful stellar attacks.", difficulty: "Normal", link: "Tree of Stars: +Buff Duration, +Critical Damage. [Lv1: +4% duration, +1% crit dmg | Lv2: +7%, +2% | Lv3: +10%, +3%]", legion: "Abnormal Status Damage +1/2/3/5/6%" },
].map((cls) => ({ ...cls, portrait: classPortraitUrl(cls.name) })) as MapleClass[];

/* ── Highlight numbers in blue for readability ────────────────── */

const NUM_BLUE = "#4a9eff";

function highlightNumbers(text: string): React.ReactNode[] {
  // Match "Lv" prefix + numbers with optional: leading +/-, trailing %, s, decimals
  const parts = text.split(/(Lv\d+|\+?\-?\d[\d,.]*%?s?)/g);
  return parts.map((part, i) =>
    /\d/.test(part) || /^Lv/.test(part) ? (
      <span key={i} style={{ color: NUM_BLUE, fontWeight: 700 }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "#2d8a2d",
  Normal: "#c49a2a",
  Hard: "#c44040",
};

function ClassRandomizer({ theme }: { theme: AppTheme }) {
  const [result, setResult] = useState<MapleClass | null>(null);

  function roll() {
    setResult(CLASSES[Math.floor(Math.random() * CLASSES.length)]); // eslint-disable-line sonarjs/pseudo-random
  }

  return (
    <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.75rem" }}>
      <button
        onClick={roll}
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "0.85rem",
          padding: "0.6rem 1.25rem",
          borderRadius: "12px",
          border: "none",
          background: theme.accent,
          color: "#fff",
          cursor: "pointer",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Randomize my class
      </button>

      {result && (
        <div
          className="class-card"
          style={{
            width: "100%",
            background: theme.accentSoft,
            border: `1px solid ${theme.border}`,
            borderRadius: "14px",
            padding: "1.25rem",
            display: "flex",
            gap: "1.25rem",
            alignItems: "flex-start",
          }}
        >
          {/* Portrait */}
          <div
            style={{
              width: "120px",
              minWidth: "120px",
              height: "120px",
              borderRadius: "12px",
              border: `1px solid ${theme.border}`,
              background: theme.panel,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.portrait}
              alt={result.name}
              width={120}
              height={120}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.05rem",
                color: theme.accent,
                marginBottom: "0.5rem",
              }}
            >
              {result.name}
            </div>

            <div style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600, lineHeight: 1.6, marginBottom: "0.75rem" }}>
              {result.summary}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Difficulty:{" "}
                <span style={{ color: DIFFICULTY_COLORS[result.difficulty] }}>{result.difficulty}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Link Skill:{" "}
                <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(result.link)}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Legion:{" "}
                <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(result.legion)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Expanded class info panel ─────────────────────────────────── */

function ClassInfoPanel({ cls, theme }: { cls: MapleClass; theme: AppTheme }) {
  return (
    <div
      className="class-card"
      style={{
        gridColumn: "1 / -1",
        background: theme.accentSoft,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "1.25rem",
        display: "flex",
        gap: "1.25rem",
        alignItems: "flex-start",
      }}
    >
      {/* Portrait */}
      <div
        style={{
          width: "100px",
          minWidth: "100px",
          height: "100px",
          borderRadius: "12px",
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cls.portrait}
          alt={cls.name}
          width={100}
          height={100}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "0.95rem",
            color: theme.accent,
            marginBottom: "0.4rem",
          }}
        >
          {cls.name}
        </div>
        <div style={{ fontSize: "0.8rem", color: theme.muted, fontWeight: 600, lineHeight: 1.6, marginBottom: "0.6rem" }}>
          {cls.summary}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Difficulty:{" "}
            <span style={{ color: DIFFICULTY_COLORS[cls.difficulty] }}>{cls.difficulty}</span>
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Link Skill:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.link)}</span>
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Legion:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.legion)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Class directory by region ─────────────────────────────────── */

function ClassDirectory({ theme }: { theme: AppTheme }) {
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = CLASS_REGIONS.map((region) => ({
    region,
    classes: CLASSES.filter((c) => c.region === region),
  })).filter((g) => g.classes.length > 0);

  function toggle(name: string) {
    setSelected((prev) => (prev === name ? null : name));
  }

  return (
    <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1rem",
          color: theme.text,
        }}
      >
        All Classes by Faction
      </div>

      {grouped.map(({ region, classes }) => (
        <div key={region}>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "0.85rem",
              color: theme.accent,
              marginBottom: "0.75rem",
            }}
          >
            {region}
          </div>
          <div
            className="class-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {classes.map((cls) => {
              const isSelected = selected === cls.name;
              return (
                <React.Fragment key={cls.name}>
                  <div
                    onClick={() => toggle(cls.name)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                      transform: isSelected ? "scale(1.05)" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "10px",
                        border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                        background: theme.panel,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        boxShadow: isSelected ? `0 0 0 2px ${theme.accentSoft}` : "none",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cls.portrait}
                        alt={cls.name}
                        width={72}
                        height={72}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: isSelected ? theme.accent : theme.text,
                        textAlign: "center",
                        lineHeight: 1.2,
                        transition: "color 0.2s ease",
                      }}
                    >
                      {cls.name}
                    </div>
                  </div>

                  {/* Expanded info panel — spans full grid width */}
                  {isSelected && <ClassInfoPanel cls={cls} theme={theme} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Components ────────────────────────────────────────────────── */

function SectionCard({
  section,
  theme,
  index,
  children,
}: {
  section: GuideSection;
  theme: AppTheme;
  index: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="fade-in"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "18px",
        padding: "2rem 1.75rem",
        animationDelay: `${index * 0.06}s`,
        animationFillMode: "both",
      }}
    >
      {/* Section heading */}
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.15rem",
          color: theme.text,
          marginBottom: "1rem",
        }}
      >
        {section.title}
      </div>

      {/* Optional image */}
      {section.image && (
        <div
          style={{
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "1.25rem",
            border: `1px solid ${theme.border}`,
          }}
        >
          <Image
            src={section.image}
            alt={section.imageAlt || section.title}
            width={1000}
            height={500}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}

      {/* Body text */}
      <div
        style={{
          fontSize: "0.88rem",
          color: theme.muted,
          fontWeight: 600,
          lineHeight: 1.75,
          whiteSpace: "pre-line",
        }}
      >
        {section.body}
      </div>

      {children}
    </div>
  );
}

function NewPlayersContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        @media (max-width: 860px) {
          .guide-main { padding: 1rem !important; }
        }
        @media (max-width: 500px) {
          .class-card { flex-direction: column !important; align-items: center !important; text-align: center !important; }
        }
      `}</style>

      <div
        className="guide-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/guides"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: theme.accent,
              textDecoration: "none",
              marginBottom: "1.25rem",
            }}
          >
            ← Back to Guides
          </Link>

          {/* Page title */}
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.5rem",
              color: theme.text,
              marginBottom: "0.25rem",
            }}
          >
            New Players Guide
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            Everything you need to know to get started in MapleStory
          </div>

          {/* Table of contents */}
          <div
            className="fade-in"
            style={{
              background: theme.accentSoft,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.75rem",
              }}
            >
              Contents
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: theme.accent,
                    textDecoration: "none",
                  }}
                >
                  {i + 1}. {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Guide sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {SECTIONS.map((section, i) => (
              <div key={section.id} id={section.id}>
                <SectionCard section={section} theme={theme} index={i}>
                  {section.id === "choosing-class" && (
                    <>
                      <ClassRandomizer theme={theme} />
                      <ClassDirectory theme={theme} />
                    </>
                  )}
                </SectionCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewPlayersGuidePage() {
  return (
    <AppShell currentPath="/guides">
      {({ theme }) => <NewPlayersContent theme={theme} />}
    </AppShell>
  );
}
