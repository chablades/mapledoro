"use client";

import { CHARACTERS_COPY } from "../tabs/content";
import CharacterAvatar from "../tabs/components/CharacterAvatar";
import { resolveDisplayJobName } from "../setup/data/nexonJobMapping";
import { formatFigure } from "../scouter/scouterFormat";
import { PARTY_SIZE, type PartyMember } from "./usePartyMembers";

const COPY = CHARACTERS_COPY.partyScouter;

function hexaOf(member: PartyMember): string {
  return member.status.kind === "ready" ? formatFigure(member.status.entry.boss380Hexa) : "–";
}

function MemberSlot({ member, onToggle, onRemove }: { member: PartyMember; onToggle: () => void; onRemove: () => void }) {
  const { record } = member;
  return (
    <div className="party-slot">
      {!member.active && <span className="party-out">{COPY.sittingOut}</span>}
      <button type="button" className="party-member" aria-pressed={member.active} onClick={onToggle}>
        <span className="party-fig">
          <CharacterAvatar src={record.characterImgURL} alt="" width={96} height={96} />
        </span>
        <span className="party-plinth" style={{ background: member.color }} />
        <b>{record.characterName}</b>
        <small><span>{resolveDisplayJobName(record.jobName)}</span><span className="party-sep"> · </span><span>Lv {record.level}</span></small>
        <span className="party-hexa">{hexaOf(member)}</span>
      </button>
      <button type="button" className="party-remove" aria-label={COPY.removeMember(record.characterName)} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

/** Everyone in the party standing on one floor. Clicking a member sits them out (or back in);
 *  the empty places open the picker. */
export default function PartyStage({ members, onToggle, onRemove, onAdd }: {
  members: PartyMember[];
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
}) {
  const open = Array.from({ length: PARTY_SIZE - members.length }, (_, i) => members.length + i);
  return (
    <div className={`party-stage${members.length === 0 ? " is-empty" : ""}`}>
      <div className="party-floor" />
      {members.map((member) => (
        <MemberSlot key={member.key} member={member} onToggle={() => onToggle(member.key)} onRemove={() => onRemove(member.key)} />
      ))}
      {open.map((place) => (
        <div key={place} className="party-slot">
          {/* The same rows as a member, the text ones hidden, so the dashed box stands on the
              same floor as the sprites at every width. */}
          <button type="button" className="party-member party-add" onClick={onAdd}>
            <span className="party-fig"><span className="party-add-box">+ {COPY.addSlot}</span></span>
            <span className="party-plinth" />
            <b aria-hidden="true">&nbsp;</b>
            <small aria-hidden="true"><span>&nbsp;</span><span>&nbsp;</span></small>
            <span className="party-hexa" aria-hidden="true">&nbsp;</span>
          </button>
        </div>
      ))}
    </div>
  );
}
