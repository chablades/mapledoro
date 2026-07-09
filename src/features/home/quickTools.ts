import { readGlobalTool } from "../tools/globalToolsStore";

// A dashboard-launchable link card (tool or guide).
export type QuickLink = {
  title: string;
  desc: string;
  href: string;
} & ({ iconType: "emoji"; icon: string } | { iconType: "item"; itemId: string });

// Full catalog of dashboard-launchable tools. `href` doubles as the stable id
// used to persist the user's chosen subset.
export const ALL_QUICK_TOOLS: QuickLink[] = [
  {
    title: "Star Force",
    desc: "Cost calculator",
    icon: "⭐",
    iconType: "emoji",
    href: "/tools/star-force",
  },
  {
    title: "Cubing",
    desc: "Potential rolling odds",
    itemId: "05062028", // Glowing Cube
    iconType: "item",
    href: "/tools/cubing",
  },
  {
    title: "Flaming",
    desc: "Bonus stat calculator",
    itemId: "02048752", // Powerful Rebirth Flame
    iconType: "item",
    href: "/tools/flaming",
  },
  {
    title: "EXP Calculator",
    desc: "Buffs and EXP tables",
    itemId: "02637353", // EXP Voucher
    iconType: "item",
    href: "/tools/exp-calculator",
  },
  {
    title: "HEXA Skills",
    desc: "Sol Erda planning",
    itemId: "04009613", // Sol Erda Fragment
    iconType: "item",
    href: "/tools/hexa-skills",
  },
  {
    title: "Liberation",
    desc: "Liberation planning",
    itemId: "01332289", // Genesis Dagger
    iconType: "item",
    href: "/tools/liberation",
  },
  {
    title: "Symbol Tracker",
    desc: "Arcane & Sacred progress",
    itemId: "01713000", // Sacred Symbol: Cernium
    iconType: "item",
    href: "/tools/symbols",
  },
  {
    title: "Boss Crystals",
    desc: "Weekly crystal income",
    itemId: "04001928", // Intense Power Crystal
    iconType: "item",
    href: "/tools/boss-crystals",
  },
  {
    title: "Daily Tracker",
    desc: "Daily content tracker",
    icon: "📋",
    iconType: "emoji",
    href: "/tools/dailies",
  },
  {
    title: "Drop Tracker",
    desc: "Rare boss drops",
    itemId: "02539004", // Grindstone of Faith
    iconType: "item",
    href: "/tools/pitched-boss-drops",
  },
  {
    title: "Trace Restoration",
    desc: "Whisper crystal progress",
    itemId: "04001956", // Pitched Whisper Crystal
    iconType: "item",
    href: "/tools/trace-restoration",
  },
  {
    title: "Event Planner",
    desc: "Event spending planner",
    icon: "📅",
    iconType: "emoji",
    href: "/tools/event-planner",
  },
];

export const QUICK_GUIDES: QuickLink[] = [
  { title: "New Players", desc: "Getting started", icon: "🌱", iconType: "emoji", href: "/guides/new-players" },
  { title: "Character Guides", desc: "Classes & link skills", icon: "⚔️", iconType: "emoji", href: "/guides/character-guides" },
];

export const HOME_TOOLS_KEY = "homeToolSelection";
export const HOME_TOOLS_COUNT = 5;
export const DEFAULT_TOOL_HREFS = ALL_QUICK_TOOLS.slice(0, HOME_TOOLS_COUNT).map((t) => t.href);

// Read the saved selection, falling back to the default when missing or invalid
// (e.g. a stored tool was renamed/removed, or the count drifted).
export function readHomeToolSelection(): string[] {
  const stored = readGlobalTool<string[]>(HOME_TOOLS_KEY);
  if (Array.isArray(stored)) {
    const valid = stored.filter((href) => ALL_QUICK_TOOLS.some((t) => t.href === href));
    if (valid.length === HOME_TOOLS_COUNT) return valid;
  }
  return DEFAULT_TOOL_HREFS;
}
