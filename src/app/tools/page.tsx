"use client";

/*
  Tools landing page.
  Groups tools into one panel per category, each tool a compact linked row.
*/
import type { CSSProperties } from "react";
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
      "Plan star force spending for the next event, estimating meso cost and spare items needed.",
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
    title: "Trace Restoration Tracker",
    description:
      "Track whisper crystal progress and trace restoration missions toward your target items.",
    itemId: "04001956", // Pitched Whisper Crystal
    iconType: "item",
    href: "/tools/trace-restoration",
  },
];

const SECTIONS: { label: string; tools: ToolCard[] }[] = [
  { label: "Calculators", tools: CALCULATORS },
  { label: "Trackers", tools: TRACKERS },
  { label: "Other Tools", tools: OTHER_TOOLS },
];

// Uppercase category label inside each panel; color (theme.muted) inline.
const panelLabelBase: CSSProperties = {
  fontWeight: 700,
  fontSize: "0.85rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "1.15rem 1.4rem 0.2rem",
};

const rowGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))",
  columnGap: "0.5rem",
  padding: "0.35rem 0.65rem 0.65rem",
};

const rowBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "0.85rem",
  padding: "0.7rem 0.75rem",
  borderRadius: 12,
  textDecoration: "none",
};

// Fixed square behind each icon so titles align on one vertical scan line.
const iconTileBase: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.25rem",
};

const rowArrowBase: CSSProperties = {
  marginLeft: "auto",
  alignSelf: "center",
  fontWeight: 800,
  fontSize: "0.9rem",
};

function ToolRow({ tool, theme }: { tool: ToolCard; theme: AppTheme }) {
  const inner = (
    <>
      <div style={{ ...iconTileBase, background: theme.bg }}>
        {tool.iconType === "item" ? <ItemIcon id={tool.itemId} size={26} /> : tool.icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: theme.text }}>
            {tool.title}
          </span>
          {tool.comingSoon && (
            <span className="tool-badge" style={{ background: theme.badge, color: theme.badgeText }}>
              Soon
            </span>
          )}
        </div>
        <div
          className="tool-row-desc"
          style={{
            fontSize: "0.78rem",
            color: theme.muted,
            fontWeight: 500,
            lineHeight: 1.45,
            marginTop: "0.15rem",
            overflowWrap: "break-word",
          }}
        >
          {tool.description}
        </div>
      </div>
      {!tool.comingSoon && (
        <span className="tool-row-arrow" style={{ ...rowArrowBase, color: theme.accent }}>
          →
        </span>
      )}
    </>
  );

  if (tool.comingSoon) {
    return <div style={{ ...rowBaseStyle, opacity: 0.55 }}>{inner}</div>;
  }
  return (
    <Link href={tool.href} className="tool-row" style={rowBaseStyle}>
      {inner}
    </Link>
  );
}

function ToolsContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .tool-row { transition: background 0.15s ease; }
        .tool-row:hover, .tool-row:focus-visible { background: ${theme.accentSoft}; }
        .tool-row .tool-row-arrow { opacity: 0; transition: opacity 0.15s ease; }
        .tool-row:hover .tool-row-arrow, .tool-row:focus-visible .tool-row-arrow { opacity: 1; }
        /* Equal-height rows where two columns render; mobile wraps naturally. */
        @media (min-width: 861px) {
          .tool-row-desc {
            min-height: calc(0.78rem * 1.45 * 2);
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
          }
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

          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {SECTIONS.map((section) => (
              <div
                key={section.label}
                className="panel-card"
                style={{ background: theme.panel, border: `1px solid ${theme.border}` }}
              >
                <div style={{ ...panelLabelBase, color: theme.muted }}>
                  {section.label}
                </div>
                <div style={rowGridStyle}>
                  {section.tools.map((tool) => (
                    <ToolRow key={tool.title} tool={tool} theme={theme} />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
