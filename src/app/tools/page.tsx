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

const TOOLS: ToolCard[] = [
  {
    title: "Boss Crystal Calculator",
    description:
      "Calculate your weekly boss crystal income across all characters.",
    emoji: "💎",
    href: "/tools/boss-crystals",
  },
];

function ToolsContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .tool-card { transition: background 0.35s ease, border-color 0.35s ease, transform 0.15s ease; }
        .tool-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        @media (max-width: 860px) {
          .tools-main { padding: 1rem !important; }
          .tools-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="tools-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.5rem",
              color: theme.text,
              marginBottom: "0.25rem",
            }}
          >
            Tools
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            MapleStory calculators and utilities
          </div>

          <div
            className="tools-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="fade-in tool-card"
                  style={{
                    background: theme.panel,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "18px",
                    padding: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                    {tool.emoji}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "1.1rem",
                      color: theme.text,
                      marginBottom: "0.5rem",
                    }}
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
