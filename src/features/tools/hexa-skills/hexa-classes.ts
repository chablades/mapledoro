/**
 * HEXA class and skill definitions for all MapleStory classes.
 *
 * Skill names use GMS names sourced from masonym.dev reference implementation.
 *
 * Icons are MapleResource `hexa-skill` ids served from haku.network, matching the
 * in-game HEXA Matrix node icons. Multi-skill mastery nodes use the special split
 * composite icon. IDs were resolved by pixel-matching the v268 asset dump against
 * Grandis Library's labelled class icons; render with <HexaSkillIcon>.
 *
 * Mastery nodes: most classes have 4 nodes (Sia Astelle has 2). Each node boosts multiple
 * skills simultaneously and is leveled as one unit, so it carries one composite icon.
 *
 * Enhancement (V Boost): each class has 4 enhancement skills, each leveled individually.
 *
 * An empty `iconId` means no haku icon exists yet (e.g. Sol Hecate); <HexaSkillIcon>
 * renders the skill's initial as a fallback. Sia Astelle's nodes/skills and Sol Janus instead
 * carry an `iconUrl` built from the `erda-skill`/`skill` resource types (see `su`/`nodeUrl`).
 */

import { resourceImageUrl, type ResourceType } from "../../../lib/mapleResource";

export interface HexaSkillDef {
  name: string;
  iconId: string;
  /** Full icon URL override, for icons not served by a `hexa-skill` id (e.g. `erda-skill`/`skill` types, or a temporary external host). */
  iconUrl?: string;
}

/** Mastery node — skills boosted together, shown with one composite matrix icon. */
export interface HexaMasteryNode {
  iconId: string;
  /** Full icon URL override, used like {@link HexaSkillDef.iconUrl}. */
  iconUrl?: string;
  skills: string[];
}

export interface HexaStatEntry {
  type: string;
  level: number;
}
export interface HexaStatSlot {
  main: HexaStatEntry;
  alt: [HexaStatEntry, HexaStatEntry];
}

export interface HexaSkillLevels {
  origin: number;
  ascent: number;
  mastery: number[];
  enhancement: number[];
  common: number[];
  hexaStat?: [HexaStatSlot, HexaStatSlot, HexaStatSlot];
}

export interface HexaClassDef {
  className: string;
  group: string;
  origin: HexaSkillDef;
  /** Mastery nodes — usually 4, Sia has 2. */
  mastery: HexaMasteryNode[];
  enhancement: HexaSkillDef[];
  ascent: HexaSkillDef | null;
}

function s(name: string, iconId: string): HexaSkillDef {
  return { name, iconId };
}

/** Skill whose icon is a full URL from the `erda-skill`/`skill` resource types, not a `hexa-skill` id. */
function su(name: string, type: ResourceType, id: string): HexaSkillDef {
  return { name, iconId: "", iconUrl: resourceImageUrl(type, id, "icon.png") };
}

function node(iconId: string, ...skills: string[]): HexaMasteryNode {
  return { iconId, skills };
}

/** Mastery node whose composite icon is a full URL, like {@link su}. */
function nodeUrl(type: ResourceType, id: string, ...skills: string[]): HexaMasteryNode {
  return { iconId: "", iconUrl: resourceImageUrl(type, id, "icon.png"), skills };
}

// ── Explorers ───────────────────────────
const HERO: HexaClassDef = {
  className: "Hero",
  group: "Explorer",
  origin: s("Spirit Calibur", "10000000"),
  mastery: [
    node("20000000", "HEXA Raging Blow"),
    node("20000050", "HEXA Rising Rage"),
    node("20000100", "HEXA Beam Blade", "Rending Edge"),
    node("20000146", "HEXA Cry Valhalla", "HEXA Puncture", "HEXA Final Attack"),
  ],
  enhancement: [s("Burning Soul Blade", "30000000"), s("Instinctual Combo", "30000001"), s("Worldreaver", "30000002"), s("Sword Illusion", "30000003")],
  ascent: s("Ultrasonic Slash", "10000052"),
};

const PALADIN: HexaClassDef = {
  className: "Paladin",
  group: "Explorer",
  origin: s("Sacred Bastion", "10000001"),
  mastery: [
    node("20000001", "HEXA Blast", "HEXA Divine Judgment"),
    node("20000051", "Falling Justice", "HEXA Divine Charge", "HEXA Divine Mark"),
    node("20000101", "HEXA Heaven's Hammer"),
    node("20000147", "HEXA Final Attack", "Rising Justice"),
  ],
  enhancement: [s("Divine Echo", "30000004"), s("Hammers of the Righteous", "30000005"), s("Grand Guardian", "30000006"), s("Mighty Mjolnir", "30000007")],
  ascent: s("Dominus Oblivion", "10000053"),
};

const DARK_KNIGHT: HexaClassDef = {
  className: "Dark Knight",
  group: "Explorer",
  origin: s("Dead Space", "10000002"),
  mastery: [
    node("20000002", "HEXA Gungnir's Descent"),
    node("20000052", "Dark Bident", "HEXA Dark Impale", "HEXA Nightshade Explosion"),
    node("20000102", "HEXA Revenge of the Evil Eye", "HEXA Final Attack"),
    node("20000148", "HEXA Evil Eye Shock"),
  ],
  enhancement: [s("Spear of Darkness", "30000008"), s("Radiant Evil", "30000009"), s("Calamitous Cyclone", "30000010"), s("Darkness Aura", "30000011")],
  ascent: s("Dark Halidom", "10000054"),
};

const ARCH_MAGE_F_P: HexaClassDef = {
  className: "Arch Mage (F/P)",
  group: "Explorer",
  origin: s("Infernal Venom", "10000003"),
  mastery: [
    node("20000003", "HEXA Flame Sweep"),
    node("20000053", "HEXA Flame Haze", "HEXA Mist Eruption"),
    node("20000103", "HEXA Ignite", "HEXA Ifrit", "HEXA Inferno Aura"),
    node("20000149", "HEXA Creeping Toxin", "HEXA Meteor Shower", "HEXA Megiddo Flame"),
  ],
  enhancement: [s("DoT Punisher", "30000012"), s("Poison Nova", "30000013"), s("Elemental Fury", "30000014"), s("Poison Chain", "30000015")],
  ascent: s("Immortal Flame", "10000055"),
};

