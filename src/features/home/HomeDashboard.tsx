"use client";

import { useMemo } from "react";
import MiracleTimePanel from "../../components/MiracleTimePanel";
import SunnySundayPanel from "../../components/SunnySundayPanel";
import type { AppTheme } from "../../components/themes";
import { useMounted } from "../../lib/useMounted";
import {
  readCharactersStore,
  selectCharactersList,
} from "../characters/model/charactersStore";
import type { StoredCharacterRecord } from "../characters/model/charactersStore";
import CharactersPanel from "./CharactersPanel";
import HeroBanner from "./HeroBanner";
import PatchNotesPanel from "./PatchNotesPanel";
import { QuickLinkGrid, QuickToolsGrid } from "./QuickLinkGrid";
import { QUICK_GUIDES } from "./quickTools";
import ResetTimersPanel from "./ResetTimersPanel";

export default function HomeDashboard({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  // Memoized so the store is parsed once per mount rather than on every render of
  // this component, and so CharactersPanel keeps a stable array identity.
  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );

  return (
    <>
      <style>{`
        .panel { transition: background 0.35s ease, border-color 0.35s ease; }

        .row-hover:hover { background: ${theme.accentSoft} !important; }

        .char-row-icons { opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
        .char-row:hover .char-row-icons { opacity: 1; pointer-events: auto; }
        .char-row-icon-btn { transition: background 0.15s ease; }
        .char-row-icon-btn:hover { background: ${theme.accentSoft} !important; }

        .add-character-link:hover { border-color: ${theme.accent} !important; color: ${theme.accentText} !important; }
        .patch-show-more:hover { background: ${theme.accentSoft} !important; }

        .hero-banner {
          background: ${theme.panel};
          transition: background 0.35s ease, border-color 0.35s ease;
        }
        .doro-poke { transition: transform 0.15s ease; }
        .doro-poke:hover { transform: scale(1.06); }
        .doro-poke:active { transform: scale(0.94); }
        .timer-countdown {
          font-family: var(--font-heading);
          font-size: 1.35rem;
          line-height: 1;
          letter-spacing: 0.02em;
          /* Fixed-width digits so a ticking countdown doesn't reflow its own row. */
          font-variant-numeric: tabular-nums;
        }
        .timer-rows {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.6rem;
          padding: 0.75rem;
        }
        .timer-row { transition: background 0.35s ease, border-color 0.15s ease; }
        .timer-row:hover { border-color: ${theme.accent} !important; }

        .dashboard-layout {
          max-width: 1560px;
          margin: 0 auto;
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .dashboard-sidebar-left {
          width: 320px;
          flex-shrink: 0;
          position: sticky;
          top: 72px;
        }
        .dashboard-main {
          flex: 1;
          min-width: 0;
          max-width: 900px;
        }
        .dashboard-sidebar-right {
          width: 300px;
          flex-shrink: 0;
          position: sticky;
          top: 72px;
        }
        .sec-sunny { margin-bottom: 0.75rem; }

        .customize-btn { transition: border-color 0.15s ease, color 0.15s ease; }
        .customize-btn:hover { border-color: ${theme.accent} !important; color: ${theme.accentText} !important; }

        .hover-lift-card:hover { border-color: ${theme.accent} !important; }

        .characters-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }
        .characters-scroll-area {
          scrollbar-width: thin;
        }

        @media (min-width: 861px) {
          .characters-grid-two-col { grid-template-columns: 1fr 1fr; }
        }

        /* ≤1200px: flatten the three columns into one ordered stack so
           sidebar panels can interleave with main-column sections. */
        @media (max-width: 1200px) {
          .dashboard-layout { flex-direction: column; align-items: center; gap: 0; }
          .dashboard-sidebar-left, .dashboard-sidebar-right, .dashboard-main { display: contents; }
          .dash-sec { width: 100%; max-width: 900px; margin-bottom: 1.25rem; }
          .dash-sec:empty { display: none; }
          /* .dash-sec supplies every gap in this stack. The blocks inside it carry
             their own margins for the three-column layout (the hero, the tool and
             guide grids, Miracle Time), which would stack a second gap on top of
             it; a flex item is its own formatting context, so they never collapse
             into one. Panels have no margin of their own, so this is a no-op there.
             The customize-tools <dialog> is not a div and keeps its own centering. */
          .dash-sec > div { margin-top: 0 !important; margin-bottom: 0 !important; }
          .sec-hero { order: 0; }
          .sec-timers { order: 1; }
          .sec-miracle { order: 2; }
          .sec-tools { order: 3; }
          .sec-characters { order: 4; }
          .sec-guides { order: 5; }
          .sec-sunny { order: 6; }
          .sec-patch { order: 7; }
          /* The panel spans the full column here, so the rows pair up instead of
             stretching one countdown across 900px. */
          .timer-rows { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 860px) {
          .quick-tools-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .char-row-icons { opacity: 1 !important; pointer-events: auto !important; }
          .characters-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 560px) {
          .timer-rows { grid-template-columns: 1fr; }
        }

        @media (max-width: 500px) {
          /* The row has no width to spare for it here: the portrait, the tracker
             icons, and the name all outrank knowing the world at a glance. */
          .char-row-world { display: none; }
          .quick-tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-guides-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-banner { padding: 1.25rem 1rem 1rem !important; }
          .hero-desc { display: none; }
        }
      `}</style>

      <div className="page-content">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar-left">
            <div className="dash-sec sec-timers">
              <ResetTimersPanel theme={theme} />
            </div>
            <div className="dash-sec sec-miracle">
              <MiracleTimePanel theme={theme} />
            </div>
          </aside>
          <div className="dashboard-main">
            <div className="dash-sec sec-hero">
              <HeroBanner theme={theme} />
            </div>
            <div className="dash-sec sec-tools">
              <QuickToolsGrid theme={theme} />
            </div>
            <div className="dash-sec sec-guides">
              <QuickLinkGrid
                theme={theme}
                title="Guides"
                allHref="/guides"
                allLabel="All guides →"
                items={QUICK_GUIDES}
                gridClassName="quick-guides-grid"
                columns={QUICK_GUIDES.length}
              />
            </div>
            <div className="dash-sec sec-characters">
              <CharactersPanel theme={theme} characters={characters} />
            </div>
          </div>
          <aside className="dashboard-sidebar-right">
            <div className="dash-sec sec-sunny">
              <SunnySundayPanel theme={theme} />
            </div>
            <div className="dash-sec sec-patch">
              <PatchNotesPanel theme={theme} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
