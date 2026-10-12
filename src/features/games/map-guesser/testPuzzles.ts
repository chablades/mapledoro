/*
  TEMPORARY: fixed test puzzles for previewing MapGuessr before the map namespace is
  live on haku.network. Their art is bundled under public/map-guesser-test/.

  To remove once testing is done: delete this file and public/map-guesser-test/, then
  revert the lines marked TEMPORARY in MapGuesserWorkspace.tsx and lib/mapleResource.ts.
*/

import type { MapGuesserPuzzle } from "./puzzles";

export const TEST_PUZZLES: MapGuesserPuzzle[] = [
  { mapId: 101000000, street: "Ellinia", bgm: "Bgm02/WhenTheMorningComes" }, // Maple World
  { mapId: 410000500, street: "Cernium", bgm: "Bgm53/TheHolyLand" }, // Grandis
  { mapId: 450003000, street: "Lachelein", bgm: "Bgm46/LachelntheIllusionCity" }, // Arcane River
];
