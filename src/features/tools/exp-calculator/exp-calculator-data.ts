export const MIN_EXP_LEVEL = 200;
export const MAX_EXP_LEVEL = 300;

export type IconRef =
  | { type: "item" | "skill"; id: string; shadow?: boolean }
  | { type: "erda-skill"; id: string }
  | { type: "mob"; id: string };

export interface CheckBuff {
  id: string;
  label: string;
  value: number;
  icon?: IconRef;
  maxLevel?: number;
  excludes?: string[];
}

interface CheckBuffGroup {
  id: string;
  section: string;
  mode: "exclusive" | "multi";
  buffs: CheckBuff[];
}

interface SelectBuff {
  id: string;
  label: string;
  icon?: IconRef;
  options: { label: string; value: number }[];
  additive?: boolean;
}

export interface InputBuff {
  id: string;
  label: string;
  max: number;
  step?: number;
  icon?: IconRef;
  bonusByLevel?: number[];
}

export interface BuffState {
  exclusive: Record<string, string>;
  additive: Record<string, boolean>;
  selects: Record<string, number>;
  inputs: Record<string, number>;
}

export interface MonsterExpInput {
  playerLevel: number;
  currentPercent: number;
  monsterLevel: number;
  monsterBaseExp: number;
  hourlyKillCount: number;
}

export interface MonsterExpResult {
  monsterLevelBonus: number;
  buffMultiplier: number;
  normalExp: number;
  vipBoosterExp: number;
  goldClockworkExp: number;
  hourlyExp: number;
  hoursToNextLevel: number;
}

export interface LevelResourceRow {
  level: number;
  exp: number;
}

export interface EpicDungeonRow {
  level: number;
  baseExp: number;
  fiveXExp: number;
  nineXExp: number;
}

export interface ResourceTable {
  id: string;
  label: string;
  description: string;
  kind: "single-exp" | "epic";
  rows: LevelResourceRow[] | EpicDungeonRow[];
  maxUnits?: number;
}

type BurningType = "" | "hyper" | "hyperMax" | "hyperMaxBeyond";

interface ExpContentOption {
  id: string;
  label: string;
  region: "Arcane River" | "Tenebris" | "Grandis";
  minLevel: number;
  exp: number;
  icon?: IconRef;
}

interface EpicDungeonOption {
  id: string;
  label: string;
  minLevel: number;
  baseMultiplier: number;
}

interface GrowthPotionOption {
  id: string;
  label: string;
  minLevel: number;
  maxLevel: number;
  icon?: IconRef;
}

export interface AllInOneInput {
  startLevel: number;
  startPercent: number;
  targetLevel: number;
  startDate: string;
  endDate: string;
  burningType: BurningType;
  dailyIds: string[];
  monsterParkRuns: number;
  customDailyExp: number;
  weeklyRuns: Record<string, number>;
  mpeRuns: number;
  epicDungeonId: string;
  epicDungeonMultiplier: number;
  strawberryTickets: number;
  mechaberryTickets: number;
  expTickets: number;
  advancedExpTickets: number;
  punchKingScore: number;
  doubleUpPoints: number;
  potions: Record<string, number>;
  arcaneRiverBonus: number;
  grandisBonus: number;
  monsterParkBonus: number;
  epicDungeonBonus: number;
}

interface AllInOneResult {
  level: number;
  percent: number;
  endDateLevel: number;
  endDatePercent: number;
  totalExp: number;
  remainingToTarget: number;
  reachedTarget: boolean;
  daysSimulated: number;
  weeklyResets: number;
  projectedDaysToTarget: number | null;
  milestones: { level: number; date: number }[];
}

const EXP_TO_NEXT_LEVEL_VALUES = [
  2207026470, 2471869646, 2768494003, 3100713283, 3472798876, 3889534741, 4356278909, 4879032378, 5464516263, 6120258214,
  7344309856, 8152183940, 9048924173, 10044305832, 11149179473, 13379015367, 14583126750, 15895608157, 17326212891,
  18885572051, 22662686461, 24249074513, 25946509728, 27762765408, 29706158986, 35647390783, 38142708137, 40812697706,
  43669586545, 46726457603, 56071749123, 57753901596, 59486518643, 61271114202, 63109247628, 75731097153, 78003030067,
  80343120969, 82753414598, 85236017035, 102283220442, 105351717055, 108512268566, 111767636622, 115120665720,
  138144798864, 142289142829, 146557817113, 150954551626, 155483188174, 186579825808, 192177220582, 197942537199,
  203880813314, 209997237713, 216297154844, 222786069489, 229469651573, 236353741120, 243444353353, 1731919984062,
  1749239183902, 1766731575741, 1784398891498, 1802242880412, 2342915744535, 2366344901980, 2390008350999, 2413908434508,
  2438047518853, 5412465491853, 5466590146771, 5521256048238, 5576468608720, 5632233294807, 11377111255510,
  12514822381061, 13766304619167, 15142935081083, 16657228589191, 33647601750165, 37012361925181, 40713598117699,
  44784957929468, 49263453722414, 99512176519276, 109463394171214, 120409733588335, 132450706947169, 145695777641870,
  294305470836577, 323736017920234, 356109619712257, 391720581683482, 430892639851830, 870403132500696, 957443445750765,
  1053187790325841, 1158506569358425, 1737759854037637,
];

