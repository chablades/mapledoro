import { formatCount } from "../format";

export const MIN_EXP_LEVEL = 200;
export const MAX_EXP_LEVEL = 300;

export type IconRef =
  | { type: "item" | "skill"; id: string; shadow?: boolean }
  | { type: "erda-skill"; id: string }
  | { type: "mark"; id: string }
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
  targetLevel: number;
  currentPercent: number;
  monsterLevel: number;
  monsterBaseExp: number;
  hourlyKillCount: number;
}

export interface MonsterExpResult {
  monsterLevelBonus: number;
  buffMultiplier: number;
  normalExp: number;
  hourlyExp: number;
  hoursToTarget: number;
}

interface LevelResourceRow {
  level: number;
  exp: number;
}

/** EXP per unit of an event resource, by character level. The `id` is what both the Daily / Weekly
 *  simulator and the Resources breakdown look a table up with. */
interface ResourceTable {
  id: string;
  rows: LevelResourceRow[];
}

/** One figure in the Resources breakdown. `detail` names which variant of the source it is (reward
 *  tier, box grade, day of the week) and is absent when its group produces only one figure. */
export interface BreakdownValue {
  id: string;
  detail?: string;
  exp: number;
}

/** One source, with every figure it produces stacked under a single icon and name. */
export interface BreakdownGroup {
  id: string;
  label: string;
  icon?: IconRef;
  /** Set on the first group of a run to break the grid and label what follows. */
  heading?: string;
  values: BreakdownValue[];
}

export interface BreakdownSection {
  id: string;
  title: string;
  /** Level this section's first source unlocks at. Every section is listed at every level, so one
   *  the character can't reach yet renders as locked rather than vanishing and taking the pick
   *  with it (a half-typed "2" would otherwise reassign the Resource dropdown). */
  minLevel: number;
  note?: string;
  /** The knobs this section's card renders above its groups. */
  controls: BreakdownControlId[];
  groups: BreakdownGroup[];
}

/** One column of a Resources chart. `kind` picks the workspace's formatter. */
export interface ResourceChartColumn {
  label: string;
  kind: "exp" | "percent" | "count";
  /** Heading spanning a run of columns, for charts holding more than one source. */
  group?: string;
  /** Hover text explaining the column. */
  title?: string;
}

export interface ResourceChartRow {
  level: number;
  /** One cell per column; `null` where the level cannot use that source yet. */
  cells: (number | null)[];
}

/** The per-level table under a Resources section, for scanning how a source scales across levels
 *  where the section's cards price only the level typed in. */
