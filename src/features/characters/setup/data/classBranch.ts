/*
  Equipment-picker filtering by class. Three layers, from coarse to precise:

  1. Branch (reqJob bitmask: Warrior=1, Magician=2, Bowman=4, Thief=8, Pirate=16;
     absent = any) — used for armor/accessories and as the fallback for weapons.
     A class's branch is NOT derivable from its main stat (Shade is STR but Pirate,
     Mo Xuan is DEX but Pirate, Xenon spans Thief+Pirate).
  2. Weapon type — each class equips one specific weapon TYPE (Kanna a fan, Luminous
     a shining rod). The item data has no per-class weapon flag (`reqSpecJobs` exists
     only on a few shields), so the type is identified by the item id's 5-digit prefix.
  3. Secondary type — same idea but finer: many classes' secondaries share a 5-digit
     prefix, so secondaries are keyed by 7-digit prefix. Shield-using classes also see
     branch-matching shields.

  Class→type maps below are transcribed from grandislibrary class pages; type→prefix
  maps are derived from the served item data. Classes absent from a map fall back to
  the next coarser layer. Beginner/citizen and unknown ids get mask 0 (show everything).
*/

import type { EquipmentLike } from "./equipmentStepDraft";

export type EquipBranch = "warrior" | "magician" | "bowman" | "thief" | "pirate";

/** reqJob bitmask bit per branch (matches the item data's `reqJob`). */
export const BRANCH_BIT: Record<EquipBranch, number> = {
  warrior: 1,
  magician: 2,
  bowman: 4,
  thief: 8,
  pirate: 16,
};

const CLASS_BRANCHES: Record<string, EquipBranch[]> = {
  // ── Warrior ──
  hero: ["warrior"], paladin: ["warrior"], dark_knight: ["warrior"],
  dawn_warrior: ["warrior"], mihile: ["warrior"], aran: ["warrior"],
  blaster: ["warrior"], demon_slayer: ["warrior"], demon_avenger: ["warrior"],
  adele: ["warrior"], ren: ["warrior"], kaiser: ["warrior"], hayato: ["warrior"],
  // erel_light: PTS-only; class still needs adding to classSkillData.ts at v269 launch (~2026-06-17)
  erel_light: ["warrior"],
  // legacy warrior advancements
  swordman: ["warrior"], fighter: ["warrior"], crusader: ["warrior"],
  page: ["warrior"], white_knight: ["warrior"], spearman: ["warrior"], berserker: ["warrior"],

  // ── Magician ──
  arch_mage_f_p: ["magician"], arch_mage_i_l: ["magician"], bishop: ["magician"],
  blaze_wizard: ["magician"], evan: ["magician"], luminous: ["magician"],
  battle_mage: ["magician"], illium: ["magician"], lara: ["magician"],
  lynn: ["magician"], kanna: ["magician"], kinesis: ["magician"], sia_astelle: ["magician"],
  // legacy magician advancements
  magician: ["magician"], wizard_f_p: ["magician"], wizard_i_l: ["magician"],
  mage_f_p: ["magician"], mage_i_l: ["magician"], cleric: ["magician"], priest: ["magician"],

  // ── Bowman ──
  bow_master: ["bowman"], marksman: ["bowman"], pathfinder: ["bowman"],
  wind_archer: ["bowman"], mercedes: ["bowman"], wild_hunter: ["bowman"], kain: ["bowman"],
  // legacy bowman advancements
  archer: ["bowman"], hunter: ["bowman"], ranger: ["bowman"],
  crossbowman: ["bowman"], sniper: ["bowman"], ancient_archer: ["bowman"],
  // Pathfinder's own 2nd/3rd job legacy names (ancient_archer above, soulchaser here)
  soulchaser: ["bowman"],

  // ── Thief ──
  night_lord: ["thief"], shadower: ["thief"], blade_master: ["thief"],
  night_walker: ["thief"], phantom: ["thief"], cadena: ["thief"],
  khali: ["thief"], hoyoung: ["thief"],
  // legacy thief advancements
  rogue: ["thief"], assassin: ["thief"], hermit: ["thief"], bandit: ["thief"],
  chief_bandit: ["thief"], blade_recruit: ["thief"], blade_acolyte: ["thief"],
  blade_specialist: ["thief"], blade_lord: ["thief"],

  // ── Pirate ──
  buccaneer: ["pirate"], corsair: ["pirate"], cannoneer: ["pirate"],
  thunder_breaker: ["pirate"], mechanic: ["pirate"], angelic_buster: ["pirate"],
  shade: ["pirate"], ark: ["pirate"], mo_xuan: ["pirate"],
  // legacy pirate advancements
  pirate: ["pirate"], brawler: ["pirate"], marauder: ["pirate"],
  gunslinger: ["pirate"], outlaw: ["pirate"], cannon_trooper: ["pirate"], cannon_master: ["pirate"],

  // ── Multi-branch ──
  xenon: ["thief", "pirate"],

  // Zero wears warrior (STR) armor; its weapon/secondary are pinned by prefix below.
  zero: ["warrior"],
};

