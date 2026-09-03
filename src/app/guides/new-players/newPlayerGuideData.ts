/*
  New Player Guide (10 to 200) content.

  Every piece of guide copy lives here so the page can be edited without touching
  components, the same config-driven split the character guides use. The guide is
  a walkthrough, not a manual: there is no standalone mechanics section, and each
  system is introduced inside the level band that reaches it.

  The reader answers a world-type question (by picking a column in the Section 1
  comparison) and a Hyper Burning question, then sections and blocks filter
  themselves against those answers. Anything with no `worlds` / `hyperBurning`
  filter is shared by every branch, which is how the Heroic branch reuses almost
  all of the Interactive one rather than duplicating it.

  UNWRITTEN CONTENT: every gap is a `{ kind: "tbd" }` block, an empty `pros` /
  `cons` / `maps` array, or is flagged with a `TBD` comment. Grep this file for
  `TBD` to find all of them.

  Ordering was sanity-checked against the Grandis Library and DigitalTQ
  progression guides.
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

/*
  The world question has no QuestionCard of its own: it is answered by clicking a
  column in the Section 1 comparison. This record still names the choice for the
  answer summary and the "change your answer" control.
*/
export const WORLD_LABELS: Record<WorldType, string> = {
  interactive: "Interactive",
  heroic: "Heroic",
};

export const HYPER_BURNING_QUESTION: GuideQuestion<HyperBurning> = {
  id: "hyperBurning",
  prompt: "Is your character on Hyper Burning?",
  options: [
    { value: "yes", label: "Yes", hint: "Reaches 200 in minutes, so the leveling route is skipped" },
    { value: "no", label: "No", hint: "Full guide, leveling walkthrough included" },
  ],
};

/* ── World comparison ─────────────────────────────────────────── */

/*
  `iconIds` are ids from `manifests/v270/misc-world.json`, which are just the
  lowercased world name. They resolve through `worldIconUrl`.
*/
export interface WorldColumn {
  value: WorldType;
  label: string;
  worlds: { name: string; iconId: string }[];
  /** TBD: pros and cons copy. Empty arrays render a placeholder. */
  pros: string[];
  cons: string[];
}

export const WORLD_COLUMNS: WorldColumn[] = [
  {
    value: "interactive",
    label: "Interactive",
    worlds: [
      { name: "Bera", iconId: "bera" },
      { name: "Scania", iconId: "scania" },
    ],
    pros: [],
    cons: [],
  },
  {
    value: "heroic",
    label: "Heroic",
    worlds: [
      { name: "Kronos", iconId: "kronos" },
      { name: "Hyperion", iconId: "hyperion" },
    ],
    pros: [],
    cons: [],
  },
];

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

/*
  A class that does not start at level 10 overrides the walkthrough: any level
  band that ends at or below `startLevel` is dropped, and `note` explains the
  skip in its place. Deliberately generic -- Zero is the only class that needs it
  today, but nothing here is Zero-specific.
*/
export interface RouteOverride {
  startLevel: number;
  note: string;
}

