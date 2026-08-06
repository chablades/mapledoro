import type { LinkSkillId, LinkSkillsData, StoredCharacterRecord } from "../../model/charactersStore";
import { toCharacterKey } from "../../model/characterKeys";

// Lore branch grouping, confirmed against grandislibrary.com/classes -- used only to
// group the Legion panel's cards into collapsible sections, no gameplay meaning.
export type LinkSkillBranch =
  | "Explorer" | "Cygnus Knights" | "Heroes" | "Resistance" | "Nova" | "Sengoku"
  | "Flora" | "Anima" | "Jianghu" | "Shine" | "Other";

// Display order for the Legion panel's branch sections -- roughly release/prominence
// order, not alphabetical.
export const LINK_SKILL_BRANCH_ORDER: LinkSkillBranch[] = [
  "Explorer", "Cygnus Knights", "Heroes", "Resistance", "Nova", "Sengoku",
  "Flora", "Anima", "Jianghu", "Shine", "Other",
];

export interface LinkSkillDef {
  id: LinkSkillId;
  name: string;
  classes: string[];
  maxLevel: number;
  /** manifests/v269/skill.json id — pixel-verified against maplestorywiki. */
  iconId: string;
  branch: LinkSkillBranch;
}

export const LINK_SKILLS: LinkSkillDef[] = [
  { id: "unfairAdvantage",    name: "Unfair Advantage",    classes: ["Cadena"],                                    maxLevel: 3, iconId: "60020218", branch: "Nova" },
  { id: "tideOfBattle",       name: "Tide of Battle",      classes: ["Illium"],                                    maxLevel: 3, iconId: "150000017", branch: "Flora" },
  { id: "solus",              name: "Solus",               classes: ["Ark"],                                       maxLevel: 3, iconId: "150010241", branch: "Flora" },
  { id: "timeToPrepare",      name: "Time to Prepare",     classes: ["Kain"],                                      maxLevel: 3, iconId: "60030241", branch: "Nova" },
  { id: "termsAndConditions", name: "Terms and Conditions",classes: ["Angelic Buster"],                            maxLevel: 3, iconId: "60011219", branch: "Nova" },
  { id: "elementalism",       name: "Elementalism",        classes: ["Kanna"],                                     maxLevel: 3, iconId: "40020002", branch: "Sengoku" },
  { id: "qiCultivation",      name: "Qi Cultivation",      classes: ["Mo Xuan"],                                   maxLevel: 3, iconId: "170000241", branch: "Jianghu" },
  { id: "bravado",            name: "Bravado",             classes: ["Hoyoung"],                                   maxLevel: 3, iconId: "160000001", branch: "Anima" },
  { id: "empiricalKnowledge", name: "Empirical Knowledge", classes: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop"], maxLevel: 9, iconId: "0000255", branch: "Explorer" },
  // "Dual Blade" here is the player-facing display name (classSkillData.ts's displayName
  // override); CLASS_TO_SKILL below intentionally keys on Nexon's raw jobName "Blade
  // Master" instead, since that's what actually comes back from the API.
  { id: "thiefsCunning",      name: "Thief's Cunning",     classes: ["Night Lord", "Shadower", "Dual Blade"],      maxLevel: 9, iconId: "0000261", branch: "Explorer" },
  // Everything below researched against grandislibrary.com/content/link-skills and each
  // class's own page (grandislibrary.com/<branch>/<class>, live JSON embedded in the page)
  // -- names/maxLevel/grouping pixel- and text-verified per-class rather than trusted from
  // the site's own summary table, which turned out to have several stale groupings (e.g.
  // claimed all Heroes share "Close Call" and all non-Xenon Resistance demons share
  // "Hybrid Logic" -- both wrong; Aran/Combo Kill Blessing and Demon Slayer/Fury Unleashed
  // are actually solo). iconId cross-checked against manifests/v270/skill.json by exact
  // name. `branch` per-entry confirmed against grandislibrary.com/classes's own branch
  // headings directly (not guessed).
  { id: "nobleFire",             name: "Noble Fire",              classes: ["Adele"],                                                                          maxLevel: 3,  iconId: "150020241", branch: "Flora" },
  { id: "spiritOfFreedom",       name: "Spirit of Freedom",       classes: ["Wild Hunter", "Battle Mage", "Mechanic", "Blaster"],                                maxLevel: 12, iconId: "30000074", branch: "Resistance" },
  { id: "cygnusBlessing",        name: "Cygnus Blessing",         classes: ["Dawn Warrior", "Wind Archer", "Thunder Breaker", "Night Walker", "Blaze Wizard"],   maxLevel: 15, iconId: "10000255", branch: "Cygnus Knights" },
  { id: "adventurersCuriosity",  name: "Adventurer's Curiosity",  classes: ["Bow Master", "Marksman", "Pathfinder"],                                              maxLevel: 9,  iconId: "0000258", branch: "Explorer" },
  { id: "piratesBlessing",       name: "Pirate's Blessing",       classes: ["Corsair", "Buccaneer", "Cannoneer"],                                                 maxLevel: 9,  iconId: "0000264", branch: "Explorer" },
  { id: "invincibleBelief",      name: "Invincible Belief",       classes: ["Hero", "Paladin", "Dark Knight"],                                                    maxLevel: 9,  iconId: "0000252", branch: "Explorer" },
  { id: "wildRage",              name: "Wild Rage",               classes: ["Demon Avenger"],                                                                     maxLevel: 3,  iconId: "30010241", branch: "Resistance" },
  { id: "furyUnleashed",         name: "Fury Unleashed",          classes: ["Demon Slayer"],                                                                      maxLevel: 3,  iconId: "30010112", branch: "Resistance" },
  { id: "guidingStars",          name: "Guiding Stars",           classes: ["Sia Astelle", "Erel Light"],                                                         maxLevel: 6,  iconId: "180000001", branch: "Shine" },
  { id: "runePersistence",       name: "Rune Persistence",        classes: ["Evan"],                                                                              maxLevel: 3,  iconId: "20010294", branch: "Heroes" },
  { id: "moonlitBladeLearnings", name: "Moonlit Blade Learnings", classes: ["Hayato"],                                                                            maxLevel: 3,  iconId: "40010001", branch: "Sengoku" },
  { id: "innateGift",            name: "Innate Gift",             classes: ["Khali"],                                                                             maxLevel: 3,  iconId: "150030241", branch: "Flora" },
  { id: "judgment",              name: "Judgment",                classes: ["Kinesis"],                                                                           maxLevel: 3,  iconId: "140000292", branch: "Other" },
  { id: "naturesFriend",         name: "Nature's Friend",         classes: ["Lara"],                                                                              maxLevel: 3,  iconId: "160010001", branch: "Anima" },
  { id: "lightWash",             name: "Light Wash",              classes: ["Luminous"],                                                                          maxLevel: 3,  iconId: "20040218", branch: "Heroes" },
  { id: "spiritGuideBlessing",   name: "Spirit Guide Blessing",   classes: ["Lynn"],                                                                              maxLevel: 3,  iconId: "170010241", branch: "Jianghu" },
  { id: "knightsWatch",          name: "Knight's Watch",          classes: ["Mihile"],                                                                            maxLevel: 3,  iconId: "50001214", branch: "Cygnus Knights" },
  { id: "phantomInstinct",       name: "Phantom Instinct",        classes: ["Phantom"],                                                                           maxLevel: 3,  iconId: "20030204", branch: "Heroes" },
  { id: "groundedBody",          name: "Grounded Body",           classes: ["Ren"],                                                                               maxLevel: 3,  iconId: "160020001", branch: "Anima" },
  { id: "closeCall",             name: "Close Call",              classes: ["Shade"],                                                                             maxLevel: 3,  iconId: "20050286", branch: "Heroes" },
  { id: "rhinnesBlessing",       name: "Rhinne's Blessing",       classes: ["Zero"],                                                                              maxLevel: 6,  iconId: "80000110", branch: "Other" },
  { id: "comboKillBlessing",     name: "Combo Kill Blessing",     classes: ["Aran"],                                                                              maxLevel: 3,  iconId: "20000297", branch: "Heroes" },
  { id: "hybridLogic",           name: "Hybrid Logic",            classes: ["Xenon"],                                                                             maxLevel: 3,  iconId: "30020233", branch: "Resistance" },
  { id: "ironWill",              name: "Iron Will",               classes: ["Kaiser"],                                                                            maxLevel: 3,  iconId: "60000222", branch: "Nova" },
  // Grandis Library's page omits maxLevel for this one (typed "Active" unlike every other
  // link skill's "Passive") -- confirmed maxLevel 3 directly in-game.
  { id: "elvenBlessing",         name: "Elven Blessing",          classes: ["Mercedes"],                                                                          maxLevel: 3,  iconId: "20021110", branch: "Heroes" },
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
  "Adele":            "nobleFire",
  "Wild Hunter":      "spiritOfFreedom",
  "Battle Mage":      "spiritOfFreedom",
  "Mechanic":         "spiritOfFreedom",
  "Blaster":          "spiritOfFreedom",
  "Dawn Warrior":     "cygnusBlessing",
  "Wind Archer":      "cygnusBlessing",
  "Thunder Breaker":  "cygnusBlessing",
  "Night Walker":     "cygnusBlessing",
  "Blaze Wizard":     "cygnusBlessing",
  "Bow Master":       "adventurersCuriosity",
  "Marksman":         "adventurersCuriosity",
  "Pathfinder":       "adventurersCuriosity",
  "Corsair":          "piratesBlessing",
  "Buccaneer":        "piratesBlessing",
  "Cannon Master":    "piratesBlessing",
  "Hero":             "invincibleBelief",
  "Paladin":          "invincibleBelief",
  "Dark Knight":      "invincibleBelief",
  "Demon Avenger":    "wildRage",
  "Demon Slayer":     "furyUnleashed",
  "Sia Astelle":      "guidingStars",
  "Erel Light":       "guidingStars",
  "Evan":             "runePersistence",
  "Hayato":           "moonlitBladeLearnings",
  "Khali":            "innateGift",
  "Kinesis":          "judgment",
  "Lara":             "naturesFriend",
  "Luminous":         "lightWash",
  "Lynn":             "spiritGuideBlessing",
  "Mihile":           "knightsWatch",
  "Phantom":          "phantomInstinct",
  "Ren":              "groundedBody",
  "Shade":            "closeCall",
  "Zero":             "rhinnesBlessing",
  "Aran":             "comboKillBlessing",
  "Xenon":            "hybridLogic",
  "Kaiser":           "ironWill",
  "Mercedes":         "elvenBlessing",
};

/** Winning (highest-level) tracked character per class, keyed by the class's jobName. */
type ClassWinner = { character: StoredCharacterRecord; contribution: number };

/** What the tracked roster proves each link skill is worth: per member class, only the
 *  single best tracked character of that class counts (link skill mastery is per-class,
 *  not per-character, so a second alt of an already-mastered class contributes nothing),
 *  then those per-class bests are summed across the skill's member classes. This is a
 *  lower bound on the true total, never an overstatement, which is what makes it safe to
 *  use as a per-character FLOOR (never lowers a character's own stored value, only ever
 *  raises it towards this -- see linkSkillFloorsForCharacter/propagateLinkSkillFloors).
 *  `winners` is the actual per-class winning character records -- the only ones that
 *  really contribute -- for callers (LegionPanel's sprite row) that need more than just
 *  a formatted name/level string; `sources` derives its display strings from the same
 *  reduction so the two never drift apart. */
export function computeLinkSkillsFromRoster(
  roster: StoredCharacterRecord[],
  worldId: number,
): { values: LinkSkillsData; sources: Partial<Record<LinkSkillId, string[]>>; winners: Partial<Record<LinkSkillId, StoredCharacterRecord[]>> } {
  const sameWorld = roster.filter((c) => c.worldID === worldId);
  const bestByClass: Partial<Record<LinkSkillId, Record<string, ClassWinner>>> = {};

  for (const char of sameWorld) {
    const skillId = CLASS_TO_SKILL[char.jobName];
    if (!skillId) continue;
    const contribution = inferLinkLevel(char.level);
    if (contribution === 0) continue;
    const perClass = (bestByClass[skillId] ??= {});
    const existing = perClass[char.jobName];
    // Compare char.level, not contribution -- inferLinkLevel caps at 3 for any level
    // 210+, so a 295 and a 210 of the same class tie on contribution and the first one
    // seen would otherwise "win" and never get replaced by the genuinely higher character.
    // level is monotonic with contribution, so this can never pick a lower-contribution
    // character over a higher one either.
    if (!existing || char.level > existing.character.level) {
      perClass[char.jobName] = { character: char, contribution };
    }
  }

  const values: LinkSkillsData = {};
  const sources: Partial<Record<LinkSkillId, string[]>> = {};
  const winners: Partial<Record<LinkSkillId, StoredCharacterRecord[]>> = {};
  for (const [skillId, perClass] of Object.entries(bestByClass)) {
    const classWinners = Object.values(perClass).toSorted((a, b) => a.character.characterName.localeCompare(b.character.characterName));
    values[skillId as LinkSkillId] = classWinners.reduce((sum, w) => sum + w.contribution, 0);
    sources[skillId as LinkSkillId] = classWinners.map((w) => `${w.character.characterName} (Lv ${w.character.level})`);
    winners[skillId as LinkSkillId] = classWinners.map((w) => w.character);
  }
  return { values, sources, winners };
}

/** The best-known VALUE for each skill in `worldId`: the higher of (a) what tracked
 *  levels prove (computeLinkSkillsFromRoster) and (b) the highest value ANY same-world,
 *  same-skill character already has stored. (b) matters because a stored value can
 *  exceed what levels alone prove -- e.g. Bishop manually saved at 7 when its own level
 *  only proves 3 (say a 3rd, untracked magician is the source of the other 4). Two
 *  legitimate uses, both READ-ONLY suggestions, NEVER a hard `min`/floor on an editable
 *  field (see linkSkillFloorsForCharacter's own comment for why that trap is worse):
 *  (1) propagateLinkSkillFloors' auto-add WRITE target (Quick Setup finish, refresh,
 *  import) -- nobody's looking at a field to override, so writing the best-known value
 *  outright is safe; (2) LinkSkillsSetupStep's mount-time backfill SUGGESTION for a
 *  character not yet in the roster at all (a fresh Full/MapleScouter Setup search-and-
 *  open, before Finish) -- there's no confirmedRecord.linkSkills to seed the pre-fill
 *  from yet, so this is the only source of a useful starting number; the field itself
 *  stays freely editable down to the real level-only floor regardless. Never used to
 *  inflate ANY single character's own per-class CONTRIBUTION past inferLinkLevel's 0-3
 *  cap (that would let a multi-class skill's summed floor exceed its real maxLevel) --
 *  only ever compared against the skill's already-summed total, as a competing
 *  whole-skill claim. */
export function bestKnownLinkSkillFloors(roster: StoredCharacterRecord[], worldId: number): LinkSkillsData {
  const { values: levelFloors } = computeLinkSkillsFromRoster(roster, worldId);
  const floors: LinkSkillsData = { ...levelFloors };
  for (const character of roster) {
    if (character.worldID !== worldId) continue;
    const skillId = CLASS_TO_SKILL[character.jobName];
    if (!skillId) continue;
    const stored = character.linkSkills?.[skillId];
    if (stored === undefined) continue;
    floors[skillId] = Math.max(floors[skillId] ?? 0, stored);
  }
  return floors;
}

/** The HARD floor for ONE character's own link skill entry: level-math only, exactly
 *  what computeLinkSkillsFromRoster proves (Bishop@210 + F/P@210 = 6), regardless of what
 *  anyone has manually saved. Deliberately does NOT use bestKnownLinkSkillFloors -- a
 *  stored value (e.g. Bishop manually saved at 7) is a useful AUTOFILL SUGGESTION (see
 *  the mount-time backfill in LinkSkillsSetupStep.tsx) but must never become a hard
 *  constraint on what a human can type into their own field, or the input becomes a
 *  one-way ratchet with no way back down (Bishop alone typing 9 would floor itself at 9
 *  forever, since its own stored 9 would count as evidence against itself the moment this
 *  function re-ran on its own field). Not every skill computeLinkSkillsFromRoster returns
 *  applies to every character -- a Kanna's floor only ever covers Elementalism, never
 *  Empirical Knowledge, regardless of what other classes are tracked on the world -- so
 *  this filters the full per-world result down to just the skill(s) `character` itself
 *  can contribute to. Takes only jobName/worldID (a Pick, not the full record) so a
 *  caller mid-setup -- before the character it's asking about is a real tracked
 *  StoredCharacterRecord yet -- can pass a plain literal instead of fabricating/casting a
 *  fake full record. */
export function linkSkillFloorsForCharacter(
  character: Pick<StoredCharacterRecord, "jobName" | "worldID">,
  roster: StoredCharacterRecord[],
): LinkSkillsData {
  const ownSkillId = CLASS_TO_SKILL[character.jobName];
  if (!ownSkillId) return {};
  const { values } = computeLinkSkillsFromRoster(roster, character.worldID);
  const floor = values[ownSkillId];
  return floor !== undefined ? { [ownSkillId]: floor } : {};
}

/** Keeps same-world siblings' OWN stored link skill values in sync with the current
 *  best-known floor (see bestKnownLinkSkillFloors), without collapsing them back into
 *  one shared number. Mastery is genuinely shared/summed per skill (see
 *  computeLinkSkillsFromRoster), so when a new or leveled sibling raises a skill's true
 *  floor -- or an already-tracked sibling's OWN stored value turns out to be the highest
 *  known truth -- every other same-world character who already has a stored value for
 *  that skill needs to be re-floored too -- otherwise a character set up BEFORE the
 *  sibling existed is left stale below the new true minimum (e.g. Bishop set up alone
 *  floors Empirical Knowledge at 3 and saves 3; a same-world Arch Mage F/P set up
 *  afterward raises the true floor to 6; without this, Bishop's already-saved 3 would
 *  never get bumped to 6). This only ever RAISES a stored value to the new floor, never
 *  lowers one -- a character that already stores something at or above the floor
 *  (including one deliberately left below what a sibling could prove, like a Kanna
 *  intentionally at 0 for a link it hasn't equipped, which isn't touched because Kanna's
 *  own floor never involves Bravado's siblings at all) is left untouched. */
export function propagateLinkSkillFloors(
  roster: StoredCharacterRecord[],
  worldId: number,
  upsertFn: (c: StoredCharacterRecord) => void,
): void {
  const floors = bestKnownLinkSkillFloors(roster, worldId);
  for (const character of roster) {
    if (character.worldID !== worldId) continue;
    const ownSkillId = CLASS_TO_SKILL[character.jobName];
    if (!ownSkillId) continue;
    const floor = floors[ownSkillId];
    if (floor === undefined) continue;
    const stored = character.linkSkills?.[ownSkillId] ?? 0;
    if (stored >= floor) continue;
    upsertFn({
      ...character,
      linkSkills: { ...character.linkSkills, [ownSkillId]: floor },
    });
  }
}

/** Syncs every same-world sibling sharing `editedCharacter`'s skill to the EXACT value
 *  `editedCharacter` was just explicitly saved at -- both up AND down, unlike
 *  propagateLinkSkillFloors (raise-only). In-game, mastery of a link skill genuinely
 *  reads as one identical number across every character who can use it (live-tested: a
 *  same-world Bishop/Arch Mage F/P/Arch Mage I/L all display the SAME Empirical
 *  Knowledge total, never three different numbers) -- so once a human deliberately saves
 *  a value on ANY one of them, that's the new shared truth for all of them, not just a
 *  floor for the others to clear.
 *
 *  Only call this from a path where a human just explicitly finished the Link Skills
 *  step for `editedCharacter` -- NOT from an auto-add path (Quick Setup finish, refresh,
 *  import) that never gave anyone a chance to see/choose a value. An auto-add has no
 *  human decision to sync from, so it must stay raise-only (propagateLinkSkillFloors):
 *  silently overwriting Bishop's deliberately-chosen 7 down to a freshly-computed lower
 *  floor just because an unrelated character was auto-added would erase real information
 *  nobody asked to erase.
 *
 *  Still clamped at the level-proven floor as a safety minimum (via
 *  linkSkillFloorsForCharacter's own math) -- a sync can't push anyone BELOW what their
 *  own level already proves, only exactly to editedCharacter's saved value or that floor,
 *  whichever is higher. */
export function syncLinkSkillToSiblings(
  editedCharacter: StoredCharacterRecord,
  roster: StoredCharacterRecord[],
  upsertFn: (c: StoredCharacterRecord) => void,
): void {
  const skillId = CLASS_TO_SKILL[editedCharacter.jobName];
  if (!skillId) return;
  const worldId = editedCharacter.worldID;
  const savedValue = editedCharacter.linkSkills?.[skillId] ?? 0;
  const { values: levelFloors } = computeLinkSkillsFromRoster(roster, worldId);
  const key = toCharacterKey(editedCharacter);
  for (const character of roster) {
    if (character.worldID !== worldId) continue;
    if (toCharacterKey(character) === key) continue;
    if (CLASS_TO_SKILL[character.jobName] !== skillId) continue;
    const floor = levelFloors[skillId] ?? 0;
    const target = Math.max(savedValue, floor);
    if ((character.linkSkills?.[skillId] ?? 0) === target) continue;
    upsertFn({
      ...character,
      linkSkills: { ...character.linkSkills, [skillId]: target },
    });
  }
}
