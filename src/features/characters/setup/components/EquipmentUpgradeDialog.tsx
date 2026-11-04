"use client";

// The equipment upgrade window: the preset's gear down a rail on the left, the picked item's
// Star Force and flames on the right. Every change saves as it's made, so closing the window
// (a misclick outside it included) never loses anything.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { searchAndRank } from "../../../../lib/searchMatch";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import ModalShell from "../../../../components/ModalShell";
import { dialogPrimaryBtnColors, type AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import { NavChevron } from "../../DropdownChevron";
import { clampNumber, numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
import { statInputStyle } from "./QuestionControls";
import { SLOT_LABELS, type EquipmentItem, type SlotKey } from "../data/equipmentStepDraft";
import { isUpgradeable, type EquipInfo } from "../data/equipmentInfo";
import {
  FLAME_LINES, MAX_FLAME_LINES, flameContributions, flameLinesFor, flameTiers, flameTotalLabels, flameValue, formatFlameValue,
  solveFlame, totalsOf, type FlameLineId, type FlameTotals, type StoredFlameLine,
} from "../data/flameData";
import { useEquipInfo } from "../data/useEquipInfo";
import { moveInArray, useCardReorder, type CardDragProps } from "../../../tools/useCardReorder";
import { edgeFadeMask, useScrollEdges } from "../../../../lib/useScrollEdges";
import EquipItemIcon from "./EquipItemIcon";
import FlameLines, { DetailsSwitch, TierBadge } from "./FlameLines";
import { useFlameDetails } from "../data/flameDetailsPref";

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

const resultBoxStyle = (theme: AppTheme, picked: boolean): CSSProperties => ({
  all: "unset", boxSizing: "border-box", display: "block", cursor: "pointer", padding: "9px 12px", borderRadius: 10,
  background: picked ? theme.accentSoft : theme.timerBg, border: `1px solid ${picked ? theme.accent : theme.border}`,
});

const percentSuffixStyle = (theme: AppTheme): CSSProperties => ({
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
  fontSize: "0.8rem", fontWeight: 800, color: theme.muted,
});

const rowListStyle = (theme: AppTheme): CSSProperties => ({
  boxSizing: "border-box", maxHeight: 200, overflowY: "auto",
  padding: 4, borderRadius: 10, background: theme.panel, border: `1px solid ${theme.accent}`,
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column",
});

const chooserStyle = (theme: AppTheme): CSSProperties => ({
  boxSizing: "border-box", padding: 8,
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

/** The dotted grip on a line that can be dragged to a new place. */
function GripIcon({ theme }: { theme: AppTheme }) {
  return (
    <svg width={10} height={18} viewBox="0 0 10 18" aria-hidden="true" style={{ flexShrink: 0, cursor: "grab" }}>
      {[2, 8].flatMap((cx) => [3, 9, 15].map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.4} fill={theme.muted} />))}
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
/** Places a floating panel under its anchor, or above it when the window has no room below.
 *  The panel sits on the dialog itself, so the item pane's scrolling never clips it. */
/** A ref holding the latest value, for listeners that shouldn't re-subscribe when a callback
 *  prop changes identity. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

function placeAgainst(panel: HTMLElement | null, anchor: HTMLElement | null) {
  const dialog = panel?.offsetParent;
  if (!panel || !anchor || !dialog) return;
  const d = dialog.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();
  const height = panel.offsetHeight;
  const fitsBelow = a.bottom + 4 + height <= d.bottom - 8;
  panel.style.left = `${a.left - d.left}px`;
  panel.style.width = `${a.width}px`;
  panel.style.top = `${fitsBelow || a.top - d.top < height + 12 ? a.bottom - d.top + 4 : a.top - d.top - height - 4}px`;
}

/** A list or chooser floating over the Enhancements window, pinned to `anchor`. Scrolling the
 *  pane under it would leave it behind, so a scroll outside it dismisses it. */
function FloatingPanel({ anchor, onDismiss, style, children }: {
  anchor: React.RefObject<HTMLElement | null>; onDismiss: () => void; style: CSSProperties; children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dismiss = useLatest(onDismiss);
  useEffect(() => {
    function onScroll(e: Event) {
      if (!panelRef.current?.contains(e.target as Node)) dismiss.current();
    }
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [dismiss]);
  // Only ever rendered after a click or focus inside the open window, so the document exists.
  const [dialog] = useState(() => (typeof document === "undefined" ? null : document.querySelector<HTMLElement>("dialog.upgrade-dialog")));
  if (!dialog) return null;
  return createPortal(
    <div ref={(el) => { panelRef.current = el; placeAgainst(el, anchor.current); }} style={{ ...style, position: "absolute", zIndex: 5 }}>
      {children}
    </div>,
    dialog,
  );
}

function FlameChooser({ theme, info, options, current, anchor, onPick, onClose }: {
  theme: AppTheme; info: EquipInfo; options: FlameLineId[]; current: StoredFlameLine | null;
  anchor: React.RefObject<HTMLDivElement | null>; onPick: (line: StoredFlameLine) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [stat, setStat] = useState<FlameLineId | null>(current?.line ?? null);
  const results = searchAndRank(options, query, (id) => FLAME_LINES[id].label);
  const nav = useKeyboardListNav({ items: results, resetKey: query, onSelect: (id) => setStat(id) });
  const rootRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const close = useLatest(onClose);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !anchor.current?.contains(target)) close.current();
    }
    // Escape closes just this chooser: caught before the window's own Escape, which would
    // otherwise close the whole Enhancements window.
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close.current();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [close, anchor]);

  return (
    <FloatingPanel anchor={anchor} onDismiss={onClose} style={chooserStyle(theme)}>
    <div ref={rootRef} className="upgrade-chooser" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
    </FloatingPanel>
  );
}

/** A flame line as the game shows it (tier badge, stat, value), opening the chooser on click.
 *  The empty row adds a line. */
function FlameLineRow({ theme, info, line, taken, onChange, onRemove, drag }: {
  theme: AppTheme; info: EquipInfo; line: StoredFlameLine | null; taken: ReadonlySet<FlameLineId>;
  onChange: (line: StoredFlameLine) => void; onRemove?: () => void;
  /** Drag-to-reorder for a saved line, so its order can match the game's. */
  drag?: { props: CardDragProps; isDragging: boolean; isDropTarget: boolean };
}) {
  const [open, setOpen] = useState(false);
  const known = line && FLAME_LINES[line.line] ? line : null;
  const options = flameLinesFor(info).filter((id) => id === known?.line || !taken.has(id));
  const close = useCallback(() => setOpen(false), []);
  const rowRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div
        ref={rowRef} {...drag?.props} className={drag ? "card-reorder-surface" : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 6, borderRadius: 10, opacity: drag?.isDragging ? 0.4 : 1,
          outline: drag?.isDropTarget ? `2px solid ${theme.accent}` : "none", outlineOffset: 2,
        }}
      >
        {drag && <GripIcon theme={theme} />}
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={flameRowStyle(theme, !known, open)}>
          {known ? (
            <>
              <TierBadge tier={known.tier} />
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
          theme={theme} info={info} options={options} current={known} anchor={rowRef} onClose={close}
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

// What players type for a stat besides its name, so "matt" finds Magic ATT and "bd" Boss Damage.
const SEARCH_ALIASES: Partial<Record<string, string>> = {
  "Max HP": "hp", "Max MP": "mp", "Defense": "def", "Attack Power": "att watt", "Magic ATT": "matt",
  "All Stats": "as allstat", "Boss Damage": "bd boss", "Damage": "dmg", "Required Level": "req lv",
};
const searchText = (label: string) => `${label} ${SEARCH_ALIASES[label] ?? ""}`;
const PERCENT_TOTALS = new Set(["All Stats", "Boss Damage", "Damage"]);

const sameLines = (a: StoredFlameLine[], b: StoredFlameLine[]) =>
  a.length === b.length && a.every((l) => b.some((x) => x.line === l.line && x.tier === l.tier));

/** What the totals turned into: the one flame they make, a choice when several do, or why none fit. */
function SolveResult({ theme, info, totals, lines, onPick }: {
  theme: AppTheme; info: EquipInfo; totals: FlameTotals; lines: StoredFlameLine[]; onPick: (lines: StoredFlameLine[]) => void;
}) {
  const typed = Object.values(totals).some((v) => (v ?? 0) > 0);
  if (!typed) return null;
  const { matches, missingLine } = solveFlame(info, totals);
  const note = (text: string) => <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: statusText(theme, "warning") }}>{text}</p>;
  if (matches.length === 0) return note(`No flame on a Lv. ${info.level} item adds up to these numbers. Check each one is the green number.`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {missingLine && note("Boss items have 4 lines, so a number is probably missing.")}
      {matches.length === 1 ? (
        <div style={{ ...resultBoxStyle(theme, false), cursor: "default" }}><FlameLines theme={theme} info={info} lines={matches[0]!} /></div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>{matches.length} flames add up to this. Pick yours:</p>
          {matches.map((m) => {
            const picked = sameLines(m, lines);
            return (
              <button key={m.map((l) => `${l.line}${l.tier}`).join("-")} type="button" aria-pressed={picked} onClick={() => onPick(m)} style={resultBoxStyle(theme, picked)}>
                <FlameLines theme={theme} info={info} lines={m} />
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

/** A typed row. `id` keeps the row's identity while its stat is still being typed. */
const MAX_TOTAL_ROWS = 6;

interface TotalRowValue { id: number; label: string | null; value: string }

/** A summed row as the game shows it with Details off: the stat, then its green total. Typing in
 *  the stat box and pressing Enter takes the top match and moves to the number; Enter on the
 *  number moves to the next row. */
function TotalRow({ theme, options, row, statRef, valueRef, onStat, onValue, onNext, onRemove }: {
  theme: AppTheme; options: string[]; row: TotalRowValue;
  statRef: (el: HTMLInputElement | null) => void; valueRef: (el: HTMLInputElement | null) => void;
  onStat: (label: string) => void; onValue: (value: string) => void; onNext: () => void; onRemove?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchAndRank(options, query, searchText);
  function pick(label: string) {
    onStat(label);
    setOpen(false);
    setQuery("");
  }
  const nav = useKeyboardListNav({ items: results, resetKey: `${open}:${query}`, onSelect: pick, onClose: () => setOpen(false) });
  const boxRef = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(() => setOpen(false), []);
  const percent = !!row.label && PERCENT_TOTALS.has(row.label);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 96px 28px", gap: 6, alignItems: "center" }}>
      <div ref={boxRef} style={{ minWidth: 0 }}>
        <input
          ref={statRef} type="text" aria-label="Flame stat" placeholder={row.label ?? "Stat…"}
          value={open ? query : row.label ?? ""}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onBlur={() => setOpen(false)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={nav.onKeyDown}
          className="upgrade-stat-input" style={statBoxStyle(theme)}
        />
        {open && results.length > 0 && (
          <FloatingPanel anchor={boxRef} onDismiss={dismiss} style={rowListStyle(theme)}>
          <div role="listbox" aria-label="Flame stats" style={{ display: "flex", flexDirection: "column" }}>
            {results.map((label, i) => (
              <button
                key={label} ref={nav.itemRef(i)} type="button" role="option" aria-selected={label === row.label} tabIndex={-1}
                // Keeps the input focused, so its blur doesn't close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(label)}
                style={statOptionStyle(theme, i === nav.highlightedIndex, label === row.label)}
              >
                {label}
              </button>
            ))}
          </div>
          </FloatingPanel>
        )}
      </div>
      {/* The % sits inside the box, so every number box keeps the same width. */}
      <span style={{ position: "relative", display: "block" }}>
        <input
          ref={valueRef} type="text" inputMode="numeric" aria-label={`${row.label ?? "Stat"} total`} placeholder="+0"
          value={row.value}
          onChange={(e) => onValue(sanitizeDigitsInput(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onNext(); } else numericKeyDown(e); }}
          className="upgrade-stat-input"
          style={{ ...statBoxStyle(theme), textAlign: "center", color: statusText(theme, "success"), fontWeight: 800, ...(percent && { paddingLeft: 22, paddingRight: 22 }) }}
        />
        {percent && <span aria-hidden="true" style={percentSuffixStyle(theme)}>%</span>}
      </span>
      {onRemove ? (
        <button type="button" aria-label="Remove row" onClick={onRemove} style={iconBtnStyle(theme)}><CloseIcon /></button>
      ) : <span />}
    </div>
  );
}

function rowsFrom(lines: StoredFlameLine[], info: EquipInfo): TotalRowValue[] {
  const totals = totalsOf(lines, info);
  return flameTotalLabels(info).filter((label) => totals[label]).map((label, id) => ({ id, label, value: String(totals[label]) }));
}

function totalsFrom(rows: TotalRowValue[]): FlameTotals {
  const totals: FlameTotals = {};
  for (const { label, value } of rows) if (label && value) totals[label] = (totals[label] ?? 0) + Number(value);
  return totals;
}

/** Details off: the summed rows, typed as the game lists them. The lines they add up to show
 *  underneath; one match saves straight away, several wait for a pick. */
function FlameTotalsEntry({ theme, info, lines, onChange }: {
  theme: AppTheme; info: EquipInfo; lines: StoredFlameLine[]; onChange: (lines: StoredFlameLine[]) => void;
}) {
  const [rows, setRows] = useState<TotalRowValue[]>(() => rowsFrom(lines, info));
  const statInputs = useRef<(HTMLInputElement | null)[]>([]);
  const valueInputs = useRef<(HTMLInputElement | null)[]>([]);
  const allLabels = flameTotalLabels(info);
  // One empty row stays at the end, ready for the next stat, with the next unused id.
  // Stops at 6 rows, the most a flame can make: 4 lines, two doubles covering the four main
  // stats and two lines of one stat each.
  const emptyId = rows.reduce((max, r) => Math.max(max, r.id), -1) + 1;
  const shown: TotalRowValue[] = rows.length < MAX_TOTAL_ROWS ? [...rows, { id: emptyId, label: null, value: "" }] : rows;

  function update(next: TotalRowValue[]) {
    setRows(next);
    const { matches, missingLine } = solveFlame(info, totalsFrom(next));
    // One answer saves; none or several clear the old lines until there's one, so the saved
    // flame never disagrees with the numbers on screen.
    const match = matches.length === 1 && !missingLine ? matches[0]! : [];
    // The same lines in another order are the same flame: keep the order the player set.
    if (!sameLines(match, lines)) onChange(match);
  }
  function setRow(i: number, patch: Partial<TotalRowValue>) {
    const next = shown.map((r, j) => (j === i ? { ...r, ...patch } : r)).filter((r) => r.label || r.value);
    update(next);
  }

  return (
    <>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
        {/* A made-up stat in the tooltip's colours: base, Star Force (yellow), scrolls (purple),
            then the flame (green), the one to type. */}
        Type the <b style={{ color: statusText(theme, "success") }}>green</b> number: STR +100 (10{" "}
        <span style={{ color: starInk(theme) }}>+40</span>{" "}
        <span style={{ color: statusText(theme, "severe") }}>+5</span>{" "}
        <b style={{ color: statusText(theme, "success") }}>+45</b>)
      </p>
      {shown.map((row, i) => (
        <TotalRow
          key={row.id}
          theme={theme} row={row}
          options={allLabels.filter((label) => label === row.label || !rows.some((r) => r.label === label))}
          statRef={(el) => { statInputs.current[i] = el; }}
          valueRef={(el) => { valueInputs.current[i] = el; }}
          onStat={(label) => { setRow(i, { label }); valueInputs.current[i]?.focus(); }}
          onValue={(value) => setRow(i, { value })}
          onNext={() => statInputs.current[i + 1]?.focus()}
          onRemove={i < rows.length ? () => update(rows.filter((_, j) => j !== i)) : undefined}
        />
      ))}
      <SolveResult theme={theme} info={info} totals={totalsFrom(rows)} lines={lines} onPick={onChange} />
    </>
  );
}

/** Manual entry: each line picked by stat and tier. */
function FlameLinesEntry({ theme, info, lines, onChange }: {
  theme: AppTheme; info: EquipInfo; lines: StoredFlameLine[]; onChange: (lines: StoredFlameLine[]) => void;
}) {
  const taken = new Set(lines.map((l) => l.line));
  const totals = flameTotals(lines, info);
  const reorder = useCardReorder((from, to) => onChange(moveInArray(lines, from, to)));
  return (
    <>
      {lines.map((line, i) => (
        <FlameLineRow
          key={line.line}
          theme={theme} info={info} line={line} taken={taken}
          drag={{ props: reorder.dragProps(i), isDragging: reorder.isDragging(i), isDropTarget: reorder.isDropTarget(i) }}
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
    </>
  );
}

/** Details off types the summed stats the hover tooltip shows; Details on picks each line and
 *  tier, like the game's Bonus Stats panel with Details on. Both store the same lines. */
function FlameSection({ theme, info, lines, onChange }: {
  theme: AppTheme; info: EquipInfo; lines: StoredFlameLine[]; onChange: (lines: StoredFlameLine[]) => void;
}) {
  const [details, setDetails] = useFlameDetails();
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ ...labelStyle(theme), marginBottom: 0 }}>Flame</span>
        <DetailsSwitch theme={theme} on={details} onToggle={() => setDetails(!details)} />
      </div>
      {details
        ? <FlameLinesEntry theme={theme} info={info} lines={lines} onChange={onChange} />
        : <FlameTotalsEntry theme={theme} info={info} lines={lines} onChange={onChange} />}
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
