"use client";

/*
  New Player Guide page.

  A renderer only: all copy, section ordering and branch filtering live in
  newPlayerGuideData. The reader answers two questions (world type, Hyper
  Burning) and the guide filters itself against those answers. Both questions
  stay on screen so the answers can be changed at any point.
*/
import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import type { AppTheme } from "../../../components/themes";
import ClassPicker from "./ClassPicker";
import {
  GUIDE_INTRO,
  HYPER_BURNING_QUESTION,
  NO_ANSWERS,
  WORLD_QUESTION,
  visibleBlocks,
  visibleSections,
  type GuideAnswers,
  type GuideBlock,
  type GuideLeafBlock,
  type GuideQuestion,
  type GuideRoute,
  type MapBand,
} from "./newPlayerGuideData";

/* ── Styles ───────────────────────────────────────────────────── */

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "1.15rem",
  marginBottom: "1rem",
};

const subheadingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "0.95rem",
  marginBottom: "0.65rem",
};

const bodyStyle: CSSProperties = {
  fontSize: "0.88rem",
  fontWeight: 600,
  lineHeight: 1.75,
};

const sectionCardStyle: CSSProperties = {
  borderRadius: 18,
  padding: "2rem 1.75rem",
};

const questionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
  gap: "0.6rem",
};

const optionButtonStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.2rem",
  padding: "0.7rem 0.9rem",
  borderRadius: 12,
  cursor: "pointer",
  textAlign: "left",
  transition: "border-color 0.15s ease, background 0.15s ease",
};

const tableWrapStyle: CSSProperties = { overflowX: "auto", marginTop: "0.75rem" };

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.82rem",
  fontWeight: 600,
};

const cellStyle: CSSProperties = { padding: "0.55rem 0.75rem", textAlign: "left" };

const blockStackStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.1rem",
};

/* ── Questions ────────────────────────────────────────────────── */

function QuestionCard<T extends string>({
  question,
  value,
  theme,
  onChange,
}: {
  question: GuideQuestion<T>;
  value: T | null;
  theme: AppTheme;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
      <legend
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          color: theme.text,
          padding: 0,
          marginBottom: "0.5rem",
        }}
      >
        {question.prompt}
      </legend>
      <div style={questionGridStyle}>
        {question.options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className="btn-reset"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              style={{
                ...optionButtonStyle,
                background: selected ? theme.accentSoft : theme.panel,
                border: `1px solid ${selected ? theme.accent : theme.border}`,
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: selected ? theme.accentText : theme.text,
                }}
              >
                {option.label}
              </span>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Blocks ───────────────────────────────────────────────────── */

function Callout({ title, text, theme }: { title: string; text: string; theme: AppTheme }) {
  return (
    <div
      style={{
        background: theme.accentSoft,
        border: `1px solid ${theme.border}`,
        borderLeft: `3px solid ${theme.accent}`,
        borderRadius: 12,
        padding: "1rem 1.15rem",
      }}
    >
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text, marginBottom: "0.3rem" }}>
        {title}
      </div>
      <div style={{ ...bodyStyle, color: theme.muted }}>{text}</div>
    </div>
  );
}

function TbdStub({ label, note, theme }: { label: string; note: string; theme: AppTheme }) {
  return (
    <div
      style={{
        background: theme.timerBg,
        border: `1px dashed ${theme.border}`,
        borderRadius: 12,
        padding: "1rem 1.15rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: theme.badgeText,
            background: theme.badge,
            borderRadius: 999,
            padding: "0.15rem 0.55rem",
          }}
        >
          Coming soon
        </span>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>{label}</span>
      </div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.6, color: theme.muted }}>
        {note}
      </div>
    </div>
  );
}

