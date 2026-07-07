export const MIN_EXP_LEVEL = 200;
export const MAX_EXP_LEVEL = 300;

export type IconRef =
  | { type: "item" | "skill"; id: string; shadow?: boolean }
  | { type: "erda-skill"; id: string };

export interface CheckBuff {
  id: string;
  label: string;
  value: number;
  icon?: IconRef;
  maxLevel?: number;
}

export interface CheckBuffGroup {
  id: string;
  label: string;
  mode: "exclusive" | "multi";
  buffs: CheckBuff[];
}

export interface SelectBuff {
  id: string;
  label: string;
  icon?: IconRef;
  options: { label: string; value: number }[];
}

export interface InputBuff {
  id: string;
  label: string;
  max: number;
  step?: number;
  icon?: IconRef;
}

export interface BuffState {
  cash: string;
  use: string;
  ring: string;
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
  tnlPercent: number;
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
}

export interface AllInOneInput {
  startLevel: number;
  startPercent: number;
  targetLevel: number;
  expTickets: number;
  advancedExpTickets: number;
  punchKingPoints: number;
  strawberryMonsters: number;
  mechaberryRuns: number;
  customExp: number;
}

export interface AllInOneResult {
  level: number;
  percent: number;
  totalExp: number;
  remainingToTarget: number;
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

export const EXP_TO_NEXT_LEVEL = Object.fromEntries(
  EXP_TO_NEXT_LEVEL_VALUES.map((exp, index) => [MIN_EXP_LEVEL + index, exp]),
) as Record<number, number>;

export const CHECK_BUFF_GROUPS: CheckBuffGroup[] = [
  {
    id: "cash",
    label: "Cash Shop Coupon",
    mode: "exclusive",
    buffs: [
      { id: "none", label: "None", value: 1 },
      { id: "cash-2x", label: "2x Cash Shop Coupon (Lv. 250 or below)", value: 2, maxLevel: 250, icon: { type: "item", id: "05211046" } },
    ],
  },
  {
    id: "use",
    label: "Use Coupon",
    mode: "exclusive",
    buffs: [
      { id: "none", label: "None", value: 1 },
      { id: "use-2x", label: "2x EXP Coupon / Legion EXP", value: 2, icon: { type: "item", id: "02450064" } },
      { id: "use-3x", label: "3x EXP Coupon", value: 3, icon: { type: "item", id: "02450163" } },
      { id: "use-4x", label: "4x EXP Coupon", value: 4, icon: { type: "item", id: "02450187" } },
    ],
  },
  {
    id: "ring",
    label: "Ring of Torment",
    mode: "exclusive",
    buffs: [
      { id: "none", label: "None", value: 1 },
      { id: "torment", label: "Ring of Torment (x1.15 EXP)", value: 1.15, icon: { type: "item", id: "01114401" } },
    ],
  },
  {
    id: "additive",
    label: "Additive Buffs",
    mode: "multi",
    buffs: [
      { id: "eap", label: "EXP Accumulation Potion (+10%)", value: 10, icon: { type: "item", id: "02003550" } },
      { id: "small-eap", label: "Small Concentrated EXP Accumulation Potion (+20%)", value: 20, icon: { type: "item", id: "02003612" } },
      { id: "extreme-gold", label: "Extreme Gold Potion (+10%)", value: 10, icon: { type: "item", id: "02023128" } },
      { id: "vip-exp", label: "VIP Buff (EXP) (+15%)", value: 15, icon: { type: "item", id: "02024164", shadow: true } },
      { id: "mvp-50", label: "MVP 50% Bonus EXP (+50%)", value: 50, icon: { type: "item", id: "02023926" } },
      { id: "mvp-70", label: "MVP 70% Bonus EXP (+70%)", value: 70, icon: { type: "item", id: "02024275" } },
      { id: "exp-boost-ring-15", label: "EXP Boost Ring (+15%)", value: 15, icon: { type: "item", id: "01114326" } },
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
  { id: "evan-link", label: "Rune Persistence (Evan Link Skill)", icon: { type: "skill", id: "20010294" }, options: [
    { label: "N/A", value: 0 },
    { label: "Level 1 (Rune Duration +30%)", value: 1 },
    { label: "Level 2 (Rune Duration +50%)", value: 2 },
    { label: "Level 3 (Rune Duration +70%)", value: 3 },
  ] },
  { id: "rune-day", label: "Rune Day", icon: { type: "skill", id: "80003910" }, options: [
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
  { id: "spirit", label: "Pendant of the Spirit", icon: { type: "item", id: "01122017" }, options: percentOptions([0, 30]) },
  { id: "burning", label: "Burning Field", icon: { type: "item", id: "01114400" }, options: percentOptions([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) },
  { id: "roro", label: "Roro's Experience Ring", icon: { type: "skill", id: "80012753" }, options: [
    { label: "N/A", value: 0 },
    { label: "Level 1 (+12.5% EXP averaged)", value: 12.5 },
    { label: "Level 2 (+50% EXP averaged)", value: 50 },
    { label: "Level 3 (+112.5% EXP averaged)", value: 112.5 },
    { label: "Level 4 (+200% EXP)", value: 200 },
  ] },
  { id: "holy-symbol", label: "Holy Symbol", icon: { type: "skill", id: "400001020" }, options: [
    { label: "N/A", value: 0 },
    { label: "Decent Holy Symbol Level 1 (+20% EXP)", value: 20 },
    { label: "Decent Holy Symbol Level 30 (+35% EXP)", value: 35 },
    { label: "Holy Symbol (+50% EXP)", value: 50 },
    { label: "Holy Symbol + Experience (+70% EXP)", value: 70 },
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
  { id: "eluna", label: "Eluna Earrings / Pendant", icon: { type: "item", id: "01032269" }, options: percentOptions([0, 2, 4, 6, 8, 10]) },
  { id: "roll-of-the-dice", label: "Roll of the Dice", icon: { type: "skill", id: "35111013" }, options: percentOptions([0, 30, 40, 50]) },
];

export const LEVEL_INPUT_BUFFS: InputBuff[] = [
  { id: "hyper-stats", label: "Hyper Stats (EXP Obtained) Level (1-15)", max: 15, icon: { type: "erda-skill", id: "18112/rush/2" } },
  { id: "sol-janus", label: "Sol Janus Level (1-30)", max: 30, icon: { type: "skill", id: "500001000" } },
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
    description: "CROWN+ EXP ticket values per ticket from the local EXP Ticket workbook.",
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
    description: "After-CROWN High Mountain weekly EXP table.",
    kind: "epic",
    rows: makeEpicRows(260, HIGH_MOUNTAIN_BASE),
  },
  {
    id: "angler-company",
    label: "Epic Dungeon: Angler Company",
    description: "After-CROWN Angler Company weekly EXP table.",
    kind: "epic",
    rows: makeEpicRows(270, ANGLER_COMPANY_BASE),
  },
  {
    id: "nightmare-paradise",
    label: "Epic Dungeon: Nightmare Paradise",
    description: "After-CROWN Nightmare Paradise weekly EXP table.",
    kind: "epic",
    rows: makeEpicRows(280, NIGHTMARE_PARADISE_BASE),
  },
];

export const DEFAULT_BUFF_STATE: BuffState = {
  cash: "none",
  use: "none",
  ring: "none",
  additive: {},
  selects: Object.fromEntries(SELECT_BUFFS.map((buff) => [buff.id, 0])),
  inputs: Object.fromEntries([...INPUT_BUFFS, ...LEVEL_INPUT_BUFFS].map((buff) => [buff.id, 0])),
};

export function expForLevel(level: number): number {
  return EXP_TO_NEXT_LEVEL[level] ?? 0;
}

export function levelExpRemaining(level: number, percent: number): number {
  return Math.ceil(expForLevel(level) * (1 - clamp(percent, 0, 99.999) / 100));
}

export function monsterLevelBonus(playerLevel: number, monsterLevel: number): number {
  const diff = Math.abs(monsterLevel - playerLevel);
  if (diff <= 1) return 1.2;
  if (diff <= 4) return 1.1;
  if (diff <= 9) return 1.05;
  return 1;
}

export function calculateBuffMultiplier(state: BuffState, playerLevel: number): number {
  const cash = selectedCheckBuff("cash", state.cash);
  const use = selectedCheckBuff("use", state.use);
  const ring = selectedCheckBuff("ring", state.ring);
  const multiplicative = checkApplies(cash, playerLevel) * checkApplies(use, playerLevel) * checkApplies(ring, playerLevel);
  const additive = CHECK_BUFF_GROUPS.find((group) => group.id === "additive")?.buffs.reduce((sum, buff) => {
    return sum + (state.additive[buff.id] ? buff.value / 100 : 0);
  }, 0) ?? 0;
  const selectAdditive = SELECT_BUFFS.reduce((sum, buff) => {
    if (buff.id === "evan-link" || buff.id === "rune-day") return sum;
    return sum + (state.selects[buff.id] ?? 0) / 100;
  }, 0);
  const inputAdditive = INPUT_BUFFS.reduce((sum, buff) => sum + clamp(state.inputs[buff.id] ?? 0, 0, buff.max) / 100, 0);
  const levelInputAdditive = LEVEL_INPUT_BUFFS.reduce((sum, buff) => {
    const level = Math.floor(clamp(state.inputs[buff.id] ?? 0, 0, buff.max));
    if (buff.id === "hyper-stats") return sum + hyperStatExpBonus(level) / 100;
    if (buff.id === "sol-janus") return sum + solJanusExpBonus(level) / 100;
    return sum;
  }, 0);
  const runeAdditive = runeExpBonus(state.selects["evan-link"] ?? 0, state.selects["rune-day"] ?? 0) / 100;
  return multiplicative + additive + selectAdditive + inputAdditive + levelInputAdditive + runeAdditive;
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
    tnlPercent: percentOfLevel(input.playerLevel, normalExp),
  };
}

export function calculateAllInOne(input: AllInOneInput): AllInOneResult {
  let level = clamp(Math.floor(input.startLevel), MIN_EXP_LEVEL, MAX_EXP_LEVEL - 1);
  let currentExp = Math.floor(expForLevel(level) * clamp(input.startPercent, 0, 99.999) / 100);
  const totalExp = allInOneExpAtLevel(level, input);
  const applied = applyExp(level, currentExp, totalExp);
  level = applied.level;
  currentExp = applied.currentExp;
  const target = clamp(Math.floor(input.targetLevel), level + 1, MAX_EXP_LEVEL);
  return {
    level,
    percent: expForLevel(level) > 0 ? (currentExp / expForLevel(level)) * 100 : 0,
    totalExp,
    remainingToTarget: expNeededBetween(level, currentExp, target),
  };
}

export function resourceExpAtLevel(tableId: string, level: number): number {
  const table = RESOURCE_TABLES.find((resource) => resource.id === tableId);
  if (!table || table.kind !== "single-exp") return 0;
  const rows = table.rows as LevelResourceRow[];
  return rows.find((row) => row.level === level)?.exp ?? 0;
}

export function percentOfLevel(level: number, exp: number): number {
  const tnl = expForLevel(level);
  return tnl > 0 ? (exp / tnl) * 100 : 0;
}

function allInOneExpAtLevel(level: number, input: AllInOneInput): number {
  return (
    resourceExpAtLevel("exp-ticket", level) * Math.max(0, input.expTickets) +
    resourceExpAtLevel("advanced-exp-ticket", level) * Math.max(0, input.advancedExpTickets) +
    resourceExpAtLevel("punch-king", level) * Math.max(0, input.punchKingPoints) +
    resourceExpAtLevel("strawberry-farm", level) * Math.max(0, input.strawberryMonsters) +
    resourceExpAtLevel("mechaberry-farm", level) * Math.max(0, input.mechaberryRuns) +
    Math.max(0, input.customExp)
  );
}

function applyExp(startLevel: number, startExp: number, gainedExp: number): { level: number; currentExp: number } {
  let level = startLevel;
  let currentExp = startExp + gainedExp;
  while (level < MAX_EXP_LEVEL && currentExp >= expForLevel(level)) {
    currentExp -= expForLevel(level);
    level += 1;
  }
  return { level, currentExp: level >= MAX_EXP_LEVEL ? 0 : currentExp };
}

function expNeededBetween(level: number, currentExp: number, targetLevel: number): number {
  let required = Math.max(0, expForLevel(level) - currentExp);
  for (let nextLevel = level + 1; nextLevel < targetLevel; nextLevel += 1) {
    required += expForLevel(nextLevel);
  }
  return required;
}

function selectedCheckBuff(groupId: string, selectedId: string): CheckBuff | undefined {
  const group = CHECK_BUFF_GROUPS.find((entry) => entry.id === groupId);
  return group?.buffs.find((buff) => buff.id === selectedId);
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
  let regularBase = 20;
  let blessingBase = 40;
  if (runeDay === 1) {
    regularBase = 40;
    blessingBase = 60;
  }
  if (runeDay === 2) {
    regularBase = 60;
    blessingBase = 90;
  }
  return regularBase * evanMultiplier + blessingBase * evanMultiplier;
}

function hyperStatExpBonus(level: number): number {
  return [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10][level] ?? 0;
}

function solJanusExpBonus(level: number): number {
  return [0, 10, 12, 14, 16, 18, 20, 22, 24, 26, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 100][level] ?? 0;
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
