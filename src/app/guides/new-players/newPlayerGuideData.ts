/*
  New Player Guide content.

  Every piece of guide copy lives here so the page can be edited without touching
  components. The guide is question-driven: the reader answers a world-type
  question and a Hyper Burning question, then sections and blocks filter
  themselves against those answers. Anything with no `worlds` / `hyperBurning`
  filter is shared by every branch, which is how the Heroic branch reuses almost
  all of the Interactive one rather than duplicating it.

  UNWRITTEN CONTENT: every gap is a `{ kind: "tbd" }` block or is flagged with a
  `TBD` comment. Grep this file for `TBD` to find all of them.
*/

import type { StatusKind } from "../../../components/statusColors";

/* ── Question answers ─────────────────────────────────────────── */

export type WorldType = "interactive" | "heroic";
export type HyperBurning = "yes" | "no";

export interface GuideAnswers {
  world: WorldType | null;
  hyperBurning: HyperBurning | null;
}

export const NO_ANSWERS: GuideAnswers = { world: null, hyperBurning: null };

export interface GuideQuestionOption<T extends string> {
  value: T;
  label: string;
  /** Short line under the label: examples, or what the choice changes. */
  hint: string;
}

export interface GuideQuestion<T extends string> {
  id: string;
  prompt: string;
  options: GuideQuestionOption<T>[];
}

export const WORLD_QUESTION: GuideQuestion<WorldType> = {
  id: "world",
  prompt: "Which kind of world are you playing on?",
  options: [
    { value: "interactive", label: "Interactive", hint: "Bera, Scania" },
    { value: "heroic", label: "Heroic", hint: "Kronos, Hyperion" },
  ],
};

export const HYPER_BURNING_QUESTION: GuideQuestion<HyperBurning> = {
  id: "hyperBurning",
  prompt: "Is your character on Hyper Burning?",
  options: [
    { value: "yes", label: "Yes", hint: "Skips the level 10 to 200 leveling route" },
    { value: "no", label: "No", hint: "Full guide, leveling included" },
  ],
};

/* ── Class tags ───────────────────────────────────────────────── */

/*
  Tags are two layers so new axes can be added without touching components: add a
  category to `TAG_CATEGORIES`, then add tags in that category to `CLASS_TAGS`.
  Chips render straight off the tag record.
*/

export type TagCategoryId = "difficulty" | "playstyle";

export interface TagCategory {
  id: TagCategoryId;
  label: string;
}

export const TAG_CATEGORIES: TagCategory[] = [
  { id: "difficulty", label: "Difficulty" },
  { id: "playstyle", label: "Playstyle" },
];

export interface ClassTag {
  id: string;
  label: string;
  category: TagCategoryId;
  /** Chip ink, resolved through `statusColors`. Omit for a neutral chip. */
  status?: StatusKind;
}

export const CLASS_TAGS: Record<string, ClassTag> = {
  easy: { id: "easy", label: "Easy", category: "difficulty", status: "success" },
  hard: { id: "hard", label: "Hard", category: "difficulty", status: "danger" },
  combo: { id: "combo", label: "Combo", category: "playstyle" },
};

export interface ClassGuideInfo {
  /** Guide-specific blurb. Falls back to the class summary in `classData`. */
  blurb?: string;
  tags: string[];
}

