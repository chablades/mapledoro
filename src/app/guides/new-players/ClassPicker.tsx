/*
  Class portrait grid for the New Player Guide's "Creating Your Character"
  subsection. Portraits and the fallback summary come from the shared class data
  in ../character-guides/classData; the guide-specific blurb and tags come from
  newPlayerGuideData, so adding a tag category never touches this file.
*/
import React, { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { CLASSES, CLASS_REGIONS, type ClassEntry } from "../character-guides/classData";
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

const panelNameStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "0.95rem",
  marginBottom: "0.4rem",
};

const panelBlurbStyle: CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  lineHeight: 1.6,
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

function ClassInfoPanel({ cls, theme, id }: { cls: ClassEntry; theme: AppTheme; id: string }) {
  const tags = orderedTags(cls.name);
  return (
    <div
      id={id}
      className="class-card"
      style={{
        gridColumn: "1 / -1",
        background: theme.accentSoft,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div
        className="class-portrait-frame class-portrait-md"
        style={{ border: `1px solid ${theme.border}`, background: theme.panel }}
      >
        <Image src={cls.portrait} alt="" width={100} height={100} className="class-portrait-img" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...panelNameStyle, color: theme.accentText }}>{cls.name}</div>
        <div style={{ ...panelBlurbStyle, color: theme.muted }}>
          {classGuideInfo(cls.name).blurb ?? cls.summary}
        </div>
        {tags.length > 0 && (
          <div style={chipRowStyle}>
            {tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} theme={theme} />
            ))}
          </div>
        )}
      </div>
    </div>
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
      style={{ transform: selected ? "scale(1.05)" : undefined }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.transform = "scale(1)";
      }}
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
                  {isSelected && <ClassInfoPanel cls={cls} theme={theme} id={panelId} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
