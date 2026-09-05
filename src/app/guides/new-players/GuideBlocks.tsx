/*
  Block renderers for the New Player Guide. Every content shape in
  newPlayerGuideData has exactly one case here, so adding a block kind means
  extending the union there and adding a branch to `LeafBlock`.
*/
import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import ClassPicker, { ClassRandomizer } from "./ClassPicker";
import type { GuideBlock, GuideLeafBlock, GuideRoute, MapBand } from "./newPlayerGuideData";

/* ── Styles ───────────────────────────────────────────────────── */

const subheadingStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "0.95rem",
  marginBottom: "0.65rem",
};

export const bodyStyle: CSSProperties = {
  fontSize: "0.88rem",
  fontWeight: 600,
  lineHeight: 1.75,
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
    case "list":
      return block.ordered ? (
        <ol className="guide-list" style={{ color: theme.muted }}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="guide-list" style={{ color: theme.muted }}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "image":
      return (
        <figure className="guide-figure">
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${theme.border}`,
            }}
          >
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
            <figcaption
              style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted, marginTop: "0.5rem" }}
            >
              {block.caption}
            </figcaption>
          )}
        </figure>
      );
    case "classGrid":
      return <ClassPicker theme={theme} />;
    case "classRandomizer":
      return <ClassRandomizer theme={theme} />;
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

export function Block({ block, theme }: { block: GuideBlock; theme: AppTheme }) {
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