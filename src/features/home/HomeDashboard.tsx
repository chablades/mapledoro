"use client";

import MiracleTimePanel from "../../components/MiracleTimePanel";
import SunnySundayPanel from "../../components/SunnySundayPanel";
import type { AppTheme } from "../../components/themes";
import { useClock } from "../../lib/useClock";
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
import { ResetTimerPanels, UrsusPanel } from "./SidebarTimers";

export default function HomeDashboard({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];

  const now = useClock();

  return (
    <>
      <style>{`
        .panel { transition: background 0.35s ease, border-color 0.35s ease; }
        .panel:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .row-hover:hover { background: ${theme.accentSoft} !important; }

        .char-row-icons { opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
        .char-row:hover .char-row-icons { opacity: 1; pointer-events: auto; }
        .char-row-icon-btn { transition: transform 0.1s ease, background 0.15s ease; }
        .char-row-icon-btn:hover { transform: translateY(-1px); background: ${theme.accentSoft} !important; }

        .add-character-link:hover { border-color: ${theme.accent} !important; color: ${theme.accentText} !important; }
        .patch-show-more:hover { background: ${theme.accentSoft} !important; }

        .hero-banner {
          background: ${theme.panel};
          transition: background 0.35s ease, border-color 0.35s ease;
        }
        .timer-countdown {
          font-family: var(--font-heading);
          font-size: 2rem;
          line-height: 1;
          letter-spacing: 0.03em;
        }
        .timer-bar-card {
          transition: background 0.35s ease, border-color 0.35s ease;
        }

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

        @media (max-width: 1200px) {
          .dashboard-layout { flex-direction: column; align-items: center; gap: 0.35rem; }
          .dashboard-sidebar-left { width: 100%; max-width: 900px; position: static; order: 1; }
          .dashboard-sidebar-right { width: 100%; max-width: 900px; position: static; order: 2; }
          .dashboard-main { width: 100%; max-width: 900px; order: 0; }
          .hide-mobile { display: none; }
        }

        @media (max-width: 860px) {
          .quick-tools-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .char-row-icons { opacity: 1 !important; pointer-events: auto !important; }
          .characters-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 500px) {
          .quick-tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-guides-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .timer-countdown { font-size: 1.5rem !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar-left">
            <div className="hide-mobile">
              <ResetTimerPanels theme={theme} now={now} />
              <div style={{ marginTop: "0.75rem" }}>
                <UrsusPanel theme={theme} now={now} />
              </div>
            </div>
            <MiracleTimePanel theme={theme} />
          </aside>
          <div className="dashboard-main">
            <HeroBanner theme={theme} />
            <QuickToolsGrid theme={theme} />
            <QuickLinkGrid
              theme={theme}
              title="Guides"
              allHref="/guides"
              allLabel="All guides →"
              items={QUICK_GUIDES}
              gridClassName="quick-guides-grid"
              columns={QUICK_GUIDES.length}
              animationDelay="0.25s"
            />
            <CharactersPanel theme={theme} characters={characters} />
          </div>
          <aside className="dashboard-sidebar-right">
            <div style={{ marginBottom: "0.75rem" }}>
              <SunnySundayPanel theme={theme} />
            </div>
            <PatchNotesPanel theme={theme} />
          </aside>
        </div>
      </div>
    </>
  );
}
