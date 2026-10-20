/*
  TEMPORARY: fixed test puzzles for previewing MapGuessr before launch.

  To remove once testing is done: delete this file, then revert the lines marked
  TEMPORARY in MapGuesserWorkspace.tsx.
*/

import type { MapGuesserPuzzle } from "./puzzles";

export const TEST_PUZZLES: MapGuesserPuzzle[] = [
  { mapId: 101000000, street: "Ellinia", bgm: "Bgm02/WhenTheMorningComes", reveal: [0.6, 0.3] }, // Maple World
  { mapId: 410000500, street: "Cernium", bgm: "Bgm53/TheHolyLand", reveal: [0.704, 0.586] }, // Grandis
  { mapId: 450003000, street: "Lachelein", bgm: "Bgm46/LachelntheIllusionCity", reveal: [0.688, 0.564] }, // Arcane River
  // Random draws from the daily pool.
  { mapId: 221030640, street: "Inside the Mothership", bgm: "Bgm47/DancesWithAliens", reveal: [0.21, 0.5] }, // Corridor H01
  { mapId: 300010300, street: "Ellin Forest", bgm: "Bgm15/ElinCave", reveal: [0.728, 0.225] }, // Beyond the Cave
  { mapId: 410000560, street: "Cernium", bgm: "Bgm53/SeaWave", reveal: [0.122, 0.77] }, // Holy Land Vantage Point
];
