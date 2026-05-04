"use client";

/*
  Alternative skill browser layout — 3 top tabs (1–4 / 5 / 6). The 1–4 view
  shows all four first-tier jobs side by side in parallel columns, with a
  selected-skill detail panel beneath the columns so narrow columns stay
  readable. 5th and 6th tabs fall back to the vertical grouped list used by
  ClassSkillsTabs.
*/

import { useMemo, useState } from "react";
import type { AppTheme } from "../../../components/themes";
import type { ClassSkill, JobTier } from "./classSkills/types";

type TabKey = "1-4" | "5" | "6";
type ColumnKey = 1 | 2 | 3 | 4 | "hyper";

const TAB_ORDER: TabKey[] = ["1-4", "5", "6"];
const TAB_LABELS: Record<TabKey, string> = {
  "1-4": "1st–4th Job + Hyper",
  "5": "5th Job",
  "6": "6th Job",
};

const COLUMN_KEYS: ColumnKey[] = [1, 2, 3, 4, "hyper"];
const COLUMN_LABELS: Record<ColumnKey, string> = {
  1: "1st Job",
  2: "2nd Job",
  3: "3rd Job",
  4: "4th Job",
  hyper: "Hyper",
};

const HYPER_JOB = "Hyper Skills";

function skillsForColumn(skills: ClassSkill[], col: ColumnKey): ClassSkill[] {
  if (col === "hyper") {
    return skills.filter((s) => s.jobTier === 4 && s.job === HYPER_JOB);
  }
  if (col === 4) {
    return skills.filter((s) => s.jobTier === 4 && s.job !== HYPER_JOB);
  }
  return skills.filter((s) => s.jobTier === col);
}

export default function ClassSkillsTabsColumns({
  skills,
  theme,
}: {
  skills: ClassSkill[];
  theme: AppTheme;
}) {
  const [active, setActive] = useState<TabKey>("1-4");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { "1-4": 0, "5": 0, "6": 0 };
    for (const s of skills) {
      if (s.jobTier <= 4) c["1-4"]++;
      else if (s.jobTier === 5) c["5"]++;
      else if (s.jobTier === 6) c["6"]++;
    }
    return c;
  }, [skills]);

  const skillKey = (s: ClassSkill) => `${s.job}|${s.name}|${s.icon}`;
  const selected = useMemo(
    () => (selectedKey ? skills.find((s) => skillKey(s) === selectedKey) ?? null : null),
    [selectedKey, skills],
  );

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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
        Skills
      </div>

      <div
        role="tablist"
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        {TAB_ORDER.map((key) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActive(key);
                setSelectedKey(null);
              }}
              style={{
                padding: "0.45rem 0.85rem",
                border: `1px solid ${isActive ? theme.accent : theme.border}`,
                background: isActive ? theme.accentSoft : "transparent",
                color: isActive ? theme.accent : theme.muted,
                fontSize: "0.78rem",
                fontWeight: 800,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              {TAB_LABELS[key]}
              <span style={{ opacity: 0.75, marginLeft: "0.35rem", fontWeight: 700 }}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {active === "1-4" ? (
        <FirstFourColumns
          skills={skills}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          selected={selected}
          theme={theme}
        />
      ) : (
        <TierList
          skills={skills.filter((s) => String(s.jobTier) === active)}
          tierLabel={TAB_LABELS[active]}
          expanded={expanded}
          onToggle={toggle}
          theme={theme}
        />
      )}
    </div>
  );
}