const ARCH_MAGE_I_L: HexaClassDef = {
  className: "Arch Mage (I/L)",
  group: "Explorer",
  origin: s("Frozen Lightning", "10000004"),
  mastery: [
    node("20000004", "HEXA Chain Lightning"),
    node("20000054", "HEXA Frozen Orb", "HEXA Blizzard"),
    node("20000104", "HEXA Lightning Orb", "Cryo Shock"),
    node("20000150", "HEXA Thunder Sphere", "HEXA Elquines"),
  ],
  enhancement: [s("Frost Ark", "30000016"), s("Bolt Barrage", "30000017"), s("Spirit of Snow", "30000018"), s("Jupiter Thunder", "30000019")],
  ascent: s("Parabolic Bolt", "10000056"),
};

const BISHOP: HexaClassDef = {
  className: "Bishop",
  group: "Explorer",
  origin: s("Holy Advent", "10000005"),
  mastery: [
    node("20000005", "HEXA Angel Ray"),
    node("20000055", "HEXA Big Bang", "HEXA Triumph Feather"),
    node("20000105", "HEXA Angelic Wrath", "HEXA Fountain of Vengeance", "HEXA Bahamut"),
    node("20000151", "HEXA Genesis", "HEXA Heaven's Door"),
  ],
  enhancement: [s("Benediction", "30000020"), s("Angel of Balance", "30000021"), s("Peacemaker", "30000022"), s("Divine Punishment", "30000023")],
  ascent: s("Commandment of Heaven", "10000057"),
};

const BOWMASTER: HexaClassDef = {
  className: "Bowmaster",
  group: "Explorer",
  origin: s("Ascendant Shadow", "10000006"),
  mastery: [
    node("20000006", "HEXA Hurricane"),
    node("20000056", "HEXA Arrow Stream", "HEXA Arrow Blaster"),
    node("20000106", "HEXA Quiver Cartridge", "HEXA Phoenix", "Extra Quiver Cartridge"),
    node("20000152", "HEXA Speed Mirage", "HEXA Gritty Gust"),
  ],
  enhancement: [s("Storm of Arrows", "30000024"), s("Inhuman Speed", "30000025"), s("Quiver Barrage", "30000026"), s("Silhouette Mirage", "30000027")],
  ascent: s("Flashpoint", "10000058"),
};

const MARKSMAN: HexaClassDef = {
  className: "Marksman",
  group: "Explorer",
  origin: s("Final Aim", "10000007"),
  mastery: [
    node("20000007", "HEXA Snipe"),
    node("20000057", "HEXA Piercing Arrow"),
    node("20000107", "HEXA Frostprey", "HEXA Bolt Burst"),
    node("20000153", "HEXA Final Attack", "HEXA High Speed Shot"),
  ],
  enhancement: [s("Perfect Shot", "30000028"), s("Split Shot", "30000029"), s("Surge Bolt", "30000030"), s("Repeating Crossbow Cartridge", "30000031")],
  ascent: s("Fatal Trigger", "10000059"),
};

const PATHFINDER: HexaClassDef = {
  className: "Pathfinder",
  group: "Explorer",
  origin: s("Forsaken Relic", "10000008"),
  mastery: [
    node("20000008", "HEXA Cardinal Burst", "HEXA Bountiful Burst"),
    node("20000058", "HEXA Cardinal Deluge", "HEXA Bountiful Deluge"),
    node("20000108", "HEXA Glyph of Impalement", "HEXA Cardinal Torrent", "HEXA Ancient Astra", "Ancient Impact"),
    node("20000154", "HEXA Combo Assault", "HEXA Shadow Raven", "Manifest Curse"),
  ],
  enhancement: [s("Nova Blast", "30000032"), s("Raven Tempest", "30000033"), s("Obsidian Barrier", "30000034"), s("Relic Unbound", "30000035")],
  ascent: s("Piercing Relic", "10000060"),
};

const NIGHT_LORD: HexaClassDef = {
  className: "Night Lord",
  group: "Explorer",
  origin: s("Life and Death", "10000009"),
  mastery: [
    node("20000009", "HEXA Quad Star", "Enhanced HEXA Quad Star"),
    node("20000059", "HEXA Assassin's Mark"),
    node("20000109", "HEXA Dark Flare", "HEXA Showdown", "Darkness Shuriken"),
    node("20000155", "HEXA Sudden Raid", "HEXA Death Star"),
  ],
  enhancement: [s("Throwing Star Barrage", "30000036"), s("Shurrikane", "30000037"), s("Dark Lord's Omen", "30000038"), s("Throw Blasting", "30000039")],
  ascent: s("Deep Strike", "10000061"),
};

const SHADOWER: HexaClassDef = {
  className: "Shadower",
  group: "Explorer",
  origin: s("Halve Cut", "10000010"),
  mastery: [
    node("20000010", "HEXA Assassinate", "HEXA Pulverize"),
    node("20000060", "HEXA Meso Explosion"),
    node("20000110", "HEXA Dark Flare", "HEXA Cruel Stab"),
    node("20000156", "HEXA Sudden Raid", "HEXA Shadow Veil", "Covert Edge"),
  ],
  enhancement: [s("Shadow Assault", "30000040"), s("Trickblade", "30000041"), s("Sonic Blow", "30000042"), s("Slash Shadow Formation", "30000043")],
  ascent: s("Covetous Darkness", "10000062"),
};

const DUAL_BLADE: HexaClassDef = {
  className: "Dual Blade",
  group: "Explorer",
  origin: s("Karma Blade", "10000011"),
  mastery: [
    node("20000011", "HEXA Phantom Blow"),
    node("20000061", "HEXA Asura's Anger"),
    node("20000111", "HEXA Blade Clone", "Mortality"),
    node("20000157", "HEXA Blade Fury", "HEXA Sudden Raid"),
  ],
  enhancement: [s("Blade Storm", "30000044"), s("Blades of Destiny", "30000045"), s("Blade Tornado", "30000046"), s("Haunted Edge", "30000047")],
  ascent: s("Yama's Decree", "10000063"),
};

const BUCCANEER: HexaClassDef = {
  className: "Buccaneer",
  group: "Explorer",
  origin: s("Unleash Neptunus", "10000012"),
  mastery: [
    node("20000012", "HEXA Octopunch", "Super Octopunch"),
    node("20000062", "HEXA Sea Serpent", "HEXA Nautilus Strike"),
    node("20000112", "HEXA Serpent Scale"),
    node("20000158", "HEXA Hook Bomber"),
  ],
  enhancement: [s("Lightning Form", "30000048"), s("Lord of the Deep", "30000049"), s("Serpent Vortex", "30000050"), s("Howling Fist", "30000051")],
  ascent: s("Haymaker", "10000064"),
};

