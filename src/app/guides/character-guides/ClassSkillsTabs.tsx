"use client";

/*
  Skill browser for a class guide page. Shows all skills for the class across
  six tabs — one per MapleStory job tier — laid out left-to-right:
  1st / 2nd / 3rd / 4th / 5th / 6th. Beginner skills fold into 1st; Hyper
  Skills fold into 4th.
*/

import { useMemo, useState } from "react";
import type { AppTheme } from "../../../components/themes";
import type { ClassSkill, JobTier } from "./classSkills/types";

const TAB_ORDER: JobTier[] = [1, 2, 3, 4, 5, 6];
const TAB_LABELS: Record<JobTier, string> = {
  1: "1st Job",
  2: "2nd Job",
  3: "3rd Job",
  4: "4th Job",
  5: "5th Job",
  6: "6th Job",
};

export default function ClassSkillsTabs({
  skills,
  theme,
}: {
  skills: ClassSkill[];
  theme: AppTheme;
}) {
  const [active, setActive] = useState<JobTier>(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const countsByTier = useMemo(() => {
    const counts: Record<JobTier, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const s of skills) counts[s.jobTier]++;
    return counts;
  }, [skills]);

  const groups = useMemo(() => groupByJob(skills.filter((s) => s.jobTier === active)), [skills, active]);

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
              onClick={() => setActive(key)}
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
                {countsByTier[key]}
              </span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div
          style={{
            fontSize: "0.82rem",
            color: theme.muted,
            fontStyle: "italic",
            fontWeight: 600,
          }}
        >
          No {TAB_LABELS[active]} skills available yet.
        </div>
      ) : (
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
                    <SkillCard
                      key={key}
                      skill={skill}
                      open={expanded.has(key)}
                      onToggle={() => toggle(key)}
                      theme={theme}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByJob(skills: ClassSkill[]): { job: string; skills: ClassSkill[] }[] {
  const groups: { job: string; skills: ClassSkill[] }[] = [];
  for (const skill of skills) {
    const last = groups[groups.length - 1];
    if (last && last.job === skill.job) last.skills.push(skill);
    else groups.push({ job: skill.job, skills: [skill] });
  }
  return groups;
}

function SkillCard({
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
