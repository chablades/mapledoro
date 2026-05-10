"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AppTopNav from "./AppTopNav";
import { NAV_LINKS } from "./nav-links";
import type { AppTheme } from "./themes";
import { useTheme } from "./ThemeContext";

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "About", href: "/about" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Changelog", href: "/changelog" },
];

interface AppShellProps {
  currentPath: string;
  children: (args: { theme: AppTheme }) => ReactNode;
}

export default function AppShell({ currentPath, children }: AppShellProps) {
  const { theme, colorMode, setColorMode } = useTheme();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: theme.bg,
        color: theme.text,
        transition: "background 0.35s ease, color 0.35s ease",
        overflowX: "hidden",
      }}
    >
      <AppTopNav
        currentPath={currentPath}
        theme={theme}
        navLinks={NAV_LINKS}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
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
          transition: "background 0.35s ease, border-color 0.35s ease",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <nav
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.25rem",
              marginBottom: "1rem",
              paddingBottom: "1rem",
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accent,
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div
            style={{
              fontSize: "0.75rem",
              color: theme.muted,
              lineHeight: "1.6",
              fontWeight: 600,
            }}
          >
            <div style={{ marginBottom: "0.5rem", color: theme.text, fontWeight: 800 }}>
              MapleDoro: A Non-Commercial Fan Project
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
