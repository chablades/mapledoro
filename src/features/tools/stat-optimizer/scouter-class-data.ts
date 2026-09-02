/*
  Per-class constants vendored from maplescouter.com's optimizer bundle (GMS
  table, chunk 4850 module 34527). The dpm* fields are scouter's measured
  class-passive contributions (skills active in combat but absent from the stat
  window); they are added into the damage kernel's buckets exactly like the
  live site does, so our marginal values (and therefore recommendations) match
  maplescouter's. main/sub/sub2 are the stats that enter the stat factor.
  Classes missing here (legacy/regional) fall back to ZERO_CLASS_CONSTANTS with
  main/sub derived from classSkillData.

  Refreshing these does NOT need the bundle re-read: every calc response carries the
  same numbers for the class it was asked about, at `calculatedData.myClassData`
  (`main`/`sub`/`sub2` plus `dpm_mainStat`, `dpm_atk`, `dpm_atkPer`, `dpm_bossDmg`,
  `dpm_ignoreGuard`, `dpm_criticalDmg`, and `criInP` for the archer classes in
  CRIT_RATE_TO_CRIT_DMG). POST any valid body with `stat.myClass` set to the Korean
  name from scouterClassNames.ts and read that field. Verified 2026-08-31: the values
  it returns for Sia Astelle, Hero and Kain reproduce their rows below exactly.
*/

import type { MainStatId } from "./damage-formula";

export interface ScouterClassConstants {
  main: MainStatId;
  sub: MainStatId | null;
  sub2: MainStatId | null;
  dpmMainStat: number;
  dpmAtk: number;
  dpmAtkPer: number;
  dpmBossDmg: number;
  dpmIgnoreGuard: number;
  dpmCritDmg: number;
}

export const ZERO_CLASS_CONSTANTS: Omit<ScouterClassConstants, "main" | "sub" | "sub2"> = {
  dpmMainStat: 0,
  dpmAtk: 0,
  dpmAtkPer: 0,
  dpmBossDmg: 0,
  dpmIgnoreGuard: 0,
  dpmCritDmg: 0,
};

