/*
  MapleScouter's "Stat Efficiency" (스펙 효율) panel, ported from their result page's
  production bundle (chunk `app/[locale]/(pages)/result/page-*.js`: component `tu` is the
  Main Eff. tab, `tm` the Detail Eff. table, `tx` the meter).

  The raw numbers are NOT derived here, and aren't derived on their site either:
  `specEfficiency` is computed server-side and rides on the same POST /api/calc/dmg response
  scouterCache.ts already fetches and stores (see ScouterSpecEfficiency there for what each
  field means). Everything below is only the site's own presentation math on top of that
  table, ported verbatim -- including its quirks, which are deliberate and must not be
  "fixed" without a live re-check against maplescouter.com:

  - The boss-damage rows clamp to exactly 12/13 when each side's COMPOUNDED gain
    (`1/(1-x)-1`) beats the other side's LINEAR gain; only when that mutual dominance fails
    do they fall back to the plain linear ratio.
  - The ignore-DEF rows divide a linear numerator by a compounded denominator, and "worn"
    reads the negative "remove 40%" field while "added" reads 40x the per-1% field. That
    asymmetry is the point, not a bug: adding IED you don't have is worth less than the IED
    you're already wearing, so worn always reads higher.
  - `Math.round(x * 120) / 10` is scouter's own way of writing "x * 12, to 1 decimal".

  One row is ours rather than theirs: the archer "Critical Rate % (past 100%)" row in the
  Per Stat table. Scouter values excess crit rate the same way (`cridmgeff1 * criInP`) but
  only inside its link-skill ranking, never in this table -- see the Stat Optimizer's
  CLAUDE.md for why we apply it in both places.

  Verified by reproducing 7 of the 8 Main Eff. tiles exactly (12 / 13 / 3.1 / 5.1 / 10.1 /
  2.4 / 11.6) against maplescouter.com's own server-rendered HTML; the 8th (+2 per 9 Lv.)
  is the only one that reads a character level, which that page didn't expose.
*/

import type { ScouterSpecEfficiency } from "./scouterCache";
import { CLASS_SKILL_DATA } from "../setup/data/classSkillData";
import { resolveClassId } from "../setup/data/nexonJobMapping";
import { TRIPLE_STAT_FIELDS, type TripleStatFieldId } from "../setup/data/statFields";

// ── Stat naming ────────────────────────────────────────────────────────────────

/** Which stats this class's efficiency rows are actually about. MapleScouter keys its own
 *  main/sub/sub2 table off Korean class names; `requiredStats` already lists the same stats
 *  in the same order (main, sub, then sub2, with the ATT or MATT field last), so it names
 *  them without a second class table to keep in sync.
 *
 *  It does NOT agree on which classes HAVE a sub2, though: every LUK class lists STR here,
 *  while scouter grants a real sub2 only to Dual Blade / Shadower / Cadena / Xenon. So `sub2`
 *  is a name for a third stat, not a claim that it counts -- whether to show those rows comes
 *  from the response's own `ssub*eff1` fields, which scouter zeroes for everyone else. */
export interface EfficiencyStatLabels {
  /** "ATT" or "MATT" -- one field in the damage kernel, two names in-game. */
  atk: string;
  main: string;
  sub: string | null;
  sub2: string | null;
}

const TRIPLE_STAT_LABELS: Partial<Record<TripleStatFieldId, string>> =
  Object.fromEntries(TRIPLE_STAT_FIELDS.map((f) => [f.id, f.label]));

export function resolveEfficiencyStatLabels(jobName: string): EfficiencyStatLabels {
  const classId = resolveClassId(jobName);
  const required = (classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined)?.requiredStats ?? [];
  const usesMagic = required.includes("magicAtt");
  const statIds = required.filter((id): id is TripleStatFieldId => id !== "attackPower" && id !== "magicAtt" && id in TRIPLE_STAT_LABELS);
  const label = (index: number) => (statIds[index] ? TRIPLE_STAT_LABELS[statIds[index]] ?? null : null);
  return {
    atk: usesMagic ? "MATT" : "ATT",
    main: label(0) ?? "Main Stat",
    sub: label(1),
    sub2: label(2),
  };
}

