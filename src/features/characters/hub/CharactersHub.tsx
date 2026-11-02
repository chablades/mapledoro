"use client";

// /characters: the hub. Your Characters leads on the left (reading order), the less frequent
// View a Character and Party Scouter sit stacked on the right. Each block shows a piece of art
// for what it opens rather than a description of it.

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { classPortraitUrl } from "../../../lib/classPortraits";
import { useMounted } from "../../../lib/useMounted";
import { readCharactersStore, selectCharactersList, type CharactersStore, type StoredCharacterRecord } from "../model/charactersStore";
import { toCharacterKey } from "../model/characterKeys";
import { WORLD_NAMES } from "../model/constants";
import { readStoredWorldFilter, writeStoredWorldFilter } from "../model/directoryWorldFilter";
import { CHARACTERS_COPY } from "../tabs/content";
import CharacterAvatar from "../tabs/components/CharacterAvatar";
import { hubStyles } from "./hubStyles";
import { useSampleCard } from "./useSampleCard";
import { ForwardLabel } from "../tabs/components/ArrowLabels";

const COPY = CHARACTERS_COPY.characterHub;
const PARTY_ART = ["Dawn Warrior", "Kanna", "Lynn"];
// Extra overlap with the art to its left, for art whose own transparent margin otherwise leaves
// a gap between neighbours.
const PARTY_ART_PULL: Partial<Record<string, string>> = { Kanna: "18px", Lynn: "34px" };

/** The world to show: the one the directory last had selected (shared, so both pages agree),
 *  else the first world with a Main, else the roster's first world. */
function resolveWorld(store: CharactersStore, worldIds: number[]): number | null {
  const stored = readStoredWorldFilter();
  if (typeof stored === "number" && worldIds.includes(stored)) return stored;
  const withMain = worldIds.find((id) => store.mainCharacterIdByWorld[String(id)]);
  return withMain ?? worldIds[0] ?? null;
}

type Slot =
  | { kind: "main"; character: StoredCharacterRecord; alsoChampion: boolean }
  | { kind: "champion"; character: StoredCharacterRecord }
  | { kind: "empty" }
  | { kind: "noMain" };

const CHAMPION_SLOTS = 5;

/** The Main first (position -1), standing over the row of Champions in the world's own order,
 *  each keyed by its place in that list. */
type PlacedSlot = { position: number; slot: Slot };

const PLACEHOLDER_LINEUP: PlacedSlot[] = [-1, 0, 1, 2, 3, 4].map((position) => ({ position, slot: { kind: position === -1 ? "noMain" : "empty" } }));

function lineup(store: CharactersStore, roster: StoredCharacterRecord[], worldId: number): PlacedSlot[] {
  const byKey = new Map(roster.map((c) => [toCharacterKey(c), c]));
  const mainKey = store.mainCharacterIdByWorld[String(worldId)] ?? "";
  const main = byKey.get(mainKey);
  const championKeys = store.championCharacterIdsByWorld[String(worldId)] ?? [];
  // A Main can also hold one of the world's Champion places. It stands on top with both chips
  // rather than appearing twice, and the row loses the slot it takes up.
  const alsoChampion = main !== undefined && championKeys.includes(mainKey);
  const champions = championKeys
    .filter((key) => key !== mainKey)
    .map((key) => byKey.get(key))
    .filter((c): c is StoredCharacterRecord => c !== undefined);
  const row = Array.from({ length: CHAMPION_SLOTS - (alsoChampion ? 1 : 0) }, (_, position): PlacedSlot => {
    const champion = champions[position];
    return { position, slot: champion ? { kind: "champion", character: champion } : { kind: "empty" } };
  });
  const top: PlacedSlot = { position: -1, slot: main ? { kind: "main", character: main, alsoChampion } : { kind: "noMain" } };
  return [top, ...row];
}

interface HubRoster {
  count: number;
  worldIds: number[];
  /** The world on show, or null with no characters. */
  worldId: number | null;
  slots: PlacedSlot[];
}

