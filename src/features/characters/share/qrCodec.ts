/*
  Character QR format, version 1.

  A card's QR holds https://mapledoro.com/i#<data>, where <data> is base43 text (QR alphanumeric
  mode) of a bit stream. The part after the # never reaches the server. The stream carries what
  the profile shows and the Scouter needs, for the equipped preset only; the PNG card file
  carries everything. Left out: EXP history, tool progress the profile never shows, saved
  Scouter results, the avatar URL and ranking numbers (re-fetched by IGN), and names that game
  data can look up from an ID.

  Stability rules, so a card keeps decoding after patches and regenerated data:
  - Game IDs for items, pets and familiars.
  - Small enumerations use the frozen lists below. Only ever append to them, and every list
    is written with its length so an older decoder skips entries it doesn't know.
  - Free text pools (Inner Ability lines, familiar lines, V Matrix nodes) are stored as a hash
    of the exact text and resolved on decode by hashing the current candidates, so their order
    never matters. Text not in any pool is written out in full.
  - A format change bumps FORMAT_VERSION and keeps the old decoder.
*/

import {
  parseImportedCharacterFile,
  type CharacterExportWorldData,
  type StoredCharacterEquipment,
  type StoredCharacterRecord,
  type StoredCharacterStats,
  type StoredEquipmentItem,
  type StoredEquipmentPreset,
  type StoredFamiliarPreset,
  type StoredFamiliarSlot,
  type StoredInnerAbility,
  type StoredInnerAbilityLine,
  type StoredScouterBuffs,
  type StoredScouterData,
  type StoredScouterLegion,
  type StoredTripleStatField,
  type LinkSkillId,
  type LinkSkillsData,
} from "../model/charactersStore";
import { CLASS_SKILL_DATA } from "../setup/data/classSkillData";
import { FAMILIARS, getLinesForTier } from "../setup/data/familiarsData";
import { getLinesForIATier, IA_TIER_ORDER } from "../setup/data/innerAbilityData";
import { resolveDisplayJobName } from "../setup/data/nexonJobMapping";
import { BitReader, BitWriter, fromBase43, readText, readUtf8, textHash, toBase43, writeText, writeUtf8 } from "./qrBits";

export const QR_LINK_PREFIX = "https://mapledoro.com/i#";
const FORMAT_VERSION = 1;

// ── Frozen lists (append only) ───────────────────────────────────────────────

const CLASSES = [
  "Hoyoung", "Lara", "Ren", "Blaze Wizard", "Dawn Warrior", "Mihile", "Night Walker", "Thunder Breaker", "Wind Archer",
  "Demon Avenger", "Demon Slayer", "Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop", "Blade Master", "Bow Master",
  "Buccaneer", "Cannon Master", "Corsair", "Dark Knight", "Hero", "Marksman", "Night Lord", "Paladin", "Pathfinder",
  "Shadower", "Adele", "Ark", "Illium", "Khali", "Kinesis", "Aran", "Evan", "Luminous", "Mercedes", "Phantom", "Shade",
  "Lynn", "Mo Xuan", "Angelic Buster", "Cadena", "Kain", "Kaiser", "Battle Mage", "Blaster", "Mechanic", "Wild Hunter",
  "Xenon", "Hayato", "Kanna", "Sia Astelle", "Erel Light", "Zero", "Ancient Archer", "Archer", "Assassin", "Bandit",
  "Beginner", "Berserker", "Blade Acolyte", "Blade Lord", "Blade Recruit", "Blade Specialist", "Brawler", "Cannoneer",
  "Cannon Trooper", "Chief Bandit", "Citizen", "Cleric", "Crossbowman", "Crusader", "Fighter", "Gunslinger", "Hermit",
  "Hunter", "Mage (F/P)", "Mage (I/L)", "Magician", "Marauder", "Noblesse", "Outlaw", "Page", "Pirate", "Priest", "Ranger",
  "Rogue", "Sniper", "Soulchaser", "Spearman", "Swordman", "White Knight", "Wizard (F/P)", "Wizard (I/L)",
] as const;
const CLASS_ESCAPE = 127;

