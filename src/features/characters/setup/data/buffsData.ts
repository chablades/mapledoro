/*
  MapleScouter buffs step — GMS buff catalog, draft type, parse/serialize/convert helpers.

  Mutual exclusion groups (selecting one deselects others in the same group):
    Group A: greatHeroBoost, legendaryHero, advWeaponTempering, sparklingBlueStar
    Group B: onyxApple, tengusJudgement
*/

import type { StoredScouterBuffs } from "../../model/charactersStore";

// ── Leveled guild buffs (0–15) ───────────────────────────────────────────────

export const GUILD_BUFF_MAX = 15;

export type GuildBuffId = "bossSlayers" | "undeterred" | "forTheGuild" | "hardHitter";

export interface GuildBuffEntry {
  id: GuildBuffId;
  name: string;
  skillId: string;
}

export const GUILD_BUFFS: readonly GuildBuffEntry[] = [
  { id: "bossSlayers", name: "Boss Slayers",   skillId: "80003600" },
  { id: "undeterred",  name: "Undeterred",      skillId: "80003601" },
  { id: "forTheGuild", name: "For the Guild!",  skillId: "80003602" },
  { id: "hardHitter",  name: "Hard Hitter",     skillId: "80003603" },
];

// ── Advanced Stat Potion tier dropdown ───────────────────────────────────────

export type StatId = "str" | "dex" | "int" | "luk";

const STAT_POTION_STAT_VALUE: Record<number, number> = {
  1: 3, 2: 6, 3: 9, 4: 12, 5: 15, 6: 18, 7: 21, 8: 24, 9: 27, 10: 30,
};

// Item IDs for each stat × tier (I–X). Keys: "<stat>_<tier>".
const STAT_POTION_ITEM_IDS: Record<StatId, string[]> = {
  str: ["02004010","02004011","02004012","02004013","02004014","02004015","02004016","02004017","02004018","02004019"],
  dex: ["02004030","02004031","02004032","02004033","02004034","02004035","02004036","02004037","02004038","02004039"],
  int: ["02004050","02004051","02004052","02004053","02004054","02004055","02004056","02004057","02004058","02004059"],
  luk: ["02004070","02004071","02004072","02004073","02004074","02004075","02004076","02004077","02004078","02004079"],
};

const STAT_LABELS: Record<StatId, string> = { str: "Strength", dex: "Dexterity", int: "Intelligence", luk: "Luck" };
const STAT_SHORT: Record<StatId, string> = { str: "STR", dex: "DEX", int: "INT", luk: "LUK" };
const STAT_ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];

export interface StatPotionTier {
  tier: number; // 1–10
  name: string; // "Advanced Intelligence Potion IX"
  pillName: string; // "Advanced Intelligence Pill IX"
  label: string; // "Advanced Intelligence Potion IX (+27 INT)"
  value: number; // stat value to send to scouter
  itemId: string;
  pillItemId: string;
}

export function getStatPotionTiers(stat: StatId): StatPotionTier[] {
  return STAT_ROMAN.map((roman, i) => {
    const tier = i + 1;
    const itemId = STAT_POTION_ITEM_IDS[stat][i];
    const pillItemId = String(Number.parseInt(itemId, 10) + 120).padStart(8, "0");
    const name = `Advanced ${STAT_LABELS[stat]} Potion ${roman}`;
    const pillName = `Advanced ${STAT_LABELS[stat]} Pill ${roman}`;
    return {
      tier,
      name,
      pillName,
      label: `${name} (+${STAT_POTION_STAT_VALUE[tier]} ${STAT_SHORT[stat]})`,
      value: STAT_POTION_STAT_VALUE[tier],
      itemId,
      pillItemId,
    };
  });
}

export function statAbbrev(stat: StatId): string {
  return STAT_SHORT[stat];
}

const MAIN_STAT_SET = new Set<string>(["str","dex","int","luk"]);

/** Primary stat from a class's requiredStats array (first non-attack entry). */
export function primaryStatForClass(requiredStats: readonly string[]): StatId {
  for (const s of requiredStats) {
    if (MAIN_STAT_SET.has(s)) return s as StatId;
  }
  return "str"; // fallback
}

/** All main stats (str/dex/int/luk) a class uses, in requiredStats order. */
export function mainStatsForClass(requiredStats: readonly string[]): StatId[] {
  return requiredStats.filter((s): s is StatId => MAIN_STAT_SET.has(s));
}

// ── Boolean buffs ────────────────────────────────────────────────────────────