const CORSAIR: HexaClassDef = {
  className: "Corsair",
  group: "Explorer",
  origin: s("The Dreadnought", "10000013"),
  mastery: [
    node("20000013", "HEXA Rapid Fire", "HEXA Rapid Fire [Shootout Mode]"),
    node("20000063", "HEXA Broadside"),
    node("20000113", "HEXA Brain Scrambler", "Condemnation", "HEXA Eight-Legs Easton", "HEXA Firing Orders"),
    node("20000159", "HEXA Scurvy Summons", "HEXA Siege Bomber", "HEXA Ugly Bomb", "HEXA Nautilus Strike"),
  ],
  enhancement: [s("Bullet Barrage", "30000052"), s("Target Lock", "30000053"), s("Nautilus Assault", "30000054"), s("Death Trigger", "30000055")],
  ascent: s("Firecracker Fusillade", "10000065"),
};

const CANNONEER: HexaClassDef = {
  className: "Cannoneer",
  group: "Explorer",
  origin: s("Super Cannon Explosion", "10000014"),
  mastery: [
    node("20000014", "HEXA Cannon Barrage"),
    node("20000064", "HEXA Cannon Bazooka", "HEXA Monkey Mortar", "HEXA Anchors Away", "HEXA Nautilus Strike"),
    node("20000114", "HEXA Rolling Rainbow"),
    node("20000160", "HEXA Support Monkey", "HEXA Monkey Fury"),
  ],
  enhancement: [s("Cannon of Mass Destruction", "30000056"), s("The Nuclear Option", "30000057"), s("Monkey Business", "30000058"), s("Poolmaker", "30000059")],
  ascent: s("Barrel of Monkeys", "10000066"),
};

// ── Cygnus Knights ───────────────────────────
const MIHILE: HexaClassDef = {
  className: "Mihile",
  group: "Cygnus Knights",
  origin: s("Durendal", "10000015"),
  mastery: [
    node("20000015", "HEXA Radiant Cross", "HEXA Radiant Cross - Assault"),
    node("20000065", "HEXA Royal Guard"),
    node("20000115", "HEXA Install Shield", "HEXA Charging Light"),
    node("20000161", "HEXA Offensive Defense", "HEXA Final Attack", "HEXA Soul Majesty"),
  ],
  enhancement: [s("Shield of Light", "30000132"), s("Sword of Light", "30000133"), s("Radiant Soul", "30000134"), s("Light of Courage", "30000135")],
  ascent: s("Knights Immortal", "10000067"),
};

const DAWN_WARRIOR: HexaClassDef = {
  className: "Dawn Warrior",
  group: "Cygnus Knights",
  origin: s("Astral Blitz", "10000016"),
  mastery: [
    node("20000016", "HEXA Luna Divide", "HEXA Solar Slash"),
    node("20000066", "Equinox Power", "HEXA Cosmic Shower"),
    node("20000116", "HEXA Cosmic Burst"),
    node("20000162", "HEXA Equinox Slash", "Equinox Power II"),
  ],
  enhancement: [s("Cosmos", "30000060"), s("Rift of Damnation", "30000061"), s("Soul Eclipse", "30000062"), s("Flare Slash", "30000063")],
  ascent: s("Totality", "10000068"),
};

const BLAZE_WIZARD: HexaClassDef = {
  className: "Blaze Wizard",
  group: "Cygnus Knights",
  origin: s("Eternity", "10000017"),
  mastery: [
    node("20000017", "HEXA Orbital Flame"),
    node("20000067", "HEXA Blazing Extinction"),
    node("20000117", "HEXA Orbital Explosion", "HEXA Phoenix Drive"),
    node("20000163", "HEXA Towering Inferno"),
  ],
  enhancement: [s("Orbital Inferno", "30000064"), s("Savage Flame", "30000065"), s("Inferno Sphere", "30000066"), s("Salamander Mischief", "30000067")],
  ascent: s("Flame Concerto", "10000069"),
};

const WIND_ARCHER: HexaClassDef = {
  className: "Wind Archer",
  group: "Cygnus Knights",
  origin: s("Mistral Spring", "10000018"),
  mastery: [
    node("20000018", "HEXA Song of Heaven"),
    node("20000068", "HEXA Trifling Wind"),
    node("20000118", "HEXA Storm Bringer", "HEXA Fairy Spiral", "HEXA Monsoon"),
    node("20000164", "HEXA Storm Whim", "Anemoi"),
  ],
  enhancement: [s("Howling Gale", "30000068"), s("Merciless Winds", "30000069"), s("Gale Barrier", "30000070"), s("Vortex Sphere", "30000071")],
  ascent: s("Elemental Tempest", "10000070"),
};

const NIGHT_WALKER: HexaClassDef = {
  className: "Night Walker",
  group: "Cygnus Knights",
  origin: s("Silence", "10000019"),
  mastery: [
    node("20000019", "HEXA Quintuple Star", "HEXA Quintuple Star - Jet Black"),
    node("20000069", "HEXA Shadow Bat", "HEXA Ravenous Bat"),
    node("20000119", "HEXA Dark Omen"),
    node("20000165", "HEXA Dominion", "Abyssal Darkness"),
  ],
  enhancement: [s("Shadow Spear", "30000072"), s("Greater Dark Servant", "30000073"), s("Shadow Bite", "30000074"), s("Rapid Throw", "30000075")],
  ascent: s("Stygian Command", "10000071"),
};

const THUNDER_BREAKER: HexaClassDef = {
  className: "Thunder Breaker",
  group: "Cygnus Knights",
  origin: s("Thunder Wall Sea Wave", "10000020"),
  mastery: [
    node("20000020", "HEXA Annihilate", "Thunder Bolt"),
    node("20000070", "HEXA Thunderbolt"),
    node("20000120", "HEXA Typhoon", "HEXA Deep Rising"),
    node("20000166", "HEXA Sea Wave", "Deep Reinforcement"),
  ],
  enhancement: [s("Lightning Cascade", "30000076"), s("Shark Torpedo", "30000077"), s("Lightning God Spear Strike", "30000078"), s("Lightning Spear Multistrike", "30000079")],
  ascent: s("Annihilating Rush", "10000072"),
};

