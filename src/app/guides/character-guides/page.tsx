"use client";

/*
  Character Guides listing page.
  Displays all MapleStory classes as clickable cards grouped by faction,
  with a search bar to filter classes.
*/

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import type { AppTheme } from "../../../components/themes";
import { CLASSES, CLASS_TYPES, type ClassEntry } from "./classData";
import { WikiAttribution } from "../../../components/WikiAttribution";

/* ── Class card ───────────────────────────────────────────────── */

function ClassCard({ cls, theme }: { cls: ClassEntry; theme: AppTheme }) {
  return (
    <Link
      href={`/guides/character-guides/${cls.slug}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="class-card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.85rem 0.5rem",
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "14px",
          cursor: "pointer",
          transition:
            "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.2s ease",
        }}
      >
        {/* Portrait */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "10px",
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {cls.portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cls.portrait}
              alt={cls.name}
              width={72}
              height={72}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.5rem",
                color: theme.muted,
              }}
            >
              {cls.name[0]}
            </div>
          )}
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "0.78rem",
            color: theme.text,
            textAlign: "center",
            lineHeight: 1.25,
            minHeight: "1.8em",
          }}
        >
          {cls.name}
        </div>
      </div>
    </Link>
  );
}

/* ── Main content ─────────────────────────────────────────────── */

function CharacterGuidesContent({ theme }: { theme: AppTheme }) {
  const [search, setSearch] = useState("");

  const query = search.toLowerCase().trim();
  const filtered = query
    ? CLASSES.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.classType.toLowerCase().includes(query) ||
          c.region.toLowerCase().includes(query),
      )
    : CLASSES;

  const grouped: { classType: string; classes: typeof filtered }[] = [];
  for (const classType of CLASS_TYPES) {
    const classes = filtered.filter((c) => c.classType === classType);
    if (classes.length > 0) grouped.push({ classType, classes });
  }

  return (
    <>
      <style>{`
        .class-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        }
        @media (max-width: 860px) {
          .char-guides-main { padding: 1rem !important; }
          .char-guides-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)) !important; }
        }
      `}</style>

      <div
        className="char-guides-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/guides"
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: theme.accent,
              textDecoration: "none",
              display: "inline-block",
              marginBottom: "0.75rem",
            }}
          >
            ← Back to Guides
          </Link>

          {/* Title */}
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.5rem",
              color: theme.text,
              marginBottom: "0.25rem",
            }}
          >
            Character Guides
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Browse all MapleStory classes. Click any class for its community made guide
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: theme.muted,
              fontWeight: 600,
              lineHeight: 1.7,
              opacity: 0.7,
              marginBottom: "1.25rem",
              maxWidth: 700,
            }}
          >
            All guides and infographics are created by the MapleStory community, not
            MapleDoro. Information shown here may be outdated; always check the
            original class document or class Discord (linked in Community Resources)
            for the most up-to-date information.
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: "1.5rem" }}>
            <input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 400,
                padding: "0.6rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                borderRadius: "12px",
                border: `1px solid ${theme.border}`,
                background: theme.panel,
                color: theme.text,
                outline: "2px solid transparent",
                outlineOffset: "2px",
                transition: "border-color 0.2s ease, outline-color 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.outlineColor = theme.accent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.outlineColor = "transparent";
              }}
            />
          </div>

          {/* No results */}
          {grouped.length === 0 && (
            <div
              style={{
                fontSize: "0.9rem",
                color: theme.muted,
                fontWeight: 600,
                padding: "2rem 0",
              }}
            >
              No classes found matching &ldquo;{search}&rdquo;
            </div>
          )}

          {/* Grouped class cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
            }}
          >
            {grouped.map(({ classType, classes }) => (
              <div key={classType}>
                <div
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1rem",
                    color: theme.accent,
                    marginBottom: "0.75rem",
                  }}
                >
                  {classType}
                </div>
                <div
                  className="char-guides-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: "0.85rem",
                  }}
                >
                  {classes.map((cls) => (
                    <ClassCard key={cls.name} cls={cls} theme={theme} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem" }}>
            <WikiAttribution
              theme={theme}
              sources={[
                {
                  label: "Nexon",
                  href: "https://maplestory.nexon.net",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default function CharacterGuidesPage() {
  return (
    <AppShell currentPath="/guides">
      {({ theme }) => <CharacterGuidesContent theme={theme} />}
    </AppShell>
  );
}
