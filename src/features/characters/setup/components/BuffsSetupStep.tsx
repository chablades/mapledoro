"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { numericKeyDown } from "../../../../lib/inputUtils";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { SetupStepDefinition } from "../steps";
import type { SetupFlowId } from "../flows";
import { CLASS_SKILL_DATA } from "../data/classSkillData";
import { readCharactersStore, selectCharacterByIgn } from "../../model/charactersStore";
import {
  GUILD_BUFFS, GUILD_BUFF_MAX,
  BOOL_BUFFS, BUFF_GROUP_A, BUFF_GROUP_B,
  RENOWN_STATS, RENOWN_MAX, RENOWN_SKILL_ID,
  parseBuffsDraft, serializeBuffsDraft, storedBuffsToDraft,
  sanitizeGuildLevel, sanitizeRenownLevel, toggleBoolBuff,
  primaryStatForClass, mainStatsForClass, getStatPotionTiers, statAbbrev,
  heroEchoName, isHurricaneClass,
  type GuildBuffId, type BoolBuffId, type RenownStatId, type BoolBuffEntry,
  type BoolBuffIconType,
} from "../data/buffsData";
import SetupStepFrame from "./SetupStepFrame";
import { LeveledIconTile } from "./LeveledIconTile";
import {
  boolTileStyle, renownInputStyle, pickOneGroupStyle, pickOneLabelStyle,
  buffIconOverride, buffSecondIconOverride, boolBuffLabel,
} from "./buffTileHelpers";

interface BuffsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  flowId?: SetupFlowId;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  confirmedCharacterName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// ── Shared styles ────────────────────────────────────────────────────────────

const sectionLabel = (theme: AppTheme): CSSProperties => ({
  margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 800,
  textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted,
});

// A missing/failed icon falls back to the buff's name-initial (mirrors VMatrixNodeIcon's
// treatment) instead of a stray broken-image glyph. Handles both "item" and "skill" icon
// kinds since bool buffs draw from either.
export function BuffIconImage({ icon, name, theme, size = 32 }: {
  icon: { kind: "item"; id: string; shadow?: boolean } | { kind: "skill"; id: string };
  name: string;
  theme: AppTheme;
  size?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  let src: string;
  if (icon.kind === "item") {
    const base = icon.shadow ? "icon" : "iconRaw";
    src = resourceImageUrl("item", icon.id, `${base}.png`);
  } else {
    src = resourceImageUrl("skill", icon.id, "icon.png");
  }
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image src={src} alt={name} width={size} height={size} unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "flex";
          }}
          style={{ objectFit: "contain", display: "block" }}
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

// ── BoolBuffTile ─────────────────────────────────────────────────────────────

function renderIcon(icon: BoolBuffEntry["icon"], size: number, active: boolean, name: string, theme: AppTheme) {
  return (
    <div style={{ opacity: active ? 1 : 0.32, filter: active ? "none" : "grayscale(1)", lineHeight: 0, flexShrink: 0 }}>
      <BuffIconImage icon={icon} name={name} theme={theme} size={size} />
    </div>
  );
}