/**
 * reqJob bitmask a class can equip. 0 = unknown/unfiltered (show everything):
 * beginner/citizen, and any class not mapped above.
 */
export function branchMaskForClass(classId: string | undefined): number {
  if (!classId) return 0;
  const branches = CLASS_BRANCHES[classId];
  if (!branches) return 0;
  return branches.reduce((mask, b) => mask | BRANCH_BIT[b], 0);
}

// ── Weapon-type filtering ────────────────────────────────────────────────────

/** Weapon type → the item-id 5-digit prefix that identifies it in weapon.json. */
const WEAPON_TYPE_PREFIX: Record<string, string> = {
  // shared classic types
  oneHSword: "01302", twoHSword: "01402", oneHAxe: "01312", twoHAxe: "01412",
  oneHBlunt: "01322", twoHBlunt: "01422", spear: "01432", polearm: "01442",
  bow: "01452", crossbow: "01462", claw: "01472", dagger: "01332",
  knuckle: "01482", gun: "01492", wand: "01372", staff: "01382", cane: "01362",
  dualBowguns: "01522", handCannon: "01532", katana: "01542",
  // one class each
  shiningRod: "01212", bladecaster: "01213", whispershot: "01214",
  swordRen: "01215", soulShooter: "01222", desperado: "01232", whipBlade: "01242",
  memorialStaff: "01252", celestialLight: "01253", fanKanna: "01254",
  psyLimiter: "01262", chain: "01272", lucentGauntlet: "01282", ritualFan: "01292",
  martialBrace: "01403", chakram: "01404", gram: "01433", armCannon: "01582",
  ancientBow: "01592", longSword: "01572", // longSword = Zero's Lazuli
};

/** classId → weapon type(s) it can equip. */
const CLASS_WEAPON_TYPES: Record<string, string[]> = {
  // ── Warrior ──
  hero: ["oneHSword", "twoHSword", "oneHAxe", "twoHAxe"],
  paladin: ["oneHSword", "twoHSword", "oneHBlunt", "twoHBlunt"],
  dark_knight: ["spear", "polearm"],
  dawn_warrior: ["oneHSword", "twoHSword"],
  mihile: ["oneHSword"], aran: ["polearm"], kaiser: ["twoHSword"],
  hayato: ["katana"], blaster: ["armCannon"],
  demon_slayer: ["oneHBlunt", "oneHAxe"], demon_avenger: ["desperado"],
  adele: ["bladecaster"], ren: ["swordRen"], erel_light: ["gram"],
  // ── Magician ──
  arch_mage_f_p: ["wand", "staff"], arch_mage_i_l: ["wand", "staff"],
  bishop: ["wand", "staff"], blaze_wizard: ["wand", "staff"], evan: ["wand", "staff"],
  luminous: ["shiningRod"], battle_mage: ["staff"], illium: ["lucentGauntlet"],
  lara: ["wand"], lynn: ["memorialStaff"], kanna: ["fanKanna"],
  kinesis: ["psyLimiter"], sia_astelle: ["celestialLight"],
  // ── Bowman ──
  bow_master: ["bow"], marksman: ["crossbow"], pathfinder: ["ancientBow"],
  wind_archer: ["bow"], mercedes: ["dualBowguns"], wild_hunter: ["crossbow"],
  kain: ["whispershot"],
  // ── Thief ──
  night_lord: ["claw"], shadower: ["dagger"], blade_master: ["dagger"],
  night_walker: ["claw"], phantom: ["cane"], cadena: ["chain"],
  khali: ["chakram"], hoyoung: ["ritualFan"],
  // ── Pirate ──
  buccaneer: ["knuckle"], corsair: ["gun"], cannoneer: ["handCannon"],
  thunder_breaker: ["knuckle"], mechanic: ["gun"], angelic_buster: ["soulShooter"],
  shade: ["knuckle"], ark: ["knuckle"], mo_xuan: ["martialBrace"],
  // ── Multi-branch ──
  xenon: ["whipBlade"],
  // ── Zero ── (secondary handled separately — it lives in weapon.json)
  zero: ["longSword"],
};

