"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { mapMinimapUrl } from "../../../lib/mapleResource";

/** Side of the revealed square as a share of the minimap's longer side, by misses so far. */
const REVEAL_STEPS = [0.15, 0.25, 0.38, 0.52, 0.7, 0.85];

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

/**
 * Where the square sits, as fractions of width/height; fixed per map. Kept to the lower
 * half, where minimaps put their ground and buildings (many skies are transparent).
 */
function revealCenter(mapId: number): [number, number] {
  let h = mapId | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return [0.25 + 0.5 * ((h & 0xffff) / 0xffff), 0.5 + 0.3 * (((h >>> 16) & 0xffff) / 0xffff)];
}

/** clip-path showing a square of `fraction` x the longer side, clamped inside the image. */
function revealClip(mapId: number, w: number, h: number, fraction: number): string | undefined {
  if (fraction >= 1) return undefined;
  const side = fraction * Math.max(w, h);
  const sw = Math.min(side, w);
  const sh = Math.min(side, h);
  const [fx, fy] = revealCenter(mapId);
  const x0 = Math.min(Math.max(fx * w - sw / 2, 0), w - sw);
  const y0 = Math.min(Math.max(fy * h - sh / 2, 0), h - sh);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return `inset(${pct(y0, h)} ${pct(w - x0 - sw, w)} ${pct(h - y0 - sh, h)} ${pct(x0, w)})`;
}

/**
 * The puzzle's minimap, hidden except for a square that grows with each miss. The
 * minimap's outline stays visible, so its shape is part of the clue. `misses` null
 * shows the whole minimap (puzzle finished).
 */
export default function MinimapReveal({
  theme,
  mapId,
  misses,
}: {
  theme: AppTheme;
  mapId: number;
  misses: number | null;
}) {
  // Natural size, read on load: the clip and the wrapper's aspect ratio both need it.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const fraction = misses === null ? 1 : REVEAL_STEPS[Math.min(misses, REVEAL_STEPS.length - 1)];
  const aspect = size ? size.w / size.h : 2;
  const clip = size ? revealClip(mapId, size.w, size.h, fraction) : "inset(50%)";

  return (
    <div style={{ ...frame, border: `1px solid ${theme.border}`, background: theme.timerBg }}>
      <div
        style={{
          position: "relative",
          aspectRatio: String(aspect),
          width: `min(calc(100% - ${FRAME_PAD * 2}px), ${(FRAME_HEIGHT - FRAME_PAD * 2) * aspect}px)`,
          outline: `1px dashed ${theme.border}`,
        }}
      >
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
          style={{ imageRendering: "pixelated", clipPath: clip, transition: "clip-path 0.5s ease" }}
        />
      </div>
    </div>
  );
}