const TRIPLE_STATS = ["hp", "str", "dex", "int", "luk", "attackPower", "magicAtt"] as const;
const SINGLE_STATS = [
  "damage", "bossDamage", "ignoreDefense", "criticalRate", "criticalDamage", "buffDuration", "cooldownSkip",
  "ignoreElementalResistance", "additionalStatusDamage", "summonDuration", "arcanePower", "sacredPower", "mp",
  "normalEnemyDamage",
] as const;
const HYPER_STATS = [
  "str", "dex", "int", "luk", "hp", "mp", "dfTfPp", "criticalRate", "criticalDamage", "ignoreDefense", "damage",
  "bossDamage", "normalDamage", "statusResistance", "attackMagicAtt", "expObtained", "arcanePower",
];
const HEXA_STAT_TYPES = ["", "mainStat", "attackPower", "damage", "bossDamage", "ignoreDefense", "criticalDamage"];
const IA_TIERS = ["", ...IA_TIER_ORDER] as const;
const FAMILIAR_TIERS = ["", "common", "rare", "epic", "unique", "legendary"];
const OZ_RINGS = ["restraint", "weaponJump", "continuous"];
const NUMBER_BUFFS = ["bossSlayers", "undeterred", "forTheGuild", "hardHitter", "statPotionValue"] as const;
const FLAG_BUFFS = [
  "sayramElixir", "collectorElixir", "honorableElixir", "heroEcho", "legionMight", "masarayuGift", "extremePotion",
  "extremeGreenPotion", "mvpSuperpower", "vipBuff", "brightMoonlight", "believeInYourself", "gourmandPower",
  "enlightenedOne", "peerlessMarble", "candiedApple", "caretakerSupport", "sparklingRedStar", "maxedSacredSymbol",
  "greatHeroBoost", "legendaryHero", "advWeaponTempering", "sparklingBlueStar", "onyxApple", "tengusJudgement",
  "fishBuff", "ssiwsCheese", "witchStew", "energizerDrink", "energizerDrinkMagic", "attackPotionV", "magicPotionV",
  "genepass",
] as const;
const RENOWN = ["allStats", "atkMagAtk", "bossDmg", "ignoreDef", "critDmg"] as const;
const IA_LINE_ANSWERS = [undefined, "passive", "multiTarget", "neither"] as const;
// The 10 link skills the Scouter reads (scouterLinkSkills.ts).
const SCOUTER_LINKS: LinkSkillId[] = [
  "unfairAdvantage", "tideOfBattle", "solus", "timeToPrepare", "termsAndConditions", "elementalism", "qiCultivation",
  "bravado", "empiricalKnowledge", "thiefsCunning",
];
const SYMBOL_REGIONS = [
  "Vanishing Journey", "Chu Chu Island", "Lachelein", "Arcana", "Morass", "Esfera", "Cernium", "Hotel Arcus", "Odium",
  "Shangri-La", "Arteria", "Carcion", "Tallahart", "Geardock",
];
const SYMBOL_TABS = ["", "arcane", "sacred"];
const BADGES = [
  "Starter Badge", "Snowflake Badge", "Oppressor Badge", "Secret Badge", "Mesa Badge", "Peaceful Badge", "Rebel Badge",
  "Mineral Badge", "Sandy Badge", "Clockwork Badge", "Wave Badge", "Snow Badge", "Depths Badge", "Cloud Badge",
  "Hatching Badge", "Time Badge", "Shuriken Badge", "Showa Badge", "Tyrant Badge", "Lion Badge", "Future Badge",
  "Mariner Badge", "Commerci Badge", "Mushking Badge", "Void Badge", "Labyrinth Badge", "Apocalypse Badge",
  "Ocean Badge", "Swamp Badge", "Holy Badge", "Wasteland Badge", "Researcher Badge", "Flora Army Badge",
  "Shadow Badge", "Magical Badge", "Beach Badge", "Machine Badge", "Toy Badge", "Forest Badge", "Wings Badge",
  "Shrine Badge", "City Badge", "Mighty Badge", "Exorcism Badge", "Cursed Badge", "Dragon Badge", "Darkness Badge",
  "Crucible Badge",
];
const WH_RANKS = [undefined, "none", "B", "A", "S", "SS", "SSS"] as const;
// Equipment preset slots in order, each with the public/data/equipment file holding its names.
const GEAR_SLOTS: { key: keyof StoredEquipmentPreset; index?: number; file: string }[] = [
  { key: "rings", index: 0, file: "ring" }, { key: "rings", index: 1, file: "ring" },
  { key: "rings", index: 2, file: "ring" }, { key: "rings", index: 3, file: "ring" },
  { key: "face", file: "face" }, { key: "eye", file: "eye" }, { key: "earring", file: "earring" },
  { key: "pendants", index: 0, file: "pendant" }, { key: "pendants", index: 1, file: "pendant" },
  { key: "belt", file: "belt" }, { key: "pocket", file: "pocket" }, { key: "hat", file: "hat" },
  { key: "cape", file: "cape" }, { key: "top", file: "top" }, { key: "glove", file: "glove" },
  { key: "bottom", file: "bottom" }, { key: "shoe", file: "shoe" }, { key: "shoulder", file: "shoulder" },
  { key: "medal", file: "medal" }, { key: "weapon", file: "weapon" }, { key: "secondary", file: "secondary" },
  { key: "emblem", file: "emblem" }, { key: "android", file: "android" }, { key: "heart", file: "heart" },
  { key: "badge", file: "badge" },
];
const SHARED_GEAR: { key: "totems" | "pets" | "petEquips"; file: string }[] = [
  { key: "totems", file: "totem" }, { key: "pets", file: "pet" }, { key: "petEquips", file: "petequip" },
];

// Text pools resolved by hash. Widths keep the current pools collision free (checked by test).
const IA_HASH_BITS = 20;
const FAMILIAR_LINE_HASH_BITS = 24;
const VMATRIX_HASH_BITS = 16;

// ── Small helpers ────────────────────────────────────────────────────────────

/** Index into a frozen list, written with `width` bits; 0 means absent, so values are index+1. */
function writeChoice<T>(w: BitWriter, list: readonly T[], value: T | undefined, width: number) {
  const i = value === undefined ? -1 : list.indexOf(value);
  w.put(i < 0 ? 0 : i + 1, width);
}
function readChoice<T>(r: BitReader, list: readonly T[], width: number): T | undefined {
  const i = r.get(width);
  return i === 0 ? undefined : list[i - 1];
}

/** Nullable boolean in 2 bits: null, false, true. */
const TRI = [null, false, true] as const;
function writeTri(w: BitWriter, value: boolean | null | undefined) {
  w.put(TRI.indexOf(value ?? null), 2);
}
function readTri(r: BitReader): boolean | null {
  return TRI[r.get(2)] ?? null;
}

