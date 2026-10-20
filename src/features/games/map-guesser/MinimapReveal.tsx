"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { mapBackUrl, mapMinimapUrl } from "../../../lib/mapleResource";

/**
 * Side of the revealed square as a share of the minimap's shorter side, by misses so far.
 * Below 1 so even the last step stays a square section, never a full-width/height band.
 * The first step must match FIRST_STEP in scripts/map-guesser-reveal.mjs, which picks
 * where that square sits.
 */
const REVEAL_STEPS = [0.3, 0.42, 0.54, 0.66, 0.78, 0.9];

const FRAME_HEIGHT = 200;
const FRAME_PAD = 8;

const frame: CSSProperties = {
  position: "relative",
  width: "100%",
  height: FRAME_HEIGHT,
  borderRadius: 14,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const layers: CSSProperties = { position: "absolute", inset: 0, transition: "clip-path 0.5s ease" };

/** clip-path showing a square of `fraction` x the shorter side around `center`, clamped inside the image. */
function revealClip([fx, fy]: [number, number], w: number, h: number, fraction: number): string | undefined {
  if (fraction >= 1) return undefined;
  const side = fraction * Math.min(w, h);
  const x0 = Math.min(Math.max(fx * w - side / 2, 0), w - side);
  const y0 = Math.min(Math.max(fy * h - side / 2, 0), h - side);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return `inset(${pct(y0, h)} ${pct(w - x0 - side, w)} ${pct(h - y0 - side, h)} ${pct(x0, w)})`;
}

/**
 * The puzzle's minimap over its backdrop, hidden except for a square that grows with each
 * miss around `center`. The minimap's outline stays visible, so its shape is part of the
 * clue. `misses` null shows the whole minimap (puzzle finished).
 */
export default function MinimapReveal({
  theme,
  mapId,
  center,
  misses,
}: {
  theme: AppTheme;
  mapId: number;
  center: [number, number];
  misses: number | null;
}) {
  // Natural size, read on load: the clip and the wrapper's aspect ratio both need it.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const fraction = misses === null ? 1 : REVEAL_STEPS[Math.min(misses, REVEAL_STEPS.length - 1)];
  const aspect = size ? size.w / size.h : 2;
  const clip = size ? revealClip(center, size.w, size.h, fraction) : "inset(50%)";
  // Whole-number upscale that fits the frame: fractional scaling blurs or warps pixels this small.
  const scale = size ? Math.max(1, Math.floor((FRAME_HEIGHT - FRAME_PAD * 2) / size.h)) : 1;
  const pixelated = scale > 1 ? "pixelated" : undefined;

  return (
    <div style={{ ...frame, border: `1px solid ${theme.border}`, background: theme.timerBg }}>
      <div
        style={{
          position: "relative",
          aspectRatio: String(aspect),
          width: `min(calc(100% - ${FRAME_PAD * 2}px), ${(FRAME_HEIGHT - FRAME_PAD * 2) * aspect}px, ${size ? size.w * scale : 9999}px)`,
          outline: `1px dashed ${theme.border}`,
        }}
      >
        <div style={{ ...layers, clipPath: clip }}>
          {/* Backdrop: same size as the minimap, so it lines up beneath it. Some maps have none. */}
          <Image
            src={mapBackUrl(mapId)}
            alt=""
            fill
            unoptimized
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{ imageRendering: pixelated }}
          />
          <Image
            src={mapMinimapUrl(mapId)}
            alt="Mystery map minimap"
            fill
            unoptimized
            // Eager: a fully clipped lazy image counts as off-screen and would never load.
            loading="eager"
            ref={(img) => {
              // Covers an image that finished loading before React attached onLoad.
              if (img?.complete && img.naturalWidth > 0 && !size) setSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{ imageRendering: pixelated }}
          />
        </div>
      </div>
    </div>
  );
}