// Icon composite for a buff backed by 2-3 real items sharing one effect (e.g. Sparkling
// Red Star's potion/pill, fishBuff's 3 renamed event potions). Two layouts:
//  - 2 icons: back icon fades in behind, primary (frontmost, bottom-left) stays opaque.
//  - 3 icons: primary stays full-size/opaque and front-and-center; secondIcon/thirdIcon
//    shrink to a smaller corner badge each (top-left/top-right) instead of competing at
//    full size. fishBuff's 3 items (a round snowman, a tall off-center potion, a small
//    ornament) all have their visual weight centered rather than tucked into a corner,
//    so any full-size diagonal overlap just collides two dense shapes -- shrinking the
//    back two avoids that regardless of their individual silhouettes.
function StackedBuffIcon({ icon, secondIcon, thirdIcon, active, name, theme }: {
  icon: BoolBuffIconType;
  secondIcon: BoolBuffIconType;
  thirdIcon: BoolBuffIconType | undefined;
  active: boolean;
  name: string;
  theme: AppTheme;
}) {
  if (thirdIcon) {
    return (
      <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0, filter: active ? "none" : "grayscale(1)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, lineHeight: 0, opacity: active ? 0.55 : 0.18 }}>
          <BuffIconImage icon={thirdIcon} name={name} theme={theme} size={18} />
        </div>
        <div style={{ position: "absolute", top: 0, right: 0, lineHeight: 0, opacity: active ? 0.55 : 0.18 }}>
          <BuffIconImage icon={secondIcon} name={name} theme={theme} size={18} />
        </div>
        <div style={{ position: "absolute", bottom: 4, left: 4, lineHeight: 0, opacity: active ? 1 : 0.32 }}>
          <BuffIconImage icon={icon} name={name} theme={theme} size={32} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: 42, height: 40, flexShrink: 0, filter: active ? "none" : "grayscale(1)" }}>
      <div style={{ position: "absolute", top: 0, left: 10, lineHeight: 0, opacity: active ? 0.5 : 0.16 }}>
        <BuffIconImage icon={secondIcon} name={name} theme={theme} size={32} />
      </div>
      <div style={{ position: "absolute", top: 8, left: 0, lineHeight: 0, opacity: active ? 1 : 0.32 }}>
        <BuffIconImage icon={icon} name={name} theme={theme} size={32} />
      </div>
    </div>
  );
}

export function BoolBuffTile({ entry, active, onToggle, theme, iconOverride, secondIconOverride, label, ariaLabel }: {
  entry: BoolBuffEntry;
  active: boolean;
  onToggle: () => void;
  theme: AppTheme;
  iconOverride?: { id: string; kind: "item"; shadow?: boolean } | { id: string; kind: "skill" };
  secondIconOverride?: BoolBuffIconType;
  label?: ReactNode;
  ariaLabel?: string;
}) {
  const icon = iconOverride ?? entry.icon;
  const secondIcon = secondIconOverride ?? entry.secondIcon;
  const resolvedAriaLabel = ariaLabel ?? entry.name;
  return (
    <HoverTooltip label={label ?? entry.name} theme={theme}>
      <button type="button" onClick={onToggle} aria-label={resolvedAriaLabel} aria-pressed={active} style={boolTileStyle(active, theme)}>
        {secondIcon
          ? <StackedBuffIcon icon={icon} secondIcon={secondIcon} thirdIcon={entry.thirdIcon} active={active} name={entry.name} theme={theme} />
          : renderIcon(icon, 32, active, entry.name, theme)}
      </button>
    </HoverTooltip>
  );
}

// ── RenownCol ────────────────────────────────────────────────────────────────

