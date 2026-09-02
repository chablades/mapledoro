"use client";

import { useState, type CSSProperties } from "react";
import ModalShell from "../../../components/ModalShell";
import { dialogBtnColors, dialogPrimaryBtnColors, type AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import HoverTooltip from "../../../components/HoverTooltip";
import { ItemIcon } from "../../../components/ResourceImage";
import { Field, ToolNumberInput, PillGroup } from "../../tools/shared-ui";
import { SkillIcon } from "../../tools/hexa-skills/hexa-ui";
import { findClassById, COMMON_SKILLS, type HexaClassDef } from "../../tools/hexa-skills/hexa-classes";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { readCharactersStore } from "../model/charactersStore";
import { CLASS_SKILL_DATA } from "../setup/data/classSkillData";
import {
  BOOL_BUFFS, BUFF_GROUP_A, BUFF_GROUP_B,
  GUILD_BUFFS, GUILD_BUFF_MAX, RENOWN_STATS, RENOWN_SKILL_ID,
  emptyBuffsDraft, storedBuffsToDraft, toggleBoolBuff, sanitizeGuildLevel, sanitizeRenownLevel,
  getStatPotionTiers, primaryStatForClass, convertBuffsDraftToStored,
  type BuffsDraft, type BoolBuffId, type BoolBuffEntry, type GuildBuffId, type RenownStatId,
} from "../setup/data/buffsData";
import { BuffIconImage, BoolBuffTile, RenownCol, boolTileStyle, pickOneGroupStyle, pickOneLabelStyle, buffIconOverride, buffSecondIconOverride, boolBuffLabel } from "../setup/components/BuffsSetupStep";
import { LeveledIconTile } from "../setup/components/LeveledIconTile";
import { statInputStyle, inputSuffixStyle } from "../setup/components/QuestionControls";
import {
  OZ_RING_MAX_LEVEL, OZ_RING_ICON_IDS, emptyOzRingsDraft, storedOzRingsToOzRingsDraft, convertOzRingsDraftToStored,
  sanitizeOzRingLevel, getOzClassStatInfo, type OzRingsDraft, type OzRingId, type OzRingMode,
} from "../setup/data/ozRingData";
import { deriveWeaponAttLabel } from "../setup/data/statsStepDraft";
import {
  buildScouterPayload, SIMULATOR_HEXA_CORE_MAX, simulatorStatLabels,
  type ScouterSimulatorOverrides, type SimulatorHexaCoreField, type SimulatorInputOverrides,
} from "./scouterApi";
import type { ScouterErrorReason } from "./scouterCache";
import type { ScouterSimulatorApplyResult } from "./useScouterSimulator";

// Same copy this codebase already uses for the real result's failure states (ScouterFigure.tsx/
// CharacterProfileOverviewScreen.tsx) -- kept as its own small local copy rather than a shared
// export, matching how those two files each already keep their own rather than sharing one.
const SIMULATOR_ERROR_TEXT: Record<ScouterErrorReason, string> = {
  rate_limited: "You're refreshing too fast. Wait a moment and try again.",
  timeout: "MapleScouter's API timed out. Try again in a moment.",
  bad_response: "MapleScouter's API returned something unexpected. Try again in a moment.",
  network: "Couldn't reach MapleScouter's API. Try again in a moment.",
};

type SimulatorTab = "buffs" | "hexa" | "ozRings" | "input";
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

// generalCore2 = Sol Hecate, a COMMON_SKILLS entry (not part of the per-class HexaClassDef),
// same distinction buildHexa/hexaCoreLevels already draw in scouterApi.ts.
const SOL_HECATE = COMMON_SKILLS.find((s) => s.name === "Sol Hecate");

// Mastery nodes have no single name (one composite icon covers several skills at once) --
// HexaMatrixSetupStep.tsx's own tooltip joins them the same way.
function masteryName(node: { skills: string[] } | undefined): string | undefined {
  return node?.skills.join("\n");
}

function hexaCoreFields(classDef: HexaClassDef | null): { field: SimulatorHexaCoreField; label: string; name: string; iconId: string; iconUrl?: string }[] {
  const fallback = { iconId: "" };
  return [
    { field: "skillCore1" as const, label: "Origin", ...(classDef?.origin ?? fallback), name: classDef?.origin.name ?? "Origin" },
    { field: "skillCore2" as const, label: "Ascent", ...(classDef?.ascent ?? fallback), name: classDef?.ascent?.name ?? "Ascent" },
    { field: "masteryCore1" as const, label: "Mastery I", ...(classDef?.mastery[0] ?? fallback), name: masteryName(classDef?.mastery[0]) ?? "Mastery I" },
    { field: "masteryCore2" as const, label: "Mastery II", ...(classDef?.mastery[1] ?? fallback), name: masteryName(classDef?.mastery[1]) ?? "Mastery II" },
    { field: "masteryCore3" as const, label: "Mastery III", ...(classDef?.mastery[2] ?? fallback), name: masteryName(classDef?.mastery[2]) ?? "Mastery III" },
    { field: "masteryCore4" as const, label: "Mastery IV", ...(classDef?.mastery[3] ?? fallback), name: masteryName(classDef?.mastery[3]) ?? "Mastery IV" },
    { field: "reinCore1" as const, label: "Enhance I", ...(classDef?.enhancement[0] ?? fallback), name: classDef?.enhancement[0]?.name ?? "Enhance I" },
    { field: "reinCore2" as const, label: "Enhance II", ...(classDef?.enhancement[1] ?? fallback), name: classDef?.enhancement[1]?.name ?? "Enhance II" },
    { field: "reinCore3" as const, label: "Enhance III", ...(classDef?.enhancement[2] ?? fallback), name: classDef?.enhancement[2]?.name ?? "Enhance III" },
    { field: "reinCore4" as const, label: "Enhance IV", ...(classDef?.enhancement[3] ?? fallback), name: classDef?.enhancement[3]?.name ?? "Enhance IV" },
    { field: "generalCore2" as const, label: "Sol Hecate", ...(SOL_HECATE ?? fallback), name: SOL_HECATE?.name ?? "Sol Hecate" },
  ];
}

// Real GMS level cap as of v270 -- MapleStory's max character level. Update alongside any
// future level cap increase (root CLAUDE.md's version-bump checklist doesn't cover this,
// it's not manifest-derived).
const MAX_CHARACTER_LEVEL = 300;

function sectionLabelStyle(theme: AppTheme): CSSProperties {
  return { margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted };
}

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

function HexaSection({ theme, label, fields, hexaCores, onChange }: {
  theme: AppTheme; label: string; fields: { field: SimulatorHexaCoreField; label: string; name: string; iconId: string; iconUrl?: string }[];
  hexaCores: Record<SimulatorHexaCoreField, number>; onChange: (field: SimulatorHexaCoreField, value: number) => void;
}) {
  return (
    <div>
      <p style={sectionLabelStyle(theme)}>{label}</p>
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
  const byField = (fields: SimulatorHexaCoreField[]) => all.filter((f) => fields.includes(f.field));
  // 2x2 layout (Yuki's call, condensed for a popup) rather than the real setup step's single
  // vertical stack of 4 sections -- same section grouping, laid out as a grid instead.
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem" }}>
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
function InputGroupField({ theme, inputStyle, label, value, onChange, percent = true }: {
  theme: AppTheme; inputStyle: CSSProperties; label: string; value: number; onChange: (v: number) => void; percent?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", minWidth: 0 }}>
      <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{label}</span>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <ToolNumberInput
          value={value} min={0} onCommit={onChange} aria-label={label} className="no-spinner"
          style={percent ? { ...inputStyle, width: "4.6rem", paddingRight: "1.15rem" } : { ...inputStyle, width: "4.6rem" }}
        />
        {percent && <span style={inputSuffixStyle(theme)}>%</span>}
      </div>
    </div>
  );
}

const COMBAT_LEFT_FIELDS: { key: keyof SimulatorInputOverrides; label: string }[] = [
  { key: "ignoreGuard", label: "IED" },
  { key: "coolTimeReduce", label: "Cooldown Reduction" },
  { key: "resetCoolDown", label: "Cooldown Skip" },
];

const COMBAT_RIGHT_FIELDS: { key: keyof SimulatorInputOverrides; label: string }[] = [
  { key: "bossDmg", label: "Damage/Boss" },
  { key: "criRate", label: "Critical Rate" },
  { key: "criDmg", label: "Critical Damage" },
  { key: "buffDuration", label: "Buff Duration" },
  { key: "allStatPer", label: "All Stat" },
];

function InputTab({ theme, finalDmgPercent, onFinalDmgChange, input, onInputChange, statLabels, usesMagicWeapon, weaponAttLabel }: {
  theme: AppTheme; finalDmgPercent: number; onFinalDmgChange: (v: number) => void;
  input: Record<keyof SimulatorInputOverrides, number>; onInputChange: (key: keyof SimulatorInputOverrides, value: number) => void;
  statLabels: ReturnType<typeof simulatorStatLabels>;
  usesMagicWeapon: boolean;
  weaponAttLabel: string;
}) {
  const inputStyle = statInputStyle(theme);
  const field = (key: keyof SimulatorInputOverrides, label: string, percent = true) => (
    <InputGroupField key={key} theme={theme} inputStyle={inputStyle} label={label} value={input[key]} onChange={(v) => onInputChange(key, v)} percent={percent} />
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
      <div>
        <p style={sectionLabelStyle(theme)}>Stats</p>
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
        <p style={sectionLabelStyle(theme)}>Other</p>
        <div style={{ display: "flex", minWidth: 0, gap: "1.1rem" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {COMBAT_LEFT_FIELDS.map(({ key, label }) => field(key, label))}
            {field("weaponAtk", weaponAttLabel, false)}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <InputGroupField theme={theme} inputStyle={inputStyle} label="Final Damage" value={finalDmgPercent} onChange={onFinalDmgChange} />
            {COMBAT_RIGHT_FIELDS.map(({ key, label }) => field(key, label))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main dialog ──────────────────────────────────────────────────────────────

const EMPTY_INPUT: Record<keyof SimulatorInputOverrides, number> = {
  mainStat: 0, mainStatPer: 0, mainStatAbs: 0, mainStat9Level: 0,
  subStat: 0, subStatPer: 0, subStatAbs: 0, subStat9Level: 0,
  allStatPer: 0, criRate: 0, buffDuration: 0, coolTimeReduce: 0,
  atk: 0, atkPer: 0, bossDmg: 0, criDmg: 0, ignoreGuard: 0, resetCoolDown: 0, weaponAtk: 0,
};

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

  // Pre-filled from the character's real current values -- matches maplescouter.com's own
  // simulator UI (confirmed live, screenshots this session), so "max HEXA" is just bumping a
  // few numbers up rather than re-typing everything from blank. Same reasoning extends to
  // Buffs/Oz Rings: seed from the character's real saved state, not blank.
  const [realUserStat] = useState(() => buildScouterPayload(character, { scouterLegionByWorld: readCharactersStore().scouterLegionByWorld }));

  const [tab, setTab] = useState<SimulatorTab>("buffs");
  const [level, setLevel] = useState(character.level);
  // Pre-filled from the character's real current Arcane Force/Sacred Power -- typing the
  // boss's own requirement here is how a player "closes" that gap; there's no separate
  // on/off shortcut (see computeBossClear's own comment on why that's not needed).
  const [arcaneForce, setArcaneForce] = useState(Number(character.stats.arcanePower) || 0);
  const [authenticForce, setAuthenticForce] = useState(Number(character.stats.sacredPower) || 0);
  const [finalDmgPercent, setFinalDmgPercent] = useState(0);
  const [hexaCores, setHexaCores] = useState<Record<SimulatorHexaCoreField, number>>(() => {
    const out = {} as Record<SimulatorHexaCoreField, number>;
    for (const { field } of hexaCoreFields(hexaClassDef)) {
      out[field] = realUserStat ? Number(realUserStat.hexa[field]) : 0;
    }
    return out;
  });
  const [buffsDraft, setBuffsDraft] = useState<BuffsDraft>(() => storedBuffsToDraft(character.scouter?.buffs) ?? emptyBuffsDraft());
  const [ozRingsDraft, setOzRingsDraft] = useState<OzRingsDraft>(() => storedOzRingsToOzRingsDraft(character.scouter?.ozRings) ?? emptyOzRingsDraft());
  const [input, setInput] = useState<Record<keyof SimulatorInputOverrides, number>>(EMPTY_INPUT);
  const [error, setError] = useState<ScouterErrorReason | null>(null);

  const setHexaCore = (field: SimulatorHexaCoreField, value: number) => {
    setHexaCores((prev) => ({ ...prev, [field]: value }));
  };
  const setInputField = (key: keyof SimulatorInputOverrides, value: number) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    setError(null);
    const inputOverrides: SimulatorInputOverrides = Object.fromEntries(
      Object.entries(input).map(([key, v]) => [key, String(v)]),
    ) as unknown as SimulatorInputOverrides;
    const overrides: ScouterSimulatorOverrides = {
      level,
      arcaneForceOverride: arcaneForce,
      authenticForceOverride: authenticForce,
      finalDmgPercent: finalDmgPercent.toFixed(5),
      hexaCoreOverrides: Object.fromEntries(
        hexaCoreFields(hexaClassDef).map(({ field }) => [field, String(hexaCores[field])]),
      ) as Partial<Record<SimulatorHexaCoreField, string>>,
      dopingOverrides: convertBuffsDraftToStored(buffsDraft) ?? undefined,
      ringOverrides: {
        levels: convertOzRingsDraftToStored(ozRingsDraft)?.levels,
        useContinuousAsMainRing: ozRingsDraft.ringMode === "continuous",
      },
      input: inputOverrides,
    };
    void onApply(overrides).then((result) => {
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
      style={{ width: "min(700px, 100%)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* ToolNumberInput's onFocus/onBlur are already spoken for (select-all-on-focus, commit
          draft on blur -- see its own file), so a themed focus ring can't be layered on via
          props the way StatsSetupStep.tsx's raw inputs do (onFocus/onBlur there directly set
          outlineColor). This dialog-scoped rule gets the same themed color a different way --
          without it, input:focus-visible's outline (globals.css) has no explicit color and
          falls back to the browser's unthemed default, which reads as a stray white ring on
          this dark popup. */}
      <style>{`
        .scouter-simulator-dialog input:focus-visible { outline-color: ${theme.accent}; }
      `}</style>
      <div style={{ padding: "1rem 1.1rem 0.75rem", borderBottom: `1px solid ${theme.border}` }}>
        <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.05rem" }}>
          Scouter Simulation
        </span>
        <div style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600, marginTop: 4 }}>
          Fill out what you want to simulate, then Apply to see it on the Scouter bookmark.
        </div>
      </div>

      {/* Level/Arcane Force/Sacred Power sit here, alongside the tab switcher -- NOT inside
          the scrollable per-tab body, so they read as one always-visible control row rather
          than appearing to repeat under every tab. Typing the boss's own requirement here
          already closes that gap, so there's no separate "close this gap" toggle. */}
      <div style={{ padding: "0.7rem 1.1rem", borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Level">
            <ToolNumberInput value={level} min={1} max={MAX_CHARACTER_LEVEL} integer onCommit={setLevel} aria-label="Simulated level" className="no-spinner" style={{ ...inputStyle, width: 90 }} />
          </Field>
          <Field label="Arcane Force">
            <ToolNumberInput value={arcaneForce} min={0} integer onCommit={setArcaneForce} aria-label="Simulated Arcane Force" className="no-spinner" style={{ ...inputStyle, width: 110 }} />
          </Field>
          <Field label="Sacred Power">
            <ToolNumberInput value={authenticForce} min={0} integer onCommit={setAuthenticForce} aria-label="Simulated Sacred Power" className="no-spinner" style={{ ...inputStyle, width: 110 }} />
          </Field>
        </div>
        <PillGroup theme={theme} options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </div>

      <div style={{ padding: "0.85rem 1.1rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
        {tab === "buffs" && <BuffsTab theme={theme} draft={buffsDraft} onChange={setBuffsDraft} primaryStat={primaryStat} jobName={character.jobName} />}
        {tab === "hexa" && <HexaTab theme={theme} classDef={hexaClassDef} hexaCores={hexaCores} onChange={setHexaCore} />}
        {tab === "ozRings" && (
          <OzRingsTab
            theme={theme}
            draft={ozRingsDraft}
            onChange={setOzRingsDraft}
            weaponJumpLabel={ozClassInfo.weaponJumpLabel}
            weaponJumpIconId={ozClassInfo.weaponJumpIconId}
          />
        )}
        {tab === "input" && (
          <InputTab
            theme={theme}
            finalDmgPercent={finalDmgPercent}
            onFinalDmgChange={setFinalDmgPercent}
            input={input}
            onInputChange={setInputField}
            statLabels={statLabels}
            usesMagicWeapon={usesMagicWeapon}
            weaponAttLabel={weaponAttLabel}
          />
        )}

        {error && (
          <p style={{ margin: "0.8rem 0 0", fontSize: "0.8rem", fontWeight: 700, color: statusText(theme, "danger") }}>
            {SIMULATOR_ERROR_TEXT[error]}
          </p>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem", padding: "0.8rem 1.1rem", borderTop: `1px solid ${theme.border}` }}>
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
