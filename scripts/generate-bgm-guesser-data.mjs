/*
  Generates the obfuscated daily-puzzle payload + answer pool for the BGM Guesser game.

  Usage: node scripts/generate-bgm-guesser-data.mjs

  Sources:
  - manifests/v270/bgm.json — which tracks haku.network actually serves, keyed
    "{group}/{trackName}" (track names are NOT unique across groups), plus each
    track's lengthMs.
  - https://github.com/maplestory-music/maplebgm-db (fetched at generation time)
    — the community BGM database, one JSON per group under `bgm/`. Supplies each
    track's real title and the map/boss description used to build ANSWERS below.
  - manifests/v270/ui-mark.json — world-map "mark" icon ids, used as each
    answer's reveal icon (markIconUrl).

  ANSWERS is a hand-curated map of track -> answer, built by reading every
  maplebgm-db description. It is an allowlist: anything not listed is excluded.
  Curation rules (see the feature CLAUDE.md for the rationale):
  - Only tracks tied to a concrete GMS place or boss fight. Storyline, cutscene,
    credits, tutorial, jukebox and "unused" tracks are out — they aren't a map.
  - No event/anniversary/collab content, no class-burst or 6th-job skill themes,
    no minigame hubs (Star Planet, Monster Life, PvP), no UI/login themes.
  - No region-exclusive content GMS never shipped (CMS/TMS/JMS-only areas), and
    no Mirror World remixes (they're re-scores of a town theme already in the pool).
  - One track per distinct piece of music: near-identical variants (`...B`,
    `_Loop`, `_MR`, `_reprise`, `Short`, `Extended`) are simply not listed.

  Output: src/features/games/bgm-guesser/puzzle-data.generated.ts containing
  base64(XOR(json)) of [group, track, title, answer] tuples in daily order (so
  answers aren't readable from the bundle), plus the plain BGM_GUESSER_ANSWERS
  pool the guess picker needs anyway.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_VERSION = "v270";
const PUZZLE_COUNT = 365;
// Bumped once before launch to reshuffle the daily order after play-testing the
// original sequence. Frozen from here on: changing it re-deals every day.
const SEED = 0x676767;
const XOR_KEY = "mapledoro-bgm-guesser";
const DB_BASE = "https://raw.githubusercontent.com/maplestory-music/maplebgm-db/master/bgm";

// ── Answer pool: name -> { kind, mark } ─────────────────────────────────────
// `mark` is a ui-mark.json id, shown as the answer's icon on reveal.

const AREAS = {
  "Maple Island": "MushroomVillage",
  "Henesys": "Henesys",
  "Perion": "Perion",
  "Ellinia": "Ellinia",
  "Kerning City": "KerningCity",
  "Lith Harbor": "Rith",
  "Sleepywood": "Dungeon",
  "Nautilus": "Nautilus",
  "Florina Beach": "Nautilus",
  "Mushroom Castle": "flowervioleta",
  "Ellinel Fairy Academy": "fairyAcademy",
  "Ellin Forest": "EilnForest",
  "Nett's Pyramid": "Pyramid",
  "Ardentmill": "profession",
  "Omega Sector": "OmegaSector",
  "New Leaf City": "NLC",
  "Crimsonwood Keep": "Crimsonwood",
  "Orbis": "Orbis",
  "El Nath": "ElNath",
  "Lion King's Castle": "LionCastle",
  "Ludibrium": "Ludibrium",
  "Aqua Road": "AquaRoad",
  "Leafre": "Leafre",
  "Mu Lung": "Murueng",
  "Mu Lung Dojo": "MuruengRaid",
  "Herb Town": "WhiteHerb",
  "Ariant": "Ariant",
  "Magatia": "Magatia",
  "Temple of Time": "TimeTemple",
  "Ereve": "Ereb",
  "Rien": "Rien",
  "Edelstein": "Edelstein",
  "Verne Mine": "Leben",
  "Elluel": "Eurel",
  "Twilight Perion": "destructionPerion",
  "Henesys Ruins": "destructionTown",
  "Riena Strait": "glacierExplorer",
  "Monster Park": "Carnival",
  "Stone Colossus": "Colossus",
  "Kritias": "critias",
  "Tower of Oz": "aquarisTower",
  "Heliseum": "helisium",
  "Pantheon": "Pantheon",
  "Root Abyss": "rootabyss",
  "Yum Yum Island": "YumYum",
  "Reverse City": "Reverse_City",
  "Chu Chu Island": "ChewChew",
  "Lachelein": "Lacheln",
  "Arcana": "Arcana",
  "Morass": "Morass",
  "Esfera": "esfera",
  "Moonbridge": "moonBridge",
  "Labyrinth of Suffering": "TheLabyrinthOfSuffering",
  "Limina": "Limen",
  "Cernium": "Cernium",
  "Hotel Arcus": "Arcs",
  "Odium": "odium",
  "Shangri-La": "dowonkyung",
  "Arteria": "arteria",
  "Carcion": "carcion",
  "Tallahart": "tallahart",
  "Vallora": "Vallora",
  "Geardock": "Geardrak",
  "Savage Terminal": "SavageTerminal",
  "Partem": "Partem",
  "Elodin": "Elodin",
  "Verdel": "verdel",
  "Fox Valley": "foxValley",
  "Ristonia": "Ristonia",
  "Erimos": "Erimos",
  "Toolen City": "ToolenCity",
  "Sellas": "Sellas",
  "Karote": "karotte",
  "Narin": "Narin",
  "Cheongun": "CheongUn",
  "Road of Vanishing": "Road of Vanishing",
  "Lumiere": "CristalGarden",
  "Grand Athenaeum": "Library",
  "Commerci": "CommerzBT",
  "Mushroom Shrine": "jipangu",
  "Ninja Castle": "jipangu",
  "Showa Town": "JP_shouwa",
  "Neo Tokyo": "TokyoK",
  "Korean Folk Town": "Folkvillige",
  "Amoria": "Wedding",
  "Kerning Tower": "KerningTower",
  "Gold Beach": "Goldrich",
  "Monad": "PL_Abrup",
  "Eluna": "PL_Eluna",
  "Afterlands": "PL_AfterLand",
  "Eternal Forest": "ForestofEternity",
  "Xuanshan": "Hajin",
  "Angler Company": "anglerCompany",
  "High Mountain": "HighMountain",
  "Nightmare Wonderland": "nightmareParadise",
  "Black Heaven": "BlockBuster",
  "Sharenian": "Guild",
  "Ghost Park": "GhostPark",
  "FriendStory": "spinOff1",
  "Guild Castle": "GuildCastle",
};

const BOSSES = {
  "Zakum": "Zakum",
  "Horntail": "Hontale",
  "Pianus": "Pianus",
  "Von Leon": "VanLeon",
  "Cygnus": "Signus",
  "Hilla": "Hilla",
  "Pink Bean": "PinkBean",
  "Magnus": "Magnus",
  "Gollux": "GiantVellud",
  "Pierre": "Piere",
  "Von Bon": "BanBan",
  "Crimson Queen": "BloodyQueen",
  "Vellum": "Bellum",
  "Ursus": "Urus",
  "Lotus": "BlockBuster",
  "Damien": "HofM",
  "Lucid": "Lacheln",
  "Will": "esfera",
  "Gloom": "moonBridge",
  "Verus Hilla": "TheLabyrinthOfSuffering",
  "Darknell": "Limen",
  "Black Mage": "Limen",
  "Seren": "Cernium",
  "Kalos": "karotte",
  "Kaling": "dowonkyung",
  "Limbo": "limbo",
  "Baldrix": "baldrix",
  "First Adversary": "firstAdversary",
  "Jupiter": "Luppiter",
  "Kai": "Chrono",
  "Radiant Malefic Star": "YmirIllusion",
};

// ── Curated track -> answer allowlist ───────────────────────────────────────

const ANSWERS = {
  // Maple Island
  "Bgm34/MapleLeaf": "Maple Island",
  "Bgm58/The Beginnig of The Adventure": "Maple Island",
  "BgmJp/FirstStepMaster": "Maple Island",
  // Victoria Island
  "Bgm00/FloralLife": "Henesys",
  "Bgm00/RestNPeace": "Henesys",
  "Bgm01/CavaBien": "Henesys",
  "Bgm00/Nightmare": "Perion",
  "Bgm01/HighlandStar": "Perion",
  "Bgm12/RuinCastle": "Perion",
  "Bgm01/MoonlightShadow": "Ellinia",
  "Bgm02/MissingYou": "Ellinia",
  "Bgm02/WhenTheMorningComes": "Ellinia",
  "Bgm01/BadGuys": "Kerning City",
  "Bgm02/JungleBook": "Kerning City",
  "Bgm03/Subway": "Kerning City",
  "Bgm17/secretFlower": "Kerning City",
  "Bgm02/AboveTheTreetops": "Lith Harbor",
  "Bgm00/SleepyWood": "Sleepywood",
  "Bgm01/AncientMove": "Sleepywood",
  "Bgm02/EvilEyes": "Sleepywood",
  "Bgm15/Nautilus": "Nautilus",
  "Bgm15/inNautilus": "Nautilus",
  "Bgm03/Beachway": "Florina Beach",
  "Bgm38/MushroomCastle": "Mushroom Castle",
  "Bgm38/VikingShip": "Mushroom Castle",
  "Bgm38/VikingSkipper": "Mushroom Castle",
  "Bgm38/WarMushCastle": "Mushroom Castle",
  "Bgm34/TheFairyAcademy": "Ellinel Fairy Academy",
  "Bgm34/TheFairyForest": "Ellinel Fairy Academy",
  "Bgm15/ElinForest": "Ellin Forest",
  "Bgm15/ElinCave": "Ellin Forest",
  "Bgm15/PoisonForest": "Ellin Forest",
  "Bgm20/NetsPiramid": "Nett's Pyramid",
  "Bgm25/profession": "Ardentmill",
  // Masteria
  "Bgm08/LetsMarch": "Omega Sector",
  "Bgm08/FindingForest": "Omega Sector",
  "Bgm08/ForTheGlory": "Omega Sector",
  "Bgm08/LetsHuntAliens": "Omega Sector",
  "Bgm47/DancesWithAliens": "Omega Sector",
  "BgmGL/NLCtown": "New Leaf City",
  "BgmGL/NLChunt": "New Leaf City",
  "BgmGL/NLCupbeat": "New Leaf City",
  "BgmGL/CrimsonwoodKeep": "Crimsonwood Keep",
  "BgmGL/CrimsonwoodKeepInterior": "Crimsonwood Keep",
  "BgmGL/Courtyard": "Crimsonwood Keep",
  // Ossyria
  "Bgm04/Shinin'Harbor": "Orbis",
  "Bgm04/UponTheSky": "Orbis",
  "Bgm06/ComeWithMe": "Orbis",
  // Orbis PQ runs inside the Tower of Goddess, so it answers as Orbis.
  "Bgm13/TowerOfGoddess": "Orbis",
  "Bgm08/PlotOfPixie": "Orbis",
  "Bgm03/SnowyVillage": "El Nath",
  "Bgm04/WarmRegard": "El Nath",
  "Bgm05/WolfWood": "El Nath",
  "Bgm05/AbandonedMine": "El Nath",
  "Bgm05/HellGate": "El Nath",
  "Bgm23/BlizzardCastle": "Lion King's Castle",
  "Bgm23/CrimsonTower": "Lion King's Castle",
  "Bgm06/FantasticThinking": "Ludibrium",
  "Bgm06/FlyingInABlueDream": "Ludibrium",
  "Bgm07/WaltzForWork": "Ludibrium",
  "Bgm07/WhereverYouAre": "Ludibrium",
  "Bgm07/FunnyTimeMaker": "Ludibrium",
  "Bgm07/HighEnough": "Ludibrium",
  "Bgm09/FairyTale": "Ludibrium",
  "Bgm10/BizarreTales": "Ludibrium",
  "Bgm10/TheWayGrotesque": "Ludibrium",
  "Bgm10/Timeless": "Ludibrium",
  // Ludibrium PQ lives in the Ludibrium clocktower, so it answers as Ludibrium.
  "Bgm07/Fantasia": "Ludibrium",
  "Bgm09/DarkShadow": "Ludibrium",
  "Bgm09/TheyMenacingYou": "Ludibrium",
  "Bgm11/Aquarium": "Aqua Road",
  "Bgm11/BlueWorld": "Aqua Road",
  "Bgm11/ShiningSea": "Aqua Road",
  "Bgm12/DeepSee": "Aqua Road",
  "Bgm30/inAllVerity": "Aqua Road",
  "Bgm13/Leafre": "Leafre",
  "Bgm13/AcientForest": "Leafre",
  "Bgm13/Minar'sDream": "Leafre",
  "Bgm14/CaveOfHontale": "Leafre",
  "Bgm14/DragonLoad": "Leafre",
  "Bgm14/DragonNest": "Leafre",
  "Bgm15/MureungHill": "Mu Lung",
  "Bgm15/MureungForest": "Mu Lung",
  "Bgm17/MureungSchool1": "Mu Lung Dojo",
  "Bgm17/MureungSchool2": "Mu Lung Dojo",
  "Bgm17/MureungSchool3": "Mu Lung Dojo",
  "Bgm17/MureungSchool4": "Mu Lung Dojo",
  "Bgm15/WhiteHerb": "Herb Town",
  "Bgm15/Pirate": "Herb Town",
  "Bgm14/Ariant": "Ariant",
  "Bgm14/HotDesert": "Ariant",
  "Bgm13/FightSand": "Ariant",
  "Bgm12/Dispute": "Magatia",
  "Bgm16/TimeTemple": "Temple of Time",
  "Bgm16/Forgetfulness": "Temple of Time",
  "Bgm16/Remembrance": "Temple of Time",
  "Bgm16/Repentance": "Temple of Time",
  "Bgm34/GlacierAdventure": "Riena Strait",
  "Bgm34/Sailing": "Riena Strait",
  // Zipangu (GMS: Mushroom Shrine / Ninja Castle / Showa Town)
  "BgmJp/Feeling": "Mushroom Shrine",
  "BgmJp/BizarreForest": "Mushroom Shrine",
  "BgmJp/CastleInside": "Ninja Castle",
  "BgmJp/CastleOutSide": "Ninja Castle",
  "BgmJp/CastleTrap": "Ninja Castle",
  "BgmJp/Yume": "Showa Town",
  "BgmJp/Bathroom": "Showa Town",
  "BgmJp/BattleField": "Showa Town",
  "BgmJp2/Akiabara": "Neo Tokyo",
  "BgmJp2/Odaiba": "Neo Tokyo",
  "BgmJp2/Office": "Neo Tokyo",
  "BgmJp2/Park": "Neo Tokyo",
  "BgmJp2/Tokyosky": "Neo Tokyo",
  "BgmJp2/Kamuna": "Neo Tokyo",
  // Knights of Cygnus / Heroes
  "Bgm18/QueensGarden": "Ereve",
  "Bgm18/DrillHall": "Ereve",
  "Bgm18/RaindropFlower": "Ereve",
  "Bgm58/Noblesse nostalgia": "Ereve",
  "Bgm19/RienVillage": "Rien",
  "Bgm19/BambooGym": "Rien",
  "Bgm19/SnowDrop": "Rien",
  "Bgm19/CrystalCave": "Rien",
  "Bgm25/WindAndFlower": "Elluel",
  // Resistance
  "Bgm22/EdelsteinCity": "Edelstein",
  "Bgm22/NationalPark": "Edelstein",
  "Bgm22/UndergroundPlace": "Edelstein",
  "Bgm22/LowGradeOre": "Edelstein",
  "Bgm22/GelimerLab": "Verne Mine",
  "Bgm22/PowerStation": "Verne Mine",
  // Gate to the Future
  "Bgm25/destructionPerion": "Twilight Perion",
  "Bgm25/destructionPerionShelter": "Twilight Perion",
  "Bgm25/destructionTown": "Henesys Ruins",
  "Bgm32/TheRaiders": "Stone Colossus",
  "Bgm32/TheLivingMountain": "Stone Colossus",
  "Bgm32/TheColossalHeart": "Stone Colossus",
  "Bgm35/InRuinInVain": "Kritias",
  "Bgm35/StopInEnds": "Kritias",
  "Bgm35/StopInHundreds": "Kritias",
  "Bgm35/TragicForest": "Kritias",
  "Bgm35/TragicRestart": "Kritias",
  // Grandis
  "Bgm27/Pantheon": "Pantheon",
  "Bgm27/PantheonField": "Pantheon",
  "Bgm27/GreatTemple": "Pantheon",
  "Bgm27/NovaSanctum": "Pantheon",
  "Bgm27/BorderArea": "Pantheon",
  "Bgm27/BaseOfBetrayers": "Pantheon",
  "Bgm27/AngelsRoom": "Pantheon",
  "Bgm28/funkyBlackmarket": "Heliseum",
  "Bgm28/helisiumMysticforest": "Heliseum",
  "Bgm28/helisiumWarcry": "Heliseum",
  "Bgm28/citadelofTyrant": "Heliseum",
  "Bgm28/retake": "Heliseum",
  "BgmBT/commerzCanal": "Commerci",
  "BgmBT/commerzBeach": "Commerci",
  "BgmBT/commercIng": "Commerci",
  // Arcane River
  "Bgm29/YggdrasilPrayer": "Root Abyss",
  "Bgm54/FungusForest": "Yum Yum Island",
  "Bgm54/IlliyardMoor": "Yum Yum Island",
  "Bgm54/MushbudForest": "Yum Yum Island",
  "Bgm54/ReverseCity": "Reverse City",
  "Bgm54/ReverseCity2": "Reverse City",
  "Bgm46/ChewChew MainTheme": "Chu Chu Island",
  "Bgm46/ChewChew WildWorld": "Chu Chu Island",
  "Bgm46/LachelntheIllusionCity": "Lachelein",
  "Bgm46/ClockTowerofNightmare": "Lachelein",
  "Bgm47/TheTuneOfAzureLight": "Arcana",
  "Bgm47/ArcanaBoss": "Arcana",
  "Bgm48/SwampOfMemoryMoras": "Morass",
  "Bgm48/BlackDungeon": "Morass",
  "Bgm48/MemoryOfKritias": "Morass",
  "Bgm49/ConteminatedSea": "Esfera",
  "Bgm49/SoupOfLife": "Esfera",
  "Bgm49/TempleInTheMirror": "Esfera",
  "Bgm46/Lake Of Oblivion": "Road of Vanishing",
  "Bgm46/Cave Of Rest": "Road of Vanishing",
  "Bgm46/Volcanic Zone Of Extinction": "Road of Vanishing",
  // Tenebris
  "Bgm49/WarCloud": "Moonbridge",
  "Bgm49/StrangeFog": "Moonbridge",
  "Bgm49/WaveofEmptiness": "Moonbridge",
  "Bgm49/SecretLabyrinth": "Labyrinth of Suffering",
  "Bgm49/EternalSwamp": "Labyrinth of Suffering",
  "Bgm49/HeartofSuffering": "Labyrinth of Suffering",
  "Bgm50/TearsOfTheWorld": "Limina",
  "Bgm50/BlackFury": "Limina",
  // Grandis (post-Black Mage)
  "Bgm52/Borderless": "Cernium",
  "Bgm53/Apostles": "Cernium",
  "Bgm53/BurningCity": "Cernium",
  "Bgm53/GraveyardOfSword": "Cernium",
  "Bgm53/HolyWar": "Cernium",
  "Bgm53/OverlordOfLife": "Cernium",
  "Bgm53/RedMoon": "Cernium",
  "Bgm53/SanctuaryOfMitra": "Cernium",
  "Bgm53/TheHolyLand": "Cernium",
  "Bgm53/BattleOfCernium": "Cernium",
  "Bgm57/Welcome to Hotel Arcs": "Hotel Arcus",
  "Bgm57/Lonesome Cinema": "Hotel Arcus",
  "Bgm57/Train heading nowhere": "Hotel Arcus",
  "Bgm57/Wayout of the wilderness": "Hotel Arcus",
  "Bgm58/Alley on the Other Side": "Odium",
  "Bgm58/Irreversible Abomination": "Odium",
  "Bgm58/Sunshine blurring the Unknown": "Odium",
  "Bgm58/The Lost City among the Clouds": "Odium",
  "Bgm59/The land of peach blossoms": "Shangri-La",
  "Bgm59/The other side of ShangriLa": "Shangri-La",
  "Bgm59/Painful and lingering death": "Arteria",
  "Bgm59/Shadowy passage": "Arteria",
  "Bgm59/Fierce fortress": "Arteria",
  "Bgm60/An approaching abyss": "Carcion",
  "Bgm60/An occupied coast": "Carcion",
  "Bgm60/The eyes of the ishfira": "Carcion",
  "Bgm60/The great tropics": "Carcion",
  "Bgm60/An invitation to the night": "Tallahart",
  "Bgm60/Reborn gods": "Tallahart",
  "Bgm60/The fate of an immortal": "Tallahart",
  "Bgm61/Port city of Balora": "Vallora",
  "Bgm61/If you follow the mountain path": "Vallora",
  "Bgm61/Serpent's Lake": "Vallora",
  "Bgm61/Wind flowing in the harbor": "Vallora",
  "Bgm62/The furnace that swallowed the gods": "Geardock",
  "Bgm62/Secrets Hidden Under the Sand": "Geardock",
  "Bgm62/The gaze of abandoned robots": "Geardock",
  "Bgm62/The Ghosts of the Sleepless Gods": "Geardock",
  // Class home regions that are ordinary explorable areas
  "Bgm47/SavageTerminal": "Savage Terminal",
  "Bgm47/HuntingGround": "Savage Terminal",
  "Bgm47/MrHazard": "Savage Terminal",
  "Bgm51/LosGurugers": "Savage Terminal",
  "Bgm51/TheVillageOfKarupa": "Partem",
  "Bgm51/ThePartemRuins": "Partem",
  "Bgm51/SecretElodin": "Elodin",
  "Bgm51/LuensHouse": "Elodin",
  "Bgm48/VerdelTown": "Verdel",
  "Bgm48/VerdelField": "Verdel",
  "Bgm48/VerdelDungeon": "Verdel",
  "Bgm48/OverTheClouds": "Fox Valley",
  "Bgm53/RomanticSunset": "Ristonia",
  "Bgm53/MaskedHeart": "Ristonia",
  "Bgm53/TheWallsofTragedy": "Ristonia",
  "Bgm53/WhereTheSecretLies": "Ristonia",
  "Bgm53/CheongUn": "Cheongun",
  "Bgm53/RidingOnTheClouds": "Cheongun",
  "Bgm53/CreepyTemple": "Cheongun",
  "Bgm57/WonderfulMomentsInNarin": "Narin",
  "Bgm57/BetweenAlley": "Narin",
  "Bgm57/OnedayAtTheAtelier": "Narin",
  "Bgm57/Once upon a time in Karotte": "Karote",
  "Bgm57/PreparationForBreakthrough": "Karote",
  "Bgm59/Oasis in the Desert": "Erimos",
  "Bgm59/Outskirts of Erimos": "Erimos",
  "Bgm59/Lord's Castle": "Erimos",
  "Bgm56/ToolenCity": "Toolen City",
  "Bgm56/TheDispossessed": "Toolen City",
  "Bgm55/SinkingThings": "Sellas",
  "Bgm55/WhaleBelly": "Sellas",
  "Bgm55/WhereStarsRest": "Sellas",
  "Bgm19/FlytotheMoon": "Lumiere",
  "Bgm19/DancingWitnTheMoon": "Lumiere",
  "Bgm34/DimensionLibrary": "Grand Athenaeum",
  "Bgm24/monsterPark": "Monster Park",
  "Bgm23/MPBonusMap": "Monster Park",
  "Bgm58/Warning! Unknown Area": "Monster Park",
  "Bgm37/VentureIntoTheUnkown": "Tower of Oz",
  "Bgm37/HazardFromCave": "Tower of Oz",
  "Bgm37/JungleInTheSea": "Tower of Oz",
  "Bgm37/TheBottomOfTheSea": "Tower of Oz",
  "Bgm11/DownTown": "Korean Folk Town",
  "Bgm11/DarkMountain": "Korean Folk Town",
  "Bgm43/This too shall pass away": "Korean Folk Town",
  "BgmGL/amoria": "Amoria",
  "BgmGL/cathedral": "Amoria",
  "BgmGL/chapel": "Amoria",
  "BgmGL/Amorianchallenge": "Amoria",
  "Bgm21/LoversIntheAfternoon": "Kerning Tower",
  "Bgm17/GoldBeach": "Gold Beach",
  "Bgm10/Eregos": "Sharenian",
  "Bgm12/WaterWay": "Sharenian",
  "Bgm43/Welcome To The Creepy Ghost Park": "Ghost Park",
  "Bgm43/Dancing With Ghosts": "Ghost Park",
  "Bgm38/SchoolLife": "FriendStory",
  "Bgm38/UrbanStreet": "FriendStory",
  "Bgm38/HollowAttack": "FriendStory",
  "BgmWz2/GuildCastle_Lobby": "Guild Castle",
  "BgmWz2/GuildCastle_Room": "Guild Castle",
  "BgmWz2/GuildCastle_Teatime": "Guild Castle",
  "BgmWz2/GuildCastle_FollowTheLightLeaks": "Guild Castle",
  "Bgm40/BlackHeavenTheme": "Black Heaven",
  "Bgm40/BlackHeavenTheme_parade": "Black Heaven",
  "Bgm40/BattleOnTheDeck": "Black Heaven",
  "Bgm40/HeroComes": "Black Heaven",
  "Bgm40/RabbitsDream": "Black Heaven",
  "Bgm40/TheDollMaster": "Black Heaven",
  "Bgm41/BigMachine": "Black Heaven",
  "BgmPL2/Abrup": "Monad",
  "BgmPL2/Turbulence": "Monad",
  "BgmPL2/FallenThings": "Monad",
  "BgmPL2/Labor": "Monad",
  "BgmPL2/SleepingForest": "Monad",
  "BgmPL2/WalkTogether": "Monad",
  "BgmPL2/Attack": "Monad",
  "BgmPL2/Julietta": "Monad",
  "BgmPL/Eluna": "Eluna",
  "BgmPL/ElunaExpress": "Eluna",
  "BgmPL/SongOfTheNati": "Eluna",
  "BgmPL/UnexploredEluna": "Eluna",
  "BgmPL/WeAreThePioneers": "Eluna",
  "BgmPL/SpiritualWeight": "Eluna",
  "BgmPL/LandofContemplation_Day": "Afterlands",
  "BgmPL/LandofInnocence_Day": "Afterlands",
  "BgmPL/LandofRiches_Day": "Afterlands",
  "BgmPL/LandofWarriors_Day": "Afterlands",
  "BgmLYNN/IntoTheWoods": "Eternal Forest",
  "BgmLYNN/WhispersOfTheTrees": "Eternal Forest",
  "BgmLYNN/MyLittleCottage": "Eternal Forest",
  "BgmLYNN/OurStoryGoesOn": "Eternal Forest",
  "BgmLYNN/SomewhereBeyondTheCliff": "Eternal Forest",
  "BgmMH/Hyunsan": "Xuanshan",
  "BgmMH/Hyunsanpa": "Xuanshan",
  "BgmED/Infiltration": "Angler Company",
  "BgmED/Into the Deep": "Angler Company",
  "BgmED/What Flowed In": "Angler Company",
  "BgmED/Predator of the Deep Sea": "Angler Company",
  "BgmED/highMountain_n": "High Mountain",
  "BgmED/highMountain_b": "High Mountain",
  "Bgm61/Ashes of spring": "Nightmare Wonderland",
  "Bgm61/Feast of evil spirits": "Nightmare Wonderland",
  "Bgm61/The downfall": "Nightmare Wonderland",

  // ── Bosses ────────────────────────────────────────────────────────────────
  "Bgm06/FinalFight": "Zakum",
  "Bgm14/HonTale": "Horntail",
  "Bgm12/AquaCave": "Pianus",
  "Bgm23/LionHeart": "Von Leon",
  "Bgm25/CygnusGarden": "Cygnus",
  "Bgm16/RedWitch": "Hilla",
  "Bgm16/FightingPinkBeen": "Pink Bean",
  "Bgm28/thefinalWar": "Magnus",
  "BgmBT/velludBossBattle": "Gollux",
  "Bgm29/JoyfulTeaParty": "Pierre",
  "Bgm29/TimeChaos": "Von Bon",
  "Bgm29/QueenPalace": "Crimson Queen",
  "Bgm29/AbyssCave": "Vellum",
  "Bgm44/TheKingOfDestruction": "Ursus",
  "Bgm44/TheSilentWar": "Ursus",
  "Bgm44/WildFury": "Ursus",
  "Bgm44/Desperately": "Ursus",
  "Bgm41/Gravity Core": "Lotus",
  "Bgm41/Gravity Lord": "Lotus",
  "Bgm41/Gravity Lord Rise": "Lotus",
  "Bgm45/Demian": "Damien",
  "Bgm45/Demian True": "Damien",
  "Bgm46/WierldForestIntheGirlsdream": "Lucid",
  "Bgm46/BrokenDream": "Lucid",
  "Bgm49/Diffraction": "Will",
  "Bgm49/MirrorCage": "Will",
  "Bgm49/BloodCage": "Will",
  "Bgm49/FerociousBattlefield": "Gloom",
  "Bgm49/DuskHallucination": "Gloom",
  "Bgm49/DepthOfPain": "Verus Hilla",
  "Bgm50/SubterminalPoint": "Darknell",
  "Bgm50/TempleOfDarkness": "Black Mage",
  "Bgm50/ThroneOfDarkness": "Black Mage",
  "Bgm50/WorldHorizon": "Black Mage",
  "Bgm50/LostSpace": "Black Mage",
  "Bgm53/AwakeningOfOldGod": "Seren",
  "Bgm57/OccupiedFortress": "Kalos",
  "Bgm57/DestroyedFourSeasons": "Kaling",
  "Bgm57/FadedWinter": "Kaling",
  "Bgm57/RuinationOfFourSeasons": "Kaling",
  "Bgm60/Reproduced Abyss C": "Limbo",
  "Bgm60/Reproduced Abyss D": "Limbo",
  "Bgm60/Passageway in the abyss": "Limbo",
  "Bgm60/Showdown in the Inverted Realm": "Baldrix",
  "Bgm60/Turbulent Realm": "Baldrix",
  "Bgm60/After Ragnarok": "Baldrix",
  "Bgm61/Gate of Proof": "First Adversary",
  "Bgm61/Courage Unbreakable": "First Adversary",
  "Bgm61/Wisdom Beyond Aspirations": "First Adversary",
  "Bgm61/Voice of Verdict": "First Adversary",
  "Bgm61/Succession Bloom": "First Adversary",
  "Bgm62/The crossroads of control and disobedience": "Jupiter",
  "Bgm62/The Arena of Rules and Rupture": "Jupiter",
  "Bgm62/A desolate and lonely furnace": "Jupiter",
  "Bgm61/Silent Protocol": "Kai",
  "Bgm61/Neo Vandalism": "Kai",
  "Bgm61/Voltage Overdrive": "Kai",
  "Bgm61/City of Eternal Night": "Kai",
  "Bgm61/Irresistible Calling": "Radiant Malefic Star",
  "Bgm61/Pristine, Tender Illusion": "Radiant Malefic Star",
  "Bgm61/Unveiled Deformity": "Radiant Malefic Star",
  "Bgm61/Rest of the Broken Truth": "Radiant Malefic Star",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Load sources ────────────────────────────────────────────────────────────

const bgmManifest = JSON.parse(
  readFileSync(join(ROOT, `manifests/${MANIFEST_VERSION}/bgm.json`), "utf8"),
).entries;
const markManifest = JSON.parse(
  readFileSync(join(ROOT, `manifests/${MANIFEST_VERSION}/ui-mark.json`), "utf8"),
).entries;

/** maplebgm-db titles, keyed "{group}/{filename}", for the groups we actually use. */
async function fetchTitles(groups) {
  const titles = new Map();
  await Promise.all(
    [...groups].map(async (group) => {
      const res = await fetch(`${DB_BASE}/${group}.json`);
      if (!res.ok) throw new Error(`maplebgm-db fetch failed for ${group}: ${res.status}`);
      for (const entry of await res.json()) {
        titles.set(`${group}/${entry.filename}`, entry.metadata?.title ?? entry.filename);
      }
    }),
  );
  return titles;
}

