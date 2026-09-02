"use client";

import type { CSSProperties, ReactNode } from "react";
import type { AppTheme } from "../../../components/themes";
import HoverTooltip from "../../../components/HoverTooltip";
import { statusText } from "../../../components/statusColors";
import type { StoredCharacterRecord } from "../model/charactersStore";
import InfoTooltip, { type TooltipContent } from "../setup/components/InfoTooltip";
import RefreshSpinnerIcon from "../tabs/components/RefreshSpinnerIcon";
import { formatFigure } from "./scouterFormat";
import { useScouterResult, type ScouterErrorReason, type ScouterFigureStatus } from "./useScouterResult";
import type { ScouterSimulatorController } from "./useScouterSimulator";

// Same glyph as the profile binder's own Setup bookmark tab (CharacterProfileOverviewScreen.tsx's
// SetupTabIcon), duplicated here rather than exported/shared -- a tiny one-off icon, matching this
// codebase's convention of hand-rolled per-file SVGs over a shared icon module.
function SetupBookmarkIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -1 }}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

const SCOUTER_INFO: TooltipContent = {
  title: "What is MapleScouter?",
  description: (
    <>
      MapleScouter is a community site MapleStory players use to compare character strength.
      The number here is its HEXA-adjusted gear score.
      <br />
      <br />
      For the most accurate result, fill out MapleScouter Setup in full. You&apos;ll find it in
      the <SetupBookmarkIcon /> <strong>Setup</strong> bookmark, bottom right.
    </>
  ),
  link: { href: "https://maplescouter.com/", label: "See more on MapleScouter" },
};

function refreshButtonStyle(theme: AppTheme, disabled: boolean, justRefreshed: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 20, height: 20, flexShrink: 0,
    color: justRefreshed ? theme.accentText : theme.muted,
    background: justRefreshed ? `${theme.accent}33` : theme.bg,
    border: `1px solid ${justRefreshed ? theme.accent : theme.border}`,
    borderRadius: 6, cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background 0.3s ease, color 0.3s ease, border-color 0.3s ease",
  };
}

