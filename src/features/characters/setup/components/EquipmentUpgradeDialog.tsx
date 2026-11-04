"use client";

// The equipment upgrade window: the preset's gear down a rail on the left, the picked item's
// Star Force and flames on the right. Edits stay in the window until Save.

import { useState, type CSSProperties } from "react";
import ModalShell from "../../../../components/ModalShell";
import { dialogBtnColors, dialogPrimaryBtnColors, type AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import { ToolNumberInput } from "../../../tools/shared-ui";
import { SLOT_LABELS, type EquipmentItem, type SlotKey } from "../data/equipmentStepDraft";
import { isUpgradeable, type EquipInfo } from "../data/equipmentInfo";
import {
  FLAME_LINES, MAX_FLAME_LINES, flameContributions, flameLinesFor, flameTiers, flameValue, formatFlameValue,
  type FlameLineId, type StoredFlameLine,
} from "../data/flameData";
import { useEquipInfo } from "../data/useEquipInfo";
import EquipItemIcon from "./EquipItemIcon";

export interface UpgradeEntry {
  slot: SlotKey;
  item: EquipmentItem;
  /** The preset whose item this is (1-3): Preset 1 for a slot still mirroring it. */
  preset: number;
}

export interface ItemUpgrades {
  starForce?: number;
  flame?: StoredFlameLine[];
}

const upgradesOf = (item: EquipmentItem): ItemUpgrades => ({ starForce: item.starForce, flame: item.flame });

const dialogCss = `
  .upgrade-dialog { container-type: inline-size; }
  .upgrade-body { display: grid; grid-template-columns: 200px 1fr; min-height: 0; flex: 1; }
  .upgrade-rail { border-right: 1px solid var(--up-border); padding: 12px 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
  .upgrade-tile { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: 10px; border: 1px solid transparent; cursor: pointer; }
  .upgrade-tile:hover { background: var(--up-hover); }
  .upgrade-tile:focus-visible { outline: 2px solid var(--up-accent); outline-offset: 1px; }
  .upgrade-tile.is-on { background: var(--up-soft); border-color: var(--up-accent); }
  .upgrade-pane { padding: 18px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
  .upgrade-line { position: relative; }
  .upgrade-line select { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; }
  .upgrade-line:focus-within .upgrade-line-box { outline: 2px solid var(--up-accent); outline-offset: 2px; }
  @container (max-width: 560px) {
    .upgrade-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .upgrade-rail { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--up-border); padding: 8px; }
    .upgrade-tile { flex-direction: column; gap: 2px; min-width: 58px; text-align: center; }
    .upgrade-tile-name { display: none; }
    .upgrade-pane { padding: 14px 16px; }
  }
`;

const labelStyle = (theme: AppTheme): CSSProperties => ({
  display: "block", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
  color: theme.muted, marginBottom: 5,
});

const lineBoxStyle = (theme: AppTheme, empty: boolean): CSSProperties => ({
  height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
  padding: "0 12px", fontSize: "0.85rem", fontWeight: 700, background: theme.bg,
  border: `1px ${empty ? "dashed" : "solid"} ${theme.border}`, color: empty ? theme.muted : theme.text,
});

const iconBtnStyle = (theme: AppTheme): CSSProperties => ({
  background: "none", border: "none", padding: 6, cursor: "pointer", color: theme.muted, lineHeight: 0, borderRadius: 6,
});

/** Champion Gold, the app's colour for stars, tuned per colour mode. */
const starInk = (theme: AppTheme) => (theme.colorMode === "dark" ? "#f0c869" : "#8c5b16");

function StarIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: -1 }}>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function RailTile({ theme, entry, info, upgrades, active, onPick }: {
  theme: AppTheme; entry: UpgradeEntry; info: EquipInfo | null | undefined; upgrades: ItemUpgrades; active: boolean; onPick: () => void;
}) {
  const stars = upgrades.starForce ?? 0;
  return (
    <button type="button" className={`upgrade-tile${active ? " is-on" : ""}`} aria-current={active} onClick={onPick} aria-label={`${SLOT_LABELS[entry.slot]}: ${entry.item.name}`}>
      <EquipItemIcon id={entry.item.id} name={entry.item.name} theme={theme} size={34} />
      <span style={{ minWidth: 0 }}>
        <b className="upgrade-tile-name" style={{ display: "block", fontSize: "0.8rem", color: theme.text }}>{SLOT_LABELS[entry.slot]}</b>
        {info && info.maxStars > 0 && (
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: stars > 0 ? starInk(theme) : theme.muted }}>
            {stars}<StarIcon />
          </span>
        )}
      </span>
    </button>
  );
}