// ── Validate the curation against both manifests ────────────────────────────

const answerPool = { ...AREAS, ...BOSSES };
const problems = [];

for (const [name, mark] of Object.entries(answerPool)) {
  if (!markManifest[mark]) problems.push(`answer "${name}" uses unknown ui-mark id "${mark}"`);
}
if (Object.keys(AREAS).length + Object.keys(BOSSES).length !== Object.keys(answerPool).length) {
  problems.push("an answer name appears in both AREAS and BOSSES");
}

const pools = new Map(Object.keys(answerPool).map((name) => [name, []]));
const usedGroups = new Set();
for (const [key, answer] of Object.entries(ANSWERS)) {
  if (!bgmManifest[key]) {
    problems.push(`track "${key}" is not in manifests/${MANIFEST_VERSION}/bgm.json`);
    continue;
  }
  if (!pools.has(answer)) {
    problems.push(`track "${key}" maps to unknown answer "${answer}"`);
    continue;
  }
  const [group, track] = [key.slice(0, key.indexOf("/")), key.slice(key.indexOf("/") + 1)];
  usedGroups.add(group);
  pools.get(answer).push({ group, track, answer });
}
for (const [name, pool] of pools) {
  if (pool.length === 0) problems.push(`answer "${name}" has no tracks`);
}
if (problems.length > 0) {
  console.error(problems.map((p) => `ERROR: ${p}`).join("\n"));
  process.exit(1);
}

