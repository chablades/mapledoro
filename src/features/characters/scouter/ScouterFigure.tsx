"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { AppTheme } from "../../../components/themes";
import HoverTooltip from "../../../components/HoverTooltip";
import { statusText } from "../../../components/statusColors";
import type { StoredCharacterRecord } from "../model/charactersStore";
import InfoTooltip, { type TooltipContent } from "../setup/components/InfoTooltip";
import { formatFigure } from "./scouterFormat";
import type { ScouterResultEntry } from "./scouterResult";
import { sacredFigureNote } from "./sacredSymbols";
import { useScouterChange, type ScouterChange } from "./useScouterChange";
import { formatShortDate } from "../../tools/date";
import { useScouterResult, type ScouterErrorReason, type ScouterFigureStatus } from "./useScouterResult";
import type { ScouterSimulatorController } from "./useScouterSimulator";

// Same glyph as the profile binder's own Setup bookmark tab (CharacterProfileOverviewScreen.tsx's
// SetupTabIcon), duplicated here rather than shared. It's a one-off icon, matching this
// codebase's convention of hand-rolled per-file SVGs over a shared icon module.
function SetupBookmarkIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -1 }}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

/** Shown wherever the local engine's numbers appear: the Scouter and Stat Efficiency bookmark
 *  banner and this figure's info tooltip. */
export const SCOUTER_ENGINE_NOTICE = "MapleDoro is currently experimenting with a new algorithm to determine gear scores. Going forward, your HEXA and normal values may begin to diverge from MapleScouter.";

const SCOUTER_INFO: TooltipContent = {
  title: "What is MapleScouter?",
  description: (
    <>
      MapleScouter is a community site MapleStory players use to compare character strength.
      The number here is its HEXA-adjusted gear score.
      <br />
      <br />
      {SCOUTER_ENGINE_NOTICE}
      <br />
      <br />
      For the most accurate result, fill out MapleScouter Setup in full. You&apos;ll find it in
      the <SetupBookmarkIcon /> <strong>Setup</strong> bookmark, bottom right.
    </>
  ),
  link: { href: "https://maplescouter.com/", label: "See more on MapleScouter" },
};

function betaTagStyle(theme: AppTheme): CSSProperties {
  return {
    fontSize: "0.75rem", fontWeight: 700, lineHeight: 1, padding: "2px 5px", borderRadius: 6,
    color: theme.accentText, border: `1px solid ${theme.accent}`,
  };
}

/** Value shown for each non-"ready" state. "ready" renders the real number instead. */
const STATUS_VALUE: Record<Exclude<ScouterFigureStatus["kind"], "ready">, string> = {
  unsupported: "N/A",
  incomplete: "—",
  loading: "…",
  error: "—",
};

const ERROR_REASON_TOOLTIP: Record<ScouterErrorReason, string> = {
  bad_response: "Couldn't calculate the Scouter figures for these stats.",
  network: "Couldn't load the Scouter data. Check your connection and reload the page.",
};

function changeLine(change: ScouterChange): string {
  const when = change.changedAt ? ` (${formatShortDate(new Date(change.changedAt))})` : "";
  return `Was ${formatFigure(change.before)}${when}`;
}

function readyTooltip(entry: ScouterResultEntry, theme: AppTheme, change: ScouterChange | null): ReactNode {
  const scouter = entry.scouterFigures;
  const note = sacredFigureNote(entry.bossClearInputs?.sacredBonusOn);
  return (
    <>
      {scouter ? "Boss 380 HEXA, adjusted for this class" : "Boss 380 HEXA"}
      {change && <><br /><span>{changeLine(change)}</span></>}
      {note && <><br /><span style={{ color: theme.muted }}>{note}</span></>}
      {scouter && <><br /><span style={{ color: theme.muted }}>MapleScouter est.: {formatFigure(scouter.boss380Hexa)}</span></>}
    </>
  );
}

/** The figure's own tooltip: what the number is when there is one, otherwise why there's none. */
function figureTooltip(status: ScouterFigureStatus, theme: AppTheme, change: ScouterChange | null): ReactNode {
  switch (status.kind) {
    case "ready": return readyTooltip(status.entry, theme, change);
    case "unsupported": return "Scouter doesn't support this class yet.";
    case "incomplete": return `Fill out MapleScouter Setup's ${status.gap === "quickQuestions" ? "Quick Questions" : "Character Info"} to see this.`;
    case "loading": return "Calculating…";
    case "error":
      return status.detail
        ? <>{ERROR_REASON_TOOLTIP[status.reason]}<br /><span style={{ color: theme.muted }}>{status.detail}</span></>
        : ERROR_REASON_TOOLTIP[status.reason];
  }
}