export type BoolBuffId =
  | "sayramElixir" | "collectorElixir" | "honorableElixir"
  | "heroEcho" | "legionMight" | "masarayuGift" | "extremePotion" | "extremeGreenPotion"
  | "mvpSuperpower" | "vipBuff" | "brightMoonlight" | "candiedApple"
  | "caretakerSupport" | "sparklingRedStar" | "maxedSacredSymbol"
  // Group A — pick one
  | "greatHeroBoost" | "legendaryHero" | "advWeaponTempering" | "sparklingBlueStar"
  // Group B — pick one
  | "onyxApple" | "tengusJudgement";

export type BoolBuffIconType = { kind: "item"; id: string; shadow?: boolean } | { kind: "skill"; id: string };

export const EXTREME_GREEN_POTION_ITEM_ID = "02023126";

export interface BoolBuffEntry {
  id: BoolBuffId;
  name: string;
  icon: BoolBuffIconType;
  secondIcon?: BoolBuffIconType;
  group?: "A" | "B";
}

// Ungrouped order: roughly obtainability — NPC shop (candied apple) → quest shop elixirs →
// free daily (extreme) → profession-gated (red star/advanced stat) → boss drop (bright moonlight) →
// guild/legion/paid buffs → equipment (sacred symbols).
// Group A/B: potions first (left-to-right matches in-game), visually distinct skill buff last.
export const BOOL_BUFFS: readonly BoolBuffEntry[] = [
  { id: "candiedApple",      name: "Candied Apple",                  icon: { kind: "item",  id: "02023908" } },
  { id: "sayramElixir",      name: "Sayram's Elixir",                icon: { kind: "item",  id: "02024234" } },
  { id: "collectorElixir",   name: "Collector's Elixir",             icon: { kind: "item",  id: "02024290" } },
  { id: "honorableElixir",   name: "Honorable Elixir",               icon: { kind: "item",  id: "02024304" } },
  { id: "extremePotion",     name: "Extreme Potion",                 icon: { kind: "item",  id: "02023125" } }, // icon resolved at render time
  // Only rendered as its own tile for Hurricane classes (see isHurricaneClass); everyone else gets it
  // layered onto the Extreme Potion tile instead (see buffSecondIconOverride in BuffsSetupStep.tsx).
  { id: "extremeGreenPotion", name: "Extreme Green Potion",          icon: { kind: "item",  id: EXTREME_GREEN_POTION_ITEM_ID } },
  { id: "sparklingRedStar",  name: "Sparkling Red Star Potion",      icon: { kind: "item",  id: "02024174" }, secondIcon: { kind: "item", id: "02024175" } },
  // Advanced Stat Potion tile is inserted here at render time
  { id: "brightMoonlight",   name: "Bright Moonlight Potion",        icon: { kind: "item",  id: "02023136" } },
  { id: "heroEcho",          name: "Hero's Echo",                    icon: { kind: "skill", id: "0001005"  } },
  { id: "legionMight",       name: "Legion's Might",                 icon: { kind: "item",  id: "02024188" } },
  { id: "masarayuGift",      name: "Masarayu's Gift Atmospheric Effect", icon: { kind: "item", id: "02024193", shadow: true } },
  { id: "caretakerSupport",  name: "Caretaker's Support",            icon: { kind: "skill", id: "80011827" } },
  { id: "vipBuff",           name: "VIP Buff (Stats)",               icon: { kind: "item",  id: "02024163", shadow: true } },
  { id: "mvpSuperpower",     name: "MVP Superpower Buff",            icon: { kind: "item",  id: "02023544" } },
  { id: "maxedSacredSymbol", name: "Lv. 11 Sacred Symbols",          icon: { kind: "item",  id: "02638024" } },
  // Group A
  { id: "sparklingBlueStar",   name: "Sparkling Blue Star Potion",       icon: { kind: "item",  id: "02024173" }, group: "A" },
  { id: "greatHeroBoost",      name: "Advanced Great Hero Boost Potion", icon: { kind: "item",  id: "02024176" }, group: "A" },
  { id: "legendaryHero",       name: "Legendary Hero Potion",            icon: { kind: "item",  id: "02024179" }, group: "A" },
  { id: "advWeaponTempering",  name: "Advanced Weapon Tempering",        icon: { kind: "skill", id: "80002363" }, group: "A" },
  // Group B
  { id: "onyxApple",       name: "Onyx Apple",         icon: { kind: "item", id: "02024278" }, group: "B" },
  { id: "tengusJudgement", name: "Tengu's Judgement",  icon: { kind: "item", id: "02023626" }, group: "B" },
];

export const BUFF_GROUP_A = new Set<BoolBuffId>(["greatHeroBoost","legendaryHero","advWeaponTempering","sparklingBlueStar"]);
export const BUFF_GROUP_B = new Set<BoolBuffId>(["onyxApple","tengusJudgement"]);

