// Draws the character card (750x1050) on a canvas. Layout values come from the approved
// mockup; keep them together here so a design tweak is one edit. Third-party images go through
// /api/img-proxy so the canvas stays exportable.

import { cardPaletteFor, type CardPalette } from "./cardPalette";

export interface CardContent {
  ign: string;
  level: number;
  /** Display class name, e.g. "Dual Blade". */
  className: string;
  worldName: string;
  worldIconUrl: string;
  avatarUrl: string;
  /** Empty when the class has no official art. */
  classArtUrl: string;
  /** Live Scouter Boss 380 figure, or null when the character isn't set up. */
  scouter: number | null;
  date: string;
  qr: { modules: boolean[][] };
}

const W = 750;
const H = 1050;
const WINDOW = { x: 40, y: 40, w: 670, h: 640, r: 24, border: 2 };
const INNER = { x: 42, y: 42, w: 666, h: 636 };
const COLUMN = 207.33;
const COLUMNS = [40, 271.33, 502.67];
const STATS_TOP = 712;
const LABEL_LINE = 27.3;
const VALUE_LINE = 44.1;
const QR_PLATE = { x: 503, y: 799, size: 207, code: 191 };
const ART_MAX_W = 188;
const ART_GAP = 16;
const ART_FADE = 24;

const proxied = (url: string) => (url.startsWith("/") ? url : `/api/img-proxy?url=${encodeURIComponent(url)}`);

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  const img = new Image();
  img.src = proxied(url);
  try {
    await img.decode();
  } catch {
    return null;
  }
  // The proxy answers failures with a 1x1 transparent pixel.
  return img.naturalWidth > 1 ? img : null;
}

