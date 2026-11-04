"use client";

// The equipment upgrade window: the preset's gear down a rail on the left, the picked item's
// Star Force and flames on the right. Every change saves as it's made, so closing the window
// (a misclick outside it included) never loses anything.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { searchAndRank } from "../../../../lib/searchMatch";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import ModalShell from "../../../../components/ModalShell";
import { dialogPrimaryBtnColors, type AppTheme } from "../../../../components/themes";
import { STATUS, statusText } from "../../../../components/statusColors";
import { NavChevron } from "../../DropdownChevron";
import { clampNumber, numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
import { statInputStyle } from "./QuestionControls";
import { SLOT_LABELS, type EquipmentItem, type SlotKey } from "../data/equipmentStepDraft";
import { isUpgradeable, type EquipInfo } from "../data/equipmentInfo";
import {
  FLAME_LINES, MAX_FLAME_LINES, flameContributions, flameLinesFor, flameTiers, flameValue, formatFlameValue,
  type FlameLineId, type StoredFlameLine,
} from "../data/flameData";
import { useEquipInfo } from "../data/useEquipInfo";
import { edgeFadeMask, useScrollEdges } from "../../../../lib/useScrollEdges";
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
  .upgrade-stat-input:focus { outline: 2px solid var(--up-accent); outline-offset: 2px; }
  .upgrade-stat-input::placeholder { color: inherit; opacity: 0.6; }
  @container (max-width: 560px) {
    .upgrade-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    /* Fades whichever end still has more gear to scroll to, like the profile binder spine.
       Only here: the desktop rail is a vertical list this horizontal mask would clip. */
    .upgrade-rail { flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--up-border); padding: 8px; mask-image: var(--rail-fade); -webkit-mask-image: var(--rail-fade); }
    .upgrade-tile { flex-direction: column; gap: 2px; min-width: 58px; flex-shrink: 0; text-align: center; }
    .upgrade-pane { padding: 14px 16px; }
  }
