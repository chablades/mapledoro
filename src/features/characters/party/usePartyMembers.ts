"use client";

// The party on the Party Scouter page: who's in it, who's sitting out, and each member's Scouter
// status. Held in page state only, so it starts empty each visit. A member from a card or JSON
// export is never written anywhere: it lives here, with its own world data for Scouter, and goes
// when the page does.

import { useEffect, useState, useSyncExternalStore } from "react";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { findScouterSetupGap, isScouterSupportedClass, type ScouterPayloadContext } from "../scouter/scouterApi";
import { ensureScouterEngine, getScouterEngineState, subscribeScouterEngine } from "../scouter/engine/scouterLocal";
import { scouterStatusFor, type ScouterFigureStatus } from "../scouter/useScouterResult";

export const PARTY_SIZE = 6;

// One colour per member, kept for as long as they're in the party: on their plinth, their part of
// every boss tile's strip, and their bar in the breakdown. Mid-tone, so each reads on light and
// dark panels alike.
const MEMBER_COLORS = ["#c2417a", "#16897d", "#c08a12", "#5a6acf", "#d0662f", "#6f8f1f"];

export interface PartyMember {
  key: string;
  record: StoredCharacterRecord;
  /** A card or export's own world data, or null for a directory character (which reads the
   *  saved store like everywhere else). */
  ctx: ScouterPayloadContext | null;
  active: boolean;
  color: string;
  status: ScouterFigureStatus;
}

type StoredMember = Omit<PartyMember, "status">;

export const memberKey = (record: StoredCharacterRecord) => record.characterName.toLowerCase();

/** Whether a character has what Party Scouter needs: a supported class and finished MapleScouter
 *  Setup (for a file, in its own world data). */
export function canJoinParty(record: StoredCharacterRecord, ctx: ScouterPayloadContext | null): boolean {
  return isScouterSupportedClass(record.jobName) && !findScouterSetupGap(record, ctx ?? undefined);
}

export function usePartyMembers() {
  const [stored, setStored] = useState<StoredMember[]>([]);
  const engineState = useSyncExternalStore(subscribeScouterEngine, getScouterEngineState, () => "idle" as const);
  useEffect(() => {
    void ensureScouterEngine();
  }, []);

  const members: PartyMember[] = stored.map((m) => ({ ...m, status: scouterStatusFor(m.record, engineState === "failed", m.ctx) }));

  function add(record: StoredCharacterRecord, ctx: ScouterPayloadContext | null): "added" | "already" | "full" {
    const key = memberKey(record);
    if (stored.some((m) => m.key === key)) return "already";
    if (stored.length >= PARTY_SIZE) return "full";
    setStored((current) => {
      const used = new Set(current.map((m) => m.color));
      const color = MEMBER_COLORS.find((c) => !used.has(c)) ?? MEMBER_COLORS[0];
      return [...current, { key, record, ctx, active: true, color }];
    });
    return "added";
  }

  function toggle(key: string) {
    setStored((current) => current.map((m) => (m.key === key ? { ...m, active: !m.active } : m)));
  }

  function remove(key: string) {
    setStored((current) => current.filter((m) => m.key !== key));
  }

  /** A card carries no avatar (its QR has no room for one), so a file member's is looked up after
   *  they join. Only the picture: the card's own numbers are what Scouter used. */
  function setAvatar(key: string, url: string) {
    setStored((current) => current.map((m) => (m.key === key ? { ...m, record: { ...m.record, characterImgURL: url } } : m)));
  }

  return { members, inParty: new Set(stored.map((m) => m.key)), add, toggle, remove, setAvatar };
}
