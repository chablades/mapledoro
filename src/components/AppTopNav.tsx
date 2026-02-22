"use client";

/*
  Shared top navigation component used by app pages.
  Edit here for nav structure/behavior (brand, links, UTC clock, mobile menu).
  Styling lives in AppTopNav.module.css; link list lives in nav-links.ts.
*/
import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./AppTopNav.module.css";
import type { NavLinkItem } from "./nav-links";
import type { AppTheme } from "./themes";

interface AppTopNavProps<TTheme extends AppTheme> {
  now: Date;
  currentPath: string;
  themeKey: string;
  theme: TTheme;
  themes: Record<string, TTheme>;
  navLinks: NavLinkItem[];
  onThemeChange: (key: string) => void;
}

export default function AppTopNav<TTheme extends AppTheme>({
  now,
  currentPath,
  themeKey,
  theme,
  themes,
  navLinks,
  onThemeChange,
}: AppTopNavProps<TTheme>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const clockReady = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const utcClockText = clockReady ? `${now.toUTCString().slice(17, 25)} UTC` : "--:--:-- UTC";

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = () => setMobileMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [mobileMenuOpen]);

  return (
    <>
      <nav
        className={styles.topNav}
        style={{
          background: theme.panel,
          borderBottom: `1px solid ${theme.border}`,
          transition: "background 0.35s, border-color 0.35s",
        }}
      >
        <Link href="/" className={styles.brandLink}>
          <div
            className={styles.brandIcon}
            style={{
              background: theme.accent,
            }}
          >
            <Image
              src="/icons/doro.png"
              alt="MapleDoro logo"
              width={18}
              height={18}
              style={{ display: "block", borderRadius: "4px" }}
            />
          </div>
          <span className={styles.brandText} style={{ color: theme.accent }}>
            MapleDoro
          </span>
        </Link>

        <div className={styles.navWrap}>
          <div className={styles.desktopNavLinks}>
            {navLinks.map((link) => {
              const active = link.href === currentPath;
              const isInternal = link.href.startsWith("/");
              const style = active
                ? {
                    color: theme.accentText,
                    boxShadow: `inset 0 -2px 0 ${theme.accent}`,
                  }
                : { color: theme.muted };
              if (isInternal) {
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={styles.navLink}
                    aria-current={active ? "page" : undefined}
                    style={style}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className={styles.navLink}
                  aria-current={active ? "page" : undefined}
                  style={style}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>

        <span
          className={styles.mobileUtc}
          style={{ color: theme.muted }}
        >
          {utcClockText}
        </span>
        <span
          className={styles.desktopUtc}
          style={{ color: theme.muted }}
        >
          {utcClockText}
        </span>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          style={{
            width: "40px",
            minWidth: "40px",
            height: "40px",
            flexShrink: 0,
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            background: theme.panel,
            color: theme.text,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
          }}
        >
          <svg aria-hidden="true" width="28" height="14" viewBox="0 0 28 14" fill="none">
            <line
              x1="2"
              y1="2"
              x2="26"
              y2="2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="2"
              y1="7"
              x2="26"
              y2="7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="2"
              y1="12"
              x2="26"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div
          className={styles.mobileMenuPanel}
          style={{
            background: theme.panel,
            borderBottom: `1px solid ${theme.border}`,
            padding: "0.75rem 1rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.75rem" }}>
            {navLinks.map((link) => {
              const active = link.href === currentPath;
              const isInternal = link.href.startsWith("/");
              const style = {
                padding: "0.55rem 0.65rem",
                borderRadius: "8px",
                border: `1px solid ${active ? theme.accent : theme.border}`,
                background: active ? theme.accentSoft : theme.bg,
                color: active ? theme.accentText : theme.muted,
                fontSize: "0.85rem",
                fontWeight: 700,
                textDecoration: "none",
                minHeight: "24px",
                display: "inline-flex",
                alignItems: "center",
              } as const;
              if (isInternal) {
                return (
                  <Link
                    key={`m-${link.label}`}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    style={style}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <a
                  key={`m-${link.label}`}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  style={style}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
          <div style={{ fontSize: "0.72rem", color: theme.muted, fontWeight: 800, marginBottom: "0.45rem" }}>
            Theme
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {Object.entries(themes).map(([key, th]) => (
              <button
                key={`mobile-theme-${key}`}
                type="button"
                onClick={() => {
                  onThemeChange(key);
                  setMobileMenuOpen(false);
                }}
                style={{
                  border: `1px solid ${themeKey === key ? theme.accent : theme.border}`,
                  borderRadius: "999px",
                  background: themeKey === key ? theme.accentSoft : theme.bg,
                  color: themeKey === key ? theme.accentText : theme.text,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.3rem 0.55rem",
                }}
              >
                {th.emoji} {th.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