const changeChipStyle: CSSProperties = { fontSize: 12, fontWeight: 800, fontFamily: "var(--font-heading)", whiteSpace: "nowrap" };

// Lines up with .scouter-change-chip in globals.css: the chip is in by 10% of its 2.6 s, then the
// figure counts for a second while it stays.
const COUNT_DELAY_MS = 260;
const COUNT_MS = 1000;

/** Counts the figure from `from` up (or down) to `to` by editing its text node in place, so React
 *  keeps owning the node and a later re-render still updates it. Skipped under reduced motion. */
function useCountUp(ref: RefObject<HTMLDivElement | null>, from: number, to: number, active: boolean) {
  useLayoutEffect(() => {
    const node = ref.current?.firstChild;
    if (!active || !node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.nodeValue = formatFigure(from);
    const start = performance.now() + COUNT_DELAY_MS;
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      node.nodeValue = formatFigure(from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, from, to, active]);
}

// A real ready value should read as prominent data, not a dim placeholder. theme.muted is right
// for the "—" and "N/A" this slot shows before Scouter has anything to say. An error takes its
// own status color so a problem stands out.
function figureValueColor(theme: AppTheme, status: ScouterFigureStatus): string {
  if (status.kind === "ready") return theme.text;
  if (status.kind === "error") return statusText(theme, "danger");
  return theme.muted;
}

export default function ScouterFigure({ character, theme, simulator }: { character: StoredCharacterRecord; theme: AppTheme; simulator: ScouterSimulatorController }) {
  const status = useScouterResult(character);
  const simulated = simulator.active;
  const real = status.kind === "ready" ? status.entry.boss380Hexa : null;
  const change = useScouterChange(character, real);
  // The change only describes the real figure, so a simulation hides it. It plays once, until
  // the chip's animation ends and marks it seen.
  const changeDiff = change?.fresh && real !== null && !simulated ? Math.round(real) - change.before : 0;
  const valueRef = useRef<HTMLDivElement>(null);
  useCountUp(valueRef, change?.before ?? 0, Math.round(real ?? 0), changeDiff !== 0);

  // A simulated result replaces the real figure in place, per the Scouter Simulator plan's
  // product decision. Same rendering path as a real "ready" status, sourced from
  // useScouterSimulator instead of useScouterResult, with its own always-warning color and
  // tooltip so it never reads as an ordinary result.
  const realValue = status.kind === "ready" ? formatFigure(status.entry.boss380Hexa) : STATUS_VALUE[status.kind];
  const value = simulated ? formatFigure(simulated.entry.boss380Hexa) : realValue;
  const valueColor = simulated ? statusText(theme, "warning") : figureValueColor(theme, status);
  const tooltip = simulated
    ? <>Boss 380 HEXA (simulated)<br /><span style={{ color: statusText(theme, "warning") }}>Showing a &quot;what if&quot; from the Scouter Simulator, not your real result.</span></>
    : figureTooltip(status, theme, change);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted }}>Scouter</div>
        <span style={betaTagStyle(theme)}>Beta</span>
        <InfoTooltip content={SCOUTER_INFO} theme={theme} />
      </div>
      <HoverTooltip label={tooltip} theme={theme}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div ref={valueRef} style={{ fontSize: 20, fontWeight: 800, color: valueColor, lineHeight: 1, fontFamily: "var(--font-heading)" }}>
            {value}
          </div>
          {changeDiff !== 0 && change && (
            <span
              key={`${change.before}-${Math.round(real ?? 0)}`}
              className="scouter-change-chip"
              onAnimationEnd={change.markSeen}
              style={{ ...changeChipStyle, color: statusText(theme, changeDiff > 0 ? "success" : "danger") }}
            >
              {changeDiff > 0 ? "+" : "-"}{formatFigure(Math.abs(changeDiff))}
            </span>
          )}
        </div>
      </HoverTooltip>
    </div>
  );
}
