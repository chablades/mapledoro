"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { ProgressBar } from "../../../components/ProgressBar";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { ItemIcon } from "../../../components/ResourceImage";
import { ActionButton, PanelDivider, ToolNumberInput, Toggle } from "../shared-ui";
import { SkillIcon } from "../hexa-skills/hexa-ui";
import { fmtNum } from "../hexa-skills/hexa-format";
import type { ErdaLinkClassKey } from "./erda-link-order";
import { erdaLinkDisabledArtNeedsTint, erdaLinkHasDisabledArt, erdaLinkIconOffset, erdaLinkIconUrl } from "./erda-link-data";
import {
  applyErdaLinkStep,
  computeErdaLinkProgress,
  erdaLinkEdges,
  erdaLinkLevel,
  erdaLinkNodes,
  nextErdaLinkStepFor,
  upcomingErdaLinkSteps,
  type ErdaLinkLevels,
  type ErdaLinkNode,
  type ErdaLinkProgress,
  type ErdaLinkStep,
} from "./erda-link";

// Item ids (manifests/v269/item.json): Sol Erda, Sol Erda Fragment
const SOL_ERDA_ITEM_ID = "05066300";
const SOL_ERDA_FRAGMENT_ITEM_ID = "04009613";

const LOOK_AHEAD = 5;

// The community trackers this tool's order and layout come from, by @RagingHomoBear.
const SOURCE_SHEET_URL: Record<ErdaLinkClassKey, string> = {
  erel: "https://docs.google.com/spreadsheets/d/1N7pKMWa8cscPa_MtbiqRQNycCR8jbemKoyla1Z-mgto/view",
  sia: "https://docs.google.com/spreadsheets/d/1dOIP089yZPlNF7AeGT4S-tI8j2Xflu6bAhvY0WGVlhA/view",
};

function fmtFd(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

function fmtFrags(n: number): string {
  return fmtNum(Math.round(n));
}

// ── Summary (sits in the shared top panel of the HEXA tracker) ───────────────

const statRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  borderRadius: "10px",
  padding: "10px 14px",
};

function StatRow({
  theme,
  icon,
  label,
  spent,
  total,
}: {
  theme: AppTheme;
  icon?: React.ReactNode;
  label: string;
  spent: string;
  total: string;
}) {
  return (
    <div style={{ ...statRowStyle, background: theme.timerBg }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>{label}</div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>of {total} in the guide</div>
      </div>
      <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>{spent}</span>
    </div>
  );
}

export function ErdaLinkSummary({
  theme,
  classKey,
  levels,
  onReset,
}: {
  theme: AppTheme;
  classKey: ErdaLinkClassKey;
  levels: ErdaLinkLevels;
  onReset: () => void;
}) {
  const progress = useMemo(() => computeErdaLinkProgress(classKey, levels), [classKey, levels]);
  const { spent, total } = progress;
  const pct = total.frags > 0 ? Math.min(100, (spent.frags / total.frags) * 100) : 0;
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
          Erda Link Progress
        </h2>
        <ConfirmButton
          theme={theme}
          label="Reset"
          title="Reset Erda Link levels?"
          message="This sets every Erda Link stone back to untouched. Your selected class stays."
          onConfirm={onReset}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.5rem",
          marginBottom: "12px",
        }}
      >
        <StatRow
          theme={theme}
          icon={<ItemIcon id={SOL_ERDA_ITEM_ID} size={28} alt="" />}
          label="Sol Erda spent"
          spent={fmtNum(spent.erda)}
          total={fmtNum(total.erda)}
        />
        <StatRow
          theme={theme}
          icon={<ItemIcon id={SOL_ERDA_FRAGMENT_ITEM_ID} size={28} alt="" />}
          label="Fragments spent"
          spent={fmtFrags(spent.frags)}
          total={fmtFrags(total.frags)}
        />
        <StatRow
          theme={theme}
          label="FD gained"
          spent={fmtFd(spent.fd)}
          total={fmtFd(total.fd)}
        />
      </div>

      <ProgressBar pct={pct} theme={theme} label="Erda Link guide progress" />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
          fontSize: "0.75rem",
          fontWeight: 700,
          color: theme.muted,
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        <span>Shinestone costs are averages.</span>
        <span>{pct.toFixed(1)}% Complete</span>
      </div>
    </>
  );
}

// ── Tree canvas ──────────────────────────────────────────────────────────────

