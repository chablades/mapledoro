"use client";

/*
  New Player Guide (10 to 200) page.

  A renderer only: all copy, section ordering and branch filtering live in
  newPlayerGuideData. The reader picks a world type from the Section 1 comparison
  and answers the Hyper Burning question, and the guide filters itself against
  both. Neither answer is locked in, so either can be changed at any point
  without a reload.

  Progress checkboxes are global rather than per character (see guideProgress).
*/
import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import AppShell from "../../../components/AppShell";
import type { AppTheme } from "../../../components/themes";
import { ItemIcon } from "../../../components/ResourceImage";
import { worldIconUrl } from "../../../lib/mapleResource";
import { useMounted } from "../../../lib/useMounted";
import ClassPicker from "./ClassPicker";
import { loadGuideProgress, saveGuideProgress, type GuideProgress } from "./guideProgress";
import {
  GUIDE_INTRO,
  HYPER_BURNING_QUESTION,
  NEXT_GUIDE,
  NO_ANSWERS,
  WORLD_COLUMNS,
  WORLD_LABELS,
  classRouteOverride,
  trackedSections,
  visibleBlocks,
  visibleSections,
  visibleTips,
  type AdvancementRow,
  type GuideAnswers,
  type GuideBlock,
  type GuideLeafBlock,
  type GuideQuestion,
  type GuideRoute,
  type GuideSection,
  type MapBand,
  type PairedCallout,
  type WorldColumn,
  type WorldType,
} from "./newPlayerGuideData";

/* ── Styles ───────────────────────────────────────────────────── */

const headingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "1.15rem",
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

const pairGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
  gap: "0.85rem",
};

const worldGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
  gap: "0.85rem",
  marginTop: "0.9rem",
};

const worldColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  padding: "1.15rem 1.25rem",
  borderRadius: 14,
  cursor: "pointer",
  textAlign: "left",
  transition: "border-color 0.15s ease, background 0.15s ease",
};

const prosConsLabelStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "0.3rem",
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "1.1rem",
  fontSize: "0.82rem",
  fontWeight: 600,
  lineHeight: 1.7,
};

const checkboxRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontWeight: 700,
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

/* ── World comparison ─────────────────────────────────────────── */

function ProsConsList({
  label,
  items,
  color,
  theme,
}: {
  label: string;
  items: string[];
  color: string;
  theme: AppTheme;
}) {
  return (
    <div>
      <div style={{ ...prosConsLabelStyle, color }}>{label}</div>
      {items.length > 0 ? (
        <ul style={{ ...listStyle, color: theme.muted }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: theme.muted, fontStyle: "italic" }}>
          Coming soon
        </div>
      )}
    </div>
  );
}

