"use client";

import type { CSSProperties } from "react";
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
  type OzRingsDraft,
} from "../data/ozRingData";
import SetupStepFrame from "./SetupStepFrame";

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

function RingTile({ iconId, name, level, onLevel, theme }: {
  iconId: string;
  name: string;
  level: string;
  onLevel: (val: string) => void;
  theme: AppTheme;
}) {
  const placed = (Number.parseInt(level || "0", 10) || 0) >= 1;
  return (
    <div style={{
      width: 74, flexShrink: 0,
      border: `1px solid ${placed ? theme.accent : theme.border}`,
      borderRadius: 8,
      background: placed ? `${theme.accent}15` : theme.bg,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      padding: "8px 9px", boxSizing: "border-box",
    }}>
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
        style={{
          width: 56, textAlign: "center",
          border: `1px solid ${theme.border}`, borderRadius: 6,
          background: theme.bg, color: theme.text,
          fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
          padding: "0.25rem", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function YesNoQuestion({ question, value, onChange, theme }: {
  question: string;
  value: boolean;
  onChange: (next: boolean) => void;
  theme: AppTheme;
}) {
  const options = [{ v: true, label: "Yes" }, { v: false, label: "No" }];
  return (
    <div>
      <p style={{ margin: "0 0 0.4rem", fontSize: "0.88rem", fontWeight: 800, color: theme.text }}>{question}</p>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {options.map((opt) => {
          const active = opt.v === value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.v)}
              style={{
                border: `1px solid ${active ? theme.accent : theme.border}`,
                borderRadius: 9,
                background: active ? `${theme.accent}22` : theme.bg,
                color: active ? theme.accent : theme.text,
                fontFamily: "inherit", fontWeight: 800, fontSize: "0.85rem",
                padding: "0.4rem 0.85rem", cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatRow({ label, value, onChange, theme }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  theme: AppTheme;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Totalling Ring ${label}`}
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        style={{
          width: "5rem", textAlign: "center",
          border: `1px solid ${theme.border}`, borderRadius: 7,
          background: theme.bg, color: theme.text,
          fontFamily: "inherit", fontWeight: 600, fontSize: "0.82rem",
          padding: "0.3rem 0.4rem", boxSizing: "border-box",
        }}
      />
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

  function setLevel(ring: OzRingId, val: string) {
    update({ levels: { ...draft.levels, [ring]: sanitizeOzRingLevel(val) } });
  }

  function setTotallingStat(stat: MainStatId, val: string) {
    update({ totallingStatValues: { ...draft.totallingStatValues, [stat]: val } });
  }

  const totallingLevel = Number.parseInt(draft.levels.totalling ?? "", 10);
  const showTotallingStats = Number.isFinite(totallingLevel) && totallingLevel > 0 && ozInfo.totallingStats.length > 0;

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your Oz ring levels (0–6) as shown in-game."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 360 }}>
        <YesNoQuestion
          question="Do you use a Continuous Ring?"
          value={draft.usesContinuous}
          onChange={(v) => update({ usesContinuous: v })}
          theme={theme}
        />

        {draft.usesContinuous ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <RingTile iconId={OZ_RING_ICON_IDS.continuous} name="Continuous Ring"
              level={draft.levels.continuous ?? ""} onLevel={(v) => setLevel("continuous", v)} theme={theme} />
          </div>
        ) : (
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
    </SetupStepFrame>
  );
}
