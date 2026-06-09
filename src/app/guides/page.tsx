"use client";

/*
  Guides landing page.
  Displays a grid of available guide cards that link to their sub-routes.
*/
import Link from "next/link";
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

interface GuideCard {
  title: string;
  description: string;
  emoji: string;
  href: string;
}

const GUIDES: GuideCard[] = [
  {
    title: "New Players Guide",
    description:
      "Everything you need to know to get started in MapleStory.",
    emoji: "🌱",
    href: "/guides/new-players",
  },
  {
    title: "Character Guides",
    description:
      "Browse all MapleStory classes with overviews, link skills, and legion bonuses.",
    emoji: "⚔️",
    href: "/guides/character-guides",
  },
];

function GuidesContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .hover-lift-card:hover { border-color: ${theme.accent} !important; }
        @media (max-width: 860px) {
          .guides-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="page-container">
          <div className="page-title" style={{ color: theme.text }}>
            Guides
          </div>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            MapleStory guides and resources
          </div>

          <div
            className="guides-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {GUIDES.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="fade-in panel-card hover-lift-card"
                  style={{
                    background: theme.panel,
                    border: `1px solid ${theme.border}`,
                    padding: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                    {guide.emoji}
                  </div>
                  <div
                    className="panel-header-title"
                    style={{ color: theme.text, fontSize: "1.1rem", marginBottom: "0.5rem" }}
                  >
                    {guide.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: theme.muted,
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    {guide.description}
                  </div>
                  <div
                    style={{
                      marginTop: "1rem",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      color: theme.accent,
                    }}
                  >
                    Read guide →
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

export default function GuidesPage() {
  return (
    <AppShell currentPath="/guides">
      {({ theme }) => <GuidesContent theme={theme} />}
    </AppShell>
  );
}