/** A stat typed as text ("96.45", "", "31030"): exact decimals kept, anything odd written raw. */
function writeDecimal(w: BitWriter, value: string | undefined) {
  if (!value) { w.bit(false); return; }
  w.bit(true);
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) { w.put(3, 2); writeUtf8(w, value); return; }
  const decimals = match[2]?.length ?? 0;
  w.put(decimals, 2);
  w.varint(Number(match[1] + (match[2] ?? "")));
}
function readDecimal(r: BitReader): string {
  if (!r.bit()) return "";
  const decimals = r.get(2);
  if (decimals === 3) return readUtf8(r);
  const digits = String(r.varint()).padStart(decimals + 1, "0");
  return decimals === 0 ? digits : `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

function writeOptionalNumber(w: BitWriter, value: number | undefined) {
  w.bit(value !== undefined);
  if (value !== undefined) w.varint(value);
}
function readOptionalNumber(r: BitReader): number | undefined {
  return r.bit() ? r.varint() : undefined;
}

/** Text from a known pool as a hash, unknown text in full, empty as one tag. */
function writePooled(w: BitWriter, value: string, pool: ReadonlySet<string>, bits: number) {
  if (!value) { w.put(0, 2); return; }
  if (pool.has(value)) { w.put(1, 2); w.put(textHash(value, bits), bits); return; }
  w.put(2, 2);
  writeUtf8(w, value);
}
function readPooled(r: BitReader, byHash: ReadonlyMap<number, string>, bits: number): string {
  const tag = r.get(2);
  if (tag === 1) return byHash.get(r.get(bits)) ?? "";
  return tag === 2 ? readUtf8(r) : "";
}

function hashIndex(pool: Iterable<string>, bits: number): Map<number, string> {
  const map = new Map<number, string>();
  for (const text of pool) map.set(textHash(text, bits), text);
  return map;
}

// Pools for hashed text, built once on first use.
let iaPool: Set<string> | null = null;
let familiarLinePool: Set<string> | null = null;
function iaLines(): Set<string> {
  iaPool ??= new Set(IA_TIER_ORDER.flatMap((tier) => getLinesForIATier(tier)));
  return iaPool;
}
function familiarLines(): Set<string> {
  familiarLinePool ??= new Set(getLinesForTier("legendary"));
  return familiarLinePool;
}

// An item ID is its category (the digits above the last four, e.g. 0100xxxx = hat) plus a
// 4-digit remainder. Most slots hold one category, so "the usual one" costs a single bit.
// Pets have 7-digit IDs, everything else 8.
const USUAL_CATEGORY: Record<string, number> = {
  android: 166, badge: 118, belt: 113, bottom: 105, cape: 110, earring: 103, emblem: 119, eye: 102, face: 101,
  glove: 108, hat: 100, heart: 167, medal: 114, pendant: 112, pet: 500, petequip: 180, pocket: 116, ring: 111,
  secondary: 135, shoe: 107, shoulder: 115, title: 370, top: 105, totem: 120, weapon: 140,
};
const usualIdLength = (file: string) => (file === "pet" ? 7 : 8);

/** Tags: 0 empty, 1 ID as category + remainder, 2 name only, 3 any other ID in full. */
function writeItem(w: BitWriter, item: StoredEquipmentItem | null | undefined, file: string) {
  if (!item?.id && !item?.name) { w.put(0, 2); return; }
  if (!item.id || !/^\d{1,15}$/.test(item.id)) { w.put(2, 2); writeUtf8(w, item.name); return; }
  const id = Number(item.id);
  const category = Math.floor(id / 10000);
  if (category > 2047) { w.put(3, 2); w.put(item.id.length, 4); w.varint(id); return; }
  w.put(1, 2);
  w.bit(item.id.length === usualIdLength(file));
  if (item.id.length !== usualIdLength(file)) w.put(item.id.length, 4);
  w.bit(category === USUAL_CATEGORY[file]);
  if (category !== USUAL_CATEGORY[file]) w.put(category, 11);
  w.put(id % 10000, 14);
}
function readItem(r: BitReader, file: string): StoredEquipmentItem | null {
  const tag = r.get(2);
  if (tag === 2) return { name: readUtf8(r) };
  if (tag === 3) {
    const length = r.get(4);
    return { id: String(r.varint()).padStart(length, "0"), name: "" };
  }
  if (tag !== 1) return null;
  const length = r.bit() ? usualIdLength(file) : r.get(4);
  const category = r.bit() ? USUAL_CATEGORY[file] ?? 0 : r.get(11);
  return { id: String(category * 10000 + r.get(14)).padStart(length, "0"), name: "" };
}

// ── Sections ─────────────────────────────────────────────────────────────────

function writeIdentity(w: BitWriter, c: StoredCharacterRecord) {
  writeText(w, c.characterName);
  w.varint(c.worldID);
  const classIndex = (CLASSES as readonly string[]).indexOf(c.jobName);
  w.put(classIndex < 0 ? CLASS_ESCAPE : classIndex, 7);
  if (classIndex < 0) writeUtf8(w, c.jobName);
  w.varint(c.level);
  w.varint(c.exp);
  w.varint(Math.floor(c.fetchedAt / 60000));
}
function readIdentity(r: BitReader) {
  const characterName = readText(r);
  const worldID = r.varint();
  const classIndex = r.get(7);
  const jobName = classIndex === CLASS_ESCAPE ? readUtf8(r) : CLASSES[classIndex] ?? "";
  const level = r.varint();
  const exp = r.varint();
  const fetchedAt = r.varint() * 60000;
  return { characterName, worldID, jobName, level, exp, fetchedAt };
}

const SOUL_TYPES = ["none", "mugong", "ephenia"] as const;
const GENDERS = ["male", "female"] as const;
const WEAPON_HANDS = ["1h", "2h"] as const;

function writeBio(w: BitWriter, c: StoredCharacterRecord) {
  writeChoice(w, GENDERS, c.gender ?? undefined, 2);
  writeTri(w, c.marriage?.isMarried);
  w.bit(Boolean(c.marriage?.partnerName));
  if (c.marriage?.partnerName) writeText(w, c.marriage.partnerName);
  writeTri(w, c.isLiberated);
  writeChoice(w, WEAPON_HANDS, c.weaponHand ?? undefined, 2);
  writeTri(w, c.hasRuinForceShield);
  writeChoice(w, SOUL_TYPES, c.soul?.type ?? undefined, 2);
  w.put(c.soul?.soulLevel ?? 0, 2);
}
function readBio(r: BitReader) {
  const gender = readChoice(r, GENDERS, 2) ?? null;
  const isMarried = readTri(r);
  const partnerName = r.bit() ? readText(r) : null;
  const isLiberated = readTri(r);
  const weaponHand = readChoice(r, WEAPON_HANDS, 2) ?? null;
  const hasRuinForceShield = readTri(r);
  const soulType = readChoice(r, SOUL_TYPES, 2) ?? null;
  const soulLevel = r.get(2);
  return {
    gender,
    marriage: isMarried === null && partnerName === null ? null : { isMarried, partnerName },
    isLiberated,
    weaponHand,
    hasRuinForceShield,
    soul: soulType === null ? null : { type: soulType, soulLevel: soulLevel === 1 || soulLevel === 2 ? soulLevel : null },
  };
}

function writeWorld(w: BitWriter, legion: StoredScouterLegion | undefined) {
  w.bit(Boolean(legion));
  if (!legion) return;
  writeChoice(w, WH_RANKS, legion.wildHunterRank, 3);
  writeTri(w, legion.artifactExtraTarget);
  writeOptionalNumber(w, legion.artifactFinalAttackDmg);
}
function readWorld(r: BitReader): StoredScouterLegion | undefined {
  if (!r.bit()) return undefined;
  const wildHunterRank = readChoice(r, WH_RANKS, 3);
  const extra = readTri(r);
  const finalAttack = readOptionalNumber(r);
  return {
    ...(wildHunterRank && { wildHunterRank }),
    ...(extra !== null && { artifactExtraTarget: extra }),
    ...(finalAttack !== undefined && { artifactFinalAttackDmg: finalAttack }),
  };
}

function writeStats(w: BitWriter, s: StoredCharacterStats) {
  for (const key of TRIPLE_STATS) {
    const field: StoredTripleStatField | undefined = s[key];
    writeDecimal(w, field?.base); writeDecimal(w, field?.percent); writeDecimal(w, field?.percentUnapplied);
  }
  for (const key of SINGLE_STATS) writeDecimal(w, s[key]);
  writeDecimal(w, s.cooldownReduction?.seconds);
  writeDecimal(w, s.cooldownReduction?.percent);
}
function readStats(r: BitReader): Omit<StoredCharacterStats, "hyperStat" | "innerAbility"> {
  const triple = () => ({ base: readDecimal(r), percent: readDecimal(r), percentUnapplied: readDecimal(r) });
  const triples = Object.fromEntries(TRIPLE_STATS.map((k) => [k, triple()])) as Record<(typeof TRIPLE_STATS)[number], StoredTripleStatField>;
  const singles = Object.fromEntries(SINGLE_STATS.map((k) => [k, readDecimal(r)])) as Record<(typeof SINGLE_STATS)[number], string>;
  return { ...triples, ...singles, cooldownReduction: { seconds: readDecimal(r), percent: readDecimal(r) } };
}

function writeHyperStat(w: BitWriter, s: StoredCharacterStats) {
  const active = s.hyperStat?.presets[s.hyperStat.activePreset];
  w.bit(Boolean(active));
  if (!active || !s.hyperStat) return;
  w.put(s.hyperStat.activePreset, 2);
  w.put(HYPER_STATS.length, 6);
  for (const key of HYPER_STATS) w.put(Math.min(15, active[key] ?? 0), 4);
}
function readHyperStat(r: BitReader): StoredCharacterStats["hyperStat"] {
  if (!r.bit()) return undefined;
  const activePreset = r.get(2);
  const count = r.get(6);
  const preset: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    const level = r.get(4);
    const key = HYPER_STATS[i];
    if (key && level > 0) preset[key] = level;
  }
  const presets: Record<string, number>[] = [{}, {}, {}];
  presets[activePreset] = preset;
  return { presets, activePreset };
}

function writeInnerAbility(w: BitWriter, ia: StoredInnerAbility | undefined) {
  const active = ia?.presets[ia.activePreset];
  w.bit(Boolean(active));
  if (!active || !ia) return;
  w.put(ia.activePreset, 2);
  for (const line of active.lines) {
    writeChoice(w, IA_TIERS, line.tier || undefined, 3);
    writePooled(w, line.value, iaLines(), IA_HASH_BITS);
  }
}
function readInnerAbility(r: BitReader): StoredInnerAbility | undefined {
  if (!r.bit()) return undefined;
  const activePreset = r.get(2);
  const byHash = hashIndex(iaLines(), IA_HASH_BITS);
  const line = (): StoredInnerAbilityLine => ({ tier: readChoice(r, IA_TIERS, 3) ?? "", value: readPooled(r, byHash, IA_HASH_BITS) });
  const emptyLine = (): StoredInnerAbilityLine => ({ tier: "", value: "" });
  const empty = () => ({ lines: [emptyLine(), emptyLine(), emptyLine()] as StoredInnerAbilityLine[] as [StoredInnerAbilityLine, StoredInnerAbilityLine, StoredInnerAbilityLine] });
  const presets: StoredInnerAbility["presets"] = [empty(), empty(), empty()];
  presets[activePreset] = { lines: [line(), line(), line()] };
  return { activePreset, presets };
}

function writeBuffs(w: BitWriter, buffs: StoredScouterBuffs | undefined) {
  w.bit(Boolean(buffs));
  if (!buffs) return;
  for (const key of NUMBER_BUFFS) writeOptionalNumber(w, buffs[key]);
  w.put(FLAG_BUFFS.length, 7);
  for (const key of FLAG_BUFFS) w.bit(Boolean(buffs[key]));
  w.bit(Boolean(buffs.maxedSymbols));
  if (buffs.maxedSymbols) {
    w.put(SYMBOL_REGIONS.length, 5);
    for (const region of SYMBOL_REGIONS) w.bit(buffs.maxedSymbols.includes(region));
  }
  w.bit(Boolean(buffs.renown));
  if (buffs.renown) for (const key of RENOWN) writeOptionalNumber(w, buffs.renown[key]);
}
function readMaxedSymbols(r: BitReader): string[] {
  const count = r.get(5);
  const regions: string[] = [];
  for (let i = 0; i < count; i++) if (r.bit() && SYMBOL_REGIONS[i]) regions.push(SYMBOL_REGIONS[i]);
  return regions;
}

function readRenown(r: BitReader): NonNullable<StoredScouterBuffs["renown"]> {
  const renown: NonNullable<StoredScouterBuffs["renown"]> = {};
  for (const key of RENOWN) {
    const value = readOptionalNumber(r);
    if (value !== undefined) renown[key] = value;
  }
  return renown;
}

function readBuffs(r: BitReader): StoredScouterBuffs | undefined {
  if (!r.bit()) return undefined;
  const buffs: StoredScouterBuffs = {};
  for (const key of NUMBER_BUFFS) {
    const value = readOptionalNumber(r);
    if (value !== undefined) buffs[key] = value;
  }
  const flagCount = r.get(7);
  for (let i = 0; i < flagCount; i++) {
    const key = FLAG_BUFFS[i];
    if (r.bit() && key) buffs[key] = true;
  }
  if (r.bit()) buffs.maxedSymbols = readMaxedSymbols(r);
  if (r.bit()) buffs.renown = readRenown(r);
  return buffs;
}

function writeScouter(w: BitWriter, scouter: StoredScouterData | undefined) {
  w.bit(Boolean(scouter?.ozRings));
  if (scouter?.ozRings) for (const ring of OZ_RINGS) w.put(Math.min(7, scouter.ozRings.levels[ring] ?? 0), 3);
  writeBuffs(w, scouter?.buffs);
  writeChoice(w, IA_LINE_ANSWERS.slice(1), scouter?.innerAbilityLine, 2);
}
function readScouter(r: BitReader): StoredScouterData {
  const scouter: StoredScouterData = {};
  if (r.bit()) {
    const levels: Record<string, number> = {};
    for (const ring of OZ_RINGS) {
      const level = r.get(3);
      if (level > 0) levels[ring] = level;
    }
    scouter.ozRings = { levels };
  }
  const buffs = readBuffs(r);
  if (buffs) scouter.buffs = buffs;
  const line = readChoice(r, IA_LINE_ANSWERS.slice(1), 2);
  if (line) scouter.innerAbilityLine = line;
  return scouter;
}

function writeLinks(w: BitWriter, links: LinkSkillsData | undefined) {
  w.put(SCOUTER_LINKS.length, 5);
  for (const id of SCOUTER_LINKS) w.put(Math.min(15, links?.[id] ?? 0), 4);
}
function readLinks(r: BitReader): LinkSkillsData {
  const count = r.get(5);
  const links: LinkSkillsData = {};
  for (let i = 0; i < count; i++) {
    const level = r.get(4);
    const id = SCOUTER_LINKS[i];
    if (id && level > 0) links[id] = level;
  }
  return links;
}

interface HexaSkillsTool { className?: string; levels?: Record<string, number | number[]> }
const HEXA_SINGLE = ["origin", "ascent"] as const;
const HEXA_ARRAYS = ["mastery", "enhancement", "common"] as const;

function writeHexaSkills(w: BitWriter, tool: HexaSkillsTool | undefined, jobName: string) {
  w.bit(Boolean(tool?.levels));
  if (!tool?.levels) return;
  const sameClass = tool.className === resolveDisplayJobName(jobName);
  w.bit(sameClass);
  if (!sameClass) writeUtf8(w, tool.className ?? "");
  for (const key of HEXA_SINGLE) w.put(Math.min(31, Number(tool.levels[key] ?? 0)), 5);
  for (const key of HEXA_ARRAYS) {
    const values = Array.isArray(tool.levels[key]) ? (tool.levels[key] as number[]) : [];
    w.put(Math.min(7, values.length), 3);
    for (const v of values.slice(0, 7)) w.put(Math.min(31, v), 5);
  }
}
function readHexaSkills(r: BitReader, jobName: string): HexaSkillsTool | undefined {
  if (!r.bit()) return undefined;
  const className = r.bit() ? resolveDisplayJobName(jobName) : readUtf8(r);
  const levels: Record<string, number | number[]> = {};
  for (const key of HEXA_SINGLE) levels[key] = r.get(5);
  for (const key of HEXA_ARRAYS) {
    const length = r.get(3);
    levels[key] = Array.from({ length }, () => r.get(5));
  }
  return { className, levels };
}

interface HexaStatEntryShape { type: string; level: number }
interface HexaStatPresetShape { main: HexaStatEntryShape; alt: HexaStatEntryShape[] }
interface HexaStatTool { nodes?: { presets: HexaStatPresetShape[]; activePreset: number }[] }

function writeStatEntry(w: BitWriter, entry: HexaStatEntryShape | undefined) {
  writeChoice(w, HEXA_STAT_TYPES.slice(1), entry?.type || undefined, 3);
  w.put(Math.min(31, entry?.level ?? 0), 5);
}
function readStatEntry(r: BitReader): HexaStatEntryShape {
  return { type: readChoice(r, HEXA_STAT_TYPES.slice(1), 3) ?? "", level: r.get(5) };
}

function writeHexaStat(w: BitWriter, tool: HexaStatTool | undefined) {
  const nodes = tool?.nodes ?? [];
  w.put(Math.min(7, nodes.length), 3);
  for (const node of nodes.slice(0, 7)) {
    const preset = node.presets[node.activePreset];
    w.put(node.presets.length, 2);
    w.put(node.activePreset, 2);
    writeStatEntry(w, preset?.main);
    w.put(preset?.alt.length ?? 0, 2);
    for (const alt of preset?.alt ?? []) writeStatEntry(w, alt);
  }
}
function readHexaStat(r: BitReader): HexaStatTool | undefined {
  const count = r.get(3);
  if (count === 0) return undefined;
  const nodes: NonNullable<HexaStatTool["nodes"]> = [];
  for (let n = 0; n < count; n++) {
    const presetCount = r.get(2);
    const activePreset = r.get(2);
    const main = readStatEntry(r);
    const alt = Array.from({ length: r.get(2) }, () => readStatEntry(r));
    const blank = (): HexaStatPresetShape => ({ main: { type: "", level: 0 }, alt: alt.map(() => ({ type: "", level: 0 })) });
    const presets = Array.from({ length: Math.max(presetCount, activePreset + 1) }, blank);
    presets[activePreset] = { main, alt };
    nodes.push({ presets, activePreset });
  }
  return { nodes };
}

interface SymbolsTool { type?: string; symbols?: Record<string, { level?: number }> }

function writeSymbols(w: BitWriter, tool: SymbolsTool | undefined) {
  w.bit(Boolean(tool?.symbols));
  if (!tool?.symbols) return;
  writeChoice(w, SYMBOL_TABS.slice(1), tool.type, 2);
  w.put(SYMBOL_REGIONS.length, 5);
  for (const region of SYMBOL_REGIONS) {
    const level = tool.symbols[region]?.level;
    w.bit(level !== undefined);
    if (level !== undefined) w.put(Math.min(31, level), 5);
  }
}
function readSymbols(r: BitReader): SymbolsTool | undefined {
  if (!r.bit()) return undefined;
  const type = readChoice(r, SYMBOL_TABS.slice(1), 2) ?? "arcane";
  const count = r.get(5);
  const symbols: Record<string, { level: number; current: number; daily: number; weeklyEnabled: boolean }> = {};
  for (let i = 0; i < count; i++) {
    if (!r.bit()) continue;
    const level = r.get(5);
    const region = SYMBOL_REGIONS[i];
    if (region) symbols[region] = { level, current: 0, daily: 0, weeklyEnabled: false };
  }
  return { type, symbols };
}

function presetSlot(preset: StoredEquipmentPreset, slot: (typeof GEAR_SLOTS)[number]): StoredEquipmentItem | null {
  const value = preset[slot.key];
  return Array.isArray(value) ? value[slot.index ?? 0] ?? null : (value as StoredEquipmentItem | null);
}

function writeGear(w: BitWriter, eq: StoredCharacterEquipment) {
  const preset = eq.presets[eq.activePreset] ?? eq.presets[0];
  w.put(eq.activePreset, 2);
  w.put(GEAR_SLOTS.length, 6);
  for (const slot of GEAR_SLOTS) writeItem(w, presetSlot(preset, slot), slot.file);
  writeItem(w, eq.title, "title");
  for (const { key, file } of SHARED_GEAR) for (const item of eq[key]) writeItem(w, item, file);
}

function emptyGearPreset(): StoredEquipmentPreset {
  return {
    rings: [null, null, null, null], face: null, eye: null, earring: null, pendants: [null, null], belt: null,
    pocket: null, hat: null, cape: null, top: null, glove: null, bottom: null, shoe: null, shoulder: null,
    medal: null, weapon: null, secondary: null, emblem: null, android: null, heart: null, badge: null,
  };
}

function readGear(r: BitReader): StoredCharacterEquipment {
  const activePreset = r.get(2);
  const count = r.get(6);
  const preset = emptyGearPreset();
  for (let i = 0; i < count; i++) {
    const slot = GEAR_SLOTS[i];
    const item = readItem(r, slot?.file ?? "");
    if (!slot) continue;
    const current = preset[slot.key];
    if (Array.isArray(current)) current[slot.index ?? 0] = item;
    else (preset as unknown as Record<string, StoredEquipmentItem | null>)[slot.key] = item;
  }
  const presets: StoredCharacterEquipment["presets"] = [emptyGearPreset(), emptyGearPreset(), emptyGearPreset()];
  presets[activePreset] = preset;
  const title = readItem(r, "title");
  const three = (file: string) => [readItem(r, file), readItem(r, file), readItem(r, file)] as [StoredEquipmentItem | null, StoredEquipmentItem | null, StoredEquipmentItem | null];
  return { presets, activePreset, title, totems: three("totem"), pets: three("pet"), petEquips: three("petequip") };
}

interface FamiliarsShape { presets: StoredFamiliarPreset[]; activePreset: number }

function writeFamiliars(w: BitWriter, data: FamiliarsShape | undefined) {
  const preset = data?.presets[data.activePreset];
  w.bit(Boolean(preset));
  if (!preset || !data) return;
  w.put(data.activePreset, 3);
  w.put(preset.familiars.length, 2);
  for (const slot of preset.familiars) {
    w.bit(slot.familiarId !== null);
    if (slot.familiarId === null) continue;
    writeFamiliarId(w, slot.familiarId);
    writeChoice(w, FAMILIAR_TIERS.slice(1), slot.tier || undefined, 3);
    writePooled(w, slot.line1, familiarLines(), FAMILIAR_LINE_HASH_BITS);
    writePooled(w, slot.line2, familiarLines(), FAMILIAR_LINE_HASH_BITS);
  }
  w.put(preset.badges.length, 4);
  for (const badge of preset.badges) writeBadge(w, badge);
}

// Familiar IDs start at 9960000, so an offset from there takes about 2 bytes instead of 4.
const FAMILIAR_ID_BASE = 9960000;
function writeFamiliarId(w: BitWriter, id: number) {
  w.bit(id >= FAMILIAR_ID_BASE);
  w.varint(id >= FAMILIAR_ID_BASE ? id - FAMILIAR_ID_BASE : id);
}
function readFamiliarId(r: BitReader): number {
  return r.bit() ? FAMILIAR_ID_BASE + r.varint() : r.varint();
}

// 0 = empty, 1..62 = BADGES index + 1, 63 = a badge not in the list, written in full.
function writeBadge(w: BitWriter, badge: string) {
  if (!badge) { w.put(0, 6); return; }
  const i = BADGES.indexOf(badge);
  if (i >= 0) { w.put(i + 1, 6); return; }
  w.put(63, 6);
  writeUtf8(w, badge);
}

function emptyFamiliarSlot(): StoredFamiliarSlot {
  return { familiarId: null, mobId: "", name: "", tier: "", line1: "", line2: "" };
}

function readFamiliars(r: BitReader): FamiliarsShape | undefined {
  if (!r.bit()) return undefined;
  const activePreset = r.get(3);
  const lineByHash = hashIndex(familiarLines(), FAMILIAR_LINE_HASH_BITS);
  const familiars = Array.from({ length: r.get(2) }, (): StoredFamiliarSlot => {
    if (!r.bit()) return emptyFamiliarSlot();
    const familiarId = readFamiliarId(r);
    const entry = FAMILIARS.find((f) => f.id === familiarId);
    const tier = readChoice(r, FAMILIAR_TIERS.slice(1), 3) ?? "";
    const line1 = readPooled(r, lineByHash, FAMILIAR_LINE_HASH_BITS);
    const line2 = readPooled(r, lineByHash, FAMILIAR_LINE_HASH_BITS);
    return { familiarId, mobId: entry?.mobId ?? "", name: entry?.name ?? "", tier, line1, line2 };
  });
  const badges = Array.from({ length: r.get(4) }, () => {
    const i = r.get(6);
    if (i === 0) return "";
    return i === 63 ? readUtf8(r) : BADGES[i - 1] ?? "";
  });
  const empty = (): StoredFamiliarPreset => ({ familiars: familiars.map(emptyFamiliarSlot), badges: badges.map(() => "") });
  const presets = Array.from({ length: Math.max(5, activePreset + 1) }, empty);
  presets[activePreset] = { familiars, badges };
  return { presets, activePreset };
}

function writeVMatrix(w: BitWriter, levels: Record<string, number> | undefined) {
  const entries = Object.entries(levels ?? {});
  w.varint(entries.length);
  for (const [name, level] of entries) {
    w.put(textHash(name, VMATRIX_HASH_BITS), VMATRIX_HASH_BITS);
    writeNodeLevel(w, level);
  }
}
function readVMatrix(r: BitReader): { hash: number; level: number }[] {
  return Array.from({ length: r.varint() }, () => ({ hash: r.get(VMATRIX_HASH_BITS), level: readNodeLevel(r) }));
}

// Nearly every node sits at a cap of 30 (skill and common nodes) or 60 (boost nodes), so
// those take a 2-bit code; anything else follows in 6 bits.
const NODE_LEVEL_CODES = [30, 60];
function writeNodeLevel(w: BitWriter, level: number) {
  const code = NODE_LEVEL_CODES.indexOf(level);
  w.put(code + 1, 2);
  if (code < 0) w.put(Math.min(63, level), 6);
}
function readNodeLevel(r: BitReader): number {
  const code = r.get(2);
  return code === 0 ? r.get(6) : NODE_LEVEL_CODES[code - 1] ?? 0;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Encodes a character for the card's QR. Returns the full link plus its two parts, since the
 *  QR writes the prefix in byte mode and the data in alphanumeric mode. */
export function encodeCharacterQr(record: StoredCharacterRecord, world: CharacterExportWorldData): { link: string; data: string } {
  const w = new BitWriter();
  w.put(FORMAT_VERSION, 8);
  writeIdentity(w, record);
  writeBio(w, record);
  writeWorld(w, world.scouterLegion);
  writeStats(w, record.stats);
  writeHyperStat(w, record.stats);
  writeInnerAbility(w, record.stats.innerAbility);
  writeScouter(w, record.scouter);
  writeLinks(w, record.linkSkills);
  writeHexaSkills(w, record.tools?.hexaSkills as HexaSkillsTool | undefined, record.jobName);
  writeHexaStat(w, record.tools?.hexaStat as HexaStatTool | undefined);
  writeSymbols(w, record.tools?.symbols as SymbolsTool | undefined);
  writeGear(w, record.equipment);
  writeFamiliars(w, record.familiars);
  writeVMatrix(w, record.vMatrix?.levels);
  const data = toBase43(w.bytes());
  return { link: QR_LINK_PREFIX + data, data };
}

/** Fetches game data JSON from public/data (V Matrix nodes, equipment names). Injectable so
 *  decoding can run outside the browser. */
type LoadJson = (path: string) => Promise<unknown>;
const fetchJson: LoadJson = async (path) => {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
};

async function resolveVMatrix(entries: { hash: number; level: number }[], jobName: string, load: LoadJson) {
  if (entries.length === 0) return undefined;
  const classId = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName)?.id;
  if (!classId) return undefined;
  const data = (await load(`/data/vmatrix/${classId}.json`)) as Record<string, [string, string, number][]>;
  const byHash = hashIndex(Object.values(data).flat().map((node) => node[1]), VMATRIX_HASH_BITS);
  const levels: Record<string, number> = {};
  for (const { hash, level } of entries) {
    const name = byHash.get(hash);
    if (name) levels[name] = level;
  }
  return { levels };
}

async function resolveItemNames(eq: StoredCharacterEquipment, load: LoadJson) {
  const preset = eq.presets[eq.activePreset];
  const needed: { item: StoredEquipmentItem; file: string }[] = [];
  const add = (item: StoredEquipmentItem | null, file: string) => { if (item?.id && !item.name) needed.push({ item, file }); };
  for (const slot of GEAR_SLOTS) add(presetSlot(preset, slot), slot.file);
  add(eq.title, "title");
  for (const { key, file } of SHARED_GEAR) for (const item of eq[key]) add(item, file);

  // Each equipment file is fetched once, all in parallel.
  const files = [...new Set(needed.map((n) => n.file))];
  const tables = await Promise.all(files.map(async (file) => {
    const rows = (await load(`/data/equipment/${file}.json`)) as [string, string][];
    return [file, new Map(rows.map(([id, name]) => [id, name]))] as const;
  }));
  const names = new Map(tables);
  for (const { item, file } of needed) item.name = names.get(file)?.get(item.id ?? "") ?? "";
}

/** Decodes the data after a card QR's #. Returns null when it isn't a valid card. Missing
 *  pieces (other presets, EXP history, tool progress, avatar, ranking) come back empty. */
export async function decodeCharacterQr(
  data: string,
  load: LoadJson = fetchJson,
): Promise<{ record: StoredCharacterRecord; world: CharacterExportWorldData } | null> {
  const bytes = fromBase43(data);
  if (!bytes) return null;
  try {
    const r = new BitReader(bytes);
    if (r.get(8) !== FORMAT_VERSION) return null;
    const identity = readIdentity(r);
    const bio = readBio(r);
    const scouterLegion = readWorld(r);
    const stats: StoredCharacterStats = { ...readStats(r), hyperStat: readHyperStat(r), innerAbility: readInnerAbility(r) };
    const scouter = readScouter(r);
    const linkSkills = readLinks(r);
    const hexaSkills = readHexaSkills(r, identity.jobName);
    const hexaStat = readHexaStat(r);
    const symbols = readSymbols(r);
    const equipment = readGear(r);
    const familiars = readFamiliars(r);
    const vMatrixEntries = readVMatrix(r);

    await resolveItemNames(equipment, load);
    const vMatrix = await resolveVMatrix(vMatrixEntries, identity.jobName, load);
    const tools: Record<string, unknown> = {
      ...(hexaSkills && { hexaSkills }),
      ...(hexaStat && { hexaStat }),
      ...(symbols && { symbols }),
    };
    const character = {
      ...identity,
      characterID: 0, characterImgURL: "", isSearchTarget: false, startRank: 0, overallRank: 0, overallGap: 0,
      legionRank: 0, legionGap: 0, legionLevel: 0, raidPower: 0, tierID: 0, score: 0, expiresAt: identity.fetchedAt,
      ...bio, stats, equipment, tools, scouter, linkSkills,
      ...(familiars && { familiars }),
      ...(vMatrix && { vMatrix }),
      meta: { addedAt: Date.now(), updatedAt: Date.now() },
    };
    return parseImportedCharacterFile({ kind: "character", version: 1, character, world: { scouterLegion } });
  } catch {
    return null;
  }
}
