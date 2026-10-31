"use client";

import { useState, type CSSProperties } from "react";
import type { Route } from "next";
import Link from "next/link";
import CharacterChip from "../../components/CharacterChip";
import HoverTooltip from "../../components/HoverTooltip";
import Panel from "../../components/Panel";
import { ItemIcon } from "../../components/ResourceImage";
import type { AppTheme } from "../../components/themes";
import type { StoredCharacterRecord } from "../characters/model/charactersStore";
import { WORLD_NAMES } from "../characters/model/constants";
import { useCardReorder } from "../tools/useCardReorder";

// -- Character tracker quick-launch icons --------------------------------------
interface TrackerLink {
  itemId: string;
  label: string;
  href: (characterName: string) => Route;
}

const TRACKER_LINKS: TrackerLink[] = [
  {
    label: "Liberation Tracker",
    itemId: "01332303", // Destiny Dagger
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
  reordering,
}: {
  theme: AppTheme;
  char: StoredCharacterRecord;
  reordering: boolean;
}) {
  const chip = (
    <CharacterChip
      theme={theme}
      characterImgURL={char.characterImgURL}
      characterName={char.characterName}
      subtitle={`Lv. ${char.level} ${char.jobName}`}
    />
  );
  // While reordering the whole row is a drag handle, so the profile link and tracker icons
  // step aside: a drag starting on a link would otherwise begin the browser's own link drag.
  return (
    <div className={reordering ? "char-row" : "row-hover char-row"} style={charRowStyle}>
      {reordering ? <div style={charRowLinkStyle}>{chip}</div> : (
        <Link href={`/characters?character=${encodeURIComponent(char.characterName)}`} style={charRowLinkStyle}>
          {chip}
        </Link>
      )}
      {!reordering && <TrackerIcons theme={theme} char={char} />}
      <div
        className="char-row-world"
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

function reorderButtonStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    padding: 0,
    color: theme.muted,
    background: theme.bg,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    cursor: "pointer",
  };
}

function doneButtonStyle(theme: AppTheme): CSSProperties {
  return {
    padding: "0.25rem 0.75rem",
    borderRadius: 8,
    border: "none",
    background: theme.accent,
    color: theme.accentOn,
    fontFamily: "inherit",
    fontSize: "0.75rem",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function ReorderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
    </svg>
  );
}

export default function CharactersPanel({ theme, characters, onReorder }: {
  theme: AppTheme;
  characters: StoredCharacterRecord[];
  onReorder: (from: number, to: number) => void;
}) {
  const [reordering, setReordering] = useState(false);
  const { dragProps, isDragging, isDropTarget } = useCardReorder(onReorder);
  // Reordering one character has nothing to move, so the toggle only shows from two up.
  // Manage sits beside the title (overriding .accent-link's auto margin); only the reorder
  // control is pushed to the right edge.
  const headerRight = characters.length > 0 && (
    <>
      {!reordering && (
        <Link href="/characters" className="accent-link" style={{ color: theme.accentText, marginLeft: "0.25rem" }}>
          Manage →
        </Link>
      )}
      {characters.length > 1 && <div style={{ marginLeft: "auto" }}>{reordering ? (
        <button type="button" onClick={() => setReordering(false)} style={doneButtonStyle(theme)}>
          Done
        </button>
      ) : (
        <HoverTooltip label="Reorder characters" theme={theme}>
          <button type="button" aria-label="Reorder characters" onClick={() => setReordering(true)} style={reorderButtonStyle(theme)}>
            <ReorderIcon />
          </button>
        </HoverTooltip>
      )}</div>}
    </>
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
    color: theme.accentOn,
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
      icon="⭐"
      title="My Characters"
      headerRight={headerRight}
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
            {characters.map((char, index) => reordering ? (
              <div
                key={char.characterName.toLowerCase()}
                className="card-reorder-surface"
                {...dragProps(index)}
                style={{
                  cursor: "grab",
                  borderRadius: 12,
                  border: `1px dashed ${isDropTarget(index) ? theme.accent : theme.border}`,
                  opacity: isDragging(index) ? 0.4 : 1,
                }}
              >
                <CharacterRow theme={theme} char={char} reordering />
              </div>
            ) : (
              <CharacterRow key={char.characterName.toLowerCase()} theme={theme} char={char} reordering={false} />
            ))}
          </div>
          {reordering ? (
            <p style={{ margin: "0.5rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: theme.muted, textAlign: "center" }}>
              Drag characters into the order you want, then press Done.
            </p>
          ) : (
            <Link href="/characters?action=add" className="add-character-link" style={addDashedStyle}>
              + Add Character
            </Link>
          )}
        </div>
      )}
    </Panel>
  );
}
