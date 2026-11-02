// What the Party Scouter's boss grid shows for the active members: one tile per boss and
// difficulty, each with the party's combined clear.

import { computePartyClear, type PartyClearResult, type PartyMemberStats } from "../scouter/bossClearFormula";
import { BOSS_CLEAR_GROUPS, BOSS_DISPLAY_NAME, bossIconId, sortByDifficulty } from "../scouter/bossGrouping";
import type { BossCutEntry } from "../scouter/bosscut-data.generated";
import { withMaxedSymbols } from "../scouter/sacredSymbols";
import type { PartyMember } from "./usePartyMembers";

export type BossRegion = "grandis" | "arcaneRiver" | "mapleWorld";

// Where each boss lives, for All's sections. Malefic Star is Arteria's. Everything not listed
// (Lotus, Damien, Guardian Angel Slime and the older bosses) is Maple World.
const REGION: Partial<Record<string, BossRegion>> = {
  세렌: "grandis", 칼로스: "grandis", 대적자: "grandis", 카링: "grandis", 흉성: "grandis",
  림보: "grandis", 발드릭스: "grandis", 유피테르: "grandis",
  루시드: "arcaneRiver", 윌: "arcaneRiver", 더스크: "arcaneRiver", "진 힐라": "arcaneRiver",
  듄켈: "arcaneRiver", "검은 마법사": "arcaneRiver",
};

export interface PartyTile {
  id: string;
  region: BossRegion;
  entry: BossCutEntry;
  displayName: string;
  iconId: string | undefined;
  result: PartyClearResult;
}

export type PartyBoard =
  | { kind: "needMembers" }
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; members: PartyMember[]; tiles: PartyTile[] };

/** A party of one is just that character's own Boss Clear. */
const MIN_ACTIVE = 2;

function memberStats(member: PartyMember): PartyMemberStats | "loading" | "failed" {
  if (member.status.kind === "loading") return "loading";
  if (member.status.kind !== "ready") return "failed";
  const inputs = withMaxedSymbols(member.status.entry.bossClearInputs, member.record);
  if (!inputs) return "failed";
  const { record } = member;
  return {
    level: record.level,
    arcaneForce: Number(record.stats.arcanePower) || 0,
    authenticForce: Number(record.stats.sacredPower) || 0,
    inputs,
  };
}

export function partyBoard(members: PartyMember[]): PartyBoard {
  const active = members.filter((m) => m.active);
  if (active.length < MIN_ACTIVE) return { kind: "needMembers" };
  const stats = active.map(memberStats);
  if (stats.includes("failed")) return { kind: "failed" };
  if (stats.includes("loading")) return { kind: "loading" };
  const party = stats.filter((s): s is PartyMemberStats => typeof s !== "string");

  const tiles: PartyTile[] = [];
  for (const [boss, entries] of BOSS_CLEAR_GROUPS) {
    const displayName = BOSS_DISPLAY_NAME[boss] ?? boss;
    const iconId = bossIconId(boss, entries);
    for (const entry of sortByDifficulty(entries)) {
      // Solo-only difficulties (Champion, Destiny) never take a party, so they aren't shown.
      if (entry.partyLimit === 1) continue;
      const result = computePartyClear(entry, party);
      if (result) tiles.push({ id: `${entry.name}:${entry.difficulty}`, region: REGION[boss] ?? "mapleWorld", entry, displayName, iconId, result });
    }
  }
  return { kind: "ready", members: active, tiles };
}

/** The bosses worth showing by default: ones this party can enter, and neither so far out of
 *  reach nor so far outgrown that the number says nothing. */
export function isRelevantForParty(result: PartyClearResult): boolean {
  return result.cannotEnter === null && result.clearRate >= 0.3 && result.clearRate <= 10;
}

const PERCENT_CAP = 9999;
export function formatPartyPercent(rate: number): string {
  const percent = rate * 100;
  return percent > PERCENT_CAP ? `${PERCENT_CAP.toLocaleString("en-US")}%+` : `${Math.round(percent).toLocaleString("en-US")}%`;
}
