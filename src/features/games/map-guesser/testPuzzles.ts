/*
  TEMPORARY: fixed test puzzles for previewing MapGuessr before launch.

  To remove once testing is done: delete this file, then revert the lines marked
  TEMPORARY in MapGuesserWorkspace.tsx.
*/

import type { MapGuesserPuzzle } from "./puzzles";

export const TEST_PUZZLES: MapGuesserPuzzle[] = [
  { mapId: 101000000, street: "Ellinia", bgm: "Bgm02/WhenTheMorningComes" }, // Maple World
  { mapId: 410000500, street: "Cernium", bgm: "Bgm53/TheHolyLand" }, // Grandis
  { mapId: 450003000, street: "Lachelein", bgm: "Bgm46/LachelntheIllusionCity" }, // Arcane River
  // Random draws from the daily pool.
  { mapId: 221030640, street: "Inside the Mothership", bgm: "Bgm47/DancesWithAliens" }, // Corridor H01
  { mapId: 300010300, street: "Ellin Forest", bgm: "Bgm15/ElinCave" }, // Beyond the Cave
  { mapId: 410000560, street: "Cernium", bgm: "Bgm53/SeaWave" }, // Holy Land Vantage Point
];