/** Weapon-slot id prefixes a class may equip, or null to fall back to branch filtering. */
export function weaponPrefixesForClass(classId: string | undefined): string[] | null {
  if (!classId) return null;
  const types = CLASS_WEAPON_TYPES[classId];
  if (!types) return null;
  return types.map((t) => WEAPON_TYPE_PREFIX[t]);
}

/** Weapon-id prefix -> which hand it is. Only meaningful for the 3 classes whose weapon
 *  choice actually varies by hand (hero/paladin/dawn_warrior); every other class's
 *  weapon type is fixed, so a lookup miss here just means "not hand-ambiguous". */
const WEAPON_HAND_BY_PREFIX: Record<string, "1h" | "2h"> = Object.fromEntries(
  // react-doctor-disable-next-line js-combine-iterations -- module-load-time only, over a small fixed table, not a per-render hot path.
  Object.entries(WEAPON_TYPE_PREFIX)
    .filter(([type]) => type.startsWith("oneH") || type.startsWith("twoH"))
    .map(([type, prefix]) => [prefix, type.startsWith("oneH") ? "1h" : "2h"]),
);

/** Derives 1H/2H from the active preset's equipped weapon id; undefined if there's no
 *  weapon on file there, or its prefix isn't a known one/two-handed type. */
export function deriveWeaponHandFromWeapon(equipment: EquipmentLike | null | undefined): "1h" | "2h" | undefined {
  const weaponId = equipment?.presets?.[equipment.activePreset]?.weapon?.id;
  if (!weaponId) return undefined;
  return WEAPON_HAND_BY_PREFIX[weaponId.slice(0, 5)];
}

// ── Secondary-type filtering ─────────────────────────────────────────────────

/** Shared shield id prefix (war/mage/thief shields, soul shield, demon aegis). */
const SHIELD_PREFIX = "0109";

/** Secondary type → identifying id prefix(es), 7-digit where a 5-digit prefix is shared
 *  across classes. The current Astra (Lv 200) secondaries also share 5-digit prefixes
 *  per class, so they're keyed per-class in CLASS_ASTRA_SECONDARY below, not here. */
const SECONDARY_TYPE_PREFIXES: Record<string, string[]> = {
  medallion: ["0135220"], rosary: ["0135221"], ironChain: ["0135222"],
  magicBookF: ["0135223"], magicBookI: ["0135224"], magicBookB: ["0135225"],
  arrowFletching: ["0135226"], bowThimble: ["0135227"], scabbard: ["0135228"],
  charm: ["0135229"], orb: ["0135240", "0135241"], dragonEssence: ["0135250"],
  soulRing: ["0135260"], magnum: ["0135270", "0135271"], leaf: ["0135281", "0135284"],
  kodachi: ["0135280", "0135283"], braceBand: ["0135286"], compass: ["0135287"],
  keir: ["0135288"], wristband: ["0135290"], farsight: ["0135291"],
  powderKeg: ["0135292"], mass: ["0135293"], document: ["0135294"],
  magicMarble: ["0135295"], arrowhead: ["0135296"], jewel: ["0135297"],
  magicArrow: ["0135200", "0135201"], card: ["0135210", "0135211"],
  coreController: ["0135300"], foxMarble: ["0135310", "0135311"],
  chessPiece: ["0135320"], warpForge: ["0135330"], charge: ["0135340"],
  lucentWings: ["0135350"], abyssalPath: ["0135360"], relic: ["0135370"],
  fanTassel: ["0135380"], bladebinder: ["0135400"], weaponBelt: ["0135401"],
  ornament: ["0135402"], hexSeeker: ["0135403"], imugiGem: ["0135404"],
  talisman: ["0135430"], katara: ["01342"],
};

