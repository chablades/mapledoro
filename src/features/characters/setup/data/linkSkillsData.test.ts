import { describe, expect, it, vi } from "vitest";
import {
  inferLinkLevel,
  computeLinkSkillsFromRoster,
  bestKnownLinkSkillFloors,
  linkSkillFloorsForCharacter,
  propagateLinkSkillFloors,
  syncLinkSkillToSiblings,
} from "./linkSkillsData";
import { makeStoredCharacterRecord } from "../../model/testFixtures";
import type { LinkSkillsData, StoredCharacterRecord } from "../../model/charactersStore";

interface LinkTestCharOptions {
  characterName?: string;
  worldID?: number;
  level?: number;
  linkSkills?: LinkSkillsData;
}

function makeLinkChar(jobName: string, defaultName: string, options: LinkTestCharOptions = {}): StoredCharacterRecord {
  const { characterName = defaultName, worldID = 1, level = 210, linkSkills } = options;
  const record = makeStoredCharacterRecord({}, { characterName, jobName, worldID, level });
  return linkSkills ? { ...record, linkSkills } : record;
}

const bishop = (options?: LinkTestCharOptions) => makeLinkChar("Bishop", "BishopChar", options);
const archMageFP = (options?: LinkTestCharOptions) => makeLinkChar("Arch Mage (F/P)", "ArchMageChar", options);
const kanna = (options?: LinkTestCharOptions) => makeLinkChar("Kanna", "KannaChar", options);

describe("inferLinkLevel", () => {
  it("returns 0 below level 70", () => {
    expect(inferLinkLevel(1)).toBe(0);
    expect(inferLinkLevel(69)).toBe(0);
  });
  it("returns 1 from level 70 to 119", () => {
    expect(inferLinkLevel(70)).toBe(1);
    expect(inferLinkLevel(119)).toBe(1);
  });
  it("returns 2 from level 120 to 209", () => {
    expect(inferLinkLevel(120)).toBe(2);
    expect(inferLinkLevel(209)).toBe(2);
  });
  it("returns 3 from level 210 and up", () => {
    expect(inferLinkLevel(210)).toBe(3);
    expect(inferLinkLevel(295)).toBe(3);
  });
});

describe("computeLinkSkillsFromRoster", () => {
  it("returns nothing for a class with no CLASS_TO_SKILL entry", () => {
    const roster = [makeStoredCharacterRecord({}, { jobName: "Not A Real Class", level: 210 })];
    const { values } = computeLinkSkillsFromRoster(roster, 1);
    expect(values).toEqual({});
  });

  it("excludes a character below the level-0 threshold entirely", () => {
    const roster = [bishop({ level: 10 })];
    const { values } = computeLinkSkillsFromRoster(roster, 1);
    expect(values.empiricalKnowledge).toBeUndefined();
  });

  it("sums contributions across distinct member classes of the same skill", () => {
    const roster = [bishop({ level: 210 }), archMageFP({ level: 210 })];
    const { values } = computeLinkSkillsFromRoster(roster, 1);
    expect(values.empiricalKnowledge).toBe(6); // 3 + 3
  });

  it("only counts the single best character per class, not every alt", () => {
    const roster = [
      bishop({ characterName: "Bishop1", level: 210 }),
      bishop({ characterName: "Bishop2", level: 210 }),
    ];
    const { values } = computeLinkSkillsFromRoster(roster, 1);
    expect(values.empiricalKnowledge).toBe(3); // one Bishop's worth, not two
  });

  it("picks the higher-level character within a class as the winner, even when contribution ties", () => {
    const roster = [
      bishop({ characterName: "Bishop295", level: 295 }),
      bishop({ characterName: "Bishop210", level: 210 }),
    ];
    const { winners } = computeLinkSkillsFromRoster(roster, 1);
    expect(winners.empiricalKnowledge).toHaveLength(1);
    expect(winners.empiricalKnowledge![0].characterName).toBe("Bishop295");
  });

  it("filters to only the requested world", () => {
    const roster = [bishop({ worldID: 1, level: 210 }), bishop({ characterName: "OtherWorld", worldID: 2, level: 210 })];
    const { values } = computeLinkSkillsFromRoster(roster, 1);
    expect(values.empiricalKnowledge).toBe(3);
  });

  it("sources strings describe each contributing character", () => {
    const roster = [bishop({ level: 210 })];
    const { sources } = computeLinkSkillsFromRoster(roster, 1);
    expect(sources.empiricalKnowledge).toEqual(["BishopChar (Lv 210)"]);
  });
});

describe("bestKnownLinkSkillFloors", () => {
  it("uses the level-proven floor when no stored value exceeds it", () => {
    const roster = [bishop({ level: 210 })];
    expect(bestKnownLinkSkillFloors(roster, 1).empiricalKnowledge).toBe(3);
  });

  it("takes the higher of the level floor and any same-skill character's stored value", () => {
    const roster = [bishop({ level: 210, linkSkills: { empiricalKnowledge: 7 } })];
    expect(bestKnownLinkSkillFloors(roster, 1).empiricalKnowledge).toBe(7);
  });

  it("does not let a lower stored value pull the floor down below the level-proven minimum", () => {
    const roster = [
      bishop({ level: 210, linkSkills: { empiricalKnowledge: 1 } }),
      archMageFP({ level: 210 }),
    ];
    // level floor = 3+3=6, stored max = 1 -> floor should be 6, not 1
    expect(bestKnownLinkSkillFloors(roster, 1).empiricalKnowledge).toBe(6);
  });
});

