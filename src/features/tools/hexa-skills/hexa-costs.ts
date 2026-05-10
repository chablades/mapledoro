/**
 * HEXA Skill cost tables.
 *
 * Each array has 30 entries: index 0 = unlock (0→1), index 1 = 1→2, …, index 29 = 29→30.
 * Ascent skills share the Origin cost table.
 *
 * Source: Maple Info Corner (whackybeanz.as.r.appspot.com/calc/6th-job)
 */

export interface LevelCost {
  solErda: number;
  fragments: number;
}

// ── Origin / Ascent ──────────────────────────────────────────────────────────

export const ORIGIN_COSTS: LevelCost[] = [
  { solErda: 5, fragments: 100 },  // unlock (0→1)
  { solErda: 1, fragments: 30 },   // 1→2
  { solErda: 1, fragments: 35 },   // 2→3
  { solErda: 1, fragments: 40 },   // 3→4
  { solErda: 2, fragments: 45 },   // 4→5
  { solErda: 2, fragments: 50 },   // 5→6
  { solErda: 2, fragments: 55 },   // 6→7
  { solErda: 3, fragments: 60 },   // 7→8
  { solErda: 3, fragments: 65 },   // 8→9
  { solErda: 10, fragments: 200 }, // 9→10
  { solErda: 3, fragments: 80 },   // 10→11
  { solErda: 3, fragments: 90 },   // 11→12
  { solErda: 4, fragments: 100 },  // 12→13
  { solErda: 4, fragments: 110 },  // 13→14
  { solErda: 4, fragments: 120 },  // 14→15
  { solErda: 4, fragments: 130 },  // 15→16
  { solErda: 4, fragments: 140 },  // 16→17
  { solErda: 4, fragments: 150 },  // 17→18
  { solErda: 5, fragments: 160 },  // 18→19
  { solErda: 15, fragments: 350 }, // 19→20
  { solErda: 5, fragments: 170 },  // 20→21
  { solErda: 5, fragments: 180 },  // 21→22
  { solErda: 5, fragments: 190 },  // 22→23
  { solErda: 5, fragments: 200 },  // 23→24
  { solErda: 5, fragments: 210 },  // 24→25
  { solErda: 6, fragments: 220 },  // 25→26
  { solErda: 6, fragments: 230 },  // 26→27
  { solErda: 6, fragments: 240 },  // 27→28
  { solErda: 7, fragments: 250 },  // 28→29
  { solErda: 20, fragments: 500 }, // 29→30
];

// ── Enhancement ──────────────────────────────────────────────────────────────

export const ENHANCEMENT_COSTS: LevelCost[] = [
  { solErda: 4, fragments: 75 },   // unlock
  { solErda: 1, fragments: 23 },
  { solErda: 1, fragments: 27 },
  { solErda: 1, fragments: 30 },
  { solErda: 2, fragments: 34 },
  { solErda: 2, fragments: 38 },
  { solErda: 2, fragments: 42 },
  { solErda: 3, fragments: 45 },
  { solErda: 3, fragments: 49 },
  { solErda: 8, fragments: 150 },  // 9→10
  { solErda: 3, fragments: 60 },
  { solErda: 3, fragments: 68 },
  { solErda: 3, fragments: 75 },
  { solErda: 3, fragments: 83 },
  { solErda: 3, fragments: 90 },
  { solErda: 3, fragments: 98 },
  { solErda: 3, fragments: 105 },
  { solErda: 3, fragments: 113 },
  { solErda: 4, fragments: 120 },
  { solErda: 12, fragments: 263 }, // 19→20
  { solErda: 4, fragments: 128 },
  { solErda: 4, fragments: 135 },
  { solErda: 4, fragments: 143 },
  { solErda: 4, fragments: 150 },
  { solErda: 4, fragments: 158 },
  { solErda: 5, fragments: 165 },
  { solErda: 5, fragments: 173 },
  { solErda: 5, fragments: 180 },
  { solErda: 6, fragments: 188 },
  { solErda: 15, fragments: 375 }, // 29→30
];

// ── Mastery ──────────────────────────────────────────────────────────────────

export const MASTERY_COSTS: LevelCost[] = [
  { solErda: 3, fragments: 50 },   // unlock
  { solErda: 1, fragments: 15 },
  { solErda: 1, fragments: 18 },
  { solErda: 1, fragments: 20 },
  { solErda: 1, fragments: 23 },
  { solErda: 1, fragments: 25 },
  { solErda: 1, fragments: 28 },
  { solErda: 2, fragments: 30 },
  { solErda: 2, fragments: 33 },
  { solErda: 5, fragments: 100 },  // 9→10
  { solErda: 2, fragments: 40 },
  { solErda: 2, fragments: 45 },
  { solErda: 2, fragments: 50 },
  { solErda: 2, fragments: 55 },
  { solErda: 2, fragments: 60 },
  { solErda: 2, fragments: 65 },
  { solErda: 2, fragments: 70 },
  { solErda: 2, fragments: 75 },
  { solErda: 3, fragments: 80 },
  { solErda: 8, fragments: 175 },  // 19→20
  { solErda: 3, fragments: 85 },
  { solErda: 3, fragments: 90 },
  { solErda: 3, fragments: 95 },
  { solErda: 3, fragments: 100 },
  { solErda: 3, fragments: 105 },
  { solErda: 3, fragments: 110 },
  { solErda: 3, fragments: 115 },
  { solErda: 3, fragments: 120 },
  { solErda: 4, fragments: 125 },
  { solErda: 10, fragments: 250 }, // 29→30
];

// ── Common (Sol Janus) ───────────────────────────────────────────────────────

export const COMMON_COSTS: LevelCost[] = [
  { solErda: 7, fragments: 125 },  // unlock
  { solErda: 2, fragments: 38 },
  { solErda: 2, fragments: 44 },
  { solErda: 2, fragments: 50 },
  { solErda: 3, fragments: 57 },
  { solErda: 3, fragments: 63 },
  { solErda: 3, fragments: 69 },
  { solErda: 5, fragments: 75 },
  { solErda: 5, fragments: 82 },
  { solErda: 14, fragments: 300 }, // 9→10
  { solErda: 5, fragments: 110 },
  { solErda: 5, fragments: 124 },
  { solErda: 6, fragments: 138 },
  { solErda: 6, fragments: 152 },
  { solErda: 6, fragments: 165 },
  { solErda: 6, fragments: 179 },
  { solErda: 6, fragments: 193 },
  { solErda: 6, fragments: 207 },
  { solErda: 7, fragments: 220 },
  { solErda: 17, fragments: 525 }, // 19→20
  { solErda: 7, fragments: 234 },
  { solErda: 7, fragments: 248 },
  { solErda: 7, fragments: 262 },
  { solErda: 7, fragments: 275 },
  { solErda: 7, fragments: 289 },
  { solErda: 9, fragments: 303 },
  { solErda: 9, fragments: 317 },
  { solErda: 9, fragments: 330 },
  { solErda: 10, fragments: 344 },
  { solErda: 20, fragments: 750 }, // 29→30
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Total cost to go from `fromLevel` to `toLevel` (both 0-30). */
export function getCostRange(
  table: readonly LevelCost[],
  fromLevel: number,
  toLevel: number,
): LevelCost {
  let solErda = 0;
  let fragments = 0;
  for (let i = fromLevel; i < toLevel; i++) {
    solErda += table[i].solErda;
    fragments += table[i].fragments;
  }
  return { solErda, fragments };
}