export const CHECK_BUFF_GROUPS: CheckBuffGroup[] = [
  {
    id: "cash",
    section: "Reg Server Modifiers",
    mode: "exclusive",
    buffs: [
      { id: "cash-2x", label: "2x Cash Shop Coupon (Lv. 250 or below)", value: 2, maxLevel: 250, icon: { type: "item", id: "05211046" } },
    ],
  },
  {
    id: "ring",
    section: "Reg Server Modifiers",
    mode: "exclusive",
    buffs: [
      { id: "torment", label: "Ring of Torment (x1.15 EXP)", value: 1.15, icon: { type: "item", id: "01114401" } },
    ],
  },
  {
    id: "use",
    section: "Use Coupon",
    mode: "exclusive",
    buffs: [
      { id: "use-2x", label: "2x EXP", value: 2, icon: { type: "item", id: "02450064" } },
      { id: "use-3x", label: "3x EXP", value: 3, icon: { type: "item", id: "02450163" } },
      { id: "use-4x", label: "4x EXP", value: 4, icon: { type: "item", id: "02450187" } },
    ],
  },
  {
    id: "additive",
    section: "Additive Buffs",
    mode: "multi",
    buffs: [
      { id: "eap", label: "EXP Accumulation Potion (+10%)", value: 10, icon: { type: "item", id: "02003550" }, excludes: ["small-eap"] },
      { id: "small-eap", label: "Small Concentrated EXP Accumulation Potion (+20%)", value: 20, icon: { type: "item", id: "02003612" }, excludes: ["eap"] },
      { id: "extreme-gold", label: "Extreme Gold Potion (+10%)", value: 10, icon: { type: "item", id: "02023128" } },
      { id: "vip-exp", label: "VIP Buff (EXP) (+15%)", value: 15, icon: { type: "item", id: "02024164", shadow: true } },
      { id: "mvp-50", label: "MVP 50% Bonus EXP (+50%)", value: 50, icon: { type: "item", id: "02023926" }, excludes: ["mvp-70"] },
      { id: "mvp-70", label: "MVP 70% Bonus EXP (+70%)", value: 70, icon: { type: "item", id: "02024275" }, excludes: ["mvp-50"] },
      { id: "exp-boost-ring-15", label: "EXP Boost Ring (+15%)", value: 15, icon: { type: "item", id: "01114326" } },
      { id: "spirit", label: "Pendant of the Spirit (+30%)", value: 30, icon: { type: "item", id: "01122017" } },
      { id: "aut-cernium", label: "Sacred Symbol: Cernium MAX (+10%)", value: 10, icon: { type: "item", id: "01713000" } },
      { id: "aut-arcs", label: "Sacred Symbol: Arcus MAX (+10%)", value: 10, icon: { type: "item", id: "01713001" } },
      { id: "aut-odium", label: "Sacred Symbol: Odium MAX (+10%)", value: 10, icon: { type: "item", id: "01713002" } },
      { id: "aut-shangri-la", label: "Sacred Symbol: Shangri-La MAX (+10%)", value: 10, icon: { type: "item", id: "01713003" } },
      { id: "aut-arteria", label: "Sacred Symbol: Arteria MAX (+10%)", value: 10, icon: { type: "item", id: "01713004" } },
      { id: "aut-carcion", label: "Sacred Symbol: Carcion MAX (+10%)", value: 10, icon: { type: "item", id: "01713005" } },
    ],
  },
];

export const SELECT_BUFFS: SelectBuff[] = [
  { id: "elven", label: "Elven Blessing (Mercedes Link Skill)", icon: { type: "skill", id: "20021110" }, options: [
    { label: "N/A", value: 0 },
    { label: "Level 1 (+10% EXP)", value: 10 },
    { label: "Level 2 (+15% EXP)", value: 15 },
    { label: "Level 3 (+20% EXP)", value: 20 },
  ] },
  { id: "evan-link", label: "Rune Persistence (Evan Link Skill)", icon: { type: "skill", id: "20010294" }, additive: false, options: [
    { label: "N/A", value: 0 },
    { label: "Level 1 (Rune Duration +30%)", value: 1 },
    { label: "Level 2 (Rune Duration +50%)", value: 2 },
    { label: "Level 3 (Rune Duration +70%)", value: 3 },
  ] },
  { id: "rune-day", label: "Rune Day", icon: { type: "skill", id: "80003910" }, additive: false, options: [
    { label: "No event", value: 0 },
    { label: "+100% Rune EXP", value: 1 },
    { label: "+100% Rune EXP + 10 min cooldown", value: 2 },
  ] },
  { id: "zero", label: "Zero Legion", icon: { type: "skill", id: "100000271" }, options: [
    { label: "N/A", value: 0 },
    { label: "+4% EXP (B-rank)", value: 4 },
    { label: "+6% EXP (A-rank)", value: 6 },
    { label: "+8% EXP (S-rank)", value: 8 },
    { label: "+10% EXP (SS-rank)", value: 10 },
    { label: "+12% EXP (SSS-rank)", value: 12 },
  ] },
  { id: "burning", label: "Burning Field", icon: { type: "item", id: "01114400" }, options: percentOptions([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) },
  { id: "roro", label: "Roro's Experience Ring", icon: { type: "skill", id: "80012753" }, options: [
    { label: "N/A", value: 0 },
    { label: "Level 1 (+12.5% EXP averaged)", value: 12.5 },
    { label: "Level 2 (+50% EXP averaged)", value: 50 },
    { label: "Level 3 (+112.5% EXP averaged)", value: 112.5 },
    { label: "Level 4 (+200% EXP)", value: 200 },
  ] },
  { id: "exp-node", label: "EXP Node (Averaged)", icon: { type: "item", id: "02831071" }, options: [
    { label: "N/A", value: 0 },
    { label: "+10% EXP (Roro Power III)", value: 10 },
    { label: "+33% EXP (Mapae - EXP Power)", value: 33 },
  ] },
  { id: "holy-symbol", label: "Holy Symbol", icon: { type: "skill", id: "400001020" }, options: [
    { label: "N/A", value: 0 },
    { label: "Decent Holy Symbol Level 1 (+20% EXP)", value: 20 },
    { label: "Decent Holy Symbol Level 30 (+35% EXP)", value: 35 },
    { label: "Holy Symbol (+50% EXP)", value: 50 },
    { label: "Holy Symbol + Holy Symbol - Experience (+70% EXP)", value: 70 },
  ] },
  { id: "tallahart", label: "Grand Sacred Symbol: Tallahart", icon: { type: "item", id: "01714000" }, options: grandSymbolOptions() },
  { id: "geardock", label: "Grand Sacred Symbol: Geardock", icon: { type: "item", id: "01714001" }, options: grandSymbolOptions() },
  { id: "union-artifact", label: "Legion Artifact (EXP)", icon: { type: "item", id: "05681074" }, options: levelPercentOptions([1, 2, 3, 4, 6, 7, 8, 9, 10, 12]) },
  { id: "champion-renown", label: "Champion's Renown", icon: { type: "skill", id: "80004034" }, options: levelPercentOptions([5, 10, 15, 20, 25]) },
  { id: "caretaker", label: "Caretaker's Buff", icon: { type: "skill", id: "80011827" }, options: levelPercentOptions([5, 6, 7, 8, 9, 10]) },
  { id: "kinship", label: "Kinship Ring", icon: { type: "item", id: "01114000" }, options: [
    { label: "N/A", value: 0 },
    { label: "+10% EXP (Player wears ring)", value: 10 },
    { label: "+15% EXP (1 extra ring wearer in party)", value: 15 },
    { label: "+20% EXP (2 extra ring wearers in party)", value: 20 },
    { label: "+25% EXP (3 extra ring wearers in party)", value: 25 },
    { label: "+30% EXP (4 extra ring wearers in party)", value: 30 },
  ] },
  { id: "eluna", label: "Eluna Earrings / Pendant", icon: { type: "item", id: "01032279" }, options: percentOptions([0, 2, 4, 6, 8, 10]) },
  { id: "roll-of-the-dice", label: "Roll of the Dice", icon: { type: "skill", id: "35111013" }, options: percentOptions([0, 30, 40, 50]) },
];

/** Pirate-branch jobs that have Roll of the Dice / Loaded Dice (matches the
 *  Loaded Dice warnings in classSkillData.ts). Roll of the Dice is hidden for
 *  every other job when a character is selected. */
export const ROLL_OF_THE_DICE_JOBS = new Set([
  "Pirate",
  "Buccaneer",
  "Corsair",
  "Cannoneer",
  "Thunder Breaker",
  "Shade",
  "Mechanic",
  "Angelic Buster",
  "Ark",
  "Mo Xuan",
]);

const HYPER_STAT_EXP_BONUS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10];
const SOL_JANUS_EXP_BONUS = [0, 10, 12, 14, 16, 18, 20, 22, 24, 26, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 100];

