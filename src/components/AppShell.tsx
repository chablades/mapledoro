"use client";

/*
  Shared application shell for route pages.
  Owns theme + UTC clock state and renders top nav/sidebar consistently.
*/
import type { ReactNode } from "react";
import AppTopNav from "./AppTopNav";
import { NAV_LINKS } from "./nav-links";
import { THEMES, type AppTheme } from "./themes";
import { useTheme } from "./ThemeContext";

interface AppShellProps {
  currentPath: string;
  children: (args: { theme: AppTheme }) => ReactNode;
}

export default function AppShell({ currentPath, children }: AppShellProps) {
  const { themeKey, theme, setThemeKey } = useTheme();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        transition: "all 0.35s ease",
        overflowX: "hidden",
      }}
    >
      <AppTopNav
        currentPath={currentPath}
        themeKey={themeKey}
        theme={theme}
        themes={THEMES}
        navLinks={NAV_LINKS}
        onThemeChange={setThemeKey}
      />

      <div className="page-shell">
        {children({ theme })}
      </div>

      <footer
        style={{
          padding: "2rem 1.5rem 3rem 2.75rem",
          borderTop: `1px solid ${theme.border}`,
          background: theme.panel,
          marginTop: "2rem",
          transition: "all 0.35s ease",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: theme.muted,
              lineHeight: "1.6",
              fontWeight: 600,
            }}
          >
            <div style={{ marginBottom: "0.5rem", color: theme.text, fontWeight: 800 }}>
              MapleDoro — A Non-Commercial Fan Project
            </div>
            <p style={{ marginBottom: "0.5rem" }}>
              MapleDoro is a free, open-source tool created for the MapleStory
              community. This project is not affiliated with, endorsed, or
              supported by Nexon, Wizet, or any of their partners.
            </p>
            <p>
              MapleStory and all related assets, including but not limited to
              images, characters, and names, are the intellectual property and
              registered trademarks of Nexon. All rights reserved to their
              respective owners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
