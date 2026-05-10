"use client";

import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

function AboutContent({ theme }: { theme: AppTheme }) {
  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-title" style={{ color: theme.text }}>
          About MapleDoro
        </div>
        <div className="page-subtitle" style={{ color: theme.muted }}>
          A free, open-source companion app for the MapleStory community.
        </div>

        <div
          className="fade-in panel-card page-prose-panel"
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
        >
          <p style={{ marginTop: 0 }}>
            MapleDoro started as a side project to help MapleStory players keep
            track of their characters, plan their progression, and stay on top
            of in-game events, all in one place, without ads, accounts, or
            hidden fees.
          </p>
          <p>
            Everything you save here (characters, symbols progress, boss
            crystals, pitched drops) lives in your browser&apos;s localStorage.
            Nothing is uploaded to a server, and nothing is tied to an account.
            If you clear your browser data, it&apos;s gone.
          </p>
          <p>
            The project is open source and built by volunteers. Feature
            requests, bug reports, and contributions are welcome; please open
            an issue or pull request on the GitHub repository.
          </p>
          <p style={{ marginBottom: 0 }}>
            MapleDoro is a non-commercial fan project and is not affiliated
            with, endorsed, or supported by Nexon, Wizet, or any of their
            partners. All MapleStory assets are the property of Nexon.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <AppShell currentPath="/about">
      {({ theme }) => <AboutContent theme={theme} />}
    </AppShell>
  );
}