export interface ResourceChart {
  /** Heading over the table, for sections that show more than one. */
  title?: string;
  columns: ResourceChartColumn[];
  rows: ResourceChartRow[];
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

export interface MonsterParkOption {
  id: string;
  label: string;
  minLevel: number;
  exp: number;
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
  /** A Monster Park dungeon id, or "" for whichever eligible dungeon gives the most EXP. */
  monsterParkId: string;
  monsterParkRuns: number;
  /** "flat" uses `customDailyExp` as-is; "hourly" derives it from farming rate x hours. */
  customDailyMode: "flat" | "hourly";
  customDailyExp: number;
  customHourlyExp: number;
  customHoursPerDay: number;
  weeklyRuns: Record<string, number>;
  mpeRuns: number;
  epicDungeonId: string;
  epicDungeonMultiplier: number;
  strawberryTickets: number;
  mechaberryTickets: number;
  expressBoosters: number;
  expTickets: number;
  advancedExpTickets: number;
  punchKingScore: number;
  doubleUpPoints: number;
  luxeSaunaHours: number;
  potions: Record<string, number>;
  arcaneRiverBonus: number;
  grandisBonus: number;
  monsterParkBonus: number;
  /** Event EXP multiplier on Epic Dungeon rewards (1 = no event). Recent events run 1.5x - 4x. */
  epicDungeonExpMultiplier: number;
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
  { id: "union-artifact", label: "Legion Artifact (Passive EXP)", icon: { type: "item", id: "05681074" }, options: levelPercentOptions([1, 2, 3, 4, 6, 7, 8, 9, 10, 12]) },
  { id: "champion-renown", label: "Champion's Renown", icon: { type: "skill", id: "80003819" }, options: levelPercentOptions([5, 10, 15, 20, 25]) },
  { id: "kinship", label: "Kinship Ring", icon: { type: "item", id: "01114000" }, options: [
    { label: "N/A", value: 0 },
    { label: "+10% EXP (Player wears ring)", value: 10 },
    { label: "+15% EXP (1 extra ring wearer in party)", value: 15 },
    { label: "+20% EXP (2 extra ring wearers in party)", value: 20 },
    { label: "+25% EXP (3 extra ring wearers in party)", value: 25 },
    { label: "+30% EXP (4 extra ring wearers in party)", value: 30 },
  ] },
  { id: "caretaker", label: "Caretaker's Buff", icon: { type: "skill", id: "80011827" }, options: levelPercentOptions([5, 6, 7, 8, 9, 10]) },
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
  { id: "legion-board", label: "Legion Board EXP (0-10%)", max: 10, step: 0.25 },
  { id: "event-title", label: "Events / Titles / Other (%)", max: 100, step: 0.5 },
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

const MECHABERRY_FARM_MIN_LEVEL = 280;

const MECHABERRY_FARM = [
  3265600060800, 3310161465600, 3349939507200, 3394838304000, 3435009811200, 5148589248000, 5208577228800, 5276305267200,
  5344448947200, 5405227660800, 6580266950400, 6653978073600, 6737444313600, 6821411625600, 6896248444800, 6896248444800,
  6896248444800, 6896248444800, 6896248444800, 6896248444800,
];

// EXP per 5 seconds of sauna time, so decimal hour inputs convert to whole units (720/hour).
const LUXE_SAUNA = [
  5346684, 5491905, 5638805, 5802605, 5952159, 6102525, 6254625, 6424059, 6578705, 6734109,
  13433496, 13740621, 14085880, 14397934, 14712805, 15065809, 15385663, 15745113, 16068705, 16433842,
  24069889, 24602356, 25081234, 25621323, 26108056, 26656000, 27209467, 27705689, 28266778, 28831600,
  30594745, 31193167, 31793845, 32332378, 32942156, 33557923, 34175712, 34728167, 35354978, 35985445,
  36619645, 37769978, 38422689, 39002523, 39663867, 40328634, 40997134, 41669367, 42346812, 43027989,
  45484989, 46203112, 46924734, 47650012, 48380967, 49113400, 49853300, 50594756, 51431412, 52184223,
  218558394, 221703400, 224853474, 228025714, 231598474, 260527240, 264127740, 267719120, 271775494, 275408040,
  288082560, 301751414, 305679094, 322512207, 327168094, 367716374, 372351360, 377594600, 382278480, 387564027,
  435230087, 441169107, 446470614, 452454600, 457808547, 514642234, 520638507, 527408460, 534219960, 540295274,
  607153614, 613954854, 621656187, 629403754, 636308860, 714807867, 723513414, 732270134, 740069000, 748876894,
];

const LUXE_SAUNA_UNITS_PER_HOUR = 720;

/** Monsters one Golden Strawberry Farm ticket spawns, which is what the table's per-monster EXP
 *  has to be multiplied by to price a ticket. */
const STRAWBERRY_KILLS_PER_TICKET = 1200;

/** High Mountain's weekly base EXP by character level (Lv. 260+). Angler Company and Nightmare
 *  Paradise are exact 1.5x / 2x multiples of it, so they derive off this one table. */
const HIGH_MOUNTAIN_BASE = [
  260900000000, 264700000000, 268500000000, 272200000000, 276500000000, 311000000000, 315300000000, 319600000000,
  324500000000, 328800000000, 369800000000, 375200000000, 380100000000, 385000000000, 390600000000, 439000000000,
  444500000000, 450800000000, 456400000000, 462700000000, 519600000000, 526700000000, 533000000000, 540100000000,
  546500000000, 614400000000, 621500000000, 629600000000, 637700000000, 645000000000, 724800000000, 732900000000,
  742100000000, 751400000000, 759600000000, 759600000000, 759600000000, 759600000000, 759600000000, 759600000000,
];

/** Base monster EXP by character level: Arcane River covers Lv. 200-259, Grandis Lv. 260-299.
 *  Champion Double Up, Haste Fever Time, and Express Booster all scale off these. */
const BASE_MONSTER_EXP_ARCANE = [
  98708, 101389, 104101, 107125, 109886, 112662, 115470, 118598, 121453, 124322,
  248003, 253673, 260047, 265808, 271621, 278138, 284043, 290679, 296653, 303394,
  309470, 316316, 322473, 329417, 335675, 342720, 349836, 356216, 363430, 370692,
  393361, 401055, 408778, 415702, 423542, 431459, 439402, 446505, 454564, 462670,
  470824, 485614, 494006, 501461, 509964, 518511, 527106, 535749, 544459, 553217,
  584807, 594040, 603318, 612643, 622041, 631458, 640971, 650504, 661261, 670940,
];

const BASE_MONSTER_EXP_GRANDIS = [
  1725461, 1750290, 1775159, 1800203, 1828409, 2056794, 2085219, 2113572, 2145596, 2174274,
  2445217, 2481337, 2513634, 2546149, 2582906, 2903024, 2939616, 2981010, 3017988, 3059716,
  3436027, 3482914, 3524768, 3572010, 3614278, 4062965, 4110304, 4163751, 4217526, 4265489,
  4793318, 4847012, 4907812, 4968977, 5023491, 5643220, 5711948, 5781080, 5842650, 5912186,
];

/** Haste Inferno monsters are worth 7x the level's base monster EXP, and one Champion Double Up
 *  point is worth 3.5x. */
const HASTE_INFERNO_MULTIPLIER = 7;
const CHAMPION_DOUBLE_UP_MULTIPLIER = 3.5;

/** Kills a single Haste Fever Time can yield. */
const HASTE_INFERNO_MAX_KILLS = 10000;

/** One Express Booster spawns 19 waves of 10 flames, and only Grandis monsters drop them. */
const EXPRESS_BOOSTER_FLAMES = 190;
export const EXPRESS_BOOSTER_MIN_LEVEL = 260;

/** The level past which Express Booster Flames stop scaling. */
const EXPRESS_BOOSTER_MAX_LEVEL = 294;

/** EXP per Express Booster Flame, a band-stepped multiple of the level's base monster EXP.
 *  Lv. 265 is a measured value rather than a band fit, and past Lv. 294 the flames flatten to the
 *  lowest band on the Lv. 294 base, so the value drops there. Both quirks match the source table. */
function expressBoosterFlameExp(level: number): number {
  const base = BASE_MONSTER_EXP_GRANDIS[level - 260] ?? 0;
  if (level === 265) return 454179859;
  if (level <= 264) return Math.round(192 * base);
  if (level <= 269) return Math.round(220.8 * base);
  if (level <= 279) return Math.round(268.8 * base);
  if (level <= 289) return Math.round(240 * base);
  if (level <= EXPRESS_BOOSTER_MAX_LEVEL) return Math.round(220.8 * base);
  return Math.round(192 * BASE_MONSTER_EXP_GRANDIS[EXPRESS_BOOSTER_MAX_LEVEL - 260]);
}

const HASTE_INFERNO_EXP = [...BASE_MONSTER_EXP_ARCANE, ...BASE_MONSTER_EXP_GRANDIS].map(
  (base) => base * HASTE_INFERNO_MULTIPLIER,
);

const EXPRESS_BOOSTER_EXP = BASE_MONSTER_EXP_GRANDIS.map(
  (_, index) => expressBoosterFlameExp(260 + index) * EXPRESS_BOOSTER_FLAMES,
);

/** Per-unit EXP for every event resource, from the local EXP Ticket workbook (after KMS CROWN /
 *  GMS Ride the Lightning). None of these take EXP buffs, which is why they are looked up by level
 *  instead of run through `calculateBuffMultiplier`. */
const RESOURCE_TABLES: ResourceTable[] = [
  { id: "exp-ticket", rows: makeLevelRows(200, EXP_TICKET_CROWN) },
  { id: "advanced-exp-ticket", rows: makeLevelRows(260, ADV_EXP_TICKET) },
  { id: "punch-king", rows: makeLevelRows(200, PUNCH_KING) },
  { id: "strawberry-farm", rows: makeLevelRows(200, STRAWBERRY_FARM) },
  { id: "mechaberry-farm", rows: makeLevelRows(MECHABERRY_FARM_MIN_LEVEL, MECHABERRY_FARM) },
  { id: "luxe-sauna", rows: makeLevelRows(200, LUXE_SAUNA) },
  { id: "express-booster", rows: makeLevelRows(260, EXPRESS_BOOSTER_EXP) },
  { id: "haste-inferno", rows: makeLevelRows(200, HASTE_INFERNO_EXP) },
];

/* Icons for the sources that have no options array of their own to hang one off. Ids come from
 * manifests/v270/item.json (or mob.json / ui-mark.json) and are named here so the Daily / Weekly
 * inputs and the Resources breakdown can't drift apart. */
export const SOL_ERDA_ICON: IconRef = { type: "item", id: "05066300" }; // Sol Erda, the Epic Dungeon reward
export const MONSTER_PARK_ICON: IconRef = { type: "item", id: "05252030" }; // Monster Park entry ticket
export const EXPRESS_BOOSTER_ICON: IconRef = { type: "mob", id: "9834700" }; // Intensifying Flame
export const HASTE_INFERNO_ICON: IconRef = { type: "mob", id: "9834720" }; // Haste Inferno A
export const EXP_TICKET_ICON: IconRef = { type: "item", id: "02637353" };
export const ADV_EXP_TICKET_ICON: IconRef = { type: "item", id: "02638500" };
export const PUNCH_KING_ICON: IconRef = { type: "item", id: "02637502" };
export const STRAWBERRY_FARM_ICON: IconRef = { type: "item", id: "02637501" };
export const MECHABERRY_FARM_ICON: IconRef = { type: "item", id: "02831285" };
export const HASTE_FEVER_ICON: IconRef = { type: "item", id: "02831711" }; // Haste Fever Time Booster
export const DOUBLE_UP_ICON: IconRef = { type: "item", id: "04310359" };
export const LUXE_SAUNA_ICON: IconRef = { type: "mark", id: "mvpResort" };

interface TreasureBox {
  id: string;
  label: string;
  minLevel: number;
  icon: IconRef;
  /** Grades in ascending order, each a flat multiple of the monster's base EXP. */
  grades: { grade: string; multiplier: number }[];
}

/** Hunting-ground treasure boxes. Each grade pays a fixed multiple of base monster EXP and takes no
 *  EXP buffs at all. The icons are the EXP Gem the box drops (manifests/v270/item.json); the boxes
 *  themselves have no item icon. */
const TREASURE_BOXES: TreasureBox[] = [
  {
    id: "pollo-frito",
    label: "Pollo / Frito Treasure Box",
    minLevel: 200,
    icon: { type: "item", id: "02024280" }, // Gold EXP Gem (Rare)
    grades: [
      { grade: "Rare", multiplier: 3000 },
      { grade: "Epic", multiplier: 6000 },
      { grade: "Unique", multiplier: 12000 },
      { grade: "Legendary", multiplier: 24000 },
    ],
  },
  {
    id: "especia",
    label: "Especia Treasure Box",
    minLevel: 230,
    icon: { type: "item", id: "02024284" }, // Diamond EXP Gem (Rare)
    grades: [
      { grade: "Rare", multiplier: 30000 },
      { grade: "Epic", multiplier: 60000 },
      { grade: "Unique", multiplier: 120000 },
      { grade: "Legendary", multiplier: 240000 },
    ],
  },
  {
    id: "haste",
    label: "Haste Treasure Box",
    minLevel: 200,
    icon: { type: "item", id: "02024324" }, // Haste EXP Gem (Rare)
    grades: [
      { grade: "Rare", multiplier: 24000 },
      { grade: "Epic", multiplier: 36000 },
      { grade: "Unique", multiplier: 54000 },
      { grade: "Legendary", multiplier: 81000 },
    ],
  },
];

export const DAILY_EXP_CONTENT: ExpContentOption[] = [
  { id: "rte", label: "Vanishing Journey", region: "Arcane River", minLevel: 200, exp: 0x2ba373a2, icon: { type: "item", id: "01712001" } },
  { id: "cci", label: "Chu Chu Island", region: "Arcane River", minLevel: 210, exp: 0x7fa71c86, icon: { type: "item", id: "01712002" } },
  { id: "lach", label: "Lachelein", region: "Arcane River", minLevel: 220, exp: 0xbe15c70a, icon: { type: "item", id: "01712003" } },
  { id: "arcana", label: "Arcana", region: "Arcane River", minLevel: 225, exp: 0xc5012937, icon: { type: "item", id: "01712004" } },
  { id: "moras", label: "Morass", region: "Arcane River", minLevel: 230, exp: 0x106283735, icon: { type: "item", id: "01712005" } },
  { id: "esf", label: "Esfera", region: "Arcane River", minLevel: 235, exp: 0x10e0f3132, icon: { type: "item", id: "01712006" } },
  // Tenebris has no Maple Guide crest, so the areas' world map marks stand in (ui-mark.json).
  { id: "mb", label: "Moonbridge", region: "Tenebris", minLevel: 245, exp: 0x1f4886ce7, icon: { type: "mark", id: "moonBridge" } },
  { id: "laby", label: "Labyrinth of Suffering", region: "Tenebris", minLevel: 250, exp: 905769e4, icon: { type: "mark", id: "TheLabyrinthOfSuffering" } },
  { id: "limen", label: "Limina", region: "Tenebris", minLevel: 255, exp: 0x261806f70, icon: { type: "mark", id: "Limen" } },
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

/** The Intermediate (Lv. 200+) and Advanced (Lv. 260+) Monster Park dungeons, ordered by EXP so
 *  the last dungeon a character qualifies for is also the most rewarding one. Entry levels are the
 *  gate's own minimums, not a 5-level ladder: Arcana opens at 230, not 225. */
export const MONSTER_PARK_OPTIONS: MonsterParkOption[] = [
  { id: "spirit-valley", label: "Spirit Valley", minLevel: 200, exp: 81300870 },
  { id: "vj", label: "Vanishing Journey", minLevel: 200, exp: 359915080 },
  { id: "cci", label: "Chu Chu Island", minLevel: 210, exp: 1285078680 },
  { id: "lach", label: "Lachelein", minLevel: 220, exp: 3217660990 },
  { id: "arcana", label: "Arcana", minLevel: 230, exp: 4707573370 },
  { id: "moras", label: "Morass", minLevel: 235, exp: 5993511040 },
  { id: "esf", label: "Esfera", minLevel: 240, exp: 6919667370 },
  { id: "sellas", label: "Sellas", minLevel: 245, exp: 8712814920 },
  { id: "mb", label: "Moonbridge", minLevel: 250, exp: 11716616500 },
  { id: "laby", label: "Labyrinth of Suffering", minLevel: 255, exp: 14058901000 },
  { id: "limen", label: "Limina", minLevel: 260, exp: 15552557400 },
  { id: "cern", label: "Cernium", minLevel: 260, exp: 37474604460 },
  { id: "arcs", label: "Arcus", minLevel: 265, exp: 44435446300 },
  { id: "odium", label: "Odium", minLevel: 270, exp: 52818835200 },
  { id: "sgl", label: "Shangri-La", minLevel: 275, exp: 76639838000 },
  { id: "arteria", label: "Arteria", minLevel: 280, exp: 107204032000 },
  { id: "carcion", label: "Carcion", minLevel: 285, exp: 156017856000 },
  { id: "tallahart", label: "Tallahart", minLevel: 290, exp: 218575316000 },
];

/** The most rewarding dungeon the level can enter, which is what a player would actually run. */
export function bestMonsterParkForLevel(level: number): MonsterParkOption | undefined {
  return MONSTER_PARK_OPTIONS.filter((park) => park.minLevel <= level).pop();
}

/** Falls back to the best available whenever the pinned dungeon is unset or out of reach, so a
 *  saved pick can never silently zero out Monster Park EXP. */
function resolveMonsterPark(level: number, parkId: string): MonsterParkOption | undefined {
  const pinned = MONSTER_PARK_OPTIONS.find((park) => park.id === parkId);
  return pinned && level >= pinned.minLevel ? pinned : bestMonsterParkForLevel(level);
}

const MPE_EXP_FACTORS = [
  2.04, 2.04, 2.04, 2.04, 2.04, 2.652, 2.652, 2.652, 2.652, 2.652,
  4.2, 4.2, 4.2, 4.2, 4.2, 5.376, 5.376, 5.376, 5.376, 5.376,
  5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832,
  5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832, 5.832,
];

/** Sunday's Monster Park bonus, and what one Extreme clear pays over its level factor. Extreme is a
 *  single clear a week, so the 5 is part of the payout, not a run count. */
const MONSTER_PARK_SUNDAY_MULTIPLIER = 1.5;
const MPE_CLEAR_FACTOR = 5;

/** Points a Punch King run is capped at. Per-point EXP comes from the `punch-king` table, never from
 *  base monster EXP x 900: that holds for most levels but not all, and the table plateaus from
 *  Lv. 290 up, so computing it overpays the top ten levels by as much as 39%. */
export const PUNCH_KING_MAX_POINTS = 1150;

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

/** Final level-difference EXP multiplier: the game scales every EXP source by how far the monster
 *  sits from the character. Within 10 levels it is a bonus (up to 1.2x at +/-1); past that it decays,
 *  and the decay is asymmetric. Values from the KMS table (MapleStory Wiki, "Experience").
 *  `diff > 0` means the monster is below the player (over-leveled farming). */
function monsterLevelBonus(playerLevel: number, monsterLevel: number): number {
  const diff = playerLevel - monsterLevel;
  const gap = Math.abs(diff);
  if (gap <= 1) return 1.2;
  if (gap <= 4) return 1.1;
  if (gap <= 9) return 1.05;
  if (gap === 10) return 1;
  return diff > 0 ? monsterBelowPenalty(diff) : monsterAbovePenalty(-diff);
}

/** Monster below the player (over-leveled). Shallow decay from 0.99 down to a 0.70 floor. */
function monsterBelowPenalty(diff: number): number {
  if (diff <= 20) return 0.99 - Math.floor((diff - 11) / 2) * 0.01; // 0.99..0.95, one step per 2 levels
  if (diff <= 39) return 0.89 - (diff - 21) * 0.01; // 0.89..0.71
  return 0.7;
}

/** Monster above the player (under-leveled). Steep decay from 0.99 down to a 0.10 floor. */
function monsterAbovePenalty(above: number): number {
  if (above <= 20) return 0.99 - (above - 11) * 0.01; // 0.99..0.90
  if (above <= 35) return 0.7 - (above - 21) * 0.04; // 0.70..0.14
  return 0.1;
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
  const target = clamp(Math.floor(input.targetLevel), MIN_EXP_LEVEL + 1, MAX_EXP_LEVEL);
  const currentExp = expForLevel(input.playerLevel) * clamp(input.currentPercent, 0, 99.999) / 100;
  const remainingExp = input.playerLevel >= target ? 0 : expNeededBetween(input.playerLevel, currentExp, target);
  return {
    monsterLevelBonus: levelBonus,
    buffMultiplier,
    normalExp,
    hourlyExp,
    hoursToTarget: hourlyExp > 0 ? remainingExp / hourlyExp : 0,
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
  let next = applyResourceUnits(
    state,
    Math.max(0, input.strawberryTickets) * STRAWBERRY_KILLS_PER_TICKET,
    "strawberry-farm",
    date,
  );
  next = applyResourceUnits(next, Math.max(0, input.luxeSaunaHours) * LUXE_SAUNA_UNITS_PER_HOUR, "luxe-sauna", date);
  if (next.level >= 260) {
    next = applyResourceUnits(next, Math.max(0, input.expressBoosters), "express-booster", date);
  }
  if (next.level >= 280) {
    next = applyResourceUnits(next, Math.max(0, input.mechaberryTickets), "mechaberry-farm", date);
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
  if (new Date(date).getUTCDay() === THURSDAY) {
    next = applySimulationExp(next, weeklyExpForState(next, input), date);
  }
  return next;
}

function dailyExpForState(state: SimulationState, input: AllInOneInput, date: number): number {
  return (
    selectedDailyExp(state.level, input) +
    monsterParkExpForLevel(state.level, input, date) +
    customDailyExp(input)
  );
}

/** The Custom Daily panel is either a flat EXP figure or a farming rate the player sustains for a
 *  set number of hours a day. Both land in the same daily bucket. */
export function customDailyExp(input: AllInOneInput): number {
  if (input.customDailyMode === "flat") return Math.max(0, input.customDailyExp);
  return Math.floor(Math.max(0, input.customHourlyExp) * Math.max(0, input.customHoursPerDay));
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
  // The simulator only asks for two bonuses, and its Tenebris dailies ride the Arcane River one.
  const bonuses: RegionBonus = {
    "Arcane River": input.arcaneRiverBonus,
    Tenebris: input.arcaneRiverBonus,
    Grandis: input.grandisBonus,
  };
  return DAILY_EXP_CONTENT.filter((daily) => input.dailyIds.includes(daily.id) && level >= daily.minLevel)
    .reduce((total, daily) => total + dailyExpWithBonus(daily, bonuses), 0);
}

function selectedWeeklyExp(level: number, weeklyRuns: Record<string, number>): number {
  return WEEKLY_EXP_CONTENT.reduce((total, weekly) => {
    const runs = clamp(Math.floor(weeklyRuns[weekly.id] ?? 0), 0, 3);
    return level >= weekly.minLevel ? total + weekly.exp * runs : total;
  }, 0);
}

/** Each region carries its own daily EXP bonus stat, so the caller supplies one percent per region. */
type RegionBonus = Record<ExpContentOption["region"], number>;

function dailyExpWithBonus(daily: ExpContentOption, bonuses: RegionBonus): number {
  return withBonus(daily.exp, 1, bonuses[daily.region]);
}

function monsterParkExpForLevel(level: number, input: AllInOneInput, date: number): number {
  const base = resolveMonsterPark(level, input.monsterParkId)?.exp ?? 0;
  const dayMultiplier = new Date(date).getUTCDay() === 0 ? MONSTER_PARK_SUNDAY_MULTIPLIER : 1;
  return withBonus(base, dayMultiplier, input.monsterParkBonus) * Math.max(0, input.monsterParkRuns);
}

/** `weeks` counts full weekly allowances, not individual runs. */
function monsterParkExtremeExpForLevel(level: number, weeks: number, bonusPercent: number): number {
  if (level < 260) return 0;
  const base = level * (MPE_EXP_FACTORS[level - 260] ?? MPE_EXP_FACTORS[MPE_EXP_FACTORS.length - 1]) * 100000000;
  return withBonus(base, MPE_CLEAR_FACTOR, bonusPercent * MPE_CLEAR_FACTOR) * Math.max(0, weeks);
}

function epicDungeonExpForLevel(level: number, input: AllInOneInput): number {
  const dungeon = EPIC_DUNGEON_OPTIONS.find((entry) => entry.id === input.epicDungeonId);
  if (!dungeon || level < dungeon.minLevel || input.epicDungeonMultiplier <= 0) return 0;
  const base = HIGH_MOUNTAIN_BASE[level - 260] ?? HIGH_MOUNTAIN_BASE[HIGH_MOUNTAIN_BASE.length - 1];
  const event = clamp(input.epicDungeonExpMultiplier, 1, 4);
  return Math.floor(base * dungeon.baseMultiplier * input.epicDungeonMultiplier * event);
}

function punchKingExpForLevel(level: number, score: number): number {
  // The tier multipliers are quoted against the monster's base EXP, and the table is 900x that.
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
  if (level < MIN_MONSTER_LEVEL) return 0;
  return Math.ceil(CHAMPION_DOUBLE_UP_MULTIPLIER * baseMonsterExpForLevel(level)) * Math.max(0, points);
}

/** The level's plain monster EXP, which Champion Double Up and the Treasure Boxes both scale off. */
function baseMonsterExpForLevel(level: number): number {
  const source = level < 260 ? BASE_MONSTER_EXP_ARCANE[level - 200] : BASE_MONSTER_EXP_GRANDIS[level - 260];
  return source ?? BASE_MONSTER_EXP_GRANDIS[BASE_MONSTER_EXP_GRANDIS.length - 1];
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
  const rows = RESOURCE_TABLES.find((resource) => resource.id === tableId)?.rows;
  if (!rows) return 0;
  return rows.find((row) => row.level === level)?.exp ?? rows[rows.length - 1]?.exp ?? 0;
}

/**
 * The plan window as UTC midnight timestamps. Parsing as UTC rather than local is what
 * keeps `date += DAY_MS` on an exact day boundary: stepping a fixed 86,400,000ms from a
 * *local* midnight drifts by an hour across a DST transition, which silently dropped a
 * whole day of EXP from any window spanning one. It also puts the weekday checks on the
 * same clock as the game's Thursday 00:00 UTC reset.
 */
function normalizedDateRange(startDate: string, endDate: string): { start: number; end: number } {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = Date.parse(`${startDate}T00:00:00Z`) || today;
  const end = Date.parse(`${endDate}T00:00:00Z`) || start;
  return start <= end ? { start, end } : { start: end, end: start };
}

function countThursdays(start: number, end: number): number {
  let count = 0;
  for (let date = start; date <= end; date += DAY_MS) {
    if (new Date(date).getUTCDay() === THURSDAY) count += 1;
  }
  return count;
}

function expPercent(level: number, currentExp: number): number {
  return expForLevel(level) > 0 ? (currentExp / expForLevel(level)) * 100 : 0;
}

/* --------------------------------------------------------------------------------------------
 * Resources breakdown. What every GMS EXP source is worth at a given character level, section by
 * section, with the same knobs the game gives the player: region EXP bonuses, run counts, ticket
 * counts, and the monster level a drop-based source rolls against.
 *
 * GMS-only: no Singapore, Malaysia, Blood Moon Forest, or Sunday Maple. Figures are unbuffed,
 * because every source here either ignores EXP buffs outright or is quoted before them. Sources a
 * level cannot reach are dropped rather than shown as zero, and a section left with no groups is
 * dropped whole.
 * ------------------------------------------------------------------------------------------ */

/** Lowest and highest monster level the base-monster-EXP tables cover. */
export const MIN_MONSTER_LEVEL = 200;
export const MAX_MONSTER_LEVEL = 299;

/** Every knob a breakdown section can expose. The tab owns the state; the section names which of
 *  these it renders, so a control and the figure it drives can't drift apart. */
export type BreakdownControlId =
  | "arcaneRiverBonus"
  | "grandisBonus"
  | "epicDungeonBonus"
  | "treasureMonsterLevel"
  | "treasureBonus"
  | "monsterParkId"
  | "monsterParkRuns"
  | "monsterParkBonus"
  | "expTickets"
  | "punchKingPoints"
  | "strawberryTickets"
  | "strawberryBonus"
  | "mechaberryTickets"
  | "expressMonsterLevel"
  | "hasteMonsterLevel"
  | "hasteKills"
  | "saunaHours"
  | "doubleUpPoints";

export interface ResourceBreakdownInput {
  level: number;
  arcaneRiverBonus: number;
  grandisBonus: number;
  epicDungeonBonus: number;
  treasureMonsterLevel: number;
  treasureBonus: number;
  monsterParkId: string;
  monsterParkRuns: number;
  monsterParkBonus: number;
  expTickets: number;
  punchKingPoints: number;
  strawberryTickets: number;
  strawberryBonus: number;
  mechaberryTickets: number;
  expressMonsterLevel: number;
  hasteMonsterLevel: number;
  hasteKills: number;
  saunaHours: number;
  doubleUpPoints: number;
}

/** Monster levels open on the character's own level, the way they would be farming at level. */
export function defaultBreakdownInput(level: number): ResourceBreakdownInput {
  return {
    level,
    arcaneRiverBonus: 0,
    grandisBonus: 0,
    epicDungeonBonus: 0,
    treasureMonsterLevel: clamp(level, MIN_MONSTER_LEVEL, MAX_MONSTER_LEVEL),
    treasureBonus: 0,
    monsterParkId: "",
    monsterParkRuns: 1,
    monsterParkBonus: 0,
    expTickets: 1,
    punchKingPoints: PUNCH_KING_MAX_POINTS,
    strawberryTickets: 1,
    strawberryBonus: 0,
    mechaberryTickets: 1,
    expressMonsterLevel: clamp(level, EXPRESS_BOOSTER_MIN_LEVEL, MAX_MONSTER_LEVEL),
    hasteMonsterLevel: clamp(level, MIN_MONSTER_LEVEL, MAX_MONSTER_LEVEL),
    hasteKills: HASTE_INFERNO_MAX_KILLS,
    saunaHours: 1,
    doubleUpPoints: 1,
  };
}

/** Lowest gate in an options array, so a section's `minLevel` can't drift from the filter that
 *  actually drops its sources. */
function lowestLevel(options: { minLevel: number }[]): number {
  return Math.min(...options.map((option) => option.minLevel));
}

/** Every resource, in picker order. The list is deliberately level-independent: sections the level
 *  can't reach come back empty and render locked, so typing a level never rewrites the pick. */
export function buildResourceBreakdown(input: ResourceBreakdownInput): BreakdownSection[] {
  return [
    dailySection(input),
    weeklySection(input.level),
    epicDungeonSection(input),
    growthPotionSection(input.level),
    treasureBoxSection(input),
    monsterParkSection(input),
    expTicketSection(input),
    punchKingSection(input),
    strawberryFarmSection(input),
    mechaberryFarmSection(input),
    expressBoosterSection(input),
    hasteFeverSection(input),
    afkSection(input),
    doubleUpSection(input),
  ];
}

/** A percent bonus that adds to a base multiplier rather than compounding with it, which is how
 *  every EXP bonus here behaves: 5x rewards with +20% pays 5.2x base, not 6x. */
function withBonus(base: number, multiplier: number, bonusPercent: number): number {
  return Math.ceil(base * (multiplier + Math.max(0, bonusPercent) / 100));
}

function dailySection(input: ResourceBreakdownInput): BreakdownSection {
  const bonuses: RegionBonus = {
    "Arcane River": input.arcaneRiverBonus,
    Tenebris: input.arcaneRiverBonus,
    Grandis: input.grandisBonus,
  };
  let region = "";
  return {
    id: "dailies",
    title: "Dailies",
    minLevel: lowestLevel(DAILY_EXP_CONTENT),
    note: "Arcane River, Tenebris and Grandis symbol dailies, per clear.",
    controls: ["arcaneRiverBonus", "grandisBonus"],
    groups: DAILY_EXP_CONTENT.filter((daily) => input.level >= daily.minLevel).map((daily) => {
      // Dailies run in region order, so the first of each region opens that region's row band.
      const heading = daily.region === region ? undefined : daily.region;
      region = daily.region;
      return {
        id: daily.id,
        label: daily.label,
        icon: daily.icon,
        heading,
        values: [{ id: daily.id, exp: dailyExpWithBonus(daily, bonuses) }],
      };
    }),
  };
}

function weeklySection(level: number): BreakdownSection {
  return {
    id: "weeklies",
    title: "Arcane River Weeklies",
    minLevel: lowestLevel(WEEKLY_EXP_CONTENT),
    note: "Per run, up to three runs a week.",
    controls: [],
    groups: WEEKLY_EXP_CONTENT.filter((weekly) => level >= weekly.minLevel).map((weekly) => ({
      id: weekly.id,
      label: weekly.label,
      icon: weekly.icon,
      values: [{ id: weekly.id, exp: weekly.exp }],
    })),
  };
}

const EPIC_REWARD_TIERS = [1, 5, 9];

function epicDungeonSection(input: ResourceBreakdownInput): BreakdownSection {
  const base = HIGH_MOUNTAIN_BASE[input.level - 260] ?? HIGH_MOUNTAIN_BASE[HIGH_MOUNTAIN_BASE.length - 1];
  return {
    id: "epic-dungeon",
    title: "Epic Dungeon",
    minLevel: lowestLevel(EPIC_DUNGEON_OPTIONS),
    note: "One weekly clear, by reward tier.",
    controls: ["epicDungeonBonus"],
    groups: EPIC_DUNGEON_OPTIONS.filter((dungeon) => input.level >= dungeon.minLevel).map((dungeon) => ({
      id: dungeon.id,
      label: dungeon.label,
      icon: SOL_ERDA_ICON,
      values: EPIC_REWARD_TIERS.map((tier) => ({
        id: `${dungeon.id}-${tier}`,
        detail: `${tier}x rewards`,
        exp: withBonus(base * dungeon.baseMultiplier, tier, input.epicDungeonBonus),
      })),
    })),
  };
}

function growthPotionSection(level: number): BreakdownSection {
  return {
    id: "growth-potions",
    title: "Growth Potions",
    minLevel: MIN_EXP_LEVEL,
    note: "One potion is a full level, capped at the potion's top level.",
    controls: [],
    groups: GROWTH_POTION_OPTIONS.map((potion) => ({
      id: potion.id,
      label: potion.label,
      icon: potion.icon,
      values: [
        {
          id: potion.id,
          detail: `Lv. ${potion.minLevel}-${potion.maxLevel}`,
          exp: expForLevel(Math.min(level, potion.maxLevel)),
        },
      ],
    })),
  };
}

function treasureBoxSection(input: ResourceBreakdownInput): BreakdownSection {
  const base = baseMonsterExpForLevel(input.treasureMonsterLevel);
  return {
    id: "treasure-boxes",
    title: "Treasure Boxes",
    minLevel: lowestLevel(TREASURE_BOXES),
    note: "A flat multiple of the monster's base EXP.",
    controls: ["treasureMonsterLevel", "treasureBonus"],
    groups: TREASURE_BOXES.filter((box) => input.level >= box.minLevel).map((box) => ({
      id: box.id,
      label: box.label,
      icon: box.icon,
      values: box.grades.map((grade) => ({
        id: `${box.id}-${grade.grade}`,
        detail: grade.grade,
        exp: withBonus(base * grade.multiplier, 1, input.treasureBonus),
      })),
    })),
  };
}

/** Extreme rides along here because it shares the Monster Park EXP bonus stat. Only that bonus
 *  reaches it: the dungeon pick and run count are the normal park's, since Extreme is one fixed
 *  dungeon on a fixed weekly allowance. */
function monsterParkSection(input: ResourceBreakdownInput): BreakdownSection {
  const park = resolveMonsterPark(input.level, input.monsterParkId);
  const groups: BreakdownGroup[] = [];
  if (park) {
    groups.push({
      id: park.id,
      label: park.label,
      icon: MONSTER_PARK_ICON,
      values: [
        { id: "weekday", detail: "Mon-Sat", exp: monsterParkRunExp(park.exp, 1, input) },
        {
          id: "sunday",
          detail: "Sunday",
          exp: monsterParkRunExp(park.exp, MONSTER_PARK_SUNDAY_MULTIPLIER, input),
        },
      ],
    });
  }
  const extremeWeekly = monsterParkExtremeExpForLevel(input.level, 1, input.monsterParkBonus);
  if (extremeWeekly > 0) {
    groups.push({
      id: "mpe",
      label: "Monster Park Extreme",
      icon: MONSTER_PARK_ICON,
      values: [{ id: "mpe-week", detail: "One clear a week", exp: extremeWeekly }],
    });
  }
  return {
    id: "monster-park",
    title: "Monster Park",
    minLevel: lowestLevel(MONSTER_PARK_OPTIONS),
    note: "Sunday pays 1.5x. Extreme clears once a week.",
    controls: ["monsterParkId", "monsterParkRuns", "monsterParkBonus"],
    groups,
  };
}

/** The run count multiplies the normal park only, which is why Extreme does not call this. */
function monsterParkRunExp(base: number, dayMultiplier: number, input: ResourceBreakdownInput): number {
  return withBonus(base, dayMultiplier, input.monsterParkBonus) * Math.max(0, input.monsterParkRuns);
}

function expTicketSection(input: ResourceBreakdownInput): BreakdownSection {
  const tickets = Math.max(0, input.expTickets);
  const groups: BreakdownGroup[] = [
    {
      id: "exp-ticket",
      label: "EXP Ticket",
      icon: EXP_TICKET_ICON,
      values: [{ id: "exp-ticket", exp: resourceExpWithFallback("exp-ticket", input.level) * tickets }],
    },
  ];
  if (input.level >= 260) {
    groups.push({
      id: "advanced-exp-ticket",
      label: "Advanced EXP Ticket",
      icon: ADV_EXP_TICKET_ICON,
      values: [
        { id: "advanced-exp-ticket", exp: resourceExpWithFallback("advanced-exp-ticket", input.level) * tickets },
      ],
    });
  }
  return {
    id: "exp-tickets",
    title: "EXP Tickets",
    minLevel: MIN_EXP_LEVEL,
    note: "Per ticket used.",
    controls: ["expTickets"],
    groups,
  };
}

function punchKingSection(input: ResourceBreakdownInput): BreakdownSection {
  const perPoint = resourceExpWithFallback("punch-king", input.level);
  return {
    id: "punch-king",
    title: "EXP Punch King",
    minLevel: MIN_EXP_LEVEL,
    note: `Spiegelmann's Golden Carriage, max ${formatCount(PUNCH_KING_MAX_POINTS)} points a run.`,
    controls: ["punchKingPoints"],
    groups: [
      {
        id: "punch-king",
        label: "EXP Punch King",
        icon: PUNCH_KING_ICON,
        values: [{ id: "golden", exp: perPoint * Math.max(0, input.punchKingPoints) }],
      },
    ],
  };
}

function strawberryFarmSection(input: ResourceBreakdownInput): BreakdownSection {
  const perTicket = resourceExpWithFallback("strawberry-farm", input.level) * STRAWBERRY_KILLS_PER_TICKET;
  return {
    id: "strawberry-farm",
    title: "Golden Strawberry Farm",
    minLevel: MIN_EXP_LEVEL,
    note: `Per ticket used. Affected by EXP multipliers.`,
    controls: ["strawberryTickets", "strawberryBonus"],
    groups: [
      {
        id: "strawberry-farm",
        label: "Golden Strawberry Farm",
        icon: STRAWBERRY_FARM_ICON,
        values: [
          {
            id: "strawberry-farm",
            exp: withBonus(perTicket, 1, input.strawberryBonus) * Math.max(0, input.strawberryTickets),
          },
        ],
      },
    ],
  };
}

function mechaberryFarmSection(input: ResourceBreakdownInput): BreakdownSection {
  return {
    id: "mechaberry-farm",
    title: "Mechaberry Farm",
    minLevel: MECHABERRY_FARM_MIN_LEVEL,
    note: "Per ticket used. NOT affected by EXP multipliers.",
    controls: ["mechaberryTickets"],
    groups:
      input.level >= MECHABERRY_FARM_MIN_LEVEL
        ? [
            {
              id: "mechaberry-farm",
              label: "Mechaberry Farm",
              icon: MECHABERRY_FARM_ICON,
              values: [
                {
                  id: "mechaberry-farm",
                  exp: resourceExpWithFallback("mechaberry-farm", input.level) * Math.max(0, input.mechaberryTickets),
                },
              ],
            },
          ]
        : [],
  };
}

function expressBoosterSection(input: ResourceBreakdownInput): BreakdownSection {
  const perFlame = expressBoosterFlameExp(input.expressMonsterLevel);
  return {
    id: "express-booster",
    title: "Express Booster",
    minLevel: EXPRESS_BOOSTER_MIN_LEVEL,
    note: `10 flames a spawn, ${EXPRESS_BOOSTER_FLAMES} flames a booster.`,
    controls: ["expressMonsterLevel"],
    groups:
      input.level >= EXPRESS_BOOSTER_MIN_LEVEL
        ? [
            {
              id: "express-booster",
              label: "Express Booster Flame",
              icon: EXPRESS_BOOSTER_ICON,
              values: [
                { id: "express-flame", detail: "Per flame", exp: perFlame },
                { id: "express-booster", detail: "Per booster", exp: perFlame * EXPRESS_BOOSTER_FLAMES },
              ],
            },
          ]
        : [],
  };
}

function hasteFeverSection(input: ResourceBreakdownInput): BreakdownSection {
  const perKill = baseMonsterExpForLevel(input.hasteMonsterLevel) * HASTE_INFERNO_MULTIPLIER;
  return {
    id: "haste-fever",
    title: "Haste Fever Time",
    minLevel: MIN_EXP_LEVEL,
    note: `${HASTE_INFERNO_MULTIPLIER}x the monster's base EXP a kill.`,
    controls: ["hasteMonsterLevel", "hasteKills"],
    groups: [
      {
        id: "haste-inferno",
        label: "Haste Inferno",
        icon: HASTE_INFERNO_ICON,
        values: [
          { id: "haste-kill", detail: "Per kill", exp: perKill },
          { id: "haste-total", detail: "Total", exp: perKill * Math.max(0, input.hasteKills) },
        ],
      },
    ],
  };
}

function afkSection(input: ResourceBreakdownInput): BreakdownSection {
  const perUnit = resourceExpWithFallback("luxe-sauna", input.level);
  return {
    id: "afk",
    title: "AFK Contents",
    minLevel: MIN_EXP_LEVEL,
    note: "Sauna EXP ticks every 5 seconds.",
    controls: ["saunaHours"],
    groups: [
      {
        id: "luxe-sauna",
        label: "Luxe Sauna / MVP Resort",
        icon: LUXE_SAUNA_ICON,
        values: [
          { id: "sauna-tick", detail: "Per 5 secs", exp: perUnit },
          {
            id: "sauna-total",
            detail: "Total",
            exp: perUnit * LUXE_SAUNA_UNITS_PER_HOUR * Math.max(0, input.saunaHours),
          },
        ],
      },
    ],
  };
}

function doubleUpSection(input: ResourceBreakdownInput): BreakdownSection {
  return {
    id: "double-up",
    title: "Champion Double Up",
    minLevel: MIN_EXP_LEVEL,
    note: `${CHAMPION_DOUBLE_UP_MULTIPLIER}x the level's base monster EXP a point.`,
    controls: ["doubleUpPoints"],
    groups: [
      {
        id: "double-up",
        label: "Champion Double Up",
        icon: DOUBLE_UP_ICON,
        values: [{ id: "double-up", exp: doubleUpExpForLevel(input.level, input.doubleUpPoints) }],
      },
    ],
  };
}

/** The charts under a section, keyed by section id. Sections priced off the level's own EXP or a
 *  handful of fixed figures (dailies, weeklies, potions, treasure boxes, Monster Park, Double Up)
 *  have no table worth scanning and get an empty list. Level-independent, so build once per pick. */
export function resourceChartsForSection(sectionId: string): ResourceChart[] {
  switch (sectionId) {
    case "exp-tickets":
      return [
        { title: "EXP Ticket", ...unitChart("exp-ticket", { unit: "Ticket" }) },
        { title: "Advanced EXP Ticket", ...unitChart("advanced-exp-ticket", { unit: "Ticket" }) },
      ];
    case "epic-dungeon":
      return [epicDungeonChart()];
    case "punch-king":
      return [
        unitChart("punch-king", {
          unit: "Point",
          batch: { label: "Run", units: PUNCH_KING_MAX_POINTS, title: `A full ${formatCount(PUNCH_KING_MAX_POINTS)}-point run` },
        }),
      ];
    case "strawberry-farm":
      return [unitChart("strawberry-farm", { unit: "Ticket", scale: STRAWBERRY_KILLS_PER_TICKET })];
    case "mechaberry-farm":
      return [unitChart("mechaberry-farm", { unit: "Ticket" })];
    case "express-booster":
      return [unitChart("express-booster", { unit: "Booster" })];
    case "haste-fever":
      return [
        unitChart("haste-inferno", {
          unit: "Kill",
          batch: { label: "Fever Time", units: HASTE_INFERNO_MAX_KILLS, title: `The ${formatCount(HASTE_INFERNO_MAX_KILLS)}-kill cap of one Haste Fever Time` },
        }),
      ];
    case "afk":
      return [
        unitChart("luxe-sauna", {
          unit: "5 Secs",
          batch: { label: "Hour", units: LUXE_SAUNA_UNITS_PER_HOUR, title: `${LUXE_SAUNA_UNITS_PER_HOUR} sauna ticks` },
        }),
      ];
    default:
      return [];
  }
}

interface UnitChartOptions {
  /** What one table row prices: "Ticket", "Point". */
  unit: string;
  /** Multiplies the table's per-row EXP when the unit is bigger than a row (a Strawberry Farm
   *  ticket is 1,200 kills). */
  scale?: number;
  /** A natural batch of units (a Punch King run, an hour in the sauna). When set, the share and
   *  to-level columns price the batch, since one unit is a negligible slice of a level. */
  batch?: { label: string; units: number; title: string };
}

/** Per-unit EXP by level with the level's share and how many it takes to level. */
function unitChart(tableId: string, { unit, scale = 1, batch }: UnitChartOptions): ResourceChart {
  const per = batch?.label ?? unit;
  const columns: ResourceChartColumn[] = [{ label: `EXP / ${unit}`, kind: "exp" }];
  if (batch) columns.push({ label: `EXP / ${batch.label}`, kind: "exp", title: batch.title });
  columns.push(
    { label: "% of Level", kind: "percent", title: `Share of the level one ${per.toLowerCase()} pays` },
    { label: `${per}s / Level`, kind: "count", title: `${per}s needed to gain one full level` },
  );
  const rows = (RESOURCE_TABLES.find((table) => table.id === tableId)?.rows ?? []).map(({ level, exp }) => {
    const perUnit = exp * scale;
    const perBatch = perUnit * (batch?.units ?? 1);
    const cells: (number | null)[] = [perUnit];
    if (batch) cells.push(perBatch);
    // Units are handed in whole, so round those up; a level rarely lands on a full batch, so
    // batches stay fractional.
    const toLevel = expForLevel(level) / Math.max(1, perBatch);
    cells.push(percentOfLevel(level, perBatch), batch ? toLevel : Math.ceil(toLevel));
    return { level, cells };
  });
  return { columns, rows };
}

/** Every dungeon side by side, one clear at each reward tier. Angler Company and Nightmare Paradise
 *  are fixed multiples of High Mountain, so its base table covers all three. */
function epicDungeonChart(): ResourceChart {
  const columns = EPIC_DUNGEON_OPTIONS.flatMap((dungeon) =>
    EPIC_REWARD_TIERS.map(
      (tier): ResourceChartColumn => ({
        group: dungeon.label,
        label: tier === 1 ? "Base" : `${tier}x`,
        kind: "exp",
        title: tier === 1 ? "One clear before the reward tier roll" : `One clear that rolls the ${tier}x reward tier`,
      }),
    ),
  );
  const rows = HIGH_MOUNTAIN_BASE.map((base, index) => {
    const level = 260 + index;
    return {
      level,
      cells: EPIC_DUNGEON_OPTIONS.flatMap((dungeon) =>
        EPIC_REWARD_TIERS.map((tier) => (level >= dungeon.minLevel ? Math.ceil(base * dungeon.baseMultiplier * tier) : null)),
      ),
    };
  });
  return { columns, rows };
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
