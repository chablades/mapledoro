import { describe, expect, it } from "vitest";
import { searchAndRank } from "./searchMatch";

const identity = (s: string) => s;

describe("searchAndRank", () => {
  it("returns all items unchanged (original order) for an empty query", () => {
    const items = ["Zeta", "Alpha", "Beta"];
    expect(searchAndRank(items, "", identity)).toEqual(items);
    expect(searchAndRank(items, "   ", identity)).toEqual(items);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchAndRank(["Alpha", "Beta"], "zzz", identity)).toEqual([]);
  });

  it("ranks an exact match above a prefix match", () => {
    const items = ["Arcane Umbra", "Arcane"];
    expect(searchAndRank(items, "Arcane", identity)).toEqual(["Arcane", "Arcane Umbra"]);
  });

  it("ranks a prefix match above a plain substring match", () => {
    // neither of these is an initialism target for a multi-word query, so this
    // exercises tier 1 (startsWith) vs tier 3 (substring) instead
    const result = searchAndRank(["CFE Extra", "A CFE"], "cfe", identity);
    expect(result).toEqual(["CFE Extra", "A CFE"]);
  });

  it("matches a single-token initialism of a multi-word candidate", () => {
    const items = ["Commanding Force Earring", "Some Other Item"];
    expect(searchAndRank(items, "cfe", identity)).toEqual(["Commanding Force Earring"]);
  });

  it("does not apply initialism matching for multi-word queries", () => {
    // a multi-word query never checks candidateInitials (tokenMatches only tries
    // it for single-token queries) - "zx cf" has no substring hits for "zx" in
    // "commandingforceearring", so the whole multi-word query fails even though
    // "cf" alone would partially resemble the initials.
    const items = ["Commanding Force Earring"];
    expect(searchAndRank(items, "zx cf", identity)).toEqual([]);
  });

  it("matches a hardcoded synonym not covered by initials", () => {
    // "ied" -> "ignoredefense" synonym; "Ignore Defense"'s initials are "id", not "ied"
    const items = ["Ignore Defense", "Something Else"];
    expect(searchAndRank(items, "ied", identity)).toEqual(["Ignore Defense"]);
  });

  it("matches multi-word queries as independent substring tokens", () => {
    const items = ["Arcane Umbra Mage Hat", "Critical Damage Ring", "Arcane Force Belt"];
    expect(searchAndRank(items, "arca ma", identity)).toEqual(["Arcane Umbra Mage Hat"]);
    expect(searchAndRank(items, "crit dam", identity)).toEqual(["Critical Damage Ring"]);
  });

  it("requires every token to match", () => {
    const items = ["Arcane Umbra Mage Hat"];
    expect(searchAndRank(items, "arca zzz", identity)).toEqual([]);
  });

  it("is case- and punctuation-insensitive", () => {
    const items = ["Commanding Force Earring"];
    expect(searchAndRank(items, "COMMANDING-FORCE", identity)).toEqual(["Commanding Force Earring"]);
  });

  it("tiebreaks by how early the matched words appear", () => {
    const items = ["Ring of Arcane Power", "Arcane Ring"];
    // both are tier-3 substring matches for "arcane"; "Arcane Ring" has a lower
    // firstIndexSum (0) than "Ring of Arcane Power" (index of "arcane" > 0)
    expect(searchAndRank(items, "arcane", identity)).toEqual(["Arcane Ring", "Ring of Arcane Power"]);
  });

  it("tiebreaks by shorter candidate length within the same tier and firstIndexSum", () => {
    // both are tier-3 substring matches with the same firstIndexSum (1), so the
    // shorter candidate should sort first
    const items = ["xArcaney", "xArcanexxxx"];
    expect(searchAndRank(items, "arcane", identity)).toEqual(["xArcaney", "xArcanexxxx"]);
  });

  it("works with non-string items via the getText selector", () => {
    const items = [{ name: "Alpha" }, { name: "Beta" }];
    expect(searchAndRank(items, "beta", (i) => i.name)).toEqual([{ name: "Beta" }]);
  });
});