/*
  Keyed by the `name` in `classData`'s CLASSES. A class missing here (or added to
  classData later) falls back to no tags and the classData summary, so this
  record never has to be complete for the page to build.

  TBD: only the four seeded classes below have tags and blurbs. Every other entry
  is an empty array waiting to be filled in.
*/
const CLASS_GUIDE_INFO: Record<string, ClassGuideInfo> = {
  // ── Explorers ──
  "Hero": { tags: [] },
  "Paladin": { tags: [] },
  "Dark Knight": { tags: [] },
  "Arch Mage (Fire/Poison)": { tags: [] },
  "Arch Mage (Ice/Lightning)": { tags: [] },
  "Bishop": { tags: [] },
  "Bow Master": { tags: [] },
  "Marksman": { tags: [] },
  "Pathfinder": { tags: [] },
  "Night Lord": { tags: [] },
  "Shadower": { tags: [] },
  "Dual Blade": { tags: [] },
  "Corsair": { tags: [] },
  "Cannoneer": { tags: [] },
  "Buccaneer": { tags: [] },
  // ── Cygnus Knights ──
  "Dawn Warrior": {
    blurb:
      "A sword-and-moonlight warrior who swaps between sun and moon stances. Short, readable rotation with plenty of survivability, so there is not much to juggle while you are still learning the game.",
    tags: ["easy"],
  },
  "Blaze Wizard": { tags: [] },
  "Wind Archer": { tags: [] },
  "Night Walker": { tags: [] },
  "Thunder Breaker": { tags: [] },
  "Mihile": { tags: [] },
  // ── Heroes of Maple ──
  "Aran": { tags: [] },
  "Evan": { tags: [] },
  "Mercedes": { tags: [] },
  "Phantom": { tags: [] },
  "Luminous": { tags: [] },
  "Shade": { tags: [] },
  // ── Resistance ──
  "Battle Mage": { tags: [] },
  "Wild Hunter": { tags: [] },
  "Mechanic": { tags: [] },
  "Blaster": { tags: [] },
  "Xenon": { tags: [] },
  // ── Demons ──
  "Demon Slayer": { tags: [] },
  "Demon Avenger": { tags: [] },
  // ── Nova ──
  "Kaiser": { tags: [] },
  "Angelic Buster": {
    blurb:
      "A high-mobility pirate built around big, flashy bursts. Most of her damage comes from a small set of buttons, which makes her one of the gentlest classes to pick up.",
    tags: ["easy"],
  },
  "Cadena": {
    blurb:
      "A chain-wielding thief who strings summoned weapons into long attack chains. Very rewarding once it clicks, but the chain has to be built and maintained by hand.",
    tags: ["hard", "combo"],
  },
  "Kain": { tags: [] },
  // ── Flora ──
  "Illium": { tags: [] },
  "Ark": { tags: [] },
  "Adele": { tags: [] },
  // Spelled "Khali" in classData; the seed data for this guide called her Kali.
  "Khali": {
    blurb:
      "A chakram thief who charges and spends Hex gauges mid-combo. Fast and fluid, with a rotation that punishes losing your place in it.",
    tags: ["hard", "combo"],
  },
  // ── Anima ──
  "Hoyoung": { tags: [] },
  "Lara": { tags: [] },
  "Ren": { tags: [] },
  // ── Other ──
  "Zero": { tags: [] },
  "Kinesis": { tags: [] },
  // ── Sengoku ──
  "Hayato": { tags: [] },
  "Kanna": { tags: [] },
  // ── Jianghu ──
  "Lynn": { tags: [] },
  "Mo Xuan": { tags: [] },
  // ── Shine ──
  "Sia Astelle": { tags: [] },
};

const NO_CLASS_INFO: ClassGuideInfo = { tags: [] };

export function classGuideInfo(name: string): ClassGuideInfo {
  return CLASS_GUIDE_INFO[name] ?? NO_CLASS_INFO;
}

/** Resolved tag records for a class. Unknown tag ids are dropped. */
export function classTags(name: string): ClassTag[] {
  return classGuideInfo(name).tags.flatMap((id) => {
    const tag = CLASS_TAGS[id];
    return tag ? [tag] : [];
  });
}

/* ── Content blocks ───────────────────────────────────────────── */

export interface MapBand {
  range: string;
  /** TBD: empty until we pick maps. Renders as a placeholder cell. */
  maps: string[];
}

export interface GuideTip {
  title: string;
  text: string;
}

export interface GuideRoute {
  id: string;
  label: string;
  blocks: GuideLeafBlock[];
}

export type GuideLeafBlock =
  | { kind: "paragraph"; text: string }
  /** Aside under a paragraph, tinted but quieter than a callout. */
  | { kind: "note"; text: string }
  | { kind: "callout"; title: string; text: string }
  /** The clickable class portrait grid. Content comes from `CLASS_GUIDE_INFO`. */
  | { kind: "classGrid" }
  | { kind: "mapTable"; title: string; intro: string; bands: MapBand[] }
  | { kind: "tips"; title: string; items: GuideTip[] }
  | { kind: "routeChoice"; title: string; intro: string; routes: GuideRoute[]; outro: string }
  /** Content we know we want but have not written. Renders as a visible stub. */
  | { kind: "tbd"; label: string; note: string };

export interface GuideSubsectionBlock {
  kind: "subsection";
  id: string;
  title: string;
  blocks: GuideLeafBlock[];
}

/** A block with no `worlds` is shared by every world type. */
export type GuideBlock = (GuideLeafBlock | GuideSubsectionBlock) & { worlds?: WorldType[] };

export interface GuideSection {
  id: string;
  title: string;
  /** Omit for content shared by both world types. */
  worlds?: WorldType[];
  /** Omit for content shown whichever way the Hyper Burning question is answered. */
  hyperBurning?: HyperBurning[];
  blocks: GuideBlock[];
}

/* ── Guide content ────────────────────────────────────────────── */

export const GUIDE_INTRO =
  "Welcome to MapleStory. If you played back in the early 2000s, the game today is very different. Back then it was slow, low-level party grinding, and the appeal was really the social side of it. Modern MapleStory keeps that social core but has evolved a lot, with faster, more structured grinding and far more progression depth on top. With so many systems added over the years, this guide will walk you through modern MapleStory and get you comfortable with how progression actually works today.";

