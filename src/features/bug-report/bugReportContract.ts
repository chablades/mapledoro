/*
  Shared contract between the Bug Report form and /api/bug-report.
  Field limits live here so the client's maxLength and the server's validation
  can never drift apart. No "use client": the API route imports this too.
*/

export const BUG_REPORT_LIMITS = {
  happened: 2000,
  expected: 1000,
  steps: 1000,
} as const;

/** Value "other" is the catch-all; everything else is a real route. */
export const BUG_REPORT_PAGE_GROUPS: { label: string; pages: { value: string; label: string }[] }[] = [
  {
    label: "Pages",
    pages: [
      { value: "/", label: "Dashboard" },
      { value: "/characters", label: "Characters" },
      { value: "/settings", label: "Settings" },
    ],
  },
  {
    label: "Tools",
    pages: [
      { value: "/tools/star-force", label: "Star Force Calculator" },
      { value: "/tools/cubing", label: "Cubing Calculator" },
      { value: "/tools/flaming", label: "Flaming Calculator" },
      { value: "/tools/exp-calculator", label: "EXP Calculator" },
      { value: "/tools/stat-optimizer", label: "Stat Optimizer" },
      { value: "/tools/event-planner", label: "Event Planner" },
      { value: "/tools/mystic-frontier", label: "Mystic Frontier Solver" },
      { value: "/tools/boss-crystals", label: "Boss Crystal Tracker" },
      { value: "/tools/dailies", label: "Daily Tracker" },
      { value: "/tools/liberation", label: "Liberation Tracker" },
      { value: "/tools/symbols", label: "Symbol Tracker" },
      { value: "/tools/hexa-skills", label: "HEXA Skill Tracker" },
      { value: "/tools/drop-tracker", label: "Drop Tracker" },
      { value: "/tools/trace-restoration", label: "Trace Restoration Tracker" },
    ],
  },
  {
    label: "Games",
    pages: [
      { value: "/games/skill-guesser", label: "Mapledle" },
      { value: "/games/bgm-guesser", label: "BGM Guesser" },
    ],
  },
  {
    label: "Guides",
    pages: [
      { value: "/guides/new-players", label: "New Players Guide" },
      { value: "/guides/character-guides", label: "Character Guides" },
    ],
  },
  {
    label: "Other",
    pages: [{ value: "other", label: "Somewhere else / not sure" }],
  },
];

export const BUG_REPORT_PAGE_LABELS: ReadonlyMap<string, string> = new Map(
  BUG_REPORT_PAGE_GROUPS.flatMap((group) => group.pages.map((page) => [page.value, page.label] as const)),
);

export interface BugReportCharacter {
  name: string;
  job: string;
  level: number;
  world: string;
}

/** Client-collected context the reporter never types. */
export interface BugReportMeta {
  viewport: string;
  theme: string;
}

export interface BugReportPayload {
  page: string;
  character: BugReportCharacter | null;
  happened: string;
  expected: string;
  steps: string;
  meta: BugReportMeta;
  /** Honeypot: real users never see this field, so any value means a bot. */
  nickname: string;
}