`;

const labelStyle = (theme: AppTheme): CSSProperties => ({
  display: "block", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
  color: theme.muted, marginBottom: 5,
});

const statBoxStyle = (theme: AppTheme): CSSProperties => ({
  boxSizing: "border-box", width: "100%", height: 36, borderRadius: 8, padding: "0 10px",
  font: "inherit", fontSize: "0.85rem", fontWeight: 700, background: theme.bg, outline: "none",
  border: `1px solid ${theme.border}`, color: theme.text,
});

// A line as the game's Bonus Stats panel shows it; dashed when it's the empty "add" row.
const flameRowStyle = (theme: AppTheme, empty: boolean, open: boolean): CSSProperties => ({
  flex: 1, minWidth: 0, height: 36, display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
  borderRadius: 8, cursor: "pointer", font: "inherit", fontSize: "0.85rem", fontWeight: 700, textAlign: "left",
  background: theme.bg, color: empty ? theme.muted : theme.text,
  border: `1px ${empty ? "dashed" : "solid"} ${open ? theme.accent : theme.border}`,
});

// The tier number in a small square, like the game's teal flame tier marks.
const tierBadgeStyle: CSSProperties = {
  width: 18, height: 18, borderRadius: 4, display: "grid", placeItems: "center", flexShrink: 0,
  fontSize: "0.75rem", fontWeight: 800, background: STATUS.success.fill, color: STATUS.success.on,
};

const chooserStyle = (theme: AppTheme): CSSProperties => ({
  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 2, padding: 8,
  borderRadius: 10, background: theme.panel, border: `1px solid ${theme.accent}`,
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", gap: 6,
});

const chooserBackStyle = (theme: AppTheme): CSSProperties => ({
  all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
  padding: "2px 6px 2px 2px", borderRadius: 6, fontSize: "0.85rem", fontWeight: 800, color: theme.text,
});

const statOptionStyle = (theme: AppTheme, highlighted: boolean, selected: boolean): CSSProperties => ({
  all: "unset", boxSizing: "border-box", cursor: "pointer", padding: "7px 10px", borderRadius: 6,
  fontSize: "0.85rem", fontWeight: selected ? 800 : 700, color: selected ? theme.accentText : theme.text,
  background: highlighted ? "rgba(127,127,127,0.14)" : "transparent",
});

const tierButtonStyle = (theme: AppTheme, selected: boolean): CSSProperties => ({
  padding: "5px 0", borderRadius: 8, cursor: "pointer", font: "inherit", textAlign: "center",
  background: selected ? theme.accentSoft : theme.bg, border: `1px solid ${selected ? theme.accent : theme.border}`,
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
        <b style={{ display: "block", whiteSpace: "nowrap", fontSize: "0.8rem", color: theme.text }}>{SLOT_LABELS[entry.slot]}</b>
        {info && info.maxStars > 0 && (
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: stars > 0 ? starInk(theme) : theme.muted }}>
            {stars}<StarIcon />
          </span>
        )}
      </span>
    </button>
  );
}

/** One button per tier the item can roll, each showing that tier's real value. */
function TierButtons({ theme, info, line, tier, onPick }: {
  theme: AppTheme; info: EquipInfo; line: FlameLineId; tier: number | null; onPick: (tier: number) => void;
}) {
  const tiers = flameTiers(line, info);
  return (
    <div role="radiogroup" aria-label={`${FLAME_LINES[line].label} tier`} style={{ display: "grid", gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 4 }}>
      {tiers.map((t) => (
        <button key={t} type="button" role="radio" aria-checked={t === tier} onClick={() => onPick(t)} style={tierButtonStyle(theme, t === tier)}>
          <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, color: t === tier ? statusText(theme, "success") : theme.text }}>
            {formatFlameValue(line, flameValue(line, t, info))}
          </span>
          <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>T{t}</span>
        </button>
      ))}
    </div>
  );
}

/** The chooser under a line: search the stats, then pick the tier. Picking a tier saves and
 *  closes; Escape or a click outside closes without changing anything. */
function FlameChooser({ theme, info, options, current, onPick, onClose }: {
  theme: AppTheme; info: EquipInfo; options: FlameLineId[]; current: StoredFlameLine | null;
  onPick: (line: StoredFlameLine) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [stat, setStat] = useState<FlameLineId | null>(current?.line ?? null);
  const results = searchAndRank(options, query, (id) => FLAME_LINES[id].label);
  const nav = useKeyboardListNav({ items: results, resetKey: query, onSelect: (id) => setStat(id) });
  const rootRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    }
    // Escape closes just this chooser: caught before the window's own Escape, which would
    // otherwise close the whole Enhancements window.
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  return (
    <div ref={rootRef} className="upgrade-chooser" style={chooserStyle(theme)}>
      {stat ? (
        <>
          <button type="button" onClick={() => setStat(null)} style={chooserBackStyle(theme)}>
            <NavChevron direction="prev" size={14} />
            {FLAME_LINES[stat].label}
          </button>
          <TierButtons
            theme={theme} info={info} line={stat} tier={current?.line === stat ? current.tier : null}
            onPick={(tier) => onPick({ line: stat, tier })}
          />
        </>
      ) : (
        <>
          <input
            ref={(el) => { if (el && !focused.current) { focused.current = true; el.focus(); } }}
            type="text" aria-label="Search a flame stat" placeholder="Search a stat…"
            value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={nav.onKeyDown}
            className="upgrade-stat-input" style={statBoxStyle(theme)}
          />
          <div role="listbox" aria-label="Flame stats" style={{ display: "flex", flexDirection: "column", maxHeight: 200, overflowY: "auto" }}>
            {results.map((id, i) => (
              <button
                key={id} ref={nav.itemRef(i)} type="button" role="option" aria-selected={id === current?.line}
                onClick={() => setStat(id)} style={statOptionStyle(theme, i === nav.highlightedIndex, id === current?.line)}
              >
                {FLAME_LINES[id].label}
              </button>
            ))}
            {results.length === 0 && <span style={{ padding: "7px 10px", fontSize: "0.8rem", color: theme.muted }}>No matching stat</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** A flame line as the game shows it (tier badge, stat, value), opening the chooser on click.
 *  The empty row adds a line. */
function FlameLineRow({ theme, info, line, taken, onChange, onRemove }: {
  theme: AppTheme; info: EquipInfo; line: StoredFlameLine | null; taken: ReadonlySet<FlameLineId>;
  onChange: (line: StoredFlameLine) => void; onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const known = line && FLAME_LINES[line.line] ? line : null;
  const options = flameLinesFor(info).filter((id) => id === known?.line || !taken.has(id));
  const close = useCallback(() => setOpen(false), []);
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={flameRowStyle(theme, !known, open)}>
          {known ? (
            <>
              <span aria-hidden="true" style={tierBadgeStyle}>{known.tier}</span>
              <span>{FLAME_LINES[known.line].label}</span>
              <span style={{ color: statusText(theme, "success"), fontWeight: 800 }}>
                {formatFlameValue(known.line, flameValue(known.line, known.tier, info))}
              </span>
            </>
          ) : <span>+ Add flame</span>}
        </button>
        {onRemove && (
          <button type="button" aria-label="Remove line" onClick={onRemove} style={iconBtnStyle(theme)}><CloseIcon /></button>
        )}
      </div>
      {open && (
        <FlameChooser
          theme={theme} info={info} options={options} current={known} onClose={close}
          onPick={(next) => { onChange(next); setOpen(false); }}
        />
      )}
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
      <span style={{ ...labelStyle(theme), marginBottom: 0 }}>Flame</span>
      {/* The game only lists each line and tier with Bonus Stats' Details on; off, it shows the
          summed stats, which the total row matches. Shown until the first line is in. */}
      {lines.length === 0 && (
        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
          Copy from Bonus Stats with <b style={{ color: theme.text }}>Details</b> on.
        </p>
      )}
      {lines.map((line, i) => (
        <FlameLineRow
          key={line.line}
          theme={theme} info={info} line={line} taken={taken}
          onChange={(next) => onChange(lines.map((l, j) => (j === i ? next : l)))}
          onRemove={() => onChange(lines.filter((_, j) => j !== i))}
        />
      ))}
      {lines.length < MAX_FLAME_LINES && (
        <FlameLineRow key="new" theme={theme} info={info} line={null} taken={taken} onChange={(next) => onChange([...lines, next])} />
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
            {/* Same box as the Stats step: digits only, capped as you type, so it can never read
                past the item's limit. */}
            <input
              type="text" inputMode="numeric" aria-label="Star Force" placeholder="0"
              value={upgrades.starForce ? String(upgrades.starForce) : ""}
              onChange={(e) => {
                const digits = sanitizeDigitsInput(e.target.value);
                onChange({ ...upgrades, starForce: digits === "" ? undefined : clampNumber(Number(digits), info.maxStars) });
              }}
              onKeyDown={numericKeyDown}
              onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
              onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
              style={{ ...statInputStyle(theme, "3.4rem"), textAlign: "center" }}
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
  /** Called on every change, with the one item it touched. */
  onSave: (changes: Partial<Record<SlotKey, ItemUpgrades>>) => void;
  onClose: () => void;
}) {
  const infos = useEquipInfo(entries);
  const [current, setCurrent] = useState<SlotKey | undefined>(initialSlot);
  const rail = entries.filter((e) => e.slot === initialSlot || infos[e.slot] === undefined || isUpgradeable(infos[e.slot]));
  const { ref: railRef, atStart, atEnd } = useScrollEdges<HTMLElement>([rail.length]);
  const entry = rail.find((e) => e.slot === current) ?? rail.find((e) => isUpgradeable(infos[e.slot])) ?? rail[0];
  const upgradesFor = (e: UpgradeEntry) => upgradesOf(e.item);
  const vars = { "--up-border": theme.border, "--up-accent": theme.accent, "--up-soft": theme.accentSoft, "--up-hover": "rgba(127,127,127,0.14)" } as CSSProperties;

  return (
    <ModalShell
      theme={theme} ariaLabel="Enhancements" onClose={onClose} className="upgrade-dialog"
      style={{ ...vars, width: "min(780px, 100%)", height: "min(640px, 88vh)", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <style>{dialogCss}</style>
      <div className="upgrade-body">
        <nav ref={railRef} className="upgrade-rail" aria-label="Equipped items" style={{ "--rail-fade": edgeFadeMask(atStart, atEnd) } as CSSProperties}>
          {rail.map((e) => (
            <RailTile key={e.slot} theme={theme} entry={e} info={infos[e.slot]} upgrades={upgradesFor(e)} active={e === entry} onPick={() => setCurrent(e.slot)} />
          ))}
        </nav>
        {entry && (
          <ItemPane
            key={entry.slot} theme={theme} entry={entry} info={infos[entry.slot]} upgrades={upgradesFor(entry)}
            onChange={(next) => onSave({ [entry.slot]: next })}
          />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, padding: "12px 18px", borderTop: `1px solid ${theme.border}` }}>
        <button type="button" onClick={onClose} className="tool-btn tool-dialog-btn" style={dialogPrimaryBtnColors(theme)}>Done</button>
      </div>
    </ModalShell>
  );
}
