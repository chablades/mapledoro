import Image from "next/image";
import { useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { SetupFlowId } from "../../setup/flows";
import type { SetupStepId } from "../../setup/steps";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle } from "../components/uiStyles";
import { findClassById, COMMON_SKILLS, type HexaSkillDef, type HexaSkillLevels } from "../../../tools/hexa-skills/hexa-classes";
import { readCharacterToolData } from "../../../tools/characterToolStorage";
import { resolveClassId, getClassSetupOverrides } from "../../setup/data/nexonJobMapping";
import { CLASS_SKILL_DATA } from "../../setup/data/classSkillData";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import { readCharactersStore, selectCharactersList } from "../../model/charactersStore";
import type { StoredCharacterEquipment, StoredCharacterRecord } from "../../model/charactersStore";
import { LEGION_CRYSTALS } from "../../setup/data/legionArtifactData";
import { LINK_SKILLS, reconcileLinkSkills } from "../../setup/data/linkSkillsData";
import { GUILD_BUFFS, BOOL_BUFFS, RENOWN_STATS } from "../../setup/data/buffsData";

interface CharacterProfileOverviewScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

type Theme = PreviewPaneModel["theme"];
type BookmarkId = "overview" | SetupStepId;

interface BookmarkDef {
  id: BookmarkId;
  tabLabel: string;
  pageLabel: string;
  flowId: SetupFlowId | null;
}

const ALL_BOOKMARKS: BookmarkDef[] = [
  { id: "overview", tabLabel: "Overview", pageLabel: "Overview", flowId: null },
  { id: "gender", tabLabel: "Gender", pageLabel: "Gender", flowId: "gender_flow" },
  { id: "marriage", tabLabel: "Married", pageLabel: "Marriage", flowId: "marriage_flow" },
  { id: "stats", tabLabel: "Stats", pageLabel: "Stats", flowId: "stats_flow" },
  { id: "equipment", tabLabel: "Gear", pageLabel: "Equipment", flowId: "equipment_flow" },
  { id: "oz_rings", tabLabel: "Oz Rings", pageLabel: "Oz Rings", flowId: "oz_rings_flow" },
  { id: "familiars", tabLabel: "Familiars", pageLabel: "Familiars", flowId: "familiars_flow" },
  { id: "link_skills", tabLabel: "Link Skills", pageLabel: "Link Skills", flowId: "link_skills_flow" },
  { id: "v_matrix", tabLabel: "V Matrix", pageLabel: "V Matrix", flowId: "v_matrix_flow" },
  { id: "hexa_matrix", tabLabel: "HEXA", pageLabel: "HEXA Matrix", flowId: "hexa_matrix_flow" },
  { id: "legion_artifacts", tabLabel: "Legion", pageLabel: "Legion Artifacts", flowId: "legion_artifacts_flow" },
  { id: "buffs", tabLabel: "Buffs", pageLabel: "Buffs", flowId: "buffs_flow" },
];

function getVisibleBookmarks(jobName: string | undefined): BookmarkDef[] {
  if (!jobName) return ALL_BOOKMARKS;
  const overrides = getClassSetupOverrides(jobName);
  return ALL_BOOKMARKS.filter((b) => {
    if (b.id === "gender" && overrides.gender !== null) return false;
    if (b.id === "marriage" && overrides.skipMarriage) return false;
    return true;
  });
}

const commonSlots: (HexaSkillDef | null)[] = [COMMON_SKILLS[0] ?? null, COMMON_SKILLS[1] ?? null, null, null];

const MAIN_STAT_FIELDS = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "HP" } as const;
type MainStatKey = keyof typeof MAIN_STAT_FIELDS;

const hexNodeLevelBadgeStyle: CSSProperties = {
  position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)",
  fontSize: 12, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.65)",
  borderRadius: 999, padding: "0px 4px", lineHeight: 1.4, zIndex: 1, whiteSpace: "nowrap",
};