/** Everything Your Characters shows, from the saved store and the world picked here (if any). */
function hubRoster(store: CharactersStore, chosenWorld: number | null): HubRoster {
  const roster = selectCharactersList(store);
  const worldIds = [...new Set(roster.map((c) => c.worldID))];
  const worldId = chosenWorld !== null && worldIds.includes(chosenWorld) ? chosenWorld : resolveWorld(store, worldIds);
  return { count: roster.length, worldIds, worldId, slots: worldId === null ? PLACEHOLDER_LINEUP : lineup(store, roster, worldId) };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function chipStyle(theme: AppTheme, kind: "main" | "champion"): CSSProperties {
  if (kind === "main") return { background: theme.accentSoft, color: theme.accentText, border: `1px solid ${theme.accent}` };
  return theme.colorMode === "dark"
    ? { background: "#2a2008", color: "#f0c869", border: "1px solid #d7a047" }
    : { background: "#fff4df", color: "#8c5b16", border: "1px solid #d7a047" };
}

function LineupSlot({ theme, slot }: { theme: AppTheme; slot: Slot }) {
  if (slot.kind === "empty" || slot.kind === "noMain") {
    return (
      // The same three rows as a filled slot (figure, name, chips), so the dashed box stands on
      // the same floor as the avatars and its label lines up with their names.
      <div className={`hub-who hub-who--empty${slot.kind === "noMain" ? " hub-who--main" : ""}`}>
        <span className="hub-fig"><span className="hub-slot" style={{ borderColor: theme.border }} /></span>
        <b style={{ color: theme.muted }}>{slot.kind === "noMain" ? COPY.noMainLabel : COPY.emptySlotLabel}</b>
        <span className="hub-chips" aria-hidden="true" style={{ visibility: "hidden" }}>
          <span className="hub-chip">{COPY.championChip}</span>
        </span>
      </div>
    );
  }
  const { character, kind } = slot;
  const size = kind === "main" ? 160 : 96;
  return (
    <Link
      href={`/characters/directory?character=${encodeURIComponent(character.characterName)}`}
      className={`hub-who hub-raised${kind === "main" ? " hub-who--main" : ""}`}
      style={{ color: theme.text }}
    >
      <span className="hub-fig">
        <CharacterAvatar src={character.characterImgURL} alt="" width={size} height={size} style={{ imageRendering: "pixelated", objectFit: "contain", objectPosition: "center bottom" }} />
      </span>
      <b>{character.characterName}</b>
      <span className="hub-chips">
        <span className="hub-chip" style={chipStyle(theme, kind)}>{kind === "main" ? COPY.mainChip : COPY.championChip}</span>
        {slot.kind === "main" && slot.alsoChampion && <span className="hub-chip" style={chipStyle(theme, "champion")}>{COPY.championChip}</span>}
      </span>
    </Link>
  );
}

function YourCharacters({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [chosenWorld, setChosenWorld] = useState<number | null>(null);
  // Read fresh each render, after mount (the store lives in this browser only).
  const data = mounted ? hubRoster(readCharactersStore(), chosenWorld) : null;
  const { worldIds = [], worldId = null, slots = PLACEHOLDER_LINEUP } = data ?? {};
  const empty = data?.count === 0;

  function chooseWorld(id: number) {
    setChosenWorld(id);
    writeStoredWorldFilter(id);
  }

  return (
    <section className="hub-block hub-mine">
      <div className="hub-head">
        <div>
          <h2>{COPY.yourCharactersTitle}</h2>
          <p style={{ color: theme.muted }}>{empty ? COPY.emptyRosterSubtitle : COPY.yourCharactersSubtitle}</p>
        </div>
        {worldIds.length > 1 && worldId !== null && (
          <select
            className="tool-select hub-raised"
            aria-label={COPY.worldLabel}
            value={worldId}
            onChange={(e) => chooseWorld(Number(e.target.value))}
            style={{ background: theme.panel, color: theme.text, borderColor: theme.border }}
          >
            {worldIds.map((id) => <option key={id} value={id}>{WORLD_NAMES[id] ?? `World ${id}`}</option>)}
          </select>
        )}
      </div>
      <div className="hub-stage">
        <LineupSlot theme={theme} slot={slots[0].slot} />
        <div className="hub-line">
          {slots.slice(1).map(({ position, slot }) => <LineupSlot key={position} theme={theme} slot={slot} />)}
        </div>
      </div>
      <div className="hub-foot" style={{ borderColor: theme.border }}>
        <span style={{ color: theme.muted }}>
          {data && !empty && `${plural(data.count, "character")} across ${plural(worldIds.length, "world")}`}
        </span>
        {/* Stretched over the whole block (hub-stretch), so a click anywhere that isn't a
            character or the world switcher opens the directory. */}
        <Link href="/characters/directory" className="hub-btn hub-stretch" style={{ background: theme.accent, color: theme.accentOn }}>
          <ForwardLabel>{empty ? COPY.addFirstCharacterButton : COPY.openDirectoryButton}</ForwardLabel>
        </Link>
      </div>
    </section>
  );
}

export default function CharactersHub({ theme }: { theme: AppTheme }) {
  const sampleCard = useSampleCard();
  const vars = {
    "--hub-panel": theme.panel, "--hub-border": theme.border, "--hub-accent": theme.accent,
  } as CSSProperties;

  return (
    // The same page frame as Tools, Games and the Dashboard, including their fade-in entrance.
    <div className="page-content">
      <style>{hubStyles}</style>
      <div className="page-container" style={vars}>
        <h1 className="page-title" style={{ color: theme.text, margin: "0 0 0.25rem" }}>{COPY.title}</h1>
        <p className="page-subtitle" style={{ color: theme.muted, marginTop: 0 }}>{COPY.subtitle}</p>
        <div className="hub-grid fade-in">
          <YourCharacters theme={theme} />

          <Link href="/characters/view" className="hub-block hub-side" style={{ color: theme.text }}>
            <h2>{COPY.viewTitle}</h2>
            <p style={{ color: theme.muted }}>{COPY.viewSubtitle}</p>
            {sampleCard && (
              // A data URL of a canvas render, which next/image can't optimize or size.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="hub-card-art" src={sampleCard} alt="" />
            )}
          </Link>

          <Link href="/characters/party" className="hub-block hub-side hub-party" style={{ color: theme.text }}>
            <h2>{COPY.partyTitle}</h2>
            <p style={{ color: theme.muted }}>{COPY.partySubtitle}</p>
            <div className="hub-heroes" aria-hidden="true">
              {PARTY_ART.map((name) => (
                <Image key={name} src={classPortraitUrl(name)} alt="" width={395} height={400} unoptimized style={{ "--pull": PARTY_ART_PULL[name] ?? "0px" } as CSSProperties} />
              ))}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
