"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
import Image from "next/image";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import HoverTooltip from "../../../../components/HoverTooltip";
import { linkSkillsStoredToDraftString, type StoredCharacterRecord, type LinkSkillId, type LinkSkillsData } from "../../model/charactersStore";
import { LINK_SKILLS, computeLinkSkillsFromRoster, linkSkillFloorsForCharacter, bestKnownLinkSkillFloors, type LinkSkillDef } from "../data/linkSkillsData";
import { LINK_SKILL_TO_SCOUTER_KEY } from "../../scouter/scouterLinkSkills";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip, { type TooltipContent } from "./InfoTooltip";

interface LinkSkillsEditorProps {
  theme: AppTheme;
  jobName?: string;
  characterRoster?: StoredCharacterRecord[];
  confirmedWorldId?: number;
  confirmedCharacterName?: string;
  value: string;
  onChange: (value: string) => void;
}

interface LinkSkillsSetupStepProps extends LinkSkillsEditorProps {
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  direction?: "forward" | "backward";
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

type LinkSkillsDraft = Partial<Record<LinkSkillId, string>>;

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

// Exported for reuse by LegionPanel's Link Skills cards/chips.
export function LinkSkillIcon({ iconId, name, theme, size = 32 }: { iconId: string; name: string; theme: AppTheme; size?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image
          src={resourceImageUrl("skill", iconId, "icon.png")}
          alt={name}
          width={size}
          height={size}
          unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "flex";
          }}
          style={{ borderRadius: "6px", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{
        display: "none", alignItems: "center", justifyContent: "center", width: size, height: size,
        borderRadius: "6px", flexShrink: 0, fontWeight: 800, fontSize: Math.max(12, size * 0.35),
        background: "rgba(127,127,127,0.18)", color: theme.muted,
      }}>
        {name.match(/[a-zA-Z0-9]/)?.[0] ?? "?"}
      </div>
    </>
  );
}

// Reset a native button back to plain content so the icon reads the same as a static
// image at rest — the accent ring on hover/focus is the only cue this is clickable,
// matching the tap-target-friendly, chrome-at-rest-free style used elsewhere in setup.
// Real CSS :hover/:focus-visible (see .link-skill-max-btn in LinkSkillsEditor's own
// <style> block) for pointer/keyboard, plus LinkSkillRow's own JS-driven "flashing" state
// for a guaranteed-visible tap flash (see MAX_BTN_FLASH_MS) -- not JS mouseenter/
// mouseleave/focus/blur handlers, since touch devices routinely fire a tap's synthetic
// mouseenter/focus without ever firing a matching mouseleave/blur afterward, leaving the
// ring stuck lit permanently after a single tap, and :active alone isn't reliably computed
// for a plain tap on several mobile browsers either. The transition here is intentionally
// quick (0.15s) -- MAX_BTN_FLASH_MS controls how long the flash is actually visible, so a
// slow transition just made the whole thing feel sluggish on top of that already-
// deliberate hold time.
const linkSkillMaxButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  padding: 2,
  margin: -2,
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  outline: "2px solid transparent",
  outlineOffset: "1px",
  transition: "outline-color 0.15s ease",
};

const linkLevelInputStyle = (theme: AppTheme): CSSProperties => ({
  width: "2.2rem",
  border: `1px solid ${theme.border}`,
  borderRadius: "6px",
  background: theme.bg,
  color: theme.text,
  fontFamily: "inherit",
  fontSize: "0.82rem",
  fontWeight: 700,
  padding: "0.25rem 0.35rem",
  textAlign: "center",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  transition: "outline-color 0.15s ease",
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

// How long the tap-feedback flash (see LinkSkillRow's handleMaxClick) stays lit before
// clearing itself via setTimeout -- a real, self-clearing JS timer rather than relying on
// :active, since several mobile browsers don't reliably compute :active for a plain tap
// without touch-event listeners already present, which made the CSS-only flash read as
// completely absent on touch (see linkSkillMaxButtonStyle's comment for the rest of this
// fix's history).
const MAX_BTN_FLASH_MS = 180;

function LinkSkillRow({
  skill, value, source, onUpdate, theme, fullWidth, min,
}: {
  skill: LinkSkillDef;
  value: string;
  source?: string[];
  onUpdate: (id: LinkSkillId, val: string) => void;
  theme: AppTheme;
  fullWidth?: boolean;
  min?: number;
}) {
  const [flashing, setFlashing] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMaxClick() {
    onUpdate(skill.id, String(skill.maxLevel));
    setFlashing(true);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashing(false), MAX_BTN_FLASH_MS);
  }

  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);

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
      <HoverTooltip label={`Set to max (${skill.maxLevel})`} theme={theme} style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="link-skill-max-btn"
          aria-label={`Set ${skill.name} to max level (${skill.maxLevel})`}
          onClick={handleMaxClick}
          style={flashing ? { ...linkSkillMaxButtonStyle, outline: `2px solid ${theme.accent}` } : linkSkillMaxButtonStyle}
        >
          <LinkSkillIcon iconId={skill.iconId} name={skill.name} theme={theme} />
        </button>
      </HoverTooltip>
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
          style={linkLevelInputStyle(theme)}
        />
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>/ {skill.maxLevel}</span>
      </div>
    </div>
  );
}