// ── Heroes of Maple ───────────────────────────
const ARAN: HexaClassDef = {
  className: "Aran",
  group: "Heroes of Maple",
  origin: s("Endgame", "10000021"),
  mastery: [
    node("20000021", "HEXA Beyond Blade"),
    node("20000071", "HEXA Finisher - Hunter's Prey"),
    node("20000121", "HEXA Hyper Finisher - Last Stand"),
    node("20000167", "HEXA Adrenaline Overload", "HEXA Permafrost", "HEXA Final Attack"),
  ],
  enhancement: [s("Finisher - Adrenaline Surge", "30000080"), s("Maha's Carnage", "30000081"), s("Final Beyond Blade - White Tiger", "30000082"), s("Blizzard Tempest", "30000083")],
  ascent: s("Hailstorm Howl", "10000073"),
};

const EVAN: HexaClassDef = {
  className: "Evan",
  group: "Heroes of Maple",
  origin: s("Zodiac Burst", "10000022"),
  mastery: [
    node("20000022", "HEXA Mana Burst"),
    node("20000072", "HEXA Thunder Circle", "HEXA Dragon Flash", "HEXA Thunder Flash", "HEXA Wind Flash"),
    node("20000122", "HEXA Earth Circle", "HEXA Dragon Dive", "HEXA Earth Dive", "HEXA Thunder Dive"),
    node("20000168", "HEXA Wind Circle", "HEXA Dragon Breath", "HEXA Earth Breath", "HEXA Wind Breath", "HEXA Magic Debris", "HEXA Dragon Spark"),
  ],
  enhancement: [s("Elemental Barrage", "30000084"), s("Dragon Slam", "30000085"), s("Elemental Radiance", "30000086"), s("Spiral of Mana", "30000087")],
  ascent: s("United Horizons", "10000074"),
};

const LUMINOUS: HexaClassDef = {
  className: "Luminous",
  group: "Heroes of Maple",
  origin: s("Harmonic Paradox", "10000023"),
  mastery: [
    node("20000023", "HEXA Ender"),
    node("20000073", "HEXA Reflection", "Endless Darkness"),
    node("20000123", "HEXA Apocalypse", "Eternal Light"),
    node("20000169", "HEXA Twilight Nova"),
  ],
  enhancement: [s("Gate of Light", "30000100"), s("Aether Conduit", "30000101"), s("Baptism of Light and Darkness", "30000102"), s("Liberation Orb", "30000103")],
  ascent: s("Lustrous Orb", "10000075"),
};

const MERCEDES: HexaClassDef = {
  className: "Mercedes",
  group: "Heroes of Maple",
  origin: s("Unfading Glory", "10000024"),
  mastery: [
    node("20000024", "HEXA Ishtar's Ring"),
    node("20000074", "HEXA Wrath of Enlil", "HEXA Spikes Royale", "HEXA Leaf Tornado", "HEXA Wrath of Enlil: Spirit Enchant", "HEXA Spikes Royale: Spirit Enchant", "HEXA Leaf Tornado: Spirit Enchant"),
    node("20000124", "HEXA Unicorn Spike", "HEXA Gust Dive", "HEXA Stunning Strikes"),
    node("20000170", "HEXA Elemental Knights", "HEXA Final Attack"),
  ],
  enhancement: [s("Spirit of Elluel", "30000088"), s("Sylvidia's Flight", "30000089"), s("Irkalla's Wrath", "30000090"), s("Royal Knights", "30000091")],
  ascent: s("Primeval Spirits", "10000076"),
};

const PHANTOM: HexaClassDef = {
  className: "Phantom",
  group: "Heroes of Maple",
  origin: s("Defying Fate", "10000025"),
  mastery: [
    node("20000025", "HEXA Tempest"),
    node("20000075", "Fate Shuffle", "HEXA Mille Aiguilles", "HEXA Mille Aiguilles: Fortune"),
    node("20000125", "HEXA Carte Noir"),
    node("20000171", "HEXA Rose Carte Finale", "La Mort Carte"),
  ],
  enhancement: [s("Luck of the Draw", "30000092"), s("Ace in the Hole", "30000093"), s("Phantom's Mark", "30000094"), s("Rift Break", "30000095")],
  ascent: s("Moonlit Serenade", "10000077"),
};

const SHADE: HexaClassDef = {
  className: "Shade",
  group: "Heroes of Maple",
  origin: s("Advent of the Fox", "10000026"),
  mastery: [
    node("20000026", "HEXA Spirit Claw"),
    node("20000076", "HEXA Fox Spirits"),
    node("20000126", "HEXA Bomb Punch", "HEXA Death Mark", "Dusk Blow"),
    node("20000172", "HEXA Spirit Frenzy"),
  ],
  enhancement: [s("Fox God Flash", "30000096"), s("Spiritgate", "30000097"), s("True Spirit Claw", "30000098"), s("Smashing Multipunch", "30000099")],
  ascent: s("Promise Unbroken", "10000078"),
};

// ── Resistance ───────────────────────────
const BLASTER: HexaClassDef = {
  className: "Blaster",
  group: "Resistance",
  origin: s("Final Destroyer", "10000027"),
  mastery: [
    node("20000027", "HEXA Magnum Punch", "HEXA Double Blast"),
    node("20000077", "HEXA Bunker Buster Explosion", "Burst Pile Bunker"),
    node("20000127", "HEXA Revolving Cannon Mastery", "HEXA Hammer Smash", "HEXA Shotgun Punch"),
    node("20000173", "HEXA Revolving Cannon", "HEXA Ballistic Hurricane"),
  ],
  enhancement: [s("Rocket Punch", "30000128"), s("Gatling Punch", "30000129"), s("Bullet Blast", "30000130"), s("Afterimage Shock", "30000131")],
  ascent: s("Vanguard Strike", "10000079"),
};

const BATTLE_MAGE: HexaClassDef = {
  className: "Battle Mage",
  group: "Resistance",
  origin: s("Crimson Pact", "10000028"),
  mastery: [
    node("20000028", "HEXA Condemnation"),
    node("20000078", "HEXA Finishing Blow", "HEXA Sweeping Staff"),
    node("20000128", "HEXA Dark Shock"),
    node("20000174", "HEXA Dark Genesis"),
  ],
  enhancement: [s("Aura Scythe", "30000112"), s("Altar of Annihilation", "30000113"), s("Grim Harvest", "30000114"), s("Abyssal Lightning", "30000115")],
  ascent: s("Duskbound Aura", "10000080"),
};

