// Reads a character card's QR from an image: a card whose embedded data was stripped, a copy
// re-saved by a chat app, a screenshot, or a phone photo of a card.
//
// Decoding uses zxing-cpp's WebAssembly build. On phone photos of a card shown on a monitor (moiré,
// glare, slight blur) it read 5 of 6 test shots where jsQR read 1, in tens of milliseconds instead
// of seconds, so it runs on the main thread without freezing the page.

import type { ReaderOptions } from "zxing-wasm/reader";
import { QR_LINK_PREFIX } from "./qrCodec";

// The library fetches its .wasm from a public CDN by default. Serving it from this site keeps
// imports working wherever the page itself loads, and keeps image imports off third-party servers.
const WASM_URL = new URL("zxing-wasm/reader/zxing_reader.wasm", import.meta.url).href;

const READER_OPTIONS: ReaderOptions = { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 1 };

// Up to the card's own size (750x1050), a copy may be a downscaled chat preview. Copies down to
// ~400px wide read as they are; ~350px wide ones need 3x; below that the QR is unrecoverable.
const SMALL_COPY_SIDE = 1100;
const SMALL_COPY_SCALES = [1, 3];
// iOS Safari refuses canvases over ~16.7M pixels, which a 48MP photo exceeds. 4032 is a 12MP
// photo's long side, which reads at full size.
const MAX_LONG_SIDE = 4032;

let readerModule: Promise<typeof import("zxing-wasm/reader")> | null = null;

function loadReader() {
  readerModule ??= import("zxing-wasm/reader")
    .then((zxing) => {
      zxing.prepareZXingModule({
        overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? WASM_URL : prefix + path) },
      });
      return zxing;
    })
    .catch((error: unknown) => {
      // Let the next import try again instead of caching the failure.
      readerModule = null;
      throw error;
    });
  return readerModule;
}

function pixelsAt(bitmap: ImageBitmap, scale: number): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Release the canvas's backing memory now rather than whenever it is collected.
  canvas.width = 0;
  canvas.height = 0;
  return image;
}

function scalesFor(longSide: number): number[] {
  return longSide <= SMALL_COPY_SIDE ? SMALL_COPY_SCALES : [Math.min(1, MAX_LONG_SIDE / longSide)];
}

async function searchAll(bitmap: ImageBitmap): Promise<string | null> {
  const { readBarcodes } = await loadReader();
  for (const scale of scalesFor(Math.max(bitmap.width, bitmap.height))) {
    const image = pixelsAt(bitmap, scale);
    if (!image) continue;
    const found = (await readBarcodes(image, READER_OPTIONS)).find((result) => result.isValid);
    if (found) return found.text;
  }
  return null;
}

/** The data after the # of a card QR found in the image; null when the image has no readable
 *  QR, or its QR isn't a MapleDoro card link. */
export async function readCardQrFromImage(file: Blob): Promise<string | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const text = await searchAll(bitmap);
    return text?.startsWith(QR_LINK_PREFIX) ? text.slice(QR_LINK_PREFIX.length) : null;
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}
