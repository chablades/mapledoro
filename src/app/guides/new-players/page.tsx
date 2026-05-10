"use client";

/*
  New Players Guide page.
  A long-form guide with text sections and images for MapleStory beginners.
*/
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "../../../components/AppShell";
import type { AppTheme } from "../../../components/themes";
import {
  CLASSES,
  CLASS_REGIONS,
  DIFFICULTY_COLORS,
  highlightNumbers,
  type ClassEntry,
} from "../character-guides/classData";

/* ── Section data ──────────────────────────────────────────────── */

interface GuideSection {
  id: string;
  title: string;
  /* image path inside /public/guides/new-players/ */
  image?: string;
  imageAlt?: string;
  body: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to MapleStory",
    image: undefined, // e.g. "/guides/new-players/welcome.png"
    imageAlt: "",
    body: `Welcome to MapleStory. MapleStory is a free-to-play 2D side-scrolling MMORPG that has been running since 2003. You play as a character in the Maple World, leveling from 1 all the way to the cap of 300 by fighting monsters, completing quests, and tackling increasingly difficult bosses.

The gameplay loop revolves around dailies, weekly bossing, farming, and gear progression. Each day you'll complete daily quests and bosses to earn resources and strengthen your character. Each week you'll take on harder bosses for mesos and rare drops. In between, you'll farm maps for EXP and mesos, and pour those gains into upgrading your equipment through systems like Star Force, cubing, and flaming.

In this guide, you'll learn how to get started, pick a class, understand the core systems, and begin progressing your character. Whether you're completely new or returning after a long break, this will walk you through the essentials.`,
  },
  {
    id: "choosing-class",
    title: "Choosing Your Class",
    image: undefined,
    imageAlt: "",
    body: `MapleStory has over 50 playable classes, and the best one to pick is whichever one you think looks cool.
    
    Some classes are flashy and fast, others are tanky and methodical. Some have huge mobbing skills that wipe the map, others excel at bossing with high single-target damage. You don't need to commit right away either — making multiple characters is actually encouraged since they provide passive stat boosts to your whole account through the Legion system.

Can't decide? Hit the button below and let fate choose for you.`,
  },
  {
    id: "early-leveling",
    title: "Early Leveling",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
  {
    id: "core-mechanics",
    title: "Core Mechanics",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
  {
    id: "tips",
    title: "Useful Tips",
    image: undefined,
    imageAlt: "",
    body: "Section content goes here.",
  },
];

function ClassRandomizer({ theme }: { theme: AppTheme }) {
  const [result, setResult] = useState<ClassEntry | null>(null);

  function roll() {
    setResult(CLASSES[Math.floor(Math.random() * CLASSES.length)]); // eslint-disable-line sonarjs/pseudo-random
  }

  return (
    <div className="guide-randomizer">
      <button
        onClick={roll}
        className="guide-primary-btn"
        style={{
          background: theme.accent,
          color: "#fff",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Randomize my class
      </button>

      {result && (
        <div
          className="class-card"
          style={{
            width: "100%",
            background: theme.accentSoft,
            border: `1px solid ${theme.border}`,
          }}
        >
          {/* Portrait */}
          <div
            className="class-portrait-frame class-portrait-lg"
            style={{
              border: `1px solid ${theme.border}`,
              background: theme.panel,
            }}
          >
            <Image
              src={result.portrait}
              alt={result.name}
              width={120}
              height={120}
              className="class-portrait-img"
            />
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.05rem",
                color: theme.accent,
                marginBottom: "0.5rem",
              }}
            >
              {result.name}
            </div>

            <div style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600, lineHeight: 1.6, marginBottom: "0.75rem" }}>
              {result.summary}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Difficulty:{" "}
                <span style={{ color: DIFFICULTY_COLORS[result.difficulty] }}>{result.difficulty}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Link Skill:{" "}
                <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(result.link)}</span>
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
                Legion:{" "}
                <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(result.legion)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Expanded class info panel ─────────────────────────────────── */

function ClassInfoPanel({ cls, theme }: { cls: ClassEntry; theme: AppTheme }) {
  return (
    <div
      className="class-card"
      style={{
        gridColumn: "1 / -1",
        background: theme.accentSoft,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Portrait */}
      <div
        className="class-portrait-frame class-portrait-md"
        style={{
          border: `1px solid ${theme.border}`,
          background: theme.panel,
        }}
      >
        <Image
          src={cls.portrait}
          alt={cls.name}
          width={100}
          height={100}
          className="class-portrait-img"
        />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "0.95rem",
            color: theme.accent,
            marginBottom: "0.4rem",
          }}
        >
          {cls.name}
        </div>
        <div style={{ fontSize: "0.8rem", color: theme.muted, fontWeight: 600, lineHeight: 1.6, marginBottom: "0.6rem" }}>
          {cls.summary}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Difficulty:{" "}
            <span style={{ color: DIFFICULTY_COLORS[cls.difficulty] }}>{cls.difficulty}</span>
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Link Skill:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.link)}</span>
          </div>
          <div style={{ fontSize: "0.76rem", fontWeight: 700, color: theme.text }}>
            Legion:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.legion)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Class directory by region ─────────────────────────────────── */

