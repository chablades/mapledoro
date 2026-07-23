"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./AppTopNav.module.css";
import type { NavLinkItem } from "./nav-links";
import type { AppTheme } from "./themes";
import type { ColorMode } from "./themes";

function UtcClocks({ mobileClassName, desktopClassName, style }: { mobileClassName: string; desktopClassName: string; style: React.CSSProperties }) {
  const mobileRef = useRef<HTMLSpanElement>(null);
  const desktopRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tick = () => {
      const text = `${new Date().toUTCString().slice(17, 25)} UTC`;
      if (mobileRef.current) mobileRef.current.textContent = text;
      if (desktopRef.current) desktopRef.current.textContent = text;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <span ref={mobileRef} className={mobileClassName} style={style}>--:--:-- UTC</span>
      <span ref={desktopRef} className={desktopClassName} style={style}>--:--:-- UTC</span>
    </>
  );
}

/** The sun/moon read as themselves, not as the accent: both clear 3:1 against
 *  the knob they sit on (moon on #1a1a22, sun on #ffffff). */
const SUN_COLOR = "#d97706";
const MOON_COLOR = "#f2d98b";

function ColorModeToggle({
  colorMode,
  onToggle,
}: {
  colorMode: ColorMode;
  onToggle: () => void;
}) {
  const isDark = colorMode === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
      className={styles.colorModeToggle}
      style={{
        background: isDark ? "#2a2a34" : "#e8e4de",
        border: `1px solid ${isDark ? "#3a3a48" : "#d8d2c8"}`,
      }}
    >
      <span
        className={styles.colorModeKnob}
        style={{
          transform: isDark ? "translate(22px, -50%)" : "translate(0, -50%)",
          background: isDark ? "#1a1a22" : "#ffffff",
          boxShadow: isDark
            ? "0 1px 3px rgba(0,0,0,0.4)"
            : "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        {isDark ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill={MOON_COLOR}
              stroke={MOON_COLOR}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" fill={SUN_COLOR} stroke={SUN_COLOR} strokeWidth="2" />
            <line x1="12" y1="1" x2="12" y2="3" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="21" x2="12" y2="23" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="12" x2="3" y2="12" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="21" y1="12" x2="23" y2="12" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={SUN_COLOR} strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

interface AppTopNavProps {
  currentPath: string;
  theme: AppTheme;
  navLinks: NavLinkItem[];
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

export default function AppTopNav({
  currentPath,
  theme,
  navLinks,
  colorMode,
  onColorModeChange,
}: AppTopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = () => setMobileMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [mobileMenuOpen]);

  const toggleColorMode = () =>
    onColorModeChange(colorMode === "light" ? "dark" : "light");

  return (
    <>
      <nav
        aria-label="Main navigation"
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
              unoptimized
              style={{ display: "block", borderRadius: "4px" }}
            />
          </div>
          <span className={styles.brandText} style={{ color: theme.accentText }}>
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

        <ColorModeToggle colorMode={colorMode} onToggle={toggleColorMode} />

        <UtcClocks mobileClassName={styles.mobileUtc} desktopClassName={styles.desktopUtc} style={{ color: theme.muted }} />
        <button
          type="button"
          className={styles.mobileMenuBtn}
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          style={{
            border: `1px solid ${theme.border}`,
            background: theme.panel,
            color: theme.text,
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
        <nav
          aria-label="Mobile navigation"
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem", borderTop: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>
              {colorMode === "dark" ? "Dark" : "Light"} mode
            </span>
            <ColorModeToggle colorMode={colorMode} onToggle={toggleColorMode} />
          </div>
        </nav>
      )}
    </>
  );
}
