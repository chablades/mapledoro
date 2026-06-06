"use client";

/*
  Tools landing page.
  Displays a grid of available tool cards that link to their sub-routes.
*/
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { ItemIcon } from "../../components/ResourceImage";
import type { AppTheme } from "../../components/themes";

type ToolCard = {
  title: string;
  description: string;
  href: string;
  comingSoon?: boolean;
} & ({ iconType?: "emoji"; icon: string } | { iconType: "item"; itemId: string });

const CALCULATORS: ToolCard[] = [
  {
    title: "Star Force Calculator",
    description:
      "Estimate the expected meso cost to star force your equipment.",
    icon: "⭐",
    href: "/tools/star-force",
  },
  {
    title: "Cubing Calculator",
    description:
      "Calculate the expected cost and number of cubes to achieve your desired potential.",
    itemId: "05062028", // Glowing Cube
    iconType: "item",
    href: "/tools/cubing",
  },
  {
    title: "Flaming Calculator",
    description:
      "Calculate the expected number of flames to achieve your desired bonus stats.",
    itemId: "02048752", // Powerful Rebirth Flame
    iconType: "item",
    href: "/tools/flaming",
  },
];

const OTHER_TOOLS: ToolCard[] = [
  {
    title: "Event Planner",
    description:
      "Plan your star force spending for the next event. Estimates total meso cost and spare items needed.",
    icon: "📅",
    href: "/tools/event-planner",
  },
  {
    title: "Mystic Frontier Solver",
    description:
      "Import your familiars and dice target to determine whether rerolls are needed.",
    icon: "🎲",
    href: "#",
    comingSoon: true,
  },
];

const TRACKERS: ToolCard[] = [
  {
    title: "Boss Crystal Tracker",
    description:
      "Track your weekly boss crystal income across all characters.",
    itemId: "04001928", // Intense Power Crystal (Weekly)
    iconType: "item",
    href: "/tools/boss-crystals",
  },
  {
    title: "Daily Tracker",
    description:
      "Track symbol dailies, daily bosses, and daily content across all your characters.",
    icon: "📋",
    href: "/tools/dailies",
  },
  {
    title: "Liberation Tracker",
    description:
      "Track your Genesis and Destiny liberation progress and estimate completion.",
    itemId: "01332289", // Genesis Dagger
    iconType: "item",
    href: "/tools/liberation",
  },
  {
    title: "Symbol Tracker",
    description:
      "Track your Arcane and Sacred symbol progress and estimate days to max.",
    itemId: "01713000", // Sacred Symbol: Cernium
    iconType: "item",
    href: "/tools/symbols",
  },
  {
    title: "HEXA Skill Tracker",
    description:
      "Track Sol Erda and Fragment costs to max your HEXA skills per character.",
    itemId: "04009613", // Sol Erda Fragment
    iconType: "item",
    href: "/tools/hexa-skills",
  },
  {
    title: "Drop Tracker",
    description:
      "Track and analyze rare boss drops across all characters.",
    itemId: "02539004", // Grindstone of Faith
    iconType: "item",
    href: "/tools/pitched-boss-drops",
  },
  {
    title: "Trace Restoration Calculator",
    description:
      "Track whisper crystal progress and trace restoration missions toward your target items.",
    itemId: "04001956", // Pitched Whisper Crystal
    iconType: "item",
    href: "/tools/trace-restoration",
  },
];

function ToolCardInner({ tool, theme }: { tool: ToolCard; theme: AppTheme }) {
  return (
    <div
      className={`fade-in tool-card panel-card${tool.comingSoon ? " tool-card-coming-soon" : ""}`}
      style={{
        background: tool.comingSoon ? `color-mix(in srgb, ${theme.panel} 50%, transparent)` : theme.panel,
        border: `1px solid ${theme.border}`,
        padding: "1.5rem",
        cursor: tool.comingSoon ? "default" : "pointer",
        opacity: tool.comingSoon ? 0.7 : 1,
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem", height: 36, display: "flex", alignItems: "center" }}>
        {tool.iconType === "item" ? (
          <ItemIcon id={tool.itemId} size={36} />
        ) : (
          tool.icon
        )}
      </div>
      <div
        className="panel-header-title"
        style={{ color: theme.text, fontSize: "1.1rem", marginBottom: "0.5rem" }}
      >
        {tool.title}
      </div>
      <div
        style={{
          fontSize: "0.82rem",
          color: theme.muted,
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        {tool.description}
      </div>
      <div
        style={{
          marginTop: "1rem",
          fontSize: "0.78rem",
          fontWeight: 800,
          color: tool.comingSoon ? theme.muted : theme.accent,
        }}
      >
        {tool.comingSoon ? "Coming soon" : "Open tool →"}
      </div>
    </div>
  );
}

function ToolGrid({ tools, theme }: { tools: ToolCard[]; theme: AppTheme }) {
  return (
    <div
      className="tools-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.25rem",
      }}
    >
      {tools.map((tool) =>
        tool.comingSoon ? (
          <div key={tool.title}>
            <ToolCardInner tool={tool} theme={theme} />
          </div>
        ) : (
          <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
            <ToolCardInner tool={tool} theme={theme} />
          </Link>
        ),
      )}
    </div>
  );
}

function ToolsContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .tool-card { transition: background 0.35s ease, border-color 0.35s ease, transform 0.15s ease; }
        .tool-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        @media (max-width: 860px) {
          .tools-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="page-container">
          <div className="page-title" style={{ color: theme.text }}>
            Tools
          </div>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            MapleStory calculators, trackers, and utilities
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: "0.85rem",
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "0.75rem",
            }}
          >
            Calculators
          </div>

          <ToolGrid tools={CALCULATORS} theme={theme} />

          <div
            style={{
              fontWeight: 700,
              fontSize: "0.85rem",
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginTop: "2rem",
              marginBottom: "0.75rem",
            }}
          >
            Trackers
          </div>

          <ToolGrid tools={TRACKERS} theme={theme} />

          <div
            style={{
              fontWeight: 700,
              fontSize: "0.85rem",
              color: theme.muted,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginTop: "2rem",
              marginBottom: "0.75rem",
            }}
          >
            Other Tools
          </div>

          <ToolGrid tools={OTHER_TOOLS} theme={theme} />
        </div>
      </div>
    </>
  );
}

export default function ToolsPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <ToolsContent theme={theme} />}
    </AppShell>
  );
}
