/*
  New Player Guide content model.

  The page renders whatever lives in SECTIONS, so writing the guide is a matter
  of adding blocks here — no layout work per section. There are two guides
  (Interactive and Heroic worlds) sharing one outline: a section or a single
  block carries `only` when it belongs to just one of them, and is shared when
  it doesn't.
*/

export type GuideMode = "interactive" | "heroic";

export const GUIDE_MODES: { value: GuideMode; label: string }[] = [
  { value: "interactive", label: "Interactive" },
  { value: "heroic", label: "Heroic" },
];

export type CalloutTone = "tip" | "warning" | "note";

/** Interactive widgets the guide can drop into a section. */
type GuideEmbed = "class-randomizer" | "class-directory";

export type GuideBlock =
  | { kind: "text"; only?: GuideMode; text: string }
  | { kind: "list"; only?: GuideMode; ordered?: boolean; items: string[] }
  | { kind: "image"; only?: GuideMode; src: string; alt: string; caption?: string }
  | { kind: "callout"; only?: GuideMode; tone: CalloutTone; title?: string; text: string }
  | { kind: "embed"; only?: GuideMode; embed: GuideEmbed };

export interface GuideSection {
  id: string;
  title: string;
  only?: GuideMode;
  blocks: GuideBlock[];
}

/** Drops sections/blocks that belong to the other guide. */
export function forMode<T extends { only?: GuideMode }>(items: T[], mode: GuideMode): T[] {
  return items.filter((item) => item.only === undefined || item.only === mode);
}

export const SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to MapleStory",
    blocks: [
      {
        kind: "text",
        text: `Welcome to MapleStory. MapleStory is a free-to-play 2D side-scrolling MMORPG that has been running since 2003. You play as a character in the Maple World, leveling from 1 all the way to the cap of 300 by fighting monsters, completing quests, and tackling increasingly difficult bosses.

The gameplay loop revolves around dailies, weekly bossing, farming, and gear progression. Each day you'll complete daily quests and bosses to earn resources and strengthen your character. Each week you'll take on harder bosses for mesos and rare drops. In between, you'll farm maps for EXP and mesos, and pour those gains into upgrading your equipment through systems like Star Force, cubing, and flaming.

In this guide, you'll learn how to get started, pick a class, understand the core systems, and begin progressing your character. Whether you're completely new or returning after a long break, this will walk you through the essentials.`,
      },
    ],
  },
  {
    id: "choosing-class",
    title: "Choosing Your Class",
    blocks: [
      {
        kind: "text",
        text: `MapleStory has over 50 playable classes, and the best one to pick is whichever one you think looks cool.

Some classes are flashy and fast, others are tanky and methodical. Some have huge mobbing skills that wipe the map, others excel at bossing with high single-target damage. You don't need to commit right away either — making multiple characters is actually encouraged since they provide passive stat boosts to your whole account through the Legion system.

Can't decide? Hit the button below and let fate choose for you.`,
      },
      { kind: "embed", embed: "class-randomizer" },
      { kind: "embed", embed: "class-directory" },
    ],
  },
  { id: "early-leveling", title: "Early Leveling", blocks: [] },
  { id: "core-mechanics", title: "Core Mechanics", blocks: [] },
  { id: "gear-progression", title: "Gear Progression", blocks: [] },
  { id: "tips", title: "Useful Tips", blocks: [] },
];
