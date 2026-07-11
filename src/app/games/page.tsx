"use client";

/*
  Games landing page.
  Displays games as compact linked rows inside a category panel.
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

// Uppercase category label inside the panel; color (theme.muted) inline.
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

function GameRow({ game, theme }: { game: GameCard; theme: AppTheme }) {
  return (
    <Link href={game.href} className="game-row" style={rowBaseStyle}>
      <div style={{ ...iconTileBase, background: theme.bg }}>{game.icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: theme.text }}>
          {game.title}
        </div>
        <div
          className="game-row-desc"
          style={{
            fontSize: "0.78rem",
            color: theme.muted,
            fontWeight: 600,
            lineHeight: 1.45,
            marginTop: "0.15rem",
            overflowWrap: "break-word",
          }}
        >
          {game.description}
        </div>
      </div>
      <span className="game-row-arrow" style={{ ...rowArrowBase, color: theme.accentText }}>
        →
      </span>
    </Link>
  );
}

function GamesContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .game-row { transition: background 0.15s ease; }
        .game-row:hover, .game-row:focus-visible { background: ${theme.accentSoft}; }
        .game-row .game-row-arrow { opacity: 0; transition: opacity 0.15s ease; }
        .game-row:hover .game-row-arrow, .game-row:focus-visible .game-row-arrow { opacity: 1; }
        @media (min-width: 861px) {
          .game-row-desc {
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
            Games
          </div>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            Daily MapleStory minigames
          </div>

          <div
            className="fade-in panel-card"
            style={{ background: theme.panel, border: `1px solid ${theme.border}` }}
          >
            <div style={{ ...panelLabelBase, color: theme.muted }}>Games</div>
            <div style={rowGridStyle}>
              {GAMES.map((game) => (
                <GameRow key={game.href} game={game} theme={theme} />
              ))}
            </div>
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