export function RenownCol({ shortLabel, fullLabel, value, onChange, theme }: {
  shortLabel: string;
  fullLabel: string;
  value: string;
  onChange: (val: string) => void;
  theme: AppTheme;
}) {
  const active = (Number.parseInt(value || "0", 10) || 0) > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted, textAlign: "center", whiteSpace: "nowrap" }}>
        {shortLabel}
      </span>
      <input
        type="number"
        className="no-spinner"
        min={0}
        max={RENOWN_MAX}
        aria-label={`Champion's Renown — ${fullLabel}`}
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={numericKeyDown}
        style={renownInputStyle(theme, active)}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function BuffsSetupStep({
  theme, step, flowId, stepNumber, totalSteps, jobName = "", confirmedCharacterName, value, onChange, onBack, onNext, onFinish,
}: BuffsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const requiredStats = classData?.requiredStats ?? [];
  const primaryStat = primaryStatForClass(requiredStats);
  const classMainStats = mainStatsForClass(requiredStats);
  const statTiers = getStatPotionTiers(primaryStat);

  // full_setup derives this from the Equipment Symbols substep instead (see
  // deriveMaxedSacredSymbol in useCharacterSetupController.ts) — asking it here too
  // would be a duplicate, out-of-order entry point for the same fact.
  const showMaxedSacredSymbol = flowId === "maplescouter_setup";

  const draft = parseBuffsDraft(value);
  const initialValueRef = useRef(value);

  function update(patch: Partial<typeof draft>) {
    onChange(serializeBuffsDraft({ ...draft, ...patch }));
  }

  // One-shot mount-time backfill from the character's saved buffs (only when this step
  // lands blank) — matches Equipment/V Matrix/HEXA Matrix/Familiars' own pattern.
  // Without this, editing an already-set-up character's buffs started blank, and
  // finishing without re-checking every previously-set flag wholesale-replaced the
  // stored buffs with whatever partial state was checked this time (the scouter merge
  // replaces the whole `buffs` object, it doesn't merge per-flag).
  useEffect(() => {
    if (initialValueRef.current || !confirmedCharacterName) return;
    const saved = selectCharacterByIgn(readCharactersStore(), confirmedCharacterName)?.scouter?.buffs;
    if (!saved) return;
    // react-doctor-disable-next-line no-pass-data-to-parent
    onChange(serializeBuffsDraft(storedBuffsToDraft(saved)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setGuildLevel(id: GuildBuffId, val: string) {
    update({ guild: { ...draft.guild, [id]: sanitizeGuildLevel(val) } });
  }

  function toggleBool(id: BoolBuffId) {
    update(toggleBoolBuff(draft, id));
  }

  function setRenown(id: RenownStatId, val: string) {
    update({ renown: { ...draft.renown, [id]: sanitizeRenownLevel(val) } });
  }

  const statPotionTier = Number.parseInt(draft.statPotionTier, 10) || 0;
  const statPotionActive = statPotionTier > 0;
  const statPotionTier10 = statTiers[9];

  const isHurricane = isHurricaneClass(jobName);
  const ungroupedBools = BOOL_BUFFS.filter((b) => {
    if (b.group) return false;
    if (b.id === "maxedSacredSymbol") return showMaxedSacredSymbol;
    if (b.id === "extremeGreenPotion") return isHurricane;
    return true;
  });
  const statPotionInsertIdx = ungroupedBools.findIndex((b) => b.id === "sparklingRedStar") + 1;

  function toggleStatPotion() {
    update({ statPotionTier: statPotionActive ? "0" : "10" });
  }

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Set your buffs and their levels for bossing."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 520 }}>

        {/* Guild buffs — leveled */}
        <div>
          <p style={sectionLabel(theme)}>Guild Buffs</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {GUILD_BUFFS.map((b) => (
              <LeveledIconTile
                key={b.id}
                icon={<BuffIconImage icon={{ kind: "skill", id: b.skillId }} name={b.name} theme={theme} size={32} />}
                name={b.name}
                level={draft.guild[b.id] ?? ""}
                max={GUILD_BUFF_MAX}
                onLevel={(v) => setGuildLevel(b.id, v)}
                theme={theme}
              />
            ))}
          </div>
        </div>

        {/* All boolean buffs — single grid in catalog order */}
        <div>
          <p style={sectionLabel(theme)}>Buffs</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ungroupedBools.slice(0, statPotionInsertIdx).map((b) => (
              <BoolBuffTile
                key={b.id}
                entry={b}
                active={draft.bools[b.id] ?? false}
                onToggle={() => toggleBool(b.id)}
                iconOverride={buffIconOverride(b.id, primaryStat, jobName)}
                secondIconOverride={buffSecondIconOverride(b.id, jobName)}
                label={boolBuffLabel(b.id, primaryStat, theme, jobName)}
                ariaLabel={b.id === "heroEcho" ? heroEchoName(jobName) : undefined}
                theme={theme}
              />
            ))}
            {/* Advanced Stat Potion — always tier X (+30), tooltip lists all class stats */}
            <HoverTooltip
              label={(() => {
                const stats = classMainStats.length > 0 ? classMainStats : [primaryStat];
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {stats.flatMap((s) => {
                      const t = getStatPotionTiers(s)[9];
                      return [
                        <span key={`${s}-potion`}>{t.name}</span>,
                        <span key={`${s}-pill`} style={{ opacity: 0.6, color: theme.muted, paddingLeft: "0.6em" }}>or {t.pillName}</span>,
                      ];
                    })}
                    <span style={{ opacity: 0.7 }}>
                      +30 {stats.map(statAbbrev).join(", ")}
                    </span>
                  </div>
                );
              })()}
              theme={theme}
            >
              <button
                type="button"
                onClick={toggleStatPotion}
                aria-label="Advanced Stat Potion (Tier X)"
                aria-pressed={statPotionActive}
                style={boolTileStyle(statPotionActive, theme)}
              >
                <div style={{ opacity: statPotionActive ? 1 : 0.32, filter: statPotionActive ? "none" : "grayscale(1)", lineHeight: 0, display: "flex" }}>
                  <BuffIconImage icon={{ kind: "item", id: statPotionTier10.itemId }} name={statPotionTier10.name} theme={theme} size={32} />
                </div>
              </button>
            </HoverTooltip>
            {ungroupedBools.slice(statPotionInsertIdx).map((b) => (
              <BoolBuffTile
                key={b.id}
                entry={b}
                active={draft.bools[b.id] ?? false}
                onToggle={() => toggleBool(b.id)}
                iconOverride={buffIconOverride(b.id, primaryStat, jobName)}
                secondIconOverride={buffSecondIconOverride(b.id, jobName)}
                label={boolBuffLabel(b.id, primaryStat, theme, jobName)}
                ariaLabel={b.id === "heroEcho" ? heroEchoName(jobName) : undefined}
                theme={theme}
              />
            ))}
            {([["A", BUFF_GROUP_A], ["B", BUFF_GROUP_B]] as const).flatMap(([groupId, groupSet]) => [
              <div key={`${groupId}-break`} style={{ flexBasis: "100%", height: 0 }} />,
              <div
                key={groupId}
                style={pickOneGroupStyle(theme)}
              >
                <span style={pickOneLabelStyle(theme)}>
                  pick one
                </span>
                {/* react-doctor-disable-next-line js-combine-iterations -- BOOL_BUFFS is a small fixed roster, extra pass is negligible per the rule's own FP criteria */}
                {BOOL_BUFFS.filter((b) => groupSet.has(b.id)).map((b) => (
                  <BoolBuffTile
                    key={b.id}
                    entry={b}
                    active={draft.bools[b.id] ?? false}
                    onToggle={() => toggleBool(b.id)}
                    label={boolBuffLabel(b.id, primaryStat, theme, jobName)}
                    theme={theme}
                  />
                ))}
              </div>
            ])}
          </div>
        </div>

        {/* Champion's Renown */}
        <div>
          <p style={sectionLabel(theme)}>Champion&apos;s Renown</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(() => {
              const hasRenown = RENOWN_STATS.some((r) => (Number.parseInt(draft.renown[r.id] ?? "", 10) || 0) > 0);
              return (
                <div style={{ lineHeight: 0, flexShrink: 0, opacity: hasRenown ? 1 : 0.32, filter: hasRenown ? "none" : "grayscale(1)" }}>
                  <BuffIconImage icon={{ kind: "skill", id: RENOWN_SKILL_ID }} name="Champion's Renown" theme={theme} size={32} />
                </div>
              );
            })()}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {RENOWN_STATS.map((r) => {
                const atkLabel = primaryStat === "int" ? "MATT" : "ATT";
                const shortLabel = r.id === "atkMagAtk" ? atkLabel : r.shortLabel;
                return (
                <RenownCol
                  key={r.id}
                  shortLabel={shortLabel}
                  fullLabel={r.label}
                  value={draft.renown[r.id] ?? ""}
                  onChange={(v) => setRenown(r.id, v)}
                  theme={theme}
                />
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </SetupStepFrame>
  );
}