function fontFamilies() {
  const style = getComputedStyle(document.body);
  return {
    heading: style.getPropertyValue("--font-heading").trim() || "sans-serif",
    body: style.getPropertyValue("--font-body").trim() || "sans-serif",
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}

/** Shrinks an image to w x h by halving until within 2x of the target, then one last draw.
 *  A single large shrink (Doro is 500px drawn at 52) drops most pixels in some browsers,
 *  Firefox especially, which ignores imageSmoothingQuality, and breaks thin outlines. */
function downscaled(img: CanvasImageSource & { width: number; height: number }, w: number, h: number): CanvasImageSource {
  let source: CanvasImageSource = img;
  let sw = img.width;
  let sh = img.height;
  while (sw / 2 >= w && sh / 2 >= h) {
    const step = document.createElement("canvas");
    step.width = Math.ceil(sw / 2);
    step.height = Math.ceil(sh / 2);
    const sctx = step.getContext("2d");
    if (!sctx) break;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    sw = step.width;
    sh = step.height;
  }
  return source;
}

// Nunito's cap height as a share of the font size (from the font file). A fixed value rather
// than measuring "H", which browsers report with fractions that round a pixel apart.
const NUNITO_CAP_HEIGHT = 0.705;

/** Draws one line of Nunito centred on its capitals around (cx, cy); descenders hang below, the
 *  way text sits in a button. "middle" centres the font's em box instead, which in Nunito leaves
 *  the letters high, and by an amount that differs per browser. Returns the ink width. */
function capCentred(ctx: CanvasRenderingContext2D, value: string, cx: number, cy: number, size: number, family: string, color: string): number {
  ctx.font = `800 ${size}px ${family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const ink = ctx.measureText(value);
  const capHeight = size * NUNITO_CAP_HEIGHT;
  const inkWidth = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight;
  ctx.fillStyle = color;
  // Browsers report these measurements with slightly different fractions; snapping the origin
  // to whole pixels keeps Chrome and Firefox from rounding the text a pixel apart.
  ctx.fillText(value, Math.round(cx - inkWidth / 2 + ink.actualBoundingBoxLeft), Math.round(cy + capHeight / 2));
  return inkWidth;
}

function pixelsOf(img: HTMLImageElement): Uint8ClampedArray {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Uint8ClampedArray();
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height).data;
}

interface ArtBounds { x0: number; x1: number; y0: number; y1: number; touch: { l: boolean; r: boolean; t: boolean; b: boolean } }

/** The figure's box (rows/columns with a few solid pixels, so faint glows don't count) and which
 *  image edges any faint glow runs into, measured separately with a low threshold. */
function artBounds(pixels: Uint8ClampedArray, w: number, h: number): ArtBounds {
  const alpha = (x: number, y: number) => pixels[(y * w + x) * 4 + 3];
  const rows = new Array<number>(h).fill(0);
  const cols = new Array<number>(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha(x, y) > 128) { rows[y]++; cols[x]++; }
  const first = (a: number[]) => Math.max(0, a.findIndex((n) => n >= 3));
  const last = (a: number[]) => { const i = [...a].reverse().findIndex((n) => n >= 3); return i < 0 ? a.length - 1 : a.length - 1 - i; };
  const edge = (points: [number, number][]) => points.filter(([x, y]) => alpha(x, y) > 6).length > 4;
  const xs = Array.from({ length: w }, (_, i) => i);
  const ys = Array.from({ length: h }, (_, i) => i);
  return {
    x0: first(cols), x1: last(cols), y0: first(rows), y1: last(rows),
    touch: {
      l: edge(ys.map((y) => [0, y])), r: edge(ys.map((y) => [w - 1, y])),
      t: edge(xs.map((x) => [x, 0])), b: edge(xs.map((x) => [x, h - 1])),
    },
  };
}

/** The art scaled by `k` on its own canvas, fading out over ART_FADE px on each edge it touches. */
function fadedArt(img: HTMLImageElement, k: number, touch: ArtBounds["touch"]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.ceil(img.naturalWidth * k);
  c.height = Math.ceil(img.naturalHeight * k);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(downscaled(img, c.width, c.height), 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "destination-out";
  const fade = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  if (touch.l) fade(0, 0, ART_FADE, 0, 0, 0, ART_FADE, c.height);
  if (touch.r) fade(c.width, 0, c.width - ART_FADE, 0, c.width - ART_FADE, 0, ART_FADE, c.height);
  if (touch.t) fade(0, 0, 0, ART_FADE, 0, 0, c.width, ART_FADE);
  if (touch.b) fade(0, c.height, 0, c.height - ART_FADE, 0, c.height - ART_FADE, c.width, ART_FADE);
  return c;
}

function drawWindow(ctx: CanvasRenderingContext2D, p: CardPalette, f: ReturnType<typeof fontFamilies>, c: CardContent, avatar: HTMLImageElement | null, doro: HTMLImageElement | null) {
  roundRect(ctx, WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, WINDOW.r);
  ctx.fillStyle = p.paper;
  ctx.fill();
  ctx.save();
  roundRect(ctx, INNER.x, INNER.y, INNER.w, INNER.h, WINDOW.r - WINDOW.border);
  ctx.clip();
  // Band under the character, clipped to the window's rounded bottom.
  ctx.fillStyle = p.hood;
  ctx.fillRect(INNER.x, INNER.y + INNER.h - 44, INNER.w, 44);
  capCentred(ctx, "Import at mapledoro.com", W / 2, INNER.y + INNER.h - 22, 18, f.body, p.deep);
  ctx.restore();
  roundRect(ctx, WINDOW.x + 1, WINDOW.y + 1, WINDOW.w - 2, WINDOW.h - 2, WINDOW.r - 1);
  ctx.strokeStyle = p.hood;
  ctx.lineWidth = WINDOW.border;
  ctx.stroke();

  // Header: Doro + wordmark on the left, the export date on the right, on one centre line.
  if (doro) ctx.drawImage(downscaled(doro, 52, 52), 72, 66, 52, 52);
  text(ctx, "MapleDoro", doro ? 134 : 72, 92, `700 22px ${f.heading}`, p.mid);
  text(ctx, c.date, 678, 92, `700 22px ${f.heading}`, p.mid, "right");

  if (avatar) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(avatar, 149, 178, 384, 384);
    ctx.imageSmoothingEnabled = true;
  } else {
    text(ctx, c.className.charAt(0), W / 2, 370, `700 160px ${f.heading}`, p.hood, "center");
  }

  drawNameTag(ctx, p, f, c.ign);
}

// In-game style name tag under the character, with the capitals centred in it. The box is sized
// from the advance width, which comes from the font file and matches across browsers; the ink
// bounds browsers report differ by about a pixel and made Chrome's box wider than Firefox's.
function drawNameTag(ctx: CanvasRenderingContext2D, p: CardPalette, f: ReturnType<typeof fontFamilies>, ign: string) {
  const top = 562;
  const height = 44;
  ctx.font = `800 30px ${f.body}`;
  const boxW = Math.round(ctx.measureText(ign).width) + 36;
  roundRect(ctx, Math.round(W / 2 - boxW / 2), top, boxW, height, 10);
  ctx.fillStyle = p.deep;
  ctx.fill();
  capCentred(ctx, ign, W / 2, top + height / 2, 30, f.body, "#ffffff");
}

/** Splits a class name onto two lines only when it is wider than its column. */
function classLines(ctx: CanvasRenderingContext2D, name: string, font: string): string[] {
  const shortNames: Record<string, string[]> = { "Arch Mage (Fire/Poison)": ["Arch Mage", "(F/P)"], "Arch Mage (Ice/Lightning)": ["Arch Mage", "(I/L)"] };
  if (shortNames[name]) return shortNames[name];
  ctx.font = font;
  if (ctx.measureText(name).width <= COLUMN || !name.includes(" ")) return [name];
  const [first, ...rest] = name.split(" ");
  return [first, rest.join(" ")];
}

function drawStats(ctx: CanvasRenderingContext2D, p: CardPalette, f: ReturnType<typeof fontFamilies>, c: CardContent, worldIcon: HTMLImageElement | null): number {
  const label = `700 20px ${f.body}`;
  const value = `700 42px ${f.heading}`;
  const labelY = STATS_TOP + LABEL_LINE / 2;
  const valueY = STATS_TOP + LABEL_LINE + VALUE_LINE / 2;
  ctx.letterSpacing = "-0.84px";
  text(ctx, "Level", COLUMNS[0], labelY, label, p.mid);
  text(ctx, String(c.level), COLUMNS[0], valueY, value, p.deep);
  text(ctx, "Class", COLUMNS[1], labelY, label, p.mid);
  const lines = classLines(ctx, c.className, value);
  lines.forEach((line, i) => text(ctx, line, COLUMNS[1], valueY + i * VALUE_LINE, value, p.deep));
  text(ctx, "World", COLUMNS[2], labelY, label, p.mid);
  let worldX = COLUMNS[2];
  if (worldIcon) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(worldIcon, worldX, valueY - 22, 36, 44);
    ctx.imageSmoothingEnabled = true;
    worldX += 42;
  }
  text(ctx, c.worldName, worldX, valueY, value, p.deep);

  // The Scouter number keeps one position whatever the class name's line count.
  const wideTop = STATS_TOP + 104;
  text(ctx, "Scouter (Boss 380)", COLUMNS[0], wideTop + LABEL_LINE / 2, label, p.mid);
  if (c.scouter === null) text(ctx, "Not set up", COLUMNS[0], wideTop + LABEL_LINE + 30, `700 36px ${f.heading}`, p.mid);
  else text(ctx, c.scouter.toLocaleString("en-US"), COLUMNS[0], wideTop + LABEL_LINE + 33.6, `700 64px ${f.heading}`, p.deep);
  ctx.letterSpacing = "0px";
  return STATS_TOP + LABEL_LINE + VALUE_LINE * lines.length;
}

function drawClassArt(ctx: CanvasRenderingContext2D, art: HTMLImageElement, pixels: Uint8ClampedArray, nameBottom: number) {
  const b = artBounds(pixels, art.naturalWidth, art.naturalHeight);
  const cw = b.x1 - b.x0 + 1;
  const ch = b.y1 - b.y0 + 1;
  const top = nameBottom + ART_GAP;
  const k = Math.min(ART_MAX_W / cw, (H - 20 - top) / ch);
  const artH = ch * k;
  // Art shorter than the QR centres on it instead, never rising above the gap under the name.
  const artTop = artH < QR_PLATE.size ? Math.max(top, QR_PLATE.y + (QR_PLATE.size - artH) / 2) : top;
  ctx.drawImage(fadedArt(art, k, b.touch), COLUMNS[1] - b.x0 * k, artTop - b.y0 * k);
}

function drawQr(ctx: CanvasRenderingContext2D, p: CardPalette, f: ReturnType<typeof fontFamilies>, modules: boolean[][]) {
  roundRect(ctx, QR_PLATE.x, QR_PLATE.y, QR_PLATE.size, QR_PLATE.size, 14);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  roundRect(ctx, QR_PLATE.x + 1, QR_PLATE.y + 1, QR_PLATE.size - 2, QR_PLATE.size - 2, 13);
  ctx.strokeStyle = p.hood;
  ctx.lineWidth = 2;
  ctx.stroke();
  const n = modules.length;
  const unit = QR_PLATE.code / n;
  const origin = QR_PLATE.x + (QR_PLATE.size - QR_PLATE.code) / 2;
  const originY = QR_PLATE.y + (QR_PLATE.size - QR_PLATE.code) / 2;
  // Module edges snap to whole pixels; fractional edges anti-alias into white seams.
  const edge = (start: number, i: number) => Math.round(start + i * unit);
  ctx.fillStyle = p.deep;
  modules.forEach((row, r) => row.forEach((dark, col) => {
    if (!dark) return;
    const x = edge(origin, col);
    const y = edge(originY, r);
    ctx.fillRect(x, y, edge(origin, col + 1) - x, edge(originY, r + 1) - y);
  }));
  text(ctx, "* Scan to view or import", QR_PLATE.x + QR_PLATE.size / 2, H - 28, `700 15px ${f.body}`, p.deep, "center");
}

/** Renders the card and returns it as PNG bytes. */
export async function renderCharacterCard(content: CardContent): Promise<Uint8Array> {
  const fonts = fontFamilies();
  // A canvas draws with whatever is loaded at that moment, so every face and weight the card
  // uses is loaded first; a missing one falls back to a system serif in some browsers.
  await Promise.all([`700 42px ${fonts.heading}`, `700 20px ${fonts.body}`, `800 30px ${fonts.body}`].map((font) => document.fonts.load(font)));
  const [avatar, art, doro, worldIcon] = await Promise.all([
    loadImage(content.avatarUrl), loadImage(content.classArtUrl), loadImage("/icons/doro.png"), loadImage(content.worldIconUrl),
  ]);
  const artPixels = art ? pixelsOf(art) : null;
  const palette = cardPaletteFor(content.className, artPixels);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  // Doro (500px -> 52px) and the class art shrink a lot; the default low-quality filter drops
  // most of their pixels and breaks thin outlines.
  ctx.imageSmoothingQuality = "high";
  roundRect(ctx, 0, 0, W, H, 34);
  ctx.fillStyle = palette.field;
  ctx.fill();
  drawWindow(ctx, palette, fonts, content, avatar, doro);
  const nameBottom = drawStats(ctx, palette, fonts, content, worldIcon);
  if (art && artPixels) drawClassArt(ctx, art, artPixels, nameBottom);
  drawQr(ctx, palette, fonts, content.qr.modules);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG encoding failed");
  return new Uint8Array(await blob.arrayBuffer());
}