describe("linkSkillFloorsForCharacter", () => {
  it("returns empty for a class with no skill mapping", () => {
    expect(linkSkillFloorsForCharacter({ jobName: "Not Real", worldID: 1 }, [])).toEqual({});
  });

  it("returns only the skill(s) the given class itself contributes to, not unrelated ones", () => {
    const roster = [bishop({ level: 210 }), kanna({ level: 210 })];
    const floors = linkSkillFloorsForCharacter({ jobName: "Kanna", worldID: 1 }, roster);
    expect(Object.keys(floors)).toEqual(["elementalism"]);
  });

  it("reflects the full-roster proof for the character's own skill", () => {
    const roster = [bishop({ level: 210 }), archMageFP({ level: 210 })];
    const floors = linkSkillFloorsForCharacter({ jobName: "Bishop", worldID: 1 }, roster);
    expect(floors.empiricalKnowledge).toBe(6);
  });
});

describe("propagateLinkSkillFloors", () => {
  it("raises a character below the floor and calls upsertFn with the updated record", () => {
    const stale = bishop({ level: 210, linkSkills: { empiricalKnowledge: 3 } });
    const fresh = archMageFP({ level: 210 });
    const roster = [stale, fresh];
    const upsertFn = vi.fn();
    propagateLinkSkillFloors(roster, 1, upsertFn);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ linkSkills: expect.objectContaining({ empiricalKnowledge: 6 }) }),
    );
  });

  it("does not touch a character already at or above the floor", () => {
    const atFloor = bishop({ level: 210, linkSkills: { empiricalKnowledge: 7 } });
    const roster = [atFloor];
    const upsertFn = vi.fn();
    propagateLinkSkillFloors(roster, 1, upsertFn);
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("never lowers a character's own value, even if it's above the floor another sibling could prove", () => {
    // Kanna's own floor never involves Bravado siblings - an intentional 0 stays untouched
    const roster = [kanna({ level: 210, linkSkills: { elementalism: 0 } })];
    const upsertFn = vi.fn();
    propagateLinkSkillFloors(roster, 1, upsertFn);
    // floor = 3 (Kanna's own level), stored = 0, so it SHOULD raise to 3 here
    expect(upsertFn).toHaveBeenCalled();
  });

  it("ignores characters outside the requested world", () => {
    const roster = [bishop({ worldID: 2, level: 210, linkSkills: { empiricalKnowledge: 0 } })];
    const upsertFn = vi.fn();
    propagateLinkSkillFloors(roster, 1, upsertFn);
    expect(upsertFn).not.toHaveBeenCalled();
  });
});

describe("syncLinkSkillToSiblings", () => {
  // Bishop + Arch Mage F/P both at level 90 (link level 1 each) keep the level-proven floor
  // at 2 (1+1), low enough that these cases exercise the sync target itself rather than
  // being masked by the floor.
  it.each([
    { savedValue: 9, siblingStart: 3, expected: 9, label: "syncs a sibling UP to the edited character's saved value" },
    { savedValue: 3, siblingStart: 9, expected: 3, label: "syncs a sibling DOWN to the edited character's saved value (unlike propagate)" },
    { savedValue: 0, siblingStart: 9, expected: 2, label: "clamps the sync target at the level-proven floor, never below it" },
  ])("$label", ({ savedValue, siblingStart, expected }) => {
    const edited = bishop({ level: 90, linkSkills: { empiricalKnowledge: savedValue } });
    const sibling = archMageFP({ level: 90, linkSkills: { empiricalKnowledge: siblingStart } });
    const upsertFn = vi.fn();
    syncLinkSkillToSiblings(edited, [edited, sibling], upsertFn);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ linkSkills: expect.objectContaining({ empiricalKnowledge: expected }) }),
    );
  });

  it("never syncs the edited character to itself", () => {
    const edited = bishop({ level: 210, linkSkills: { empiricalKnowledge: 9 } });
    const upsertFn = vi.fn();
    syncLinkSkillToSiblings(edited, [edited], upsertFn);
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("does not call upsertFn when a sibling is already at the target value", () => {
    const edited = bishop({ level: 210, linkSkills: { empiricalKnowledge: 6 } });
    const sibling = archMageFP({ level: 210, linkSkills: { empiricalKnowledge: 6 } });
    const upsertFn = vi.fn();
    syncLinkSkillToSiblings(edited, [edited, sibling], upsertFn);
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("does not sync characters of a different skill", () => {
    const edited = bishop({ level: 210, linkSkills: { empiricalKnowledge: 9 } });
    const unrelated = kanna({ level: 210, linkSkills: { elementalism: 3 } });
    const upsertFn = vi.fn();
    syncLinkSkillToSiblings(edited, [edited, unrelated], upsertFn);
    expect(upsertFn).not.toHaveBeenCalled();
  });
});