function FlameLineRow({ theme, info, line, taken, onChange, onRemove }: {
  theme: AppTheme; info: EquipInfo; line: StoredFlameLine | null; taken: ReadonlySet<FlameLineId>;
  onChange: (line: StoredFlameLine) => void; onRemove?: () => void;
}) {
  const options = flameLinesFor(info).filter((id) => id === line?.line || !taken.has(id));
  const known = line && FLAME_LINES[line.line] ? line : null;
  const value = known ? formatFlameValue(known.line, flameValue(known.line, known.tier, info)) : null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 28px", gap: 6, alignItems: "center" }}>
      <div className="upgrade-line">
        <div className="upgrade-line-box" style={lineBoxStyle(theme, !known)}>
          {known ? (
            <>
              <span>{FLAME_LINES[known.line].label}</span>
              <span style={{ color: statusText(theme, "success"), fontWeight: 800 }}>
                {value} <span style={{ color: theme.muted, fontSize: "0.75rem", marginLeft: 6 }}>T{known.tier}</span>
              </span>
            </>
          ) : <span>Add a flame line</span>}
        </div>
        <select
          aria-label={known ? `Flame line: ${FLAME_LINES[known.line].label} ${value}` : "Add a flame line"}
          value={known ? `${known.line}:${known.tier}` : ""}
          onChange={(e) => {
            const [id, tier] = e.target.value.split(":");
            if (id && tier) onChange({ line: id as FlameLineId, tier: Number(tier) });
          }}
        >
          {!known && <option value="">Add a flame line</option>}
          {options.map((id) => (
            <optgroup key={id} label={FLAME_LINES[id].label}>
              {flameTiers(id, info).map((tier) => (
                <option key={tier} value={`${id}:${tier}`}>
                  {FLAME_LINES[id].label} {formatFlameValue(id, flameValue(id, tier, info))} (T{tier})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {onRemove ? (
        <button type="button" aria-label="Remove line" onClick={onRemove} style={iconBtnStyle(theme)}><CloseIcon /></button>
      ) : <span />}
    </div>
  );
}

function flameTotals(lines: StoredFlameLine[], info: EquipInfo): { label: string; text: string }[] {
  const totals = new Map<string, { value: number; line: FlameLineId }>();
  for (const { line, tier } of lines) {
    if (!FLAME_LINES[line]) continue;
    for (const [label, value] of flameContributions(line, flameValue(line, tier, info))) {
      const prev = totals.get(label);
      totals.set(label, { value: (prev?.value ?? 0) + value, line });
    }
  }
  return [...totals].map(([label, { value, line }]) => ({ label, text: formatFlameValue(line, value) }));
}

function FlameSection({ theme, info, lines, onChange }: {
  theme: AppTheme; info: EquipInfo; lines: StoredFlameLine[]; onChange: (lines: StoredFlameLine[]) => void;
}) {
  const taken = new Set(lines.map((l) => l.line));
  const totals = flameTotals(lines, info);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={labelStyle(theme)}>Flame</span>
      {lines.map((line, i) => (
        <FlameLineRow
          key={line.line}
          theme={theme} info={info} line={line} taken={taken}
          onChange={(next) => onChange(lines.map((l, j) => (j === i ? next : l)))}
          onRemove={() => onChange(lines.filter((_, j) => j !== i))}
        />
      ))}
      {lines.length < MAX_FLAME_LINES && (
        <FlameLineRow theme={theme} info={info} line={null} taken={taken} onChange={(next) => onChange([...lines, next])} />
      )}
      {totals.length > 0 && (
        <div style={{ marginTop: 4, padding: "9px 12px", borderRadius: 10, background: theme.timerBg, display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: "0.8rem", fontWeight: 800 }}>
          {totals.map(({ label, text }) => (
            <span key={label}>{label} <span style={{ color: statusText(theme, "success") }}>{text}</span></span>
          ))}
        </div>
      )}
    </section>
  );
}

function ItemPane({ theme, entry, info, upgrades, onChange }: {
  theme: AppTheme; entry: UpgradeEntry; info: EquipInfo | null | undefined; upgrades: ItemUpgrades; onChange: (next: ItemUpgrades) => void;
}) {
  return (
    <div className="upgrade-pane">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.bg, display: "grid", placeItems: "center" }}>
          <EquipItemIcon id={entry.item.id} name={entry.item.name} theme={theme} size={44} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: "Fredoka, sans-serif", fontSize: "1.15rem", color: theme.text }}>
            {entry.item.name}
            {info?.bossReward && (
              <span style={{ marginLeft: 8, verticalAlign: 2, fontFamily: "Nunito, sans-serif", fontSize: "0.75rem", fontWeight: 800, color: starInk(theme), border: "1px solid #d7a047", borderRadius: 6, padding: "1px 6px" }}>
                Boss
              </span>
            )}
          </h2>
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>
            {info ? `Lv. ${info.level} · ` : ""}Preset {entry.preset}
          </p>
        </div>
      </div>
      {info === undefined && <p style={{ margin: 0, fontSize: "0.8rem", color: theme.muted }}>Loading…</p>}
      {info === null && <p style={{ margin: 0, fontSize: "0.8rem", color: theme.muted }}>No upgrade data for this item.</p>}
      {info && info.maxStars > 0 && (
        <div>
          <span style={labelStyle(theme)}>Star Force</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ToolNumberInput
              value={upgrades.starForce ?? 0} min={0} max={info.maxStars} integer
              onCommit={(starForce) => onChange({ ...upgrades, starForce })}
              aria-label="Star Force" style={{ width: 90, color: theme.text, background: theme.bg, borderColor: theme.border }}
            />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.muted }}>/ {info.maxStars}</span>
          </div>
        </div>
      )}
      {info?.flameable && (
        <FlameSection theme={theme} info={info} lines={upgrades.flame ?? []} onChange={(flame) => onChange({ ...upgrades, flame })} />
      )}
    </div>
  );
}

