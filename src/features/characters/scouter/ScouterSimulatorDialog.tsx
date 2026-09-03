"use client";

import { useState, type CSSProperties } from "react";
import ModalShell from "../../../components/ModalShell";
import { dialogBtnColors, dialogPrimaryBtnColors, type AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import HoverTooltip from "../../../components/HoverTooltip";
import { ItemIcon } from "../../../components/ResourceImage";
import { ToolNumberInput, PillGroup } from "../../tools/shared-ui";
import { SkillIcon } from "../../tools/hexa-skills/hexa-ui";
import { findClassById, type HexaClassDef } from "../../tools/hexa-skills/hexa-classes";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { CLASS_SKILL_DATA } from "../setup/data/classSkillData";
import {
  BOOL_BUFFS, BUFF_GROUP_A, BUFF_GROUP_B,
  GUILD_BUFFS, GUILD_BUFF_MAX, RENOWN_STATS, RENOWN_SKILL_ID,
  toggleBoolBuff, sanitizeGuildLevel, sanitizeRenownLevel,
  getStatPotionTiers, primaryStatForClass,
  type BuffsDraft, type BoolBuffId, type BoolBuffEntry, type GuildBuffId, type RenownStatId,
} from "../setup/data/buffsData";
import { BuffIconImage, BoolBuffTile, RenownCol } from "../setup/components/BuffsSetupStep";
import { boolTileStyle, pickOneGroupStyle, pickOneLabelStyle, buffIconOverride, buffSecondIconOverride, boolBuffLabel } from "../setup/components/buffTileHelpers";
import { LeveledIconTile } from "../setup/components/LeveledIconTile";
import { statInputStyle, inputSuffixStyle } from "../setup/components/QuestionControls";
import {
  OZ_RING_MAX_LEVEL, OZ_RING_ICON_IDS,
  sanitizeOzRingLevel, getOzClassStatInfo, type OzRingsDraft, type OzRingId, type OzRingMode,
} from "../setup/data/ozRingData";
import { deriveWeaponAttLabel } from "../setup/data/statsStepDraft";
import {
  SIMULATOR_HEXA_CORE_MAX, simulatorStatLabels,
  type ScouterSimulatorOverrides, type SimulatorHexaCoreField, type SimulatorInputOverrides,
} from "./scouterApi";
import type { ScouterErrorReason } from "./scouterCache";
import type { ScouterSimulatorApplyResult } from "./useScouterSimulator";
import { useScouterSimulatorDraft, type SimulatorTab } from "./useScouterSimulatorDraft";
import { hexaCoreFields } from "./hexaSimulatorFields";

// Same copy this codebase already uses for the real result's failure states (ScouterFigure.tsx/
// CharacterProfileOverviewScreen.tsx) -- kept as its own small local copy rather than a shared
// export, matching how those two files each already keep their own rather than sharing one.
const SIMULATOR_ERROR_TEXT: Record<ScouterErrorReason, string> = {
  rate_limited: "You're refreshing too fast. Wait a moment and try again.",
  timeout: "MapleScouter's API timed out. Try again in a moment.",
  bad_response: "MapleScouter's API returned something unexpected. Try again in a moment.",
  network: "Couldn't reach MapleScouter's API. Try again in a moment.",
};

const TAB_OPTIONS: { value: SimulatorTab; label: string }[] = [
  { value: "buffs", label: "Buffs" },
  { value: "hexa", label: "HEXA" },
  { value: "ozRings", label: "Oz Rings" },
  { value: "input", label: "Input" },
];

// HEXA core level range: 0-30 for every core except Origin (skillCore1), which floors at 1
// once HEXA-eligible -- matches useHexaSkillsState.ts's own normalizeLevels
// (`origin: Math.max(1, clampLevel(...))` vs every other core's plain 0-30 clampLevel).
const HEXA_CORE_MIN: Partial<Record<SimulatorHexaCoreField, number>> = { skillCore1: 1 };

// Real GMS level cap as of v270 -- MapleStory's max character level. Update alongside any
// future level cap increase (root CLAUDE.md's version-bump checklist doesn't cover this,
// it's not manifest-derived).
const MAX_CHARACTER_LEVEL = 300;

function sectionLabelStyle(theme: AppTheme): CSSProperties {
  return { margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted };
}

// Same divider StatsSetupStep.tsx's own sectionLabelStyle uses under Combat Stats/Symbols --
// only the Input tab mirrors that step closely enough to want it (Yuki's own scoping call).
function dividedSectionLabelStyle(theme: AppTheme): CSSProperties {
  return { ...sectionLabelStyle(theme), paddingBottom: "0.25rem", borderBottom: `1px solid ${theme.border}` };
}

// Overrides tool-field-label's default sizing for the Level/Arcane Force/Sacred Power row --
// those 3 fields share a fixed 3-column grid down to mobile widths, and the class's default
// size wraps "Arcane Force"/"Sacred Power" onto 2 lines at that narrow a column.
const levelRowLabelStyle: CSSProperties = { margin: "0 0 4px", fontSize: "0.75rem", fontWeight: 800, textTransform: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// Renders both the full and abbreviated label text and lets a container query (scoped to
// .scouter-sim-level-grid, see the <style> block below) pick which one shows -- reacts to the
// grid column's own rendered width rather than a viewport breakpoint, so it only abbreviates
// once the column is actually too narrow for the full text, not based on screen size alone.
function LevelRowLabel({ full, short }: { full: string; short: string }) {
  return (
    <p style={levelRowLabelStyle}>
      <span className="scouter-sim-label-full">{full}</span>
      <span className="scouter-sim-label-short">{short}</span>
    </p>
  );
}

// Same tinted-box shape as StatsSetupStep.tsx's own warningBoxStyle/successBoxStyle, using
// info's blue (#3b82f6) since this is a plain clarification, not a warning or a success state.
const inputNoticeBoxStyle: CSSProperties = {
  background: "rgba(59, 130, 246, 0.08)",
  border: "1px solid rgba(59, 130, 246, 0.35)",
  borderRadius: "10px",
  padding: "0.65rem 0.85rem",
  display: "flex",
  alignItems: "center",
  gap: "0.45rem",
};

// Caps at ~8 tiles per row (8 * 52px tiles + 7 * 8px gaps = 472px) -- matches
// BuffsSetupStep.tsx's own maxWidth: 520 container, which wraps at the same row width. This
// popup is wider (700px) than that step's own layout, so without a matching cap here rows
// would fit more than 8 tiles and read as differently-shaped from the real setup step.
function tileRowStyle(): CSSProperties {
  return { display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 480 };
}

// ── Buffs tab ────────────────────────────────────────────────────────────────

// Same ordering/filtering as BuffsSetupStep.tsx's own ungroupedBools -- Advanced Stat Potion
// inserted right after Sparkling Red Star, not appended at the end. maxedSacredSymbol is
// always included here (the real step's showMaxedSacredSymbol gate is about which SETUP FLOW
// is running, a concept that doesn't apply to this popup) and extremeGreenPotion is always
// excluded (Hurricane-class-only tile, out of scope for this condensed tab).
const UNGROUPED_BUFFS = BOOL_BUFFS.filter((b) => !b.group && b.id !== "extremeGreenPotion");
const STAT_POTION_INSERT_IDX = UNGROUPED_BUFFS.findIndex((b) => b.id === "sparklingRedStar") + 1;

function BuffsTab({ theme, draft, onChange, primaryStat, jobName }: {
  theme: AppTheme; draft: BuffsDraft; onChange: (next: BuffsDraft) => void; primaryStat: ReturnType<typeof primaryStatForClass>; jobName: string;
}) {
  const statPotionTier = Number.parseInt(draft.statPotionTier, 10) || 0;
  const statTier10 = getStatPotionTiers(primaryStat)[9];

  const toggleBool = (id: BoolBuffId) => onChange(toggleBoolBuff(draft, id));
  const setGuild = (id: GuildBuffId, val: string) => onChange({ ...draft, guild: { ...draft.guild, [id]: sanitizeGuildLevel(val) } });
  const setRenown = (id: RenownStatId, val: string) => onChange({ ...draft, renown: { ...draft.renown, [id]: sanitizeRenownLevel(val) } });
  const toggleStatPotion = () => onChange({ ...draft, statPotionTier: statPotionTier > 0 ? "0" : "10" });

  const renderBuffTile = (b: BoolBuffEntry) => (
    <BoolBuffTile
      key={b.id}
      entry={b}
      active={draft.bools[b.id] ?? false}
      onToggle={() => toggleBool(b.id)}
      theme={theme}
      iconOverride={buffIconOverride(b.id, primaryStat, jobName)}
      secondIconOverride={buffSecondIconOverride(b.id, jobName)}
      label={boolBuffLabel(b.id, primaryStat, theme, jobName)}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div>
        <p style={sectionLabelStyle(theme)}>Guild Buffs</p>
        <div style={tileRowStyle()}>
          {GUILD_BUFFS.map((b) => (
            <LeveledIconTile
              key={b.id}
              icon={<BuffIconImage icon={{ kind: "skill", id: b.skillId }} name={b.name} theme={theme} size={32} />}
              name={b.name}
              level={draft.guild[b.id] ?? ""}
              max={GUILD_BUFF_MAX}
              onLevel={(v) => setGuild(b.id, v)}
              theme={theme}
            />
          ))}
        </div>
      </div>

      <div>
        <p style={sectionLabelStyle(theme)}>Buffs</p>
        <div style={tileRowStyle()}>
          {UNGROUPED_BUFFS.slice(0, STAT_POTION_INSERT_IDX).map(renderBuffTile)}
          <HoverTooltip theme={theme} label={`${statTier10.name} (Tier X)`}>
            <button type="button" onClick={toggleStatPotion} aria-label="Advanced Stat Potion (Tier X)" aria-pressed={statPotionTier > 0} style={boolTileStyle(statPotionTier > 0, theme)}>
              <div style={{ opacity: statPotionTier > 0 ? 1 : 0.32, filter: statPotionTier > 0 ? "none" : "grayscale(1)", lineHeight: 0 }}>
                <BuffIconImage icon={{ kind: "item", id: statTier10.itemId }} name={statTier10.name} theme={theme} size={32} />
              </div>
            </button>
          </HoverTooltip>
          {UNGROUPED_BUFFS.slice(STAT_POTION_INSERT_IDX).map(renderBuffTile)}
        </div>
      </div>

      {([["A", BUFF_GROUP_A], ["B", BUFF_GROUP_B]] as const).map(([groupId, groupSet]) => (
        // width: fit-content -- pickOneGroupStyle's flex-wrap box otherwise stretches to fill
        // this column's full width (a plain flex div with no explicit width defaults to
        // block-level, filling its parent) regardless of how few tiles it actually holds,
        // leaving the dashed border trailing off past the last tile. The real setup step's
        // narrower 520px column mostly hides this same behavior; this popup's wider body
        // makes it obvious, so it needs the explicit fit-content here.
        <div key={groupId} style={{ ...pickOneGroupStyle(theme), width: "fit-content" }}>
          <span style={pickOneLabelStyle(theme)}>pick one</span>
          {/* react-doctor-disable-next-line js-combine-iterations -- BOOL_BUFFS is a small fixed roster, extra pass is negligible per the rule's own FP criteria */}
          {BOOL_BUFFS.filter((b) => groupSet.has(b.id)).map(renderBuffTile)}
        </div>
      ))}

      <div>
        <p style={sectionLabelStyle(theme)}>Champion&apos;s Renown</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ opacity: 1, lineHeight: 0, flexShrink: 0 }}>
            <BuffIconImage icon={{ kind: "skill", id: RENOWN_SKILL_ID }} name="Champion's Renown" theme={theme} size={32} />
          </div>
          <div style={tileRowStyle()}>
            {RENOWN_STATS.map((r) => (
              <RenownCol
                key={r.id}
                shortLabel={r.shortLabel}
                fullLabel={r.label}
                value={draft.renown[r.id] ?? ""}
                onChange={(v) => setRenown(r.id, sanitizeRenownLevel(v))}
                theme={theme}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HEXA tab ─────────────────────────────────────────────────────────────────

const hexaSectionBtnStyle: CSSProperties = {
  background: "none", border: "none", font: "inherit",
  fontSize: "0.75rem", fontWeight: 800,
  padding: 0,
  cursor: "pointer",
};

function HexaSectionLabel({ theme, label, onMaxAll, onClear }: { theme: AppTheme; label: string; onMaxAll: () => void; onClear: () => void }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      marginBottom: "0.45rem", paddingBottom: "0.25rem", borderBottom: `1px solid ${theme.border}`,
    }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, color: theme.muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button type="button" onClick={onClear} style={{ ...hexaSectionBtnStyle, color: theme.muted }}>Clear</button>
        <span style={{ width: 1, alignSelf: "stretch", background: theme.border, flexShrink: 0 }} />
        <button type="button" onClick={onMaxAll} style={{ ...hexaSectionBtnStyle, color: theme.accent }}>Max All</button>
      </div>
    </div>
  );
}

function HexaSection({ theme, label, fields, hexaCores, onChange }: {
  theme: AppTheme; label: string; fields: { field: SimulatorHexaCoreField; label: string; name: string; iconId: string; iconUrl?: string }[];
  hexaCores: Record<SimulatorHexaCoreField, number>; onChange: (field: SimulatorHexaCoreField, value: number) => void;
}) {
  return (
    <div>
      <HexaSectionLabel
        theme={theme}
        label={label}
        onMaxAll={() => fields.forEach(({ field }) => onChange(field, SIMULATOR_HEXA_CORE_MAX))}
        onClear={() => fields.forEach(({ field }) => onChange(field, HEXA_CORE_MIN[field] ?? 0))}
      />
      {/* No maxWidth cap here (unlike tileRowStyle, built for Buffs' wider flat tray) -- each
          section only ever holds up to 4 tiles and already sits inside its own 2x2 grid
          column, so it should fill that column's real width instead of wrapping early. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fields.map(({ field, name, iconId, iconUrl }) => (
          <LeveledIconTile
            key={field}
            icon={<SkillIcon iconId={iconId} iconUrl={iconUrl} name={name} theme={theme} size={32} />}
            name={name}
            level={String(hexaCores[field])}
            min={HEXA_CORE_MIN[field] ?? 0}
            max={SIMULATOR_HEXA_CORE_MAX}
            onLevel={(v) => onChange(field, Math.max(HEXA_CORE_MIN[field] ?? 0, Math.min(SIMULATOR_HEXA_CORE_MAX, Number.parseInt(v, 10) || 0)))}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}

function HexaTab({ theme, classDef, hexaCores, onChange }: {
  theme: AppTheme; classDef: HexaClassDef | null; hexaCores: Record<SimulatorHexaCoreField, number>; onChange: (field: SimulatorHexaCoreField, value: number) => void;
}) {
  const all = hexaCoreFields(classDef);
  // react-doctor-disable-next-line js-set-map-lookups -- all is a fixed 11-entry HEXA core list, fields is 1-4 entries; a Set would cost more to build than the plain .includes scan.
  const byField = (fields: SimulatorHexaCoreField[]) => all.filter((f) => fields.includes(f.field));
  // Same single vertical stack HexaMatrixSetupStep.tsx itself uses -- each section takes the
  // tab's full width and its own tile row wraps naturally, instead of splitting into a 2x2
  // grid whose fixed columns can't hold a 4-wide row on narrow viewports.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <HexaSection theme={theme} label="Origin & Ascent" fields={byField(["skillCore1", "skillCore2"])} hexaCores={hexaCores} onChange={onChange} />
      <HexaSection theme={theme} label="Mastery" fields={byField(["masteryCore1", "masteryCore2", "masteryCore3", "masteryCore4"])} hexaCores={hexaCores} onChange={onChange} />
      <HexaSection theme={theme} label="Enhancement" fields={byField(["reinCore1", "reinCore2", "reinCore3", "reinCore4"])} hexaCores={hexaCores} onChange={onChange} />
      <HexaSection theme={theme} label="Common" fields={byField(["generalCore2"])} hexaCores={hexaCores} onChange={onChange} />
    </div>
  );
}

// ── Oz Rings tab ─────────────────────────────────────────────────────────────

const RING_MODE_OPTIONS: { value: OzRingMode; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "continuous", label: "Continuous" },
];

function ozRingRows(weaponJumpLabel: string, weaponJumpIconId: string): { id: OzRingId; label: string; iconId: string }[] {
  return [
    { id: "restraint", label: "Ring of Restraint", iconId: OZ_RING_ICON_IDS.restraint },
    { id: "weaponJump", label: weaponJumpLabel, iconId: weaponJumpIconId },
    { id: "totalling", label: "Totalling Ring", iconId: OZ_RING_ICON_IDS.totalling },
    { id: "continuous", label: "Continuous Ring", iconId: OZ_RING_ICON_IDS.continuous },
  ];
}

function OzRingsTab({ theme, draft, onChange, weaponJumpLabel, weaponJumpIconId }: {
  theme: AppTheme; draft: OzRingsDraft; onChange: (next: OzRingsDraft) => void; weaponJumpLabel: string; weaponJumpIconId: string;
}) {
  const setLevel = (id: OzRingId, val: string) => onChange({ ...draft, levels: { ...draft.levels, [id]: sanitizeOzRingLevel(val) } });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div>
        <p style={sectionLabelStyle(theme)}>Ring Setup</p>
        {/* PillGroup's own wrapper has no explicit width, so as a flex (block-level) box it
            stretches to fill this column -- same fit-content fix as the Buffs tab's pick-one
            groups. */}
        <div style={{ width: "fit-content" }}>
          <PillGroup theme={theme} options={RING_MODE_OPTIONS} value={draft.ringMode} onChange={(v) => onChange({ ...draft, ringMode: v })} />
        </div>
      </div>
      <div>
        <p style={sectionLabelStyle(theme)}>Ring Levels</p>
        <div style={tileRowStyle()}>
          {ozRingRows(weaponJumpLabel, weaponJumpIconId).map(({ id, label, iconId }) => (
            <LeveledIconTile
              key={id}
              icon={<ItemIcon id={iconId} size={32} alt={label} />}
              name={label}
              level={draft.levels[id] ?? ""}
              max={OZ_RING_MAX_LEVEL}
              onLevel={(v) => setLevel(id, v)}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Input tab ────────────────────────────────────────────────────────────────

// Same 3-box row shape StatsSetupStep.tsx's own TripleStatRow uses for a stat's Base/%/%-
// Not-Applied trio (Yuki's real reference: Character Info's Basic Stats section).
const tripleInputGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.35rem" };

function TripleInputBox({ theme, inputStyle, label, sublabel, value, onChange, integer }: {
  theme: AppTheme; inputStyle: CSSProperties; label: string; sublabel: string; value: number; onChange: (v: number) => void; integer?: boolean;
}) {
  return (
    <div>
      <ToolNumberInput value={value} min={0} integer={integer} onCommit={onChange} aria-label={label} className="no-spinner" style={{ ...inputStyle, width: "100%" }} />
      <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>{sublabel}</p>
    </div>
  );
}

function TripleInputRow({ theme, inputStyle, label, base, percent, abs, per9Levels, onChange }: {
  theme: AppTheme; inputStyle: CSSProperties; label: string;
  base: number; percent: number; abs: number; per9Levels: number;
  onChange: (field: "base" | "percent" | "abs" | "per9Levels", v: number) => void;
}) {
  return (
    <div>
      <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>{label}</p>
      <div style={{ ...tripleInputGridStyle, gridTemplateColumns: "repeat(4, 1fr)" }}>
        <TripleInputBox theme={theme} inputStyle={inputStyle} label={`${label} base value`} sublabel="Base Value" value={base} onChange={(v) => onChange("base", v)} integer />
        <TripleInputBox theme={theme} inputStyle={inputStyle} label={`${label} percent value`} sublabel="% Value" value={percent} onChange={(v) => onChange("percent", v)} integer />
        <TripleInputBox theme={theme} inputStyle={inputStyle} label={`${label} percent not applied`} sublabel="% Not Applied" value={abs} onChange={(v) => onChange("abs", v)} integer />
        <TripleInputBox theme={theme} inputStyle={inputStyle} label={`${label} per 9 levels`} sublabel="Per 9 Levels" value={per9Levels} onChange={(v) => onChange("per9Levels", v)} integer />
      </div>
    </div>
  );
}

// Same compact row shape StatsSetupStep.tsx's own CombatStatCell uses (label left,
// ellipsis-truncated; fixed-width input right, optional % suffix badge) -- not Field's
// label-above-input stacking, which reads far taller/looser than the real setup step.
function InputGroupField({ theme, inputStyle, label, value, onChange, suffix = "%" }: {
  theme: AppTheme; inputStyle: CSSProperties; label: string; value: number; onChange: (v: number) => void; suffix?: string | null;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <ToolNumberInput
          value={value} min={0} onCommit={onChange} aria-label={label} className="no-spinner"
          style={suffix ? { ...inputStyle, width: "4.6rem", paddingRight: "1.15rem" } : { ...inputStyle, width: "4.6rem" }}
        />
        {suffix && <span style={inputSuffixStyle(theme)}>{suffix}</span>}
      </div>
    </div>
  );
}

const COMBAT_LEFT_FIELDS: { key: keyof SimulatorInputOverrides; label: string; suffix?: string | null }[] = [
  { key: "ignoreGuard", label: "Ignore DEF" },
  { key: "coolTimeReduce", label: "Cooldown Reduction", suffix: "s" },
  { key: "resetCoolDown", label: "Cooldown Not Applied" },
];

const COMBAT_RIGHT_FIELDS: { key: keyof SimulatorInputOverrides; label: string; suffix?: string | null }[] = [
  { key: "bossDmg", label: "Damage/Boss" },
  { key: "criRate", label: "Critical Rate" },
  { key: "criDmg", label: "Critical Damage" },
  { key: "buffDuration", label: "Buff Duration" },
];

function InputTab({ theme, finalDmgPercent, onFinalDmgChange, input, onInputChange, statLabels, usesMagicWeapon, weaponAttLabel }: {
  theme: AppTheme; finalDmgPercent: number; onFinalDmgChange: (v: number) => void;
  input: Record<keyof SimulatorInputOverrides, number>; onInputChange: (key: keyof SimulatorInputOverrides, value: number) => void;
  statLabels: ReturnType<typeof simulatorStatLabels>;
  usesMagicWeapon: boolean;
  weaponAttLabel: string;
}) {
  const inputStyle = statInputStyle(theme);
  const field = (key: keyof SimulatorInputOverrides, label: string, suffix: string | null = "%") => (
    <InputGroupField key={key} theme={theme} inputStyle={inputStyle} label={label} value={input[key]} onChange={(v) => onInputChange(key, v)} suffix={suffix} />
  );
  const tripleField = (
    label: string,
    baseKey: keyof SimulatorInputOverrides, percentKey: keyof SimulatorInputOverrides,
    absKey: keyof SimulatorInputOverrides, per9Key: keyof SimulatorInputOverrides,
  ) => {
    const keyFor = { base: baseKey, percent: percentKey, abs: absKey, per9Levels: per9Key } as const;
    return (
      <TripleInputRow
        key={baseKey}
        theme={theme} inputStyle={inputStyle} label={label}
        base={input[baseKey]} percent={input[percentKey]} abs={input[absKey]} per9Levels={input[per9Key]}
        onChange={(field2, v) => onInputChange(keyFor[field2], v)}
      />
    );
  };
  const atkLabel = usesMagicWeapon ? "Magic ATT" : "ATT";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      <div style={inputNoticeBoxStyle}>
        <span style={{ fontSize: "0.75rem", color: statusText(theme, "info"), flexShrink: 0, lineHeight: 1 }}>★</span>
        <p style={{ margin: 0, fontSize: "0.82rem", color: statusText(theme, "info"), fontWeight: 700 }}>
          Values here are added on top of your current stats, not set directly.
        </p>
      </div>
      <div>
        <p style={dividedSectionLabelStyle(theme)}>Basic Stats</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {statLabels.main && tripleField(statLabels.main.label, "mainStat", "mainStatPer", "mainStatAbs", "mainStat9Level")}
          {statLabels.sub && tripleField(statLabels.sub.label, "subStat", "subStatPer", "subStatAbs", "subStat9Level")}
          <div>
            <p style={{ margin: 0, marginBottom: "0.25rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>{atkLabel}</p>
            <div style={tripleInputGridStyle}>
              <TripleInputBox theme={theme} inputStyle={inputStyle} label={`${atkLabel} base value`} sublabel="Base Value" value={input.atk} onChange={(v) => onInputChange("atk", v)} integer />
              <TripleInputBox theme={theme} inputStyle={inputStyle} label={`${atkLabel} percent value`} sublabel="% Value" value={input.atkPer} onChange={(v) => onInputChange("atkPer", v)} integer />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p style={dividedSectionLabelStyle(theme)}>Combat Stats</p>
        <div style={{ display: "flex", minWidth: 0, gap: "1.1rem" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_LEFT_FIELDS.map(({ key, label, suffix }) => field(key, label, suffix === undefined ? "%" : suffix))}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <InputGroupField theme={theme} inputStyle={inputStyle} label="Final Damage" value={finalDmgPercent} onChange={onFinalDmgChange} />
            {COMBAT_RIGHT_FIELDS.map(({ key, label, suffix }) => field(key, label, suffix === undefined ? "%" : suffix))}
          </div>
        </div>
      </div>

      <div>
        <p style={dividedSectionLabelStyle(theme)}>Other</p>
        <div style={{ display: "flex", minWidth: 0, gap: "1.1rem" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {field("weaponAtk", weaponAttLabel, null)}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {field("allStatPer", "All Stat")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

export default function ScouterSimulatorDialog({
  theme,
  character,
  applying,
  onApply,
  onClose,
}: {
  theme: AppTheme;
  character: StoredCharacterRecord;
  applying: boolean;
  onApply: (overrides: ScouterSimulatorOverrides) => Promise<ScouterSimulatorApplyResult>;
  onClose: () => void;
}) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === character.jobName);
  const primaryStat = primaryStatForClass(classData?.requiredStats ?? []);
  const statLabels = simulatorStatLabels(classData?.id ?? "", classData?.requiredStats ?? []);
  const ozClassInfo = getOzClassStatInfo(classData?.id, classData?.requiredStats ?? []);
  const hexaClassDef = classData ? findClassById(classData.id) : null;
  const { usesMagicWeapon, label: weaponAttLabel } = deriveWeaponAttLabel(classData);
  const inputStyle = statInputStyle(theme);

  const draft = useScouterSimulatorDraft(character, hexaClassDef);
  const [error, setError] = useState<ScouterErrorReason | null>(null);

  const handleApply = () => {
    setError(null);
    void onApply(draft.buildOverrides()).then((result) => {
      if (result.status === "error") setError(result.reason);
      // "unsupported"/"ok" both close the popup from the caller's side (ok = success per the
      // plan; unsupported shouldn't happen here since ScouterSimulatorDialog is only ever
      // opened for a class the real Scouter figure already confirmed is supported).
    });
  };

  return (
    <ModalShell
      theme={theme}
      className="scouter-simulator-dialog"
      ariaLabel="Scouter Simulator"
      onClose={onClose}
      style={{ width: "min(700px, 100%)", height: "min(760px, 85vh)", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* ToolNumberInput's onFocus/onBlur are already spoken for (select-all-on-focus, commit
          draft on blur -- see its own file), so a themed focus ring can't be layered on via
          props the way StatsSetupStep.tsx's raw inputs do (onFocus/onBlur there directly set
          outlineColor). This dialog-scoped rule gets the same themed color a different way --
          without it, input:focus-visible's outline (globals.css) has no explicit color and
          falls back to the browser's unthemed default, which reads as a stray white ring on
          this dark popup. */}
      {/* Mobile: the subtitle only matters the first time this dialog opens, and the level
          row/tab switcher's padding is generous enough on desktop to eat most of a phone
          viewport's height before any real tab content shows -- shrink both there. */}
      <style>{`
        .scouter-simulator-dialog input:focus-visible { outline-color: ${theme.accent}; }
        .scouter-sim-level-grid { container-type: inline-size; }
        .scouter-sim-label-short { display: none; }
        @container (max-width: 340px) {
          .scouter-sim-label-full { display: none; }
          .scouter-sim-label-short { display: inline; }
        }
        @media (max-width: 480px) {
          .scouter-simulator-dialog .scouter-sim-subtitle { display: none; }
          .scouter-simulator-dialog .scouter-sim-header { padding: 0.7rem 0.85rem 0.55rem; }
          .scouter-simulator-dialog .scouter-sim-level-row { padding: 0.5rem 0.85rem; gap: 0.45rem; }
        }
      `}</style>
      <div className="scouter-sim-header" style={{ padding: "1rem 1.1rem 0.75rem", borderBottom: `1px solid ${theme.border}` }}>
        <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.05rem" }}>
          Scouter Simulation
        </span>
        <div className="scouter-sim-subtitle" style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600, marginTop: 4 }}>
          Fill out what you want to simulate, then Apply to see it on the Scouter bookmark.
        </div>
      </div>

      {/* Level/Arcane Force/Sacred Power sit here, alongside the tab switcher -- NOT inside
          the scrollable per-tab body, so they read as one always-visible control row rather
          than appearing to repeat under every tab. Typing the boss's own requirement here
          already closes that gap, so there's no separate "close this gap" toggle. */}
      <div className="scouter-sim-level-row" style={{ padding: "0.7rem 1.1rem", borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div className="scouter-sim-level-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <LevelRowLabel full="Level" short="Level" />
            <ToolNumberInput value={draft.level} min={1} max={MAX_CHARACTER_LEVEL} integer onCommit={draft.setLevel} aria-label="Simulated level" className="no-spinner" style={{ ...inputStyle, width: "100%" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <LevelRowLabel full="Arcane Force" short="Arc. Force" />
            <ToolNumberInput value={draft.arcaneForce} min={0} integer onCommit={draft.setArcaneForce} aria-label="Simulated Arcane Force" className="no-spinner" style={{ ...inputStyle, width: "100%" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <LevelRowLabel full="Sacred Power" short="Sac. Power" />
            <ToolNumberInput value={draft.authenticForce} min={0} integer onCommit={draft.setAuthenticForce} aria-label="Simulated Sacred Power" className="no-spinner" style={{ ...inputStyle, width: "100%" }} />
          </div>
        </div>
        <PillGroup theme={theme} options={TAB_OPTIONS} value={draft.tab} onChange={draft.setTab} />
      </div>

      <div style={{ padding: "0.85rem 1.1rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {draft.tab === "buffs" && <BuffsTab theme={theme} draft={draft.buffsDraft} onChange={draft.setBuffsDraft} primaryStat={primaryStat} jobName={character.jobName} />}
        {draft.tab === "hexa" && <HexaTab theme={theme} classDef={hexaClassDef} hexaCores={draft.hexaCores} onChange={draft.setHexaCore} />}
        {draft.tab === "ozRings" && (
          <OzRingsTab
            theme={theme}
            draft={draft.ozRingsDraft}
            onChange={draft.setOzRingsDraft}
            weaponJumpLabel={ozClassInfo.weaponJumpLabel}
            weaponJumpIconId={ozClassInfo.weaponJumpIconId}
          />
        )}
        {draft.tab === "input" && (
          <InputTab
            theme={theme}
            finalDmgPercent={draft.finalDmgPercent}
            onFinalDmgChange={draft.setFinalDmgPercent}
            input={draft.input}
            onInputChange={draft.setInputField}
            statLabels={statLabels}
            usesMagicWeapon={usesMagicWeapon}
            weaponAttLabel={weaponAttLabel}
          />
        )}

      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.55rem", padding: "0.8rem 1.1rem", borderTop: `1px solid ${theme.border}` }}>
        {error && (
          <p style={{ margin: 0, marginRight: "auto", fontSize: "0.8rem", fontWeight: 700, color: statusText(theme, "danger") }}>
            {SIMULATOR_ERROR_TEXT[error]}
          </p>
        )}
        <button type="button" onClick={onClose} className="tool-btn tool-dialog-btn" style={dialogBtnColors(theme)}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={applying}
          className="tool-btn tool-dialog-btn"
          style={{ ...dialogPrimaryBtnColors(theme), opacity: applying ? 0.6 : 1, cursor: applying ? "default" : "pointer" }}
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    </ModalShell>
  );
}
