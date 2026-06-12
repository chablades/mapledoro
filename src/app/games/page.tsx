"use client";

/*
  Games landing page.
  Displays a grid of available game cards that link to their sub-routes.
*/
import type { CSSProperties } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

interface GameCard {
  title: string;
  description: string;
  icon: string;
  href: string;
}

const GAMES: GameCard[] = [
  {
    title: "Mapledle",
    description:
      "Guess which class learns the daily skill icon in 5 tries. A new puzzle arrives every day at 00:00 UTC.",
    icon: "🎯",
    href: "/games/skill-guesser",
  },
];

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "1.25rem",
};

function GamesContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .hover-lift-card:hover { border-color: ${theme.accent} !important; }
        @media (max-width: 860px) {
          .games-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="page-container">
          <div className="page-title" style={{ color: theme.text }}>
            Games
          </div>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            Daily MapleStory minigames
          </div>

          <div className="fade-in games-grid" style={cardGridStyle}>
            {GAMES.map((game) => (
              <Link key={game.href} href={game.href} style={{ textDecoration: "none" }}>
                <div
                  className="panel-card hover-lift-card"
                  style={{
                    background: theme.panel,
                    border: `1px solid ${theme.border}`,
                    padding: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem", height: 36, display: "flex", alignItems: "center" }}>
                    {game.icon}
                  </div>
                  <div
                    className="panel-header-title"
                    style={{ color: theme.text, fontSize: "1.1rem", marginBottom: "0.5rem" }}
                  >
                    {game.title}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600, lineHeight: 1.5 }}>
                    {game.description}
                  </div>
                  <div style={{ marginTop: "1rem", fontSize: "0.78rem", fontWeight: 800, color: theme.accent }}>
                    Play →
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

export default function GamesPage() {
  return (
    <AppShell currentPath="/games">
      {({ theme }) => <GamesContent theme={theme} />}
    </AppShell>
  );
}
