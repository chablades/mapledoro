import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { WORLD_NAMES } from "../../model/constants";
import { readCharactersStore, type StoredCharacterRecord } from "../../model/charactersStore";
import {
  LEGION_CRYSTALS, MAX_ARTIFACT_LEVEL, MIN_CRYSTAL_LEVEL, MAX_CRYSTAL_LEVEL, MAX_STAT_TOTAL_LEVEL,
  LEGION_ARTIFACT_STATS, getLegionArtifactStat, isCrystalUnlocked, effectiveCrystal,
  computeRawStatLevels, effectiveStatLevel, statBonusValue,
  type LegionCrystalDraft, type LegionCrystalDef,
} from "../../setup/data/legionArtifactData";
import { LINK_SKILLS, CLASS_TO_SKILL, reconcileLinkSkills } from "../../setup/data/linkSkillsData";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import { SkillIcon } from "../../../../components/ResourceImage";
import { legionCrystalIconUrl } from "../../../../lib/mapleResource";
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

function ArtifactStatRow({ theme, label, level, wasted, wastedCrystals, value }: {
  theme: AppTheme; label: string; level?: number; wasted?: number;
  wastedCrystals?: string[]; value: string;
}) {
  const levelBadge = (
    <span style={{ fontSize: 12, fontWeight: 700, color: wasted ? statusText(theme, "danger") : theme.muted }}>
      Lv. {level}{wasted ? ` · +${wasted} wasted` : ""}
    </span>
  );
  const wastedSublabel = wastedCrystals?.length ? (
    <>
      {wastedCrystals.map((name, i) => (
        <span key={name}>
          {i > 0 && ", "}
          <strong style={{ color: theme.text, fontWeight: 800 }}>{name}</strong>
        </span>
      ))}
      {" "}have this stat assigned. Reassign these to stop wasting levels.
    </>
  ) : undefined;
  const wastedPlural = wasted === 1 ? "" : "s";
  const wastedAriaLabel = wastedCrystals?.length
    ? `${wasted} level${wastedPlural} wasted. ${wastedCrystals.join(", ")} have this stat assigned. Reassign these to stop wasting levels.`
    : undefined;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {level !== undefined && wasted && wastedCrystals?.length ? (
          <HoverTooltip
            theme={theme}
            label={`${wasted} level${wastedPlural} wasted`}
            sublabel={wastedSublabel}
            ariaLabel={wastedAriaLabel}
            wrapSublabel
          >
            {levelBadge}
          </HoverTooltip>
        ) : (level !== undefined && levelBadge)}
        <span style={{ fontSize: 12, color: theme.muted }}>{label}</span>
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{value}</span>
    </div>
  );
}

// Same 5-diamond pip read as the setup step's LevelPipsStatic, just re-declared here
// since it's a tiny static render and the setup step doesn't export it.
function CrystalPips({ level, theme }: { level: number; theme: AppTheme }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {Array.from({ length: MAX_CRYSTAL_LEVEL }, (_, i) => (
        // react-doctor-disable-next-line no-array-index-as-key
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 1.5,
            background: i < level ? theme.accent : "transparent",
            border: `1.5px solid ${i < level ? theme.accent : theme.border}`,
            transform: "rotate(45deg)", boxSizing: "border-box", flexShrink: 0, display: "block",
          }}
        />
      ))}
    </div>
  );
}

const crystalTileIconStyle: CSSProperties = { width: "68%", height: "68%", borderRadius: 8, objectFit: "contain" };

function crystalTileStyle(theme: AppTheme, unlocked: boolean): CSSProperties {
  return {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", aspectRatio: "1", minWidth: 0,
    borderRadius: 12, border: `2px solid ${theme.border}`,
    background: unlocked ? theme.bg : `${theme.muted}0d`,
    opacity: unlocked ? 1 : 0.55, boxSizing: "border-box",
  };
}

