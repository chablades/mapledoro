/*
  Picks where MapGuessr's first reveal square sits on a minimap: the square (FIRST_STEP
  of the shorter side, matching REVEAL_STEPS[0] in MinimapReveal.tsx) with the most to
  recognize. Later, larger squares grow around the same centre.

  A window scores by the outlines of the map's own art against the sky (alpha edges:
  platform and building silhouettes) plus the texture inside it (luminance edges where
  opaque). Windows that are almost all sky are damped, and so are ones that are solid
  ground with no outline; a mild pull keeps ties near the middle. Scored on the minimap
  alone: the backdrop shows everywhere, so it rarely changes which part is telling.
*/

const FIRST_STEP = 0.3;
const FRAME = 2; // minimaps carry a faint 1px border whose edge would read as an outline

function edges(values, w, h) {
  const out = new Float32Array(w * h);
  for (let y = FRAME; y < h - FRAME; y++) {
    for (let x = FRAME; x < w - FRAME; x++) {
      const i = y * w + x;
      out[i] = Math.abs(values[i] - values[i - 1]) + Math.abs(values[i] - values[i - w]);
    }
  }
  return out;
}

// Summed-area table with a zero row/column, for O(1) window sums.
function integral(values, w, h) {
  const t = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += values[y * w + x];
      t[(y + 1) * (w + 1) + x + 1] = t[y * (w + 1) + x + 1] + row;
    }
  }
  return t;
}

/** Centre of the best first square, as [x, y] fractions of the minimap, rounded to 0.001. */
export function revealCenter(rgba, w, h) {
  const s = Math.max(2, Math.round(FIRST_STEP * Math.min(w, h)));
  const alpha = new Float32Array(w * h);
  const luma = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3] / 255;
    alpha[i] = a;
    luma[i] = ((0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255) * a;
  }
  const lumaEdges = edges(luma, w, h).map((v, i) => v * alpha[i]);
  const shape = integral(edges(alpha, w, h), w, h);
  const detail = integral(lumaEdges, w, h);
  const cover = integral(alpha, w, h);
  const sum = (t, x, y) =>
    (t[(y + s) * (w + 1) + x + s] - t[y * (w + 1) + x + s] - t[(y + s) * (w + 1) + x] + t[y * (w + 1) + x]) / (s * s);

  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = 0; y + s <= h; y++) {
    for (let x = 0; x + s <= w; x++) {
      const c = sum(cover, x, y);
      const dx = (x + s / 2) / w - 0.5;
      const dy = (y + s / 2) / h - 0.5;
      const score =
        (sum(shape, x, y) + sum(detail, x, y)) *
        Math.min(1, c / 0.25) *
        Math.min(1, Math.max(0.3, (1 - c) / 0.1)) *
        (1 - 0.6 * (dx * dx + dy * dy));
      if (score > best) {
        best = score;
        bx = x;
        by = y;
      }
    }
  }
  const round = (v) => Math.round(v * 1000) / 1000;
  return [round((bx + s / 2) / w), round((by + s / 2) / h)];
}
