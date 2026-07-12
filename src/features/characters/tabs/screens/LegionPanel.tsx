import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { WORLD_NAMES } from "../../model/constants";
import { readCharactersStore, type StoredCharacterRecord } from "../../model/charactersStore";
import { LEGION_CRYSTALS, MAX_ARTIFACT_LEVEL } from "../../setup/data/legionArtifactData";
import { LINK_SKILLS, CLASS_TO_SKILL, reconcileLinkSkills } from "../../setup/data/linkSkillsData";
import type { AppTheme } from "../../../../components/themes";
import { SkillIcon } from "../../../../components/ResourceImage";
import CharacterAvatar, { FALLBACK_SRC } from "../components/CharacterAvatar";

type LegionSection = "artifact" | "linkSkills";

interface LegionPanelProps {
  theme: AppTheme;
  worldId: number;
  worldCharacters: StoredCharacterRecord[];
  onBack: () => void;
}

function backButtonStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, flexShrink: 0,
    color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: 8, cursor: "pointer",
  };
}

function BackIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function segmentButtonStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    flex: 1, border: `1px solid ${active ? theme.border : "transparent"}`,
    background: active ? theme.panel : "transparent",
    color: active ? theme.accentText : theme.muted,
    fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 800,
    padding: "0.45rem 0.6rem", borderRadius: 9, cursor: "pointer",
  };
}

function LegionArtifactSection({ theme, worldId }: { theme: AppTheme; worldId: number }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const legion = mounted ? readCharactersStore().legionArtifactByWorld[String(worldId)] : undefined;
  const legionLevel = legion?.artifactLevel;
  const unlockedCrystals = legionLevel !== undefined
    ? LEGION_CRYSTALS.filter((c) => legionLevel >= c.requiredArtifactLevel).length
    : 0;

  if (!legionLevel) {
    return <p style={{ margin: 0, fontSize: 13, color: theme.muted, fontWeight: 700 }}>Not set up yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: 12, color: theme.muted }}>Artifact Level</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{legionLevel} / {MAX_ARTIFACT_LEVEL}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: 12, color: theme.muted }}>Crystals Unlocked</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{unlockedCrystals} / {LEGION_CRYSTALS.length}</span>
      </div>
    </div>
  );
}

