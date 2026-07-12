import type { LinkSkillId, LinkSkillsData, StoredCharacterRecord } from "../../model/charactersStore";

export interface LinkSkillDef {
  id: LinkSkillId;
  name: string;
  classes: string[];
  maxLevel: number;
  /** manifests/v269/skill.json id — pixel-verified 2026-07-01 against maplestorywiki. */
  iconId: string;
}

export const LINK_SKILLS: LinkSkillDef[] = [
  { id: "unfairAdvantage",    name: "Unfair Advantage",    classes: ["Cadena"],                                    maxLevel: 3, iconId: "60020218" },
  { id: "tideOfBattle",       name: "Tide of Battle",      classes: ["Illium"],                                    maxLevel: 3, iconId: "150000017" },
  { id: "solus",              name: "Solus",               classes: ["Ark"],                                       maxLevel: 3, iconId: "150010241" },
  { id: "timeToPrepare",      name: "Time to Prepare",     classes: ["Kain"],                                      maxLevel: 3, iconId: "60030241" },
  { id: "termsAndConditions", name: "Terms and Conditions",classes: ["Angelic Buster"],                            maxLevel: 3, iconId: "60011219" },
  { id: "elementalism",       name: "Elementalism",        classes: ["Kanna"],                                     maxLevel: 3, iconId: "40020002" },
  { id: "qiCultivation",      name: "Qi Cultivation",      classes: ["Mo Xuan"],                                   maxLevel: 3, iconId: "170000241" },
  { id: "bravado",            name: "Bravado",             classes: ["Hoyoung"],                                   maxLevel: 3, iconId: "160000001" },
  { id: "empiricalKnowledge", name: "Empirical Knowledge", classes: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop"], maxLevel: 9, iconId: "0000255" },
  // "Dual Blade" here is the player-facing display name (classSkillData.ts's displayName
  // override); CLASS_TO_SKILL below intentionally keys on Nexon's raw jobName "Blade
  // Master" instead, since that's what actually comes back from the API.
  { id: "thiefsCunning",      name: "Thief's Cunning",     classes: ["Night Lord", "Shadower", "Dual Blade"],      maxLevel: 9, iconId: "0000261" },
];

export function inferLinkLevel(level: number): number {
  if (level >= 210) return 3;
  if (level >= 120) return 2;
  if (level >= 70)  return 1;
  return 0;
}

/** nexonJobName → which link skill it contributes to. Shared by the setup step
 *  (roster autofill) and the read-only Legion panel (eligible-character grouping). */
export const CLASS_TO_SKILL: Record<string, LinkSkillId> = {
  "Cadena":           "unfairAdvantage",
  "Illium":           "tideOfBattle",
  "Ark":              "solus",
  "Kain":             "timeToPrepare",
  "Angelic Buster":   "termsAndConditions",
  "Kanna":            "elementalism",
  "Mo Xuan":          "qiCultivation",
  "Hoyoung":          "bravado",
  "Arch Mage (F/P)":  "empiricalKnowledge",
  "Arch Mage (I/L)":  "empiricalKnowledge",
  "Bishop":           "empiricalKnowledge",
  "Night Lord":       "thiefsCunning",
  "Shadower":         "thiefsCunning",
  "Blade Master":     "thiefsCunning",
};

/** Winning (highest-level) tracked character per class, keyed by the class's jobName. */
type ClassWinner = { name: string; level: number; contribution: number };

/** What the tracked roster proves each link skill is worth: per member class, only the
 *  single best tracked character of that class counts (link skill mastery is per-class,
 *  not per-character, so a second alt of an already-mastered class contributes nothing),
 *  then those per-class bests are summed across the skill's member classes. This is a
 *  lower bound on the true total, never an overstatement, which is what makes it safe to
 *  reconcile against a stored total with a plain max (see reconcileLinkSkills). */
export function computeLinkSkillsFromRoster(
  roster: StoredCharacterRecord[],
  worldId: number,
): { values: LinkSkillsData; sources: Partial<Record<LinkSkillId, string[]>> } {
  const sameWorld = roster.filter((c) => c.worldID === worldId);
  const bestByClass: Partial<Record<LinkSkillId, Record<string, ClassWinner>>> = {};

  for (const char of sameWorld) {
    const skillId = CLASS_TO_SKILL[char.jobName];
    if (!skillId) continue;
    const contribution = inferLinkLevel(char.level);
    if (contribution === 0) continue;
    const perClass = (bestByClass[skillId] ??= {});
    const existing = perClass[char.jobName];
    if (!existing || contribution > existing.contribution) {
      perClass[char.jobName] = { name: char.characterName, level: char.level, contribution };
    }
  }

  const values: LinkSkillsData = {};
  const sources: Partial<Record<LinkSkillId, string[]>> = {};
  for (const [skillId, perClass] of Object.entries(bestByClass)) {
    const winners = Object.values(perClass).toSorted((a, b) => a.name.localeCompare(b.name));
    values[skillId as LinkSkillId] = winners.reduce((sum, w) => sum + w.contribution, 0);
    sources[skillId as LinkSkillId] = winners.map((w) => `${w.name} (Lv ${w.level})`);
  }
  return { values, sources };
}

/** Reconciles a stored link skill total with what the current roster proves. Since
 *  computeLinkSkillsFromRoster is always a lower bound on the true total (tracking a
 *  subset of characters can't overstate a class's real mastery), a plain max is safe
 *  regardless of whether the stored number already accounted for these characters or
 *  came from untracked ones: it can only correct a stale total upward, never double
 *  count or erase untracked progress. */
export function reconcileLinkSkills(
  stored: LinkSkillsData | undefined,
  roster: StoredCharacterRecord[],
  worldId: number,
): LinkSkillsData {
  const { values: computed } = computeLinkSkillsFromRoster(roster, worldId);
  const result: LinkSkillsData = { ...stored };
  for (const [skillId, computedValue] of Object.entries(computed)) {
    const id = skillId as LinkSkillId;
    result[id] = Math.max(result[id] ?? 0, computedValue);
  }
  return result;
}
