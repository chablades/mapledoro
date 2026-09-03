/*
  Data model for the data-driven class guide pages (see ClassGuide.tsx).
  One ClassConfig renders an entire class — sequence, leveling, utility, and
  baseStats all reference skills by their key in `skills`, so a skill's icon +
  tooltip is defined once and reused everywhere it appears.

  Icons come from the self-hosted MapleResource API (haku.network): each skill
  carries a `iconId` (a `skill`-namespace id looked up from manifests/v<ver>/skill.json).
*/

export type NodeType = "origin" | "mastery" | "boost" | "common";

// Condition tags on a stat contribution. Reuse the node-type palette so a color
// means the same thing across the whole page.
type Cond = "temp" | "orb" | "debuff" | "axe";

export type Tier = "leg" | "unq" | "epc";

export interface Skill {
  name: string;
  // MapleResource `skill` id (haku.network). Omit to render a letter fallback.
  iconId?: string;
  // HEXA node type; omit for plain buffs/passives (shown as "Buff" in tooltips).
  nodeType?: NodeType;
  // Tooltip body: what it does + when it matters.
  desc?: string;
}

interface Fact {
  label: string;
  value: string;
  // MapleResource `item` ids rendered as small inline icons before the value.
  itemIds?: string[];
}

// [label, value, cooldown] breakpoint pill, e.g. ["Lv6", "35%", "210s"].
type LinkPill = [label: string, value: string, cooldown: string];

interface LinkSkill {
  name: string;
  iconId?: string;
  desc: string;
  pills: LinkPill[];
  note?: string;
}

export interface InnerLine {
  tier: Tier;
  tag: string;
  text: string;
}

// Rendered as two labeled columns (Bossing | Mobbing) in one card.
interface InnerAbility {
  bossing: InnerLine[];
  mobbing: InnerLine[];
}

interface SeqStep {
  skill: string; // key into ClassConfig.skills
  cd?: string; // optional cooldown badge above the chip
}

// [skill key, level] — order is the leveling priority.
type LevelStep = [skill: string, level: number];

interface UtilRow {
  skill: string;
  timing: string; // e.g. "10s · 360s cd"
}

interface UtilGroup {
  label: string;
  rows: UtilRow[];
}

export interface StatPart {
  skill: string;
  value: string; // e.g. "+15%", "×1.25"
  cond?: Cond;
}

interface StatRow {
  stat: string;
  total: string; // headline aggregate, gold
  sub?: string; // optional qualifier, e.g. "incl. +5% base"
  parts: StatPart[];
}

interface Resource {
  label: string;
  url: string;
  kind: "wiki" | "disc" | "doc";
}

// [class name, effect, optional skill iconId] recommended-link row. The icon is
// a leading chip; rows render a letter fallback (first char of name) until set.
type RecLink = [name: string, effect: string, iconId?: string];

export interface ClassConfig {
  name: string;
  branch: string;
  archetype: string;
  description: string;
  portraitUrl?: string;
  accentColor: string;
  facts: Fact[];
  linkSkill: LinkSkill;
  legion: string;
  weaponNote?: string;
  innerAbility: InnerAbility;
  skills: Record<string, Skill>;
  sequence: SeqStep[];
  seqNote?: string;
  leveling: { heroic: LevelStep[]; interactive: LevelStep[] };
  lvlFoot?: string;
  utility: UtilGroup[];
  baseStats: { note: string; rows: StatRow[] };
  recLinks: { bossing: RecLink[]; mobbing: RecLink[] };
  resources: Resource[];
}
