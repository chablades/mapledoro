"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { bossSplashUrl } from "../../../lib/mapleResource";
import { BOSS_ART_POSITION, DEFAULT_ART_POSITION } from "./bossArt";

const BANNER_WIDTH = 180;
const BANNER_HEIGHT = 64;

function bannerMaskStyle(): CSSProperties {
  return {
    position: "absolute", inset: 0,
    maskImage: "linear-gradient(to right, black 55%, transparent 100%)",
    WebkitMaskImage: "linear-gradient(to right, black 55%, transparent 100%)",
  };
}

const bannerScrimStyle: CSSProperties = {
  position: "absolute", inset: 0,
  background: "linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 55%, transparent 80%)",
};

const bannerNameStyle: CSSProperties = {
  position: "absolute", left: 8, bottom: 6, fontSize: 12, fontWeight: 800, color: "#fff",
  textShadow: "0 1px 3px rgba(0,0,0,0.8)", maxWidth: BANNER_WIDTH - 16, whiteSpace: "nowrap",
  overflow: "hidden", textOverflow: "ellipsis",
};

// The Quick View row's extended boss art: a wide slice of mob.png faded to transparent on its
// right edge through bannerMaskStyle rather than hard-cropped, so it blends into the row's
// background instead of reading as a cropped rectangle. Same dual-render-with-refs fallback as
// FallbackSpriteIcon, sized for a banner rather than a small icon.
export default function BossBanner({ theme, boss, iconId, displayName }: {
  theme: AppTheme; boss: string; iconId: string | undefined; displayName: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const artPosition = BOSS_ART_POSITION[boss] ?? DEFAULT_ART_POSITION;
  const containerStyle: CSSProperties = {
    position: "relative", width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 10,
    overflow: "hidden", flexShrink: 0, background: theme.bg,
  };
  const fallbackStyle: CSSProperties = {
    position: "absolute", inset: 0, display: iconId ? "none" : "flex",
    alignItems: "center", justifyContent: "center", background: theme.accentSoft,
  };
  return (
    <div style={containerStyle}>
      {iconId && (
        <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }}>
          <div style={bannerMaskStyle()}>
            <Image
              src={bossSplashUrl(iconId)}
              alt=""
              fill
              unoptimized
              sizes={`${BANNER_WIDTH}px`}
              onError={() => {
                if (wrapperRef.current) wrapperRef.current.style.display = "none";
                if (fallbackRef.current) fallbackRef.current.style.display = "flex";
              }}
              style={{ objectFit: "cover", objectPosition: artPosition }}
            />
          </div>
          <div style={bannerScrimStyle} />
          <span style={bannerNameStyle}>{displayName}</span>
        </div>
      )}
      <div ref={fallbackRef} style={fallbackStyle}>
        <span style={{ fontSize: 13, fontWeight: 800, color: theme.accentText }}>{displayName}</span>
      </div>
    </div>
  );
}
