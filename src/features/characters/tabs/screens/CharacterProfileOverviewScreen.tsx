import { useState, useMemo, useSyncExternalStore } from "react";
import type { SetupFlowId } from "../../setup/flows";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle } from "../components/uiStyles";
import { findClassById, COMMON_SKILLS, type HexaSkillDef, type HexaSkillLevels } from "../../../tools/hexa-skills/hexa-classes";
import { resolveClassId } from "../../setup/data/nexonJobMapping";
import { CLASS_SKILL_DATA } from "../../setup/data/classSkillData";
import { WikiAttribution } from "../../../../components/WikiAttribution";

interface CharacterProfileOverviewScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

type TabId = "overview" | "stats" | "inventory" | "more";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "inventory", label: "Inventory" },
  { id: "more", label: "More" },
];

const MAIN_STAT_FIELDS = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "HP" } as const;
type MainStatKey = keyof typeof MAIN_STAT_FIELDS;

function WseSlot({
  label,
  name,
  theme,
}: {
  label: string;
  name: string | null | undefined;
  theme: PreviewPaneModel["theme"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        background: theme.bg,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 4,
          background: theme.border,
          flexShrink: 0,
          opacity: 0.5,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: name ? theme.text : theme.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
          {name ?? "not set up"}
        </div>
      </div>
    </div>
  );
}

function HexNode({
  level,
  variant,
  locked,
  skill,
}: {
  level?: number;
  variant: "purple" | "blue" | "pink" | "empty";
  locked?: boolean;
  skill?: HexaSkillDef;
}) {
  const [imgError, setImgError] = useState(false);
  const bg = { purple: "#1e1245", blue: "#0d1e38", pink: "#2a0a2a", empty: "transparent" }[variant];
  const border = { purple: "#7055c8", blue: "#4080c0", pink: "#c055c8", empty: "#c8c0b8" }[variant];
  const lvColor = { purple: "#a090d8", blue: "#6ea8d8", pink: "#d890d8", empty: "#999" }[variant];

  const showImage = !!(skill && !locked && !imgError);

  let content: React.ReactNode;
  if (skill && !locked) {
    if (imgError) {
      content = <span style={{ fontSize: 10, fontWeight: 800, color: lvColor }}>{skill.name.charAt(0)}</span>;
    } else {
      content = (
        <img
          src={skill.icon}
          alt={skill.name}
          onError={() => setImgError(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
      );
    }
  } else {
    content = <div style={{ width: 22, height: 22, borderRadius: 3, background: locked ? "rgba(200,192,184,0.12)" : "rgba(255,255,255,0.07)" }} />;
  }

  return (
    <div title={skill?.name} style={{ width: 42, height: 42, borderRadius: 6, border: `1px solid ${border}`, background: showImage ? "transparent" : bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", opacity: locked ? 0.22 : 1, flexShrink: 0 }}>
      {level !== undefined && !locked && (
        <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,0.65)", borderRadius: 999, padding: "1px 4px", lineHeight: 1.4, zIndex: 1, whiteSpace: "nowrap" }}>
          {String(level).padStart(2, "0")}
        </span>
      )}
      {content}
    </div>
  );
}

function resolveHexaNotice(hasHexa: boolean, isLegacyClass: boolean, classId: string | undefined): string | null {
  if (!hasHexa) {
    return isLegacyClass
      ? "Hexa skills are not available. This job requires 5th job advancement to access the Hexa Matrix."
      : "Hexa skills unlock at level 260.";
  }
  if (classId === "sia_astelle") {
    return "Sia Astelle uses the Erda Link system instead of the Hexa Matrix. Full support coming soon.";
  }
  return null;
}

function resolveMainStatValue(
  character: PreviewPaneModel["profile"]["confirmedCharacter"],
  primaryId: string | undefined,
): string | null {
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
  try {
    const raw = localStorage.getItem(`hexa-skills-v1-${charName}`);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { levels?: HexaSkillLevels };
    return saved.levels ?? null;
  } catch {
    return null;
  }
}

function OverviewTab({ model }: { model: PreviewPaneModel }) {
  const { theme, profile } = model;
  const character = profile.confirmedCharacter;
  const stats = character?.stats;
  const equip = character?.equipment;
  const level = character?.level ?? 0;

  const [exportFlash, setExportFlash] = useState(false);

  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const charName = character?.characterName;
  const hexaLevels = useMemo(
    () => (mounted ? readHexaLevels(charName) : null),
    [mounted, charName],
  );

  function handleExport() {
    setExportFlash(true);
    setTimeout(() => setExportFlash(false), 2000);
  }

  const classId = character ? resolveClassId(character.jobName) : undefined;
  const hexaClassDef = classId ? findClassById(classId) : null;
  const classData = classId ? CLASS_SKILL_DATA.find((c) => c.id === classId) : undefined;
  const isLegacyClass = classData !== undefined && classData.buffSkills.length === 0 && classData.requiredStats.length === 0;
  const hasHexa = level >= 260 && !isLegacyClass;

  const primaryId = classData?.requiredStats[0];
  const mainStatLabel = (primaryId && primaryId in MAIN_STAT_FIELDS)
    ? MAIN_STAT_FIELDS[primaryId as MainStatKey]
    : "Main Stat";
  const mainStatValue = resolveMainStatValue(character, primaryId);

  const keyStats = [
    { label: mainStatLabel, display: mainStatValue ?? "—" },
    { label: "Boss DMG", display: stats?.bossDamage ? `${stats.bossDamage}%` : "—" },
    { label: "IED", display: stats?.ignoreDefense ? `${stats.ignoreDefense}%` : "—" },
    { label: "Crit DMG", display: stats?.criticalDamage ? `${stats.criticalDamage}%` : "—" },
  ];

  const skillSlots: (HexaSkillDef | null)[] = [
    hexaClassDef?.origin ?? null,
    hexaClassDef?.ascent ?? null,
    null, null, null, null,
  ];
  const skillLevels = [
    hexaLevels?.origin ?? 0,
    hexaLevels?.ascent ?? 0,
    0, 0, 0, 0,
  ];
  const commonSlots: (HexaSkillDef | null)[] = [COMMON_SKILLS[0] ?? null, null, null, null];
  const commonLevels = [hexaLevels?.common[0] ?? 0, 0, 0, 0];
  const masterySlots: (HexaSkillDef | null)[] = hexaClassDef
    ? hexaClassDef.mastery.map((node) => node[0] ?? null)
    : [null, null, null, null];
  const masteryLevels = hexaLevels?.mastery ?? [0, 0, 0, 0];
  const enhancementSlots: (HexaSkillDef | null)[] = hexaClassDef?.enhancement ?? [null, null, null, null];
  const enhancementLevels = hexaLevels?.enhancement ?? [0, 0, 0, 0];

  const hexaNotice = resolveHexaNotice(hasHexa, isLegacyClass, classId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Export */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          type="button"
          onClick={handleExport}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}
        >
          {!exportFlash && (
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
            </svg>
          )}
          {exportFlash ? "Coming soon" : "Export"}
        </button>
      </div>

      {/* Hexa stat + key stats + WSE */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginBottom: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 2 }}>Hexa Stat</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: theme.muted, lineHeight: 1, fontFamily: "var(--font-heading)" }}>—</div>
          </div>
          <div>
            {keyStats.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: `1px solid ${theme.border}` }}>
                <span style={{ fontSize: 12, color: theme.muted }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.display !== "—" ? theme.text : theme.muted }}>
                  {s.display}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 30 }}>
          <WseSlot label="Weapon" name={equip?.weapon?.name} theme={theme} />
          <WseSlot label="Secondary" name={equip?.secondary?.name} theme={theme} />
          <WseSlot label="Emblem" name={equip?.emblem?.name} theme={theme} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: theme.border, margin: "0 -1rem 14px" }} />

      {/* Hexa skills */}
      {hexaNotice !== null ? (
        <p style={{ fontSize: 12, color: theme.muted, fontStyle: "italic", margin: 0 }}>
          {hexaNotice}
        </p>
      ) : (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 10 }}>6th Job · Hexa Skills</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 14, alignItems: "start" }}>
            {/* Left: Skill + Common */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Skill</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
                  {skillSlots.map((skill, i) => (
                    <HexNode
                      key={i}
                      variant={skill ? "purple" : "empty"}
                      skill={skill ?? undefined}
                      locked={!skill}
                      level={skill ? skillLevels[i] : undefined}
                    />
                  ))}
                </div>
              </div>
              <div style={{ height: 1, background: theme.border }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Common</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
                  {commonSlots.map((skill, i) => (
                    <HexNode
                      key={i}
                      variant={skill ? "blue" : "empty"}
                      skill={skill ?? undefined}
                      locked={!skill}
                      level={skill ? commonLevels[i] : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ background: theme.border, alignSelf: "stretch" }} />

            {/* Right: Mastery + Boost */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Mastery</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
                  {masterySlots.map((skill, i) => (
                    <HexNode key={i} variant="pink" skill={skill ?? undefined} level={masteryLevels[i] ?? 0} />
                  ))}
                </div>
              </div>
              <div style={{ height: 1, background: theme.border }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Boost</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
                  {enhancementSlots.map((skill, i) => (
                    <HexNode key={i} variant="blue" skill={skill ?? undefined} level={enhancementLevels[i] ?? 0} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <WikiAttribution theme={theme} subject="Skill icons" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatsTab({ model }: { model: PreviewPaneModel }) {
  const { theme, profile } = model;
  const s = profile.confirmedCharacter?.stats;
  const rows = [
    { label: "Main Stat", value: undefined as string | undefined },
    { label: "Attack Power", value: s?.attackPower?.base },
    { label: "Boss Damage", value: s?.bossDamage },
    { label: "Ignore Enemy DEF", value: s?.ignoreDefense },
    { label: "Critical Rate", value: s?.criticalRate },
    { label: "Critical Damage", value: s?.criticalDamage },
    { label: "Damage", value: s?.damage },
    { label: "Buff Duration", value: s?.buffDuration },
    { label: "Cooldown Skip", value: s?.cooldownSkip },
    { label: "Arcane Force", value: s?.arcanePower },
    { label: "Sacred Power", value: s?.sacredPower },
    { label: "Hexa Stat", value: undefined },
  ];
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: 12, color: theme.muted }}>{r.label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: r.value ? theme.text : theme.muted }}>{r.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

function InventoryTab({ model }: { model: PreviewPaneModel }) {
  const { theme } = model;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
      {Array.from({ length: 32 }, (_, i) => (
        <div key={i} style={{ aspectRatio: "1", borderRadius: 6, border: `1px dashed ${theme.border}`, background: theme.bg }} />
      ))}
    </div>
  );
}

function MoreTab({ model, actions }: { model: PreviewPaneModel; actions: PreviewPaneActions }) {
  const { theme, setup } = model;
  const flows: { id: SetupFlowId; label: string; desc: string }[] = [
    { id: "v_matrix_flow", label: "V Matrix", desc: "Node slots and matrix details" },
    { id: "familiars_flow", label: "Familiars", desc: "Familiar presets and badge effects" },
    { id: "link_skills_flow", label: "Link Skills", desc: "Active link preset details" },
    { id: "legion_account_flow", label: "Legion", desc: "Account-level legion and roster" },
    { id: "hexa_matrix_flow", label: "Hexa Matrix", desc: "Hexa skills and hexa stat details" },
  ];
  return (
    <div style={{ display: "grid", gap: "0.55rem" }}>
      {flows.map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", border: `1px solid ${theme.border}`, borderRadius: "12px", background: theme.bg, padding: "0.7rem 0.85rem" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: theme.text, lineHeight: 1.2 }}>{f.label}</p>
            <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.76rem", fontWeight: 700, color: theme.muted, lineHeight: 1.3 }}>{f.desc}</p>
          </div>
          <button
            type="button"
            disabled={setup.isUiLocked}
            onClick={() => actions.startOptionalFlow(f.id)}
            style={{ ...primaryButtonStyle(theme, "0.4rem 0.75rem"), flexShrink: 0, fontSize: "0.8rem" }}
          >
            Set up
          </button>
        </div>
      ))}
    </div>
  );
}

export default function CharacterProfileOverviewScreen({
  model,
  actions,
}: CharacterProfileOverviewScreenProps) {
  const { theme } = model;
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div style={{ position: "relative" }}>
      {/* Main content */}
      <div>
        {activeTab === "overview" && <OverviewTab model={model} />}
        {activeTab === "stats" && <StatsTab model={model} />}
        {activeTab === "inventory" && <InventoryTab model={model} />}
        {activeTab === "more" && <MoreTab model={model} actions={actions} />}
      </div>

      {/* Binder tabs — escape the panel to the right via absolute + calc */}
      <div style={{ position: "absolute", top: "0rem", left: "calc(100% + 1rem)", display: "flex", flexDirection: "column", gap: 2 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: activeTab === tab.id ? theme.text : theme.muted,
              background: activeTab === tab.id ? theme.panel : theme.bg,
              border: `1px solid ${theme.border}`,
              borderLeft: "none",
              borderRadius: "0 8px 8px 0",
              whiteSpace: "nowrap",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
