"use client";

/*
  Shared hover sidebar for theme switching.
  Edit here for sidebar behavior/content; theme values come from themes.ts.
  Styling lives in ThemeSidebar.module.css.
*/
import { useRef, useState } from "react";
import styles from "./ThemeSidebar.module.css";
import type { AppTheme } from "./themes";

interface ThemeSidebarProps {
  theme: AppTheme;
  themeKey: string;
  themes: Record<string, AppTheme>;
  onThemeChange: (key: string) => void;
}

export default function ThemeSidebar({
  theme,
  themeKey,
  themes,
  onThemeChange,
}: ThemeSidebarProps) {
  const [open, setOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div
      className={styles.sidebarRoot}
      onMouseEnter={() => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        leaveTimer.current = setTimeout(() => setOpen(false), 250);
      }}
    >
      <div
        className={styles.tab}
        style={{
          background: theme.sidebarAccent,
          transition: "background 0.35s",
        }}
      >
        Themes
      </div>

      <div
        className={styles.panel}
        style={{
          width: open ? "195px" : "0",
          background: theme.sidebar,
          borderRight: open ? `1px solid ${theme.border}` : "none",
          boxShadow: open ? "4px 0 20px rgba(0,0,0,0.08)" : "none",
        }}
      >
        <div className={styles.panelInner}>
          <p className={styles.heading} style={{ color: theme.muted }}>
            Map Theme
          </p>
          {Object.entries(themes).map(([key, th]) => (
            <button
              key={key}
              className={styles.themeButton}
              onClick={() => onThemeChange(key)}
              style={{
                background: themeKey === key ? theme.accentSoft : "transparent",
              }}
            >
              <span style={{ fontSize: "0.95rem" }}>{th.emoji}</span>
              <span
                style={{
                  fontSize: "0.84rem",
                  fontWeight: themeKey === key ? 800 : 500,
                  color: themeKey === key ? theme.accentText : theme.text,
                }}
              >
                {th.name}
              </span>
              {themeKey === key && (
                <span className={styles.dot} style={{ background: theme.accent }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