const WILD_HUNTER: HexaClassDef = {
  className: "Wild Hunter",
  group: "Resistance",
  origin: s("Synchronous Hunt", "10000029"),
  mastery: [
    node("20000029", "HEXA Wild Arrow Blast: Apex"),
    node("20000079", "HEXA Assist: Rending Swipe", "HEXA Assist: Skull Bash", "HEXA Assist: Snapping Fangs"),
    node("20000129", "HEXA Command: Alpha Surge", "HEXA Command: Titan Pounce"),
    node("20000175", "HEXA Another Bite", "HEXA Final Attack", "HEXA Trap Seed"),
  ],
  enhancement: [s("Command: Predator's Eye", "30000116"), s("Overbite", "30000117"), s("Primal Bloom", "30000118"), s("Wild Arrow Blast: Overdrive", "30000119")],
  ascent: s("Gear Storm", "10000081"),
};

const XENON: HexaClassDef = {
  className: "Xenon",
  group: "Resistance",
  origin: s("Artificial Evolution", "10000030"),
  mastery: [
    node("20000030", "HEXA Mecha Purge: Snipe"),
    node("20000080", "HEXA Triangulation", "HEXA Hypogram Field"),
    node("20000130", "HEXA Orbital Cataclysm", "HEXA Salvo System"),
    node("20000176", "HEXA Beam Dance"),
  ],
  enhancement: [s("Omega Blaster", "30000124"), s("Core Overload", "30000125"), s("Hypogram Field: Fusion", "30000126"), s("Photon Ray", "30000127")],
  ascent: s("Neoteric Snap", "10000082"),
};

const MECHANIC: HexaClassDef = {
  className: "Mechanic",
  group: "Resistance",
  origin: s("Ground Zero", "10000031"),
  mastery: [
    node("20000031", "HEXA AP Salvo Plus", "HEXA Heavy Salvo Plus"),
    node("20000081", "HEXA Homing Beacon"),
    node("20000131", "HEXA Distortion Bomb"),
    node("20000177", "HEXA Robo Launcher RM7", "HEXA Rock 'n Shock", "HEXA Bots 'n Tots", "Robo Conversion: CB-P1"),
  ],
  enhancement: [s("Doomsday Device", "30000120"), s("Mobile Missile Battery", "30000121"), s("Full Metal Barrage", "30000122"), s("Mecha Carrier", "30000123")],
  ascent: s("Mechanized Extinction", "10000083"),
};

// ── Demons ───────────────────────────
const DEMON_SLAYER: HexaClassDef = {
  className: "Demon Slayer",
  group: "Demon",
  origin: s("Nightmare", "10000032"),
  mastery: [
    node("20000032", "HEXA Demon Impact", "HEXA Demon Impact: Demon Chain"),
    node("20000082", "HEXA Demon Lash", "HEXA Infernal Concussion"),
    node("20000132", "HEXA Demon Cry", "HEXA Dark Metamorphosis"),
    node("20000178", "HEXA Cerberus Chomp", "Demonic Plume"),
  ],
  enhancement: [s("Demon Awakening", "30000104"), s("Spirit of Rage", "30000105"), s("Orthrus", "30000106"), s("Demon Bane", "30000107")],
  ascent: s("Amethystine Incursion", "10000084"),
};

const DEMON_AVENGER: HexaClassDef = {
  className: "Demon Avenger",
  group: "Demon",
  origin: s("Requiem", "10000033"),
  mastery: [
    node("20000033", "HEXA Nether Shield"),
    node("20000083", "HEXA Exceed: Execution"),
    node("20000133", "HEXA Exceed: Lunar Slash", "Maximal Exceed"),
    node("20000179", "HEXA Thousand Swords", "HEXA Infernal Exceed"),
  ],
  enhancement: [s("Demonic Frenzy", "30000108"), s("Demonic Blast", "30000109"), s("Dimensional Sword", "30000110"), s("Revenant", "30000111")],
  ascent: s("Rageborne Devil", "10000085"),
};

// ── Nova ───────────────────────────
const KAISER: HexaClassDef = {
  className: "Kaiser",
  group: "Nova",
  origin: s("Nova Triumphant", "10000034"),
  mastery: [
    node("20000034", "HEXA Gigas Wave"),
    node("20000084", "HEXA Blade Burst", "HEXA Tempest Blades"),
    node("20000134", "HEXA Inferno Breath"),
    node("20000180", "HEXA Wing Beat", "HEXA Stone Dragon"),
  ],
  enhancement: [s("Nova Guardians", "30000136"), s("Bladefall", "30000137"), s("Draco Surge", "30000138"), s("Dragonflare", "30000139")],
  ascent: s("Pyroclastic Instinct", "10000086"),
};

const KAIN: HexaClassDef = {
  className: "Kain",
  group: "Nova",
  origin: s("Total Annihilation", "10000035"),
  mastery: [
    node("20000035", "HEXA Falling Dust"),
    node("20000085", "HEXA Strike Arrow", "HEXA Scattering Shot", "HEXA Tearing Knife", "HEXA Chain Sickle"),
    node("20000135", "HEXA Dragon Fang", "HEXA Shaft Break", "HEXA [Possess] Shaft Break", "HEXA [Execute] Phantom Blade", "HEXA Lasting Grudge"),
    node("20000181", "HEXA Death's Blessing", "HEXA Chasing Shot", "HEXA Unseen Sniper", "HEXA [Possess/Execute] Unseen Sniper"),
  ],
  enhancement: [s("Dragon Burst", "30000140"), s("Fatal Blitz", "30000141"), s("Thanatos Descent", "30000142"), s("Grip of Agony", "30000143")],
  ascent: s("Churning Malice", "10000087"),
};

const CADENA: HexaClassDef = {
  className: "Cadena",
  group: "Nova",
  origin: s("Chain Arts: Grand Arsenal", "10000036"),
  mastery: [
    node("20000036", "HEXA Chain Arts: Thrash"),
    node("20000086", "HEXA Muscle Memory"),
    node("20000136", "HEXA Summon Scimitar", "HEXA Summon Claw", "HEXA Summon Shuriken", "HEXA Summon Spiked Bat", "HEXA Chain Arts: Crush"),
    node("20000182", "HEXA Summon Shotgun", "HEXA Summon Daggers", "HEXA Summon Decoy Bomb", "HEXA Summon Brick", "HEXA Chain Arts: Beatdown", "HEXA Veteran Shadowdealer"),
  ],
  enhancement: [s("Chain Arts: Void Strike", "30000144"), s("Apocalypse Cannon", "30000145"), s("Chain Arts: Maelstrom", "30000146"), s("Muscle Memory Finale", "30000147")],
  ascent: s("Brutal Rampage", "10000088"),
};