export interface ClassGuideInfo {
  /** Guide-specific blurb. Falls back to the class summary in `classData`. */
  blurb?: string;
  tags: string[];
  routeOverride?: RouteOverride;
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
  "Zero": {
    tags: [],
    routeOverride: {
      startLevel: 100,
      note: "Zero starts at level 100 and plays through its own story instead of the usual early game, so the level 10 to 100 walkthrough does not apply. Pick the guide back up at level 100.",
    },
  },
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

export function classRouteOverride(name: string | null): RouteOverride | null {
  return name ? classGuideInfo(name).routeOverride ?? null : null;
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
  /** Omit for a tip shown on both world types. */
  worlds?: WorldType[];
}

export interface GuideRoute {
  id: string;
  label: string;
  blocks: GuideLeafBlock[];
}

/*
  A callout in a side-by-side pair. `worldText` appends the line that differs
  between world types, so the shared half is written once.
*/
export interface PairedCallout {
  title: string;
  text: string;
  worldText?: Record<WorldType, string>;
  /** Item id from `manifests/v270/item.json`, rendered as the callout's icon. */
  itemId?: string;
}

export interface AdvancementRow {
  level: string;
  label: string;
  detail: string;
}

export type GuideLeafBlock =
  | { kind: "paragraph"; text: string }
  /** Aside under a paragraph, tinted but quieter than a callout. */
  | { kind: "note"; text: string }
  | { kind: "callout"; title: string; text: string }
  /** The world comparison that answers the world question. */
  | { kind: "worldComparison" }
  /** The clickable class portrait grid. Content comes from `CLASS_GUIDE_INFO`. */
  | { kind: "classGrid" }
  | { kind: "advancements"; title: string; intro: string; rows: AdvancementRow[]; outro: string }
  | { kind: "calloutPair"; items: PairedCallout[] }
  /** A paragraph led by an item icon, for a system named after an item. */
  | { kind: "itemNote"; itemId: string; itemName: string; text: string }
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
  /** Level band this section walks through. Used by the class route override. */
  band?: { from: number; to: number };
  /** Sections with no checkbox (the intro-ish ones) set this false. */
  trackProgress?: boolean;
  blocks: GuideBlock[];
}

/* ── Guide content ────────────────────────────────────────────── */

export const GUIDE_INTRO: string[] = [
  "Welcome to MapleStory. If you played back in the early 2000s, the game today is very different. Back then it was slow, low-level party grinding, and the appeal was really the social side of it. Modern MapleStory keeps that social core but has evolved a lot, with faster, more structured grinding and far more progression depth on top. Party quests have become weekly bosses and raids, and most of what you used to do in a party you now do on a schedule.",
  "The biggest shift is that MapleStory is now account-based progression rather than single-character progression. Instead of pouring everything into one character, you build up a Legion, and every character you level feeds your whole account.",
  "One thing to set straight before you start: reaching level 200 is not the finish line. It is closer to the end of the tutorial. The real game starts around level 260 with 6th job. This guide covers the core mechanics and story that get you there.",
];