/** This character's own floor: prefers the real tracked record (confirmedRecord) when it
 *  exists, else falls back to just jobName/worldID for a character still mid-setup and
 *  not yet a real persisted record -- linkSkillFloorsForCharacter only needs those two. */
function resolveLinkSkillFloors(
  confirmedRecord: StoredCharacterRecord | undefined,
  jobName: string,
  confirmedWorldId: number | undefined,
  characterRoster: StoredCharacterRecord[],
): LinkSkillsData {
  if (confirmedRecord) return linkSkillFloorsForCharacter(confirmedRecord, characterRoster);
  if (confirmedWorldId === undefined) return {};
  return linkSkillFloorsForCharacter({ jobName, worldID: confirmedWorldId }, characterRoster);
}

/** The Link Skills step's actual editable content, with no wizard-frame chrome — reused
 *  standalone by LegionPanel's edit-in-place view as well as by the wizard step below.
 *  Values here belong to ONE character (identified by confirmedCharacterName within
 *  characterRoster, if it's already a tracked record) -- the same-world roster is only
 *  used to compute a FLOOR (what mastery the roster proves), never to overwrite this
 *  character's own saved choice of which links it actually has equipped. */
function LinkSkillsEditor({
  theme, jobName = "", value, onChange,
  characterRoster = [], confirmedWorldId, confirmedCharacterName,
}: LinkSkillsEditorProps) {
  const draft = parseDraft(value);
  const initialValueRef = useRef(value);

  // This character's own floor: only the ONE skill its own class belongs to (never every
  // skill the roster happens to have data for -- a Kanna's floor must never involve
  // Empirical Knowledge just because a same-world Bishop is tracked). Falls back to just
  // jobName/worldID when the character isn't in characterRoster yet (still mid-setup, not
  // yet a real persisted record) -- linkSkillFloorsForCharacter only needs those two.
  // Filtered to only the hand-picked skills MapleScouter's payload reads (see
  // scouterLinkSkills.ts) -- this step must never render, suggest, or silently save a
  // value for any of the newer LINK_SKILLS entries added for the Legion panel's own
  // read-only display, since this step never asks the player about them at all.
  const confirmedRecord = characterRoster.find((c) => c.characterName === confirmedCharacterName);
  const rawFloors = resolveLinkSkillFloors(confirmedRecord, jobName, confirmedWorldId, characterRoster);
  const floors: LinkSkillsData = {};
  for (const skillId of Object.keys(rawFloors) as LinkSkillId[]) {
    if (skillId in LINK_SKILL_TO_SCOUTER_KEY) floors[skillId] = rawFloors[skillId];
  }

  // "from X, Y" provenance text: scoped to ONLY the skill(s) `floors` already proved this
  // character is eligible for (never every skill the world roster happens to have data
  // on) -- a Kanna's Bravado row must never say "from Hoyoung" just because a same-world
  // Hoyoung exists, since that's not this character's own link at all. For a multi-class
  // skill (Empirical Knowledge/Thief's Cunning) this lists the real contributing siblings;
  // for a single-class skill it's just this character itself (or empty if untracked).
  const rawSources = confirmedWorldId !== undefined
    ? computeLinkSkillsFromRoster(characterRoster, confirmedWorldId).sources
    : {};
  const sources: Partial<Record<LinkSkillId, string[]>> = {};
  for (const skillId of Object.keys(floors) as LinkSkillId[]) {
    if (rawSources[skillId]) sources[skillId] = rawSources[skillId];
  }

  // One-shot mount-time backfill, only when this step lands blank -- a SUGGESTION only,
  // never a constraint (the field stays freely editable down to `floors`, the real
  // level-only minimum, regardless of what this seeds). Two sources, in priority order:
  // (1) this character's OWN already-stored value, if it's a tracked record -- the
  // strongest signal, since it's literally what was last saved for THIS character; (2)
  // if not yet tracked at all (e.g. a fresh Full/MapleScouter Setup search-and-open,
  // before Finish -- confirmedRecord doesn't exist, so (1) is empty), the roster's
  // best-known value (bestKnownLinkSkillFloors -- levels + any tracked sibling's own
  // stored value, e.g. Bishop's manually-saved 7) is the only useful starting number.
  // Never a shared value written back to a world bucket -- purely a local draft seed.
  // Can't run during render since it depends on a client-only localStorage read
  // (characterRoster is already resolved by the caller, but the "landed blank" check
  // below still needs to run post-mount to avoid clobbering an in-progress draft). Not
  // worth lifting into the parent controller (which owns none of this step's domain
  // logic) for a fetch that only ever fires once, at mount.
  useEffect(() => {
    if (initialValueRef.current) return;
    // Two different scopes on purpose: `confirmedRecord.linkSkills` is this character's
    // OWN already-saved choice of which links it runs -- e.g. a Kanna's own record can
    // legitimately have a manually-entered Unfair Advantage value even though Cadena's
    // link has nothing to do with Kanna's own class, because this step shows every
    // scouter-relevant row to every character regardless of class (see "Only enter the
    // levels for the links that this character actually has equipped" above) -- so a
    // stored value must be re-suggested for ANY of those rows, not just the row(s)
    // matching this character's own class. `bestKnownLinkSkillFloors` (the untracked-
    // character fallback) is the opposite: it has no per-character record to trust yet,
    // so it's still scoped to `floors` (this character's own class) to avoid seeding an
    // untracked F/P's blank Bravado/Elementalism/etc. rows from an unrelated same-world
    // Hoyoung/Kanna.
    const suggestion: LinkSkillsData = {};
    if (confirmedRecord?.linkSkills) {
      for (const skillId of Object.keys(confirmedRecord.linkSkills) as LinkSkillId[]) {
        if (skillId in LINK_SKILL_TO_SCOUTER_KEY) suggestion[skillId] = confirmedRecord.linkSkills[skillId];
      }
    } else if (confirmedWorldId !== undefined) {
      const rawSuggestion = bestKnownLinkSkillFloors(characterRoster, confirmedWorldId);
      for (const skillId of Object.keys(floors) as LinkSkillId[]) {
        if (rawSuggestion[skillId] !== undefined) suggestion[skillId] = rawSuggestion[skillId];
      }
    }
    const reconciled: LinkSkillsData = { ...suggestion };
    for (const [skillId, floor] of Object.entries(floors)) {
      const id = skillId as LinkSkillId;
      reconciled[id] = Math.max(reconciled[id] ?? 0, floor);
    }
    if (Object.keys(reconciled).length > 0) {
      // react-doctor-disable-next-line no-pass-data-to-parent
      onChange(linkSkillsStoredToDraftString(reconciled));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleUpdate(id: LinkSkillId, val: string) {
    onChange(JSON.stringify({ ...draft, [id]: val }));
  }

  // This step only ever asks about the hand-picked link skills MapleScouter's own payload
  // accepts (see scouterLinkSkills.ts) -- LINK_SKILLS grew far beyond that for the
  // Legion panel's own read-only display (see linkSkillsData.ts), but none of those newer
  // entries have anywhere to go once saved, so showing them here would just be noise.
  const scouterRelevantSkills = LINK_SKILLS.filter((s) => s.id in LINK_SKILL_TO_SCOUTER_KEY);
  const singleSkills = scouterRelevantSkills.filter((s) => s.maxLevel === 3);
  const multiSkills  = scouterRelevantSkills.filter((s) => s.maxLevel > 3);

  return (
    <div className="link-skills-root">
      <style>{`
        .link-skills-root { container-type: inline-size; }
        .link-skills-grid { grid-template-columns: 1fr 1fr; }
        .link-skills-root .link-skill-max-btn:focus-visible,
        .link-skills-root .link-skill-max-btn:active {
          outline-color: ${theme.accent} !important;
        }
        @media (hover: hover) and (pointer: fine) {
          .link-skills-root .link-skill-max-btn:hover {
            outline-color: ${theme.accent} !important;
          }
        }
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
          Only enter levels for the link skills equipped on this character&apos;s bossing setup, not every link skill on your account.
        </p>
        <p style={{ margin: 0, marginTop: "0.35rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>
          Click a link skill&apos;s icon to set it straight to its max level.
        </p>
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
            min={floors[skill.id]}
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
            min={floors[skill.id]}
          />
        ))}
      </div>
    </div>
  );
}

export default function LinkSkillsSetupStep({
  theme, step, stepNumber, totalSteps, onBack, onNext, onFinish, ...editorProps
}: LinkSkillsSetupStepProps) {
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
      <LinkSkillsEditor theme={theme} {...editorProps} />
    </SetupStepFrame>
  );
}