function ClassDirectory({ theme }: { theme: AppTheme }) {
  const [selected, setSelected] = useState<string | null>(null);

  const grouped: { region: string; classes: typeof CLASSES }[] = [];
  for (const region of CLASS_REGIONS) {
    const classes = CLASSES.filter((c) => c.region === region);
    if (classes.length > 0) grouped.push({ region, classes });
  }

  function toggle(name: string) {
    setSelected((prev) => (prev === name ? null : name));
  }

  return (
    <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1rem",
          color: theme.text,
        }}
      >
        All Classes by Faction
      </div>

      {grouped.map(({ region, classes }) => (
        <div key={region}>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "0.85rem",
              color: theme.accent,
              marginBottom: "0.75rem",
            }}
          >
            {region}
          </div>
          <div
            className="class-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {classes.map((cls) => {
              const isSelected = selected === cls.name;
              return (
                <React.Fragment key={cls.name}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="class-picker-tile"
                    onClick={() => toggle(cls.name)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(cls.name); } }}
                    style={{
                      transform: isSelected ? "scale(1.05)" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <div
                      className="class-picker-icon"
                      style={{
                        border: `2px solid ${isSelected ? theme.accent : theme.border}`,
                        background: theme.panel,
                        boxShadow: isSelected ? `0 0 0 2px ${theme.accentSoft}` : "none",
                      }}
                    >
                      <Image
                        src={cls.portrait}
                        alt={cls.name}
                        width={72}
                        height={72}
                        className="class-portrait-img"
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: isSelected ? theme.accent : theme.text,
                        textAlign: "center",
                        lineHeight: 1.2,
                        transition: "color 0.2s ease",
                      }}
                    >
                      {cls.name}
                    </div>
                  </div>

                  {/* Expanded info panel — spans full grid width */}
                  {isSelected && <ClassInfoPanel cls={cls} theme={theme} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Components ────────────────────────────────────────────────── */

function SectionCard({
  section,
  theme,
  index,
  children,
}: {
  section: GuideSection;
  theme: AppTheme;
  index: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="fade-in"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "18px",
        padding: "2rem 1.75rem",
        animationDelay: `${index * 0.06}s`,
        animationFillMode: "both",
      }}
    >
      {/* Section heading */}
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.15rem",
          color: theme.text,
          marginBottom: "1rem",
        }}
      >
        {section.title}
      </div>

      {/* Optional image */}
      {section.image && (
        <div
          style={{
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "1.25rem",
            border: `1px solid ${theme.border}`,
          }}
        >
          <Image
            src={section.image}
            alt={section.imageAlt || section.title}
            width={1000}
            height={500}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}

      {/* Body text */}
      <div
        style={{
          fontSize: "0.88rem",
          color: theme.muted,
          fontWeight: 600,
          lineHeight: 1.75,
          whiteSpace: "pre-line",
        }}
      >
        {section.body}
      </div>

      {children}
    </div>
  );
}

function NewPlayersContent({ theme }: { theme: AppTheme }) {
  return (
    <>
      <style>{`
        @media (max-width: 860px) {
          .guide-main { padding: 1rem !important; }
        }
        @media (max-width: 500px) {
          .class-card { flex-direction: column !important; align-items: center !important; text-align: center !important; }
        }
      `}</style>

      <div
        className="guide-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          {/* Back link */}
          <Link
            href="/guides"
            className="guide-back-link"
            style={{
              color: theme.accent,
            }}
          >
            ← Back to Guides
          </Link>

          {/* Page title */}
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.5rem",
              color: theme.text,
              marginBottom: "0.25rem",
            }}
          >
            New Players Guide
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: theme.muted,
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            Everything you need to know to get started in MapleStory
          </div>

          {/* Table of contents */}
          <div
            className="fade-in"
            style={{
              background: theme.accentSoft,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "0.9rem",
                color: theme.text,
                marginBottom: "0.75rem",
              }}
            >
              Contents
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: theme.accent,
                    textDecoration: "none",
                  }}
                >
                  {i + 1}. {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Guide sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {SECTIONS.map((section, i) => (
              <div key={section.id} id={section.id}>
                <SectionCard section={section} theme={theme} index={i}>
                  {section.id === "choosing-class" && (
                    <>
                      <ClassRandomizer theme={theme} />
                      <ClassDirectory theme={theme} />
                    </>
                  )}
                </SectionCard>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function NewPlayersGuidePage() {
  return (
    <AppShell currentPath="/guides">
      {({ theme }) => <NewPlayersContent theme={theme} />}
    </AppShell>
  );
}
