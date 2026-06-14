"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { StoredCharacterRecord } from "../../model/charactersStore";
import SetupStepFrame from "./SetupStepFrame";

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

type LinkSkillId =
  | "unfairAdvantage" | "tideOfBattle" | "solus" | "timeToPrepare"
  | "termsAndConditions" | "elementalism" | "qiCultivation" | "bravado"
  | "empiricalKnowledge" | "thiefsСunning";

interface LinkSkillDef {
  id: LinkSkillId;
  name: string;
  classes: string[];
  maxLevel: number;
  iconUrl: string;
}

const BASE = "https://media.maplestorywiki.net/yetidb/";

const LINK_SKILLS: LinkSkillDef[] = [
  { id: "unfairAdvantage",    name: "Unfair Advantage",    classes: ["Cadena"],                                    maxLevel: 3, iconUrl: `${BASE}Skill_Unfair_Advantage.png` },
  { id: "tideOfBattle",       name: "Tide of Battle",      classes: ["Illium"],                                    maxLevel: 3, iconUrl: `${BASE}Skill_Tide_of_Battle.png` },
  { id: "solus",              name: "Solus",               classes: ["Ark"],                                       maxLevel: 3, iconUrl: `${BASE}Skill_Solus.png` },
  { id: "timeToPrepare",      name: "Time to Prepare",     classes: ["Kain"],                                      maxLevel: 3, iconUrl: `${BASE}Skill_Time_to_Prepare.png` },
  { id: "termsAndConditions", name: "Terms and Conditions",classes: ["Angelic Buster"],                            maxLevel: 3, iconUrl: `${BASE}Skill_Terms_and_Conditions.png` },
  { id: "elementalism",       name: "Elementalism",        classes: ["Kanna"],                                     maxLevel: 3, iconUrl: `${BASE}Skill_Elementalism.png` },
  { id: "qiCultivation",      name: "Qi Cultivation",      classes: ["Mo Xuan"],                                   maxLevel: 3, iconUrl: `${BASE}Skill_Qi_Cultivation.png` },
  { id: "bravado",            name: "Bravado",             classes: ["Hoyoung"],                                   maxLevel: 3, iconUrl: `${BASE}Skill_Bravado.png` },
  { id: "empiricalKnowledge", name: "Empirical Knowledge", classes: ["Arch Mage (F/P)", "Arch Mage (I/L)", "Bishop"], maxLevel: 9, iconUrl: `${BASE}Skill_Empirical_Knowledge.png` },
  { id: "thiefsСunning",      name: "Thief's Cunning",     classes: ["Night Lord", "Shadower", "Dual Blade"],      maxLevel: 9, iconUrl: `${BASE}Skill_Thief%27s_Cunning.png` },
];

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
  "Night Lord":       "thiefsСunning",
  "Shadower":         "thiefsСunning",
  "Blade Master":     "thiefsСunning",
};

type LinkSkillsDraft = Partial<Record<LinkSkillId, string>>;
type AutofillSources = Partial<Record<LinkSkillId, string>>;

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
      sources[skillId as LinkSkillId] = `${best.name} (Lv ${best.level})`;
    } else {
      const sorted = entries.toSorted((a, b) => b.contribution - a.contribution);
      const total = Math.min(sorted.reduce((sum, e) => sum + e.contribution, 0), skill.maxLevel);
      values[skillId as LinkSkillId] = String(total);
      sources[skillId as LinkSkillId] = sorted.map((e) => `${e.name} (Lv ${e.level})`).join(", ");
    }
  }

  return { values, sources };
}

function parseDraft(raw: string): LinkSkillsDraft {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as LinkSkillsDraft;
  } catch { /* ignore */ }
  return {};
}

function LinkSkillIcon({ iconUrl, name }: { iconUrl: string; name: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image
          src={iconUrl}
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

function LinkSkillRow({
  skill, value, source, onUpdate, theme, fullWidth, locked, min,
}: {
  skill: LinkSkillDef;
  value: string;
  source?: string;
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
      <LinkSkillIcon iconUrl={skill.iconUrl} name={skill.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: theme.text, lineHeight: 1.2 }}>
          {skill.name}
        </p>
        <p style={{ margin: 0, marginTop: "0.1rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2 }}>
          {skill.classes.join(" · ")}
        </p>
        {source && (
          <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600, lineHeight: 1.2, opacity: 0.75 }}>
            from {source}
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
            const raw = e.target.value;
            const n = parseInt(raw, 10);
            if (!isNaN(n) && n > skill.maxLevel) { onUpdate(skill.id, String(skill.maxLevel)); return; }
            onUpdate(skill.id, raw);
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
          style={{
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
          }}
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
      description={<>All fields are optional. Fill in what you can.<br />Shared across all characters on your world, inherited automatically by new characters.</>}
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div style={{
        marginBottom: "0.8rem",
        background: `${theme.accent}0f`,
        border: `1px solid ${theme.accent}40`,
        borderRadius: "10px",
        padding: "0.6rem 0.85rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.15rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 800, color: theme.accent }}>
              Found in the Beginner tab of your Skill window under Link Manager.
            </p>
          </div>
          {hasRosterData && (
            <button
              type="button"
              onClick={handleAutofill}
              style={{
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
                marginLeft: "0.5rem",
              }}
            >
              Autofill from roster
            </button>
          )}
        </div>
        {[
          { label: "Master Lv. 1", note: "Level 70" },
          { label: "Master Lv. 2", note: "Level 120" },
          { label: "Master Lv. 3", note: "Level 210" },
          { label: "Master Lv. 4-9", note: "Empirical Knowledge & Thief's Cunning only - each Explorer Magician or Thief character you have contributes their own master level (1-3) to the total" },
        ].map(({ label, note }) => (
          <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 900, color: theme.accent, minWidth: "5rem" }}>{label}</span>
            <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700 }}>{note}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
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
    </SetupStepFrame>
  );
}
