"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { mapBackUrl, mapMinimapUrl } from "../../../lib/mapleResource";

/**
 * Side of the revealed square as a share of the minimap's shorter side, by misses so far.
 * The first step must match FIRST_STEP in scripts/map-guesser-reveal.mjs, which picks
 * where that square sits.
 */
const REVEAL_STEPS = [0.3, 0.42, 0.54, 0.66, 0.78, 0.9];
/** TEMPORARY (map render preview): steps for `viewSrc`, tighter since a render is full size. */
const VIEW_STEPS = [0.15, 0.24, 0.35, 0.5, 0.68, 0.88];

const FRAME_SIZE = 260;

const frame: CSSProperties = {
  position: "relative",
  width: `min(100%, ${FRAME_SIZE}px)`,
  aspectRatio: "1",
  borderRadius: 14,
  overflow: "hidden",
};

const layers: CSSProperties = {
  position: "absolute",
  transition: "left 0.5s ease, top 0.5s ease, width 0.5s ease, height 0.5s ease",
};

/**
 * Places the minimap so its square of `fraction` x the shorter side around `center`
 * (clamped inside the image) fills the frame. Percentages of the square frame's side.
 */
function revealBox([fx, fy]: [number, number], w: number, h: number, fraction: number): CSSProperties {
  const side = fraction * Math.min(w, h);
  const x0 = Math.min(Math.max(fx * w - side / 2, 0), w - side);
  const y0 = Math.min(Math.max(fy * h - side / 2, 0), h - side);
  const pct = (v: number) => `${(v / side) * 100}%`;
  return { left: pct(-x0), top: pct(-y0), width: pct(w), height: pct(h) };
}

/**
 * The puzzle's minimap over its backdrop, zoomed into a square that widens with each miss
 * around `center`. `misses` null shows the largest square (puzzle finished; the results
 * dialog shows the whole map).
 */
export default function MinimapReveal({
  theme,
  mapId,
  center,
  misses,
  viewSrc,
}: {
  theme: AppTheme;
  mapId: number;
  center: [number, number];
  misses: number | null;
  /** TEMPORARY (map render preview): a square full-size render of part of the map, shown instead of the minimap. */
  viewSrc?: string;
}) {
  // Natural size, read on load: placing the square needs it. Until then the layer has no
  // size (auto, so the first placement doesn't animate in from a full view of the map).
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const steps = viewSrc ? VIEW_STEPS : REVEAL_STEPS;
  const fraction = misses === null ? 1 : steps[Math.min(misses, steps.length - 1)];
  const box = size ? revealBox(center, size.w, size.h, fraction) : undefined;

  return (
    <div style={{ ...frame, border: `1px solid ${theme.border}`, background: theme.timerBg }}>
      <div style={{ ...layers, ...box }}>
        {/* Backdrop: same size as the minimap, so it lines up beneath it. Some maps have none. */}
        {!viewSrc && (
          <Image
            src={mapBackUrl(mapId)}
            alt=""
            fill
            unoptimized
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <Image
          src={viewSrc ?? mapMinimapUrl(mapId)}
          alt="Mystery map minimap"
          fill
          unoptimized
          // Eager: a zero-size or mostly off-frame lazy image counts as off-screen and would never load.
          loading="eager"
          ref={(img) => {
            // Covers an image that finished loading before React attached onLoad.
            if (img?.complete && img.naturalWidth > 0 && !size) setSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