function MapTable({
  title,
  intro,
  bands,
  theme,
}: {
  title: string;
  intro: string;
  bands: MapBand[];
  theme: AppTheme;
}) {
  return (
    <div>
      <div style={{ ...subheadingStyle, color: theme.text, marginBottom: "0.35rem" }}>{title}</div>
      <div style={{ ...bodyStyle, color: theme.muted }}>{intro}</div>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
              <th scope="col" style={{ ...cellStyle, color: theme.text, whiteSpace: "nowrap" }}>
                Level
              </th>
              <th scope="col" style={{ ...cellStyle, color: theme.text }}>
                Maps
              </th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band) => (
              <tr key={band.range} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th
                  scope="row"
                  style={{ ...cellStyle, color: theme.text, whiteSpace: "nowrap", fontWeight: 700 }}
                >
                  {band.range}
                </th>
                <td style={{ ...cellStyle, color: theme.muted }}>
                  {band.maps.length > 0 ? band.maps.join(", ") : "Coming soon"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tips({
  title,
  items,
  theme,
}: {
  title: string;
  items: { title: string; text: string }[];
  theme: AppTheme;
}) {
  return (
    <div
      style={{
        background: theme.timerBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: "1.15rem 1.25rem",
      }}
    >
      <div style={{ ...subheadingStyle, color: theme.text }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {items.map((tip) => (
          <div key={tip.title}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>{tip.title}</div>
            <div style={{ ...bodyStyle, color: theme.muted }}>{tip.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteChoice({
  title,
  intro,
  routes,
  outro,
  theme,
}: {
  title: string;
  intro: string;
  routes: GuideRoute[];
  outro: string;
  theme: AppTheme;
}) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const active = routes.find((r) => r.id === routeId) ?? routes[0];

  return (
    <div>
      <div style={{ ...subheadingStyle, color: theme.text, marginBottom: "0.35rem" }}>{title}</div>
      <div style={{ ...bodyStyle, color: theme.muted, marginBottom: "0.75rem" }}>{intro}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.9rem" }}>
        {routes.map((route) => {
          const selected = route.id === active?.id;
          return (
            <button
              key={route.id}
              type="button"
              className="btn-reset"
              aria-pressed={selected}
              onClick={() => setRouteId(route.id)}
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                padding: "0.45rem 1rem",
                borderRadius: 999,
                cursor: "pointer",
                color: selected ? theme.accentOn : theme.muted,
                background: selected ? theme.accent : theme.timerBg,
                border: `1px solid ${selected ? theme.accent : theme.border}`,
              }}
            >
              {route.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div style={blockStackStyle}>
          {active.blocks.map((block, i) => (
            <LeafBlock key={`${active.id}-${i}`} block={block} theme={theme} />
          ))}
        </div>
      )}

      <div style={{ ...bodyStyle, color: theme.muted, marginTop: "1rem" }}>{outro}</div>
    </div>
  );
}

function LeafBlock({ block, theme }: { block: GuideLeafBlock; theme: AppTheme }): ReactNode {
  switch (block.kind) {
    case "paragraph":
      return <div style={{ ...bodyStyle, color: theme.muted }}>{block.text}</div>;
    case "note":
      return (
        <div
          style={{
            ...bodyStyle,
            color: theme.muted,
            fontStyle: "italic",
            borderLeft: `2px solid ${theme.border}`,
            paddingLeft: "0.9rem",
          }}
        >
          {block.text}
        </div>
      );
    case "callout":
      return <Callout title={block.title} text={block.text} theme={theme} />;
    case "classGrid":
      return <ClassPicker theme={theme} />;
    case "mapTable":
      return <MapTable title={block.title} intro={block.intro} bands={block.bands} theme={theme} />;
    case "tips":
      return <Tips title={block.title} items={block.items} theme={theme} />;
    case "routeChoice":
      return (
        <RouteChoice
          title={block.title}
          intro={block.intro}
          routes={block.routes}
          outro={block.outro}
          theme={theme}
        />
      );
    case "tbd":
      return <TbdStub label={block.label} note={block.note} theme={theme} />;
  }
}

function Block({ block, theme }: { block: GuideBlock; theme: AppTheme }) {
  if (block.kind === "subsection") {
    return (
      <div id={block.id}>
        <div style={{ ...subheadingStyle, color: theme.text }}>{block.title}</div>
        <div style={blockStackStyle}>
          {block.blocks.map((child, i) => (
            <LeafBlock key={`${block.id}-${i}`} block={child} theme={theme} />
          ))}
        </div>
      </div>
    );
  }
  return <LeafBlock block={block} theme={theme} />;
}

/* ── Page ─────────────────────────────────────────────────────── */

function GuideBody({ answers, theme }: { answers: GuideAnswers; theme: AppTheme }) {
  const { world, hyperBurning } = answers;
  if (world === null || hyperBurning === null) {
    return (
      <div style={{ ...bodyStyle, color: theme.muted, marginTop: "1.25rem" }}>
        Answer both questions above and the guide will fill in below.
      </div>
    );
  }

  return (
    <>
      <div
        className="fade-in"
        style={{
          ...bodyStyle,
          color: theme.muted,
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          ...sectionCardStyle,
          marginTop: "1.25rem",
        }}
      >
        {GUIDE_INTRO}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>
        {visibleSections(world, hyperBurning).map((section, i) => (
          <section
            key={section.id}
            id={section.id}
            className="fade-in"
            style={{
              ...sectionCardStyle,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              animationDelay: `${i * 0.06}s`,
              animationFillMode: "both",
            }}
          >
            <h2 style={{ ...headingStyle, color: theme.text }}>{section.title}</h2>
            <div style={blockStackStyle}>
              {visibleBlocks(section.blocks, world).map((block, j) => (
                <Block key={`${section.id}-${j}`} block={block} theme={theme} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function NewPlayersContent({ theme }: { theme: AppTheme }) {
  const [answers, setAnswers] = useState<GuideAnswers>(NO_ANSWERS);

  return (
    <>
      <style>{`
        @media (max-width: 500px) {
          .class-card { flex-direction: column !important; align-items: center !important; text-align: center !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="page-container">
          <Link href="/guides" className="guide-back-link" style={{ color: theme.accentText }}>
            ← Back to Guides
          </Link>

          <h1 className="page-title" style={{ color: theme.text }}>
            New Player Guide
          </h1>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            Answer two questions and the guide adapts to your character
          </div>

          <div
            className="fade-in"
            style={{
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: "1.25rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
            }}
          >
            <QuestionCard
              question={WORLD_QUESTION}
              value={answers.world}
              theme={theme}
              onChange={(world) => setAnswers((prev) => ({ ...prev, world }))}
            />
            <QuestionCard
              question={HYPER_BURNING_QUESTION}
              value={answers.hyperBurning}
              theme={theme}
              onChange={(hyperBurning) => setAnswers((prev) => ({ ...prev, hyperBurning }))}
            />
          </div>

          <GuideBody answers={answers} theme={theme} />
        </div>
      </div>
    </>
  );
}

export default function NewPlayersGuidePage() {
  return (
    <AppShell currentPath="/guides">{({ theme }) => <NewPlayersContent theme={theme} />}</AppShell>
  );
}