const titles = await fetchTitles(usedGroups);
for (const pool of pools.values()) {
  for (const entry of pool) {
    const title = titles.get(`${entry.group}/${entry.track}`);
    if (!title) {
      console.warn(`WARNING: no maplebgm-db title for ${entry.group}/${entry.track}`);
    }
    entry.title = title ?? entry.track;
  }
}

// ── Select PUZZLE_COUNT tracks, balanced across answers ─────────────────────

const rng = mulberry32(SEED);
const answerOrder = shuffle([...pools.keys()], rng);
for (const pool of pools.values()) shuffle(pool, rng);

const picks = [];
for (let round = 0; picks.length < PUZZLE_COUNT; round++) {
  let added = false;
  for (const name of answerOrder) {
    const pool = pools.get(name);
    if (round < pool.length) {
      picks.push(pool[round]);
      added = true;
      if (picks.length === PUZZLE_COUNT) break;
    }
  }
  if (!added) break;
}

shuffle(picks, rng);
// Spread out same-answer neighbors so consecutive days differ.
for (let i = 1; i < picks.length; i++) {
  if (picks[i].answer !== picks[i - 1].answer) continue;
  for (let j = i + 1; j < picks.length; j++) {
    if (picks[j].answer !== picks[i - 1].answer) {
      [picks[i], picks[j]] = [picks[j], picks[i]];
      break;
    }
  }
}