const ANGELIC_BUSTER: HexaClassDef = {
  className: "Angelic Buster",
  group: "Nova",
  origin: s("Grand Finale", "10000037"),
  mastery: [
    node("20000037", "HEXA Trinity"),
    node("20000087", "HEXA Soul Seeker", "HEXA Soul Seeker Expert"),
    node("20000137", "HEXA Supreme Supernova"),
    node("20000183", "HEXA Celestial Roar", "Encore Ribbon"),
  ],
  enhancement: [s("Sparkle Burst", "30000148"), s("Superstar Spotlight", "30000149"), s("Mighty Mascot", "30000150"), s("Trinity Fusion", "30000151")],
  ascent: s("Surprise Encore", "10000089"),
};

// ── Transcendent ───────────────────────────
const ZERO: HexaClassDef = {
  className: "Zero",
  group: "Transcendent",
  origin: s("End Time", "10000038"),
  mastery: [
    node("20000038", "HEXA Giga Crash", "HEXA Falling Star", "HEXA Groundbreaker", "HEXA Wind Cutter", "HEXA Wind Striker", "HEXA Storm Break", "Time Piece"),
    node("20000088", "HEXA Spin Driver", "HEXA Rolling Cross", "HEXA Wheel Wind", "HEXA Rolling Assault"),
    node("20000138", "HEXA Flash Assault", "HEXA Blade Ring", "HEXA Flash Cut", "HEXA Throwing Weapon"),
    node("20000184", "HEXA Moon Strike", "HEXA Piercing Thrust", "HEXA Shadow Strike", "HEXA Rising Slash", "HEXA Air Raid", "HEXA Shadow Rain", "Infinite Resonance"),
  ],
  enhancement: [s("Chrono Break", "30000152"), s("Twin Blades of Time", "30000153"), s("Shadow Flash", "30000154"), s("Ego Weapon", "30000155")],
  ascent: s("Bitemporis", "10000090"),
};

// ── Friends World ───────────────────────────
const KINESIS: HexaClassDef = {
  className: "Kinesis",
  group: "Friends World",
  origin: s("From Another Realm", "10000039"),
  mastery: [
    node("20000039", "HEXA Ultimate - Metal Press"),
    node("20000089", "HEXA Psychic Grab", "HEXA Ultimate - Psychic Shot"),
    node("20000139", "HEXA Ultimate - Trainwreck", "HEXA Ultimate - B.P.M."),
    node("20000185", "HEXA Kinetic Combo"),
  ],
  enhancement: [s("Psychic Tornado", "30000156"), s("Ultimate - Mind Over Matter", "30000157"), s("Ultimate - Psychic Shockwave", "30000158"), s("Law of Gravity", "30000159")],
  ascent: s("Fractal Horizon", "10000091"),
};

// ── Flora ───────────────────────────
const ADELE: HexaClassDef = {
  className: "Adele",
  group: "Flora",
  origin: s("Maestro", "10000040"),
  mastery: [
    node("20000040", "HEXA Cleave", "HEXA Magic Dispatch", "HEXA Aetherial Arms"),
    node("20000090", "HEXA Hunting Decree", "HEXA Plummet"),
    node("20000140", "HEXA Impale", "HEXA Resonance Rush", "HEXA Noble Summons", "HEXA Aether Bloom"),
    node("20000186", "HEXA Aether Forge", "HEXA Reign of Destruction", "HEXA Shardbreaker"),
  ],
  enhancement: [s("Ruin", "30000160"), s("Infinity Blade", "30000161"), s("Legacy Restoration", "30000162"), s("Storm", "30000163")],
  ascent: s("Einheit", "10000092"),
};

const ILLIUM: HexaClassDef = {
  className: "Illium",
  group: "Flora",
  origin: s("Mytocrystal Expanse", "10000041"),
  mastery: [
    node("20000041", "HEXA Radiant Javelin", "HEXA Radiant Enchanted Javelin", "HEXA Winged Javelin", "HEXA Winged Enchanted Javelin"),
    node("20000091", "HEXA Reaction - Domination", "HEXA Reaction - Destruction", "HEXA Vortex Wings"),
    node("20000141", "HEXA Ex", "HEXA Machina", "HEXA Crystal Skill - Deus"),
    node("20000187", "HEXA Longinus Spear", "HEXA Umbral Brand III", "HEXA Longinus Zone"),
  ],
  enhancement: [s("Crystal Ignition", "30000164"), s("Templar Knight", "30000165"), s("Crystalline Spirit", "30000166"), s("Crystal Gate", "30000167")],
  ascent: s("Excidium", "10000093"),
};

const KHALI: HexaClassDef = {
  className: "Khali",
  group: "Flora",
  origin: s("Hex: Sandstorm", "10000042"),
  mastery: [
    node("20000042", "HEXA Arts: Flurry", "HEXA Arts: Crescentum"),
    node("20000092", "HEXA Void Rush", "HEXA Void Blitz", "HEXA Chakram Split"),
    node("20000142", "HEXA Hex: Chakram Sweep", "HEXA Hex: Chakram Fury", "HEXA Death Blossom"),
    node("20000188", "HEXA Resonate", "HEXA Deceiving Blade"),
  ],
  enhancement: [s("Hex: Pandemonium", "30000168"), s("Void Burst", "30000169"), s("Arts: Astra", "30000170"), s("Resonate: Ultimatum", "30000171")],
  ascent: s("Wake the Void", "10000094"),
};

const ARK: HexaClassDef = {
  className: "Ark",
  group: "Flora",
  origin: s("Primordial Abyss", "10000043"),
  mastery: [
    node("20000043", "HEXA Basic Charge Drive", "HEXA Scarlet Charge Drive", "HEXA Gust Charge Drive", "HEXA Abyssal Charge Drive", "Awakened Abyss"),
    node("20000093", "HEXA Grievous Wound", "HEXA Insatiable Hunger", "HEXA Unbridled Chaos"),
    node("20000143", "HEXA Vengeful Hate", "HEXA Blissful Restraint", "HEXA Endless Agony"),
    node("20000189", "HEXA Ominous Nightmare", "HEXA Ominous Dream"),
  ],
  enhancement: [s("Abyssal Recall", "30000172"), s("Infinity Spell", "30000173"), s("Devious Nightmare", "30000174"), s("Endlessly Starving Beast", "30000175")],
  ascent: s("Whisper of Deepest Abyss", "10000095"),
};

