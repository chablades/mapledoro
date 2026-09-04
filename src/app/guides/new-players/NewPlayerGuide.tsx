/*
  New Player Guide shell: a sticky contents rail beside the guide body, with the
  two branch switches in the header.

  A renderer only. All copy, section ordering and branch filtering live in
  newPlayerGuideData; block rendering lives in GuideBlocks. The switches start on
  a default answer rather than an empty state, so the guide is readable and the
  rail is populated before the reader touches anything.
*/
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { PillGroup } from "../../../features/tools/shared-ui";
import { Block } from "./GuideBlocks";
import {
  DEFAULT_ANSWERS,
  HYPER_BURNING_QUESTION,
  WORLD_QUESTION,
  visibleBlocks,
  visibleSections,
  type GuideAnswers,
  type GuideQuestion,
  type GuideSection,
} from "./newPlayerGuideData";

/* Both the rail's `top` and each section's `scroll-margin-top` clear the 56px
   fixed nav; keep this in step with the `.guide-toc` / `.guide-section` rules. */
const SCROLL_OFFSET = 72;

const blockStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.1rem",
};

const hintStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  maxWidth: 200,
};

/* Tracks which section the reader is currently in, for the rail's active state.
   An observer rather than a scroll listener: no work on frames where nothing
   crosses a boundary. The bottom margin retires a section well before it leaves
   the viewport, so the topmost still-visible section is the one that wins. */
function useActiveSection(sections: GuideSection[]): string {
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

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  window.history.replaceState(null, "", `#${id}`);
}

function GuideSwitch<T extends string>({
  question,
  value,
  theme,
  onChange,
}: {
  question: GuideQuestion<T>;
  value: T;
  theme: AppTheme;
  onChange: (next: T) => void;
}) {
  const hint = question.options.find((o) => o.value === value)?.hint;
  return (
    <div className="guide-mode-switch" role="group" aria-label={question.prompt}>
      <span className="guide-mode-label" style={{ color: theme.muted }}>
        {question.label}
      </span>
      <PillGroup theme={theme} options={question.options} value={value} onChange={onChange} />
      {hint && (
        <span style={{ ...hintStyle, color: theme.muted }}>{hint}</span>
      )}
    </div>
  );
}

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
            const active = section.id === activeId;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="guide-toc-link"
                aria-current={active ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(section.id);
                }}
                style={{
                  color: active ? theme.accentText : theme.muted,
                  background: active ? theme.accentSoft : "transparent",
                }}
              >
                <span className="guide-toc-num">{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function NewPlayerGuide({ theme }: { theme: AppTheme }) {
  const [answers, setAnswers] = useState<GuideAnswers>(DEFAULT_ANSWERS);
  const { world, hyperBurning } = answers;

  const sections = useMemo(() => visibleSections(world, hyperBurning), [world, hyperBurning]);
  const activeId = useActiveSection(sections);

  return (
    <div className="page-content">
      <div className="page-container">
        <Link href="/guides" className="guide-back-link" style={{ color: theme.accentText }}>
          ← Back to Guides
        </Link>

        <div className="guide-head">
          <div>
            <h1 className="page-title" style={{ color: theme.text }}>
              New Player Guide
            </h1>
            <div className="page-subtitle" style={{ color: theme.muted }}>
              Set these two and the guide shows only what applies to your character
            </div>
          </div>

          <div className="guide-switches">
            <GuideSwitch
              question={WORLD_QUESTION}
              value={world}
              theme={theme}
              onChange={(next) => setAnswers((prev) => ({ ...prev, world: next }))}
            />
            <GuideSwitch
              question={HYPER_BURNING_QUESTION}
              value={hyperBurning}
              theme={theme}
              onChange={(next) => setAnswers((prev) => ({ ...prev, hyperBurning: next }))}
            />
          </div>
        </div>

        <div className="guide-layout">
          <TableOfContents sections={sections} activeId={activeId} theme={theme} />

          <div className="guide-body">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="guide-section"
                style={{ background: theme.panel, border: `1px solid ${theme.border}` }}
              >
                <h2 className="guide-section-title" style={{ color: theme.text }}>
                  {section.title}
                </h2>
                <div style={blockStackStyle}>
                  {visibleBlocks(section.blocks, world).map((block, j) => (
                    <Block key={`${section.id}-${j}`} block={block} theme={theme} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