export const SCOUTER_CLASS_CONSTANTS: Record<string, ScouterClassConstants> = {
  adele: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 77, dpmAtkPer: 0,
    dpmBossDmg: 55.5, dpmIgnoreGuard: 34.57, dpmCritDmg: 0,
  },
  angelic_buster: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0, dpmAtk: 178.7017656, dpmAtkPer: 0,
    dpmBossDmg: 135.3249153, dpmIgnoreGuard: 28.6, dpmCritDmg: 1,
  },
  aran: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.4462, dpmAtk: 82.2, dpmAtkPer: 0,
    dpmBossDmg: 70.0676698, dpmIgnoreGuard: 45, dpmCritDmg: 0,
  },
  arch_mage_f_p: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.4, dpmAtk: 0, dpmAtkPer: 5.2,
    dpmBossDmg: 57.70753119, dpmIgnoreGuard: 23.50318153, dpmCritDmg: 0,
  },
  arch_mage_i_l: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.4823, dpmAtk: 0, dpmAtkPer: 6.06,
    dpmBossDmg: 76, dpmIgnoreGuard: 21.83735235, dpmCritDmg: 13,
  },
  ark: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 131, dpmAtkPer: 0,
    dpmBossDmg: 150.2640698, dpmIgnoreGuard: 49.99548533, dpmCritDmg: 0,
  },
  battle_mage: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.4186, dpmAtk: 66.58702468, dpmAtkPer: 0,
    dpmBossDmg: 40.94626766, dpmIgnoreGuard: 34.55765805, dpmCritDmg: 0,
  },
  bishop: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.4806, dpmAtk: 10, dpmAtkPer: 6.11,
    dpmBossDmg: 102.1560731, dpmIgnoreGuard: 53.95853917, dpmCritDmg: 0,
  },
  blade_master: {
    main: "luk", sub: "dex", sub2: "str",
    dpmMainStat: 0.4626, dpmAtk: 18, dpmAtkPer: 0,
    dpmBossDmg: 20.2827129, dpmIgnoreGuard: 55.06, dpmCritDmg: 0,
  },
  blaster: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.3738, dpmAtk: 32, dpmAtkPer: 0,
    dpmBossDmg: 22.96744008, dpmIgnoreGuard: 47.43591022, dpmCritDmg: 0,
  },
  blaze_wizard: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0, dpmAtk: 46.31622461, dpmAtkPer: 0,
    dpmBossDmg: 103, dpmIgnoreGuard: 36.6, dpmCritDmg: 0,
  },
  bow_master: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.4822, dpmAtk: 100.2206348, dpmAtkPer: 12.9409958672148,
    dpmBossDmg: 80.2132207, dpmIgnoreGuard: 15.49756275, dpmCritDmg: 0,
  },
  buccaneer: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.92, dpmAtk: 166.9725804, dpmAtkPer: 0,
    dpmBossDmg: 95.5061416, dpmIgnoreGuard: 35.12046509, dpmCritDmg: 15,
  },
  cadena: {
    main: "luk", sub: "dex", sub2: "str",
    dpmMainStat: 0, dpmAtk: 7, dpmAtkPer: 0,
    dpmBossDmg: 35.83629025, dpmIgnoreGuard: 39.12796492, dpmCritDmg: 67,
  },
  cannoneer: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.8537, dpmAtk: 158.2069803, dpmAtkPer: 0,
    dpmBossDmg: 28.625, dpmIgnoreGuard: 39.36256382, dpmCritDmg: 0,
  },
  corsair: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.977, dpmAtk: 209.2166615, dpmAtkPer: 0,
    dpmBossDmg: 63.83206011, dpmIgnoreGuard: 43.47193958, dpmCritDmg: 5,
  },
  dark_knight: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.424665, dpmAtk: 66.77387533, dpmAtkPer: 0,
    dpmBossDmg: 59.35594892, dpmIgnoreGuard: 46.90668764, dpmCritDmg: 0,
  },
  dawn_warrior: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 66, dpmAtkPer: 0,
    dpmBossDmg: 77.2740965, dpmIgnoreGuard: 45.99510826, dpmCritDmg: 0,
  },
  demon_avenger: {
    main: "hp", sub: "str", sub2: null,
    dpmMainStat: 0, dpmAtk: 18, dpmAtkPer: 0,
    dpmBossDmg: 19.21308287, dpmIgnoreGuard: 63.47826087, dpmCritDmg: 0,
  },
  demon_slayer: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 30, dpmAtkPer: 0,
    dpmBossDmg: 81.600135, dpmIgnoreGuard: 62.43470987, dpmCritDmg: 0,
  },
  erel_light: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.41, dpmAtk: 18, dpmAtkPer: 0,
    dpmBossDmg: 40, dpmIgnoreGuard: 48.51, dpmCritDmg: 7,
  },
  evan: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.4195, dpmAtk: 40.32, dpmAtkPer: 0,
    dpmBossDmg: 51.11669542, dpmIgnoreGuard: 28.37659679, dpmCritDmg: 0,
  },
  hayato: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 35.5, dpmAtkPer: 0,
    dpmBossDmg: 78, dpmIgnoreGuard: 66, dpmCritDmg: 20.1,
  },
  hero: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.4832, dpmAtk: 62.90339581, dpmAtkPer: 0,
    dpmBossDmg: 56.5032221, dpmIgnoreGuard: 22.55382774, dpmCritDmg: 0,
  },
  hoyoung: {
    main: "luk", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 33, dpmAtkPer: 0,
    dpmBossDmg: 66.33964028, dpmIgnoreGuard: 36.69335485, dpmCritDmg: 0,
  },
  illium: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0, dpmAtk: 118, dpmAtkPer: 0,
    dpmBossDmg: 64.4985839, dpmIgnoreGuard: 32.08158657, dpmCritDmg: 0,
  },
  kain: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0, dpmAtk: 91, dpmAtkPer: 5.25519517349964,
    dpmBossDmg: 62.23781133, dpmIgnoreGuard: 16.3297, dpmCritDmg: 0,
  },
  kaiser: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 28.39811414, dpmAtkPer: 0,
    dpmBossDmg: 77.31857988, dpmIgnoreGuard: 34.40848989, dpmCritDmg: 0,
  },
  kanna: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0, dpmAtk: 35, dpmAtkPer: 0,
    dpmBossDmg: 70, dpmIgnoreGuard: 78, dpmCritDmg: 14,
  },
  khali: {
    main: "luk", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 73, dpmAtkPer: 0,
    dpmBossDmg: 65.11, dpmIgnoreGuard: 16, dpmCritDmg: 0,
  },
  kinesis: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.54, dpmAtk: 86, dpmAtkPer: 0,
    dpmBossDmg: 10, dpmIgnoreGuard: 28.44, dpmCritDmg: 5,
  },
  lara: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0, dpmAtk: 27, dpmAtkPer: 0,
    dpmBossDmg: 77.84603723, dpmIgnoreGuard: 22.30743059, dpmCritDmg: 3.448309067,
  },
  luminous: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.4583, dpmAtk: 45, dpmAtkPer: 0,
    dpmBossDmg: 77.34, dpmIgnoreGuard: 46.44440613, dpmCritDmg: 0,
  },
  lynn: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.42, dpmAtk: 27, dpmAtkPer: 0,
    dpmBossDmg: 41, dpmIgnoreGuard: 25, dpmCritDmg: 3.448309067,
  },
  marksman: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.4984, dpmAtk: 46, dpmAtkPer: 0,
    dpmBossDmg: 46.72687839, dpmIgnoreGuard: 43.9383536, dpmCritDmg: 0,
  },
  mechanic: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.476, dpmAtk: 133.0735861, dpmAtkPer: 0,
    dpmBossDmg: 36.9093547, dpmIgnoreGuard: 18.97645212, dpmCritDmg: 0,
  },
  mercedes: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.566, dpmAtk: 53.96596002, dpmAtkPer: 0,
    dpmBossDmg: 58.96630689, dpmIgnoreGuard: 57.72, dpmCritDmg: 0,
  },
  mihile: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 80, dpmAtkPer: 0,
    dpmBossDmg: 73.12652765, dpmIgnoreGuard: 43.52406214, dpmCritDmg: 0,
  },
  mo_xuan: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.3969, dpmAtk: 178, dpmAtkPer: 0,
    dpmBossDmg: 52, dpmIgnoreGuard: 30.71, dpmCritDmg: 0,
  },
  night_lord: {
    main: "luk", sub: "dex", sub2: null,
    dpmMainStat: 0.5167, dpmAtk: 10, dpmAtkPer: 0,
    dpmBossDmg: 47.71581648, dpmIgnoreGuard: 40.74078166, dpmCritDmg: 0,
  },
  night_walker: {
    main: "luk", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 127, dpmAtkPer: 0,
    dpmBossDmg: 56.50819749, dpmIgnoreGuard: 45.98, dpmCritDmg: 1,
  },
  paladin: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.4469, dpmAtk: 111, dpmAtkPer: 0,
    dpmBossDmg: 56.0912482, dpmIgnoreGuard: 68.03, dpmCritDmg: 0,
  },
  pathfinder: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.4826, dpmAtk: 51, dpmAtkPer: 0,
    dpmBossDmg: 52.41687017, dpmIgnoreGuard: 16.77, dpmCritDmg: 10,
  },
  phantom: {
    main: "luk", sub: "dex", sub2: null,
    dpmMainStat: 0.47, dpmAtk: 82, dpmAtkPer: 0,
    dpmBossDmg: 70.30881851, dpmIgnoreGuard: 35.2891078, dpmCritDmg: 4.121512887,
  },
  ren: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 0, dpmAtkPer: 0,
    dpmBossDmg: 20, dpmIgnoreGuard: 31.37, dpmCritDmg: 0,
  },
  shade: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0.4754, dpmAtk: 103.9213603, dpmAtkPer: 0,
    dpmBossDmg: 94.0162839, dpmIgnoreGuard: 36.86796951, dpmCritDmg: 0,
  },
  shadower: {
    main: "luk", sub: "dex", sub2: "str",
    dpmMainStat: 0.44, dpmAtk: 30, dpmAtkPer: 0,
    dpmBossDmg: 45.30717363, dpmIgnoreGuard: 49.35674889, dpmCritDmg: 3.241043911,
  },
  sia_astelle: {
    main: "int", sub: "luk", sub2: null,
    dpmMainStat: 0.44, dpmAtk: 0, dpmAtkPer: 0,
    dpmBossDmg: 57, dpmIgnoreGuard: 50, dpmCritDmg: 15,
  },
  thunder_breaker: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 145.1483111, dpmAtkPer: 0,
    dpmBossDmg: 113.0318341, dpmIgnoreGuard: 61.42, dpmCritDmg: 0,
  },
  wild_hunter: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0.4944, dpmAtk: 0, dpmAtkPer: 0,
    dpmBossDmg: 32.933, dpmIgnoreGuard: 15.84, dpmCritDmg: 0,
  },
  wind_archer: {
    main: "dex", sub: "str", sub2: null,
    dpmMainStat: 0, dpmAtk: 26, dpmAtkPer: 0,
    dpmBossDmg: 51.32823479, dpmIgnoreGuard: 21.19, dpmCritDmg: 0,
  },
  xenon: {
    main: "str", sub: "dex", sub2: "luk",
    dpmMainStat: 0.45, dpmAtk: 208.5839856, dpmAtkPer: 0,
    dpmBossDmg: 77.111317, dpmIgnoreGuard: 37, dpmCritDmg: 0,
  },
  zero: {
    main: "str", sub: "dex", sub2: null,
    dpmMainStat: 0, dpmAtk: 94.25, dpmAtkPer: 0,
    dpmBossDmg: -4, dpmIgnoreGuard: 69.23, dpmCritDmg: 22.75,
  },
};

/**
 * Critical damage each point of critical rate ABOVE 100% converts into, for the
 * archer classes whose passives do that (Vicious Shot and its equivalents).
 *
 * Vendored from scouter's own `criInP` field, which carries a value for exactly
 * these seven classes and for no other class in their 102-entry table. Scouter
 * applies it only in the link-skill efficiency ranking (`pct * cridmgeff1 * criInP`,
 * gated on the same seven names), never in its optimizer, because its crit rate
 * input is capped at 100 and its efficiency table has no crit rate bucket at all.
 * Our kernel applies it everywhere, which is a deliberate divergence -- see the
 * feature CLAUDE.md.
 */
export const CRIT_RATE_TO_CRIT_DMG: Record<string, number> = {
  bow_master: 0.2425,
  marksman: 0.235,
  pathfinder: 0.2817,
  wind_archer: 0.255,
  wild_hunter: 0.2678,
  mercedes: 0.294,
  kain: 0.263,
};

/** This class's excess-crit-rate conversion rate, 0 for everyone who has no passive for it. */
export function critRateToCritDmg(classId: string | undefined): number {
  return (classId ? CRIT_RATE_TO_CRIT_DMG[classId] : undefined) ?? 0;
}