export const LEVEL_INPUT_BUFFS: InputBuff[] = [
  { id: "hyper-stats", label: "EXP Hyper Stat Level (1-15)", max: 15, icon: { type: "erda-skill", id: "18112/rush/2" }, bonusByLevel: HYPER_STAT_EXP_BONUS },
  { id: "sol-janus", label: "Sol Janus Level (1-30)", max: 30, icon: { type: "skill", id: "500001000" }, bonusByLevel: SOL_JANUS_EXP_BONUS },
];

export const INPUT_BUFFS: InputBuff[] = [
  { id: "legion-board", label: "Legion Board EXP Obtained", max: 10, step: 0.25 },
  { id: "event-title", label: "Events / Event Titles", max: 100, step: 0.5 },
];

const EXP_TICKET_CROWN = [
  7404000, 7605000, 7808000, 8035000, 8242000, 8450000, 8661000, 8895000, 9109000, 9325000, 18601000, 19026000, 19504000,
  19936000, 20372000, 20861000, 21340000, 21801000, 22249000, 22755000, 23211000, 23724000, 24186000, 24707000, 25176000,
  25704000, 26238000, 26717000, 27258000, 27802000, 29503000, 30080000, 30660000, 31178000, 31766000, 32360000, 32959000,
  33488000, 34093000, 34701000, 35312000, 36422000, 37051000, 37610000, 38248000, 38889000, 39533000, 40182000, 40835000,
  41492000, 43861000, 44553000, 45249000, 45949000, 46654000, 47360000, 48073000, 48788000, 49595000, 50321000, 76572000,
  76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000,
  76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000,
  76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000, 76572000,
  76572000, 76572000, 76572000,
];

const ADV_EXP_TICKET = [
  388229000, 393816000, 399411000, 405046000, 411393000, 462820000, 469175000, 475554000, 482760000, 489212000, 511726000,
  536006000, 542983000, 572884000, 581154000, 653181000, 661414000, 670728000, 679048000, 688437000, 773107000, 783656000,
  793073000, 803703000, 813213000, 914168000, 924819000, 936844000, 948944000, 959736000, 1078497000, 1078497000,
  1078497000, 1078497000, 1078497000, 1078497000, 1078497000, 1078497000, 1078497000, 1078497000,
];

const PUNCH_KING = [
  88837200, 91250100, 93690900, 96412500, 98897400, 101395800, 103923000, 106738200, 109307700, 111889800, 223202700,
  228305700, 234042300, 239227200, 234042300, 244458900, 255638700, 261611100, 266987700, 273054600, 278523000, 284684400,
  290225700, 296475300, 302107500, 308448000, 314852400, 320594400, 327087000, 333622800, 354024900, 360949500, 367900200,
  374131800, 381187800, 388313100, 395461800, 401854500, 409107600, 416403000, 423741600, 437052600, 444605400, 451314900,
  458967600, 466659900, 474395400, 482174100, 490013100, 497895300, 526326300, 534636000, 542986200, 551378700, 559836900,
  568312200, 576873900, 585453600, 595134900, 603846000, 1552914900, 1575261000, 1597643100, 1620182700, 1645568100,
  1851114600, 1876697100, 1902214800, 1931036400, 1956846600, 2046902400, 2144023200, 2171930400, 2291534100, 2324615400,
  2612721600, 2645654400, 2682909000, 2716189200, 2753744400, 3092424300, 3134622600, 3172291200, 3214809000, 3252850200,
  3656668500, 3699273600, 3747375900, 3795773400, 3838940100, 3838940100, 3838940100, 3838940100, 3838940100, 3838940100,
  3838940100, 3838940100, 3838940100, 3838940100, 3838940100,
];

