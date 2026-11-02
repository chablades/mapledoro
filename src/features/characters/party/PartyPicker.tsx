"use client";

import { useRef, useState, type DragEvent } from "react";
import ModalShell from "../../../components/ModalShell";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { readCharactersStore, selectCharactersList, type StoredCharacterRecord, type StoredScouterLegion } from "../model/charactersStore";
import { WORLD_NAMES } from "../model/constants";
import { resolveDisplayJobName } from "../setup/data/nexonJobMapping";
import type { ScouterPayloadContext } from "../scouter/scouterApi";
import { readCharacterFile } from "../share/readCharacterFile";
import { CHARACTERS_COPY } from "../tabs/content";
import CharacterAvatar from "../tabs/components/CharacterAvatar";
import { canJoinParty, memberKey } from "./usePartyMembers";

const COPY = CHARACTERS_COPY.partyScouter;

export type PickResult = "added" | "already" | "full";

/** A card or export as a party member: its own world data for Scouter, and the tool keys always
 *  present so nothing falls back to a saved character of the same name. */
function fileMember(record: StoredCharacterRecord, legion: StoredScouterLegion | undefined): { record: StoredCharacterRecord; ctx: ScouterPayloadContext } {
  return {
    record: { ...record, tools: { hexaSkills: {}, hexaStat: {}, symbols: {}, ...record.tools } },
    ctx: { scouterLegionByWorld: legion ? { [String(record.worldID)]: legion } : {}, standalone: true },
  };
}

function byWorld(roster: StoredCharacterRecord[]): [number, StoredCharacterRecord[]][] {
  const groups = new Map<number, StoredCharacterRecord[]>();
  for (const c of roster) groups.set(c.worldID, [...(groups.get(c.worldID) ?? []), c]);
  return [...groups.entries()].map(([world, list]) => [world, list.toSorted((a, b) => b.level - a.level)]);
}

function DirectoryRow({ theme, character, inParty, onPick }: {
  theme: AppTheme; character: StoredCharacterRecord; inParty: boolean; onPick: () => void;
}) {
  const ready = canJoinParty(character, null);
  let note: string | null = null;
  if (inParty) note = COPY.inParty;
  else if (!ready) note = COPY.needsSetup;
  return (
    <button type="button" className="party-pick-row" disabled={inParty || !ready} onClick={onPick}>
      <CharacterAvatar src={character.characterImgURL} alt="" width={44} height={44} />
      <span className="party-pick-name">
        <b>{character.characterName}</b>
        <small style={{ color: theme.muted }}>{resolveDisplayJobName(character.jobName)} · Lv {character.level}</small>
      </span>
      {note && <small style={{ color: theme.muted, fontWeight: 800 }}>{note}</small>}
    </button>
  );
}

/** Adds a member: any directory character with MapleScouter Setup, or a card or JSON export
 *  dropped in (kept only for this visit, never saved). */
export default function PartyPicker({ theme, inParty, onPick, onClose }: {
  theme: AppTheme;
  inParty: ReadonlySet<string>;
  onPick: (record: StoredCharacterRecord, ctx: ScouterPayloadContext | null, fromFile: boolean) => PickResult;
  onClose: () => void;
}) {
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roster = selectCharactersList(readCharactersStore());

  function pick(record: StoredCharacterRecord, ctx: ScouterPayloadContext | null, fromFile: boolean) {
    const outcome = onPick(record, ctx, fromFile);
    if (outcome === "already") setError(COPY.alreadyInParty);
    else onClose();
  }

  async function handleFile(file: File) {
    setError(null);
    setReading(true);
    const result = await readCharacterFile(file);
    setReading(false);
    if (!result.ok) return setError(result.message);
    const member = fileMember(result.record, result.world.scouterLegion);
    if (!canJoinParty(member.record, member.ctx)) return setError(COPY.noScouterData);
    pick(member.record, member.ctx, true);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !reading) void handleFile(file);
  }

  return (
    <ModalShell theme={theme} ariaLabel={COPY.pickerTitle} onClose={onClose} className="party-picker" style={{ width: "min(520px, calc(100vw - 32px))", padding: 0 }}>
      <div className="party-pick-head">
        <h2>{COPY.pickerTitle}</h2>
        <button type="button" className="party-pick-close" aria-label={COPY.close} onClick={onClose}>×</button>
      </div>
      <div className="party-pick-body">
        <p className="party-label">{COPY.pickerFile}</p>
        <button
          type="button"
          className={`party-pick-drop${dragging ? " is-dragging" : ""}`}
          disabled={reading}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <b>{reading ? COPY.pickerReading : COPY.pickerDrop}</b>
          {!reading && <small style={{ color: theme.muted }}>{COPY.pickerDropHint}</small>}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,image/*,.json"
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void handleFile(file); }}
          style={{ display: "none" }}
        />
        {error && <p role="alert" className="party-pick-error" style={{ color: statusText(theme, "danger") }}>{error}</p>}

        <p className="party-label" style={{ marginTop: 16 }}>{COPY.pickerDirectory}</p>
        {roster.length === 0 && <p className="party-empty" style={{ padding: "12px 0" }}>{COPY.pickerEmpty}</p>}
        {byWorld(roster).map(([world, list]) => (
          <div key={world} className="party-pick-world">
            <p style={{ color: theme.muted }}>{WORLD_NAMES[world] ?? `World ${world}`}</p>
            {list.map((character) => (
              <DirectoryRow
                key={memberKey(character)}
                theme={theme}
                character={character}
                inParty={inParty.has(memberKey(character))}
                onPick={() => pick(character, null, false)}
              />
            ))}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