// ── Anima ───────────────────────────
const LARA: HexaClassDef = {
  className: "Lara",
  group: "Anima",
  origin: s("Universe in Bloom", "10000044"),
  mastery: [
    node("20000044", "HEXA Essence Sprinkle"),
    node("20000094", "HEXA Dragon Vein Eruption", "HEXA Eruption: Heaving River", "HEXA Eruption: Whirlwind", "HEXA Eruption: Sunrise Well"),
    node("20000144", "HEXA Dragon Vein Absorption", "HEXA Absorption: River Puddle Douse", "HEXA Absorption: Fierce Wind", "HEXA Absorption: Sunlit Grain"),
    node("20000190", "HEXA Wakeup Call"),
  ],
  enhancement: [s("Big Stretch", "30000176"), s("Land's Connection", "30000177"), s("Surging Essence", "30000178"), s("Winding Mountain Ridge", "30000179")],
  ascent: s("Cornucopia", "10000097"),
};

const HOYOUNG: HexaClassDef = {
  className: "Hoyoung",
  group: "Anima",
  origin: s("Sage: Apotheosis", "10000045"),
  mastery: [
    node("20000045", "HEXA Heaven: Consuming Flames", "HEXA Earth: Stone Tremor", "HEXA Humanity: Gold-Banded Cudgel"),
    node("20000095", "HEXA Heaven: Iron Fan Gale", "HEXA Earth: Ground-Shattering Wave", "HEXA Humanity: As-You-Will Fan"),
    node("20000145", "HEXA Talisman: Clone", "HEXA Talisman: Seeking Ghost Flame"),
    node("20000191", "HEXA Scroll: Star Vortex", "HEXA Scroll: Butterfly Dream"),
  ],
  enhancement: [s("Sage: Clone Rampage", "30000180"), s("Scroll: Tiger of Songyu", "30000181"), s("Sage: Wrath of Gods", "30000182"), s("Sage: Three Paths Apparition", "30000183")],
  ascent: s("Millennium Spirit", "10000098"),
};

// ── Sengoku ───────────────────────────
const HAYATO: HexaClassDef = {
  className: "Hayato",
  group: "Sengoku",
  origin: s("Shin Quick Draw", "10000046"),
  mastery: [
    node("20000046", "HEXA [Shinsoku] Mist Slash", "HEXA [Shinsoku] Afterimage Slash"),
    node("20000096", "HEXA [Shinsoku] Crescent Moon Cut", "HEXA [Shinsoku] Silent Arc"),
    node("20000192", "HEXA [Battou] Dark Moon Cut"),
    node("20000196", "HEXA [Battou] Full Moon's Rage"),
  ],
  enhancement: [s("Shogetsu Form", "30000184"), s("[Shinsoku] Crashing Tide", "30000185"), s("[Shinsoku] Light Cutter", "30000186"), s("[Battou] Wailing Heavens", "30000187")],
  ascent: s("Fleeting Breath", "10000100"),
};

const KANNA: HexaClassDef = {
  className: "Kanna",
  group: "Sengoku",
  origin: s("[Divine Will] Advent of Crimson", "10000047"),
  mastery: [
    node("20000047", "HEXA Soul-Shatter Talisman: Dance", "HEXA Heart-Wreck Talisman"),
    node("20000097", "HEXA Summon Oni", "HEXA [Order] Spinning Strike", "HEXA [Order] Pulverizing Strike"),
    node("20000193", "HEXA Summon Tengu", "HEXA Shade-Fletched Arrow"),
    node("20000197", "HEXA Summon Orochi", "HEXA [Order] Execute"),
  ],
  enhancement: [s("[Spirit] Hakumenkonmou Juubi", "30000188"), s("[Spirit] Unleash the Radiant Flame", "30000189"), s("[Spirit] Unleash Black-Winged Destruction", "30000190"), s("[Spirit] Unleash Soul-Searing Venom", "30000191")],
  ascent: s("[Divine Will] Final Rest", "10000099"),
};

// ── Jianghu ───────────────────────────
const LYNN: HexaClassDef = {
  className: "Lynn",
  group: "Jianghu",
  origin: s("Source Flow", "10000048"),
  mastery: [
    node("20000048", "HEXA Strike"),
    node("20000098", "HEXA Sneak Attack", "HEXA Raid"),
    node("20000194", "HEXA Peck"),
    node("20000198", "HEXA [Focus] Heal", "HEXA [Focus] Forest Protection", "HEXA Mother Nature's Touch"),
  ],
  enhancement: [s("Beast's Rage", "30000192"), s("Beak Strike", "30000193"), s("[Focus] Awaken", "30000194"), s("Nature's Grace", "30000195")],
  ascent: s("Wild Hunt", "10000102"),
};

const MO_XUAN: HexaClassDef = {
  className: "Mo Xuan",
  group: "Jianghu",
  origin: s("Soul Art: Jianghu Dragon", "10000049"),
  mastery: [
    node("20000049", "HEXA Xuanshan Arts [Tian]", "HEXA Xuanshan Arts [Di]"),
    node("20000099", "HEXA Divine Art: Howling Storm", "HEXA Divine Art: Righteous Thunder", "HEXA Divine Art: Erupting Flame"),
    node("20000195", "HEXA Divine Art: Swirling Tide", "HEXA Soul Art: Black Wind", "HEXA Divine Art: Tearing Wind"),
    node("20000199", "HEXA Secret Art: Qi Projection"),
  ],
  enhancement: [s("Soul Art: Beneath Heaven", "30000196"), s("Divine Art: Crashing Earth", "30000199"), s("Soul Art: The Conquered Self", "30000197"), s("Soul Art: The Opened Gate", "30000198")],
  ascent: s("Soul Art: Where Destiny Falls", "10000101"),
};

