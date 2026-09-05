"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../components/themes";
import { STATUS } from "../../components/statusColors";
import { useMounted } from "../../lib/useMounted";
import { useTwitchLive } from "../../lib/useTwitchLive";

const TWITCH_CHANNEL_URL = "https://www.twitch.tv/da_wakaiyuki";

const BUH = "buh";
const BUH_FLIP_EXPLODE = "buhFlipExplode";
// Odds that landing on "buh" also plays its sound effect.
const BUH_SOUND_CHANCE = 1 / 50;

/* Kept short enough to sit on one line at the bubble's max width, so poking
   Doro for a new phrase never reflows the banner. */
const DORO_PHRASES = [
  BUH,
  "BUH?!",
  "bruh",
  "BRUH",
  "doro doro",
  "dowo dowo",
  "fuwa fuwa",
  "same people.",
  "this game sucks.",
  "mm yees bnuuy",
  "erm",
  BUH_FLIP_EXPLODE,
];

export default function HeroBanner({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const live = useTwitchLive();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * DORO_PHRASES.length), // eslint-disable-line sonarjs/pseudo-random
  );
  // The server has no way to render the same random pick, so the bubble holds a
  // fixed phrase and stays invisible until mount: it reserves its space without
  // flashing one phrase before swapping to another.
  const phrase = mounted ? DORO_PHRASES[phraseIndex] : DORO_PHRASES[0];

  const pokeDoro = () => {
    // Roll over the other phrases only, so a poke always says something new.
    const roll = Math.floor(Math.random() * (DORO_PHRASES.length - 1)); // eslint-disable-line sonarjs/pseudo-random
    const next = roll >= phraseIndex ? roll + 1 : roll;
    setPhraseIndex(next);
    if (DORO_PHRASES[next] === BUH && Math.random() < BUH_SOUND_CHANCE) { // eslint-disable-line sonarjs/pseudo-random
      audioRef.current?.play().catch(() => {
        // Best-effort easter egg; a blocked or missing file just stays silent.
      });
    }
  };

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
  const bubbleStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    maxWidth: 260,
    marginBottom: "0.5rem",
    padding: "0.4rem 0.7rem",
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.badge,
    color: theme.text,
    fontSize: "0.8rem",
    fontWeight: 600,
    lineHeight: 1.3,
    visibility: mounted ? "visible" : "hidden",
  };
  const bubbleTailStyle: CSSProperties = {
    position: "absolute",
    bottom: -5,
    left: "50%",
    marginLeft: -5,
    width: 9,
    height: 9,
    transform: "rotate(45deg)",
    background: theme.badge,
    borderRight: `1px solid ${theme.border}`,
    borderBottom: `1px solid ${theme.border}`,
  };
  const doroButtonStyle: CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    textAlign: "inherit",
    lineHeight: 0,
    cursor: "pointer",
  };
  const doroWrapStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
  };
  const doroImageWrapStyle: CSSProperties = {
    display: "inline-block",
    lineHeight: 0,
  };
  const liveDotStyle: CSSProperties = {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: STATUS.danger.fill,
    border: `2px solid ${theme.panel}`,
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
        {/* The keyed inner div replays the fade on every poke; the live region
            around it stays mounted so the new phrase is announced. */}
        <div aria-live="polite">
          <div key={phrase} className="fade-in" style={bubbleStyle}>
            {phrase}
            <span style={bubbleTailStyle} />
          </div>
        </div>
        <div style={doroWrapStyle}>
          <audio ref={audioRef} src="/sounds/buh.mp3" preload="none" />
          <button
            type="button"
            className="doro-poke"
            style={doroButtonStyle}
            onClick={pokeDoro}
            aria-label="Poke Doro for a new phrase"
          >
            <span
              key={phrase}
              className={phrase === BUH_FLIP_EXPLODE ? "doro-flip-explode" : undefined}
              style={doroImageWrapStyle}
            >
              <Image
                src="/icons/doro.png"
                alt=""
                width={84}
                height={84}
                unoptimized
              />
            </span>
          </button>
          {live && (
            <a
              href={TWITCH_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="doro-live-dot"
              style={liveDotStyle}
              aria-label="da_wakaiyuki is live on Twitch"
              title="Live on Twitch"
            />
          )}
        </div>
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