export const SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    blocks: [
      {
        kind: "subsection",
        id: "creating-your-character",
        title: "Creating Your Character",
        blocks: [
          {
            kind: "paragraph",
            text: "The most important thing in MapleStory is finding a class you actually enjoy playing. Some classes are stronger than others, but what matters more is picking one you'll be happy putting a lot of hours into.",
          },
          { kind: "classGrid" },
          {
            kind: "note",
            text: "Feel free to create any character that appeals to you. MapleStory rewards having lots of characters since they all feed into your account progression.",
          },
        ],
      },
    ],
  },
  {
    /* TBD: the Heroic branch. Everything else in this file is shared with
       Interactive; only genuinely world-dependent copy belongs in here or in a
       `worlds: ["heroic"]` block inside a shared section. */
    id: "heroic-differences",
    title: "How Heroic Worlds Differ",
    worlds: ["heroic"],
    blocks: [
      {
        kind: "tbd",
        label: "Heroic world differences",
        note: "Cover what changes on Kronos and Hyperion: no player trading, the meso and drop economy, boosted EXP rates, and how each of those reshapes the advice in the rest of this guide.",
      },
    ],
  },
  {
    id: "game-mechanics",
    title: "Game Mechanics",
    hyperBurning: ["yes"],
    blocks: [
      {
        kind: "paragraph",
        text: "Hyper Burning carries your character through the early levels, so there is no leveling route to follow here. What matters instead is understanding the systems your character is about to run into.",
      },
      {
        kind: "tbd",
        label: "Game Mechanics",
        note: "Written for a Hyper Burning character who skipped levels 10 to 200. Content still to be decided.",
      },
    ],
  },
  {
    id: "level-10-to-200",
    title: "Level 10 to 200",
    hyperBurning: ["no"],
    blocks: [
      {
        kind: "subsection",
        id: "level-30-skip",
        title: "Level 30 Optional Skip",
        blocks: [
          {
            kind: "paragraph",
            text: "Every class can skip its story intro and start at level 30 instead of 10. Skip it if you already know the class story. We recommend playing through it if you want to learn more about the MapleStory world and lore.",
          },
        ],
      },
      {
        kind: "callout",
        title: "Using Maple Guide",
        text: "Maple Guide unlocks at level 30. It shows recommended hunting zones for your current level and lets you teleport straight to them, so it's the main tool you'll use for the rest of your leveling.",
      },
      {
        kind: "routeChoice",
        title: "Levels 30 to 100",
        intro: "There are two ways to cover levels 30 to 100. Both routes merge at level 100, so pick whichever sounds more fun.",
        routes: [
          {
            id: "questing",
            label: "Questing",
            /* TBD: the questing route. */
            blocks: [
              {
                kind: "tbd",
                label: "Questing route",
                note: "Which questlines to follow from 30 to 100, in order, and where each one hands off to the next.",
              },
            ],
          },
          {
            id: "grinding",
            label: "Grinding",
            blocks: [
              {
                kind: "paragraph",
                text: "Open Maple Guide, pick the hunting zone it recommends for your level, teleport in, and kill mobs until you outlevel it, then move to the next one.",
              },
            ],
          },
        ],
        outro: "After level 100 both routes converge into grinding.",
      },
      {
        kind: "mapTable",
        title: "Recommended Maps",
        intro: "Our own picks for each ten-level band, to use alongside what Maple Guide suggests.",
        /* TBD: every band's maps. */
        bands: [
          { range: "30 - 40", maps: [] },
          { range: "40 - 50", maps: [] },
          { range: "50 - 60", maps: [] },
          { range: "60 - 70", maps: [] },
          { range: "70 - 80", maps: [] },
          { range: "80 - 90", maps: [] },
          { range: "90 - 100", maps: [] },
        ],
      },
      {
        kind: "tips",
        title: "Grinding Tips",
        items: [
          {
            title: "What are burning fields?",
            text: "Maps that haven't been visited for a while build up a burning stack, up to 10 levels, and each level adds bonus EXP.",
          },
          {
            title: "Check burning stacks before you settle in",
            text: "In the high 90s heading toward Leafre, check the surrounding maps for high burning stacks before you settle in. Leafre-area maps are quiet enough that you'll often find them at or near full burning, which is a free EXP multiplier.",
          },
          {
            title: "Borrow a Frenzy Totem",
            text: "If you have a friend with a Frenzy Totem, using one drastically increases spawn rate and therefore EXP gain.",
          },
        ],
      },
      {
        kind: "tbd",
        label: "Event grinding",
        note: "How to use event maps and event EXP once you are past level 100. Gets its own section later.",
      },
    ],
  },
];

/* ── Filtering ────────────────────────────────────────────────── */

function matches<T extends string>(allowed: T[] | undefined, answer: T): boolean {
  return allowed === undefined || allowed.includes(answer);
}

/** Sections for a fully answered guide, in config order. */
export function visibleSections(world: WorldType, hyperBurning: HyperBurning): GuideSection[] {
  return SECTIONS.filter((s) => matches(s.worlds, world) && matches(s.hyperBurning, hyperBurning));
}

export function visibleBlocks(blocks: GuideBlock[], world: WorldType): GuideBlock[] {
  return blocks.filter((b) => matches(b.worlds, world));
}
