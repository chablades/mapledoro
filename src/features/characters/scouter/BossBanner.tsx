"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { bossSplashUrl } from "../../../lib/mapleResource";

const BANNER_WIDTH = 180;
const BANNER_HEIGHT = 64;
// Vertical anchor for the wide banner crop of mob.png, which is a tall splash. 20% lands
// roughly on the head and shoulders for the 2 splashes checked so far, Malefic Star and First
// Adversary. Not checked across the full roster.
export const DEFAULT_ART_POSITION = "50% 20%";
// Per-boss override, keyed like BOSS_ICON_ID, since framing varies enough per splash that a
// single default crop misses most faces. Tuned by hand against each boss's real mob.png in the
// WZ image dump, picking the vertical anchor as a percentage of source height that lands on the
// face in the wide banner crop. Gloom has no face, being an inanimate seal, so it is positioned
// on the portal's glowing center.
export const BOSS_ART_POSITION: Record<string, string> = {
  스우: "50% 25%", 데미안: "42% 50%", 루시드: "50% 43%", 윌: "68% 61%", 더스크: "50% 53%",
  "진 힐라": "50% 23%", 듄켈: "48% 46%", "검은 마법사": "42% 19%", 세렌: "50% 33%",
  칼로스: "55% 60%", 대적자: "75% 29%", 흉성: "50% 26%", 카링: "50% 26%", 림보: "50% 58%",
  발드릭스: "50% 40%", 유피테르: "48% 25%", 가엔슬: "50% 51%", 카이: "50% 28%",
  "Akechi Mitsuhide": "50% 29%", "Princess No": "50% 35%", Vellum: "50% 65%", "Pink Bean": "50% 50%", Cygnus: "50% 62%", Arkarium: "50% 74%", Horntail: "50% 30%", Papulatus: "50% 35%",
  Pierre: "50% 40%", "Von Bon": "50% 40%", "Crimson Queen": "50% 24%",
  "Von Leon": "50% 54%", Hilla: "50% 40%", Magnus: "50% 40%", Zakum: "50% 54%",
};

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