// Classes whose Echo of Hero equivalent has a unique in-game icon.
// All others use the generic 0001005. Confirmed via grandislibrary pixel-match against WZ exports.
const HERO_ECHO_SKILL_MAP: Partial<Record<string, string>> = {
  // Nova — Exclusive Spell
  "Kaiser": "60001005", "Angelic Buster": "60001005", "Cadena": "60001005", "Kain": "60001005",
  // Flora — Exclusive Spell (each class has a distinct icon)
  "Illium": "150001005", "Ark": "150011005", "Adele": "150021005", "Khali": "150031005",
  // Anima — Exclusive Spell. Hoyoung and Lara share one generic icon (maplestorywiki's own
  // Exclusive Spell page shows a single "(Anima)" file used for both); only Ren has her own
  // distinct icon (own "(Ren)" file), confirmed via her skills page 2026-07-18 — her flavor
  // skills ("Return (Ren)", "Grounded Body") sit in the 160020xxx block, giving 160021005.
  "Hoyoung": "160001005", "Lara": "160001005", "Ren": "160021005",
  // Jianghu
  "Mo Xuan": "170001005",
  // Shine (shared "Stellar Equalize" icon)
  "Sia Astelle": "180001005", "Erel Light": "180001005",
};

/** Echo of Hero skill ID for a given Nexon job name. Falls back to the generic beginner skill. */
export function heroEchoSkillId(nexonJobName: string): string {
  return HERO_ECHO_SKILL_MAP[nexonJobName] ?? "0001005";
}

/** Display name for a class's Echo of Hero equivalent. */
export function heroEchoName(nexonJobName: string): string {
  if (nexonJobName === "Sia Astelle" || nexonJobName === "Erel Light") return "Stellar Equalize";
  if (HERO_ECHO_SKILL_MAP[nexonJobName] && nexonJobName !== "Mo Xuan") return "Exclusive Spell";
  return "Hero's Echo";
}

/** Extreme Potion item ID resolved by class primary stat. */
export function extremePotionIconId(stat: StatId): string {
  return stat === "int" ? "02023127" : "02023125"; // Blue (MATT) or Red (ATT)
}

/** Extreme Potion label suffix resolved by class primary stat. */
export function extremePotionLabel(stat: StatId): string {
  return stat === "int" ? "Extreme Blue Potion" : "Extreme Red Potion";
}

// Classes that don't run a fixed attack-speed stage the same way everyone else does, so they get
// Extreme Green Potion as its own separate buff tile instead of it being folded into Extreme Potion.
// Ren is deliberately excluded: some of her attacks are affected by Green Potion the normal way, so
// she doesn't need the special-case split (Yuki, 2026-07-06) — revisit if Nexon changes this.
const HURRICANE_JOB_NAMES = new Set<string>([
  "Wild Hunter", "Bow Master", "Phantom", "Wind Archer", "Blaze Wizard", "Corsair",
]);

/** Whether a class gets a separate Extreme Green Potion tile instead of a merged one. */
export function isHurricaneClass(nexonJobName: string): boolean {
  return HURRICANE_JOB_NAMES.has(nexonJobName);
}

// ── Champion's Renown ────────────────────────────────────────────────────────

export const RENOWN_MAX = 5;
export const RENOWN_SKILL_ID = "80003819"; // Champion Insignia: All Stats (generic icon)

export type RenownStatId = "allStats" | "atkMagAtk" | "bossDmg" | "ignoreDef" | "critDmg";

export interface RenownEntry {
  id: RenownStatId;
  label: string;
  shortLabel: string;
}

export const RENOWN_STATS: readonly RenownEntry[] = [
  { id: "allStats",   label: "All Stats / Max HP", shortLabel: "All Stats" },
  { id: "atkMagAtk", label: "ATK / MAG ATK",       shortLabel: "ATT/MATT" },
  { id: "bossDmg",   label: "Boss DMG",             shortLabel: "Boss DMG" },
  { id: "ignoreDef", label: "Ignore DEF",           shortLabel: "IED"      },
  { id: "critDmg",   label: "Crit DMG",             shortLabel: "Crit DMG" },
];

// ── Draft type ───────────────────────────────────────────────────────────────

export interface BuffsDraft {
  // Guild buffs: raw strings "0"–"15", "" = untouched
  guild: Partial<Record<GuildBuffId, string>>;
  // Advanced Stat Potion tier: "0" = none, "1"–"10" = tier I–X
  statPotionTier: string;
  // Boolean buffs
  bools: Partial<Record<BoolBuffId, boolean>>;
  // Champion's Renown: raw strings "0"–"5", "" = untouched
  renown: Partial<Record<RenownStatId, string>>;
}

export function emptyBuffsDraft(): BuffsDraft {
  return { guild: {}, statPotionTier: "0", bools: {}, renown: {} };
}

