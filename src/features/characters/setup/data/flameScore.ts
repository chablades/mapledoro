// A flame's "flame score": its stats converted into main stat by what each is worth to this
// character, so flames on different items compare on one number. The community version uses
// fixed rates (1 secondary = 0.1, 1 attack = 4, 1% All Stats = 15 main stat); this uses the
// character's own rates from the Scouter engine instead (the Stat Efficiency bookmark's
// numbers), so it matches their real stats rather than an average character's.

import type { ScouterSpecEfficiency } from "../../scouter/scouterResult";
import type { EfficiencyStatLabels } from "../../scouter/statEfficiency";
import { flameContributions, flameValue, type FlameItemInfo, type StoredFlameLine } from "./flameData";

// The flame line that adds to each main stat. Demon Avenger's main stat is HP, so its Max HP line
// counts point for point, the way INT does for a mage.
const FLAME_STAT_FOR: Partial<Record<string, string>> = { STR: "STR", DEX: "DEX", INT: "INT", LUK: "LUK", HP: "Max HP" };

/** The flame's score in main stat, unrounded, or null for a class whose main stat no flame line
 *  adds to. */
export function flameScore(
  lines: StoredFlameLine[],
  item: FlameItemInfo,
  eff: ScouterSpecEfficiency,
  labels: EfficiencyStatLabels,
): number | null {
  const mainLine = FLAME_STAT_FOR[labels.main];
  if (!mainLine || !(eff.mainStateff1 > 0)) return null;
  const attack = labels.atk === "MATT" ? "Magic ATT" : "Attack Power";
  // Each stat's worth in main stat. A stat missing here adds no damage (Defense, Speed, the
  // other class's attack, a third stat the class doesn't use).
  const worth = new Map<string, number>([
    [mainLine, eff.mainStateff1],
    [attack, eff.atkeff1],
    ["All Stats", eff.allStatEff],
    ["Boss Damage", eff.dmgeff1],
    ["Damage", eff.dmgeff1],
  ]);
  if (labels.sub) worth.set(labels.sub, eff.subStateff1);
  if (labels.sub2 && eff.ssubStateff1 > 0) worth.set(labels.sub2, eff.ssubStateff1);

  let score = 0;
  for (const { line, tier } of lines) {
    for (const [label, value] of flameContributions(line, flameValue(line, tier, item))) {
      score += value * ((worth.get(label) ?? 0) / eff.mainStateff1);
    }
  }
  return score;
}
