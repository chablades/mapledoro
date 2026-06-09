"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../components/themes";
import type { StoredCharacterRecord } from "../characters/model/charactersStore";

/** 32px character image with accent-initial fallback, for picker rows. */
function PickerAvatar({ theme, name, imgURL }: { theme: AppTheme; name: string; imgURL?: string }) {
  if (imgURL) {
    return (
      <Image
        src={imgURL}
        alt={name}
        width={32}
        height={32}
        unoptimized
        style={{ borderRadius: 6, objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  const fallbackStyle: CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: theme.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    color: theme.accent,
    fontWeight: 800,
    flexShrink: 0,
  };
  return <div style={fallbackStyle}>{name.charAt(0).toUpperCase()}</div>;
}

/** Selectable character row (avatar + name + level/job) for the character
 *  picker lists in tool dialogs. Hover accent comes from the consumer's
 *  themed style block: `.char-pick-row:hover { border-color: <accent> !important; }` */
export function CharacterPickerRow({
  theme,
  character,
  selected,
  onSelect,
}: {
  theme: AppTheme;
  character: StoredCharacterRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    width: "100%",
    padding: "6px 10px",
    borderRadius: 10,
    background: selected ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${selected ? theme.accent : theme.border}`,
    textAlign: "left",
  };
  return (
    <button
      type="button"
      className="tool-btn char-pick-row"
      aria-pressed={selected}
      onClick={onSelect}
      style={rowStyle}
    >
      <PickerAvatar theme={theme} name={character.characterName} imgURL={character.characterImgURL} />
      <div>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>
          {character.characterName}
        </div>
        <div style={{ fontSize: "0.75rem", color: theme.muted }}>
          Lv.{character.level} {character.jobName}
        </div>
      </div>
    </button>
  );
}