// Current Astra (Lv 200) secondary per class — a single 7-digit prefix each (the 5-digit
// Astra prefixes 0172x lump many classes together, like the old 0135x line). Mapped by
// item name + job from the data; classes with no Astra entry yet (mihile, aran, the demon
// classes, blaze_wizard, shadower, dual blade) are absent. Add as the data fills in.
const CLASS_ASTRA_SECONDARY: Record<string, string> = {
  // ── Warrior ──
  hero: "0172000", paladin: "0172010", dark_knight: "0172020",
  dawn_warrior: "0172140", kaiser: "0172330", blaster: "0172310",
  adele: "0172390", ren: "0172430", erel_light: "0172540",
  aran: "0172190", // White Tiger (Mass). Hayato/Kanna have no Astra in this data (GMS Sengoku).
  zero: "0172370", // Hourglass — fits Zero's time/Transcendent theme
  // ── Magician ──
  luminous: "0172230", kinesis: "0172380", illium: "0172400",
  lara: "0172440", sia_astelle: "0172530",
  // ── Bowman ──
  bow_master: "0172060", marksman: "0172070", pathfinder: "0172080",
  wind_archer: "0172160", mercedes: "0172210", wild_hunter: "0172280",
  kain: "0172340",
  // ── Thief ──
  night_lord: "0172090", phantom: "0172220", cadena: "0172350",
  khali: "0172410", hoyoung: "0172450", night_walker: "0172170",
  // ── Pirate ──
  buccaneer: "0172110", corsair: "0172120", cannoneer: "0172130",
  thunder_breaker: "0172180", mechanic: "0172290", angelic_buster: "0172360",
  shade: "0172240", ark: "0172420",
  // ── Multi-branch ──
  xenon: "0172300",
};

// "shield" is a sentinel meaning "also show branch-matching shields" (war/mage/thief
// shields share id prefixes, so they can't be split by prefix — branch handles it).
const SECONDARY_SHIELD = "shield";

/** classId → secondary type(s). */
const CLASS_SECONDARY_TYPES: Record<string, string[]> = {
  // ── Warrior ──
  hero: ["medallion", SECONDARY_SHIELD], paladin: ["rosary", SECONDARY_SHIELD],
  dark_knight: ["ironChain"], dawn_warrior: ["jewel", SECONDARY_SHIELD],
  mihile: [SECONDARY_SHIELD], aran: ["mass"], kaiser: ["dragonEssence"],
  hayato: ["kodachi"], blaster: ["charge"],
  demon_slayer: [SECONDARY_SHIELD], demon_avenger: [SECONDARY_SHIELD],
  adele: ["bladebinder"], ren: ["imugiGem"], erel_light: ["keir"],
  // ── Magician ──
  arch_mage_f_p: ["magicBookF", SECONDARY_SHIELD], arch_mage_i_l: ["magicBookI", SECONDARY_SHIELD],
  bishop: ["magicBookB", SECONDARY_SHIELD], blaze_wizard: ["jewel", SECONDARY_SHIELD],
  evan: ["document", SECONDARY_SHIELD], luminous: ["orb"],
  battle_mage: ["magicMarble", SECONDARY_SHIELD], illium: ["lucentWings"],
  lara: ["ornament"], lynn: ["leaf", SECONDARY_SHIELD], kanna: ["talisman"],
  kinesis: ["chessPiece"], sia_astelle: ["compass"],
  // ── Bowman ──
  bow_master: ["arrowFletching"], marksman: ["bowThimble"], pathfinder: ["relic"],
  wind_archer: ["jewel"], mercedes: ["magicArrow"], wild_hunter: ["arrowhead"],
  kain: ["weaponBelt"],
  // ── Thief ──
  night_lord: ["charm"], shadower: ["scabbard", SECONDARY_SHIELD], blade_master: ["katara"],
  night_walker: ["jewel"], phantom: ["card"], cadena: ["warpForge"],
  khali: ["hexSeeker"], hoyoung: ["fanTassel"],
  // ── Pirate ──
  buccaneer: ["wristband"], corsair: ["farsight"], cannoneer: ["powderKeg"],
  thunder_breaker: ["jewel"], mechanic: ["magnum"], angelic_buster: ["soulRing"],
  shade: ["foxMarble"], ark: ["abyssalPath"], mo_xuan: ["braceBand"],
  // ── Multi-branch ──
  xenon: ["coreController"],
  // Zero is intentionally absent — its secondary (Lapis) lives in weapon.json.
};

