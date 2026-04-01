import { useState } from "react";
import type { SetupFlowId } from "../../setup/flows";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle } from "../components/uiStyles";

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

function HexNode({ level, variant, locked }: { level?: number; variant: "purple" | "blue" | "pink" | "empty"; locked?: boolean }) {
  const bg = { purple: "#1e1245", blue: "#0d1e38", pink: "#2a0a2a", empty: "transparent" }[variant];
  const border = { purple: "#7055c8", blue: "#4080c0", pink: "#c055c8", empty: "#c8c0b8" }[variant];
  const lvColor = { purple: "#a090d8", blue: "#6ea8d8", pink: "#d890d8", empty: "#999" }[variant];
  return (
    <div style={{ width: 42, height: 42, borderRadius: 6, border: `1px solid ${border}`, background: bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", opacity: locked ? 0.22 : 1, flexShrink: 0 }}>
      {level !== undefined && !locked && (
        <span style={{ position: "absolute", top: 2, left: 3, fontSize: 8, fontWeight: 700, color: lvColor }}>
          {String(level).padStart(2, "0")}
        </span>
      )}
      <div style={{ width: 22, height: 22, borderRadius: 3, background: locked ? "rgba(200,192,184,0.12)" : "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

function OverviewTab({ model, actions }: { model: PreviewPaneModel; actions: PreviewPaneActions }) {
  const { theme, profile } = model;
  const character = profile.confirmedCharacter;
  const stats = character?.stats;
  const equip = character?.equipment;
  const level = character?.level ?? 0;
  const hasHexa = level >= 260;

  const keyStats = [
    { label: "Main Stat", value: null as string | null },
    { label: "Boss DMG", value: stats?.bossDamage || null },
    { label: "IED", value: stats?.ignoreDefense || null },
    { label: "Crit DMG", value: stats?.criticalDamage || null },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Export */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button
          type="button"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: theme.muted, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}
        >
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
          </svg>
          Export
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
                <span style={{ fontSize: 13, fontWeight: 700, color: s.value ? theme.text : theme.muted }}>{s.value ? `${s.value}%` : "—"}</span>
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
      {!hasHexa ? (
        <p style={{ fontSize: 12, color: theme.muted, fontStyle: "italic", margin: 0 }}>
          Hexa skills unlock at level 260
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
                  <HexNode variant="purple" level={0} /><HexNode variant="purple" level={0} />
                  <HexNode variant="empty" locked /><HexNode variant="empty" locked />
                  <HexNode variant="empty" locked /><HexNode variant="empty" locked />
                </div>
              </div>
              <div style={{ height: 1, background: theme.border }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Common</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
                  <HexNode variant="blue" level={0} />
                  <HexNode variant="empty" locked /><HexNode variant="empty" locked /><HexNode variant="empty" locked />
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
                  <HexNode variant="pink" level={0} /><HexNode variant="pink" level={0} />
                  <HexNode variant="pink" level={0} /><HexNode variant="pink" level={0} />
                </div>
              </div>
              <div style={{ height: 1, background: theme.border }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: theme.muted, marginBottom: 2 }}>Boost</div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap" as const }}>
                  <HexNode variant="blue" level={0} /><HexNode variant="blue" level={0} />
                  <HexNode variant="blue" level={0} /><HexNode variant="blue" level={0} />
                </div>
              </div>
            </div>
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
        {activeTab === "overview" && <OverviewTab model={model} actions={actions} />}
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
