/*
  Class-picking widgets for the New Player Guide: a randomizer that lands on a
  single class, and a browsable directory of every class grouped by faction.

  Portraits, the summary and the difficulty/link/legion rows come from the shared
  class data in ../character-guides/classData, so every class has a usable panel.
  The guide-specific blurb and tags come from newPlayerGuideData and layer on top
  for the classes that have them, so adding a tag category never touches this file.
*/
import React, { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import {
  CLASSES,
  CLASS_REGIONS,
  DIFFICULTY_COLORS,
  highlightNumbers,
  type ClassEntry,
} from "../character-guides/classData";
import { classGuideInfo, classTags, TAG_CATEGORIES, type ClassTag } from "./newPlayerGuideData";

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
  gap: "0.75rem",
};

const regionLabelStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "0.85rem",
  marginBottom: "0.75rem",
};

const tileNameStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  textAlign: "center",
  lineHeight: 1.2,
  transition: "color 0.2s ease",
};

const panelBlurbStyle: CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  lineHeight: 1.6,
  marginBottom: "0.7rem",
};

const statListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.32rem",
};

const statRowStyle: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
};

const chipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.4rem",
  marginTop: "0.75rem",
};

const chipStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  padding: "0.2rem 0.6rem",
  borderRadius: 999,
  border: "1px solid transparent",
};

/* Tags render in TAG_CATEGORIES order so a new category slots in by config alone. */
function orderedTags(name: string): ClassTag[] {
  const tags = classTags(name);
  return TAG_CATEGORIES.flatMap((category) => tags.filter((t) => t.category === category.id));
}

function categoryLabel(tag: ClassTag): string {
  return TAG_CATEGORIES.find((c) => c.id === tag.category)?.label ?? tag.category;
}

function TagChip({ tag, theme }: { tag: ClassTag; theme: AppTheme }) {
  // A tag with no status is a neutral badge; a status tag borrows the per-mode
  // status ink so it stays readable on both panel surfaces.
  const color = tag.status ? statusText(theme, tag.status) : theme.badgeText;
  return (
    <span
      style={{
        ...chipStyle,
        color,
        background: tag.status ? theme.timerBg : theme.badge,
        borderColor: tag.status ? color : "transparent",
      }}
    >
      <span className="sr-only">{categoryLabel(tag)}: </span>
      {tag.label}
    </span>
  );
}

/* Shared panel body: `lg` is the randomizer's single result, `md` the directory's
   inline panel. The blurb falls back to the shared summary when the guide has no
   copy for that class yet, so the panel is never empty. */
function ClassDetails({ cls, theme, size }: { cls: ClassEntry; theme: AppTheme; size: "lg" | "md" }) {
  const px = size === "lg" ? 120 : 100;
  const tags = orderedTags(cls.name);

  return (
    <>
      <div
        className={`class-portrait-frame class-portrait-${size}`}
        style={{ border: `1px solid ${theme.border}`, background: theme.panel }}
      >
        <Image src={cls.portrait} alt="" width={px} height={px} className="class-portrait-img" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: size === "lg" ? "1.05rem" : "0.95rem",
            color: theme.accentText,
            marginBottom: "0.45rem",
          }}
        >
          {cls.name}
        </div>

        <div style={{ ...panelBlurbStyle, color: theme.muted }}>
          {classGuideInfo(cls.name).blurb ?? cls.summary}
        </div>

        <div style={statListStyle}>
          <div style={{ ...statRowStyle, color: theme.text }}>
            Difficulty:{" "}
            <span style={{ color: DIFFICULTY_COLORS[cls.difficulty] }}>{cls.difficulty}</span>
          </div>
          <div style={{ ...statRowStyle, color: theme.text }}>
            Link Skill:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.link)}</span>
          </div>
          <div style={{ ...statRowStyle, color: theme.text }}>
            Legion:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>
              {highlightNumbers(cls.legion)}
            </span>
          </div>
        </div>

        {tags.length > 0 && (
          <div style={chipRowStyle}>
            {tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} theme={theme} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ClassTile({
  cls,
  theme,
  selected,
  panelId,
  onToggle,
}: {
  cls: ClassEntry;
  theme: AppTheme;
  selected: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="btn-reset class-picker-tile"
      aria-expanded={selected}
      aria-controls={panelId}
      onClick={onToggle}
    >
      <div
        className="class-picker-icon"
        style={{
          border: `2px solid ${selected ? theme.accent : theme.border}`,
          background: theme.panel,
          boxShadow: selected ? `0 0 0 2px ${theme.accentSoft}` : "none",
        }}
      >
        <Image src={cls.portrait} alt="" width={72} height={72} className="class-portrait-img" />
      </div>
      <div style={{ ...tileNameStyle, color: selected ? theme.accentText : theme.text }}>
        {cls.name}
      </div>
    </button>
  );
}

export function ClassRandomizer({ theme }: { theme: AppTheme }) {
  const [result, setResult] = useState<ClassEntry | null>(null);

  const roll = () =>
    setResult(CLASSES[Math.floor(Math.random() * CLASSES.length)]); // eslint-disable-line sonarjs/pseudo-random

  return (
    <div className="guide-randomizer">
      <button
        type="button"
        onClick={roll}
        className="guide-primary-btn"
        style={{ background: theme.accent, color: theme.accentOn }}
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
          <ClassDetails cls={result} theme={theme} size="lg" />
        </div>
      )}
    </div>
  );
}

export default function ClassPicker({ theme }: { theme: AppTheme }) {
  const [selected, setSelected] = useState<string | null>(null);
  const toggle = (name: string) => setSelected((prev) => (prev === name ? null : name));

  const grouped = CLASS_REGIONS.map((region) => ({
    region,
    classes: CLASSES.filter((c) => c.region === region),
  })).filter((g) => g.classes.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {grouped.map(({ region, classes }) => (
        <div key={region}>
          <div style={{ ...regionLabelStyle, color: theme.accentText }}>{region}</div>
          <div style={gridStyle}>
            {classes.map((cls) => {
              const isSelected = selected === cls.name;
              const panelId = `class-panel-${cls.slug}`;
              return (
                <React.Fragment key={cls.name}>
                  <ClassTile
                    cls={cls}
                    theme={theme}
                    selected={isSelected}
                    panelId={panelId}
                    onToggle={() => toggle(cls.name)}
                  />
                  {isSelected && (
                    <div
                      id={panelId}
                      className="class-card"
                      style={{
                        gridColumn: "1 / -1",
                        background: theme.accentSoft,
                        border: `1px solid ${theme.border}`,
                      }}
                    >
                      <ClassDetails cls={cls} theme={theme} size="md" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