const STRAWBERRY_FARM = [
  5759415, 5927260, 6096770, 6267945, 6440760, 6623095, 6799320, 6977160, 7156615, 7346080, 7527855, 7712220, 7906955,
  8094595, 8292845, 8492905, 8685455, 8888970, 9084705, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645,
  9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645,
  9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645,
  9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645, 9291645,
];

const MECHABERRY_FARM = [
  3265600060800, 3310161465600, 3349939507200, 3394838304000, 3435009811200, 5148589248000, 5208577228800, 5276305267200,
  5344448947200, 5405227660800, 6580266950400, 6653978073600, 6737444313600, 6821411625600, 6896248444800, 6896248444800,
  6896248444800, 6896248444800, 6896248444800, 6896248444800,
];

const HIGH_MOUNTAIN_BASE = [
  260900000000, 264700000000, 268500000000, 272200000000, 276500000000, 311000000000, 315300000000, 319600000000,
  324500000000, 328800000000, 369800000000, 375200000000, 380100000000, 385000000000, 390600000000, 439000000000,
  444500000000, 450800000000, 456400000000, 462700000000, 519600000000, 526700000000, 533000000000, 540100000000,
  546500000000, 614400000000, 621500000000, 629600000000, 637700000000, 645000000000, 724800000000, 732900000000,
  742100000000, 751400000000, 759600000000, 759600000000, 759600000000, 759600000000, 759600000000, 759600000000,
];

const ANGLER_COMPANY_BASE = [
  554700000000, 562800000000, 570150000000, 577500000000, 585900000000, 658500000000, 666750000000, 676200000000,
  684600000000, 694050000000, 779400000000, 790050000000, 799500000000, 810150000000, 819750000000, 921600000000,
  932250000000, 944400000000, 956550000000, 967500000000, 1087200000000, 1099350000000, 1113150000000, 1127100000000,
  1139400000000, 1139400000000, 1139400000000, 1139400000000, 1139400000000, 1139400000000,
];

const NIGHTMARE_PARADISE_BASE = [
  1039200000000, 1053400000000, 1066000000000, 1080200000000, 1093000000000, 1228800000000, 1243000000000, 1259200000000,
  1275400000000, 1290000000000, 1449600000000, 1465800000000, 1484200000000, 1502800000000, 1519200000000, 1519200000000,
  1519200000000, 1519200000000, 1519200000000, 1519200000000,
];

export const RESOURCE_TABLES: ResourceTable[] = [
  {
    id: "exp-ticket",
    label: "EXP Ticket",
    description: "KMS CROWN/GMS Ride the Lightning EXP ticket values per ticket from the local EXP Ticket workbook.",
    kind: "single-exp",
    rows: makeLevelRows(200, EXP_TICKET_CROWN),
  },
  {
    id: "advanced-exp-ticket",
    label: "Advanced EXP Ticket",
    description: "Advanced EXP ticket values per ticket from the local EXP Ticket workbook.",
    kind: "single-exp",
    rows: makeLevelRows(260, ADV_EXP_TICKET),
  },
  {
    id: "punch-king",
    label: "EXP Punch King",
    description: "Spiegella's Golden Carriage Tomato Punch King EXP per point, max 1150 points per run.",
    kind: "single-exp",
    rows: makeLevelRows(200, PUNCH_KING),
    maxUnits: 1150,
  },
  {
    id: "strawberry-farm",
    label: "Strawberry Farm",
    description: "Spiegella's Golden Strawberry Farm / Midnight Dream Catcher EXP per monster.",
    kind: "single-exp",
    rows: makeLevelRows(200, STRAWBERRY_FARM),
  },
  {
    id: "mechaberry-farm",
    label: "Mechaberry Farm",
    description: "Mechaberry Farm EXP per run. The workbook notes these values are not affected by EXP multipliers.",
    kind: "single-exp",
    rows: makeLevelRows(280, MECHABERRY_FARM),
  },
  {
    id: "high-mountain",
    label: "Epic Dungeon: High Mountain",
    description: "After KMS CROWN/GMS Ride the Lightning High Mountain weekly EXP table.",
    kind: "epic",
    rows: makeEpicRows(260, HIGH_MOUNTAIN_BASE),
  },
  {
    id: "angler-company",
    label: "Epic Dungeon: Angler Company",
    description: "After KMS CROWN/GMS Ride the Lightning Angler Company weekly EXP table.",
    kind: "epic",
    rows: makeEpicRows(270, ANGLER_COMPANY_BASE),
  },
  {
    id: "nightmare-paradise",
    label: "Epic Dungeon: Nightmare Paradise",
    description: "After KMS CROWN/GMS Ride the Lightning Nightmare Paradise weekly EXP table.",
    kind: "epic",
    rows: makeEpicRows(280, NIGHTMARE_PARADISE_BASE),
  },
];

