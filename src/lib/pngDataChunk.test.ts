import { describe, expect, it } from "vitest";
import { isPngSignature, embedJsonInPng, extractJsonFromPng, CHARACTER_CHUNK_TYPE } from "./pngDataChunk";
import { crc32 } from "./crc32";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function chunk(type: string, data: number[]): number[] {
  const typeBytes = [...type].map((c) => c.charCodeAt(0));
  const typeAndData = new Uint8Array([...typeBytes, ...data]);
  return [...u32be(data.length), ...typeBytes, ...data, ...u32be(crc32(typeAndData))];
}

/** Smallest well-formed PNG that satisfies pngDataChunk.ts's needs: a real signature, a
 *  minimal 1x1 IHDR (never inspected by the module, content is irrelevant), and a real
 *  IEND with a correct CRC so walkChunks can find it. No pixel data needed. */
function minimalPng(): Uint8Array {
  const ihdrData = [
    ...u32be(1), ...u32be(1), // width=1, height=1
    8, 6, 0, 0, 0, // bit depth, color type (RGBA), compression, filter, interlace
  ];
  return new Uint8Array([...PNG_SIGNATURE, ...chunk("IHDR", ihdrData), ...chunk("IEND", [])]);
}

describe("isPngSignature", () => {
  it("returns true for a well-formed PNG signature", () => {
    expect(isPngSignature(minimalPng())).toBe(true);
  });

  it("returns false for non-PNG bytes", () => {
    expect(isPngSignature(new TextEncoder().encode("not a png"))).toBe(false);
  });

  it("returns false for input shorter than the signature", () => {
    expect(isPngSignature(new Uint8Array([0x89, 0x50]))).toBe(false);
  });

  it("returns false for empty input", () => {
    expect(isPngSignature(new Uint8Array())).toBe(false);
  });
});

describe("embedJsonInPng / extractJsonFromPng round-trip", () => {
  it("round-trips a JSON payload through embed then extract", async () => {
    const json = JSON.stringify({ characterName: "Fuyurin64", level: 260, nested: { a: [1, 2, 3] } });
    const embedded = await embedJsonInPng(minimalPng(), json);
    const extracted = await extractJsonFromPng(embedded);
    expect(extracted).toBe(json);
  });

  it("inserts the new chunk immediately before IEND, keeping IEND last", async () => {
    const embedded = await embedJsonInPng(minimalPng(), "{}");
    const typeAt = (offset: number) =>
      String.fromCharCode(embedded[offset], embedded[offset + 1], embedded[offset + 2], embedded[offset + 3]);
    // last 4 bytes before the trailing CRC-less nothing: IEND has 0-length data, so its
    // type sits 8 bytes before the very end (4 length + 4 type), then 4 bytes of CRC follow
    expect(typeAt(embedded.length - 8)).toBe("IEND");
  });

  it("throws when the input has no IEND chunk", async () => {
    const noIend = new Uint8Array([...PNG_SIGNATURE, ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])]);
    await expect(embedJsonInPng(noIend, "{}")).rejects.toThrow(/IEND/);
  });

  it("preserves the original PNG bytes around the inserted chunk", async () => {
    const original = minimalPng();
    const embedded = await embedJsonInPng(original, "{}");
    expect(embedded.length).toBeGreaterThan(original.length);
    expect(embedded.slice(0, 8)).toEqual(original.slice(0, 8)); // signature untouched
  });
});

describe("extractJsonFromPng defensive behavior (never throws)", () => {
  it("returns null for a non-PNG input", async () => {
    expect(await extractJsonFromPng(new TextEncoder().encode("not a png"))).toBeNull();
  });

  it("returns null for empty input", async () => {
    expect(await extractJsonFromPng(new Uint8Array())).toBeNull();
  });

  it("returns null for a well-formed PNG with no embedded chunk", async () => {
    expect(await extractJsonFromPng(minimalPng())).toBeNull();
  });

  it("returns null when the embedded chunk's CRC is corrupted", async () => {
    const embedded = await embedJsonInPng(minimalPng(), JSON.stringify({ a: 1 }));
    const corrupted = new Uint8Array(embedded);
    // flip one byte inside the mdCz chunk's data (well past the fixed IHDR/IEND region)
    const chunkTypeIndex = findChunkTypeIndex(corrupted, CHARACTER_CHUNK_TYPE);
    corrupted[chunkTypeIndex + 8] ^= 0xff; // first byte of the chunk's data
    expect(await extractJsonFromPng(corrupted)).toBeNull();
  });

  it("returns null when the PNG is truncated mid-chunk", async () => {
    const embedded = await embedJsonInPng(minimalPng(), JSON.stringify({ a: 1 }));
    const truncated = embedded.slice(0, embedded.length - 20);
    expect(await extractJsonFromPng(truncated)).toBeNull();
  });

  it("returns null when the gzip payload itself is corrupt", async () => {
    const embedded = await embedJsonInPng(minimalPng(), JSON.stringify({ a: 1 }));
    const chunkTypeIndex = findChunkTypeIndex(embedded, CHARACTER_CHUNK_TYPE);
    const dataStart = chunkTypeIndex + 4;
    const corrupted = new Uint8Array(embedded);
    corrupted[dataStart] ^= 0xff; // corrupt gzip magic byte
    // recompute the CRC so this exercises the gunzip failure path, not the CRC-mismatch path
    const view = new DataView(corrupted.buffer);
    const length = view.getUint32(chunkTypeIndex - 4, false);
    const typeAndData = corrupted.subarray(chunkTypeIndex, chunkTypeIndex + 4 + length);
    view.setUint32(chunkTypeIndex + 4 + length, crc32(typeAndData), false);
    expect(await extractJsonFromPng(corrupted)).toBeNull();
  });
});

function findChunkTypeIndex(bytes: Uint8Array, type: string): number {
  const target = [...type].map((c) => c.charCodeAt(0));
  for (let i = 0; i < bytes.length - 4; i++) {
    if (target.every((b, j) => bytes[i + j] === b)) return i;
  }
  throw new Error(`chunk type ${type} not found in fixture`);
}
