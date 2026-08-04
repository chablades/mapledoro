"use client";

import { useRef, useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { bgmTrackUrl } from "../../../lib/mapleResource";

/*
  Audio player for the daily track. Everything is driven by the <audio> element's
  own events rather than effects, so there's no state to sync on mount, and the
  parent keys this by puzzle so a new day gets a fresh element.

  Tracks are in-game BGM loops, so the element loops too: the player is a listen
  surface, not a timeline the puzzle depends on.
*/

const DEFAULT_VOLUME = 0.4;

const playBtn: CSSProperties = {
  borderRadius: "50%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.25rem",
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};

const timeStyle: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};

/* One row: play, elapsed, seek, duration, volume. Keeping the two sliders on the same
   line (rather than stacking volume under the seek bar) stops their different lengths
   reading as a mistake -- side by side at different scales is how a player should look.
   Narrow screens shrink the controls instead of wrapping, which would re-stack them. */
const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.7rem",
  padding: "0.85rem 1rem",
  borderRadius: 14,
};

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function BgmPlayer({
  theme,
  group,
  track,
}: {
  theme: AppTheme;
  group: string;
  track: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [failed, setFailed] = useState(false);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setFailed(true));
    else el.pause();
  }

  function seek(value: number) {
    const el = audioRef.current;
    if (el) el.currentTime = value;
    setCurrent(value);
  }

  function changeVolume(value: number) {
    const el = audioRef.current;
    if (el) el.volume = value;
    setVolume(value);
  }

  return (
    <div
      className="bgm-player"
      style={{ ...rowStyle, border: `1px solid ${theme.border}`, background: theme.timerBg }}
    >
      <style>{`
        .bgm-player input[type="range"] { accent-color: ${theme.accent}; height: 18px; margin: 0; cursor: pointer; }
        .bgm-player .bgm-play { width: 52px; height: 52px; }
        .bgm-player .bgm-volume { width: 76px; flex: none; }
        @media (max-width: 520px) {
          .bgm-player { gap: 0.5rem; padding: 0.7rem 0.75rem; }
          .bgm-player .bgm-play { width: 44px; height: 44px; }
          .bgm-player .bgm-volume { width: 54px; }
          .bgm-player .bgm-duration { display: none; }
        }
      `}</style>
      <audio
        // Callback ref rather than an effect: sets the starting volume the moment
        // the element exists, without a mount-time setState.
        ref={(el) => {
          audioRef.current = el;
          if (el) el.volume = volume;
        }}
        loop
        preload="metadata"
        src={bgmTrackUrl(group, track)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => setFailed(true)}
      />

      <button
        type="button"
        className="tool-btn bgm-play"
        aria-label={playing ? "Pause track" : "Play track"}
        disabled={failed}
        onClick={togglePlay}
        style={{
          ...playBtn,
          background: theme.accent,
          color: theme.accentOn,
          opacity: failed ? 0.5 : 1,
          cursor: failed ? "not-allowed" : "pointer",
        }}
      >
        <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
      </button>

      {failed ? (
        <div style={{ flex: 1, fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
          This track could not be loaded. Try again later.
        </div>
      ) : (
        <>
          <span style={{ ...timeStyle, color: theme.text }}>{formatTime(current)}</span>
          <input
            type="range"
            aria-label="Seek"
            min={0}
            max={duration || 1}
            step={0.5}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            style={{ flex: 1, minWidth: 0 }}
          />
          <span className="bgm-duration" style={{ ...timeStyle, color: theme.muted }}>
            {formatTime(duration)}
          </span>
        </>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          flexShrink: 0,
          paddingLeft: "0.35rem",
          marginLeft: "0.15rem",
          borderLeft: `1px solid ${theme.border}`,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "0.8rem", color: theme.muted, lineHeight: 1 }}>
          🔊
        </span>
        <input
          type="range"
          className="bgm-volume"
          aria-label="Volume"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
