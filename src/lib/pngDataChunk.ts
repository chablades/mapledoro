import { crc32 } from "./crc32";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// PNG chunk names encode their handling in letter case: lowercase first letter means ancillary
// (viewers ignore it), lowercase second means private (not a registered type), the third must be
// uppercase, and lowercase fourth means safe to copy when an editor rewrites the image. "mdCz"
// stands for MapleDoro character, zipped.
const CHARACTER_CHUNK_TYPE = "mdCz";

export function isPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((byte, i) => bytes[i] === byte);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

interface ParsedChunk {
  type: string;
  data: Uint8Array;
  /** Offset of the chunk's own 4-byte length field. */
  start: number;
  /** Offset just past the chunk's 4-byte CRC, where the next chunk starts. */
  end: number;
}

// Walks the chunks of a PNG that already passed isPngSignature. Stops at IEND, or quietly at a
// truncated chunk rather than reading out of bounds.
function* walkChunks(bytes: Uint8Array): Generator<ParsedChunk> {
  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4;
    if (chunkEnd > bytes.length) return;
    yield { type, data: bytes.subarray(dataStart, dataStart + length), start: offset, end: chunkEnd };
    if (type === "IEND") return;
    offset = chunkEnd;
  }
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length, false);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)), false);
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

/** Gzips `json` and inserts it as a private chunk just before IEND, returning a new array. Throws
 *  on a malformed PNG, since the caller produced it. */
export async function embedJsonInPng(pngBytes: Uint8Array, json: string): Promise<Uint8Array> {
  let iendStart: number | null = null;
  for (const chunk of walkChunks(pngBytes)) {
    if (chunk.type === "IEND") { iendStart = chunk.start; break; }
  }
  if (iendStart === null) throw new Error("Not a well-formed PNG: no IEND chunk found");

  const newChunk = buildChunk(CHARACTER_CHUNK_TYPE, await gzip(new TextEncoder().encode(json)));
  const result = new Uint8Array(pngBytes.length + newChunk.length);
  result.set(pngBytes.subarray(0, iendStart), 0);
  result.set(newChunk, iendStart);
  result.set(pngBytes.subarray(iendStart), iendStart + newChunk.length);
  return result;
}

/** Returns the JSON embedded by embedJsonInPng, or null when the bytes are not a PNG, carry no
 *  embedded character, or the chunk is corrupt (bad CRC, failed decompression). Never throws,
 *  since import files are untrusted. */
export async function extractJsonFromPng(pngBytes: Uint8Array): Promise<string | null> {
  if (!isPngSignature(pngBytes)) return null;
  try {
    for (const chunk of walkChunks(pngBytes)) {
      if (chunk.type !== CHARACTER_CHUNK_TYPE) continue;
      if (crc32(pngBytes.subarray(chunk.start + 4, chunk.end - 4)) !== readUint32BE(pngBytes, chunk.end - 4)) return null;
      return new TextDecoder().decode(await gunzip(chunk.data));
    }
    return null;
  } catch {
    return null;
  }
}
