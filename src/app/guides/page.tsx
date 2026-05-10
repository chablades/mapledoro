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
        .guide-card { transition: background 0.35s ease, border-color 0.35s ease, transform 0.15s ease; }
        .guide-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        @media (max-width: 860px) {
          .guides-main { padding: 1rem !important; }
          .guides-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="guides-main"
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
            Guides
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
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
                  className="fade-in guide-card"
                  style={{
                    background: theme.panel,
                    border: `1px solid ${theme.border}`,
                    borderRadius: "18px",
                    padding: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                    {guide.emoji}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "1.1rem",
                      color: theme.text,
                      marginBottom: "0.5rem",
                    }}
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