const REN: HexaClassDef = {
  className: "Ren",
  group: "Anima",
  origin: s("Rising Azure Dragon: Divided Heavens", "10000050"),
  mastery: [
    node("20000200", "HEXA Plum Blossom Sword: Storm"),
    node("20000201", "HEXA Imugi Spirit Sword: Spirit Strike", "HEXA Second Imugi Spirit Sword: Serpent's Fang"),
    node("20000202", "HEXA Wish Unending", "HEXA Final Imugi Spirit Sword: Burrowing Earth", "HEXA Final Imugi Spirit Sword: Ravenous Spirit", "HEXA Final Imugi Spirit Sword: Years Uncounted"),
    node("20000203", "HEXA Second Plum Blossom Sword: Raining Blossoms", "HEXA Third Plum Blossom Sword: Riotous Heart", "HEXA Third Plum Blossom Sword: Hearts United"),
  ],
  enhancement: [s("Final Plum Blossom Sword: Thousand Blossom Flurry", "30000209"), s("Soul Immeasurable", "30000210"), s("Final Plum Blossom Sword: Dancing Annihilation", "30000211"), s("Final Imugi Spirit Sword: Blade of the Unbound Heart", "30000212")],
  ascent: s("Rising Azure Dragon: Heartbound Verse", "10000096"),
};

// ── SHINE ───────────────────────────
const SIA: HexaClassDef = {
  className: "Sia Astelle",
  group: "SHINE",
  origin: su("Celestial Design", "skill", "182141500"),
  mastery: [
    nodeUrl("erda-skill", "ultimate/500", "SHINE Ray", "SHINE Stellar I - Antares"),
    nodeUrl("erda-skill", "ultimate/501", "SHINE Boom", "SHINE Stellar II - Algol", "SHINE Stellar V - Fomalhaut"),
  ],
  enhancement: [
    su("Shine", "erda-skill", "skill/102"),
    su("Stellar XI - Sirius", "erda-skill", "skill/101"),
    su("Stellar XII - Sadalsuud", "erda-skill", "skill/104"),
    su("Savior's Circle", "erda-skill", "skill/106"),
  ],
  ascent: su("Starlit Cosmos", "skill", "182141502"),
};

// ── Common Skills ─────────────────────────────

export const COMMON_SKILLS: HexaSkillDef[] = [
  su("Sol Janus", "erda-skill", "skill/100"),
  // Sol Hecate isn't in the v268 dump yet (arriving next version); temporarily served
  // from orangemushroom.net. Replace iconUrl with its hexa-skill iconId when available.
  { name: "Sol Hecate", iconId: "", iconUrl: "https://orangemushroom.net/wp-content/uploads/2026/01/sol-hecate-1.png" },
];

// ── Exported class list ─────────────────────────

const HEXA_CLASSES: HexaClassDef[] = [
  // Explorers
  HERO, PALADIN, DARK_KNIGHT, ARCH_MAGE_F_P, ARCH_MAGE_I_L, BISHOP, BOWMASTER, MARKSMAN, PATHFINDER, NIGHT_LORD, SHADOWER, DUAL_BLADE, BUCCANEER, CORSAIR, CANNONEER,
  // Cygnus Knights
  MIHILE, DAWN_WARRIOR, BLAZE_WIZARD, WIND_ARCHER, NIGHT_WALKER, THUNDER_BREAKER,
  // Heroes of Maple
  ARAN, EVAN, LUMINOUS, MERCEDES, PHANTOM, SHADE,
  // Resistance
  BLASTER, BATTLE_MAGE, WILD_HUNTER, XENON, MECHANIC,
  // Demons
  DEMON_SLAYER, DEMON_AVENGER,
  // Nova
  KAISER, KAIN, CADENA, ANGELIC_BUSTER,
  // Transcendent
  ZERO,
  // Friends World
  KINESIS,
  // Flora
  ADELE, ILLIUM, KHALI, ARK,
  // Anima
  LARA, HOYOUNG, REN,
  // Sengoku
  HAYATO, KANNA,
  // Jianghu
  LYNN, MO_XUAN,
  // SHINE
  SIA,
];

/** Lookup a class definition by className (case-insensitive). */
export function findClassByName(name: string): HexaClassDef | null {
  const lower = name.toLowerCase();
  return HEXA_CLASSES.find((c) => c.className.toLowerCase() === lower) ?? null;
}

/** Get unique group names in display order. */
export function getClassGroups(): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const c of HEXA_CLASSES) {
    if (!seen.has(c.group)) {
      seen.add(c.group);
      groups.push(c.group);
    }
  }
  return groups;
}

/** Get classes in a specific group. */
export function getClassesInGroup(group: string): HexaClassDef[] {
  return HEXA_CLASSES.filter((c) => c.group === group);
}

/** Maps classSkillData snake_case IDs to HexaClassDef className for cross-feature lookup. */
const CLASS_ID_TO_NAME: Record<string, string> = {
  adele: "Adele",
  angelic_buster: "Angelic Buster",
  arch_mage_f_p: "Arch Mage (F/P)",
  arch_mage_i_l: "Arch Mage (I/L)",
  aran: "Aran",
  ark: "Ark",
  battle_mage: "Battle Mage",
  bishop: "Bishop",
  blade_master: "Dual Blade",
  blaster: "Blaster",
  blaze_wizard: "Blaze Wizard",
  bow_master: "Bowmaster",
  buccaneer: "Buccaneer",
  cadena: "Cadena",
  cannoneer: "Cannoneer",
  corsair: "Corsair",
  dark_knight: "Dark Knight",
  dawn_warrior: "Dawn Warrior",
  demon_avenger: "Demon Avenger",
  demon_slayer: "Demon Slayer",
  evan: "Evan",
  hayato: "Hayato",
  hero: "Hero",
  hoyoung: "Hoyoung",
  illium: "Illium",
  kain: "Kain",
  kaiser: "Kaiser",
  kanna: "Kanna",
  khali: "Khali",
  kinesis: "Kinesis",
  lara: "Lara",
  luminous: "Luminous",
  lynn: "Lynn",
  marksman: "Marksman",
  mechanic: "Mechanic",
  mercedes: "Mercedes",
  mihile: "Mihile",
  mo_xuan: "Mo Xuan",
  night_lord: "Night Lord",
  night_walker: "Night Walker",
  paladin: "Paladin",
  pathfinder: "Pathfinder",
  phantom: "Phantom",
  ren: "Ren",
  sia_astelle: "Sia Astelle",
  shade: "Shade",
  shadower: "Shadower",
  thunder_breaker: "Thunder Breaker",
  wild_hunter: "Wild Hunter",
  wind_archer: "Wind Archer",
  xenon: "Xenon",
  zero: "Zero",
};

/** Lookup a class definition by its classSkillData snake_case id. */
export function findClassById(id: string): HexaClassDef | null {
  const className = CLASS_ID_TO_NAME[id];
  return className !== undefined ? findClassByName(className) : null;
}
