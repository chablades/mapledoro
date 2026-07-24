"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../components/themes";

export default function HeroBanner({ theme }: { theme: AppTheme }) {
  const bannerStyle: CSSProperties = {
    position: "relative",
    textAlign: "center",
    padding: "0.85rem 1.25rem 1.35rem",
    borderRadius: 22,
    overflow: "hidden",
    border: `1px solid ${theme.border}`,
    marginBottom: "1rem",
  };
  const glowStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${theme.accentSoft} 0%, transparent 70%)`,
    pointerEvents: "none",
  };
  const headingStyle: CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: "1.75rem",
    color: theme.accentText,
    margin: "0 0 0.15rem",
    lineHeight: 1.2,
  };
  const descStyle: CSSProperties = {
    fontSize: "0.82rem",
    color: theme.muted,
    fontWeight: 600,
    maxWidth: 460,
    margin: "0 auto",
    lineHeight: 1.5,
  };

  return (
    <div className="fade-in hero-banner" style={bannerStyle}>
      <div className="hero-glow" style={glowStyle} />
      <div style={{ position: "relative" }}>
        <Image
          src="/icons/doro.png"
          alt=""
          width={84}
          height={84}
          unoptimized
        />
        <h1 style={headingStyle}>MapleDoro</h1>
        <p style={{ fontSize: "0.88rem", fontWeight: 700, color: theme.text, margin: "0 0 0.5rem" }}>
          Your MapleStory Companion
        </p>
        <p className="hero-desc" style={descStyle}>
          Free, open-source tools for tracking characters, planning progression,
          calculating upgrades, and staying on top of game events.
        </p>
      </div>
    </div>
  );
}