export const DAILY_EXP_CONTENT: ExpContentOption[] = [
  { id: "rte", label: "Vanishing Journey", region: "Arcane River", minLevel: 200, exp: 0x2ba373a2, icon: { type: "item", id: "01712001" } },
  { id: "cci", label: "Chew Chew Island", region: "Arcane River", minLevel: 210, exp: 0x7fa71c86, icon: { type: "item", id: "01712002" } },
  { id: "lach", label: "Lachelein", region: "Arcane River", minLevel: 220, exp: 0xbe15c70a, icon: { type: "item", id: "01712003" } },
  { id: "arcana", label: "Arcana", region: "Arcane River", minLevel: 225, exp: 0xc5012937, icon: { type: "item", id: "01712004" } },
  { id: "moras", label: "Morass", region: "Arcane River", minLevel: 230, exp: 0x106283735, icon: { type: "item", id: "01712005" } },
  { id: "esf", label: "Esfera", region: "Arcane River", minLevel: 235, exp: 0x10e0f3132, icon: { type: "item", id: "01712006" } },
  { id: "mb", label: "Moonbridge", region: "Tenebris", minLevel: 245, exp: 0x1f4886ce7, icon: { type: "mob", id: "8644614" } },
  { id: "laby", label: "Labyrinth of Suffering", region: "Tenebris", minLevel: 250, exp: 905769e4, icon: { type: "mob", id: "8644706" } },
  { id: "limen", label: "Limina", region: "Tenebris", minLevel: 255, exp: 0x261806f70, icon: { type: "mob", id: "8645010" } },
  { id: "cern", label: "Cernium", region: "Grandis", minLevel: 260, exp: 0x3d4d5c820, icon: { type: "item", id: "01713000" } },
  { id: "arcs", label: "Hotel Arcus", region: "Grandis", minLevel: 265, exp: 0x482b53349, icon: { type: "item", id: "01713001" } },
  { id: "odium", label: "Odium", region: "Grandis", minLevel: 270, exp: 0x569941dd0, icon: { type: "item", id: "01713002" } },
  { id: "sgl", label: "Shangri-La", region: "Grandis", minLevel: 275, exp: 0x77aeb5a38, icon: { type: "item", id: "01713003" } },
  { id: "arteria", label: "Arteria", region: "Grandis", minLevel: 280, exp: 0x8fc5964a0, icon: { type: "item", id: "01713004" } },
  { id: "carcion", label: "Carcion", region: "Grandis", minLevel: 285, exp: 0xaa0123d60, icon: { type: "item", id: "01713005" } },
  { id: "tallahart", label: "Tallahart", region: "Grandis", minLevel: 290, exp: 0x14e46112c0, icon: { type: "item", id: "01714000" } },
  { id: "geardock", label: "Geardock", region: "Grandis", minLevel: 295, exp: 0x1898b2ee80, icon: { type: "item", id: "01714001" } },
];

export const WEEKLY_EXP_CONTENT: ExpContentOption[] = [
  { id: "erda-spectrum", label: "Erda Spectrum", region: "Arcane River", minLevel: 200, exp: 0xb30798c, icon: { type: "item", id: "01712001" } },
  { id: "hungry-muto", label: "Hungry Muto", region: "Arcane River", minLevel: 210, exp: 0x20bb4264, icon: { type: "item", id: "01712002" } },
  { id: "midnight-chaser", label: "Midnight Chaser", region: "Arcane River", minLevel: 220, exp: 0x30bd60fc, icon: { type: "item", id: "01712003" } },
  { id: "spirit-savior", label: "Spirit Savior", region: "Arcane River", minLevel: 225, exp: 0x3283946a, icon: { type: "item", id: "01712004" } },
  { id: "ranheim-defense", label: "Ranheim Defense", region: "Arcane River", minLevel: 230, exp: 0x433842ab, icon: { type: "item", id: "01712005" } },
  { id: "protect-esfera", label: "Protect Esfera", region: "Arcane River", minLevel: 235, exp: 0x453ef8ec, icon: { type: "item", id: "01712006" } },
];

export const EPIC_DUNGEON_OPTIONS: EpicDungeonOption[] = [
  { id: "high-mountain", label: "High Mountain", minLevel: 260, baseMultiplier: 1 },
  { id: "angler-company", label: "Angler Company", minLevel: 270, baseMultiplier: 1.5 },
  { id: "nightmare-paradise", label: "Nightmare Paradise", minLevel: 280, baseMultiplier: 2 },
];

export const GROWTH_POTION_OPTIONS: GrowthPotionOption[] = [
  { id: "potion1", label: "Growth Potion 1", minLevel: 200, maxLevel: 209, icon: { type: "item", id: "02633425" } },
  { id: "potion2", label: "Growth Potion 2", minLevel: 200, maxLevel: 219, icon: { type: "item", id: "02633424" } },
  { id: "potion3", label: "Growth Potion 3", minLevel: 200, maxLevel: 229, icon: { type: "item", id: "02633423" } },
  { id: "tgp", label: "Typhoon Pot", minLevel: 200, maxLevel: 239, icon: { type: "item", id: "02439660" } },
  { id: "mgp", label: "Mag Pot", minLevel: 200, maxLevel: 249, icon: { type: "item", id: "02633621" } },
  { id: "leapgp", label: "Leap Pot", minLevel: 200, maxLevel: 259, icon: { type: "item", id: "02831238" } },
  { id: "trgp", label: "Transc. Pot", minLevel: 200, maxLevel: 269, icon: { type: "item", id: "02637134" } },
  { id: "lgp", label: "Legendary Pot", minLevel: 200, maxLevel: 279, icon: { type: "item", id: "02831239" } },
];

const MONSTER_PARK_EXP = [
  { minLevel: 200, exp: 0x1573de48 },
  { minLevel: 210, exp: 0x4c98be98 },
  { minLevel: 220, exp: 0xbfc99c3e },
  { minLevel: 225, exp: 0x11897de7a },
  { minLevel: 230, exp: 0x1653db880 },
  { minLevel: 235, exp: 0x19c71beaa },
  { minLevel: 240, exp: 0x207530148 },
  { minLevel: 245, exp: 0x2ba5d6134 },
  { minLevel: 250, exp: 14058901e3 },
  { minLevel: 255, exp: 0x39f013158 },
  { minLevel: 260, exp: 0x8b9a915ac },
  { minLevel: 265, exp: 0xa588f1a1c },
  { minLevel: 270, exp: 0xc4c3f7700 },
  { minLevel: 275, exp: 76639838e3 },
  { minLevel: 280, exp: 107204032e3 },
  { minLevel: 285, exp: 156017856e3 },
  { minLevel: 290, exp: 218575316e3 },
];

const MPE_EXP_FACTORS = [
  2.04, 2.04, 2.04, 2.04, 2.04, 2.652, 2.652, 2.652, 2.652, 2.652,
  4.2, 4.2, 4.2, 4.2, 4.2, 5.376, 5.376, 5.376, 5.376, 5.376,
  5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832,
  5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832,
];

const CHAMPION_DOUBLE_UP_ARCANE = [
  98708, 101389, 104101, 107125, 109886, 112662, 115470, 118598, 121453, 124322,
  248003, 253673, 260047, 265808, 271621, 278138, 284043, 290679, 296653, 303394,
  309470, 316316, 322473, 329417, 335675, 342720, 349836, 356216, 363430, 370692,
  393361, 401055, 408778, 415702, 423542, 431459, 439402, 446505, 454564, 462670,
  470824, 485614, 494006, 501461, 509964, 518511, 527106, 535749, 544459, 553217,
  584807, 594040, 603318, 612643, 622041, 631458, 640971, 650504, 661261, 670940,
];

