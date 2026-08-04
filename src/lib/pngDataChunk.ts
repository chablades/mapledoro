import { crc32 } from "./crc32";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Ancillary (lowercase first letter) + private (lowercase third letter is the safe-to-
// copy convention, but third letter uppercase here per PNG spec's "reserved" bit
// convention for copy-safe ancillary chunks) -- "Cz" for "character, zipped", picked
// to be boring and unambiguous rather than cute, so a future different embed doesn't
// collide with this one.
export const CHARACTER_CHUNK_TYPE = "mdCz";

export function isPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((byte, i) => bytes[i] === byte);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function writeUint32BE(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, false);
}

interface ParsedChunk {
  type: string;
  data: Uint8Array;
  // Byte offset of this chunk's own 4-byte length field -- the start of the chunk.
  start: number;
  // Byte offset immediately after this chunk's 4-byte CRC -- the start of the next chunk.
  end: number;
}

// Walks every chunk in a well-formed PNG. Assumes `bytes` already passed isPngSignature.
function* walkChunks(bytes: Uint8Array): Generator<ParsedChunk> {
  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4; // + CRC
    if (chunkEnd > bytes.length) return; // truncated/corrupt -- stop rather than read out of bounds
    yield { type, data: bytes.subarray(dataStart, dataEnd), start: offset, end: chunkEnd };
    if (type === "IEND") return;
    offset = chunkEnd;
  }
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) typeBytes[i] = type.charCodeAt(i);
  const typeAndData = new Uint8Array(typeBytes.length + data.length);
  typeAndData.set(typeBytes, 0);
  typeAndData.set(data, typeBytes.length);

  const chunk = new Uint8Array(4 + typeAndData.length + 4);
  const view = new DataView(chunk.buffer);
  writeUint32BE(view, 0, data.length);
  chunk.set(typeAndData, 4);
  writeUint32BE(view, 4 + typeAndData.length, crc32(typeAndData));
  return chunk;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Compresses `json` (already-serialized) and inserts it as a private ancillary chunk
 *  into `pngBytes`, immediately before IEND. Returns a new Uint8Array; does not mutate
 *  the input. Throws if `pngBytes` isn't a well-formed PNG (callers control that input,
 *  unlike extractJsonFromPng's untrusted-input contract below). */
export async function embedJsonInPng(pngBytes: Uint8Array, json: string): Promise<Uint8Array> {
  let iendStart: number | null = null;
  for (const chunk of walkChunks(pngBytes)) {
    if (chunk.type === "IEND") { iendStart = chunk.start; break; }
  }
  if (iendStart === null) throw new Error("Not a well-formed PNG: no IEND chunk found");

  const compressed = await gzip(new TextEncoder().encode(json));
  const newChunk = buildChunk(CHARACTER_CHUNK_TYPE, compressed);

  const result = new Uint8Array(pngBytes.length + newChunk.length);
  result.set(pngBytes.subarray(0, iendStart), 0);
  result.set(newChunk, iendStart);
  result.set(pngBytes.subarray(iendStart), iendStart + newChunk.length);
  return result;
}

/** Scans `pngBytes` for the first chunk of CHARACTER_CHUNK_TYPE, decompresses it, and
 *  returns the original JSON string. Returns null if absent, truncated, or corrupt (bad
 *  CRC, decompression failure) -- never throws, so callers (untrusted import input) can
 *  treat "no embedded data" and "not a PNG at all" the same way. */
export async function extractJsonFromPng(pngBytes: Uint8Array): Promise<string | null> {
  if (!isPngSignature(pngBytes)) return null;
  try {
    for (const chunk of walkChunks(pngBytes)) {
      if (chunk.type !== CHARACTER_CHUNK_TYPE) continue;
      const typeAndData = pngBytes.subarray(chunk.start + 4, chunk.end - 4);
      const storedCrc = readUint32BE(pngBytes, chunk.end - 4);
      if (crc32(typeAndData) !== storedCrc) return null;
      const decompressed = await gunzip(chunk.data);
      return new TextDecoder().decode(decompressed);
    }
    return null;
  } catch {
    return null;
  }
}