export const SECTIONS: GuideSection[] = [
  {
    id: "before-you-start",
    title: "Before You Start",
    trackProgress: false,
    blocks: [
      {
        kind: "subsection",
        id: "which-world",
        title: "Which World Should You Play?",
        blocks: [
          {
            kind: "paragraph",
            text: "There are two types of worlds, and they play quite differently. Below is a comparison of each. Whatever the pros and cons say, what matters most is playing where your friends play.",
          },
          { kind: "worldComparison" },
          { kind: "note", text: "This choice changes the rest of the guide." },
        ],
      },
      {
        kind: "subsection",
        id: "more-than-one-character",
        title: "Why You'll Make More Than One Character",
        blocks: [
          {
            kind: "paragraph",
            text: "Leveling extra characters grants account-wide bonuses through Legion and Link Skills, so alts are a core progression system rather than a side activity. Legion unlocks once you have 500 total levels across your account, and every character you raise after that keeps adding to it.",
          },
          {
            kind: "note",
            text: "Many players roll Mercedes, Evan and Aran early for their account-wide Link Skill bonuses, but there is no rush. You can always make them later.",
          },
        ],
      },
    ],
  },
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
    id: "hyper-burning",
    title: "Hyper Burning",
    hyperBurning: ["yes"],
    blocks: [
      {
        kind: "paragraph",
        text: "Hyper Burning reaches level 200 in minutes, so there is no leveling route to walk through. Your character will pass every job advancement and unlock on the way up without you having to plan around them.",
      },
      {
        kind: "paragraph",
        text: "What matters instead is knowing which systems opened up while you were flying past them. Inner Ability at 50, Hyper Stats at 140, and Arcane Symbols at 200 are all live by the time you land, and none of them fill themselves in.",
      },
      {
        kind: "tbd",
        label: "Hyper Burning catch-up",
        note: "A short pass over the systems a Hyper Burning character skipped past, in the order they are worth setting up once you land at 200.",
      },
    ],
  },
  {
    id: "level-10-to-100",
    title: "Level 10 to 100",
    hyperBurning: ["no"],
    band: { from: 10, to: 100 },
    blocks: [
      {
        kind: "advancements",
        title: "Job Advancements",
        intro: "Advancements are what unlock your next tier of skills, so take each one as soon as it is available. There is no reason to sit on one.",
        rows: [
          { level: "10", label: "1st job", detail: "Your first real skill set, right after the class intro." },
          { level: "30", label: "2nd job", detail: "Unlocks alongside Maple Guide, which becomes your main leveling tool." },
          { level: "60", label: "3rd job", detail: "Mobbing starts to come together around here." },
          { level: "100", label: "4th job", detail: "The last of the classic advancements, and where both routes below merge." },
          { level: "200", label: "5th job", detail: "Well past this guide, but worth knowing it is the next milestone." },
          { level: "260", label: "6th job", detail: "Where the real game starts." },
        ],
        outro: "Some classes do not follow this ladder. Zero begins at level 100, and picks up its own story instead.",
      },
      {
        kind: "subsection",
        id: "level-30-skip",
        title: "Level 30 Optional Skip",
        blocks: [
          {
            kind: "paragraph",
            text: "Every class can skip its story intro and start at level 30 instead of 10. Skip it if you already know the class story. Play it if you want the world and the lore, since it is the only time the game slows down enough to tell you any of it.",
          },
        ],
      },
      {
        kind: "calloutPair",
        items: [
          {
            title: "Using Maple Guide",
            text: "Maple Guide unlocks at level 30. It shows recommended hunting zones for your current level and teleports you straight there, so it is the main tool you will use for the rest of your leveling.",
          },
          {
            title: "Teleport Rocks",
            text: "Open the world map, pick a location, and teleport. The basic Teleport Rock has a five minute cooldown. The Hyper Teleport Rock removes it entirely.",
            worldText: {
              interactive: "On Interactive worlds the Hyper Teleport Rock is bought with NX.",
              heroic: "On Heroic worlds it is bought with mesos in the cash shop.",
            },
            // Hyper Teleport Rock (manifests/v270/item.json)
            itemId: "05040004",
          },
        ],
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
        kind: "subsection",
        id: "inner-ability",
        title: "Inner Ability",
        blocks: [
          {
            kind: "paragraph",
            text: "Inner Ability unlocks at level 50. It gives your character three lines of bonus stats, which you reroll using honor points earned from playing.",
          },
          {
            kind: "tbd",
            label: "Inner Ability detail",
            note: "Which lines are worth chasing at this stage, how honor is earned early, and when it is worth spending on rerolls rather than saving.",
          },
        ],
      },
      {
        kind: "subsection",
        id: "scrolling",
        title: "Scrolling",
        blocks: [
          {
            kind: "paragraph",
            text: "Upgrading gear has its own deep systems later on. For now it is only worth knowing what exists and roughly how you improve what you are wearing.",
          },
        ],
      },
      {
        kind: "paragraph",
        worlds: ["interactive"],
        text: "On Interactive worlds, scrolls and Spell Traces both let you upgrade gear as you go. You do not need to invest heavily yet, but it is worth knowing the option is there while you level.",
      },
      {
        kind: "itemNote",
        worlds: ["heroic"],
        // Spell Trace, the scroll-enhancement currency (manifests/v270/item.json)
        itemId: "04001832",
        itemName: "Spell Trace",
        text: "On Heroic worlds, scrolls are not usable at all. You upgrade with Spell Traces instead, which drop from mobs as you grind, so your gear improves from the same activity that levels you.",
      },
      {
        kind: "note",
        worlds: ["interactive"],
        text: "Bonus potentials are Interactive-only. Regular potentials exist on both world types, and Star Force works identically on both.",
      },
      {
        kind: "note",
        worlds: ["heroic"],
        text: "Bonus potentials do not exist on Heroic worlds. Regular potentials do, and Star Force works identically on both world types.",
      },
      {
        kind: "tips",
        title: "Grinding Tips",
        items: [
          {
            title: "What are burning fields?",
            text: "Maps that have been left unvisited build up a burning stack, up to 10 levels, and each level adds bonus EXP.",
          },
          {
            title: "Check burning stacks before you settle in",
            text: "In the high 90s heading toward Leafre, check the surrounding maps for high burning stacks before you settle in. Leafre-area maps are quiet enough that you'll often find them at or near full burning, which is a free EXP multiplier.",
          },
          {
            title: "Borrow a Frenzy Totem",
            worlds: ["interactive"],
            text: "If a friend has a Frenzy Totem, using one drastically increases spawn rate and therefore EXP gain.",
          },
        ],
      },
      {
        kind: "note",
        text: "Join a guild early. The buffs are worth it on their own, and the social side is most of what keeps people playing.",
      },
    ],
  },
  {
    id: "level-100-to-200",
    title: "Level 100 to 200",
    hyperBurning: ["no"],
    band: { from: 100, to: 200 },
    blocks: [
      {
        kind: "paragraph",
        text: "From here it is grinding, with no route to choose. Maple Guide keeps pointing you at the right zone, and the job is to keep moving as your level outgrows each one.",
      },
      {
        kind: "subsection",
        id: "hyper-stats",
        title: "Hyper Stats",
        blocks: [
          {
            kind: "paragraph",
            text: "Hyper Stats unlock at level 140. They are a pool of free stat allocation that you earn simply by leveling, and they keep growing for the rest of the game.",
          },
        ],
      },
      {
        kind: "subsection",
        id: "hyper-skills",
        title: "Hyper Skills",
        blocks: [
          {
            kind: "tbd",
            label: "Hyper Skills",
            note: "What Hyper Skills are, when they unlock, and which passives and actives are worth taking first for a character still leveling.",
          },
        ],
      },
      {
        kind: "tbd",
        label: "Grinding pace and event grinding",
        note: "Roughly how long this stretch takes, and how to use event maps and event EXP to cut it down.",
      },
      {
        kind: "note",
        text: "Don't worry about dailies or bossing until 200. Focus on leveling, filling out your equipment slots, and taking each job advancement on time.",
      },
      {
        kind: "paragraph",
        text: "Arcane Symbols start at around level 200. They are the bridge into the next stage of the game, and the point where daily play starts to matter.",
      },
    ],
  },
];