// ── Emit ────────────────────────────────────────────────────────────────────

const payload = JSON.stringify(picks.map((e) => [e.group, e.track, e.title, e.answer]));
const bytes = Buffer.from(payload, "utf8");
for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);

const answerRows = [...Object.entries(AREAS), ...Object.entries(BOSSES)]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([name, mark]) => `  ["${name}", "${mark}", ${name in BOSSES ? 1 : 0}],`)
  .join("\n");

const outPath = join(ROOT, "src/features/games/bgm-guesser/puzzle-data.generated.ts");
writeFileSync(
  outPath,
  `// AUTO-GENERATED by scripts/generate-bgm-guesser-data.mjs — do not edit.\n` +
    `// BGM_GUESSER_PUZZLE_DATA is a base64(XOR(json)) payload of\n` +
    `// [group, track, title, answer] tuples in daily order, decoded by puzzles.ts.\n` +
    `// Obfuscated so the answer isn't readable from the bundle or devtools.\n` +
    `export const BGM_GUESSER_PUZZLE_DATA =\n  "${bytes.toString("base64")}";\n\n` +
    `// The guess picker needs the whole answer pool anyway, so it ships in the\n` +
    `// clear: [name, ui-mark icon id, isBoss].\n` +
    `export const BGM_GUESSER_ANSWER_DATA: [string, string, 0 | 1][] = [\n${answerRows}\n];\n`,
);

const counts = picks.reduce((m, e) => m.set(e.answer, (m.get(e.answer) ?? 0) + 1), new Map());
console.log(`wrote ${picks.length} puzzles to ${outPath}`);
console.log(`answers: ${Object.keys(AREAS).length} areas + ${Object.keys(BOSSES).length} bosses`);
console.log(`curated tracks: ${Object.keys(ANSWERS).length}`);
console.log(
  "picked per answer:",
  [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a}: ${n}`).join(", "),
);