function FirstFourColumns({
  skills,
  selectedKey,
  onSelect,
  selected,
  theme,
}: {
  skills: ClassSkill[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  selected: ClassSkill | null;
  theme: AppTheme;
}) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "0.5rem",
          alignItems: "start",
        }}
      >
        {COLUMN_KEYS.map((col) => {
          const tierSkills = skillsForColumn(skills, col);
          return (
            <div
              key={String(col)}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "10px",
                background: theme.bg,
                overflow: "hidden",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: theme.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                  padding: "0.5rem 0.6rem",
                  borderBottom: `1px solid ${theme.border}`,
                  background: theme.accentSoft,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{COLUMN_LABELS[col]}</span>
                <span style={{ opacity: 0.75, fontWeight: 700 }}>{tierSkills.length}</span>
              </div>
              {tierSkills.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: theme.muted,
                    fontStyle: "italic",
                    fontWeight: 600,
                    padding: "0.6rem",
                  }}
                >
                  None.
                </div>
              ) : (
                <div>
                  {tierSkills.map((skill, idx) => {
                    const key = `${skill.job}|${skill.name}|${skill.icon}`;
                    return (
                      <CompactSkillRow
                        key={key}
                        skill={skill}
                        selected={selectedKey === key}
                        isLast={idx === tierSkills.length - 1}
                        onSelect={() => onSelect(key)}
                        theme={theme}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "1rem" }}>
        {selected ? (
          <SkillDetail skill={selected} theme={theme} />
        ) : (
          <div
            style={{
              fontSize: "0.78rem",
              color: theme.muted,
              fontStyle: "italic",
              fontWeight: 600,
              padding: "0.75rem 0",
              textAlign: "center",
              border: `1px dashed ${theme.border}`,
              borderRadius: "10px",
            }}
          >
            Select a skill to see its description and level progression.
          </div>
        )}
      </div>
    </>
  );
}

function CompactSkillRow({
  skill,
  selected,
  isLast,
  onSelect,
  theme,
}: {
  skill: ClassSkill;
  selected: boolean;
  isLast: boolean;
  onSelect: () => void;
  theme: AppTheme;
}) {
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.55rem",
        background: selected ? theme.accentSoft : "transparent",
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${theme.border}`,
        cursor: "pointer",
        textAlign: "left",
        color: "inherit",
        minWidth: 0,
      }}
    >
      {iconFailed ? (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "5px",
            background: theme.accentSoft,
            border: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: theme.accent,
            flexShrink: 0,
          }}
        >
          {skill.name.charAt(0)}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={skill.icon}
          alt=""
          width={26}
          height={26}
          onError={() => setIconFailed(true)}
          style={{
            width: 26,
            height: 26,
            borderRadius: "5px",
            flexShrink: 0,
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            objectFit: "contain",
          }}
        />
      )}
      <span
        style={{
          fontSize: "0.74rem",
          fontWeight: 700,
          color: selected ? theme.accentText : theme.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          flex: 1,
        }}
        title={skill.name}
      >
        {skill.name}
      </span>
    </button>
  );
}

function SkillDetail({ skill, theme }: { skill: ClassSkill; theme: AppTheme }) {
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <div
      style={{
        border: `1px solid ${theme.accent}`,
        background: theme.accentSoft,
        borderRadius: "10px",
        padding: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
          marginBottom: "0.6rem",
        }}
      >
        {iconFailed ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "6px",
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              fontWeight: 800,
              color: theme.accent,
              flexShrink: 0,
            }}
          >
            {skill.name.charAt(0)}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.icon}
            alt=""
            width={40}
            height={40}
            onError={() => setIconFailed(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "6px",
              flexShrink: 0,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              objectFit: "contain",
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>
              {skill.name}
            </span>
            {skill.category && (
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  color: theme.accent,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: theme.panel,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                {skill.category}
              </span>
            )}
            {skill.masterLevel !== undefined && (
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: theme.muted }}>
                Max Lv. {skill.masterLevel}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: theme.muted,
              marginTop: "2px",
            }}
          >
            {skill.job}
          </div>
        </div>
      </div>

      {skill.description && (
        <div
          style={{
            fontSize: "0.8rem",
            color: theme.text,
            fontWeight: 600,
            lineHeight: 1.55,
            marginBottom: "0.6rem",
          }}
        >
          {skill.description}
        </div>
      )}
      {skill.prerequisite && (
        <div
          style={{
            fontSize: "0.72rem",
            color: theme.muted,
            fontWeight: 700,
            marginBottom: "0.6rem",
          }}
        >
          Prerequisite: <span style={{ color: theme.text }}>{skill.prerequisite}</span>
        </div>
      )}
      {skill.levels && skill.levels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {skill.levels.map((lvl) => (
            <div
              key={lvl.level}
              style={{
                display: "flex",
                gap: "0.6rem",
                fontSize: "0.74rem",
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  color: theme.accent,
                  fontWeight: 800,
                  minWidth: "46px",
                  flexShrink: 0,
                }}
              >
                Lv {lvl.level}
              </span>
              <span style={{ color: theme.muted }}>{lvl.effect}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TierList({
  skills,
  tierLabel,
  expanded,
  onToggle,
  theme,
}: {
  skills: ClassSkill[];
  tierLabel: string;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  theme: AppTheme;
}) {
  const groups = useMemo(() => {
    const g: { job: string; skills: ClassSkill[] }[] = [];
    for (const skill of skills) {
      const last = g[g.length - 1];
      if (last && last.job === skill.job) last.skills.push(skill);
      else g.push({ job: skill.job, skills: [skill] });
    }
    return g;
  }, [skills]);

  if (groups.length === 0) {
    return (
      <div
        style={{
          fontSize: "0.82rem",
          color: theme.muted,
          fontStyle: "italic",
          fontWeight: 600,
        }}
      >
        No {tierLabel} skills available yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {groups.map((group) => (
        <div key={group.job}>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              color: theme.accent,
              textTransform: "uppercase",
              letterSpacing: "0.7px",
              marginBottom: "0.4rem",
            }}
          >
            {group.job}
          </div>
          <div>
            {group.skills.map((skill) => {
              const key = `${skill.job}|${skill.name}|${skill.icon}`;
              return (
                <FullSkillCard
                  key={key}
                  skill={skill}
                  open={expanded.has(key)}
                  onToggle={() => onToggle(key)}
                  theme={theme}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FullSkillCard({
  skill,
  open,
  onToggle,
  theme,
}: {
  skill: ClassSkill;
  open: boolean;
  onToggle: () => void;
  theme: AppTheme;
}) {
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${theme.border}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.65rem 0",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        {iconFailed ? (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "6px",
              background: theme.accentSoft,
              border: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              fontWeight: 800,
              color: theme.accent,
              flexShrink: 0,
            }}
          >
            {skill.name.charAt(0)}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={skill.icon}
            alt=""
            width={36}
            height={36}
            onError={() => setIconFailed(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "6px",
              flexShrink: 0,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              objectFit: "contain",
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
              {skill.name}
            </span>
            {skill.category && (
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  color: theme.accent,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: theme.accentSoft,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                {skill.category}
              </span>
            )}
            {skill.masterLevel !== undefined && (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: theme.muted }}>
                Max Lv. {skill.masterLevel}
              </span>
            )}
          </div>
          {!open && skill.description && (
            <div
              style={{
                fontSize: "0.75rem",
                color: theme.muted,
                fontWeight: 600,
                lineHeight: 1.5,
                marginTop: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {skill.description}
            </div>
          )}
        </div>
        <span
          style={{
            color: theme.muted,
            fontSize: "1rem",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div
          style={{
            paddingLeft: "calc(36px + 0.75rem)",
            paddingBottom: "0.85rem",
            paddingRight: "0.25rem",
          }}
        >
          {skill.description && (
            <div
              style={{
                fontSize: "0.8rem",
                color: theme.text,
                fontWeight: 600,
                lineHeight: 1.55,
                marginBottom: "0.6rem",
              }}
            >
              {skill.description}
            </div>
          )}
          {skill.prerequisite && (
            <div
              style={{
                fontSize: "0.72rem",
                color: theme.muted,
                fontWeight: 700,
                marginBottom: "0.6rem",
              }}
            >
              Prerequisite: <span style={{ color: theme.text }}>{skill.prerequisite}</span>
            </div>
          )}
          {skill.levels && skill.levels.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {skill.levels.map((lvl) => (
                <div
                  key={lvl.level}
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      color: theme.accent,
                      fontWeight: 800,
                      minWidth: "46px",
                      flexShrink: 0,
                    }}
                  >
                    Lv {lvl.level}
                  </span>
                  <span style={{ color: theme.muted }}>{lvl.effect}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Silences unused-type warning on JobTier in non-column paths — kept for future work.
export type { JobTier };
