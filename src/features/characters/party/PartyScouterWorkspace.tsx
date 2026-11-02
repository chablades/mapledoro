"use client";

// /characters/party: put a party together from the directory and dropped-in cards, and see which
// bosses it can clear together.

import { useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { WORLD_NAMES } from "../model/constants";
import type { StoredCharacterRecord } from "../model/charactersStore";
import type { ScouterPayloadContext } from "../scouter/scouterApi";
import { CHARACTERS_COPY } from "../tabs/content";
import BackToHubLink from "../tabs/components/BackToHubLink";
import { fetchFreshCharacter } from "../tabs/useAutoRefresh";
import PartyBossBoard from "./PartyBossBoard";
import PartyPicker from "./PartyPicker";
import PartyStage from "./PartyStage";
import { partyBoard } from "./partyBoard";
import { partyStyles } from "./partyStyles";
import { memberKey, usePartyMembers, type PartyMember } from "./usePartyMembers";

const COPY = CHARACTERS_COPY.partyScouter;

function boardMessage(kind: "needMembers" | "loading" | "failed"): string {
  if (kind === "needMembers") return COPY.needTwo;
  return kind === "loading" ? COPY.loading : COPY.failed;
}

/** The active members' worlds with how many are on each, when they aren't all on one. A party can
 *  only form within a world, so the numbers are still shown but can't happen in game. */
function mixedWorlds(members: PartyMember[]): string | null {
  const counts = new Map<number, number>();
  for (const m of members) if (m.active) counts.set(m.record.worldID, (counts.get(m.record.worldID) ?? 0) + 1);
  if (counts.size < 2) return null;
  return [...counts].map(([id, n]) => `${WORLD_NAMES[id] ?? `World ${id}`} (${n})`).join(", ");
}

export default function PartyScouterWorkspace({ theme }: { theme: AppTheme }) {
  const party = usePartyMembers();
  const [picking, setPicking] = useState(false);
  const board = partyBoard(party.members);
  const worlds = mixedWorlds(party.members);

  function pick(record: StoredCharacterRecord, ctx: ScouterPayloadContext | null, fromFile: boolean) {
    const outcome = party.add(record, ctx);
    if (outcome === "added" && fromFile) {
      void fetchFreshCharacter(record.characterName, new AbortController().signal).then((fresh) => {
        if (fresh.kind === "done" && fresh.data?.characterImgURL) party.setAvatar(memberKey(record), fresh.data.characterImgURL);
      });
    }
    return outcome;
  }

  const vars = {
    "--party-panel": theme.panel, "--party-border": theme.border, "--party-accent": theme.accent,
    "--party-floor": theme.accentSoft, "--party-muted": theme.muted, "--party-text": theme.text,
    "--party-line": theme.border,
  } as CSSProperties;

  return (
    // The theme variables sit on the outermost element, so the picker dialog (outside the page
    // container) gets them too.
    <div className="page-content" style={vars}>
      <style>{partyStyles}</style>
      <div className="page-container">
        <div className="party-head">
          <BackToHubLink theme={theme} />
          <div>
            <h1 className="page-title" style={{ color: theme.text, margin: "0 0 0.25rem" }}>{COPY.title}</h1>
            <p className="page-subtitle" style={{ color: theme.muted, margin: 0 }}>{COPY.subtitle}</p>
          </div>
        </div>
        <div className="fade-in">
          <PartyStage members={party.members} onToggle={party.toggle} onRemove={party.remove} onAdd={() => setPicking(true)} />
          {worlds && (
            <p role="status" className="party-worlds" style={{ color: statusText(theme, "warning") }}>
              <b>{COPY.mixedWorldsTitle}</b> {worlds}. {COPY.mixedWorldsNote}
            </p>
          )}
          {board.kind === "ready" ? (
            <PartyBossBoard theme={theme} tiles={board.tiles} members={board.members} onSitOut={party.toggle} />
          ) : (
            <p className="party-panel party-empty" style={{ marginTop: 14 }}>{boardMessage(board.kind)}</p>
          )}
        </div>
      </div>
      {picking && <PartyPicker theme={theme} inParty={party.inParty} onPick={pick} onClose={() => setPicking(false)} />}
    </div>
  );
}
