"use client";

import { useMemo, type CSSProperties } from "react";
import Link from "next/link";
import CharacterChip from "../../components/CharacterChip";
import Panel from "../../components/Panel";
import { ItemIcon } from "../../components/ResourceImage";
import type { AppTheme } from "../../components/themes";
import type { StoredCharacterRecord } from "../characters/model/charactersStore";
import { WORLD_NAMES } from "../characters/model/constants";

// -- Character tracker quick-launch icons --------------------------------------
interface TrackerLink {
  itemId: string;
  label: string;
  href: (characterName: string) => string;
}

const TRACKER_LINKS: TrackerLink[] = [
  {
    label: "Liberation Tracker",
    itemId: "01332289", // Genesis Dagger
    href: (c) => `/tools/liberation?character=${encodeURIComponent(c)}`,
  },
  {
    label: "Symbol Tracker",
    itemId: "01713000", // Sacred Symbol: Cernium
    href: (c) => `/tools/symbols?character=${encodeURIComponent(c)}`,
  },
  {
    label: "HEXA Skills",
    itemId: "04009613", // Sol Erda Fragment
    href: (c) => `/tools/hexa-skills?character=${encodeURIComponent(c)}`,
  },
];

function TrackerIcons({ theme, char }: { theme: AppTheme; char: StoredCharacterRecord }) {
  const iconBtnStyle: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    lineHeight: 1,
  };

  return (
    <div className="char-row-icons" style={{ display: "flex", gap: 5, flexShrink: 0 }}>
      {TRACKER_LINKS.map((t) => (
        <Link
          key={t.label}
          href={t.href(char.characterName)}
          title={t.label}
          aria-label={`${t.label} for ${char.characterName}`}
          className="char-row-icon-btn"
          style={iconBtnStyle}
        >
          <ItemIcon id={t.itemId} size={25} />
        </Link>
      ))}
    </div>
  );
}

const charRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.6rem 0.75rem",
  borderRadius: "12px",
  transition: "background 0.15s",
};

const charRowLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flex: 1,
  minWidth: 0,
  textDecoration: "none",
  color: "inherit",
};

function CharacterRow({
  theme,
  char,
}: {
  theme: AppTheme;
  char: StoredCharacterRecord;
}) {
  return (
    <div className="row-hover char-row" style={charRowStyle}>
      <Link href={`/characters?character=${encodeURIComponent(char.characterName)}`} style={charRowLinkStyle}>
        <CharacterChip
          theme={theme}
          characterImgURL={char.characterImgURL}
          characterName={char.characterName}
          subtitle={`Lv. ${char.level} ${char.jobName}`}
        />
      </Link>
      <TrackerIcons theme={theme} char={char} />
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: theme.accentText,
          background: theme.accentSoft,
          padding: "2px 8px",
          borderRadius: "6px",
          flexShrink: 0,
        }}
      >
        {WORLD_NAMES[char.worldID] ?? `World ${char.worldID}`}
      </div>
    </div>
  );
}

export default function CharactersPanel({ theme, characters }: { theme: AppTheme; characters: StoredCharacterRecord[] }) {
  const hasCharacters = characters.length > 0;
  const manageLink = useMemo(
    () =>
      hasCharacters && (
        <Link href="/characters" className="accent-link" style={{ color: theme.accent }}>
          Manage →
        </Link>
      ),
    [hasCharacters, theme.accent]
  );
  const emptyStateStyle: CSSProperties = {
    padding: "3rem 2rem",
    textAlign: "center",
    color: theme.muted,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  };
  const addBtnStyle: CSSProperties = {
    marginTop: "0.5rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "0.55rem 1.25rem",
    borderRadius: "10px",
    background: theme.accent,
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.85rem",
    textDecoration: "none",
    transition: "opacity 0.15s",
  };
  const addDashedStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    margin: "0.25rem 0.75rem 0.5rem",
    padding: "0.55rem 0",
    borderRadius: "10px",
    border: `2px dashed ${theme.border}`,
    background: "transparent",
    color: theme.muted,
    fontWeight: 800,
    fontSize: "0.8rem",
    textDecoration: "none",
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
  };

  return (
    <Panel
      theme={theme}
      delay="0.25s"
      icon="⭐"
      title="My Characters"
      headerRight={manageLink}
    >
      {characters.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "2rem" }}>&#10024;</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>No characters yet</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Add your first character to get started!
          </div>
          <Link href="/characters?action=add" style={addBtnStyle}>+ Add Character</Link>
        </div>
      ) : (
        <div className="characters-scroll-area" style={{ padding: "0.5rem", maxHeight: 420, overflowY: "auto" }}>
          <div className={characters.length > 6 ? "characters-grid characters-grid-two-col" : "characters-grid"}>
            {characters.map((char) => (
              <CharacterRow key={char.characterName.toLowerCase()} theme={theme} char={char} />
            ))}
          </div>
          <Link href="/characters?action=add" className="add-character-link" style={addDashedStyle}>
            + Add Character
          </Link>
        </div>
      )}
    </Panel>
  );
}
