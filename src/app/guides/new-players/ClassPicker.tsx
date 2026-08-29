"use client";

/*
  Class-picking widgets embedded in the New Player Guide: a randomizer and a
  browsable directory of every class grouped by faction.
*/
import React, { useState } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import {
  CLASSES,
  CLASS_REGIONS,
  DIFFICULTY_COLORS,
  highlightNumbers,
  type ClassEntry,
} from "../character-guides/classData";

function ClassDetails({ cls, theme, size }: { cls: ClassEntry; theme: AppTheme; size: "lg" | "md" }) {
  return (
    <>
      <div
        className={`class-portrait-frame class-portrait-${size}`}
        style={{ border: `1px solid ${theme.border}`, background: theme.panel }}
      >
        <Image
          src={cls.portrait}
          alt={cls.name}
          width={size === "lg" ? 120 : 100}
          height={size === "lg" ? 120 : 100}
          className="class-portrait-img"
        />
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

        <div
          style={{
            fontSize: "0.82rem",
            color: theme.muted,
            fontWeight: 600,
            lineHeight: 1.6,
            marginBottom: "0.7rem",
          }}
        >
          {cls.summary}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.32rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
            Difficulty:{" "}
            <span style={{ color: DIFFICULTY_COLORS[cls.difficulty] }}>{cls.difficulty}</span>
          </div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
            Link Skill:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.link)}</span>
          </div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.text }}>
            Legion:{" "}
            <span style={{ fontWeight: 600, color: theme.muted }}>{highlightNumbers(cls.legion)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function ClassRandomizer({ theme }: { theme: AppTheme }) {
  const [result, setResult] = useState<ClassEntry | null>(null);

  function roll() {
    setResult(CLASSES[Math.floor(Math.random() * CLASSES.length)]); // eslint-disable-line sonarjs/pseudo-random
  }

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

export function ClassDirectory({ theme }: { theme: AppTheme }) {
  const [selected, setSelected] = useState<string | null>(null);

  const grouped = CLASS_REGIONS.map((region) => ({
    region,
    classes: CLASSES.filter((c) => c.region === region),
  })).filter((g) => g.classes.length > 0);

  function toggle(name: string) {
    setSelected((prev) => (prev === name ? null : name));
  }

  return (
    <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.text }}>
        All Classes by Faction
      </div>

      {grouped.map(({ region, classes }) => (
        <div key={region}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.85rem",
              color: theme.accentText,
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
                  <button
                    type="button"
                    className="btn-reset class-picker-tile"
                    onClick={() => toggle(cls.name)}
                    aria-expanded={isSelected}
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
                  </button>

                  {isSelected && (
                    <div
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