// Read-only mirror of the setup step's crystal tile: same icon + level-pip look, but a
// hover tooltip stands in for the setup step's click-to-open stat picker, since there's
// nothing to edit here.
function CrystalTile({ theme, index, def, crystal, unlocked }: {
  theme: AppTheme;
  index: number;
  def: LegionCrystalDef;
  crystal: LegionCrystalDraft;
  unlocked: boolean;
}) {
  const level = crystal.level ?? MIN_CRYSTAL_LEVEL;
  const iconSrc = legionCrystalIconUrl(index, Math.max(0, level - 1), unlocked ? "icon" : "disabled");

  if (!unlocked) {
    return (
      <div className="legion-crystal-tile" style={crystalTileStyle(theme, false)} title={`${def.name}, Lv ${def.requiredArtifactLevel}+ required`}>
        <Image src={iconSrc} alt="" width={80} height={80} unoptimized style={crystalTileIconStyle} />
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Lv {def.requiredArtifactLevel}+
        </span>
      </div>
    );
  }

  const statNames = (crystal.stats ?? [])
    .map((id) => (id ? getLegionArtifactStat(id)?.label : null))
    .filter((name): name is string => Boolean(name));

  return (
    <HoverTooltip theme={theme} label={def.name} sublabel={statNames.join(" · ")} wrapperStyle={{ width: "100%" }}>
      <div className="legion-crystal-tile" style={crystalTileStyle(theme, true)}>
        <CrystalPips level={level} theme={theme} />
        <Image src={iconSrc} alt={def.name} width={80} height={80} unoptimized style={crystalTileIconStyle} />
      </div>
    </HoverTooltip>
  );
}

