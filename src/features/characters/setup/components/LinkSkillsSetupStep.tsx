"use client";

import { Fragment, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
import Image from "next/image";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { StoredCharacterRecord, LinkSkillId } from "../../model/charactersStore";
import { LINK_SKILLS, type LinkSkillDef } from "../data/linkSkillsData";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip, { type TooltipContent } from "./InfoTooltip";

interface LinkSkillsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  direction?: "forward" | "backward";
  characterRoster?: StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldLinkSkills?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// nexonJobName → which skill it contributes to
const CLASS_TO_SKILL: Record<string, LinkSkillId> = {
  "Cadena":           "unfairAdvantage",
  "Illium":           "tideOfBattle",
  "Ark":              "solus",
  "Kain":             "timeToPrepare",
  "Angelic Buster":   "termsAndConditions",
  "Kanna":            "elementalism",
  "Mo Xuan":          "qiCultivation",
  "Hoyoung":          "bravado",
  "Arch Mage (F/P)":  "empiricalKnowledge",
  "Arch Mage (I/L)":  "empiricalKnowledge",
  "Bishop":           "empiricalKnowledge",
  "Night Lord":       "thiefsCunning",
  "Shadower":         "thiefsCunning",
  "Blade Master":     "thiefsCunning",
};

type LinkSkillsDraft = Partial<Record<LinkSkillId, string>>;
type AutofillSources = Partial<Record<LinkSkillId, string[]>>;

function inferLinkLevel(level: number): number {
  if (level >= 210) return 3;
  if (level >= 120) return 2;
  if (level >= 70)  return 1;
  return 0;
}

function computeAutofill(
  roster: StoredCharacterRecord[],
  worldId: number,
): { values: LinkSkillsDraft; sources: AutofillSources } {
  const sameWorld = roster.filter((c) => c.worldID === worldId);
  const bySkill: Record<string, { name: string; level: number; contribution: number }[]> = {};

  for (const char of sameWorld) {
    const skillId = CLASS_TO_SKILL[char.jobName];
    if (!skillId) continue;
    const contribution = inferLinkLevel(char.level);
    if (contribution === 0) continue;
    if (!bySkill[skillId]) bySkill[skillId] = [];
    bySkill[skillId].push({ name: char.characterName, level: char.level, contribution });
  }

  const values: LinkSkillsDraft = {};
  const sources: AutofillSources = {};

  for (const [skillId, entries] of Object.entries(bySkill)) {
    const skill = LINK_SKILLS.find((s) => s.id === skillId);
    if (!skill) continue;

    if (skill.maxLevel === 3) {
      const best = entries.reduce((a, b) => a.contribution > b.contribution ? a : b);
      values[skillId as LinkSkillId] = String(best.contribution);
      sources[skillId as LinkSkillId] = [`${best.name} (Lv ${best.level})`];
    } else {
      const total = Math.min(entries.reduce((sum, e) => sum + e.contribution, 0), skill.maxLevel);
      const alphabetical = entries.toSorted((a, b) => a.name.localeCompare(b.name));
      values[skillId as LinkSkillId] = String(total);
      sources[skillId as LinkSkillId] = alphabetical.map((e) => `${e.name} (Lv ${e.level})`);
    }
  }

  return { values, sources };
}

// manifests/v269/skill.json
const LINK_MANAGER_SKILL_ID = "0001251"; // "Link Manager"

const WHERE_TOOLTIP: TooltipContent = {
  title: "Link Manager",
  description: "Found in the Beginner tab of your Skill window under Link Manager.",
  imageUrls: [resourceImageUrl("skill", LINK_MANAGER_SKILL_ID, "icon.png")],
};

const MASTER_LEVEL_ROWS: { label: string; note: string }[] = [
  { label: "Master Lv. 1", note: "Character Lv. 70" },
  { label: "Master Lv. 2", note: "Character Lv. 120" },
  { label: "Master Lv. 3", note: "Character Lv. 210" },
];

function masterLevelTooltip(theme: AppTheme): TooltipContent {
  return {
    title: "Master Levels",
    description: (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginBottom: "0.5rem" }}>
          {MASTER_LEVEL_ROWS.map(({ label, note }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <span style={{ fontWeight: 800, color: theme.text }}>{label}</span>
              <span>{note}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontWeight: 800, color: theme.text, marginBottom: "0.2rem" }}>Master Lv. 4-9</div>
          <div>
            <strong>Empirical Knowledge &amp; Thief&apos;s Cunning only</strong>: each Explorer Magician or Thief character contributes their own master level (1-3), for a total of up to 9.
          </div>
        </div>
      </>
    ),
  };
}

