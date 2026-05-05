/**
 * HEXA class and skill definitions for all MapleStory classes.
 *
 * Skill names use GMS names sourced from masonym.dev reference implementation.
 * Icons sourced from maplestorywiki.net CDN.
 *
 * Mastery nodes: most classes have 4 mastery nodes (Sia has 2). Each node
 * boosts multiple skills simultaneously — the node is leveled as one unit.
 *
 * Enhancement (V Boost): each class has 4 enhancement skills, each leveled
 * individually.
 */

const CDN = "https://media.maplestorywiki.net/yetidb";

function skillIcon(name: string): string {
  const cleaned = name.replace(/:/g, "").replace(/'/g, "%27").replace(/ +/g, "_");
  return `${CDN}/Skill_${cleaned}.png`;
}

export interface HexaSkillDef {
  name: string;
  icon: string;
}

export interface HexaSkillLevels {
  origin: number;
  ascent: number;
  mastery: number[];
  enhancement: number[];
  common: number[];
}

export interface HexaClassDef {
  className: string;
  group: string;
  origin: HexaSkillDef;
  /** Mastery nodes — each node is an array of skills boosted together (usually 4, Sia has 2). */
  mastery: HexaSkillDef[][];
  enhancement: HexaSkillDef[];
  ascent: HexaSkillDef | null;
}

function s(name: string): HexaSkillDef {
  return { name, icon: skillIcon(name) };
}

/** Skill whose wiki icon name differs from its display name. */
function si(name: string, iconName: string): HexaSkillDef {
  return { name, icon: skillIcon(iconName) };
}

// ── Explorers (Warriors) ─────────────────────────────────────────────────────

const HERO: HexaClassDef = {
  className: "Hero",
  group: "Explorer",
  origin: s("Spirit Calibur"),
  mastery: [
    [s("HEXA Raging Blow")],
    [s("HEXA Rising Rage")],
    [s("HEXA Beam Blade"), s("Rending Edge")],
    [s("HEXA Cry Valhalla"), s("HEXA Puncture"), si("HEXA Final Attack", "Final Attack")],
  ],
  enhancement: [s("Burning Soul Blade"), s("Instinctual Combo"), s("Worldreaver"), s("Sword Illusion")],
  ascent: s("Ultrasonic Slash"),
};

const PALADIN: HexaClassDef = {
  className: "Paladin",
  group: "Explorer",
  origin: s("Sacred Bastion"),
  mastery: [
    [s("HEXA Blast"), s("HEXA Divine Judgment")],
    [s("Falling Justice"), s("HEXA Divine Charge"), s("HEXA Divine Mark")],
    [s("HEXA Heaven's Hammer")],
    [si("HEXA Final Attack", "Final Attack"), s("Rising Justice")],
  ],
  enhancement: [s("Divine Echo"), s("Hammers of the Righteous"), s("Grand Guardian"), s("Mighty Mjolnir")],
  ascent: s("Dominus Oblivion"),
};

const DARK_KNIGHT: HexaClassDef = {
  className: "Dark Knight",
  group: "Explorer",
  origin: s("Dead Space"),
  mastery: [
    [s("HEXA Gungnir's Descent")],
    [s("Dark Bident"), s("HEXA Dark Impale"), s("HEXA Nightshade Explosion")],
    [s("HEXA Revenge of the Evil Eye"), si("HEXA Final Attack", "Final Attack")],
    [s("HEXA Evil Eye Shock")],
  ],
  enhancement: [s("Spear of Darkness"), s("Radiant Evil"), s("Calamitous Cyclone"), s("Darkness Aura")],
  ascent: s("Dark Halidom"),
};

// ── Explorers (Mages) ────────────────────────────────────────────────────────

const ARCH_MAGE_FP: HexaClassDef = {
  className: "Arch Mage (F/P)",
  group: "Explorer",
  origin: s("Infernal Venom"),
  mastery: [
    [s("HEXA Flame Sweep")],
    [s("HEXA Flame Haze"), s("HEXA Mist Eruption")],
    [s("HEXA Ignite"), s("HEXA Ifrit"), s("HEXA Inferno Aura")],
    [s("HEXA Creeping Toxin"), s("HEXA Meteor Shower"), s("HEXA Megiddo Flame")],
  ],
  enhancement: [s("DoT Punisher"), s("Poison Nova"), s("Elemental Fury"), s("Poison Chain")],
  ascent: s("Immortal Flame"),
};

const ARCH_MAGE_IL: HexaClassDef = {
  className: "Arch Mage (I/L)",
  group: "Explorer",
  origin: s("Frozen Lightning"),
  mastery: [
    [s("HEXA Chain Lightning")],
    [s("HEXA Frozen Orb"), s("HEXA Blizzard")],
    [s("HEXA Lightning Orb"), s("Cryo Shock")],
    [s("HEXA Thunder Sphere"), s("HEXA Elquines")],
  ],
  enhancement: [s("Frost Ark"), s("Bolt Barrage"), s("Spirit of Snow"), s("Jupiter Thunder")],
  ascent: s("Parabolic Bolt"),
};

const BISHOP: HexaClassDef = {
  className: "Bishop",
  group: "Explorer",
  origin: s("Holy Advent"),
  mastery: [
    [s("HEXA Angel Ray")],
    [s("HEXA Big Bang"), s("HEXA Triumph Feather")],
    [s("HEXA Angelic Wrath"), s("HEXA Fountain of Vengeance"), s("HEXA Bahamut")],
    [s("HEXA Genesis"), s("HEXA Heaven's Door")],
  ],
  enhancement: [s("Benediction"), s("Angel of Balance"), s("Peacemaker"), s("Divine Punishment")],
  ascent: s("Commandment of Heaven"),
};

// ── Explorers (Archers) ──────────────────────────────────────────────────────

const BOWMASTER: HexaClassDef = {
  className: "Bowmaster",
  group: "Explorer",
  origin: s("Ascendant Shadow"),
  mastery: [
    [s("HEXA Hurricane")],
    [s("HEXA Arrow Stream"), s("HEXA Arrow Blaster")],
    [s("HEXA Quiver Cartridge"), s("HEXA Phoenix"), s("Extra Quiver Cartridge")],
    [s("HEXA Speed Mirage"), s("HEXA Gritty Gust")],
  ],
  enhancement: [s("Storm of Arrows"), s("Inhuman Speed"), s("Quiver Barrage"), s("Silhouette Mirage")],
  ascent: s("Flashpoint"),
};

const MARKSMAN: HexaClassDef = {
  className: "Marksman",
  group: "Explorer",
  origin: s("Final Aim"),
  mastery: [
    [s("HEXA Snipe")],
    [s("HEXA Piercing Arrow")],
    [s("HEXA Frostprey"), s("HEXA Bolt Burst")],
    [si("HEXA Final Attack", "Final Attack"), s("HEXA High Speed Shot")],
  ],
  enhancement: [s("Perfect Shot"), s("Split Shot"), s("Surge Bolt"), s("Repeating Crossbow Cartridge")],
  ascent: s("Fatal Trigger"),
};

const PATHFINDER: HexaClassDef = {
  className: "Pathfinder",
  group: "Explorer",
  origin: s("Forsaken Relic"),
  mastery: [
    [s("HEXA Cardinal Burst"), s("HEXA Bountiful Burst")],
    [s("HEXA Cardinal Deluge"), s("HEXA Bountiful Deluge")],
    [s("HEXA Glyph of Impalement"), s("HEXA Cardinal Torrent"), s("HEXA Ancient Astra"), s("Ancient Impact")],
    [s("HEXA Combo Assault"), s("HEXA Shadow Raven"), s("Manifest Curse")],
  ],
  enhancement: [s("Nova Blast"), s("Raven Tempest"), s("Obsidian Barrier"), s("Relic Unbound")],
  ascent: s("Piercing Relic"),
};

// ── Explorers (Thieves) ──────────────────────────────────────────────────────

const NIGHT_LORD: HexaClassDef = {
  className: "Night Lord",
  group: "Explorer",
  origin: s("Life and Death"),
  mastery: [
    [s("HEXA Quad Star"), s("Enhanced HEXA Quad Star")],
    [s("HEXA Assassin's Mark")],
    [si("HEXA Dark Flare", "HEXA Dark Flare (Night Lord)"), s("HEXA Showdown"), s("Darkness Shuriken")],
    [si("HEXA Sudden Raid", "HEXA Sudden Raid (Night Lord)"), s("HEXA Death Star")],
  ],
  enhancement: [s("Throwing Star Barrage"), s("Shurrikane"), s("Dark Lord's Omen"), s("Throw Blasting")],
  ascent: s("Deep Strike"),
};

const SHADOWER: HexaClassDef = {
  className: "Shadower",
  group: "Explorer",
  origin: s("Halve Cut"),
  mastery: [
    [s("HEXA Assassinate"), s("HEXA Pulverize")],
    [si("HEXA Meso Explosion", "HEXA Meso Explosion (Pick Pocket)")],
    [si("HEXA Dark Flare", "HEXA Dark Flare (Shadower)"), s("HEXA Cruel Stab")],
    [si("HEXA Sudden Raid", "HEXA Sudden Raid (Shadower)"), s("HEXA Shadow Veil"), s("Covert Edge")],
  ],
  enhancement: [s("Shadow Assault"), s("Trickblade"), s("Sonic Blow"), s("Slash Shadow Formation")],
  ascent: s("Covetous Darkness"),
};

const DUAL_BLADE: HexaClassDef = {
  className: "Dual Blade",
  group: "Explorer",
  origin: s("Karma Blade"),
  mastery: [
    [s("HEXA Phantom Blow")],
    [s("HEXA Asura's Anger")],
    [s("HEXA Blade Clone"), s("Mortality")],
    [s("HEXA Blade Fury"), s("HEXA Sudden Raid")],
  ],
  enhancement: [s("Blade Storm"), s("Blades of Destiny"), s("Blade Tornado"), s("Haunted Edge")],
  ascent: s("Yama's Decree"),
};

// ── Explorers (Pirates) ──────────────────────────────────────────────────────

const BUCCANEER: HexaClassDef = {
  className: "Buccaneer",
  group: "Explorer",
  origin: s("Unleash Neptunus"),
  mastery: [
    [s("HEXA Octopunch"), s("Super Octopunch")],
    [s("HEXA Sea Serpent"), s("HEXA Nautilus Strike")],
    [s("HEXA Serpent Scale")],
    [s("HEXA Hook Bomber")],
  ],
  enhancement: [s("Lightning Form"), s("Lord of the Deep"), s("Serpent Vortex"), s("Howling Fist")],
  ascent: s("Haymaker"),
};

const CORSAIR: HexaClassDef = {
  className: "Corsair",
  group: "Explorer",
  origin: s("The Dreadnought"),
  mastery: [
    [s("HEXA Rapid Fire"), si("HEXA Rapid Fire [Shootout Mode]", "HEXA Rapid Fire (Shootout Mode)")],
    [s("HEXA Broadside")],
    [s("HEXA Brain Scrambler"), si("Condemnation", "Condemnation (Corsair)"), s("HEXA Eight-Legs Easton"), s("HEXA Firing Orders")],
    [s("HEXA Scurvy Summons"), s("HEXA Siege Bomber"), s("HEXA Ugly Bomb"), si("HEXA Nautilus Strike", "HEXA Nautilus Strike (Corsair)")],
  ],
  enhancement: [s("Bullet Barrage"), s("Target Lock"), s("Nautilus Assault"), s("Death Trigger")],
  ascent: s("Firecracker Fusillade"),
};

const CANNONEER: HexaClassDef = {
  className: "Cannoneer",
  group: "Explorer",
  origin: s("Super Cannon Explosion"),
  mastery: [
    [s("HEXA Cannon Barrage")],
    [s("HEXA Cannon Bazooka"), s("HEXA Monkey Mortar"), s("HEXA Anchors Away"), s("HEXA Nautilus Strike")],
    [s("HEXA Rolling Rainbow")],
    [s("HEXA Support Monkey"), s("HEXA Monkey Fury")],
  ],
  enhancement: [s("Cannon of Mass Destruction"), s("The Nuclear Option"), s("Monkey Business"), s("Poolmaker")],
  ascent: s("Barrel of Monkeys"),
};

// ── Cygnus Knights ───────────────────────────────────────────────────────────

const MIHILE: HexaClassDef = {
  className: "Mihile",
  group: "Cygnus Knights",
  origin: s("Durendal"),
  mastery: [
    [s("HEXA Radiant Cross"), s("HEXA Radiant Cross - Assault")],
    [s("HEXA Royal Guard")],
    [s("HEXA Install Shield"), s("HEXA Charging Light")],
    [s("HEXA Offensive Defense"), si("HEXA Final Attack", "Final Attack"), s("HEXA Soul Majesty")],
  ],
  enhancement: [s("Shield of Light"), s("Sword of Light"), s("Radiant Soul"), s("Light of Courage")],
  ascent: s("Knights Immortal"),
};

const DAWN_WARRIOR: HexaClassDef = {
  className: "Dawn Warrior",
  group: "Cygnus Knights",
  origin: s("Astral Blitz"),
  mastery: [
    [s("HEXA Luna Divide"), s("HEXA Solar Slash")],
    [s("Equinox Power"), s("HEXA Cosmic Shower")],
    [s("HEXA Cosmic Burst")],
    [s("HEXA Equinox Slash"), s("Equinox Power II")],
  ],
  enhancement: [s("Cosmos"), s("Rift of Damnation"), s("Soul Eclipse"), s("Flare Slash")],
  ascent: s("Totality"),
};

const BLAZE_WIZARD: HexaClassDef = {
  className: "Blaze Wizard",
  group: "Cygnus Knights",
  origin: s("Eternity"),
  mastery: [
    [s("HEXA Orbital Flame")],
    [si("HEXA Blazing Extinction", "HEXA Blazing Extinction (Blazing Lion)")],
    [s("HEXA Orbital Explosion"), s("HEXA Phoenix Drive")],
    [si("HEXA Towering Inferno", "HEXA Towering Inferno (Blazing Lion)")],
  ],
  enhancement: [s("Orbital Inferno"), s("Savage Flame"), s("Inferno Sphere"), s("Salamander Mischief")],
  ascent: s("Flame Concerto"),
};

const WIND_ARCHER: HexaClassDef = {
  className: "Wind Archer",
  group: "Cygnus Knights",
  origin: s("Mistral Spring"),
  mastery: [
    [s("HEXA Song of Heaven")],
    [s("HEXA Trifling Wind")],
    [s("HEXA Storm Bringer"), s("HEXA Fairy Spiral"), s("HEXA Monsoon")],
    [s("HEXA Storm Whim"), s("Anemoi")],
  ],
  enhancement: [s("Howling Gale"), s("Merciless Winds"), s("Gale Barrier"), s("Vortex Sphere")],
  ascent: s("Elemental Tempest"),
};

const NIGHT_WALKER: HexaClassDef = {
  className: "Night Walker",
  group: "Cygnus Knights",
  origin: s("Silence"),
  mastery: [
    [s("HEXA Quintuple Star"), si("HEXA Quintuple Star - Jet Black", "HEXA Quintuple Star")],
    [s("HEXA Shadow Bat"), s("HEXA Ravenous Bat")],
    [si("HEXA Dark Omen", "HEXA Dark Omen (Shadow Bat)")],
    [s("HEXA Dominion"), s("Abyssal Darkness")],
  ],
  enhancement: [s("Shadow Spear"), s("Greater Dark Servant"), s("Shadow Bite"), s("Rapid Throw")],
  ascent: s("Stygian Command"),
};

const THUNDER_BREAKER: HexaClassDef = {
  className: "Thunder Breaker",
  group: "Cygnus Knights",
  origin: s("Thunder Wall Sea Wave"),
  mastery: [
    [s("HEXA Annihilate"), s("Thunder Bolt")],
    [s("HEXA Thunderbolt")],
    [s("HEXA Typhoon"), s("HEXA Deep Rising")],
    [s("HEXA Sea Wave"), s("Deep Reinforcement")],
  ],
  enhancement: [s("Lightning Cascade"), s("Shark Torpedo"), s("Lightning God Spear Strike"), s("Lightning Spear Multistrike")],
  ascent: s("Annihilating Rush"),
};

// ── Heroes of Maple ──────────────────────────────────────────────────────────

const ARAN: HexaClassDef = {
  className: "Aran",
  group: "Heroes of Maple",
  origin: s("Endgame"),
  mastery: [
    [s("HEXA Beyond Blade")],
    [s("HEXA Finisher - Hunter's Prey")],
    [s("HEXA Hyper Finisher - Last Stand")],
    [s("HEXA Adrenaline Overload"), s("HEXA Permafrost"), si("HEXA Final Attack", "Final Attack")],
  ],
  enhancement: [s("Finisher - Adrenaline Surge"), s("Maha's Carnage"), s("Final Beyond Blade - White Tiger"), s("Blizzard Tempest")],
  ascent: s("Hailstorm Howl"),
};

const EVAN: HexaClassDef = {
  className: "Evan",
  group: "Heroes of Maple",
  origin: s("Zodiac Burst"),
  mastery: [
    [s("HEXA Mana Burst")],
    [s("HEXA Thunder Circle"), s("HEXA Dragon Flash"), s("HEXA Thunder Flash"), s("HEXA Wind Flash")],
    [s("HEXA Earth Circle"), s("HEXA Dragon Dive"), s("HEXA Earth Dive"), s("HEXA Thunder Dive")],
    [s("HEXA Wind Circle"), s("HEXA Dragon Breath"), s("HEXA Earth Breath"), s("HEXA Wind Breath"), s("HEXA Magic Debris"), s("HEXA Dragon Spark")],
  ],
  enhancement: [s("Elemental Barrage"), s("Dragon Slam"), s("Elemental Radiance"), s("Spiral of Mana")],
  ascent: s("United Horizons"),
};

const LUMINOUS: HexaClassDef = {
  className: "Luminous",
  group: "Heroes of Maple",
  origin: s("Harmonic Paradox"),
  mastery: [
    [s("HEXA Ender")],
    [s("HEXA Reflection"), s("Endless Darkness")],
    [s("HEXA Apocalypse"), s("Eternal Light")],
    [si("HEXA Twilight Nova", "HEXA Twilight Nova (Sunfire)")],
  ],
  enhancement: [s("Gate of Light"), s("Aether Conduit"), s("Baptism of Light and Darkness"), s("Liberation Orb")],
  ascent: s("Lustrous Orb"),
};

const MERCEDES: HexaClassDef = {
  className: "Mercedes",
  group: "Heroes of Maple",
  origin: s("Unfading Glory"),
  mastery: [
    [s("HEXA Ishtar's Ring")],
    [s("HEXA Wrath of Enlil"), s("HEXA Spikes Royale"), s("HEXA Leaf Tornado"), s("HEXA Wrath of Enlil: Spirit Enchant"), s("HEXA Spikes Royale: Spirit Enchant"), s("HEXA Leaf Tornado: Spirit Enchant")],
    [s("HEXA Unicorn Spike"), s("HEXA Gust Dive"), s("HEXA Stunning Strikes")],
    [s("HEXA Elemental Knights"), si("HEXA Final Attack", "Final Attack")],
  ],
  enhancement: [s("Spirit of Elluel"), s("Sylvidia's Flight"), s("Irkalla's Wrath"), s("Royal Knights")],
  ascent: s("Primeval Spirits"),
};

const PHANTOM: HexaClassDef = {
  className: "Phantom",
  group: "Heroes of Maple",
  origin: s("Defying Fate"),
  mastery: [
    [s("HEXA Tempest")],
    [s("Fate Shuffle"), s("HEXA Mille Aiguilles"), s("HEXA Mille Aiguilles: Fortune")],
    [s("HEXA Carte Noir")],
    [s("HEXA Rose Carte Finale"), s("La Mort Carte")],
  ],
  enhancement: [s("Luck of the Draw"), s("Ace in the Hole"), s("Phantom's Mark"), s("Rift Break")],
  ascent: s("Moonlit Serenade"),
};

const SHADE: HexaClassDef = {
  className: "Shade",
  group: "Heroes of Maple",
  origin: s("Advent of the Fox"),
  mastery: [
    [s("HEXA Spirit Claw")],
    [s("HEXA Fox Spirits")],
    [s("HEXA Bomb Punch"), s("HEXA Death Mark"), s("Dusk Blow")],
    [s("HEXA Spirit Frenzy")],
  ],
  enhancement: [s("Fox God Flash"), s("Spiritgate"), s("True Spirit Claw"), s("Smashing Multipunch")],
  ascent: s("Promise Unbroken"),
};

// ── Resistance ───────────────────────────────────────────────────────────────

const BLASTER: HexaClassDef = {
  className: "Blaster",
  group: "Resistance",
  origin: s("Final Destroyer"),
  mastery: [
    [s("HEXA Magnum Punch"), s("HEXA Double Blast")],
    [s("HEXA Bunker Buster Explosion"), s("Burst Pile Bunker")],
    [s("HEXA Revolving Cannon Mastery"), s("HEXA Hammer Smash"), s("HEXA Shotgun Punch")],
    [s("HEXA Revolving Cannon"), s("HEXA Ballistic Hurricane")],
  ],
  enhancement: [s("Rocket Punch"), s("Gatling Punch"), s("Bullet Blast"), s("Afterimage Shock")],
  ascent: s("Vanguard Strike"),
};

const BATTLE_MAGE: HexaClassDef = {
  className: "Battle Mage",
  group: "Resistance",
  origin: s("Crimson Pact"),
  mastery: [
    [s("HEXA Condemnation")],
    [s("HEXA Finishing Blow"), s("HEXA Sweeping Staff")],
    [s("HEXA Dark Shock")],
    [s("HEXA Dark Genesis")],
  ],
  enhancement: [s("Aura Scythe"), s("Altar of Annihilation"), s("Grim Harvest"), s("Abyssal Lightning")],
  ascent: s("Duskbound Aura"),
};

const WILD_HUNTER: HexaClassDef = {
  className: "Wild Hunter",
  group: "Resistance",
  origin: s("Synchronous Hunt"),
  mastery: [
    [s("HEXA Wild Arrow Blast: Apex")],
    [s("HEXA Assist: Rending Swipe"), s("HEXA Assist: Skull Bash"), s("HEXA Assist: Snapping Fangs")],
    [s("HEXA Command: Alpha Surge"), s("HEXA Command: Titan Pounce")],
    [s("HEXA Another Bite"), si("HEXA Final Attack", "Final Attack"), s("HEXA Trap Seed")],
  ],
  enhancement: [s("Command: Predator's Eye"), s("Overbite"), s("Primal Bloom"), s("Wild Arrow Blast: Overdrive")],
  ascent: s("Gear Storm"),
};

const XENON: HexaClassDef = {
  className: "Xenon",
  group: "Resistance",
  origin: s("Artificial Evolution"),
  mastery: [
    [s("HEXA Mecha Purge: Snipe")],
    [s("HEXA Triangulation"), s("HEXA Hypogram Field")],
    [s("HEXA Orbital Cataclysm"), s("HEXA Salvo System")],
    [s("HEXA Beam Dance")],
  ],
  enhancement: [s("Omega Blaster"), s("Core Overload"), s("Hypogram Field: Fusion"), s("Photon Ray")],
  ascent: s("Neoteric Snap"),
};

const MECHANIC: HexaClassDef = {
  className: "Mechanic",
  group: "Resistance",
  origin: s("Ground Zero"),
  mastery: [
    [s("HEXA AP Salvo Plus"), s("HEXA Heavy Salvo Plus")],
    [s("HEXA Homing Beacon")],
    [s("HEXA Distortion Bomb")],
    [s("HEXA Robo Launcher RM7"), s("HEXA Rock 'n Shock"), s("HEXA Bots 'n Tots"), s("Robo Conversion: CB-P1")],
  ],
  enhancement: [s("Doomsday Device"), s("Mobile Missile Battery"), s("Full Metal Barrage"), s("Mecha Carrier")],
  ascent: s("Mechanized Extinction"),
};

// ── Demons ────────────────────────────────────────────────────────────────────

const DEMON_SLAYER: HexaClassDef = {
  className: "Demon Slayer",
  group: "Demon",
  origin: s("Nightmare"),
  mastery: [
    [s("HEXA Demon Impact"), s("HEXA Demon Impact: Demon Chain")],
    [s("HEXA Demon Lash"), s("HEXA Infernal Concussion")],
    [s("HEXA Demon Cry"), s("HEXA Dark Metamorphosis")],
    [s("HEXA Cerberus Chomp"), s("Demonic Plume")],
  ],
  enhancement: [s("Demon Awakening"), s("Spirit of Rage"), s("Orthrus"), s("Demon Bane")],
  ascent: s("Amethystine Incursion"),
};

const DEMON_AVENGER: HexaClassDef = {
  className: "Demon Avenger",
  group: "Demon",
  origin: s("Requiem"),
  mastery: [
    [s("HEXA Nether Shield")],
    [s("HEXA Exceed: Execution")],
    [s("HEXA Exceed: Lunar Slash"), s("Maximal Exceed")],
    [s("HEXA Thousand Swords"), s("HEXA Infernal Exceed")],
  ],
  enhancement: [s("Demonic Frenzy"), s("Demonic Blast"), s("Dimensional Sword"), s("Revenant")],
  ascent: s("Rageborne Devil"),
};

// ── Nova ──────────────────────────────────────────────────────────────────────

const KAISER: HexaClassDef = {
  className: "Kaiser",
  group: "Nova",
  origin: s("Nova Triumphant"),
  mastery: [
    [s("HEXA Gigas Wave")],
    [s("HEXA Blade Burst"), s("HEXA Tempest Blades")],
    [s("HEXA Inferno Breath")],
    [s("HEXA Wing Beat"), s("HEXA Stone Dragon")],
  ],
  enhancement: [s("Nova Guardians"), s("Bladefall"), s("Draco Surge"), s("Dragonflare")],
  ascent: s("Pyroclastic Instinct"),
};

const KAIN: HexaClassDef = {
  className: "Kain",
  group: "Nova",
  origin: s("Total Annihilation"),
  mastery: [
    [s("HEXA Falling Dust")],
    [s("HEXA Strike Arrow"), s("HEXA Scattering Shot"), si("HEXA Tearing Knife", "HEXA (Execute) Tearing Knife"), si("HEXA Chain Sickle", "HEXA (Execute) Chain Sickle")],
    [s("HEXA Dragon Fang"), s("HEXA Shaft Break"), si("HEXA [Possess] Shaft Break", "HEXA (Possess) Shaft Break"), si("HEXA [Execute] Phantom Blade", "HEXA (Execute) Phantom Blade"), s("HEXA Lasting Grudge")],
    [s("HEXA Death's Blessing"), s("HEXA Chasing Shot"), s("HEXA Unseen Sniper"), si("HEXA [Possess/Execute] Unseen Sniper", "HEXA (Possess\uFF0FExecute) Unseen Sniper")],
  ],
  enhancement: [si("Dragon Burst", "(Possess) Dragon Burst"), si("Fatal Blitz", "(Execute) Fatal Blitz"), s("Thanatos Descent"), s("Grip of Agony")],
  ascent: si("Churning Malice", "(Possess) Churning Malice"),
};

const CADENA: HexaClassDef = {
  className: "Cadena",
  group: "Nova",
  origin: s("Chain Arts: Grand Arsenal"),
  mastery: [
    [s("HEXA Chain Arts: Thrash")],
    [s("HEXA Muscle Memory")],
    [s("HEXA Summon Scimitar"), s("HEXA Summon Claw"), s("HEXA Summon Shuriken"), s("HEXA Summon Spiked Bat"), s("HEXA Chain Arts: Crush")],
    [s("HEXA Summon Shotgun"), s("HEXA Summon Daggers"), s("HEXA Summon Decoy Bomb"), s("HEXA Summon Brick"), s("HEXA Chain Arts: Beatdown"), s("HEXA Veteran Shadowdealer")],
  ],
  enhancement: [s("Chain Arts: Void Strike"), s("Apocalypse Cannon"), s("Chain Arts: Maelstrom"), s("Muscle Memory Finale")],
  ascent: s("Brutal Rampage"),
};

const ANGELIC_BUSTER: HexaClassDef = {
  className: "Angelic Buster",
  group: "Nova",
  origin: s("Grand Finale"),
  mastery: [
    [s("HEXA Trinity")],
    [s("HEXA Soul Seeker"), s("HEXA Soul Seeker Expert")],
    [s("HEXA Supreme Supernova")],
    [s("HEXA Celestial Roar"), s("Encore Ribbon")],
  ],
  enhancement: [s("Sparkle Burst"), s("Superstar Spotlight"), s("Mighty Mascot"), s("Trinity Fusion")],
  ascent: s("Surprise Encore"),
};

// ── Transcendent ─────────────────────────────────────────────────────────────

const ZERO: HexaClassDef = {
  className: "Zero",
  group: "Transcendent",
  origin: s("End Time"),
  mastery: [
    [s("HEXA Giga Crash"), s("HEXA Falling Star"), s("HEXA Groundbreaker"), s("HEXA Wind Cutter"), s("HEXA Wind Striker"), s("HEXA Storm Break"), s("Time Piece")],
    [s("HEXA Spin Driver"), s("HEXA Rolling Cross"), s("HEXA Wheel Wind"), s("HEXA Rolling Assault")],
    [s("HEXA Flash Assault"), s("HEXA Blade Ring"), s("HEXA Flash Cut"), s("HEXA Throwing Weapon")],
    [s("HEXA Moon Strike"), s("HEXA Piercing Thrust"), s("HEXA Shadow Strike"), s("HEXA Rising Slash"), s("HEXA Air Raid"), s("HEXA Shadow Rain"), s("Infinite Resonance")],
  ],
  enhancement: [s("Chrono Break"), s("Twin Blades of Time"), si("Shadow Flash", "Shadow Flash (Alpha)"), si("Ego Weapon", "Ego Weapon (Alpha)")],
  ascent: s("Bitemporis"),
};

// ── Friends World ────────────────────────────────────────────────────────────

const KINESIS: HexaClassDef = {
  className: "Kinesis",
  group: "Friends World",
  origin: s("From Another Realm"),
  mastery: [
    [s("HEXA Ultimate - Metal Press")],
    [s("HEXA Psychic Grab"), s("HEXA Ultimate - Psychic Shot")],
    [s("HEXA Ultimate - Trainwreck"), s("HEXA Ultimate - B.P.M.")],
    [s("HEXA Kinetic Combo")],
  ],
  enhancement: [s("Psychic Tornado"), s("Ultimate - Mind Over Matter"), s("Ultimate - Psychic Shockwave"), s("Law of Gravity")],
  ascent: s("Fractal Horizon"),
};

// ── Flora ─────────────────────────────────────────────────────────────────────

const ADELE: HexaClassDef = {
  className: "Adele",
  group: "Flora",
  origin: s("Maestro"),
  mastery: [
    [s("HEXA Cleave"), s("HEXA Magic Dispatch"), s("HEXA Aetherial Arms")],
    [s("HEXA Hunting Decree"), s("HEXA Plummet")],
    [s("HEXA Impale"), s("HEXA Resonance Rush"), s("HEXA Noble Summons"), s("HEXA Aether Bloom")],
    [s("HEXA Aether Forge"), s("HEXA Reign of Destruction"), s("HEXA Shardbreaker")],
  ],
  enhancement: [s("Ruin"), s("Infinity Blade"), s("Legacy Restoration"), s("Storm")],
  ascent: s("Einheit"),
};

const ILLIUM: HexaClassDef = {
  className: "Illium",
  group: "Flora",
  origin: s("Mytocrystal Expanse"),
  mastery: [
    [s("HEXA Radiant Javelin"), s("HEXA Radiant Enchanted Javelin"), s("HEXA Winged Javelin"), s("HEXA Winged Enchanted Javelin")],
    [s("HEXA Reaction - Domination"), s("HEXA Reaction - Destruction"), s("HEXA Vortex Wings")],
    [s("HEXA Ex"), s("HEXA Machina"), s("HEXA Crystal Skill - Deus")],
    [s("HEXA Longinus Spear"), si("HEXA Umbral Brand III", "HEXA Umbral Brand"), s("HEXA Longinus Zone")],
  ],
  enhancement: [s("Crystal Ignition"), s("Templar Knight"), s("Crystalline Spirit"), s("Crystal Gate")],
  ascent: s("Excidium"),
};

const KHALI: HexaClassDef = {
  className: "Khali",
  group: "Flora",
  origin: s("Hex: Sandstorm"),
  mastery: [
    [s("HEXA Arts: Flurry"), s("HEXA Arts: Crescentum")],
    [s("HEXA Void Rush"), s("HEXA Void Blitz"), s("HEXA Chakram Split")],
    [s("HEXA Hex: Chakram Sweep"), s("HEXA Hex: Chakram Fury"), s("HEXA Death Blossom")],
    [s("HEXA Resonate"), s("HEXA Deceiving Blade")],
  ],
  enhancement: [s("Hex: Pandemonium"), s("Void Burst"), s("Arts: Astra"), s("Resonate: Ultimatum")],
  ascent: s("Wake the Void"),
};

const ARK: HexaClassDef = {
  className: "Ark",
  group: "Flora",
  origin: s("Primordial Abyss"),
  mastery: [
    [s("HEXA Basic Charge Drive"), s("HEXA Scarlet Charge Drive"), s("HEXA Gust Charge Drive"), s("HEXA Abyssal Charge Drive"), s("Awakened Abyss")],
    [s("HEXA Grievous Wound"), s("HEXA Insatiable Hunger"), s("HEXA Unbridled Chaos")],
    [s("HEXA Vengeful Hate"), s("HEXA Blissful Restraint"), s("HEXA Endless Agony")],
    [s("HEXA Ominous Nightmare"), s("HEXA Ominous Dream")],
  ],
  enhancement: [s("Abyssal Recall"), s("Infinity Spell"), s("Devious Nightmare"), s("Endlessly Starving Beast")],
  ascent: s("Whisper of Deepest Abyss"),
};

// ── Anima ─────────────────────────────────────────────────────────────────────

const LARA: HexaClassDef = {
  className: "Lara",
  group: "Anima",
  origin: s("Universe in Bloom"),
  mastery: [
    [s("HEXA Essence Sprinkle")],
    [s("HEXA Dragon Vein Eruption"), s("HEXA Eruption: Heaving River"), s("HEXA Eruption: Whirlwind"), s("HEXA Eruption: Sunrise Well")],
    [s("HEXA Dragon Vein Absorption"), s("HEXA Absorption: River Puddle Douse"), s("HEXA Absorption: Fierce Wind"), s("HEXA Absorption: Sunlit Grain")],
    [s("HEXA Wakeup Call")],
  ],
  enhancement: [s("Big Stretch"), s("Land's Connection"), s("Surging Essence"), s("Winding Mountain Ridge")],
  ascent: s("Cornucopia"),
};

const HOYOUNG: HexaClassDef = {
  className: "Hoyoung",
  group: "Anima",
  origin: s("Sage: Apotheosis"),
  mastery: [
    [s("HEXA Heaven: Consuming Flames"), s("HEXA Earth: Stone Tremor"), s("HEXA Humanity: Gold-Banded Cudgel")],
    [s("HEXA Heaven: Iron Fan Gale"), s("HEXA Earth: Ground-Shattering Wave"), s("HEXA Humanity: As-You-Will Fan")],
    [s("HEXA Talisman: Clone"), s("HEXA Talisman: Seeking Ghost Flame")],
    [s("HEXA Scroll: Star Vortex"), s("HEXA Scroll: Butterfly Dream")],
  ],
  enhancement: [s("Sage: Clone Rampage"), s("Scroll: Tiger of Songyu"), s("Sage: Wrath of Gods"), s("Sage: Three Paths Apparition")],
  ascent: s("Millennium Spirit"),
};

// ── Sengoku ──────────────────────────────────────────────────────────────────

const HAYATO: HexaClassDef = {
  className: "Hayato",
  group: "Sengoku",
  origin: s("Shin Quick Draw"),
  mastery: [
    [si("HEXA [Shinsoku] Mist Slash", "HEXA (Shinsoku) Mist Slash"), si("HEXA [Shinsoku] Afterimage Slash", "HEXA (Shinsoku) Afterimage Slash")],
    [si("HEXA [Shinsoku] Crescent Moon Cut", "HEXA (Shinsoku) Crescent Moon Cut"), si("HEXA [Shinsoku] Silent Arc", "HEXA (Shinsoku) Silent Arc")],
    [si("HEXA [Battou] Dark Moon Cut", "HEXA (Battou) Dark Moon Cut")],
    [si("HEXA [Battou] Full Moon's Rage", "HEXA (Battou) Full Moon's Rage")],
  ],
  enhancement: [s("Shogetsu Form"), si("[Shinsoku] Crashing Tide", "(Shinsoku) Crashing Tide"), si("[Shinsoku] Light Cutter", "(Shinsoku) Light Cutter"), si("[Battou] Wailing Heavens", "(Battou) Wailing Heavens")],
  ascent: s("Fleeting Breath"),
};

const KANNA: HexaClassDef = {
  className: "Kanna",
  group: "Sengoku",
  origin: si("[Divine Will] Advent of Crimson", "(Divine Will) Advent of Crimson"),
  mastery: [
    [s("HEXA Soul-Shatter Talisman: Dance"), s("HEXA Heart-Wreck Talisman")],
    [s("HEXA Summon Oni"), si("HEXA [Order] Spinning Strike", "HEXA (Order) Spinning Strike"), si("HEXA [Order] Pulverizing Strike", "HEXA (Order) Pulverizing Strike")],
    [s("HEXA Summon Tengu"), s("HEXA Shade-Fletched Arrow")],
    [s("HEXA Summon Orochi"), si("HEXA [Order] Execute", "HEXA (Order) Execute")],
  ],
  enhancement: [si("[Spirit] Hakumenkonmou Juubi", "(Spirit) Hakumenkonmou Juubi"), si("[Spirit] Unleash the Radiant Flame", "(Spirit) Unleash the Radiant Flame"), si("[Spirit] Unleash Black-Winged Destruction", "(Spirit) Unleash Black-Winged Destruction"), si("[Spirit] Unleash Soul-Searing Venom", "(Spirit) Unleash Soul-Searing Venom")],
  ascent: si("[Divine Will] Final Rest", "(Divine Will) Final Rest"),
};

// ── Other ─────────────────────────────────────────────────────────────────────

const LYNN: HexaClassDef = {
  className: "Lynn",
  group: "Other",
  origin: s("Source Flow"),
  mastery: [
    [s("HEXA Strike")],
    [s("HEXA Sneak Attack"), s("HEXA Raid")],
    [s("HEXA Peck")],
    [si("HEXA [Focus] Heal", "HEXA (Focus) Heal"), si("HEXA [Focus] Forest Protection", "HEXA (Focus) Forest Protection"), s("HEXA Mother Nature's Touch")],
  ],
  enhancement: [s("Beast's Rage"), s("Beak Strike"), si("[Focus] Awaken", "(Focus) Awaken"), s("Nature's Grace")],
  ascent: s("Wild Hunt"),
};

const MO_XUAN: HexaClassDef = {
  className: "Mo Xuan",
  group: "Other",
  origin: s("Soul Art: Jianghu Dragon"),
  mastery: [
    [si("HEXA Xuanshan Arts [Tian]", "HEXA Xuanshan Arts (Tian)"), si("HEXA Xuanshan Arts [Di]", "HEXA Xuanshan Arts (Di)")],
    [s("HEXA Divine Art: Howling Storm"), s("HEXA Divine Art: Righteous Thunder"), s("HEXA Divine Art: Erupting Flame")],
    [s("HEXA Divine Art: Swirling Tide"), s("HEXA Soul Art: Black Wind"), s("HEXA Divine Art: Tearing Wind")],
    [s("HEXA Secret Art: Qi Projection")],
  ],
  enhancement: [s("Soul Art: Beneath Heaven"), s("Divine Art: Crashing Earth"), s("Soul Art: The Conquered Self"), s("Soul Art: The Opened Gate")],
  ascent: s("Soul Art: Where Destiny Falls"),
};

const REN: HexaClassDef = {
  className: "Ren",
  group: "Other",
  origin: s("Rising Azure Dragon: Divided Heavens"),
  mastery: [
    [s("HEXA Plum Blossom Sword: Storm")],
    [s("HEXA Imugi Spirit Sword: Spirit Strike"), s("HEXA Second Imugi Spirit Sword: Serpent's Fang")],
    [s("HEXA Wish Unending"), s("HEXA Final Imugi Spirit Sword: Burrowing Earth"), s("HEXA Final Imugi Spirit Sword: Ravenous Spirit"), s("HEXA Final Imugi Spirit Sword: Years Uncounted")],
    [s("HEXA Second Plum Blossom Sword: Raining Blossoms"), s("HEXA Third Plum Blossom Sword: Riotous Heart"), s("HEXA Third Plum Blossom Sword: Hearts United")],
  ],
  enhancement: [s("Final Plum Blossom Sword: Thousand Blossom Flurry"), s("Soul Immeasurable"), s("Final Plum Blossom Sword: Dancing Annihilation"), s("Final Imugi Spirit Sword: Blade of the Unbound Heart")],
  ascent: s("Rising Azure Dragon: Heartbound Verse"),
};

const SIA: HexaClassDef = {
  className: "Sia",
  group: "Other",
  origin: s("Celestial Design"),
  mastery: [
    [s("SHINE Ray"), s("SHINE Stellar I - Antares")],
    [s("SHINE Boom"), s("SHINE Stellar II - Algol"), s("SHINE Stellar V - Fomalhaut")],
  ],
  enhancement: [s("Shine"), s("Stellar XI - Sirius"), s("Stellar XII - Sadalsuud"), s("Savior's Circle")],
  ascent: s("Starlit Cosmos"),
};

// ── Common Skills ────────────────────────────────────────────────────────────

export const COMMON_SKILLS: HexaSkillDef[] = [
  s("Sol Janus"),
];

// ── Exported class list ──────────────────────────────────────────────────────

export const HEXA_CLASSES: HexaClassDef[] = [
  // Explorers
  HERO, PALADIN, DARK_KNIGHT,
  ARCH_MAGE_FP, ARCH_MAGE_IL, BISHOP,
  BOWMASTER, MARKSMAN, PATHFINDER,
  NIGHT_LORD, SHADOWER, DUAL_BLADE,
  BUCCANEER, CORSAIR, CANNONEER,
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
  LARA, HOYOUNG,
  // Sengoku
  HAYATO, KANNA,
  // Other
  LYNN, MO_XUAN, REN, SIA,
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
  sia: "Sia",
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