// Centered above the trigger and shrink-wrapped to its own text (not the setup wizard's
// InfoTooltip popup, which is left-anchored and fixed-width for its own "?" button
// context), nudging sideways via shiftX only when centering would clip past the
// viewport edge, same idea as InfoTooltip's own edge-avoidance but centered by default.
function HoverTooltip({ theme, label, sublabel, children }: { theme: AppTheme; label: string; sublabel?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  // Touch devices have no hover at all, so mouseenter/mouseleave never fire there,
  // so fall back to tap-to-toggle instead. Checked once at mount, same pattern as
  // StepJumpMenu's hover-flyout: hover support doesn't change mid-session for any real
  // device this app needs to support.
  const [supportsHover] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const popup = popupRef.current;
    if (!container || !popup) return;
    const margin = 8;
    const centerX = container.getBoundingClientRect().left + container.offsetWidth / 2;
    const halfPopup = popup.offsetWidth / 2;
    if (centerX - halfPopup < margin) {
      setShiftX(margin - (centerX - halfPopup));
    } else if (centerX + halfPopup > window.innerWidth - margin) {
      setShiftX(window.innerWidth - margin - (centerX + halfPopup));
    } else {
      setShiftX(0);
    }
  }, [open]);

  useEffect(() => {
    if (supportsHover || !open) return;
    function handleOutsideTap(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideTap);
    return () => document.removeEventListener("mousedown", handleOutsideTap);
  }, [supportsHover, open]);

  const triggerProps = supportsHover
    ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) }
    : { onClick: () => setOpen((o) => !o) };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={sublabel ? `${label}, ${sublabel}` : label}
      style={{ position: "relative", display: "inline-flex", cursor: supportsHover ? "default" : "pointer" }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); }
      }}
      {...triggerProps}
    >
      {children}
      {open && (
        <div
          ref={popupRef}
          style={{
            position: "absolute", bottom: "calc(100% + 0.4rem)", left: "50%",
            transform: `translateX(calc(-50% + ${shiftX}px))`,
            zIndex: 200, background: theme.bg, border: `1px solid ${theme.border}`,
            borderRadius: 10, padding: "0.4rem 0.6rem",
            width: "max-content", maxWidth: "calc(100vw - 16px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)", textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, color: theme.text, whiteSpace: "nowrap" }}>{label}</p>
          {sublabel && (
            <p style={{ margin: 0, marginTop: "0.1rem", fontSize: "0.72rem", color: theme.muted, whiteSpace: "nowrap" }}>{sublabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SpriteRow({ theme, characters, size }: { theme: AppTheme; characters: StoredCharacterRecord[]; size: number }) {
  if (characters.length === 0) {
    return (
      <HoverTooltip theme={theme} label="No tracked character">
        <div style={{ width: size, height: size, opacity: 0.6 }}>
          <CharacterAvatar
            src={FALLBACK_SRC}
            alt="No tracked character"
            width={size}
            height={size}
            style={{ objectFit: "contain", objectPosition: "center bottom" }}
          />
        </div>
      </HoverTooltip>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 6 }}>
      {characters.map((c) => (
        <HoverTooltip key={c.characterName} theme={theme} label={c.characterName} sublabel={`Lv. ${c.level}`}>
          <div style={{ width: size, height: size, flexShrink: 0 }}>
            <CharacterAvatar
              src={c.characterImgURL}
              alt={c.characterName}
              width={size}
              height={size}
              style={{ objectFit: "contain", objectPosition: "center bottom" }}
            />
          </div>
        </HoverTooltip>
      ))}
    </div>
  );
}

// Only skills a tracked character actually contributes to (or that already have a
// committed level) earn the full sprite-showcase card, since with 40+ link skills
// eventually on the roadmap (Cygnus, Resistance, ...) most will be permanently
// irrelevant to any one account, so giving every skill a full card regardless would
// turn this into an endless scroll of empty placeholders. Everything else collapses
// into one compact chip.
// A named grid (icon | label | sprites), not a flex row with wrap: flex-wrap's "does
// this all fit on one line" test kept tripping on tiny, inconsistent text-width
// differences (two similarly-long names could land on opposite sides of the threshold),
// dropping the sprite to its own line unpredictably even with plenty of room. Grid
// columns don't have that ambiguity: the sprite column always renders in place, and
// only its own content (SpriteRow's internal wrap) adapts if the column is tight.
// `dormant` renders as a muted placeholder (no sprite row), used only as filler to
// complete a partial row of otherwise-active cards, never for the full backlog of
// untracked skills (see LinkSkillsSection: that stays a compact chip list, so a future
// 40+-skill roster still can't turn this into an endless wall of empty cards).
function LinkSkillCard({ theme, skill, eligible, level, spriteSize, dormant = false }: {
  theme: AppTheme;
  skill: (typeof LINK_SKILLS)[number];
  eligible: StoredCharacterRecord[];
  level: number | undefined;
  spriteSize: number;
  dormant?: boolean;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: dormant ? "44px minmax(0, 1fr)" : `44px minmax(60px, 1fr) minmax(${spriteSize}px, auto)`,
      alignItems: "center", gap: 16,
      padding: "0.85rem 1rem", borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.bg,
      opacity: dormant ? 0.6 : 1,
    }}>
      <SkillIcon id={skill.iconId} size={44} alt={skill.name} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: theme.text, lineHeight: 1.25 }}>
          {skill.name}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
          {level ?? 0} / {skill.maxLevel}
        </span>
      </div>
      {!dormant && (
        <div style={{ justifySelf: "end" }}>
          <SpriteRow theme={theme} characters={eligible} size={spriteSize} />
        </div>
      )}
    </div>
  );
}

function DormantSkillChip({ theme, skill }: { theme: AppTheme; skill: (typeof LINK_SKILLS)[number] }) {
  return (
    <div
      title={`${skill.name}: no progress`}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0.35rem 0.65rem 0.35rem 0.35rem", borderRadius: 999,
        border: `1px solid ${theme.border}`, background: theme.bg, opacity: 0.6,
      }}
    >
      <SkillIcon id={skill.iconId} size={18} alt={skill.name} />
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>{skill.name}</span>
    </div>
  );
}