// ── Main Eff. ──────────────────────────────────────────────────────────────────

export interface MainEfficiencyRow {
  id: string;
  /** What's being valued ("40% Boss DMG"), kept separate from `unit` so the panel can align
   *  every row's source, meter and answer into shared columns instead of one ragged sentence. */
  source: string;
  /** What `value` is counted in ("ATT %", "DEX"). */
  unit: string;
  value: number;
  /** Ends of the meter's scale, hardcoded per row on the site -- these are the ranges real
   *  characters land in, not a min/max the value is guaranteed to sit inside (it's clamped
   *  for positioning only). */
  min: number;
  max: number;
  /** Where the "typical" band sits on the meter: the middle 30% or the right half. */
  emphasis: "center" | "right";
  /** Lower is the desirable end, so the meter fills from the right instead. */
  reverse: boolean;
  hint: string;
}

/** Gain from stacking `amount` units of a stat whose per-unit efficiency is `eff`, under
 *  scouter's multiplicative reading of the table (`1/(1-x)-1`) rather than a flat `x`. */
function compounded(eff: number, amount: number): number {
  return 1 / (1 - amount * eff) - 1;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Boss damage vs. ATT%: pinned to the reference amount when neither side's compounded gain
 *  loses to the other's linear gain (i.e. they're equivalent within the site's own tolerance),
 *  otherwise the plain linear ratio. */
function bossDamagePerAtk(eff: ScouterSpecEfficiency, bossAmount: number, atkAmount: number): number {
  const equivalent =
    compounded(eff.atkPereff1, atkAmount) >= bossAmount * eff.dmgeff1 &&
    compounded(eff.dmgeff1, bossAmount) >= atkAmount * eff.atkPereff1;
  return equivalent ? atkAmount : round((bossAmount * eff.dmgeff1) / eff.atkPereff1, 1);
}

/** How many ATT% a chunk of ignore DEF is worth, measured against the same 12% ATT yardstick
 *  both boss-damage rows use. */
function iedPerAtk(eff: ScouterSpecEfficiency, iedGain: number): number {
  return round((iedGain / compounded(eff.atkPereff1, 12)) * 12, 1);
}

export function computeMainEfficiencies(
  eff: ScouterSpecEfficiency,
  level: number,
  labels: EfficiencyStatLabels,
): MainEfficiencyRow[] {
  const { atk, main } = labels;
  return [
    {
      id: "bd40", source: "40% Boss DMG", unit: `${atk} %`,
      value: bossDamagePerAtk(eff, 40, 12), min: 6, max: 18, emphasis: "center", reverse: false,
      hint: `40% Boss Damage buys you as much as this much ${atk}%. Above the middle of the range, Boss Damage lines are the better pickup; below it, ${atk}% is.`,
    },
    {
      id: "bd45", source: "45% Boss DMG", unit: `${atk} %`,
      value: bossDamagePerAtk(eff, 45, 13), min: 7, max: 19, emphasis: "center", reverse: false,
      hint: `Same comparison at the 45% Boss Damage / 13% ${atk} pairing potential lines come in.`,
    },
    {
      id: "iedAdded", source: "40% Added IED", unit: `${atk} %`,
      value: iedPerAtk(eff, 40 * eff.igreff1_380), min: 0, max: 24, emphasis: "right", reverse: true,
      hint: `What 40% Ignore DEF you don't have yet would be worth, in ${atk}%. Falls as your Ignore DEF climbs, so a low number means you already have enough.`,
    },
    {
      id: "iedWorn", source: "40% Worn IED", unit: `${atk} %`,
      value: iedPerAtk(eff, -eff.igreffminus40_380), min: 0, max: 24, emphasis: "right", reverse: true,
      hint: `What 40% of the Ignore DEF you're already wearing is worth, in ${atk}%: what you'd lose by dropping it. Always higher than Added.`,
    },
    {
      id: "levelStat", source: "+2 per 9 Lv.", unit: `${main} %`,
      value: round((2 * eff.mainStateff1 * Math.floor(level / 9)) / eff.mainStatPereff1, 2),
      min: 4, max: 12, emphasis: "center", reverse: false,
      hint: `What one "+2 ${main} per 9 character levels" line is worth at Lv. ${level}, in ${main}%.`,
    },
    {
      id: "critDamage", source: "3% Crit DMG", unit: `${main} %`,
      value: round((3 * eff.cridmgeff1) / eff.mainStatPereff1, 1), min: 0, max: 18, emphasis: "right", reverse: false,
      hint: `What one 3% Critical Damage line is worth, in ${main}%.`,
    },
    {
      id: "atkStat", source: `1 ${atk}`, unit: main,
      value: round(eff.atkeff1 / eff.mainStateff1, 2), min: 0, max: 6, emphasis: "right", reverse: true,
      hint: `How much ${main} a single point of ${atk} is worth: the exchange rate for flat lines.`,
    },
    {
      id: "allStat", source: "1% All Stat", unit: main,
      value: round(eff.allStatEff / eff.mainStateff1, 1), min: 4, max: 18, emphasis: "right", reverse: true,
      hint: `How much ${main} 1% All Stat is worth, counting the sub stat it also raises.`,
    },
  ];
}

/** Knob position along the meter, 0-100. Clamped so an off-scale value pins to an end
 *  rather than overflowing the track. */
export function meterPosition(row: MainEfficiencyRow): number {
  const clamped = Math.max(row.min, Math.min(row.max, row.value));
  const span = row.max - row.min;
  return row.reverse ? ((row.max - clamped) / span) * 100 : ((clamped - row.min) / span) * 100;
}

// ── Detail Eff. ────────────────────────────────────────────────────────────────

export interface DetailEfficiencyRow {
  id: string;
  label: string;
  /** Per-unit efficiency this row multiplies its amount by. */
  eff: number;
  defaultAmount: number;
}

/** Amounts are scouter's own defaults -- the sizes these lines actually roll at in-game
 *  (a 40% boss damage potential line, a 9% All Stat line, ...), so the table reads as a
 *  ready-made comparison before anything is typed. */
export function detailEfficiencyRows(
  eff: ScouterSpecEfficiency,
  labels: EfficiencyStatLabels,
  critRateToDmg: number,
): DetailEfficiencyRow[] {
  const { atk, main, sub, sub2 } = labels;
  const rows: DetailEfficiencyRow[] = [
    // 1% Damage and 1% Boss Damage are the same field in the damage kernel, so one row covers both.
    { id: "damage", label: "Boss Damage or Damage %", eff: eff.dmgeff1, defaultAmount: 40 },
    { id: "atk", label: `Flat ${atk}`, eff: eff.atkeff1, defaultAmount: 30 },
    { id: "atkPercent", label: `${atk} %`, eff: eff.atkPereff1, defaultAmount: 12 },
    { id: "critDamage", label: "Critical Damage %", eff: eff.cridmgeff1, defaultAmount: 8 },
    // Archers turn crit rate past the 100% cap into critical damage, so for them a crit
    // rate line is worth that fraction of one and belongs in the table. Every other class
    // gets nothing from the excess and gets no row -- which is also what scouter's own
    // ranking does, since it drops any row this branch would have left at zero.
    ...(critRateToDmg > 0
      ? [{
          id: "critRate",
          label: "Critical Rate % (past 100%)",
          eff: eff.cridmgeff1 * critRateToDmg,
          defaultAmount: 5,
        }]
      : []),
    // Scouter's two IED rows are the same stat measured against two different boss defence
    // ratings, not two different stats -- 300% and 380% PDR bracket where current bosses sit.
    { id: "ied300", label: "IED % (300% PDR boss)", eff: eff.igreff1, defaultAmount: 40 },
    { id: "ied380", label: "IED % (380% PDR boss)", eff: eff.igreff1_380, defaultAmount: 40 },
    { id: "main", label: main, eff: eff.mainStateff1, defaultAmount: 30 },
    { id: "mainPercent", label: `${main} %`, eff: eff.mainStatPereff1, defaultAmount: 12 },
    { id: "mainAbs", label: `${main} (% Not Applied)`, eff: eff.mainStatAbseff1, defaultAmount: 200 },
  ];
  if (sub) {
    rows.push(
      { id: "sub", label: sub, eff: eff.subStateff1, defaultAmount: 30 },
      { id: "subPercent", label: `${sub} %`, eff: eff.subStatPereff1, defaultAmount: 12 },
      { id: "subAbs", label: `${sub} (% Not Applied)`, eff: eff.subStatAbseff1, defaultAmount: 200 },
    );
  }
  // Zero here means the class has no third stat in scouter's own damage kernel, whatever
  // requiredStats happens to name -- see resolveEfficiencyStatLabels.
  if (sub2 && eff.ssubStateff1 !== 0) {
    rows.push(
      { id: "sub2", label: sub2, eff: eff.ssubStateff1, defaultAmount: 30 },
      { id: "sub2Percent", label: `${sub2} %`, eff: eff.ssubStatPereff1, defaultAmount: 12 },
      { id: "sub2Abs", label: `${sub2} (% Not Applied)`, eff: eff.ssubStatAbseff1, defaultAmount: 200 },
    );
  }
  rows.push({ id: "allStat", label: "All Stat %", eff: eff.allStatEff, defaultAmount: 9 });
  return rows;
}

export type EfficiencyUnitId =
  | "finalDamage" | "damage" | "atk" | "atkPercent" | "critDamage" | "main" | "mainPercent";

/** What each row's damage gain gets re-expressed in. Final damage is the table's native unit
 *  (the efficiencies already ARE final damage); every other unit divides by its own per-unit
 *  efficiency, turning the answer into "this much of that stat instead". */
export function efficiencyUnitOptions(labels: EfficiencyStatLabels): { value: EfficiencyUnitId; label: string }[] {
  return [
    { value: "finalDamage", label: "Final Damage %" },
    { value: "main", label: labels.main },
    { value: "mainPercent", label: `${labels.main} %` },
    { value: "damage", label: "Boss Damage %" },
    { value: "critDamage", label: "Critical Damage %" },
    { value: "atk", label: `Flat ${labels.atk}` },
    { value: "atkPercent", label: `${labels.atk} %` },
  ];
}

function unitDivisor(eff: ScouterSpecEfficiency, unit: EfficiencyUnitId): number {
  switch (unit) {
    case "finalDamage": return 1;
    case "damage": return eff.dmgeff1;
    case "atk": return eff.atkeff1;
    case "atkPercent": return eff.atkPereff1;
    case "critDamage": return eff.cridmgeff1;
    case "main": return eff.mainStateff1;
    case "mainPercent": return eff.mainStatPereff1;
  }
}

/** Final damage reads as a percentage to 3 decimals (the gains are small); every other unit
 *  is an amount of that stat, to 2. */
export function formatEfficiencyValue(
  eff: ScouterSpecEfficiency,
  row: DetailEfficiencyRow,
  amount: number,
  unit: EfficiencyUnitId,
): string {
  const gain = row.eff * amount;
  if (unit === "finalDamage") return `${(100 * gain).toFixed(3)}%`;
  return (gain / unitDivisor(eff, unit)).toFixed(2);
}
