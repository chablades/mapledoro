"use client";

import React, { type CSSProperties, use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AppShell from "../../../../components/AppShell";
import type { AppTheme } from "../../../../components/themes";
import { findClassBySlug, highlightNumbers } from "../classData";
import { CLASS_RESOURCES } from "../classResources";
import type { ClassResource } from "../classResources";
import { WikiAttribution, WIKI_ATTRIBUTION_SOURCE } from "../../../../components/WikiAttribution";
import { HEXA_IMAGES } from "../hexaData";

/* ── Extracted styles ─────────────────────────────────────── */

function heroPortraitStyle(theme: AppTheme): CSSProperties {
  return {
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
  };
}

function collapsibleButtonStyle(theme: AppTheme): CSSProperties {
  return {
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
  };
}

function wipPlaceholderStyle(theme: AppTheme): CSSProperties {
  return {
    width: "100%",
    minHeight: "200px",
    borderRadius: "10px",
    border: `1px dashed ${theme.border}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    color: theme.muted,
    fontSize: "0.82rem",
    fontWeight: 600,
    fontStyle: "italic",
    textAlign: "center",
    padding: "1rem",
  };
}

const zoomedOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "zoom-out",
  padding: "2rem",
};

const zoomedImageStyle: CSSProperties = {
  maxWidth: "95vw",
  maxHeight: "90vh",
  objectFit: "contain",
  borderRadius: "8px",
};

function serverToggleStyle(theme: AppTheme, active: boolean, withLeftBorder?: boolean): CSSProperties {
  return {
    padding: "0.3rem 0.7rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    border: "none",
    ...(withLeftBorder ? { borderLeft: `1px solid ${theme.border}` } : {}),
    cursor: "pointer",
    background: active ? theme.accent : "transparent",
    color: active ? "#fff" : theme.muted,
    transition: "background 0.15s, color 0.15s",
  };
}

function resourceLinkStyle(color: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.3rem 0.75rem",
    borderRadius: "8px",
    border: `1.5px solid ${color}`,
    color,
    fontSize: "0.78rem",
    fontWeight: 700,
    textDecoration: "none",
    background: "transparent",
    transition: "background 0.15s",
  };
}

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
          <div
            style={heroPortraitStyle(theme)}
          >
            {cls.portrait ? (
              <Image
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
              }}
            >
              {cls.summary}
            </div>
          </div>
        </div>

        {/* Content panels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Link Skill + Legion row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
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
                  marginBottom: "0.75rem",
                }}
              >
                Link Skill
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                {cls.linkSkillIcon && (
                  <Image
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

            {/* Legion Bonus */}
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
          </div>

          <InfographicPanel className={cls.name} theme={theme} />

          <HexaGuidePanel className={cls.name} theme={theme} />

          <ResourcesPanel className={cls.name} theme={theme} />

          <WikiAttribution
            theme={theme}
            sources={[
              WIKI_ATTRIBUTION_SOURCE,
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
  const hasImage = !!infographic?.url;
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
        style={collapsibleButtonStyle(theme)}
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
          {hasImage ? (
            <Image
              src={infographic.url}
              alt={`${className} infographic`}
              role="button"
              tabIndex={0}
              onClick={() => setZoomed(true)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoomed(true); } }}
              width={900}
              height={1200}
              sizes="(max-width: 900px) 100vw, 900px"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "10px",
                border: `1px solid ${theme.border}`,
                cursor: "zoom-in",
              }}
            />
          ) : (
            <div style={wipPlaceholderStyle(theme)}>
              <span>Work in Progress</span>
              <span style={{ fontStyle: "normal", fontSize: "0.78rem" }}>
                Check the class document or class Discord in Community Resources below for the latest infographics
              </span>
            </div>
          )}
        </div>
      )}
      {zoomed && hasImage && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setZoomed(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); setZoomed(false); } }}
          style={zoomedOverlayStyle}
        >
          <Image
            src={infographic.url}
            alt={`${className} infographic`}
            width={1800}
            height={2400}
            sizes="95vw"
            unoptimized
            style={zoomedImageStyle}
          />
        </div>
      )}
    </div>
  );
}

type HexaServer = "heroic" | "interactive";

function HexaGuidePanel({ className, theme }: { className: string; theme: AppTheme }) {
  const [server, setServer] = useState<HexaServer>("heroic");
  const [zoomed, setZoomed] = useState(false);
  const hexa = HEXA_IMAGES[className];
  const imageUrl = server === "heroic" ? hexa?.heroic : hexa?.interactive;
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <div
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "0.9rem",
            color: theme.text,
          }}
        >
          HEXA Guide
        </div>
        <div
          style={{
            display: "flex",
            borderRadius: "8px",
            overflow: "hidden",
            border: `1px solid ${theme.border}`,
          }}
        >
          <button
            onClick={() => setServer("heroic")}
            style={serverToggleStyle(theme, server === "heroic")}
          >
            Heroic
          </button>
          <button
            onClick={() => setServer("interactive")}
            style={serverToggleStyle(theme, server === "interactive", true)}
          >
            Interactive
          </button>
        </div>
      </div>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${className} HEXA guide (${server})`}
          role="button"
          tabIndex={0}
          onClick={() => setZoomed(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoomed(true); } }}
          width={900}
          height={1200}
          sizes="(max-width: 900px) 100vw, 900px"
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "10px",
            border: `1px solid ${theme.border}`,
            cursor: "zoom-in",
          }}
        />
      ) : (
        <div style={wipPlaceholderStyle(theme)}>
          <span>Work in Progress</span>
          <span style={{ fontStyle: "normal", fontSize: "0.78rem" }}>
            Check the class document or class Discord in Community Resources below for the latest HEXA guides
          </span>
        </div>
      )}
      {zoomed && imageUrl && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setZoomed(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); setZoomed(false); } }}
          style={zoomedOverlayStyle}
        >
          <Image
            src={imageUrl}
            alt={`${className} HEXA guide (${server})`}
            width={1800}
            height={2400}
            sizes="95vw"
            unoptimized
            style={zoomedImageStyle}
          />
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
            style={resourceLinkStyle(RESOURCE_TYPE_COLORS[r.type])}
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
            <span style={{ color: theme.muted, fontWeight: 600, fontSize: "0.75rem" }}>
              {RESOURCE_TYPE_LABELS[r.type]}
            </span>
            {r.label}
          </a>
        ))}
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