function LinkSkillsSection({ theme, worldId, worldCharacters }: { theme: AppTheme; worldId: number; worldCharacters: StoredCharacterRecord[] }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const stored = mounted ? readCharactersStore().linkSkillsByWorld[String(worldId)] : undefined;
  const levels = mounted ? reconcileLinkSkills(stored, worldCharacters, worldId) : undefined;

  const withEligibility = LINK_SKILLS.map((skill) => ({
    skill,
    eligible: worldCharacters.filter((c) => CLASS_TO_SKILL[c.jobName] === skill.id),
    level: levels?.[skill.id],
  }));
  const active = withEligibility.filter(({ eligible, level }) => eligible.length > 0 || level !== undefined);
  const dormant = withEligibility.filter(({ eligible, level }) => eligible.length === 0 && level === undefined);
  // Skills shared across several classes (Thief's Cunning, Empirical Knowledge: 3
  // member classes each) need room for more sprites per card than a single-class skill
  // ever will, so they get their own wider, separately-uniform grid, shown last.
  const activeMulti = active.filter(({ skill }) => skill.classes.length > 1);
  const activeSingle = active.filter(({ skill }) => skill.classes.length === 1);
  const dormantMulti = dormant.filter(({ skill }) => skill.classes.length > 1);
  const dormantSingle = dormant.filter(({ skill }) => skill.classes.length === 1);

  // Pull just enough dormant skills into each grid to complete its last row (never the
  // full dormant backlog, see LinkSkillCard's dormant-prop comment for why), leaving
  // the rest as compact chips below.
  const SINGLE_COLS = 4;
  const MULTI_COLS = 2;
  const singleFillCount = (SINGLE_COLS - (activeSingle.length % SINGLE_COLS)) % SINGLE_COLS;
  const multiFillCount = (MULTI_COLS - (activeMulti.length % MULTI_COLS)) % MULTI_COLS;
  const singleFiller = dormantSingle.slice(0, singleFillCount);
  const multiFiller = dormantMulti.slice(0, multiFillCount);
  const chips = [...dormantSingle.slice(singleFillCount), ...dormantMulti.slice(multiFillCount)];

  return (
    <div className="legion-link-skills-root" style={{ display: "grid", gap: 14 }}>
      <style>{`
        .legion-link-skills-root { container-type: inline-size; }
        .legion-single-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .legion-multi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @container (max-width: 900px) {
          .legion-single-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @container (max-width: 600px) {
          .legion-multi-grid { grid-template-columns: minmax(0, 1fr); }
        }
        @container (max-width: 480px) {
          .legion-single-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
      {activeSingle.length > 0 && (
        <div className="legion-single-grid" style={{ display: "grid", gap: 10 }}>
          {activeSingle.map(({ skill, eligible, level }) => (
            <LinkSkillCard key={skill.id} theme={theme} skill={skill} eligible={eligible} level={level} spriteSize={56} />
          ))}
          {singleFiller.map(({ skill, eligible, level }) => (
            <LinkSkillCard key={skill.id} theme={theme} skill={skill} eligible={eligible} level={level} spriteSize={56} dormant />
          ))}
        </div>
      )}
      {activeMulti.length > 0 && (
        <div className="legion-multi-grid" style={{ display: "grid", gap: 10 }}>
          {activeMulti.map(({ skill, eligible, level }) => (
            <LinkSkillCard key={skill.id} theme={theme} skill={skill} eligible={eligible} level={level} spriteSize={56} />
          ))}
          {multiFiller.map(({ skill, eligible, level }) => (
            <LinkSkillCard key={skill.id} theme={theme} skill={skill} eligible={eligible} level={level} spriteSize={56} dormant />
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.muted }}>
            No progress ({chips.length})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {chips.map(({ skill }) => (
              <DormantSkillChip key={skill.id} theme={theme} skill={skill} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LegionPanel({ theme, worldId, worldCharacters, onBack }: LegionPanelProps) {
  const [section, setSection] = useState<LegionSection>("artifact");
  const worldName = WORLD_NAMES[worldId] ?? `World ${worldId}`;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <button type="button" onClick={onBack} aria-label="Back to directory" style={backButtonStyle(theme)}>
          <BackIcon />
        </button>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: theme.muted }}>
            Legion &middot; {worldName}
          </span>
          <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.1rem", lineHeight: 1.2, color: theme.text }}>
            {section === "artifact" ? "Legion Artifact" : "Link Skills"}
          </h2>
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, padding: 3, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: "0.75rem" }} role="tablist" aria-label="Legion sections">
        <button type="button" role="tab" aria-selected={section === "artifact"} onClick={() => setSection("artifact")} style={segmentButtonStyle(theme, section === "artifact")}>
          Legion Artifact
        </button>
        <button type="button" role="tab" aria-selected={section === "linkSkills"} onClick={() => setSection("linkSkills")} style={segmentButtonStyle(theme, section === "linkSkills")}>
          Link Skills
        </button>
      </div>

      {section === "artifact"
        ? <LegionArtifactSection theme={theme} worldId={worldId} />
        : <LinkSkillsSection theme={theme} worldId={worldId} worldCharacters={worldCharacters} />}
    </div>
  );
}
