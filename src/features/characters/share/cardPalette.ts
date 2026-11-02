// Card colours come from the class art: the art's dominant hue, laid onto fixed OKLCH lightness
// and chroma roles taken from the original lavender card. Only the hue changes, so every
// text/background pair keeps the lavender card's contrast (body ~10:1, labels ~5:1, name tag
// ~12:1), which was checked across every class.

export interface CardPalette {
  /** Card background. */
  field: string;
  /** Main text ink, name tag fill, QR modules. */
  deep: string;
  /** Labels and secondary text. */
  mid: string;
  /** Borders and the band under the character. */
  hood: string;
  /** The window behind the character. */
  paper: string;
}

const ROLES: CardPalette = { field: "#e7e0f2", deep: "#3b2652", mid: "#6d4f8c", hood: "#c9bfe6", paper: "#fbf9fd" };

// Hand-picked exceptions where the art's colour misreads the class (keyed by display name).
const OVERRIDES: Record<string, { neutral?: true; hue?: number }> = {
  "Dual Blade": { neutral: true },
  Kain: { neutral: true },
  Hoyoung: { neutral: true },
  "Arch Mage (Fire/Poison)": { hue: 35 },
};

// Figures where under this share of the body is colourful (mostly black, white or grey, like
// Shade or Shadower) get a near-neutral card instead of their effects' colour.
const NEUTRAL_SHARE = 0.2;
const NEUTRAL_CHROMA_SCALE = 0.2;
const FALLBACK_HUE = 285;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch(r8: number, g8: number, b8: number) {
  const [r, g, b] = [r8, g8, b8].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToLinearRgb(L: number, C: number, H: number): number[] {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH to hex, lowering chroma until the colour fits sRGB so hue and lightness hold. */
function oklchHex(L: number, C: number, H: number): string {
  for (let c = C; c >= 0; c -= 0.002) {
    const rgb = oklchToLinearRgb(L, c, H);
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) {
      return "#" + rgb.map((v) => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255).toString(16).padStart(2, "0")).join("");
    }
  }
  return "#808080";
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function paletteFor(hue: number, chromaScale: number): CardPalette {
  const out = {} as CardPalette;
  for (const key of Object.keys(ROLES) as (keyof CardPalette)[]) {
    const [r, g, b] = hexRgb(ROLES[key]);
    const { L, C } = rgbToOklch(r, g, b);
    out[key] = oklchHex(L, C * chromaScale, hue);
  }
  return out;
}

// Skin tones are skipped so faces don't tint every card orange.
const isSkin = (L: number, C: number, H: number, maxL: number, maxC: number) => H > 25 && H < 80 && L > maxL && C < maxC;

/** Chroma-weighted dominant hue over opaque, colourful, non-skin pixels (10-degree buckets). */
function dominantHue(pixels: Uint8ClampedArray): number {
  const weight = new Array<number>(36).fill(0);
  const hueSum = new Array<number>(36).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;
    const { L, C, H } = rgbToOklch(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (C < 0.04 || L < 0.25 || isSkin(L, C, H, 0.72, 0.12)) continue;
    const k = Math.floor(H / 10);
    weight[k] += C;
    hueSum[k] += C * H;
  }
  const best = weight.indexOf(Math.max(...weight));
  return weight[best] > 0 ? hueSum[best] / weight[best] : FALLBACK_HUE;
}

/** Share of the body (bright highlights and glows excluded) that has real colour. */
function colourShare(pixels: Uint8ClampedArray): number {
  let body = 0;
  let colourful = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 250) continue;
    const { L, C, H } = rgbToOklch(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (L > 0.82) continue;
    body++;
    if (C >= 0.05 && L >= 0.25 && !isSkin(L, C, H, 0.6, 0.13)) colourful++;
  }
  return body ? colourful / body : 0;
}

/** The card palette for a class, from its art's pixels (or null when it has no art). */
export function cardPaletteFor(className: string, artPixels: Uint8ClampedArray | null): CardPalette {
  const override = OVERRIDES[className];
  if (!artPixels) return paletteFor(override?.hue ?? FALLBACK_HUE, NEUTRAL_CHROMA_SCALE);
  const hue = override?.hue ?? dominantHue(artPixels);
  const neutral = override?.neutral ?? (override?.hue === undefined && colourShare(artPixels) < NEUTRAL_SHARE);
  return paletteFor(hue, neutral ? NEUTRAL_CHROMA_SCALE : 1);
}
