import type { ClassConfig } from "../guide-types";
import { hero } from "./hero";
// Explorers
import { paladin } from "./paladin";
import { darkKnight } from "./dark-knight";
import { archMageFp } from "./arch-mage-fp";
import { archMageIl } from "./arch-mage-il";
import { bishop } from "./bishop";
import { bowmaster } from "./bowmaster";
import { marksman } from "./marksman";
import { pathfinder } from "./pathfinder";
import { nightLord } from "./night-lord";
import { shadower } from "./shadower";
import { dualBlade } from "./dual-blade";
import { buccaneer } from "./buccaneer";
import { corsair } from "./corsair";
import { cannoneer } from "./cannoneer";
// Resistance & Demons
import { blaster } from "./blaster";
import { demonSlayer } from "./demon-slayer";
import { demonAvenger } from "./demon-avenger";
import { battleMage } from "./battle-mage";
import { wildHunter } from "./wild-hunter";
import { mechanic } from "./mechanic";
import { xenon } from "./xenon";
// Cygnus Knights
import { dawnWarrior } from "./dawn-warrior";
import { blazeWizard } from "./blaze-wizard";
import { windArcher } from "./wind-archer";
import { nightWalker } from "./night-walker";
import { thunderBreaker } from "./thunder-breaker";

// Keys are the route slugs produced by classSlug(name) in classData.ts — e.g.
// "Arch Mage (Fire/Poison)" → "arch-mage-firepoison", "Bow Master" → "bow-master".
export const CLASS_CONFIGS: Record<string, ClassConfig> = {
  hero,
  // Explorers
  paladin,
  "dark-knight": darkKnight,
  "arch-mage-firepoison": archMageFp,
  "arch-mage-icelightning": archMageIl,
  bishop,
  "bow-master": bowmaster,
  marksman,
  pathfinder,
  "night-lord": nightLord,
  shadower,
  "dual-blade": dualBlade,
  buccaneer,
  corsair,
  cannoneer,
  // Resistance & Demons
  blaster,
  "demon-slayer": demonSlayer,
  "demon-avenger": demonAvenger,
  "battle-mage": battleMage,
  "wild-hunter": wildHunter,
  mechanic,
  xenon,
  // Cygnus Knights
  "dawn-warrior": dawnWarrior,
  "blaze-wizard": blazeWizard,
  "wind-archer": windArcher,
  "night-walker": nightWalker,
  "thunder-breaker": thunderBreaker,
};