export function parseBuffsDraft(value: string): BuffsDraft {
  if (!value) return emptyBuffsDraft();
  try {
    const p = JSON.parse(value) as Partial<BuffsDraft>;
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return {
        guild: p.guild ?? {},
        statPotionTier: p.statPotionTier ?? "0",
        bools: p.bools ?? {},
        renown: p.renown ?? {},
      };
    }
  } catch { /* fall through */ }
  return emptyBuffsDraft();
}

export function serializeBuffsDraft(draft: BuffsDraft): string {
  return JSON.stringify(draft);
}

export function sanitizeGuildLevel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(Math.min(Number.parseInt(digits, 10), GUILD_BUFF_MAX));
}

export function sanitizeRenownLevel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(Math.min(Number.parseInt(digits, 10), RENOWN_MAX));
}

function clearGroupExcept(bools: Partial<Record<BoolBuffId, boolean>>, group: Set<BoolBuffId>, keep: BoolBuffId): void {
  for (const other of group) {
    if (other !== keep) bools[other] = false;
  }
}

/** Toggle a bool buff, enforcing mutual exclusion within its group. */
export function toggleBoolBuff(draft: BuffsDraft, id: BoolBuffId): BuffsDraft {
  const next = !(draft.bools[id] ?? false);
  const newBools = { ...draft.bools, [id]: next };
  if (next) {
    if (BUFF_GROUP_A.has(id)) clearGroupExcept(newBools, BUFF_GROUP_A, id);
    if (BUFF_GROUP_B.has(id)) clearGroupExcept(newBools, BUFF_GROUP_B, id);
  }
  return { ...draft, bools: newBools };
}

// ── Convert draft → stored ───────────────────────────────────────────────────

function parsePositiveInt(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function collectGuildLevels(draft: BuffsDraft, out: Record<string, unknown>): void {
  for (const { id } of GUILD_BUFFS) {
    const n = parsePositiveInt(draft.guild[id] ?? "");
    if (n !== null) out[id] = n;
  }
}

function collectBools(draft: BuffsDraft, out: Record<string, unknown>): void {
  for (const { id } of BOOL_BUFFS) {
    if (draft.bools[id] === true) out[id] = true;
  }
}

function collectRenown(draft: BuffsDraft): Partial<Record<RenownStatId, number>> | null {
  const renown: Partial<Record<RenownStatId, number>> = {};
  for (const { id } of RENOWN_STATS) {
    const n = parsePositiveInt(draft.renown[id] ?? "");
    if (n !== null) renown[id] = n;
  }
  return Object.keys(renown).length > 0 ? renown : null;
}

/** Reverse of convertBuffsDraftToStored — rebuilds a BuffsDraft from a character's
 *  already-saved buffs. Without this, opening the Buffs step for an already-set-up
 *  character (full_setup/maplescouter_setup revisited, or a future profile pencil)
 *  starts from a blank draft; since convertBuffsDraftToStored/the scouter merge
 *  replace the whole `buffs` object wholesale, finishing without re-checking every
 *  previously-set flag silently drops it. Seed the draft from this before starting an
 *  edit session on a character that already has buffs saved. */
export function storedBuffsToDraft(stored: StoredScouterBuffs | undefined): BuffsDraft {
  if (!stored) return emptyBuffsDraft();
  const guild: Partial<Record<GuildBuffId, string>> = {};
  for (const { id } of GUILD_BUFFS) {
    const level = stored[id];
    if (typeof level === "number") guild[id] = String(level);
  }
  let statPotionTier = "0";
  if (typeof stored.statPotionValue === "number") {
    const tier = Object.entries(STAT_POTION_STAT_VALUE).find(([, v]) => v === stored.statPotionValue)?.[0];
    if (tier) statPotionTier = tier;
  }
  const bools: Partial<Record<BoolBuffId, boolean>> = {};
  for (const { id } of BOOL_BUFFS) {
    if (stored[id] === true) bools[id] = true;
  }
  const renown: Partial<Record<RenownStatId, string>> = {};
  for (const { id } of RENOWN_STATS) {
    const level = stored.renown?.[id];
    if (typeof level === "number") renown[id] = String(level);
  }
  return { guild, statPotionTier, bools, renown };
}

export function convertBuffsDraftToStored(draft: BuffsDraft): StoredScouterBuffs | null {
  const out: Record<string, unknown> = {};

  collectGuildLevels(draft, out);

  const tier = Number.parseInt(draft.statPotionTier, 10);
  if (tier >= 1 && tier <= 10) out.statPotionValue = STAT_POTION_STAT_VALUE[tier];

  collectBools(draft, out);

  const renown = collectRenown(draft);
  if (renown) out.renown = renown;

  return Object.keys(out).length > 0 ? (out as StoredScouterBuffs) : null;
}
