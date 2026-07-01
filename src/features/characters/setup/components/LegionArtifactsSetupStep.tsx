"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { numericKeyDown } from "../../../../lib/inputUtils";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { StoredScouterLegion } from "../../model/charactersStore";
import { usePickerCoords } from "../hooks/usePickerCoords";
import {
  CRYSTAL_STAT_SLOTS,
  LEGION_ARTIFACT_STATS,
  LEGION_CRYSTALS,
  MAX_ARTIFACT_LEVEL,
  MAX_CRYSTAL_LEVEL,
  MAX_STAT_TOTAL_LEVEL,
  computeRawStatLevels,
  effectiveStatLevel,
  formatStatBonus,
  getLegionArtifactStat,
  isCrystalUnlocked,
  parseLegionArtifactBoardDraft,
  sanitizeCrystalLevel,
  serializeLegionArtifactBoardDraft,
  type LegionArtifactStatId,
  type LegionCrystalDef,
  type LegionCrystalDraft,
} from "../data/legionArtifactData";
import SetupStepFrame from "./SetupStepFrame";

interface LegionArtifactsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  worldScouterLegion?: StoredScouterLegion;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const PICKER_WIDTH = 230;
const EMPTY_CRYSTAL: LegionCrystalDraft = { level: 0, stats: [null, null, null] };

// ── Styles ────────────────────────────────────────────────────────────────────

function sectionLabelStyle(theme: AppTheme): CSSProperties {
  return {
    margin: "0 0 0.4rem", fontSize: "0.75rem", fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted,
  };
}

function levelInputStyle(theme: AppTheme, width: number): CSSProperties {
  return {
    width, textAlign: "center",
    border: `1px solid ${theme.border}`, borderRadius: 6,
    background: theme.bg, color: theme.text,
    fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
    padding: "0.25rem", boxSizing: "border-box",
  };
}

const crystalGridStyle: CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", maxWidth: 440,
};

function crystalCardStyle(theme: AppTheme, unlocked: boolean): CSSProperties {
  return {
    border: `1px solid ${theme.border}`, borderRadius: 10,
    background: unlocked ? theme.bg : `${theme.muted}0d`,
    padding: "0.55rem", boxSizing: "border-box",
    opacity: unlocked ? 1 : 0.6,
  };
}

// TODO: swap for a real legionCrystalIconUrl(id) once the 9 crystal icons are dumped
// from .wz (Orange Mushroom, Slime, Horny Mushroom, Stump, Stone Golem, Balrog, Zakum,
// Pink Bean, Papulatus — see legionArtifactData.ts LEGION_CRYSTALS).
function crystalIconPlaceholderStyle(theme: AppTheme): CSSProperties {
  return {
    width: 34, height: 34, flexShrink: 0, borderRadius: 8,
    border: `1px solid ${theme.border}`, background: `${theme.accent}18`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.75rem", fontWeight: 800, color: theme.accent,
  };
}

function crystalNameStyle(theme: AppTheme): CSSProperties {
  return {
    margin: 0, fontSize: "0.75rem", fontWeight: 800, color: theme.text,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  };
}

function crystalLockedLabelStyle(theme: AppTheme): CSSProperties {
  return { margin: "0.15rem 0 0", fontSize: "0.75rem", fontWeight: 700, color: theme.muted };
}

function statChipStyle(theme: AppTheme, filled: boolean): CSSProperties {
  return {
    width: "100%", textAlign: "left",
    border: `1px solid ${filled ? theme.accent : theme.border}`, borderRadius: 6,
    background: filled ? `${theme.accent}15` : theme.bg,
    color: filled ? theme.accent : theme.muted,
    fontFamily: "inherit", fontWeight: 700, fontSize: "0.75rem",
    padding: "0.25rem 0.4rem", cursor: "pointer",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    boxSizing: "border-box",
  };
}

const popoverShellStyle: CSSProperties = {
  position: "absolute", width: PICKER_WIDTH, borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.25)", overflow: "hidden", zIndex: 50,
};

function popoverOptionStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    display: "block", width: "100%", textAlign: "left",
    background: active ? `${theme.accent}22` : "transparent", border: "none",
    color: theme.text, fontFamily: "inherit", fontWeight: 600, fontSize: "0.78rem",
    padding: "0.4rem 0.6rem", cursor: "pointer",
  };
}