function parseDraft(raw: string): LinkSkillsDraft {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as LinkSkillsDraft;
  } catch { /* ignore */ }
  return {};
}

function LinkSkillIcon({ iconId, name }: { iconId: string; name: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image
          src={resourceImageUrl("skill", iconId, "icon.png")}
          alt={name}
          width={32}
          height={32}
          unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "block";
          }}
          style={{ borderRadius: "6px", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none", width: 32, height: 32, borderRadius: "6px", flexShrink: 0 }} />
    </>
  );
}

const linkLevelInputStyle = (theme: AppTheme, locked: boolean | undefined): CSSProperties => ({
  width: "2.2rem",
  border: `1px solid ${locked ? theme.accent : theme.border}`,
  borderRadius: "6px",
  background: locked ? `${theme.accent}18` : theme.bg,
  color: locked ? theme.accent : theme.text,
  fontFamily: "inherit",
  fontSize: "0.82rem",
  fontWeight: 700,
  padding: "0.25rem 0.35rem",
  textAlign: "center",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  transition: "outline-color 0.15s ease",
  cursor: locked ? "default" : undefined,
});

const autofillButtonStyle = (theme: AppTheme): CSSProperties => ({
  border: `1px solid ${theme.accent}`,
  borderRadius: "7px",
  background: "transparent",
  color: theme.accent,
  fontFamily: "inherit",
  fontWeight: 800,
  fontSize: "0.75rem",
  padding: "0.2rem 0.55rem",
  cursor: "pointer",
  flexShrink: 0,
});

// Renders a token list (class names, "name (Lv N)" entries) so long lines wrap
// between tokens rather than inside one — a plain joined string lets the browser
// break at any space, including ones inside a token like "Arch Mage (I/L)".
function NowrapTokens({ tokens, separator }: { tokens: string[]; separator: string }) {
  return (
    <>
      {tokens.map((token, i) => (
        <Fragment key={token}>
          {i > 0 && separator}
          <span style={{ whiteSpace: "nowrap" }}>{token}</span>
        </Fragment>
      ))}
    </>
  );
}

