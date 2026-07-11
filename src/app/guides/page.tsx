"use client";

/*
  Guides landing page.
  Displays guides as compact linked rows inside a category panel.
*/
import type { CSSProperties } from "react";
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

function GuideRow({ guide, theme }: { guide: GuideCard; theme: AppTheme }) {
  return (
    <Link href={guide.href} className="guide-row" style={rowBaseStyle}>
      <div style={{ ...iconTileBase, background: theme.bg }}>{guide.emoji}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: theme.text }}>
          {guide.title}
        </div>
        <div
          className="guide-row-desc"
          style={{
            fontSize: "0.78rem",
            color: theme.muted,
            fontWeight: 600,
            lineHeight: 1.45,
            marginTop: "0.15rem",
            overflowWrap: "break-word",
          }}
        >
          {guide.description}
        </div>
      </div>
      <span className="guide-row-arrow" style={{ ...rowArrowBase, color: theme.accentText }}>
        →
      </span>
    </Link>
  );
}

function GuidesContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        .guide-row { transition: background 0.15s ease; }
        .guide-row:hover, .guide-row:focus-visible { background: ${theme.accentSoft}; }
        .guide-row .guide-row-arrow { opacity: 0; transition: opacity 0.15s ease; }
        .guide-row:hover .guide-row-arrow, .guide-row:focus-visible .guide-row-arrow { opacity: 1; }
        @media (min-width: 861px) {
          .guide-row-desc {
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
            Guides
          </div>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            MapleStory guides and resources
          </div>

          <div
            className="fade-in panel-card"
            style={{ background: theme.panel, border: `1px solid ${theme.border}` }}
          >
            <div style={{ ...panelLabelBase, color: theme.muted }}>Guides</div>
            <div style={rowGridStyle}>
              {GUIDES.map((guide) => (
                <GuideRow key={guide.href} guide={guide} theme={theme} />
              ))}
            </div>
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
