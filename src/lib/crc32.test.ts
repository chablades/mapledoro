import { describe, expect, it } from "vitest";
import { crc32 } from "./crc32";

describe("crc32", () => {
  it("returns 0 for empty input", () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("matches the standard CRC-32/ISO-HDLC check value for ASCII \"123456789\"", () => {
    const bytes = new TextEncoder().encode("123456789");
    expect(crc32(bytes)).toBe(0xcbf43926);
  });

  it("matches a known value for \"The quick brown fox jumps over the lazy dog\"", () => {
    const bytes = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");
    expect(crc32(bytes)).toBe(0x414fa339);
  });

  it("is sensitive to a single changed byte", () => {
    const a = new TextEncoder().encode("mapledoro");
    const b = new TextEncoder().encode("mapledorO");
    expect(crc32(a)).not.toBe(crc32(b));
  });

  it("always returns an unsigned 32-bit value", () => {
    const value = crc32(new TextEncoder().encode("anything"));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffffffff);
  });
});