// Per-class Astra shield, by exact item NAME. The Astra shields share/interleave id
// prefixes so they can't be split by id, but each class uses exactly one. Regular (non-Astra)
// shields stay branch-pooled; only the Astra shield is pinned. Names from the data + the
// orangemushroom KMS table (Honor Shield = Evan's, called "Prominent" in KMS).
const CLASS_ASTRA_SHIELD: Record<string, string[]> = {
  // Warrior
  hero: ["Astra Sacred Aegis"], paladin: ["Astra Sacred Aegis"],
  dawn_warrior: ["Astra Topaz Aegis"], mihile: ["Astra Soul Shield"],
  demon_slayer: ["Astra Force Shield"], demon_avenger: ["Astra Force Shield"],
  // Magician
  arch_mage_f_p: ["Astra Arcane Shield"], arch_mage_i_l: ["Astra Arcane Shield"],
  bishop: ["Astra Arcane Shield"], blaze_wizard: ["Astra Ruby Shield"],
  evan: ["Astra Honor Shield"], battle_mage: ["Astra Umbral Shield"],
  // Thief
  shadower: ["Astra Bane Shield"],
  // (lynn uses shields but has no distinct Astra shield in this data)
};

export interface SecondarySpec {
  /** Data file(s) to load and merge. Usually just ["secondary"]; Zero also reads "weapon"
   *  because its Lapis sub-sword is a 2H-flagged item that lives in weapon.json. */
  files: string[];
  /** Id prefixes to allow. */
  prefixes: string[];
  /** When true, also allow branch-matching regular (non-Astra) shields. */
  usesShield: boolean;
  /** Exact names of the Astra shield(s) this class may use (Astra shields can't be split by id). */
  astraShieldNames: string[];
}

const ZERO_SECONDARY_PREFIX = "01562"; // Lapis, lives in weapon.json alongside Lazuli

/** How to filter the secondary slot for a class, or null to fall back to branch filtering. */
export function secondarySpecForClass(classId: string | undefined): SecondarySpec | null {
  if (!classId) return null;
  if (classId === "zero") {
    // Lapis sub-sword (weapon.json) + Astra Hourglass subweapon (secondary.json).
    return { files: ["weapon", "secondary"], prefixes: [ZERO_SECONDARY_PREFIX, CLASS_ASTRA_SECONDARY.zero], usesShield: false, astraShieldNames: [] };
  }
  const types = CLASS_SECONDARY_TYPES[classId];
  if (!types) return null;
  const prefixes = types.flatMap((t) => SECONDARY_TYPE_PREFIXES[t] ?? []);
  const astra = CLASS_ASTRA_SECONDARY[classId];
  if (astra) prefixes.push(astra);
  return {
    files: ["secondary"],
    prefixes,
    usesShield: types.includes(SECONDARY_SHIELD),
    astraShieldNames: CLASS_ASTRA_SHIELD[classId] ?? [],
  };
}

/** Whether an id is a shield (shared war/mage/thief shield range). */
export function isShieldId(id: string): boolean {
  return id.startsWith(SHIELD_PREFIX);
}