const CHAMPION_DOUBLE_UP_GRANDIS = [
  1725461, 1750290, 1775159, 1800203, 1828409, 2056794, 2085219, 2113572, 2145596, 2174274,
  2445217, 2481337, 2513634, 2546149, 2582906, 2903024, 2939616, 2981010, 3017988, 3059716,
  3436027, 3482914, 3524768, 3572010, 3614278, 4062965, 4110304, 4163751, 4217526, 4265489,
  4793318, 4847012, 4907812, 4968977, 5023491, 5643220, 5711948, 5781080, 5842650, 5912186,
];

const PUNCH_KING_TIERS = [
  { limit: 10, multiplier: 1500 },
  { limit: 15, multiplier: 2000 },
  { limit: 125, multiplier: 360 },
  { limit: 250, multiplier: 240 },
  { limit: 1200, multiplier: 75 },
  { limit: 400, multiplier: 300 },
  { limit: 50, multiplier: 1500 },
];

const DAY_MS = 86400000;
const THURSDAY = 4;

export const DEFAULT_BUFF_STATE: BuffState = {
  exclusive: {},
  additive: {},
  selects: Object.fromEntries(SELECT_BUFFS.map((buff) => [buff.id, 0])),
  inputs: Object.fromEntries([...INPUT_BUFFS, ...LEVEL_INPUT_BUFFS].map((buff) => [buff.id, 0])),
};

export function expForLevel(level: number): number {
  return EXP_TO_NEXT_LEVEL_VALUES[level - MIN_EXP_LEVEL] ?? 0;
}

function levelExpRemaining(level: number, percent: number): number {
  return Math.ceil(expForLevel(level) * (1 - clamp(percent, 0, 99.999) / 100));
}

function monsterLevelBonus(playerLevel: number, monsterLevel: number): number {
  const diff = Math.abs(monsterLevel - playerLevel);
  if (diff <= 1) return 1.2;
  if (diff <= 4) return 1.1;
  if (diff <= 9) return 1.05;
  return 1;
}

function calculateBuffMultiplier(state: BuffState, playerLevel: number): number {
  let multiplicative = 1;
  let additive = 0;
  for (const group of CHECK_BUFF_GROUPS) {
    if (group.mode === "exclusive") {
      const selected = group.buffs.find((buff) => buff.id === state.exclusive[group.id]);
      multiplicative *= checkApplies(selected, playerLevel);
    } else {
      additive += group.buffs.reduce((sum, buff) => sum + (state.additive[buff.id] ? buff.value / 100 : 0), 0);
    }
  }
  const selectAdditive = SELECT_BUFFS.reduce((sum, buff) => {
    if (buff.additive === false) return sum;
    return sum + (state.selects[buff.id] ?? 0) / 100;
  }, 0);
  const inputAdditive = [...INPUT_BUFFS, ...LEVEL_INPUT_BUFFS].reduce((sum, buff) => {
    const value = clamp(state.inputs[buff.id] ?? 0, 0, buff.max);
    const percent = buff.bonusByLevel ? buff.bonusByLevel[Math.floor(value)] ?? 0 : value;
    return sum + percent / 100;
  }, 0);
  const runeAdditive = runeExpBonus(state.selects["evan-link"] ?? 0, state.selects["rune-day"] ?? 0) / 100;
  return multiplicative + additive + selectAdditive + inputAdditive + runeAdditive;
}

export function calculateMonsterExp(input: MonsterExpInput, buffs: BuffState): MonsterExpResult {
  const levelBonus = monsterLevelBonus(input.playerLevel, input.monsterLevel);
  const buffMultiplier = calculateBuffMultiplier(buffs, input.playerLevel);
  const levelAdjustedBase = Math.ceil(Math.max(0, input.monsterBaseExp) * levelBonus);
  const normalExp = Math.ceil(levelAdjustedBase * buffMultiplier);
  const hourlyExp = normalExp * Math.max(0, input.hourlyKillCount);
  const remainingExp = levelExpRemaining(input.playerLevel, input.currentPercent);
  return {
    monsterLevelBonus: levelBonus,
    buffMultiplier,
    normalExp,
    vipBoosterExp: normalExp * 10,
    goldClockworkExp: normalExp * 200,
    hourlyExp,
    hoursToNextLevel: hourlyExp > 0 ? remainingExp / hourlyExp : 0,
  };
}

export function calculateAllInOne(input: AllInOneInput): AllInOneResult {
  const dateRange = normalizedDateRange(input.startDate, input.endDate);
  let state = initialSimulationState(input);
  const milestones = state.milestones;
  state = applyStartingEventResources(state, input, dateRange.start);
  for (let date = dateRange.start; date <= dateRange.end && state.level < MAX_EXP_LEVEL; date += DAY_MS) {
    state = applyDailyWeeklyContent(state, input, date);
  }
  const endDateLevel = state.level;
  const endDatePercent = expPercent(state.level, state.currentExp);
  state = applyEndingEventResources(state, input, dateRange.end);
  const target = clamp(Math.floor(input.targetLevel), MIN_EXP_LEVEL + 1, MAX_EXP_LEVEL);
  const remainingToTarget = state.level >= target ? 0 : expNeededBetween(state.level, state.currentExp, target);
  return {
    level: state.level,
    percent: expPercent(state.level, state.currentExp),
    endDateLevel,
    endDatePercent,
    totalExp: state.totalExp,
    remainingToTarget,
    reachedTarget: remainingToTarget <= 0,
    daysSimulated: Math.floor((dateRange.end - dateRange.start) / DAY_MS) + 1,
    weeklyResets: countThursdays(dateRange.start, dateRange.end),
    projectedDaysToTarget: projectedDaysToTarget(state, input, target, remainingToTarget),
    milestones,
  };
}