/** Opened from an equipped item's picker. `entries` is the preset's equipped gear in rail
 *  order; items that take neither Star Force nor flames drop out once their data loads. */
export default function EquipmentUpgradeDialog({ theme, entries, initialSlot, onSave, onClose }: {
  theme: AppTheme;
  entries: UpgradeEntry[];
  /** The item to start on; without one, the first item that takes Star Force or flames. */
  initialSlot?: SlotKey;
  onSave: (changes: Partial<Record<SlotKey, ItemUpgrades>>) => void;
  onClose: () => void;
}) {
  const infos = useEquipInfo(entries);
  const [current, setCurrent] = useState<SlotKey | undefined>(initialSlot);
  const [edits, setEdits] = useState<Partial<Record<SlotKey, ItemUpgrades>>>({});
  const rail = entries.filter((e) => e.slot === initialSlot || infos[e.slot] === undefined || isUpgradeable(infos[e.slot]));
  const entry = rail.find((e) => e.slot === current) ?? rail.find((e) => isUpgradeable(infos[e.slot])) ?? rail[0];
  const upgradesFor = (e: UpgradeEntry) => edits[e.slot] ?? upgradesOf(e.item);
  const vars = { "--up-border": theme.border, "--up-accent": theme.accent, "--up-soft": theme.accentSoft, "--up-hover": "rgba(127,127,127,0.14)" } as CSSProperties;

  return (
    <ModalShell
      theme={theme} ariaLabel="Enhancements" onClose={onClose} className="upgrade-dialog"
      style={{ ...vars, width: "min(780px, 100%)", height: "min(640px, 88vh)", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <style>{dialogCss}</style>
      <div className="upgrade-body">
        <nav className="upgrade-rail" aria-label="Equipped items">
          {rail.map((e) => (
            <RailTile key={e.slot} theme={theme} entry={e} info={infos[e.slot]} upgrades={upgradesFor(e)} active={e === entry} onPick={() => setCurrent(e.slot)} />
          ))}
        </nav>
        {entry && (
          <ItemPane
            key={entry.slot} theme={theme} entry={entry} info={infos[entry.slot]} upgrades={upgradesFor(entry)}
            onChange={(next) => setEdits((prev) => ({ ...prev, [entry.slot]: next }))}
          />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, padding: "12px 18px", borderTop: `1px solid ${theme.border}` }}>
        <button type="button" onClick={onClose} className="tool-btn tool-dialog-btn" style={dialogBtnColors(theme)}>Cancel</button>
        <button type="button" onClick={() => { onSave(edits); onClose(); }} className="tool-btn tool-dialog-btn" style={dialogPrimaryBtnColors(theme)}>Save</button>
      </div>
    </ModalShell>
  );
}
