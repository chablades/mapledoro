import { describe, expect, it } from "vitest";
import {
  parseStoredCharacterRecord,
  parseImportedCharacterRecord,
  appendExpHistoryEntry,
  nexonDayIndex,
} from "./charactersStore";
import { makeStoredCharacterRecord } from "./testFixtures";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

describe("parseStoredCharacterRecord", () => {
  it("returns null for non-object input", () => {
    expect(parseStoredCharacterRecord(null, null)).toBeNull();
    expect(parseStoredCharacterRecord("a string", null)).toBeNull();
    expect(parseStoredCharacterRecord(42, null)).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    const requiredFields = ["ign", "worldId", "meta", "characterID"] as const;
    for (const field of requiredFields) {
      const record: Record<string, unknown> = { ...makeStoredCharacterRecord() };
      delete record[field];
      expect(parseStoredCharacterRecord(record, null), `missing ${field}`).toBeNull();
    }
  });

  it("round-trips a valid, fully-formed record", () => {
    const record = makeStoredCharacterRecord();
    const parsed = parseStoredCharacterRecord(record, null);
    expect(parsed?.ign).toBe(record.ign);
    expect(parsed?.characterID).toBe(record.characterID);
    expect(parsed?.meta).toEqual(record.meta);
  });

  it("falls back to the empty stats/equipment shape when those fields are malformed", () => {
    const record = { ...makeStoredCharacterRecord(), stats: "not stats", equipment: null };
    const parsed = parseStoredCharacterRecord(record, null);
    expect(parsed?.stats.hp).toBeDefined();
    expect(parsed?.equipment.presets).toHaveLength(3);
  });

  it("uses idHint as a fallback ign only when the parsed ign is falsy", () => {
    // ign must be a non-empty string to pass the initial gate at all, so idHint's
    // fallback branch (`ign || idHint || characterName`) is effectively for callers
    // that already validated presence but want a stronger identity source - verify
    // idHint doesn't override a real ign that IS present.
    const record = makeStoredCharacterRecord({}, { characterName: "RealIgn" });
    const parsed = parseStoredCharacterRecord({ ...record, ign: "RealIgn" }, "SomeOtherHint");
    expect(parsed?.ign).toBe("RealIgn");
  });

  it("defaults gender to null for an invalid value", () => {
    const record = { ...makeStoredCharacterRecord(), gender: "nonbinary" };
    expect(parseStoredCharacterRecord(record, null)?.gender).toBeNull();
  });
});

describe("parseImportedCharacterRecord", () => {
  it("keeps characterImgURL when it points at the one trusted host", () => {
    const record = makeStoredCharacterRecord({}, { characterImgURL: "https://msavatar1.nexon.net/Character/abc.png" });
    const parsed = parseImportedCharacterRecord(record);
    expect(parsed?.characterImgURL).toBe(record.characterImgURL);
  });

  it("replaces characterImgURL with the fallback avatar for an untrusted host", () => {
    const record = makeStoredCharacterRecord({}, { characterImgURL: "https://evil.example.com/steal.png" });
    const parsed = parseImportedCharacterRecord(record);
    expect(parsed?.characterImgURL).not.toBe(record.characterImgURL);
    expect(parsed?.characterImgURL).toContain("haku.network");
  });

  it("replaces characterImgURL when it's not a valid URL at all", () => {
    const record = makeStoredCharacterRecord({}, { characterImgURL: "not a url" });
    const parsed = parseImportedCharacterRecord(record);
    expect(parsed?.characterImgURL).toContain("haku.network");
  });

  it("returns null when the underlying record itself is invalid", () => {
    expect(parseImportedCharacterRecord({ garbage: true })).toBeNull();
  });
});

describe("nexonDayIndex", () => {
  it("treats two timestamps on the same side of the daily cutoff as the same day", () => {
    const morning = Date.UTC(2026, 0, 1, 10, 0, 0);
    const beforeCutoff = Date.UTC(2026, 0, 1, 17, 59, 0);
    expect(nexonDayIndex(morning)).toBe(nexonDayIndex(beforeCutoff));
  });

  it("treats timestamps straddling the 18:00 UTC cutoff as different days", () => {
    const beforeCutoff = Date.UTC(2026, 0, 1, 17, 59, 0);
    const afterCutoff = Date.UTC(2026, 0, 1, 18, 0, 0);
    expect(nexonDayIndex(beforeCutoff)).not.toBe(nexonDayIndex(afterCutoff));
  });

  it("is monotonic across a full day boundary", () => {
    const day1 = Date.UTC(2026, 0, 1, 19, 0, 0);
    const day2 = Date.UTC(2026, 0, 2, 19, 0, 0);
    expect(nexonDayIndex(day2)).toBe(nexonDayIndex(day1) + 1);
  });
});

describe("appendExpHistoryEntry", () => {
  const day1 = Date.UTC(2026, 0, 1, 19, 0, 0); // just after cutoff, deep in "day 1"

  it("appends a first entry to an empty/undefined history", () => {
    const result = appendExpHistoryEntry(undefined, 200, 1000, day1);
    expect(result).toEqual([{ date: day1, level: 200, exp: 1000 }]);
  });

  it("is a no-op when level and exp are unchanged from the last entry", () => {
    const first = appendExpHistoryEntry(undefined, 200, 1000, day1);
    const second = appendExpHistoryEntry(first, 200, 1000, day1 + HOUR_MS);
    expect(second).toEqual(first);
  });

  it("overwrites (not appends) when called again within the same Nexon day", () => {
    const first = appendExpHistoryEntry(undefined, 200, 1000, day1);
    const laterSameDay = day1 + 2 * HOUR_MS;
    const second = appendExpHistoryEntry(first, 200, 5000, laterSameDay);
    expect(second).toEqual([{ date: laterSameDay, level: 200, exp: 5000 }]);
  });

  it("appends a new entry once the Nexon day boundary (18:00 UTC) has passed", () => {
    const first = appendExpHistoryEntry(undefined, 200, 1000, day1);
    const nextDay = day1 + DAY_MS;
    const second = appendExpHistoryEntry(first, 201, 2000, nextDay);
    expect(second).toHaveLength(2);
    expect(second[1]).toEqual({ date: nextDay, level: 201, exp: 2000 });
  });

  it("prunes entries older than 90 days", () => {
    const veryOld = day1;
    const recent = day1 + 91 * DAY_MS;
    const withOld = [{ date: veryOld, level: 100, exp: 0 }];
    const result = appendExpHistoryEntry(withOld, 300, 9999, recent);
    expect(result.find((e) => e.date === veryOld)).toBeUndefined();
  });

  it("keeps entries within the 90-day window", () => {
    const notTooOld = day1;
    const recent = day1 + 89 * DAY_MS;
    const withEntry = [{ date: notTooOld, level: 100, exp: 0 }];
    const result = appendExpHistoryEntry(withEntry, 300, 9999, recent);
    expect(result.find((e) => e.date === notTooOld)).toBeDefined();
  });

  it("uses Date.now() when now is not supplied", () => {
    const before = Date.now();
    const result = appendExpHistoryEntry(undefined, 200, 1000);
    const after = Date.now();
    expect(result[0].date).toBeGreaterThanOrEqual(before);
    expect(result[0].date).toBeLessThanOrEqual(after);
  });
});
