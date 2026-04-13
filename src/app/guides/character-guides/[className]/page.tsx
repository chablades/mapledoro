"use client";

/*
  Individual class guide page (placeholder template).
  Dynamic route: /guides/character-guides/[className]
*/

import React, { use } from "react";
import Link from "next/link";
import AppShell from "../../../../components/AppShell";
import type { AppTheme } from "../../../../components/themes";
import { findClassBySlug, DIFFICULTY_COLORS, highlightNumbers } from "../classData";

function ClassGuideContent({
  theme,
  slug,
}: {
  theme: AppTheme;
  slug: string;
}) {
  const cls = findClassBySlug(slug);

  if (!cls) {
    return (
      <div
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Link
            href="/guides/character-guides"
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: theme.accent,
              textDecoration: "none",
              display: "inline-block",
              marginBottom: "0.75rem",
            }}
          >
            ← Back to Character Guides
          </Link>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.25rem",
              color: theme.text,
              marginTop: "1rem",
            }}
          >
            Class not found
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginTop: "0.5rem",
            }}
          >
            The class you&apos;re looking for doesn&apos;t exist.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        padding: "1.5rem 1.5rem 2rem 2.75rem",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Back link */}
        <Link
          href="/guides/character-guides"
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: theme.accent,
            textDecoration: "none",
            display: "inline-block",
            marginBottom: "1rem",
          }}
        >
          ← Back to Character Guides
        </Link>

        {/* Hero section */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "flex-start",
            marginBottom: "2rem",
          }}
        >
          {/* Portrait */}
          <div
            style={{
              width: "140px",
              minWidth: "140px",
              height: "140px",
              borderRadius: "14px",
              border: `1px solid ${theme.border}`,
              background: theme.panel,
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
                width={140}
                height={140}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "3rem",
                  color: theme.muted,
                }}
              >
                {cls.name[0]}
              </div>
            )}
          </div>

          {/* Class info */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.5rem",
                color: theme.text,
                marginBottom: "0.25rem",
              }}
            >
              {cls.name}
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: theme.accent,
                marginBottom: "0.5rem",
              }}
            >
              {cls.region}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: theme.muted,
                fontWeight: 600,
                lineHeight: 1.6,
                marginBottom: "0.75rem",
              }}
            >
              {cls.summary}
            </div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}
            >
              <span style={{ color: theme.text }}>
                Difficulty:{" "}
                <span style={{ color: DIFFICULTY_COLORS[cls.difficulty] }}>
                  {cls.difficulty}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Info panels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Link Skill */}
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.5rem",
              }}
            >
              Link Skill
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: theme.muted,
                fontWeight: 600,
                lineHeight: 1.6,
              }}
            >
              {highlightNumbers(cls.link)}
            </div>
          </div>

          {/* Legion */}
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.5rem",
              }}
            >
              Legion Bonus
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: theme.muted,
                fontWeight: 600,
                lineHeight: 1.6,
              }}
            >
              {highlightNumbers(cls.legion)}
            </div>
          </div>

          {/* Placeholder sections */}
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.5rem",
              }}
            >
              Skill Build
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: theme.muted,
                fontWeight: 600,
                fontStyle: "italic",
              }}
            >
              Coming soon — detailed skill build recommendations.
            </div>
          </div>

          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.5rem",
              }}
            >
              Gear Progression
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: theme.muted,
                fontWeight: 600,
                fontStyle: "italic",
              }}
            >
              Coming soon — recommended gear progression path.
            </div>
          </div>

          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.5rem",
              }}
            >
              Training Guide
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: theme.muted,
                fontWeight: 600,
                fontStyle: "italic",
              }}
            >
              Coming soon — optimal training maps and rotation tips.
            </div>
          </div>

          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.5rem",
              }}
            >
              Bossing Tips
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: theme.muted,
                fontWeight: 600,
                fontStyle: "italic",
              }}
            >
              Coming soon — boss mechanics and class-specific strategies.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClassGuidePage({
  params,
}: {
  params: Promise<{ className: string }>;
}) {
  const { className } = use(params);
  return (
    <AppShell currentPath="/guides">
      {({ theme }) => <ClassGuideContent theme={theme} slug={className} />}
    </AppShell>
  );
}
