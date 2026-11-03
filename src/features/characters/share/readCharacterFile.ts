// Turns whatever a player brings into one character: a JSON export, a card PNG (whose JSON is
// embedded), or any other image of a card, read from its QR code. Shared by Import Character and
// the viewer, which differ only in what they do with the result.

import { parseImportedCharacterFile, type CharacterExportWorldData, type StoredCharacterRecord } from "../model/charactersStore";
import { extractJsonFromPng, isPngSignature } from "../../../lib/pngDataChunk";
import { CHARACTERS_COPY } from "../tabs/content";
import { decodeCharacterQr } from "./qrCodec";
import { readCardQrFromImage } from "./qrImage";

/** Set when the character came from a card's QR rather than its full data (only the equipped
 *  presets came along): "strippedPng" for a PNG whose embedded data was missing, "image" for any
 *  other image, "link" for a scanned card link. They get different notes, since "import the PNG"
 *  means nothing to someone who just did. */
export type QrSource = "image" | "strippedPng" | "link";

export type CharacterFileResult =
  | { ok: true; record: StoredCharacterRecord; world: CharacterExportWorldData; qrSource?: QrSource }
  | { ok: false; message: string };

const COPY = CHARACTERS_COPY.importCharacter;
const failure = (message: string): CharacterFileResult => ({ ok: false, message });

/** The data after a card link's #. */
export async function readCharacterQrData(data: string, source: QrSource): Promise<CharacterFileResult> {
  const decoded = await decodeCharacterQr(data);
  return decoded ? { ok: true, ...decoded, qrSource: source } : failure(COPY.invalidQrError);
}

// A card whose embedded data is gone (stripped, re-saved, or a WebP dragged out of Discord), or
// any photo or screenshot of one, can still be read from its QR code.
async function readQrFromImage(file: File, source: QrSource): Promise<CharacterFileResult> {
  const data = await readCardQrFromImage(file);
  return data === null ? failure(COPY.noCardInImageError) : readCharacterQrData(data, source);
}

// A card PNG carries the same JSON as a JSON export, gzipped in a private chunk, so it joins
// the JSON path right after extraction. Any other image falls back to the card's QR.
export async function readCharacterFile(file: File): Promise<CharacterFileResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng = isPngSignature(bytes);
  const embedded = isPng ? await extractJsonFromPng(bytes) : null;
  if ((isPng || file.type.startsWith("image/")) && embedded === null) return readQrFromImage(file, isPng ? "strippedPng" : "image");
  const text = embedded ?? new TextDecoder().decode(bytes);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    return failure(COPY.invalidJsonError);
  }

  // A world export, meaning multiple characters plus world-scoped Legion data, belongs in the
  // directory's own "Import World" button rather than here. This handles one character, and
  // redirecting a world file into a different bulk flow from an unrelated entry point would be a
  // confusing surprise, not a convenience.
  if (typeof parsedJson === "object" && parsedJson !== null && (parsedJson as Record<string, unknown>).kind === "world") {
    return failure(COPY.wrongFileTypeWorldError);
  }

  const parsed = parseImportedCharacterFile(parsedJson);
  return parsed ? { ok: true, record: parsed.record, world: parsed.world } : failure(COPY.invalidShapeError);
}