function LinkSkillRow({
  skill, value, source, onUpdate, theme, fullWidth, locked, min,
}: {
  skill: LinkSkillDef;
  value: string;
  source?: string[];
  onUpdate: (id: LinkSkillId, val: string) => void;
  theme: AppTheme;
  fullWidth?: boolean;
  locked?: boolean;
  min?: number;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      padding: "0.5rem 0.6rem",
      borderRadius: "8px",
      border: `1px solid ${theme.border}`,
      background: theme.bg,
      ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
    }}>
      <LinkSkillIcon iconId={skill.iconId} name={skill.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: theme.text, lineHeight: 1.2 }}>
          {skill.name}
        </p>
        <p style={{ margin: 0, marginTop: "0.1rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2 }}>
          <NowrapTokens tokens={skill.classes} separator=" · " />
        </p>
        {source && source.length > 0 && (
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600, lineHeight: 1.2, opacity: 0.75 }}>
            from <NowrapTokens tokens={source} separator=", " />
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${skill.name} level`}
          value={value}
          placeholder="0"
          disabled={locked}
          title={locked ? "Locked because the character you're adding already brings this skill to Master Level 3" : undefined}
          onChange={(e) => {
            const sanitized = sanitizeDigitsInput(e.target.value);
            const n = parseInt(sanitized, 10);
            if (!isNaN(n) && n > skill.maxLevel) { onUpdate(skill.id, String(skill.maxLevel)); return; }
            onUpdate(skill.id, sanitized);
          }}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
          onBlur={(e) => {
            e.currentTarget.style.outlineColor = "transparent";
            const raw = e.currentTarget.value;
            if (raw === "") return;
            const parsed = parseInt(raw, 10);
            const floor = min ?? 0;
            if (isNaN(parsed) || parsed < floor) { onUpdate(skill.id, String(floor)); return; }
            if (parsed > skill.maxLevel) onUpdate(skill.id, String(skill.maxLevel));
          }}
          onKeyDown={numericKeyDown}
          style={linkLevelInputStyle(theme, locked)}
        />
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>/ {skill.maxLevel}</span>
      </div>
    </div>
  );
}

export default function LinkSkillsSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", value, onChange, onBack, onNext, onFinish,
  characterRoster = [], confirmedWorldId, worldLinkSkills = "",
}: LinkSkillsSetupStepProps) {
  const draft = parseDraft(value);
  const initialValueRef = useRef(value);

  const { values: autofillValues, sources } = confirmedWorldId !== undefined
    ? computeAutofill(characterRoster, confirmedWorldId)
    : { values: {}, sources: {} };

  // One-shot mount-time backfill (world-store draft merged with same-world roster
  // autofill), only when this step lands blank — can't run during render since it
  // depends on a client-only localStorage read. Not worth lifting into the parent
  // controller (which owns none of this step's domain logic) for a fetch that only ever
  // fires once, at mount.
  // react-doctor-disable-next-line no-pass-data-to-parent
  useEffect(() => {
    if (initialValueRef.current) return;
    const worldStore = parseDraft(worldLinkSkills);
    const roster = confirmedWorldId !== undefined
      ? computeAutofill(characterRoster, confirmedWorldId).values
      : {};
    const merged = { ...worldStore, ...roster };
    if (Object.keys(merged).length > 0) {
      onChange(JSON.stringify(merged));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUpdate(id: LinkSkillId, val: string) {
    onChange(JSON.stringify({ ...draft, [id]: val }));
  }

  function handleAutofill() {
    onChange(JSON.stringify({ ...draft, ...autofillValues }));
  }

  const confirmedSkillId = CLASS_TO_SKILL[jobName];
  const confirmedLevel = characterRoster[0]?.level ?? 0;
  const confirmedContribution = confirmedSkillId ? inferLinkLevel(confirmedLevel) : 0;
  const lockedSkillId = confirmedContribution === 3 ? confirmedSkillId : undefined;

  const hasRosterData = Object.keys(autofillValues).length > 0;
  const singleSkills = LINK_SKILLS.filter((s) => s.maxLevel === 3);
  const multiSkills  = LINK_SKILLS.filter((s) => s.maxLevel > 3);

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your link skill levels."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div className="link-skills-root">
      <style>{`
        .link-skills-root { container-type: inline-size; }
        .link-skills-grid { grid-template-columns: 1fr 1fr; }
        @container (max-width: 480px) {
          .link-skills-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ marginBottom: "0.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.35rem" }}>
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>Where can I find this?</p>
          <InfoTooltip content={WHERE_TOOLTIP} theme={theme} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>What do the levels mean?</p>
          <InfoTooltip content={masterLevelTooltip(theme)} theme={theme} />
        </div>
        <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>
          These levels are shared across all characters on your world, and inherited automatically by new characters.
        </p>
        {hasRosterData && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="tap-target-44"
              onClick={handleAutofill}
              style={autofillButtonStyle(theme)}
            >
              Autofill from roster
            </button>
          </div>
        )}
      </div>
      <div className="link-skills-grid" style={{ display: "grid", gap: "0.5rem" }}>
        {singleSkills.map((skill) => (
          <LinkSkillRow
            key={skill.id}
            skill={skill}
            value={draft[skill.id] ?? ""}
            source={sources[skill.id]}
            onUpdate={handleUpdate}
            theme={theme}
            locked={skill.id === lockedSkillId}
            min={autofillValues[skill.id] ? Number(autofillValues[skill.id]) : undefined}
          />
        ))}
        {multiSkills.map((skill) => (
          <LinkSkillRow
            key={skill.id}
            skill={skill}
            value={draft[skill.id] ?? ""}
            source={sources[skill.id]}
            onUpdate={handleUpdate}
            theme={theme}
            fullWidth
            min={autofillValues[skill.id] ? Number(autofillValues[skill.id]) : undefined}
          />
        ))}
      </div>
      </div>
    </SetupStepFrame>
  );
}
