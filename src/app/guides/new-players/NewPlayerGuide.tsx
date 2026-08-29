"use client";

/*
  New Player Guide workspace: sticky table of contents on the left, guide body
  on the right, and the Interactive/Heroic switch in the header. Content lives
  in guideContent.ts — this file only decides how a block is drawn.
*/
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { PillGroup } from "../../../features/tools/shared-ui";
import { ClassDirectory, ClassRandomizer } from "./ClassPicker";
import {
  forMode,
  GUIDE_MODES,
  SECTIONS,
  type CalloutTone,
  type GuideBlock,
  type GuideMode,
  type GuideSection,
} from "./guideContent";

/* The fixed top nav is 56px; anchors and the sticky rail clear it. */
const SCROLL_OFFSET = 72;

const CALLOUT_STATUS: Record<CalloutTone, "success" | "warning" | "info"> = {
  tip: "success",
  warning: "warning",
  note: "info",
};

const bodyTextStyle: CSSProperties = {
  fontSize: "0.88rem",
  fontWeight: 600,
  lineHeight: 1.75,
  whiteSpace: "pre-line",
};

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
}

/** Highlights the section currently under the top of the viewport. */
function useActiveSection(sections: GuideSection[]) {
  const [activeId, setActiveId] = useState("");
  const pinnedRef = useRef("");

  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const onScreen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target.id);
          else onScreen.delete(entry.target.id);
        }
        /* Topmost visible section wins; keep the last one when scrolled past
           the end of the final section. */
        const next = ids.find((id) => onScreen.has(id));
        if (next && next !== pinnedRef.current) {
          pinnedRef.current = next;
          setActiveId(next);
        }
      },
      { rootMargin: `-${SCROLL_OFFSET}px 0px -55% 0px` },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return activeId || sections[0]?.id || "";
}

/* ── Table of contents ─────────────────────────────────────────── */

function TableOfContents({
  sections,
  activeId,
  theme,
}: {
  sections: GuideSection[];
  activeId: string;
  theme: AppTheme;
}) {
  return (
    <div className="guide-toc-rail">
      <nav
        className="guide-toc"
        aria-label="Guide contents"
        style={{ background: theme.panel, border: `1px solid ${theme.border}` }}
      >
        <div className="guide-toc-label" style={{ color: theme.muted }}>
          Contents
        </div>
        <div className="guide-toc-list">
          {sections.map((section, i) => {
            const isActive = section.id === activeId;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="guide-toc-link"
                aria-current={isActive ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(section.id);
                }}
                style={{
                  background: isActive ? theme.accentSoft : "transparent",
                  color: isActive ? theme.accentText : theme.muted,
                }}
              >
                <span className="guide-toc-num" style={{ color: isActive ? theme.accentText : theme.muted }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{section.title}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ── Block renderers ───────────────────────────────────────────── */

function Callout({
  block,
  theme,
}: {
  block: Extract<GuideBlock, { kind: "callout" }>;
  theme: AppTheme;
}) {
  const color = statusText(theme, CALLOUT_STATUS[block.tone]);
  return (
    <div
      className="guide-callout"
      style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderLeft: `3px solid ${color}` }}
    >
      {block.title && (
        <div style={{ fontSize: "0.8rem", fontWeight: 800, color, marginBottom: "0.35rem" }}>
          {block.title}
        </div>
      )}
      <div style={{ ...bodyTextStyle, fontSize: "0.85rem", color: theme.muted }}>{block.text}</div>
    </div>
  );
}

function BlockContent({ block, theme }: { block: GuideBlock; theme: AppTheme }) {
  switch (block.kind) {
    case "text":
      return <div style={{ ...bodyTextStyle, color: theme.muted }}>{block.text}</div>;

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag className="guide-list" style={{ color: theme.muted }}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ListTag>
      );
    }

    case "image":
      return (
        <figure className="guide-figure">
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${theme.border}` }}>
            <Image
              src={block.src}
              alt={block.alt}
              width={1000}
              height={500}
              unoptimized
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
          {block.caption && (
            <figcaption style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginTop: "0.5rem" }}>
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "callout":
      return <Callout block={block} theme={theme} />;

    case "embed":
      return block.embed === "class-randomizer" ? (
        <ClassRandomizer theme={theme} />
      ) : (
        <ClassDirectory theme={theme} />
      );
  }
}

/* ── Sections ──────────────────────────────────────────────────── */

function SectionCard({
  section,
  mode,
  theme,
  index,
}: {
  section: GuideSection;
  mode: GuideMode;
  theme: AppTheme;
  index: number;
}) {
  const blocks = forMode(section.blocks, mode);

  return (
    <section
      id={section.id}
      className="guide-section fade-in"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        animationDelay: `${Math.min(index, 5) * 0.05}s`,
        animationFillMode: "both",
      }}
    >
      <h2 className="guide-section-title" style={{ color: theme.text }}>
        <span style={{ color: theme.accentText }}>{String(index + 1).padStart(2, "0")}</span>
        {section.title}
      </h2>

      {blocks.length === 0 ? (
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: theme.muted, fontStyle: "italic" }}>
          This section is still being written.
        </div>
      ) : (
        <div className="guide-blocks">
          {blocks.map((block, i) => (
            <BlockContent key={`${section.id}-${i}`} block={block} theme={theme} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function NewPlayerGuide({ theme }: { theme: AppTheme }) {
  const [mode, setMode] = useState<GuideMode>("interactive");
  const sections = useMemo(() => forMode(SECTIONS, mode), [mode]);
  const activeId = useActiveSection(sections);

  return (
    <div className="page-content">
      <div className="page-container">
        <Link href="/guides" className="guide-back-link" style={{ color: theme.accentText }}>
          ← Back to Guides
        </Link>

        <div className="guide-head">
          <div style={{ minWidth: 0 }}>
            <h1 className="page-title" style={{ color: theme.text }}>
              New Player Guide
            </h1>
            <div className="page-subtitle" style={{ color: theme.muted, marginBottom: 0 }}>
              Everything you need to know to get started in MapleStory
            </div>
          </div>

          <div className="guide-mode-switch">
            <span className="guide-mode-label" style={{ color: theme.muted }}>
              World type
            </span>
            <PillGroup theme={theme} options={GUIDE_MODES} value={mode} onChange={setMode} />
          </div>
        </div>

        <div className="guide-layout">
          <TableOfContents sections={sections} activeId={activeId} theme={theme} />

          <div className="guide-body">
            {sections.map((section, i) => (
              <SectionCard key={section.id} section={section} mode={mode} theme={theme} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