const COL_W = 54;
const ROW_H = 62;
const NODE = 42;
const NODE_RADIUS = 8;
const PAD = 12;

function nodeCenter(node: ErdaLinkNode): { x: number; y: number } {
  return { x: PAD + node.col * COL_W + COL_W / 2, y: PAD + node.row * ROW_H + ROW_H / 2 };
}

type Point = { x: number; y: number };

/** Where a ray from a node's centre along unit vector (ux, uy) leaves its rounded square:
 *  the straight edge if it hits one, else the corner arc. */
function nodeExitDistance(ux: number, uy: number): number {
  const half = NODE / 2;
  const inner = half - NODE_RADIUS;
  const edgeDist = half / Math.max(Math.abs(ux), Math.abs(uy));
  if (Math.abs(ux * edgeDist) <= inner || Math.abs(uy * edgeDist) <= inner) return edgeDist;
  const cx = Math.sign(ux) * inner;
  const cy = Math.sign(uy) * inner;
  const along = ux * cx + uy * cy;
  return along + Math.sqrt(along * along - (cx * cx + cy * cy) + NODE_RADIUS * NODE_RADIUS);
}

/** Straight when the two share a row or column (or when `straight` is forced, for the core's
 *  spokes); otherwise down, across, down, so a stone that feeds several neighbours draws as one
 *  junction bar. Axis-aligned lines hide under the nodes' solid fill, but a diagonal would show
 *  through the rounded corner, so diagonals are trimmed to the node borders. */
function edgePath(a: Point, b: Point, straight = false): string {
  if (straight && a.x !== b.x && a.y !== b.y) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const ta = nodeExitDistance(ux, uy);
    const tb = nodeExitDistance(-ux, -uy);
    return `M${a.x + ux * ta},${a.y + uy * ta} L${b.x - ux * tb},${b.y - uy * tb}`;
  }
  if (straight || a.x === b.x || a.y === b.y) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const midY = (a.y + b.y) / 2;
  return `M${a.x},${a.y} V${midY} H${b.x} V${b.y}`;
}

const KIND_CAPTION: Record<ErdaLinkNode["kind"], string> = {
  rush: "Rush stone",
  boost: "Boost stone",
  skill: "Skill stone",
  split: "Split skill stone",
  shinestone: "Shinestone",
  core: "",
  lock: "",
};

function frameColor(theme: AppTheme, kind: ErdaLinkNode["kind"]): string {
  switch (kind) {
    case "rush":
      return statusText(theme, "success");
    case "boost":
      return statusText(theme, "danger");
    case "shinestone":
    case "lock":
      return theme.muted;
    default:
      return theme.accent;
  }
}

