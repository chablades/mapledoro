"use client";

/*
  Individual class guide page (placeholder template).
  Dynamic route: /guides/character-guides/[className]
*/

import React, { Suspense, use, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "../../../../components/AppShell";
import type { AppTheme } from "../../../../components/themes";
import { findClassBySlug, DIFFICULTY_COLORS, highlightNumbers } from "../classData";
import { loadClassSkills } from "../classSkills/types";
import ClassSkillsTabs from "../ClassSkillsTabsColumns";
import { CLASS_RESOURCES } from "../classResources";
import type { ClassResource } from "../classResources";
import { WikiAttribution, WIKI_ATTRIBUTION_SOURCE } from "../../../../components/WikiAttribution";

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
          <InfographicPanel className={cls.name} theme={theme} />

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
                marginBottom: "0.75rem",
              }}
            >
              Link Skill
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {cls.linkSkillIcon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cls.linkSkillIcon}
                  alt={cls.linkSkillName}
                  width={36}
                  height={36}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    border: `1px solid ${theme.border}`,
                    background: theme.bg,
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                />
              )}
              <div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 800,
                    color: theme.text,
                    marginBottom: "0.25rem",
                  }}
                >
                  {cls.linkSkillName}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: theme.muted,
                    fontWeight: 600,
                    lineHeight: 1.6,
                  }}
                >
                  {highlightNumbers(cls.link.replace(/^[^:]+:\s*/, ""))}
                </div>
              </div>
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

          <ResourcesPanel className={cls.name} theme={theme} />

          <Suspense fallback={<SkillsFallback theme={theme} />}>
            <AsyncClassSkills className={cls.name} theme={theme} />
          </Suspense>

          <WikiAttribution
            theme={theme}
            sources={[
              WIKI_ATTRIBUTION_SOURCE,
              {
                label: "Grandis Library",
                href: "https://grandislibrary.com",
              },
              {
                label: "Nexon",
                href: "https://maplestory.nexon.net",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

const RESOURCE_TYPE_COLORS: Record<ClassResource["type"], string> = {
  discord: "#5865F2",
  doc: "#4a9eff",
  wiki: "#2d8a2d",
  infographic: "#c44090",
  other: "#c49a2a",
};

const RESOURCE_TYPE_LABELS: Record<ClassResource["type"], string> = {
  discord: "Discord",
  doc: "Guide",
  wiki: "Wiki",
  infographic: "Infographic",
  other: "Link",
};

function InfographicPanel({ className, theme }: { className: string; theme: AppTheme }) {
  const [open, setOpen] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const resources = CLASS_RESOURCES[className];
  const infographic = resources?.find((r) => r.type === "infographic");
  if (!infographic) return null;
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Fredoka One', cursive",
          fontSize: "0.9rem",
          color: theme.text,
        }}
      >
        Class Infographic
        <span
          style={{
            fontSize: "0.75rem",
            color: theme.muted,
            fontWeight: 600,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 1.25rem 1.25rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={infographic.url}
            alt={`${className} infographic`}
            onClick={() => setZoomed(true)}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "10px",
              border: `1px solid ${theme.border}`,
              cursor: "zoom-in",
            }}
          />
          <div
            style={{
              fontSize: "0.68rem",
              color: theme.muted,
              fontWeight: 600,
              marginTop: "0.35rem",
              textAlign: "right",
              opacity: 0.6,
            }}
          >
            via{" "}
            <a
              href="https://www.reddit.com/r/Maplestory/comments/17ocjs4/class_infographics_all_50_new_age/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.muted, textDecoration: "none" }}
            >
              u/CovetedEggBar6541
            </a>
          </div>
        </div>
      )}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
            padding: "2rem",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={infographic.url}
            alt={`${className} infographic`}
            style={{
              maxWidth: "95vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
          <a
            href={infographic.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: "0.75rem",
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
            }}
          >
            Open on Imgur ↗
          </a>
        </div>
      )}
    </div>
  );
}

function ResourcesPanel({ className, theme }: { className: string; theme: AppTheme }) {
  const resources = CLASS_RESOURCES[className]?.filter((r) => r.type !== "infographic");
  if (!resources || resources.length === 0) return null;
  return (
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
          marginBottom: "0.75rem",
        }}
      >
        Community Resources
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {resources.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "20px",
              border: `1.5px solid ${RESOURCE_TYPE_COLORS[r.type]}`,
              color: RESOURCE_TYPE_COLORS[r.type],
              fontSize: "0.78rem",
              fontWeight: 700,
              textDecoration: "none",
              background: "transparent",
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: RESOURCE_TYPE_COLORS[r.type],
                flexShrink: 0,
              }}
            />
            <span style={{ color: theme.muted, fontWeight: 600, fontSize: "0.72rem" }}>
              {RESOURCE_TYPE_LABELS[r.type]}
            </span>
            {r.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function AsyncClassSkills({ className, theme }: { className: string; theme: AppTheme }) {
  const skillsPromise = useMemo(() => loadClassSkills(className), [className]);
  const skillSet = use(skillsPromise);
  if (!skillSet || skillSet.skills.length === 0) return null;
  return <ClassSkillsTabs skills={skillSet.skills} theme={theme} />;
}

function SkillsFallback({ theme }: { theme: AppTheme }) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "1.25rem",
        fontSize: "0.82rem",
        color: theme.muted,
        fontWeight: 600,
        fontStyle: "italic",
      }}
    >
      Loading skills…
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