function LegionArtifactSection({ theme, worldId }: { theme: AppTheme; worldId: number }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const legion = mounted ? readCharactersStore().legionArtifactByWorld[String(worldId)] : undefined;
  const artifactLevel = legion?.artifactLevel;

  if (!artifactLevel) {
    return <p style={{ margin: 0, fontSize: 13, color: theme.muted, fontWeight: 700 }}>Not set up yet.</p>;
  }

  // Resolved once so the crystal grid and the total-bonuses list always agree, even when
  // storage happens to hold a stale locked placeholder for a crystal instead of real data
  // (see effectiveCrystal's own comment).
  const resolvedCrystals = LEGION_CRYSTALS.map((_, i) =>
    effectiveCrystal(legion?.crystals?.[i] as LegionCrystalDraft | undefined, isCrystalUnlocked(i, artifactLevel)));

  // Which unlocked crystals assign a given stat, so a "wasted" warning can point at exactly
  // which crystals to reassign instead of just naming a number.
  const crystalsByStat = new Map<string, string[]>();
  resolvedCrystals.forEach((crystal, i) => {
    if (!isCrystalUnlocked(i, artifactLevel)) return;
    (crystal.stats ?? []).forEach((statId) => {
      if (!statId) return;
      const list = crystalsByStat.get(statId) ?? [];
      list.push(LEGION_CRYSTALS[i].name);
      crystalsByStat.set(statId, list);
    });
  });

  const rawTotals = computeRawStatLevels(resolvedCrystals, artifactLevel);
  // react-doctor-disable-next-line js-combine-iterations -- LEGION_ARTIFACT_STATS is a small fixed 16-item array, extra pass is negligible per the rule's own FP criteria
  const bonusRows = LEGION_ARTIFACT_STATS
    .map((stat) => {
      const raw = rawTotals[stat.id] ?? 0;
      return { stat, raw, effective: effectiveStatLevel(raw) };
    })
    .filter((row) => row.effective > 0)
    .map(({ stat, raw, effective }) => {
      const unitSuffix = stat.unit === "percent" ? "%" : "";
      const flag = stat.flagAtLevelOne ? `, ${stat.flagAtLevelOne}` : "";
      // In-game itself is inconsistent about naming here: the crystal stat picker calls
      // these lines "Meso Drop"/"Bonus EXP" (LEGION_ARTIFACT_STATS' shared labels, kept
      // as-is there), but the Artifact tab's own bonus summary calls them "Mesos Obtained"/
      // "EXP Obtained". That rename is scoped only to this display, not the shared label,
      // so the picker stays true to what it actually says in-game.
      const labelOverrides: Partial<Record<typeof stat.id, string>> = { mesos: "Mesos Obtained", multiTargetExp: "EXP Obtained" };
      const label = labelOverrides[stat.id] ?? stat.label;
      // A stat whose per-level steps are all whole numbers can never produce a fractional
      // total (verified against LEGION_ARTIFACT_STATS' own levelSteps, not hardcoded per
      // stat), so it's shown as a plain integer instead of a padded "12.00".
      const isWholeStat = stat.levelSteps.every(Number.isInteger);
      const rawValue = statBonusValue(stat.id, effective);
      const formattedValue = isWholeStat ? String(rawValue) : rawValue.toFixed(2);
      // Assigning the same stat to more crystals than it takes to hit the level 10 cap is a
      // real, easy-to-make mistake (e.g. 3 crystals at Lv 5 on one stat is only worth 10, not
      // 15). Flagging the excess here is the whole point of this feature, so the player
      // notices and can reassign a crystal onto something that isn't already capped.
      const wasted = Math.max(0, raw - MAX_STAT_TOTAL_LEVEL);
      const wastedCrystals = wasted > 0 ? crystalsByStat.get(stat.id) : undefined;
      return { id: stat.id, label, effective, wasted, wastedCrystals, display: `+${formattedValue}${unitSuffix}${flag}` };
    });

  return (
    <div className="legion-artifact-root" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`
        .legion-artifact-root { container-type: inline-size; }
        /* minmax(0, 116px) lets each column shrink past its 116px preferred size instead
           of a fixed px track, which refuses to compress below its own content and forces
           the whole grid to overflow on narrow phones no matter what breakpoint number a
           fallback size uses. Tile sizing itself is 100%/aspect-ratio (crystalTileStyle),
           so this scales fluidly with zero breakpoints needed. */
        .legion-artifact-crystal-grid { grid-template-columns: repeat(3, minmax(0, 116px)); min-width: 0; }
        .legion-artifact-layout { display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: stretch; }
        .legion-artifact-crystal-col { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
        @container (max-width: 620px) {
          .legion-artifact-layout { grid-template-columns: 1fr; }
        }
      `}</style>
      <div className="legion-artifact-layout">
        {/* Artifact Level travels with the crystal grid as one block, not a separate
            full-width header, so the two stay visually attached when this column gets
            vertically centered against a much longer Artifact Bonuses list. */}
        <div className="legion-artifact-crystal-col">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, width: "100%" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 4 }}>
                Artifact Level
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.8rem", fontWeight: 700, color: theme.text, lineHeight: 1 }}>
                {artifactLevel}
                <span style={{ fontSize: "1rem", fontWeight: 700, color: theme.muted }}> / {MAX_ARTIFACT_LEVEL}</span>
              </div>
            </div>
            <div className="legion-artifact-crystal-grid" style={{ display: "grid", gap: "0.6rem", maxWidth: 366 }}>
              {LEGION_CRYSTALS.map((def, index) => (
                <CrystalTile
                  key={def.id}
                  theme={theme}
                  index={index}
                  def={def}
                  crystal={resolvedCrystals[index]}
                  unlocked={isCrystalUnlocked(index, artifactLevel)}
                />
              ))}
            </div>
          </div>
        </div>
        {bonusRows.length > 0 && (
          <div>
            <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.muted }}>
              Artifact Bonuses
            </p>
            <div>
              {bonusRows.map((row) => (
                <ArtifactStatRow
                  key={row.id}
                  theme={theme}
                  label={row.label}
                  level={row.effective}
                  wasted={row.wasted}
                  wastedCrystals={row.wastedCrystals}
                  value={row.display}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Centered above the trigger and shrink-wrapped to its own text (not the setup wizard's
// InfoTooltip popup, which is left-anchored and fixed-width for its own "?" button
// context), nudging sideways via shiftX only when centering would clip past the
// viewport edge, same idea as InfoTooltip's own edge-avoidance but centered by default.
function hoverTooltipPopupStyle(theme: AppTheme, shiftX: number, wrapSublabel?: boolean): CSSProperties {
  return {
    position: "absolute", bottom: "calc(100% + 0.4rem)", left: "50%",
    transform: `translateX(calc(-50% + ${shiftX}px))`,
    zIndex: 200, background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: 10, padding: "0.4rem 0.6rem",
    width: wrapSublabel ? 220 : "max-content", maxWidth: "calc(100vw - 16px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)", textAlign: "center",
  };
}

function HoverTooltip({ theme, label, sublabel, ariaLabel, wrapSublabel, wrapperStyle, children }: {
  theme: AppTheme; label: string; sublabel?: ReactNode; ariaLabel?: string; wrapSublabel?: boolean;
  wrapperStyle?: CSSProperties; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  // Touch devices have no hover at all, so mouseenter/mouseleave never fire there,
  // so fall back to tap-to-toggle instead. Hover support doesn't change mid-session for
  // any real device this app needs to support. Read via useSyncExternalStore (not a lazy
  // useState initializer) since this value feeds an unconditional inline style below —
  // a plain useState would seed the server's `false` and never reconcile it against the
  // client's real value, causing a hydration mismatch on hover-capable devices.
  const supportsHover = useSyncExternalStore(
    () => () => undefined,
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches,
    () => false,
  );
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
      aria-label={ariaLabel ?? (typeof sublabel === "string" ? `${label}, ${sublabel}` : label)}
      style={{ position: "relative", display: "inline-flex", cursor: supportsHover ? "default" : "pointer", minWidth: 0, ...wrapperStyle }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); }
      }}
      {...triggerProps}
    >
      {children}
      {open && (
        <div
          ref={popupRef}
          style={hoverTooltipPopupStyle(theme, shiftX, wrapSublabel)}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, color: theme.text, whiteSpace: "nowrap" }}>{label}</p>
          {sublabel && (
            <p style={{ margin: 0, marginTop: "0.1rem", fontSize: "0.75rem", color: theme.muted, whiteSpace: wrapSublabel ? "normal" : "nowrap" }}>{sublabel}</p>
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
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase", color: theme.muted }}>
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
  // Link Skills is the landing tab: in-game, the Legion Artifact only unlocks after
  // accumulating Link Skill levels, so Link Skills is the thing every account has.
  const [section, setSection] = useState<LegionSection>("linkSkills");
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
        <button type="button" role="tab" aria-selected={section === "linkSkills"} onClick={() => setSection("linkSkills")} style={segmentButtonStyle(theme, section === "linkSkills")}>
          Link Skills
        </button>
        <button type="button" role="tab" aria-selected={section === "artifact"} onClick={() => setSection("artifact")} style={segmentButtonStyle(theme, section === "artifact")}>
          Legion Artifact
        </button>
      </div>

      {/* Same page-swap read as the profile binder's 0.2s fade-up: the key remount
          re-runs the entrance whenever the tab changes. Visible state is the default,
          the keyframes only animate toward it. */}
      <style>{`
        @keyframes legion-section-reveal {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .legion-section-content { animation: legion-section-reveal 0.2s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .legion-section-content { animation: none !important; }
        }
      `}</style>
      <div key={section} className="legion-section-content">
        {section === "artifact"
          ? <LegionArtifactSection theme={theme} worldId={worldId} />
          : <LinkSkillsSection theme={theme} worldId={worldId} worldCharacters={worldCharacters} />}
      </div>
    </div>
  );
}