const nodeBase: CSSProperties = {
  position: "absolute",
  width: NODE,
  height: NODE,
  borderRadius: NODE_RADIUS,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

const badgeBase: CSSProperties = {
  position: "absolute",
  top: -9,
  right: -9,
  minWidth: 18,
  height: 18,
  padding: "0 4px",
  borderRadius: 6,
  fontSize: "0.75rem",
  fontWeight: 800,
  lineHeight: "16px",
  textAlign: "center",
  pointerEvents: "none",
};

function glyphFor(node: ErdaLinkNode): string {
  if (node.kind === "core") return "✦";
  if (node.kind === "shinestone") return node.key.replace(/\D/g, "");
  return "";
}

/** The stone's own art: the in-game greyed `iconDisabled` until it's activated. Fruits of
 *  Mastery's disabled art isn't actually grey (it's the blue orb), so that one gets the tint
 *  here. */
function StoneIcon({ node, active, size, theme }: { node: ErdaLinkNode; active: boolean; size: number; theme: AppTheme }) {
  const icon = <SkillIcon iconId="" iconUrl={node.icon ? erdaLinkIconUrl(node.icon, active) : undefined} name={node.label} theme={theme} size={size} />;
  if (node.icon == null) return icon;
  const tint = !active && erdaLinkDisabledArtNeedsTint(node.icon);
  // Source pixels scale by size/32 (the icons' native canvas).
  const offset = erdaLinkIconOffset(node.icon, active);
  const dx = (offset.x * size) / 32;
  const dy = (offset.y * size) / 32;
  if (!tint && dx === 0 && dy === 0) return icon;
  return (
    <span style={{ display: "inline-flex", filter: tint ? "grayscale(1) brightness(1.25)" : undefined, transform: dx || dy ? `translate(${dx}px, ${dy}px)` : undefined }}>
      {icon}
    </span>
  );
}

function NodeGlyph({ node, active, theme }: { node: ErdaLinkNode; active: boolean; theme: AppTheme }) {
  // A stone with no art on the host shows its initial, the same fallback the HEXA tracker uses.
  if (node.icon || node.kind === "boost") return <StoneIcon node={node} active={active} size={NODE - 6} theme={theme} />;
  const glyph = glyphFor(node);
  return (
    <span aria-hidden="true" style={{ fontSize: "0.9rem", fontWeight: 800, color: node.kind === "core" ? theme.accentOn : theme.muted }}>
      {glyph}
    </span>
  );
}

/** Stones with disabled art carry the locked look themselves; the rest dim instead. */
function isDimmed(node: ErdaLinkNode, active: boolean, isNext: boolean): boolean {
  return !active && !isNext && !(node.icon != null && erdaLinkHasDisabledArt(node.icon));
}

function treeNodeStyle(
  node: ErdaLinkNode,
  theme: AppTheme,
  { active, isNext, isSelected, inert, frame }: { active: boolean; isNext: boolean; isSelected: boolean; inert: boolean; frame: string },
): CSSProperties {
  const { x, y } = nodeCenter(node);
  const dashed = node.kind === "lock" || node.kind === "shinestone";
  const dim = isDimmed(node, active, isNext);
  // Dim the border (and, in TreeNode, the glyph) rather than the whole node: a translucent
  // node would show the connector running underneath it.
  const accentOrFrame = isNext ? theme.accent : frame;
  const borderColor = dim ? `color-mix(in srgb, ${accentOrFrame} 45%, transparent)` : accentOrFrame;
  return {
    ...nodeBase,
    left: x - NODE / 2,
    top: y - NODE / 2,
    background: node.kind === "core" ? theme.accent : theme.panel,
    border: `2px ${dashed ? "dashed" : "solid"} ${borderColor}`,
    outline: isSelected ? `2px solid ${theme.text}` : undefined,
    outlineOffset: 2,
    cursor: inert ? "default" : "pointer",
    // The ring colour rides on a CSS variable so the global keyframes can use the theme accent.
    ...(isNext ? ({ "--erda-next": theme.accent } as CSSProperties) : null),
  };
}

function TreeNode({
  node,
  level,
  theme,
  isNext,
  isSelected,
  onClick,
}: {
  node: ErdaLinkNode;
  level: number;
  theme: AppTheme;
  isNext: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const inert = node.kind === "core" || node.kind === "lock";
  const active = inert || level > node.minLevel || (node.kind !== "rush" && node.kind !== "boost" && level > 0);
  const frame = frameColor(theme, node.kind);
  const style = treeNodeStyle(node, theme, { active, isNext, isSelected, inert, frame });
  const showBadge = !inert && level > 0;
  const badge = node.maxLevel === 1 ? "✓" : String(level);
  const nextSuffix = isNext ? " (next)" : "";
  const title = inert ? node.label : `${node.label} — Lv. ${level}/${node.maxLevel}${nextSuffix}`;
  const badgeEl = showBadge && (
    <span style={{ ...badgeBase, background: theme.panel, border: `1px solid ${frame}`, color: theme.text }}>{badge}</span>
  );

  if (inert) {
    return (
      <div style={style} title={title}>
        <NodeGlyph node={node} active theme={theme} />
      </div>
    );
  }
  return (
    <button
      type="button"
      className={isNext ? "btn-reset erda-link-next" : "btn-reset"}
      style={style}
      title={title}
      aria-label={title}
      aria-pressed={isSelected}
      onClick={onClick}
    >
      <span style={{ display: "inline-flex", opacity: isDimmed(node, active, isNext) ? 0.45 : 1 }}>
        <NodeGlyph node={node} active={active} theme={theme} />
      </span>
      {badgeEl}
    </button>
  );
}

function ErdaLinkTree({
  theme,
  classKey,
  levels,
  nextKey,
  selectedKey,
  onSelect,
}: {
  theme: AppTheme;
  classKey: ErdaLinkClassKey;
  levels: ErdaLinkLevels;
  nextKey: string | null;
  selectedKey: string | null;
  onSelect: (node: ErdaLinkNode) => void;
}) {
  const nodes = erdaLinkNodes(classKey);
  const edges = erdaLinkEdges(classKey);
  const byKey = useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...nodes.map((n) => n.row)) + 1;
  const width = PAD * 2 + cols * COL_W;
  const height = PAD * 2 + rows * ROW_H;

  // Origin starts at level 1, so its line is lit from the start.
  const stoneLit = (n: ErdaLinkNode) => n.kind === "core" || erdaLinkLevel(levels, n) >= 1;
  // The empty slot under the core only passes the line through: it lights up with the stone
  // on its far side (DEX/LUK +200), so the core-to-stone run stays dark until that unlocks.
  const isLit = (n: ErdaLinkNode): boolean => {
    if (n.kind !== "lock") return stoneLit(n);
    return edges.some(([a, b]) => {
      if (a !== n.key && b !== n.key) return false;
      const other = byKey.get(a === n.key ? b : a);
      return other != null && other.kind !== "core" && stoneLit(other);
    });
  };

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ position: "relative", width, height }}>
        <svg width={width} height={height} aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          {edges.map(([a, b]) => {
            const na = byKey.get(a);
            const nb = byKey.get(b);
            if (!na || !nb) return null;
            const lit = isLit(na) && isLit(nb);
            // Origin and Ascent sit diagonally off the core, so their spokes run straight into it
            // rather than elbowing (an elbow's bar would hang just above the core).
            const straight = na.kind === "core" || nb.kind === "core";
            return (
              <path
                key={`${a}|${b}`}
                d={edgePath(nodeCenter(na), nodeCenter(nb), straight)}
                fill="none"
                stroke={lit ? theme.accent : theme.border}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        {/* The locked slot under the core has no stone yet: its connectors still route through
            it (so the core-to-DEX line stays whole) but nothing is drawn there. */}
        {nodes.filter((node) => node.kind !== "lock").map((node) => (
          <TreeNode
            key={node.key}
            node={node}
            level={erdaLinkLevel(levels, node)}
            theme={theme}
            isNext={node.key === nextKey}
            isSelected={node.key === selectedKey}
            onClick={() => onSelect(node)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Next upgrade + selected stone ────────────────────────────────────────────

function StepCosts({ step, theme }: { step: ErdaLinkStep; theme: AppTheme }) {
  return (
    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
      <span style={{ color: theme.accentText, fontWeight: 800 }}>{fmtNum(step.erda)}</span>
      {" Sol Erda  "}
      <span style={{ color: theme.accentText, fontWeight: 800 }}>{fmtFrags(step.frags)}</span>
      {" Fragments  "}
      <span style={{ color: theme.accentText, fontWeight: 800 }}>+{fmtFd(step.fd)}</span>
      {" FD"}
    </span>
  );
}

function NextUpgrade({
  theme,
  progress,
  byKey,
  onApply,
}: {
  theme: AppTheme;
  progress: ErdaLinkProgress;
  byKey: Map<string, ErdaLinkNode>;
  onApply: (step: ErdaLinkStep) => void;
}) {
  const upcoming = upcomingErdaLinkSteps(progress, LOOK_AHEAD);
  const next = upcoming[0];
  if (!next) {
    return (
      <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: theme.muted }}>
        Every step in the guide is done. Anything past this is your call.
      </p>
    );
  }
  const node = byKey.get(next.key);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        {node && <StoneIcon node={node} active size={44} theme={theme} />}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>
            {node?.label ?? next.key}
            <span style={{ color: theme.muted, fontWeight: 700 }}> {node?.maxLevel === 1 ? "unlock" : `to Lv. ${next.level}`}</span>
          </div>
          <StepCosts step={next} theme={theme} />
        </div>
        <ActionButton theme={theme} label="Mark done" onClick={() => onApply(next)} />
      </div>
      {upcoming.length > 1 && (
        <div style={{ marginTop: "10px" }}>
          <div className="section-label" style={{ color: theme.muted }}>Looking ahead</div>
          <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.75rem", fontWeight: 600, color: theme.muted, lineHeight: 1.7 }}>
            {upcoming.slice(1).map((step) => {
              const n = byKey.get(step.key);
              return (
                <li key={step.index}>
                  <span style={{ color: theme.text, fontWeight: 700 }}>{n?.label ?? step.key}</span>
                  {n?.maxLevel === 1 ? "" : ` Lv. ${step.level}`} · {fmtNum(step.erda)} Sol Erda · {fmtFrags(step.frags)} Fragments · +{fmtFd(step.fd)} FD
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </>
  );
}

function SelectedStone({
  theme,
  node,
  level,
  progress,
  inputStyle,
  onLevel,
}: {
  theme: AppTheme;
  node: ErdaLinkNode;
  level: number;
  progress: ErdaLinkProgress;
  inputStyle: CSSProperties;
  onLevel: (level: number) => void;
}) {
  const step = nextErdaLinkStepFor(progress, node.key);
  const inGuide = progress.steps.some((s) => s.key === node.key);
  const inputId = "erda-link-level";
  let guideNote: React.ReactNode = " · not in the guide";
  if (step) {
    guideNote = (
      <>
        {" · next in guide: "}
        {node.maxLevel === 1 ? "unlock" : `Lv. ${step.level}`}
        {", "}
        <StepCosts step={step} theme={theme} />
      </>
    );
  } else if (inGuide) {
    guideNote = " · guide complete for this stone";
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <StoneIcon node={node} active={level > node.minLevel} size={44} theme={theme} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: theme.text }}>{node.label}</div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
          {KIND_CAPTION[node.kind]}
          {guideNote}
        </div>
      </div>
      {node.maxLevel === 1 ? (
        <Toggle theme={theme} label="Unlocked" checked={level >= 1} onChange={(v) => onLevel(v ? 1 : 0)} />
      ) : (
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }} htmlFor={inputId}>
          Level
          <ToolNumberInput
            id={inputId}
            value={level}
            min={node.minLevel}
            max={node.maxLevel}
            integer
            onCommit={onLevel}
            style={{ ...inputStyle, width: 64, textAlign: "center" }}
          />
          <span>/ {node.maxLevel}</span>
        </label>
      )}
    </div>
  );
}

// ── Tracker body ─────────────────────────────────────────────────────────────

export function ErdaLinkTracker({
  theme,
  classKey,
  levels,
  sectionPanel,
  inputStyle,
  onLevel,
  onLevels,
}: {
  theme: AppTheme;
  classKey: ErdaLinkClassKey;
  levels: ErdaLinkLevels;
  sectionPanel: CSSProperties;
  inputStyle: CSSProperties;
  onLevel: (key: string, level: number) => void;
  onLevels: (next: ErdaLinkLevels) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const nodes = erdaLinkNodes(classKey);
  const byKey = useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const progress = useMemo(() => computeErdaLinkProgress(classKey, levels), [classKey, levels]);
  const nextStep = progress.nextIndex === -1 ? null : progress.steps[progress.nextIndex];
  const selected = selectedKey ? byKey.get(selectedKey) ?? null : null;

  const applyStep = (step: ErdaLinkStep) => onLevels(applyErdaLinkStep(levels, step));

  // Clicking the highlighted stone is the quick path: it marks that step done. Any other
  // stone just becomes the selection, editable below the tree.
  const handleSelect = (node: ErdaLinkNode) => {
    setSelectedKey(node.key);
    if (nextStep && node.key === nextStep.key) applyStep(nextStep);
  };

  return (
    <>
      <section className="fade-in panel-card" style={sectionPanel}>
        <h2 className="tool-panel-title" style={{ color: theme.text }}>Next Upgrade</h2>
        <NextUpgrade theme={theme} progress={progress} byKey={byKey} onApply={applyStep} />
      </section>

      <section className="fade-in panel-card" style={sectionPanel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "6px" }}>
          <h2 className="tool-panel-title" style={{ color: theme.text }}>Erda Link</h2>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
            Click the glowing stone to mark it done, or any stone to set its level.
          </span>
        </div>
        <ErdaLinkTree
          theme={theme}
          classKey={classKey}
          levels={levels}
          nextKey={nextStep?.key ?? null}
          selectedKey={selectedKey}
          onSelect={handleSelect}
        />
        {selected && (
          <>
            <PanelDivider theme={theme} />
            <SelectedStone
              theme={theme}
              node={selected}
              level={erdaLinkLevel(levels, selected)}
              progress={progress}
              inputStyle={inputStyle}
              onLevel={(v) => onLevel(selected.key, v)}
            />
          </>
        )}
      </section>

      <p style={{ margin: "-0.5rem 0 0", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
        Erda Link tracker data by RagingHomoBear, from the community {" "}
        <a href={SOURCE_SHEET_URL[classKey]} target="_blank" rel="noopener noreferrer" style={{ color: theme.accentText, fontWeight: 700 }}>
          Erda Link Tracker spreadsheet
        </a>
        .
      </p>
    </>
  );
}