function hexNodeTileStyle(border: string, bg: string, showImage: boolean, locked: boolean | undefined): CSSProperties {
  return {
    width: 42, height: 42, borderRadius: 6, border: `1px solid ${border}`,
    background: showImage ? "transparent" : bg, display: "flex", alignItems: "center",
    justifyContent: "center", position: "relative", overflow: "hidden",
    opacity: locked ? 0.22 : 1, flexShrink: 0,
  };
}

function exportButtonStyle(theme: Theme): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700,
    color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit",
  };
}

function pencilButtonStyle(theme: Theme): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 26, height: 26, flexShrink: 0,
    color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`,
    borderRadius: 8, cursor: "pointer",
  };
}

function PencilIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function BookmarkPageHeader({ theme, label, onEdit, disabled }: { theme: Theme; label: string; onEdit: (() => void) | null; disabled: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>{label}</h3>
      {onEdit !== null && (
        <button
          type="button"
          className="tap-target-44"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          disabled={disabled}
          onClick={onEdit}
          style={pencilButtonStyle(theme)}
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

function EmptyBookmarkState({ theme, label, onSetup, disabled }: { theme: Theme; label: string; onSetup: (() => void) | null; disabled: boolean }) {
  return (
    <div style={{ display: "grid", gap: 10, padding: "0.4rem 0 1rem", justifyItems: "start" }}>
      <p style={{ margin: 0, fontSize: 13, color: theme.muted, fontWeight: 700 }}>Not set up yet.</p>
      {onSetup !== null && (
        <button
          type="button"
          className="tap-target-44"
          disabled={disabled}
          onClick={onSetup}
          style={{ ...primaryButtonStyle(theme, "0.45rem 0.8rem"), fontSize: "0.8rem" }}
        >
          {`Set up ${label}`}
        </button>
      )}
    </div>
  );
}

function SummaryRow({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
      <span style={{ fontSize: 12, color: theme.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: theme.text, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ChipList({ items, theme }: { items: string[]; theme: Theme }) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            fontSize: 12, fontWeight: 700, color: theme.text, background: theme.bg,
            border: `1px solid ${theme.border}`, borderRadius: 999, padding: "3px 9px",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function WseSlot({ label, name, theme }: { label: string; name: string | null | undefined; theme: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", border: `1px solid ${theme.border}`, borderRadius: 10, background: theme.bg }}>
      <div style={{ width: 26, height: 26, borderRadius: 4, background: theme.border, flexShrink: 0, opacity: 0.5 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted }}>{label}</div>
        <div style={{ fontSize: 12, color: name ? theme.text : theme.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
          {name ?? "not set up"}
        </div>
      </div>
    </div>
  );
}

function HexNode({ level, variant, locked, skill }: { level?: number; variant: "purple" | "blue" | "pink" | "empty"; locked?: boolean; skill?: HexaSkillDef }) {
  const [imgError, setImgError] = useState(false);
  const bg = { purple: "#1e1245", blue: "#0d1e38", pink: "#2a0a2a", empty: "transparent" }[variant];
  const border = { purple: "#7055c8", blue: "#4080c0", pink: "#c055c8", empty: "#c8c0b8" }[variant];
  const lvColor = { purple: "#a090d8", blue: "#6ea8d8", pink: "#d890d8", empty: "#999" }[variant];

  const iconSrc = skill?.iconUrl ?? (skill?.iconId ? resourceImageUrl("hexa-skill", skill.iconId, "icon.png") : null);
  const showImage = !!(skill && !locked && !imgError && iconSrc);

  let content: ReactNode;
  if (skill && !locked) {
    if (imgError || !iconSrc) {
      content = <span style={{ fontSize: 12, fontWeight: 800, color: lvColor }}>{skill.name.charAt(0)}</span>;
    } else {
      content = (
        <Image
          src={iconSrc}
          alt={skill.name}
          fill
          sizes="42px"
          unoptimized
          onError={() => setImgError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      );
    }
  } else {
    content = <div style={{ width: 22, height: 22, borderRadius: 3, background: locked ? "rgba(200,192,184,0.12)" : "rgba(255,255,255,0.07)" }} />;
  }

  return (
    <div title={skill?.name} style={hexNodeTileStyle(border, bg, showImage, locked)}>
      {level !== undefined && !locked && (
        <span style={hexNodeLevelBadgeStyle}>{String(level).padStart(2, "0")}</span>
      )}
      {content}
    </div>
  );
}

function resolveHexaClassDef(classId: string | undefined) {
  return classId ? findClassById(classId) : null;
}

function resolveHexaNotice(hasHexa: boolean, isLegacyClass: boolean): string | null {
  if (!hasHexa) {
    return isLegacyClass
      ? "HEXA skills are not available. This job requires 5th job advancement to access the HEXA Matrix."
      : "HEXA skills unlock at level 260.";
  }
  return null;
}

function resolveMainStatValue(character: StoredCharacterRecord | null, primaryId: string | undefined): string | null {
  if (!character || !primaryId) return null;
  const s = character.stats;
  if (primaryId === "str") return s.str.base || null;
  if (primaryId === "dex") return s.dex.base || null;
  if (primaryId === "int") return s.int.base || null;
  if (primaryId === "luk") return s.luk.base || null;
  if (primaryId === "hp") return s.hp.base || null;
  return null;
}

function readHexaLevels(charName: string | undefined): HexaSkillLevels | null {
  if (!charName) return null;
  const saved = readCharacterToolData<{ levels?: HexaSkillLevels }>(charName, "hexaSkills");
  return saved?.levels ?? null;
}

function isStatsFilled(character: StoredCharacterRecord | null): boolean {
  if (!character) return false;
  const s = character.stats;
  return Boolean(s.attackPower.base || s.bossDamage || s.str.base || s.dex.base || s.int.base || s.luk.base || s.hp.base);
}

type SingleEquipSlotKey = Exclude<keyof StoredCharacterEquipment["presets"][number], "rings" | "pendants">;

const EQUIPMENT_SLOT_LABELS: [SingleEquipSlotKey, string][] = [
  ["weapon", "Weapon"], ["secondary", "Secondary"], ["emblem", "Emblem"],
  ["badge", "Badge"], ["medal", "Medal"], ["hat", "Hat"], ["top", "Top"], ["bottom", "Bottom"],
  ["shoe", "Shoes"], ["glove", "Gloves"], ["cape", "Cape"], ["shoulder", "Shoulder"],
  ["belt", "Belt"], ["eye", "Eye Accessory"], ["face", "Face Accessory"], ["earring", "Earrings"],
  ["pocket", "Pocket"], ["heart", "Heart"], ["android", "Android"],
];

function OverviewBookmark({ model }: { model: PreviewPaneModel }) {
  const { theme, profile } = model;
  const character = profile.confirmedCharacter;
  const stats = character?.stats;
  const equip = character?.equipment;
  const equipGrid = equip?.presets?.[equip.activePreset] ?? equip?.presets?.[0];

  const [exportFlash, setExportFlash] = useState(false);
  function handleExport() {
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 2000);
  }

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const primaryId = classData?.requiredStats[0];
  const mainStatLabel = (primaryId && primaryId in MAIN_STAT_FIELDS) ? MAIN_STAT_FIELDS[primaryId as MainStatKey] : "Main Stat";
  const mainStatValue = resolveMainStatValue(character, primaryId);

  const keyStats = [
    { label: mainStatLabel, display: mainStatValue ?? "—" },
    { label: "Boss DMG", display: stats?.bossDamage ? `${stats.bossDamage}%` : "—" },
    { label: "IED", display: stats?.ignoreDefense ? `${stats.ignoreDefense}%` : "—" },
    { label: "Crit DMG", display: stats?.criticalDamage ? `${stats.criticalDamage}%` : "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>Overview</h3>
        <button type="button" onClick={handleExport} style={exportButtonStyle(theme)}>
          {!exportFlash && (
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
            </svg>
          )}
          {exportFlash ? "Coming soon" : "Export"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginBottom: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 2 }}>HEXA Stat</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: theme.muted, lineHeight: 1, fontFamily: "var(--font-heading)" }}>—</div>
          </div>
          <div>
            {keyStats.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 12, color: theme.muted }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.display !== "—" ? theme.text : theme.muted }}>{s.display}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 30 }}>
          <WseSlot label="Weapon" name={equipGrid?.weapon?.name} theme={theme} />
          <WseSlot label="Secondary" name={equipGrid?.secondary?.name} theme={theme} />
          <WseSlot label="Emblem" name={equipGrid?.emblem?.name} theme={theme} />
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: theme.muted, fontStyle: "italic" }}>
        Flip to a bookmark on the right for the full details behind each of these numbers.
      </p>
    </div>
  );
}

function GenderBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  let label: string | null = null;
  if (character?.gender === "male") label = "Male";
  else if (character?.gender === "female") label = "Female";
  if (!label) return null;
  return <SummaryRow label="Gender" value={label} theme={theme} />;
}

function MarriageBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const marriage = character?.marriage;
  if (!marriage || marriage.isMarried === null) return null;
  if (marriage.isMarried === false) return <SummaryRow label="Status" value="Not married" theme={theme} />;
  return (
    <>
      <SummaryRow label="Status" value="Married" theme={theme} />
      {marriage.partnerName && <SummaryRow label="Partner" value={marriage.partnerName} theme={theme} />}
    </>
  );
}

function StatsBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const s = character?.stats;
  const rows = [
    { label: "Attack Power", value: s?.attackPower?.base },
    { label: "Boss Damage", value: s?.bossDamage },
    { label: "Ignore Enemy DEF", value: s?.ignoreDefense },
    { label: "Critical Rate", value: s?.criticalRate },
    { label: "Critical Damage", value: s?.criticalDamage },
    { label: "Damage", value: s?.damage },
    { label: "Buff Duration", value: s?.buffDuration },
    { label: "Cooldown Skip", value: s?.cooldownSkip },
    { label: "STR", value: s?.str?.base },
    { label: "DEX", value: s?.dex?.base },
    { label: "INT", value: s?.int?.base },
    { label: "LUK", value: s?.luk?.base },
  ];
  return (
    <div>
      {rows.map((r) => (
        <SummaryRow key={r.label} label={r.label} value={r.value || "—"} theme={theme} />
      ))}
    </div>
  );
}

function EquipmentBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const equip = character?.equipment;
  const preset = equip?.presets?.[equip.activePreset] ?? equip?.presets?.[0];
  if (!preset) return null;

  // react-doctor-disable-next-line js-combine-iterations -- EQUIPMENT_SLOT_LABELS is a small fixed roster, extra pass is negligible per the rule's own FP criteria
  const filledSlots = EQUIPMENT_SLOT_LABELS
    .map(([key, label]) => ({ label, name: preset[key]?.name }))
    .filter((row) => row.name);
  // react-doctor-disable-next-line js-combine-iterations -- preset.rings is a small fixed-size array, extra pass is negligible per the rule's own FP criteria
  const ringRows = preset.rings
    .map((ring, i) => ({ label: `Ring ${i + 1}`, name: ring?.name }))
    .filter((row) => row.name);
  // react-doctor-disable-next-line js-combine-iterations -- preset.pendants is a small fixed-size array, extra pass is negligible per the rule's own FP criteria
  const pendantRows = preset.pendants
    .map((pendant, i) => ({ label: `Pendant ${i + 1}`, name: pendant?.name }))
    .filter((row) => row.name);
  const rows = [...filledSlots, ...ringRows, ...pendantRows];

  if (rows.length === 0 && !equip?.title) return null;

  return (
    <div>
      {equip?.title?.name && <SummaryRow label="Title" value={equip.title.name} theme={theme} />}
      {rows.map((r) => (
        <SummaryRow key={r.label} label={r.label} value={r.name ?? "—"} theme={theme} />
      ))}
    </div>
  );
}

function OzRingsBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const ozRings = character?.scouter?.ozRings;
  if (!ozRings) return null;
  const isContinuous = ozRings.ringMode === "continuous";
  const rows = isContinuous
    ? [{ label: "Continuous", level: ozRings.levels.continuous }]
    : [
        { label: "Restraint", level: ozRings.levels.restraint },
        { label: "Weapon Jump", level: ozRings.levels.weaponJump },
        { label: "Totalling", level: ozRings.levels.totalling },
      ];
  return (
    <div>
      <SummaryRow label="Mode" value={isContinuous ? "Continuous" : "Standard"} theme={theme} />
      {rows.map((r) => (
        <SummaryRow key={r.label} label={r.label} value={r.level ? `Lv. ${r.level}` : "—"} theme={theme} />
      ))}
    </div>
  );
}

function FamiliarsBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const data = character?.familiars;
  const preset = data?.presets?.[data.activePreset];
  if (!preset) return null;
  const filled = preset.familiars.filter((f) => f.name);
  if (filled.length === 0 && preset.badges.length === 0) return null;
  return (
    <div>
      {filled.map((f, i) => (
        // react-doctor-disable-next-line no-array-index-as-key
        <SummaryRow key={i} label={f.tier ? `${f.tier} Familiar` : "Familiar"} value={f.name} theme={theme} />
      ))}
      {preset.badges.length > 0 && <SummaryRow label="Badges" value={`${preset.badges.length} equipped`} theme={theme} />}
    </div>
  );
}

function LinkSkillsBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const worldId = character?.worldID;
  const levels = useMemo(() => {
    if (!mounted || worldId === undefined) return null;
    const store = readCharactersStore();
    return reconcileLinkSkills(store.linkSkillsByWorld[String(worldId)], selectCharactersList(store), worldId);
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `worldId` primitive, not the whole `character` object, to avoid re-running when unrelated fields change
  }, [mounted, worldId]);
  if (!levels) return null;
  // react-doctor-disable-next-line js-combine-iterations -- LINK_SKILLS is a small fixed roster, extra pass is negligible per the rule's own FP criteria
  const rows = LINK_SKILLS
    .map((skill) => ({ label: skill.name, level: levels[skill.id] }))
    .filter((row) => row.level);
  if (rows.length === 0) return null;
  return (
    <div>
      {rows.map((r) => (
        <SummaryRow key={r.label} label={r.label} value={`Lv. ${r.level}`} theme={theme} />
      ))}
    </div>
  );
}

function VMatrixBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const levels = character?.vMatrix?.levels;
  const leveled = levels ? Object.values(levels).filter((v) => v > 0).length : 0;
  if (leveled === 0) return null;
  return <SummaryRow label="Nodes leveled" value={String(leveled)} theme={theme} />;
}

function HexaMatrixBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const charName = character?.characterName;
  const level = character?.level ?? 0;
  const hexaLevels = useMemo(() => {
    if (!mounted) return null;
    const fromState = (character?.tools?.hexaSkills as { levels?: HexaSkillLevels } | undefined)?.levels;
    if (fromState) return fromState;
    return readHexaLevels(charName);
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `charName` primitive, not the whole `character` object, to avoid re-running when unrelated fields change
  }, [mounted, charName, character?.tools]);

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const hexaClassDef = resolveHexaClassDef(classId);
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const isLegacyClass = classData !== undefined && classData.buffSkills.length === 0 && classData.requiredStats.length === 0;
  const hasHexa = level >= 260 && !isLegacyClass;
  const hexaNotice = resolveHexaNotice(hasHexa, isLegacyClass);

  if (hexaNotice !== null) {
    return <p style={{ fontSize: 12, color: theme.muted, fontStyle: "italic", margin: 0 }}>{hexaNotice}</p>;
  }
  if (!hexaLevels) return null;

  const skillSlots: (HexaSkillDef | null)[] = [hexaClassDef?.origin ?? null, hexaClassDef?.ascent ?? null, null, null, null, null];
  const skillLevels = [hexaLevels.origin ?? 0, hexaLevels.ascent ?? 0, 0, 0, 0, 0];
  const commonLevels = [hexaLevels.common[0] ?? 0, hexaLevels.common[1] ?? 0, 0, 0];
  const masterySlots: (HexaSkillDef | null)[] = hexaClassDef
    ? hexaClassDef.mastery.map((node) => ({ name: node.skills[0], iconId: node.iconId, iconUrl: node.iconUrl }))
    : [null, null, null, null];
  const masteryLevels = hexaLevels.mastery ?? [0, 0, 0, 0];
  const enhancementSlots: (HexaSkillDef | null)[] = hexaClassDef?.enhancement ?? [null, null, null, null];
  const enhancementLevels = hexaLevels.enhancement ?? [0, 0, 0, 0];

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 10 }}>
        {hexaClassDef?.group === "SHINE" ? "Erda Link" : "6th Job · HEXA Skills"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Skill</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
              {skillSlots.map((skill, i) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <HexNode key={i} variant={skill ? "purple" : "empty"} skill={skill ?? undefined} locked={!skill} level={skill ? skillLevels[i] : undefined} />
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: theme.border }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Common</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
              {commonSlots.map((skill, i) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <HexNode key={i} variant={skill ? "blue" : "empty"} skill={skill ?? undefined} locked={!skill} level={skill ? commonLevels[i] : undefined} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: theme.border, alignSelf: "stretch" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Mastery</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
              {masterySlots.map((skill, i) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <HexNode key={i} variant="pink" skill={skill ?? undefined} level={masteryLevels[i] ?? 0} />
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: theme.border }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Boost</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
              {enhancementSlots.map((skill, i) => (
                // react-doctor-disable-next-line no-array-index-as-key
                <HexNode key={i} variant="blue" skill={skill ?? undefined} level={enhancementLevels[i] ?? 0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegionArtifactsBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const worldId = character?.worldID;
  const artifact = useMemo(() => {
    if (!mounted || worldId === undefined) return null;
    return readCharactersStore().legionArtifactByWorld[String(worldId)] ?? null;
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `worldId` primitive, not the whole `character` object, to avoid re-running when unrelated fields change
  }, [mounted, worldId]);
  if (!artifact?.artifactLevel) return null;
  const unlocked = LEGION_CRYSTALS.filter((c) => artifact.artifactLevel! >= c.requiredArtifactLevel).length;
  return (
    <div>
      <SummaryRow label="Artifact Level" value={String(artifact.artifactLevel)} theme={theme} />
      <SummaryRow label="Crystals Unlocked" value={`${unlocked} / ${LEGION_CRYSTALS.length}`} theme={theme} />
    </div>
  );
}

function BuffsBookmark({ theme, character }: { theme: Theme; character: StoredCharacterRecord | null }) {
  const buffs = character?.scouter?.buffs;
  if (!buffs) return null;

  // react-doctor-disable-next-line js-combine-iterations -- GUILD_BUFFS is a small fixed roster, extra pass is negligible per the rule's own FP criteria
  const guildRows = GUILD_BUFFS
    .map((b) => ({ label: b.name, level: buffs[b.id] }))
    .filter((row) => row.level);
  // react-doctor-disable-next-line js-combine-iterations -- BOOL_BUFFS is a small fixed roster, extra pass is negligible per the rule's own FP criteria
  const activeChips = BOOL_BUFFS.filter((b) => buffs[b.id]).map((b) => b.name);
  const renownRows = buffs.renown
    // react-doctor-disable-next-line js-combine-iterations -- RENOWN_STATS is a small fixed roster, extra pass is negligible per the rule's own FP criteria
    ? RENOWN_STATS
        .map((stat) => ({ label: stat.label, value: buffs.renown?.[stat.id] }))
        .filter((row) => row.value)
    : [];

  const hasAny = guildRows.length > 0 || activeChips.length > 0 || renownRows.length > 0 || buffs.statPotionValue;
  if (!hasAny) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {guildRows.map((r) => (
        <SummaryRow key={r.label} label={r.label} value={`Lv. ${r.level}`} theme={theme} />
      ))}
      {renownRows.map((r) => (
        <SummaryRow key={r.label} label={`Renown ${r.label}`} value={`+${r.value}`} theme={theme} />
      ))}
      {buffs.statPotionValue !== undefined && (
        <SummaryRow label="Stat Potion" value={`+${buffs.statPotionValue}`} theme={theme} />
      )}
      {activeChips.length > 0 && <ChipList items={activeChips} theme={theme} />}
    </div>
  );
}

function isHexaMatrixFilled(character: StoredCharacterRecord, mounted: boolean): boolean {
  if (character.level < 260) return false;
  const classId = resolveClassId(character.jobName);
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const isLegacyClass = classData !== undefined && classData.buffSkills.length === 0 && classData.requiredStats.length === 0;
  if (isLegacyClass) return true;
  if (!mounted) return false;
  const fromState = (character.tools?.hexaSkills as { levels?: HexaSkillLevels } | undefined)?.levels;
  return Boolean(fromState ?? readHexaLevels(character.characterName));
}

function isBookmarkFilled(id: BookmarkId, character: StoredCharacterRecord | null, mounted: boolean): boolean {
  if (!character) return false;
  switch (id) {
    case "overview": return true;
    case "gender": return character.gender !== null;
    case "marriage": return character.marriage !== null && character.marriage.isMarried !== null;
    case "stats": return isStatsFilled(character);
    case "equipment": {
      const equip = character.equipment;
      const preset = equip?.presets?.[equip.activePreset] ?? equip?.presets?.[0];
      return Boolean(equip?.title || preset && Object.values(preset).some((v) => v && typeof v === "object" && "name" in v && v.name));
    }
    case "oz_rings": return Boolean(character.scouter?.ozRings);
    case "familiars": {
      const preset = character.familiars?.presets?.[character.familiars.activePreset];
      return Boolean(preset && (preset.familiars.some((f) => f.name) || preset.badges.length > 0));
    }
    case "link_skills": {
      if (!mounted) return false;
      const store = readCharactersStore();
      const levels = reconcileLinkSkills(store.linkSkillsByWorld[String(character.worldID)], selectCharactersList(store), character.worldID);
      return Object.values(levels).some((v) => v);
    }
    case "v_matrix": {
      const levels = character.vMatrix?.levels;
      return Boolean(levels && Object.values(levels).some((v) => v > 0));
    }
    case "hexa_matrix": return isHexaMatrixFilled(character, mounted);
    case "legion_artifacts": {
      if (!mounted) return false;
      const artifact = readCharactersStore().legionArtifactByWorld[String(character.worldID)];
      return Boolean(artifact?.artifactLevel);
    }
    case "buffs": return Boolean(character.scouter?.buffs);
    default: return false;
  }
}

const BOOKMARK_CONTENT: Record<Exclude<BookmarkId, "overview">, (props: { theme: Theme; character: StoredCharacterRecord | null }) => ReactNode> = {
  gender: GenderBookmark,
  marriage: MarriageBookmark,
  stats: StatsBookmark,
  equipment: EquipmentBookmark,
  oz_rings: OzRingsBookmark,
  familiars: FamiliarsBookmark,
  link_skills: LinkSkillsBookmark,
  v_matrix: VMatrixBookmark,
  hexa_matrix: HexaMatrixBookmark,
  legion_artifacts: LegionArtifactsBookmark,
  buffs: BuffsBookmark,
};

function BookmarkSpine({
  theme, bookmarks, activeId, onSelect,
}: {
  theme: Theme;
  bookmarks: BookmarkDef[];
  activeId: BookmarkId;
  onSelect: (id: BookmarkId) => void;
}) {
  const tabRefs = useRef<Map<BookmarkId, HTMLButtonElement>>(new Map());

  // A page tablist should switch content immediately as focus moves (WAI-ARIA APG's
  // automatic-activation pattern) — unlike this codebase's picker-oriented
  // useKeyboardListNav hook, which highlights first and only confirms on Enter.
  function handleKeyDown(e: KeyboardEvent, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowDown") nextIndex = (index + 1) % bookmarks.length;
    else if (e.key === "ArrowUp") nextIndex = (index - 1 + bookmarks.length) % bookmarks.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = bookmarks.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    const next = bookmarks[nextIndex];
    onSelect(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  return (
    <div className="profile-binder-spine" role="tablist" aria-label="Character profile sections" aria-orientation="vertical">
      {bookmarks.map((b, i) => {
        const active = b.id === activeId;
        return (
          <button
            key={b.id}
            ref={(el) => { if (el) tabRefs.current.set(b.id, el); else tabRefs.current.delete(b.id); }}
            type="button"
            role="tab"
            id={`profile-tab-${b.id}`}
            aria-selected={active}
            aria-controls={`profile-page-${b.id}`}
            tabIndex={active ? 0 : -1}
            className={["profile-bookmark-tab", "tap-target-44", active ? "profile-bookmark-tab--active" : ""].filter(Boolean).join(" ")}
            onClick={() => onSelect(b.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            style={{ background: active ? `${theme.accent}18` : "transparent", color: active ? theme.accentText : theme.muted }}
          >
            {b.tabLabel}
          </button>
        );
      })}
    </div>
  );
}

export default function CharacterProfileOverviewScreen({
  model,
  actions,
}: CharacterProfileOverviewScreenProps) {
  const { theme, profile, setup } = model;
  const character = profile.confirmedCharacter;
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

  const bookmarks = useMemo(() => getVisibleBookmarks(character?.jobName), [character?.jobName]);
  const [activeId, setActiveId] = useState<BookmarkId>("overview");
  const active = bookmarks.find((b) => b.id === activeId) ?? bookmarks[0];

  const filled = isBookmarkFilled(active.id, character, mounted);
  const ContentComponent = active.id === "overview" ? null : BOOKMARK_CONTENT[active.id];

  function handleEdit() {
    if (active.flowId) actions.startOptionalFlow(active.flowId);
  }

  return (
    <div className="profile-binder">
      <div
        className="profile-binder-page"
        role="tabpanel"
        id={`profile-page-${active.id}`}
        aria-labelledby={`profile-tab-${active.id}`}
        tabIndex={0}
      >
        <div key={active.id} className="profile-binder-page-content">
          {active.id === "overview" ? (
            <OverviewBookmark model={model} />
          ) : (
            <>
              <BookmarkPageHeader theme={theme} label={active.pageLabel} onEdit={filled ? handleEdit : null} disabled={setup.isUiLocked} />
              {filled && ContentComponent ? <ContentComponent theme={theme} character={character} /> : null}
              {!filled && <EmptyBookmarkState theme={theme} label={active.pageLabel} onSetup={handleEdit} disabled={setup.isUiLocked} />}
            </>
          )}
        </div>
      </div>
      <BookmarkSpine theme={theme} bookmarks={bookmarks} activeId={active.id} onSelect={setActiveId} />
    </div>
  );
}