export function percentOfLevel(level: number, exp: number): number {
  const tnl = expForLevel(level);
  return tnl > 0 ? (exp / tnl) * 100 : 0;
}

interface SimulationState {
  level: number;
  currentExp: number;
  totalExp: number;
  burningType: BurningType;
  milestones: { level: number; date: number }[];
}

function initialSimulationState(input: AllInOneInput): SimulationState {
  const level = clamp(Math.floor(input.startLevel), MIN_EXP_LEVEL, MAX_EXP_LEVEL - 1);
  return {
    level,
    currentExp: Math.floor(expForLevel(level) * clamp(input.startPercent, 0, 99.999) / 100),
    totalExp: 0,
    burningType: input.burningType,
    milestones: [],
  };
}

function applyStartingEventResources(state: SimulationState, input: AllInOneInput, date: number): SimulationState {
  let next = applyResourceUnits(state, Math.max(0, input.strawberryTickets) * 1200, "strawberry-farm", date);
  if (next.level >= 280) {
    next = applyResourceUnits(next, Math.max(0, input.mechaberryTickets) * 9600, "mechaberry-farm", date);
  }
  return next;
}

function applyEndingEventResources(state: SimulationState, input: AllInOneInput, date: number): SimulationState {
  let next = applyResourceUnits(state, Math.max(0, input.expTickets), "exp-ticket", date);
  if (next.level >= 260) {
    next = applyResourceUnits(next, Math.max(0, input.advancedExpTickets), "advanced-exp-ticket", date);
  }
  return applyGrowthPotions(next, input.potions, date);
}

function applyDailyWeeklyContent(state: SimulationState, input: AllInOneInput, date: number): SimulationState {
  let next = applySimulationExp(state, dailyExpForState(state, input, date), date);
  if (new Date(date).getDay() === THURSDAY) {
    next = applySimulationExp(next, weeklyExpForState(next, input), date);
  }
  return next;
}

function dailyExpForState(state: SimulationState, input: AllInOneInput, date: number): number {
  return (
    selectedDailyExp(state.level, input) +
    monsterParkExpForLevel(state.level, input.monsterParkRuns, input.monsterParkBonus, date) +
    Math.max(0, input.customDailyExp)
  );
}

function weeklyExpForState(state: SimulationState, input: AllInOneInput): number {
  return (
    selectedWeeklyExp(state.level, input.weeklyRuns) +
    monsterParkExtremeExpForLevel(state.level, input.mpeRuns, input.monsterParkBonus) +
    epicDungeonExpForLevel(state.level, input) +
    punchKingExpForLevel(state.level, input.punchKingScore) +
    doubleUpExpForLevel(state.level, input.doubleUpPoints)
  );
}

function selectedDailyExp(level: number, input: AllInOneInput): number {
  return DAILY_EXP_CONTENT.filter((daily) => input.dailyIds.includes(daily.id) && level >= daily.minLevel)
    .reduce((total, daily) => total + daily.exp + Math.ceil(daily.exp * dailyBonusPercent(daily, input) / 100), 0);
}

function selectedWeeklyExp(level: number, weeklyRuns: Record<string, number>): number {
  return WEEKLY_EXP_CONTENT.reduce((total, weekly) => {
    const runs = clamp(Math.floor(weeklyRuns[weekly.id] ?? 0), 0, 3);
    return level >= weekly.minLevel ? total + weekly.exp * runs : total;
  }, 0);
}

function dailyBonusPercent(daily: ExpContentOption, input: AllInOneInput): number {
  return daily.region === "Grandis" ? Math.max(0, input.grandisBonus) : Math.max(0, input.arcaneRiverBonus);
}

function monsterParkExpForLevel(level: number, runs: number, bonusPercent: number, date: number): number {
  const row = MONSTER_PARK_EXP.filter((entry) => entry.minLevel <= level).pop();
  const base = row?.exp ?? 0;
  const sundayMultiplier = new Date(date).getDay() === 0 ? 1.5 : 1;
  return (Math.ceil(base * sundayMultiplier) + Math.ceil(base * Math.max(0, bonusPercent) / 100)) * Math.max(0, runs);
}

function monsterParkExtremeExpForLevel(level: number, runs: number, bonusPercent: number): number {
  if (level < 260) return 0;
  const base = level * (MPE_EXP_FACTORS[level - 260] ?? MPE_EXP_FACTORS[MPE_EXP_FACTORS.length - 1]) * 100000000;
  return (Math.ceil(5 * base) + Math.ceil(5 * base * Math.max(0, bonusPercent) / 100)) * Math.max(0, runs);
}

function epicDungeonExpForLevel(level: number, input: AllInOneInput): number {
  const dungeon = EPIC_DUNGEON_OPTIONS.find((entry) => entry.id === input.epicDungeonId);
  if (!dungeon || level < dungeon.minLevel || input.epicDungeonMultiplier <= 0) return 0;
  const base = HIGH_MOUNTAIN_BASE[level - 260] ?? HIGH_MOUNTAIN_BASE[HIGH_MOUNTAIN_BASE.length - 1];
  return Math.floor(base * dungeon.baseMultiplier * (input.epicDungeonMultiplier + Math.max(0, input.epicDungeonBonus) / 100));
}

function punchKingExpForLevel(level: number, score: number): number {
  const base = resourceExpWithFallback("punch-king", level) / 900;
  let remaining = Math.max(0, Math.floor(score));
  let total = 0;
  for (const tier of PUNCH_KING_TIERS) {
    const used = Math.min(remaining, tier.limit);
    total += base * used * tier.multiplier;
    remaining -= used;
    if (remaining <= 0) break;
  }
  return total;
}

function doubleUpExpForLevel(level: number, points: number): number {
  if (level < 200) return 0;
  const source = level < 260 ? CHAMPION_DOUBLE_UP_ARCANE[level - 200] : CHAMPION_DOUBLE_UP_GRANDIS[level - 260];
  return Math.ceil(3.5 * (source ?? CHAMPION_DOUBLE_UP_GRANDIS[CHAMPION_DOUBLE_UP_GRANDIS.length - 1])) * Math.max(0, points);
}