/*
  TBD: the 200+ guide route does not exist yet. Point this at it once it does.
*/
export const NEXT_GUIDE = {
  title: "Where to go next",
  text: "Level 200 opens the recurring game: dailies, weeklies, Arcane Symbols and your first bosses. That loop is its own guide.",
  linkLabel: "The 200+ guide is coming soon",
  href: null as string | null,
};

/* ── Filtering ────────────────────────────────────────────────── */

function matches<T extends string>(allowed: T[] | undefined, answer: T): boolean {
  return allowed === undefined || allowed.includes(answer);
}

/** A band the class starts past is dropped: the whole band is behind them. */
function clearedByRoute(section: GuideSection, override: RouteOverride | null): boolean {
  return override !== null && section.band !== undefined && override.startLevel >= section.band.to;
}

/** Sections for a fully answered guide, in config order. */
export function visibleSections(
  world: WorldType,
  hyperBurning: HyperBurning,
  override: RouteOverride | null = null,
): GuideSection[] {
  return SECTIONS.filter(
    (s) =>
      matches(s.worlds, world) &&
      matches(s.hyperBurning, hyperBurning) &&
      !clearedByRoute(s, override),
  );
}

export function visibleBlocks(blocks: GuideBlock[], world: WorldType): GuideBlock[] {
  return blocks.filter((b) => matches(b.worlds, world));
}

export function visibleTips(items: GuideTip[], world: WorldType): GuideTip[] {
  return items.filter((t) => matches(t.worlds, world));
}

/** Sections that carry a progress checkbox, for the progress counter. */
export function trackedSections(sections: GuideSection[]): GuideSection[] {
  return sections.filter((s) => s.trackProgress !== false);
}