function popoverClearRowStyle(theme: AppTheme): CSSProperties {
  return {
    display: "block", width: "100%", textAlign: "left",
    background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
    color: theme.muted, fontFamily: "inherit", fontWeight: 700, fontSize: "0.75rem",
    padding: "0.4rem 0.6rem", cursor: "pointer",
  };
}

function summaryRowStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
    padding: "0.3rem 0", borderBottom: `1px solid ${theme.border}`,
    opacity: active ? 1 : 0.55,
  };
}

// ── Stat slot chip (opens a popover to pick one of the 16 stats) ───────────────

function StatSlotChip({
  crystalIndex, slotIndex, statId, excludeIds, openId, theme, onToggle, onClose, onPick,
}: {
  crystalIndex: number;
  slotIndex: number;
  statId: LegionArtifactStatId | null;
  excludeIds: ReadonlySet<LegionArtifactStatId>;
  openId: string | null;
  theme: AppTheme;
  onToggle: () => void;
  onClose: () => void;
  onPick: (statId: LegionArtifactStatId | null) => void;
}) {
  const pickerId = `${crystalIndex}-${slotIndex}`;
  const isOpen = openId === pickerId;
  const { ref, portalRef } = usePickerCoords(isOpen, PICKER_WIDTH);
  const def = statId ? getLegionArtifactStat(statId) : undefined;
  const options = LEGION_ARTIFACT_STATS.filter((s) => !excludeIds.has(s.id) || s.id === statId);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={`Crystal ${crystalIndex + 1} stat slot ${slotIndex + 1}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={statChipStyle(theme, Boolean(def))}
      >
        {def ? def.label : "+ Pick stat"}
      </button>
      {isOpen && createPortal(
        <div
          ref={portalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ ...popoverShellStyle, background: theme.panel, border: `1px solid ${theme.accent}` }}
        >
          {def && (
            <button type="button" onClick={() => { onPick(null); onClose(); }} style={popoverClearRowStyle(theme)}>
              — Clear —
            </button>
          )}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onPick(opt.id); onClose(); }}
                style={popoverOptionStyle(theme, opt.id === statId)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Crystal card ─────────────────────────────────────────────────────────────

function CrystalCard({
  index, def, crystal, unlocked, openId, theme, onSetLevel, onSetStat, onToggleSlot, onClosePicker,
}: {
  index: number;
  def: LegionCrystalDef;
  crystal: LegionCrystalDraft;
  unlocked: boolean;
  openId: string | null;
  theme: AppTheme;
  onSetLevel: (level: number) => void;
  onSetStat: (slotIndex: number, statId: LegionArtifactStatId | null) => void;
  onToggleSlot: (slotIndex: number) => void;
  onClosePicker: () => void;
}) {
  const level = crystal.level ?? 0;
  const stats = crystal.stats ?? [];
  const usedIds = new Set(stats.filter((s): s is LegionArtifactStatId => Boolean(s)));

  return (
    <div style={crystalCardStyle(theme, unlocked)}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <div style={crystalIconPlaceholderStyle(theme)}>{def.name.slice(0, 2).toUpperCase()}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={crystalNameStyle(theme)}>{def.name}</p>
          {unlocked ? (
            <input
              type="number"
              className="no-spinner"
              min={0}
              max={MAX_CRYSTAL_LEVEL}
              aria-label={`${def.name} level`}
              value={level || ""}
              placeholder="0"
              onChange={(e) => onSetLevel(sanitizeCrystalLevel(Number(e.target.value)))}
              onKeyDown={numericKeyDown}
              style={levelInputStyle(theme, 44)}
            />
          ) : (
            <p style={crystalLockedLabelStyle(theme)}>Lv {def.requiredArtifactLevel}+</p>
          )}
        </div>
      </div>
      {unlocked && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
          {Array.from({ length: CRYSTAL_STAT_SLOTS }, (_, slotIndex) => slotIndex).map((slotIndex) => (
            <StatSlotChip
              key={slotIndex}
              crystalIndex={index}
              slotIndex={slotIndex}
              statId={stats[slotIndex] ?? null}
              excludeIds={usedIds}
              openId={openId}
              theme={theme}
              onToggle={() => onToggleSlot(slotIndex)}
              onClose={onClosePicker}
              onPick={(statId) => onSetStat(slotIndex, statId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Computed totals summary ─────────────────────────────────────────────────

function ArtifactSummary({ crystals, theme }: { crystals: LegionCrystalDraft[]; theme: AppTheme }) {
  const rawLevels = computeRawStatLevels(crystals);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {LEGION_ARTIFACT_STATS.map((stat) => {
        const raw = rawLevels[stat.id] ?? 0;
        const effective = effectiveStatLevel(raw);
        const wasted = raw - MAX_STAT_TOTAL_LEVEL;
        return (
          <div key={stat.id} style={summaryRowStyle(theme, effective > 0)}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.text }}>{stat.label}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: effective > 0 ? theme.accent : theme.muted, whiteSpace: "nowrap" }}>
              {effective}/{MAX_STAT_TOTAL_LEVEL} · {formatStatBonus(stat.id, effective)}
              {wasted > 0 && <span style={{ color: "#dc2626", marginLeft: 4 }}>(wasting {wasted})</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function LegionArtifactsSetupStep({
  theme, step, stepNumber, totalSteps, worldScouterLegion, value, onChange, onBack, onNext, onFinish,
}: LegionArtifactsSetupStepProps) {
  const draft = parseLegionArtifactBoardDraft(value);
  const artifactLevel = draft.artifactLevel ?? worldScouterLegion?.artifactLevel ?? 0;
  const crystals: LegionCrystalDraft[] = draft.crystals
    ?? (worldScouterLegion?.crystals as LegionCrystalDraft[] | undefined)
    ?? [];

  const [openId, setOpenId] = useState<string | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Closes the open stat picker on outside clicks; the popover itself stops propagation
  // (mirrors the Equipment step's Inner Ability zone) so clicks inside it never reach here.
  useEffect(() => {
    if (!openId) return;
    function handleMouseDown(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openId]);

  function updateArtifactLevel(next: number) {
    onChange(serializeLegionArtifactBoardDraft({ artifactLevel: next, crystals }));
  }

  function updateCrystal(index: number, patch: Partial<LegionCrystalDraft>) {
    // Build a dense 9-length array (every slot filled) rather than writing into a
    // possibly-shorter array — leaving holes would serialize as `null` via
    // JSON.stringify, which every downstream reader would then have to guard against.
    const nextCrystals = LEGION_CRYSTALS.map((_, i) => crystals[i] ?? EMPTY_CRYSTAL);
    nextCrystals[index] = { ...nextCrystals[index], ...patch };
    onChange(serializeLegionArtifactBoardDraft({ artifactLevel, crystals: nextCrystals }));
  }

  function setCrystalStat(index: number, slotIndex: number, statId: LegionArtifactStatId | null) {
    const current = crystals[index] ?? EMPTY_CRYSTAL;
    const nextStats = [...(current.stats ?? [null, null, null])];
    nextStats[slotIndex] = statId;
    updateCrystal(index, { stats: nextStats });
  }

  function toggleSlot(index: number, slotIndex: number) {
    const id = `${index}-${slotIndex}`;
    setOpenId((cur) => (cur === id ? null : id));
  }

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your Legion Artifact crystals, found in the Legion window's Artifacts tab. This is account-wide for your world."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div ref={zoneRef} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 460 }}>
        <div>
          <p style={sectionLabelStyle(theme)}>Artifact Level</p>
          <input
            type="number"
            className="no-spinner"
            min={0}
            max={MAX_ARTIFACT_LEVEL}
            aria-label="Legion Artifact level"
            value={artifactLevel || ""}
            placeholder="0"
            onChange={(e) => updateArtifactLevel(Math.max(0, Math.min(MAX_ARTIFACT_LEVEL, Math.floor(Number(e.target.value) || 0))))}
            onKeyDown={numericKeyDown}
            style={levelInputStyle(theme, 56)}
          />
        </div>

        <div style={crystalGridStyle}>
          {LEGION_CRYSTALS.map((def, index) => (
            <CrystalCard
              key={def.id}
              index={index}
              def={def}
              crystal={crystals[index] ?? EMPTY_CRYSTAL}
              unlocked={isCrystalUnlocked(index, artifactLevel)}
              openId={openId}
              theme={theme}
              onSetLevel={(level) => updateCrystal(index, { level })}
              onSetStat={(slotIndex, statId) => setCrystalStat(index, slotIndex, statId)}
              onToggleSlot={(slotIndex) => toggleSlot(index, slotIndex)}
              onClosePicker={() => setOpenId(null)}
            />
          ))}
        </div>

        <div>
          <p style={sectionLabelStyle(theme)}>Computed Totals</p>
          <ArtifactSummary crystals={crystals} theme={theme} />
        </div>
      </div>
    </SetupStepFrame>
  );
}
