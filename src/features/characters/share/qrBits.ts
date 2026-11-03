// Low-level pieces of the character QR format: a bit writer and reader, LEB128-style varints,
// compact text, short text fingerprints, and base43 (the QR alphanumeric character set without
// space and "%", both unsafe in a URL fragment).

export class BitWriter {
  private bits: number[] = [];

  put(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) this.bits.push(Math.floor(value / 2 ** i) % 2);
  }

  bit(on: boolean) {
    this.bits.push(on ? 1 : 0);
  }

  /** Non-negative integer in 7-bit groups, low group first, high bit meaning "more follows". */
  varint(value: number) {
    let n = Math.max(0, Math.floor(value));
    do {
      const group = n % 128;
      n = Math.floor(n / 128);
      this.put(group + (n > 0 ? 128 : 0), 8);
    } while (n > 0);
  }

  bytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8));
    this.bits.forEach((b, i) => { if (b) out[i >> 3] |= 0x80 >> (i & 7); });
    return out;
  }
}

export class BitReader {
  private pos = 0;
  private readonly data: Uint8Array;
  // A plain field rather than a parameter property, which Node's type stripping (npm test)
  // can't run.
  constructor(data: Uint8Array) {
    this.data = data;
  }

  get(width: number): number {
    let value = 0;
    for (let i = 0; i < width; i++) {
      const byte = this.data[this.pos >> 3];
      if (byte === undefined) throw new Error("QR data ended early");
      value = value * 2 + ((byte >> (7 - (this.pos & 7))) & 1);
      this.pos++;
    }
    return value;
  }

  bit(): boolean {
    return this.get(1) === 1;
  }

  varint(): number {
    let value = 0;
    let scale = 1;
    for (;;) {
      const group = this.get(8);
      value += (group % 128) * scale;
      if (group < 128) return value;
      scale *= 128;
    }
  }
}

// IGNs are letters and digits only, so 6 bits a character. Index 63 marks "not representable",
// after which the text follows as UTF-8 instead.
const TEXT6 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const TEXT6_ESCAPE = 63;

export function writeText(w: BitWriter, text: string) {
  if (text === "") {
    w.put(0, 4);
    w.put(0, 6);
    return;
  }
  if (text.length <= 15 && text.split("").every((ch) => TEXT6.includes(ch))) {
    w.put(text.length, 4);
    for (const ch of text) w.put(TEXT6.indexOf(ch), 6);
    return;
  }
  w.put(0, 4);
  w.put(TEXT6_ESCAPE, 6);
  writeUtf8(w, text);
}

export function readText(r: BitReader): string {
  const length = r.get(4);
  if (length > 0) {
    let out = "";
    for (let i = 0; i < length; i++) out += TEXT6[r.get(6)] ?? "";
    return out;
  }
  // A zero length is either the empty string (marker 0) or the UTF-8 escape (marker 63).
  return r.get(6) === TEXT6_ESCAPE ? readUtf8(r) : "";
}

export function writeUtf8(w: BitWriter, text: string) {
  const bytes = new TextEncoder().encode(text);
  w.varint(bytes.length);
  for (const b of bytes) w.put(b, 8);
}

export function readUtf8(r: BitReader): string {
  const length = r.varint();
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = r.get(8);
  return new TextDecoder().decode(bytes);
}

/** FNV-1a, truncated to `bits`. A fingerprint of a known string, resolved on decode by hashing
 *  the current candidate list, so list order never matters. */
export function textHash(text: string, bits: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 2 ** bits;
}

const B43 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*+-./:";

/** Every 2 bytes become 3 characters (43^3 = 79507 > 65536); a trailing odd byte becomes 2. */
export function toBase43(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 1 < bytes.length; i += 2) {
    let n = bytes[i] * 256 + bytes[i + 1];
    out += B43[n % 43];
    n = Math.floor(n / 43);
    out += B43[n % 43] + B43[Math.floor(n / 43)];
  }
  if (i < bytes.length) out += B43[bytes[i] % 43] + B43[Math.floor(bytes[i] / 43)];
  return out;
}

/** Returns null for characters outside the base43 set or a malformed length. */
export function fromBase43(text: string): Uint8Array | null {
  const digits = text.toUpperCase().split("").map((ch) => B43.indexOf(ch));
  if (digits.some((d) => d < 0) || digits.length % 3 === 1) return null;
  const out: number[] = [];
  let i = 0;
  for (; i + 2 < digits.length; i += 3) {
    const n = digits[i] + digits[i + 1] * 43 + digits[i + 2] * 1849;
    if (n > 0xffff) return null;
    out.push(n >> 8, n & 0xff);
  }
  if (i < digits.length) {
    const n = digits[i] + digits[i + 1] * 43;
    if (n > 0xff) return null;
    out.push(n);
  }
  return new Uint8Array(out);
}
