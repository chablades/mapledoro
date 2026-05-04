export interface DailyTask {
  id: string;
  label: string;
}

export interface CounterTask {
  id: string;
  label: string;
  max: number;
}

export const ARCANE_SYMBOL_QUESTS: DailyTask[] = [
  { id: "vj", label: "Vanishing Journey" },
  { id: "chuchu", label: "Chu Chu Island" },
  { id: "lachelein", label: "Lachelein" },
  { id: "arcana", label: "Arcana" },
  { id: "morass", label: "Morass" },
  { id: "esfera", label: "Esfera" },
];

export const SACRED_SYMBOL_QUESTS: DailyTask[] = [
  { id: "cernium", label: "Cernium" },
  { id: "hotel_arcus", label: "Hotel Arcus" },
  { id: "odium", label: "Odium" },
  { id: "shangri_la", label: "Shangri-La" },
  { id: "arteria", label: "Arteria" },
  { id: "carcion", label: "Carcion" },
  { id: "tallahart", label: "Tallahart" },
];

export const DAILY_BOSSES: DailyTask[] = [
  { id: "zakum", label: "Normal Zakum" },
  { id: "hilla", label: "Normal Hilla" },
  { id: "von_bon", label: "Normal Von Bon" },
  { id: "crimson_queen", label: "Normal Crimson Queen" },
  { id: "pierre", label: "Normal Pierre" },
  { id: "vellum", label: "Normal Vellum" },
  { id: "chaos_horntail", label: "Chaos Horntail" },
  { id: "hard_von_leon", label: "Hard Von Leon" },
  { id: "pink_bean", label: "Normal Pink Bean" },
  { id: "magnus", label: "Normal Magnus" },
  { id: "arkarium", label: "Normal Arkarium" },
  { id: "papulatus", label: "Normal Papulatus" },
  { id: "hard_mori", label: "Hard Mori Ranmaru" },
  { id: "gollux", label: "Gollux" },
];

export const DAILY_CONTENT: CounterTask[] = [
  { id: "monster_park", label: "Monster Park", max: 7 },
  { id: "maple_tour", label: "Maple Tour", max: 7 },
];

export const DAILY_ACTIVITIES: DailyTask[] = [
  { id: "cpq_party", label: "CPQ (Party Voyages)" },
  { id: "cpq_solo", label: "CPQ (Solo Voyages)" },
];
