"use client";

/*
  Shared application shell for route pages.
  Owns theme + UTC clock state and renders top nav/sidebar consistently.
*/
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AppTopNav from "./AppTopNav";
import { NAV_LINKS } from "./nav-links";
import ThemeSidebar from "./ThemeSidebar";
import { THEMES, type AppTheme } from "./themes";
import { usePersistedThemeKey } from "./usePersistedThemeKey";

interface AppShellProps {
  currentPath: string;
  children: (args: { theme: AppTheme; now: Date }) => ReactNode;
}

export default function AppShell({ currentPath, children }: AppShellProps) {
  const { themeKey, setThemeKey } = usePersistedThemeKey({
    defaultKey: "default",
    validKeys: Object.keys(THEMES),
  });
  const [now, setNow] = useState(new Date());
  const theme = THEMES[themeKey];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "'Nunito', sans-serif",
        transition: "all 0.35s ease",
        overflowX: "hidden",
      }}
    >
      <AppTopNav
        now={now}
        currentPath={currentPath}
        themeKey={themeKey}
        theme={theme}
        themes={THEMES}
        navLinks={NAV_LINKS}
        onThemeChange={setThemeKey}
      />

      <div className="page-shell">
        <ThemeSidebar
          theme={theme}
          themeKey={themeKey}
          themes={THEMES}
          onThemeChange={setThemeKey}
        />
        {children({ theme, now })}
      </div>
    </div>
  );
}