// No shared relative-time formatter exists in the codebase yet (src/features/tools/date.ts
// is all calendar-day formatters) -- kept here rather than growing a shared module. Not
// exported: only this figure's own tooltip uses it.
function formatRelativeTime(ms: number): string {
  const diffMin = Math.floor((Date.now() - ms) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Value shown for each non-"ready" state. "ready" renders the real number instead. */
const STATUS_VALUE: Partial<Record<string, string>> = {
  unsupported: "N/A",
  incomplete: "—",
  empty: "—",
  error: "—",
};

/** Explains why the button is disabled for the two setup-gated states; every other
 *  state (including "ready") just names the action, since there's nothing to explain. */
function refreshTooltip(status: ScouterFigureStatus, loading: boolean): string {
  if (loading) return "Calculating…";
  if (status.kind === "unsupported") return "MapleScouter doesn't support this class yet.";
  if (status.kind === "incomplete") {
    const area = status.gap === "quickQuestions" ? "Quick Questions" : "Character Info";
    return `Fill out MapleScouter Setup's ${area} before calculating this.`;
  }
  return "Refresh Scouter";
}

/** The figure's own tooltip: what the number is when there is one, why it's stale when
 *  it's stale, otherwise why there's nothing to show yet. */
const FIGURE_TOOLTIP: Partial<Record<string, string>> = {
  unsupported: "MapleScouter doesn't support this class yet.",
  incomplete: "Not calculated yet.",
  empty: "Not calculated yet.",
};

// Shown when there's nothing cached to fall back on, so a refresh had to fail outright.
const ERROR_REASON_TOOLTIP: Record<ScouterErrorReason, string> = {
  rate_limited: "You're refreshing too fast. Wait a moment and try again.",
  timeout: "MapleScouter's API timed out. Try again in a moment.",
  bad_response: "MapleScouter's API returned something unexpected. Try again in a moment.",
  network: "Couldn't reach MapleScouter's API. Try again in a moment.",
};

// Shown on a stale "ready" value -- same reasons, but framed around the number already
// on screen instead of telling you to retry (retrying is still what the button is for).
const STALE_REASON_TOOLTIP: Record<ScouterErrorReason, string> = {
  rate_limited: "You're refreshing too fast, showing the last known value.",
  timeout: "MapleScouter's API timed out, showing the last known value.",
  bad_response: "MapleScouter's API returned something unexpected, showing the last known value.",
  network: "Couldn't reach MapleScouter's API, showing the last known value.",
};

function figureTooltip(status: ScouterFigureStatus, theme: AppTheme): ReactNode {
  if (status.kind === "ready") {
    const asOf = <span style={{ color: theme.muted }}>As of {formatRelativeTime(status.entry.computedAt)}</span>;
    if (!status.stale) return <>Boss 380 HEXA<br />{asOf}</>;
    // Restates what the figure IS, not just why it's stale -- the stale message alone
    // would otherwise replace that context instead of adding to it. "As of" stays neutral
    // (theme.muted, plain metadata); the reason gets the SAME warning color the number
    // itself turns when stale, so the two visually connect instead of blending into one
    // undifferentiated muted paragraph. No reason at all (cold-mount last-known-value,
    // not a failed refresh) gets its own neutral "not yet recalculated" line instead.
    const staleLine = status.reason
      ? STALE_REASON_TOOLTIP[status.reason]
      : "Showing the results for the last known values. Refresh to update.";
    return <>Boss 380 HEXA<br />{asOf}<br /><span style={{ color: statusText(theme, "warning") }}>{staleLine}</span></>;
  }
  if (status.kind === "error") {
    const base = status.reason ? ERROR_REASON_TOOLTIP[status.reason] : "MapleScouter's API didn't respond. Click refresh to try again.";
    if (!status.repeatedFailure) return base;
    // Same input has now failed the same way more than once in a row -- more likely a
    // typo'd stat (e.g. a real 0) than another transient blip, so add a pointer to Setup
    // on top of the retry copy rather than replacing it.
    return <>{base}<br /><span style={{ color: theme.muted }}>Double-check your MapleScouter Setup inputs if this keeps happening.</span></>;
  }
  return FIGURE_TOOLTIP[status.kind] ?? "Not calculated yet.";
}

// A real ready value should read as prominent data, not a dim placeholder (theme.muted
// is right for "—"/"N/A", which is what this slot showed before Scouter had anything
// real to say). Stale/error get their own status colors so a problem actually stands out.
function figureValueColor(theme: AppTheme, status: ScouterFigureStatus): string {
  if (status.kind === "ready") return status.stale ? statusText(theme, "warning") : theme.text;
  if (status.kind === "error") return statusText(theme, "danger");
  return theme.muted;
}

export default function ScouterFigure({ character, theme, simulator }: { character: StoredCharacterRecord; theme: AppTheme; simulator: ScouterSimulatorController }) {
  const { status, loading, canRefresh, refresh, justRefreshed } = useScouterResult(character);
  const simulated = simulator.active;

  // A simulated result replaces the real figure in place (per the Scouter Simulator plan's
  // product decision) -- same rendering path as a real "ready" status, just sourced from
  // useScouterSimulator instead of useScouterResult, with its own always-warning color and
  // tooltip so it never reads as an ordinary fresh result.
  const realValue = status.kind === "ready" ? formatFigure(status.entry.boss380Hexa) : (STATUS_VALUE[status.kind] ?? "—");
  const value = simulated ? formatFigure(simulated.entry.boss380Hexa) : realValue;
  const valueColor = simulated ? statusText(theme, "warning") : figureValueColor(theme, status);
  const tooltip = simulated
    ? <>Boss 380 HEXA (simulated)<br /><span style={{ color: statusText(theme, "warning") }}>Showing a &quot;what if&quot; from the Scouter Simulator, not your real saved result.</span></>
    : figureTooltip(status, theme);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted }}>Scouter</div>
        <InfoTooltip content={SCOUTER_INFO} theme={theme} />
        <HoverTooltip label={simulated ? "Editing this needs the Scouter Simulator popup, open from the Scouter bookmark." : refreshTooltip(status, loading)} theme={theme}>
          <button
            type="button"
            className="tap-target-44"
            aria-label="Refresh Scouter"
            disabled={!canRefresh || simulated !== null}
            onClick={refresh}
            style={refreshButtonStyle(theme, !canRefresh || simulated !== null, justRefreshed)}
          >
            <RefreshSpinnerIcon color="currentColor" size={12} />
          </button>
        </HoverTooltip>
      </div>
      <HoverTooltip label={tooltip} theme={theme}>
        <div style={{ fontSize: 20, fontWeight: 800, color: valueColor, lineHeight: 1, fontFamily: "var(--font-heading)" }}>
          {loading ? "…" : value}
        </div>
      </HoverTooltip>
    </div>
  );
}