function applyResourceUnits(state: SimulationState, units: number, tableId: string, date: number): SimulationState {
  let next = state;
  let remainingUnits = Math.max(0, Math.floor(units));
  while (remainingUnits > 0 && next.level < MAX_EXP_LEVEL) {
    const unitExp = resourceExpWithFallback(tableId, next.level);
    if (unitExp <= 0) break;
    const unitsToLevel = Math.ceil((expForLevel(next.level) - next.currentExp) / unitExp);
    const used = Math.min(remainingUnits, unitsToLevel);
    next = applySimulationExp(next, used * unitExp, date);
    remainingUnits -= used;
  }
  return next;
}

function applyGrowthPotions(state: SimulationState, potions: Record<string, number>, date: number): SimulationState {
  let next = state;
  for (const potion of GROWTH_POTION_OPTIONS) {
    let qty = clamp(Math.floor(potions[potion.id] ?? 0), 0, 1000);
    while (qty > 0 && next.level >= potion.minLevel && next.level <= potion.maxLevel && next.level < MAX_EXP_LEVEL) {
      next = applySimulationExp(next, expForLevel(next.level), date);
      qty -= 1;
    }
    if (qty > 0 && next.level < MAX_EXP_LEVEL) {
      next = applySimulationExp(next, expForLevel(potion.maxLevel) * qty, date);
    }
  }
  return next;
}

function applySimulationExp(state: SimulationState, gainedExp: number, date: number): SimulationState {
  let level = state.level;
  let currentExp = state.currentExp + Math.max(0, gainedExp);
  const milestones = state.milestones;
  while (level < MAX_EXP_LEVEL && currentExp >= expForLevel(level)) {
    currentExp -= expForLevel(level);
    level = nextLevelAfterGain(level, state.burningType);
    milestones.push({ level, date });
  }
  return {
    ...state,
    level,
    currentExp: level >= MAX_EXP_LEVEL ? 0 : currentExp,
    totalExp: state.totalExp + Math.max(0, gainedExp),
  };
}

function nextLevelAfterGain(level: number, burningType: BurningType): number {
  if (!burningType) return level + 1;
  if (level < 260) return Math.min(260, level + (burningType === "hyper" ? 3 : 5));
  if (burningType === "hyperMaxBeyond" && level < 270) return Math.min(270, level + 2);
  return level + 1;
}

function projectedDaysToTarget(state: SimulationState, input: AllInOneInput, target: number, remainingToTarget: number): number | null {
  if (state.level >= target || remainingToTarget <= 0) return 0;
  const averageDailyExp = dailyExpForState(state, input, Date.now()) + weeklyExpForState(state, input) / 7;
  if (averageDailyExp <= 0) return null;
  return Math.ceil(remainingToTarget / averageDailyExp);
}

function resourceExpWithFallback(tableId: string, level: number): number {
  const table = RESOURCE_TABLES.find((resource) => resource.id === tableId);
  if (!table || table.kind !== "single-exp") return 0;
  const rows = table.rows as LevelResourceRow[];
  return rows.find((row) => row.level === level)?.exp ?? rows[rows.length - 1]?.exp ?? 0;
}

function normalizedDateRange(startDate: string, endDate: string): { start: number; end: number } {
  const today = Date.parse(new Date().toDateString());
  const start = Date.parse(`${startDate}T00:00:00`) || today;
  const end = Date.parse(`${endDate}T00:00:00`) || start;
  return start <= end ? { start, end } : { start: end, end: start };
}

function countThursdays(start: number, end: number): number {
  let count = 0;
  for (let date = start; date <= end; date += DAY_MS) {
    if (new Date(date).getDay() === THURSDAY) count += 1;
  }
  return count;
}

function expPercent(level: number, currentExp: number): number {
  return expForLevel(level) > 0 ? (currentExp / expForLevel(level)) * 100 : 0;
}

function expNeededBetween(level: number, currentExp: number, targetLevel: number): number {
  let required = Math.max(0, expForLevel(level) - currentExp);
  for (let nextLevel = level + 1; nextLevel < targetLevel; nextLevel += 1) {
    required += expForLevel(nextLevel);
  }
  return required;
}

function checkApplies(buff: CheckBuff | undefined, playerLevel: number): number {
  if (!buff) return 1;
  if (buff.maxLevel && playerLevel > buff.maxLevel) return 1;
  return buff.value;
}

function percentOptions(values: number[]): { label: string; value: number }[] {
  return values.map((value) => ({ label: value === 0 ? "N/A" : `+${value}% EXP`, value }));
}

function levelPercentOptions(values: number[]): { label: string; value: number }[] {
  return [
    { label: "N/A", value: 0 },
    ...values.map((value, index) => ({ label: `Level ${index + 1} (+${value}% EXP)`, value })),
  ];
}

function grandSymbolOptions(): { label: string; value: number }[] {
  return [
    { label: "N/A", value: 0 },
    ...[10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50].map((value, index) => ({
      label: `Level ${index + 1} (+${value}% EXP)`,
      value,
    })),
  ];
}

function runeExpBonus(evanLinkLevel: number, runeDay: number): number {
  const evanMultiplier = [1, 1.3, 1.5, 1.7][Math.floor(clamp(evanLinkLevel, 0, 3))] ?? 1;
  const [regularBase, blessingBase] = [[20, 40], [40, 60], [60, 90]][runeDay] ?? [20, 40];
  return (regularBase + blessingBase) * evanMultiplier;
}

function makeLevelRows(startLevel: number, values: number[]): LevelResourceRow[] {
  return values.map((exp, index) => ({ level: startLevel + index, exp }));
}

function makeEpicRows(startLevel: number, baseValues: number[]): EpicDungeonRow[] {
  return baseValues.map((baseExp, index) => ({
    level: startLevel + index,
    baseExp,
    fiveXExp: baseExp * 5,
    nineXExp: baseExp * 9,
  }));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
