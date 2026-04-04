"use client";

/*
  Tools landing page.
  Displays a grid of available tool cards that link to their sub-routes.
*/
import Link from "next/link";
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

interface ToolCard {
  title: string;
  description: string;
  emoji: string;
  href: string;
}

const CALCULATORS: ToolCard[] = [
  {
    title: "Boss Crystal Calculator",
    description:
      "Calculate your weekly boss crystal income across all characters.",
    emoji: "💎",
    href: "/tools/boss-crystals",
  },
  {
    title: "Liberation Calculator",
    description:
      "Track your Genesis and Destiny liberation progress and estimate completion.",
    emoji: "🗡️",
    href: "/tools/liberation",
  },
  {
    title: "Symbol Calculator",
    description:
      "Track your Arcane and Sacred symbol progress and estimate days to max.",
    emoji: "🔮",
    href: "/tools/symbols",
  },
];

const TRACKERS: ToolCard[] = [
  {
    title: "HEXA Skill Tracker",
    description:
      "Track Sol Erda and Fragment costs to max your HEXA skills per character.",
    emoji: "🔷",
    href: "/tools/hexa-skills",
  },
  {
    title: "Pitched Boss Drop Tracker",
    description:
      "Track and analyze your rare pitched boss drops across all characters.",
    emoji: "🎯",
    href: "/tools/pitched-boss-drops",
  },
];

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
      {tools.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          style={{ textDecoration: "none" }}
        >
          <div
            className="fade-in tool-card panel-card"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              padding: "1.5rem",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
              {tool.emoji}
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
                color: theme.accent,
              }}
            >
              Open tool →
            </div>
          </div>
        </Link>
      ))}
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
