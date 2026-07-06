"use client";

import type { CSSProperties } from "react";
import { numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import { ItemIcon } from "../../../../components/ResourceImage";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { SetupStepDefinition } from "../steps";
import { CLASS_SKILL_DATA } from "../data/classSkillData";
import {
  MAIN_STAT_LABELS,
  OZ_RING_ICON_IDS,
  OZ_RING_MAX_LEVEL,
  getOzClassStatInfo,
  parseOzRingsDraft,
  sanitizeOzRingLevel,
  serializeOzRingsDraft,
  type MainStatId,
  type OzRingId,
  type OzRingMode,
  type OzRingsDraft,
} from "../data/ozRingData";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip from "./InfoTooltip";
import { InputWarningBubble } from "./QuestionControls";

// MapleScouter's own sanity bound for the Totalling Ring off-stat fields (a 7-digit
// entry gets rejected) — not a real game cap, so this warns instead of hard-blocking.
const TOTALLING_STAT_WARN_AT = 1000000;

// manifests/v269/item.json, Item/Consume. Green/Red Jade's raw art fills its canvas
// edge-to-edge (31x26, no padding) while Black/White Jade/Life have a visible margin
// baked in (~36x36 canvas, content ~85-92% of it) — shrunk + nudged down here to
// visually match, offsets measured directly off a 4x-zoom screenshot comparing each
// icon's bottom edge against Black Jade's (the only one with zero baked-in padding
// asymmetry, so treated as the reference).
const BOSS_RING_BOX_ITEM_IDS: { id: string; scale?: number; offsetY?: number }[] = [
  { id: "02028407", scale: 0.89, offsetY: 1.25 }, // Green Jade Boss Ring Box
  { id: "02028408", scale: 0.89, offsetY: 1.25 }, // Red Jade Boss Ring Box
  { id: "02028409" }, // Black Jade Boss Ring Box (reference)
  { id: "02028410", offsetY: 0.5 }, // White Jade Boss Ring Box
  { id: "02028430", offsetY: 0.5 }, // Life Boss Ring Box
];

const OZ_RING_TOOLTIP = {
  title: "Oz Rings",
  description: "Special Skill Rings, better known as Oz Rings, drop from Boss Ring Boxes. Most players either swap between a Ring of Restraint and a Weapon Jump ring mid-fight, or run a single Continuous Ring instead.",
  imageUrls: BOSS_RING_BOX_ITEM_IDS.map(({ id, scale, offsetY }) => ({ src: resourceImageUrl("item", id, "iconRaw.png"), scale, offsetY })),
  link: { href: "https://maplestorywiki.net/w/Skill_Rings", label: "MapleStory Wiki: Skill Rings" },
};

const RING_MODE_OPTIONS: { mode: OzRingMode; label: string }[] = [
  { mode: "standard", label: "Standard" },
  { mode: "continuous", label: "Continuous" },
];

interface OzRingsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const sectionLabelStyle = (theme: AppTheme): CSSProperties => ({
  margin: "0 0 0.4rem", fontSize: "0.75rem", fontWeight: 800,
  textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted,
});

const ringModeTabStyle = (theme: AppTheme, isActive: boolean): CSSProperties => ({
  border: `1px solid ${isActive ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: isActive ? theme.accent : theme.bg,
  color: isActive ? "#fff" : theme.text,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  padding: "0.4rem 0.8rem", cursor: "pointer",
});

const ringTileStyle = (theme: AppTheme, placed: boolean): CSSProperties => ({
  width: 74, flexShrink: 0,
  border: `1px solid ${placed ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: placed ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "8px 9px", boxSizing: "border-box",
});

const ringInputStyle = (theme: AppTheme): CSSProperties => ({
  width: 56, textAlign: "center",
  border: `1px solid ${theme.border}`, borderRadius: 6,
  background: theme.bg, color: theme.text,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
  padding: "0.25rem", boxSizing: "border-box",
});

const statRowInputStyle = (theme: AppTheme): CSSProperties => ({
  width: "5rem", textAlign: "center",
  border: `1px solid ${theme.border}`, borderRadius: 7,
  background: theme.bg, color: theme.text,
  fontFamily: "inherit", fontWeight: 600, fontSize: "0.82rem",
  padding: "0.3rem 0.4rem", boxSizing: "border-box",
});

function RingTile({ iconId, name, level, onLevel, theme }: {
  iconId: string;
  name: string;
  level: string;
  onLevel: (val: string) => void;
  theme: AppTheme;
}) {
  const placed = (Number.parseInt(level || "0", 10) || 0) >= 1;
  return (
    <div style={ringTileStyle(theme, placed)}>
      <HoverTooltip label={name} theme={theme}>
        <div style={{ opacity: placed ? 1 : 0.3, filter: placed ? "none" : "grayscale(1)", lineHeight: 0 }}>
          <ItemIcon id={iconId} size={32} />
        </div>
      </HoverTooltip>
      <input
        type="number"
        className="no-spinner"
        min={0}
        max={OZ_RING_MAX_LEVEL}
        aria-label={`${name} level`}
        value={level}
        placeholder="0"
        onChange={(e) => onLevel(e.target.value)}
        onKeyDown={numericKeyDown}
        style={ringInputStyle(theme)}
      />
    </div>
  );
}

function RingModeTabs({ mode, onChange, theme }: {
  mode: OzRingMode;
  onChange: (next: OzRingMode) => void;
  theme: AppTheme;
}) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {RING_MODE_OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          onClick={() => onChange(opt.mode)}
          style={ringModeTabStyle(theme, opt.mode === mode)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatRow({ label, value, onChange, theme }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  theme: AppTheme;
}) {
  const showWarning = Number(value) >= TOTALLING_STAT_WARN_AT;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>{label}</span>
      <div style={{ position: "relative" }}>
        {showWarning && <InputWarningBubble message={`That ${label} value looks too large. Double check.`} theme={theme} />}
        <input
          type="text"
          inputMode="numeric"
          aria-label={`Totalling Ring ${label}`}
          value={value}
          placeholder="0"
          onChange={(e) => onChange(sanitizeDigitsInput(e.target.value))}
          onKeyDown={numericKeyDown}
          style={statRowInputStyle(theme)}
        />
      </div>
    </div>
  );
}

export default function OzRingsSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", value, onChange, onBack, onNext, onFinish,
}: OzRingsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const ozInfo = getOzClassStatInfo(classData?.requiredStats ?? []);
  const draft = parseOzRingsDraft(value);

  function update(patch: Partial<OzRingsDraft>) {
    onChange(serializeOzRingsDraft({ ...draft, ...patch }));
  }

  // Standard and Continuous are alternate builds — only the active one gets converted
  // to stored/scouter data (see convertOzRingsDraftToStored), so switching tabs doesn't
  // need to wipe the other side's levels. Keeping both lets you flip back and forth
  // without re-entering numbers you already typed.
  function setRingMode(mode: OzRingMode) {
    if (mode === draft.ringMode) return;
    update({ ringMode: mode });
  }

  function setLevel(ring: OzRingId, val: string) {
    update({ levels: { ...draft.levels, [ring]: sanitizeOzRingLevel(val) } });
  }

  function setTotallingStat(stat: MainStatId, val: string) {
    update({ totallingStatValues: { ...draft.totallingStatValues, [stat]: val } });
  }

  const totallingLevel = Number.parseInt(draft.levels.totalling ?? "", 10);
  const totallingStatsEntered = Number.isFinite(totallingLevel) && totallingLevel > 0 && ozInfo.totallingStats.length > 0;
  const showTotallingStats = draft.ringMode === "standard" && totallingStatsEntered;
  // A value that's clearly wrong (same threshold as the warning bubble) shouldn't be
  // submittable, in any flow — checked off the draft data itself (not `showTotallingStats`)
  // so switching to the Continuous tab can't hide a bad Standard-side value past this gate;
  // this is the only gate on this step, blank stats stay fine everywhere.
  const insaneTotallingStatCount = totallingStatsEntered
    ? ozInfo.totallingStats.filter((stat) => {
        const raw = draft.totallingStatValues[stat]?.trim();
        return Boolean(raw) && Number(raw) >= TOTALLING_STAT_WARN_AT;
      }).length
    : 0;
  const hasInsaneTotallingStat = insaneTotallingStatCount > 0;
  const flaggedValueWord = insaneTotallingStatCount > 1 ? "values" : "value";

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your Oz ring info if you use them when bossing."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
      nextDisabled={hasInsaneTotallingStat}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 360 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
            <span style={{ ...sectionLabelStyle(theme), margin: 0 }}>Ring Setup</span>
            <InfoTooltip content={OZ_RING_TOOLTIP} theme={theme} />
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: theme.muted, textTransform: "none", letterSpacing: "normal" }}>
              · choose one
            </span>
          </div>
          <RingModeTabs mode={draft.ringMode} onChange={setRingMode} theme={theme} />
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: theme.muted }}>
            Levels range from 0 to 6, leave at 0 if unused.
          </p>
        </div>

        {draft.ringMode === "continuous" && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <RingTile iconId={OZ_RING_ICON_IDS.continuous} name="Continuous Ring"
              level={draft.levels.continuous ?? ""} onLevel={(v) => setLevel("continuous", v)} theme={theme} />
          </div>
        )}

        {draft.ringMode === "standard" && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <RingTile iconId={OZ_RING_ICON_IDS.restraint} name="Ring of Restraint"
                level={draft.levels.restraint ?? ""} onLevel={(v) => setLevel("restraint", v)} theme={theme} />
              <RingTile iconId={ozInfo.weaponJumpIconId} name={ozInfo.weaponJumpLabel}
                level={draft.levels.weaponJump ?? ""} onLevel={(v) => setLevel("weaponJump", v)} theme={theme} />
              <RingTile iconId={OZ_RING_ICON_IDS.totalling} name="Totalling Ring"
                level={draft.levels.totalling ?? ""} onLevel={(v) => setLevel("totalling", v)} theme={theme} />
            </div>

            {showTotallingStats && (
              <div>
                <p style={sectionLabelStyle(theme)}>Totalling Ring Stats</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {ozInfo.totallingStats.map((stat) => (
                    <StatRow
                      key={stat}
                      label={MAIN_STAT_LABELS[stat]}
                      value={draft.totallingStatValues[stat] ?? ""}
                      onChange={(v) => setTotallingStat(stat, v)}
                      theme={theme}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {hasInsaneTotallingStat && (
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
          {showTotallingStats
            ? `Fix the flagged ${flaggedValueWord} above to continue.`
            : `Switch to Standard ring setup and fix the flagged Totalling Ring ${flaggedValueWord} to continue.`}
        </p>
      )}
    </SetupStepFrame>
  );
}