function WorldColumnCard({
  column,
  selected,
  theme,
  onSelect,
}: {
  column: WorldColumn;
  selected: boolean;
  theme: AppTheme;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-reset"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        ...worldColumnStyle,
        background: selected ? theme.accentSoft : theme.panel,
        border: `1px solid ${selected ? theme.accent : theme.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1rem",
            color: selected ? theme.accentText : theme.text,
          }}
        >
          {column.label}
        </span>
        {column.worlds.map((world) => (
          <span
            key={world.iconId}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
          >
            <Image
              src={worldIconUrl(world.iconId)}
              alt=""
              width={18}
              height={18}
              unoptimized
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted }}>
              {world.name}
            </span>
          </span>
        ))}
      </div>

      <ProsConsList label="Pros" items={column.pros} color={theme.accentText} theme={theme} />
      <ProsConsList label="Cons" items={column.cons} color={theme.muted} theme={theme} />
    </button>
  );
}

function WorldComparison({
  value,
  theme,
  onSelect,
}: {
  value: WorldType | null;
  theme: AppTheme;
  onSelect: (next: WorldType) => void;
}) {
  return (
    <div style={worldGridStyle}>
      {WORLD_COLUMNS.map((column) => (
        <WorldColumnCard
          key={column.value}
          column={column}
          selected={column.value === value}
          theme={theme}
          onSelect={() => onSelect(column.value)}
        />
      ))}
    </div>
  );
}

/* ── Blocks ───────────────────────────────────────────────────── */

function Callout({
  title,
  text,
  theme,
  itemId,
}: {
  title: string;
  text: string;
  theme: AppTheme;
  itemId?: string;
}) {
  return (
    <div
      style={{
        background: theme.accentSoft,
        border: `1px solid ${theme.border}`,
        borderLeft: `3px solid ${theme.accent}`,
        borderRadius: 12,
        padding: "1rem 1.15rem",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.3rem",
        }}
      >
        {itemId && <ItemIcon id={itemId} size={22} />}
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>{title}</span>
      </div>
      <div style={{ ...bodyStyle, color: theme.muted }}>{text}</div>
    </div>
  );
}

function CalloutPair({
  items,
  world,
  theme,
}: {
  items: PairedCallout[];
  world: WorldType;
  theme: AppTheme;
}) {
  return (
    <div style={pairGridStyle}>
      {items.map((item) => {
        const extra = item.worldText?.[world];
        return (
          <Callout
            key={item.title}
            title={item.title}
            text={extra ? `${item.text} ${extra}` : item.text}
            itemId={item.itemId}
            theme={theme}
          />
        );
      })}
    </div>
  );
}

function ItemNote({
  itemId,
  itemName,
  text,
  theme,
}: {
  itemId: string;
  itemName: string;
  text: string;
  theme: AppTheme;
}) {
  return (
    <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
      <ItemIcon id={itemId} size={32} alt={itemName} style={{ marginTop: "0.15rem" }} />
      <div style={{ ...bodyStyle, color: theme.muted, flex: 1, minWidth: 0 }}>{text}</div>
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

function Advancements({
  title,
  intro,
  rows,
  outro,
  theme,
}: {
  title: string;
  intro: string;
  rows: AdvancementRow[];
  outro: string;
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
                Advancement
              </th>
              <th scope="col" style={{ ...cellStyle, color: theme.text }}>
                What it means
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.level} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <th
                  scope="row"
                  style={{ ...cellStyle, color: theme.text, whiteSpace: "nowrap", fontWeight: 700 }}
                >
                  {row.level}
                </th>
                <td style={{ ...cellStyle, color: theme.text, whiteSpace: "nowrap" }}>{row.label}</td>
                <td style={{ ...cellStyle, color: theme.muted }}>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ ...bodyStyle, color: theme.muted, marginTop: "0.85rem" }}>{outro}</div>
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
  ctx,
}: {
  title: string;
  intro: string;
  routes: GuideRoute[];
  outro: string;
  ctx: BlockContext;
}) {
  const { theme } = ctx;
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
            <LeafBlock key={`${active.id}-${i}`} block={block} ctx={ctx} />
          ))}
        </div>
      )}

      <div style={{ ...bodyStyle, color: theme.muted, marginTop: "1rem" }}>{outro}</div>
    </div>
  );
}

/* ── Block dispatch ───────────────────────────────────────────── */

/* Everything a leaf block might need beyond its own config: the resolved theme,
   the answered world (for world-varying copy), and the class-picker wiring. */
interface BlockContext {
  theme: AppTheme;
  world: WorldType;
  selectedClass: string | null;
  onSelectClass: (name: string | null) => void;
  onSelectWorld: (next: WorldType) => void;
}

function LeafBlock({ block, ctx }: { block: GuideLeafBlock; ctx: BlockContext }): ReactNode {
  const { theme, world } = ctx;
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
    case "worldComparison":
      return <WorldComparison value={world} theme={theme} onSelect={ctx.onSelectWorld} />;
    case "classGrid":
      return (
        <ClassPicker theme={theme} selected={ctx.selectedClass} onSelect={ctx.onSelectClass} />
      );
    case "advancements":
      return (
        <Advancements
          title={block.title}
          intro={block.intro}
          rows={block.rows}
          outro={block.outro}
          theme={theme}
        />
      );
    case "calloutPair":
      return <CalloutPair items={block.items} world={world} theme={theme} />;
    case "itemNote":
      return (
        <ItemNote
          itemId={block.itemId}
          itemName={block.itemName}
          text={block.text}
          theme={theme}
        />
      );
    case "mapTable":
      return <MapTable title={block.title} intro={block.intro} bands={block.bands} theme={theme} />;
    case "tips":
      return <Tips title={block.title} items={visibleTips(block.items, world)} theme={theme} />;
    case "routeChoice":
      return (
        <RouteChoice
          title={block.title}
          intro={block.intro}
          routes={block.routes}
          outro={block.outro}
          ctx={ctx}
        />
      );
    case "tbd":
      return <TbdStub label={block.label} note={block.note} theme={theme} />;
  }
}

function Block({ block, ctx }: { block: GuideBlock; ctx: BlockContext }) {
  if (block.kind === "subsection") {
    return (
      <div id={block.id}>
        <div style={{ ...subheadingStyle, color: ctx.theme.text }}>{block.title}</div>
        <div style={blockStackStyle}>
          {block.blocks.map((child, i) => (
            <LeafBlock key={`${block.id}-${i}`} block={child} ctx={ctx} />
          ))}
        </div>
      </div>
    );
  }
  return <LeafBlock block={block} ctx={ctx} />;
}

/* ── Sections ─────────────────────────────────────────────────── */

function SectionCheckbox({
  checked,
  theme,
  onToggle,
}: {
  checked: boolean;
  theme: AppTheme;
  onToggle: () => void;
}) {
  return (
    <label style={{ ...checkboxRowStyle, color: checked ? theme.accentText : theme.muted }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ accentColor: theme.accent, width: 15, height: 15, cursor: "pointer" }}
      />
      {checked ? "Done" : "Mark done"}
    </label>
  );
}

function GuideSectionCard({
  section,
  index,
  ctx,
  checked,
  onToggle,
}: {
  section: GuideSection;
  index: number;
  ctx: BlockContext;
  checked: boolean;
  onToggle: () => void;
}) {
  const { theme, world } = ctx;
  return (
    <section
      id={section.id}
      className="fade-in"
      style={{
        ...sectionCardStyle,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        animationDelay: `${index * 0.06}s`,
        animationFillMode: "both",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ ...headingStyle, color: theme.text, margin: 0 }}>{section.title}</h2>
        {section.trackProgress !== false && (
          <SectionCheckbox checked={checked} theme={theme} onToggle={onToggle} />
        )}
      </div>
      <div style={blockStackStyle}>
        {visibleBlocks(section.blocks, world).map((block, j) => (
          <Block key={`${section.id}-${j}`} block={block} ctx={ctx} />
        ))}
      </div>
    </section>
  );
}

function NextGuideCard({ theme }: { theme: AppTheme }) {
  return (
    <section
      className="fade-in"
      style={{
        ...sectionCardStyle,
        background: theme.timerBg,
        border: `1px solid ${theme.border}`,
      }}
    >
      <h2 style={{ ...headingStyle, color: theme.text, margin: "0 0 0.5rem" }}>
        {NEXT_GUIDE.title}
      </h2>
      <div style={{ ...bodyStyle, color: theme.muted }}>{NEXT_GUIDE.text}</div>
      <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>
        {/* TBD: the 200+ guide route does not exist yet, so this stays a label
            rather than a link until NEXT_GUIDE.href is filled in. */}
        {NEXT_GUIDE.linkLabel}
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

function GuideBody({
  sections,
  ctx,
  progress,
  onToggleSection,
}: {
  sections: GuideSection[];
  ctx: BlockContext;
  progress: GuideProgress;
  onToggleSection: (id: string) => void;
}) {
  const { theme } = ctx;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1.25rem" }}>
      {sections.map((section, i) => (
        <GuideSectionCard
          key={section.id}
          section={section}
          index={i}
          ctx={ctx}
          checked={progress[section.id] === true}
          onToggle={() => onToggleSection(section.id)}
        />
      ))}
      <NextGuideCard theme={theme} />
    </div>
  );
}

function AnswerSummary({
  answers,
  theme,
  onReset,
}: {
  answers: GuideAnswers;
  theme: AppTheme;
  onReset: () => void;
}) {
  if (answers.world === null) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        flexWrap: "wrap",
        fontSize: "0.8rem",
        fontWeight: 600,
        color: theme.muted,
      }}
    >
      <span>
        Showing the {WORLD_LABELS[answers.world]} guide. Pick the other column above to switch.
      </span>
      <button
        type="button"
        className="btn-reset"
        onClick={onReset}
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: theme.accentText,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Start over
      </button>
    </div>
  );
}

function ProgressCounter({
  done,
  total,
  theme,
}: {
  done: number;
  total: number;
  theme: AppTheme;
}) {
  if (total === 0) return null;
  return (
    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>
      {done} of {total} sections done
    </div>
  );
}

function NewPlayersContent({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [answers, setAnswers] = useState<GuideAnswers>(NO_ANSWERS);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [progress, setProgress] = useState<GuideProgress>(loadGuideProgress);

  // Persisted ticks only render once mounted, so the server HTML and the first
  // client render agree.
  const shownProgress = mounted ? progress : {};

  // The write rides inside the updater so it stays atomic with the state change.
  const toggleSection = (id: string) =>
    setProgress((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveGuideProgress(next);
      return next;
    });

  const selectWorld = (world: WorldType) => setAnswers((prev) => ({ ...prev, world }));

  const reset = () => {
    setAnswers(NO_ANSWERS);
    setSelectedClass(null);
  };

  const { world, hyperBurning } = answers;
  const ctx: BlockContext = {
    theme,
    world: world ?? "interactive",
    selectedClass,
    onSelectClass: setSelectedClass,
    onSelectWorld: selectWorld,
  };

  const sections =
    world !== null && hyperBurning !== null
      ? visibleSections(world, hyperBurning, classRouteOverride(selectedClass))
      : null;
  const tracked = trackedSections(sections ?? []);
  const doneCount = tracked.filter((s) => shownProgress[s.id] === true).length;

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
            New Player Guide (10 to 200)
          </h1>
          <div className="page-subtitle" style={{ color: theme.muted }}>
            A walkthrough from your first character to level 200
          </div>

          <div
            className="fade-in"
            style={{
              ...sectionCardStyle,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            {GUIDE_INTRO.map((paragraph) => (
              <div key={paragraph.slice(0, 40)} style={{ ...bodyStyle, color: theme.muted }}>
                {paragraph}
              </div>
            ))}
          </div>

          <div
            className="fade-in"
            style={{
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: "1.25rem 1.5rem",
              marginTop: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
            }}
          >
            <QuestionCard
              question={HYPER_BURNING_QUESTION}
              value={answers.hyperBurning}
              theme={theme}
              onChange={(hyperBurning) => setAnswers((prev) => ({ ...prev, hyperBurning }))}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <AnswerSummary answers={answers} theme={theme} onReset={reset} />
              <ProgressCounter done={doneCount} total={tracked.length} theme={theme} />
            </div>
          </div>

          {sections !== null ? (
            <GuideBody
              sections={sections}
              ctx={ctx}
              progress={shownProgress}
              onToggleSection={toggleSection}
            />
          ) : (
            <IntroSections ctx={ctx} />
          )}
        </div>
      </div>
    </>
  );
}

/* Before both questions are answered the guide still shows Section 1, because
   the world comparison inside it is what answers the world question. */
function IntroSections({ ctx }: { ctx: BlockContext }) {
  const intro = visibleSections("interactive", "no").find((s) => s.id === "before-you-start");
  if (!intro) return null;
  return (
    <div style={{ marginTop: "1.25rem" }}>
      <GuideSectionCard
        section={intro}
        index={0}
        ctx={ctx}
        checked={false}
        onToggle={() => undefined}
      />
      <div style={{ ...bodyStyle, color: ctx.theme.muted, marginTop: "1.25rem" }}>
        Pick a world above and answer the Hyper Burning question, and the rest of the guide fills in
        below.
      </div>
    </div>
  );
}

export default function NewPlayersGuidePage() {
  return (
    <AppShell currentPath="/guides">{({ theme }) => <NewPlayersContent theme={theme} />}</AppShell>
  );
}
