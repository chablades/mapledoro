"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { STATUS } from "../../../components/statusColors";
import { worldMapUrl } from "../../../lib/mapleResource";
import { PillGroup } from "../../tools/shared-ui";
import { toolStyles } from "../../tools/tool-styles";
import {
  ALL_MAPS,
  WORLDS,
  childScreens,
  getScreen,
  mapLocation,
  screenChain,
  type WorldScreen,
  type WorldSpot,
} from "./hierarchy";

const MARKER_SIZE = 14;
const SEARCH_LIMIT = 8;

const resetBtn: CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  textAlign: "inherit",
};

const markerBase: CSSProperties = {
  ...resetBtn,
  position: "absolute",
  width: MARKER_SIZE,
  height: MARKER_SIZE,
  borderRadius: "50%",
  transform: "translate(-50%, -50%)",
  boxSizing: "border-box",
  cursor: "pointer",
};

const crumbBtn: CSSProperties = {
  ...resetBtn,
  fontSize: "0.8rem",
  fontWeight: 700,
  cursor: "pointer",
};

const chipBtn: CSSProperties = {
  ...resetBtn,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 700,
  cursor: "pointer",
};

const backBtn: CSSProperties = {
  ...resetBtn,
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 3,
  padding: "5px 12px",
  borderRadius: 999,
  fontSize: "0.75rem",
  fontWeight: 800,
  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
  cursor: "pointer",
};

const mapOptionBtn: CSSProperties = {
  ...resetBtn,
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: "0.8rem",
  fontWeight: 600,
};

/** Marker look: zoom-in spots are hollow rings, map spots are filled dots. */
function markerStyle(theme: AppTheme, spot: WorldSpot, selected: boolean, missed: boolean, answer: boolean): CSSProperties {
  let fill = theme.accent;
  if (answer) fill = STATUS.success.fill;
  else if (missed) fill = STATUS.danger.fill;
  const drill = spot.child !== undefined && spot.maps.length === 0;
  return {
    ...markerBase,
    background: drill ? "rgba(255,255,255,0.85)" : fill,
    border: `3px solid ${drill ? fill : "#fff"}`,
    boxShadow: selected ? `0 0 0 3px ${theme.accentText}` : "0 1px 3px rgba(0,0,0,0.5)",
    zIndex: selected ? 2 : 1,
  };
}

function MapOptions({
  theme,
  maps,
  staged,
  guessed,
  disabled,
  onStage,
}: {
  theme: AppTheme;
  maps: [number, string][];
  staged: number | null;
  guessed: Set<number>;
  disabled: boolean;
  onStage: (mapId: number) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 4 }}>
      {maps.map(([mapId, name]) => {
        const used = guessed.has(mapId);
        const active = staged === mapId;
        return (
          <button
            key={mapId}
            type="button"
            disabled={disabled || used}
            onClick={() => onStage(mapId)}
            style={{
              ...mapOptionBtn,
              color: active ? theme.accentOn : theme.text,
              background: active ? theme.accent : theme.timerBg,
              opacity: used ? 0.5 : 1,
              textDecoration: used ? "line-through" : "none",
              cursor: disabled || used ? "not-allowed" : "pointer",
            }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

function SpotPanel({
  theme,
  spot,
  onZoom,
  children,
}: {
  theme: AppTheme;
  spot: WorldSpot;
  onZoom: (screenId: string) => void;
  children: React.ReactNode;
}) {
  const child = spot.child ? getScreen(spot.child) : undefined;
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: theme.text }}>{spot.label}</span>
        {child && (
          <button
            type="button"
            onClick={() => onZoom(child.id)}
            style={{ ...chipBtn, color: theme.accentOn, background: theme.accent }}
          >
            Zoom into {child.label} →
          </button>
        )}
      </div>
      {spot.maps.length > 0 && children}
    </div>
  );
}

function MapSearch({
  theme,
  staged,
  guessed,
  disabled,
  onStage,
}: {
  theme: AppTheme;
  staged: number | null;
  guessed: Set<number>;
  disabled: boolean;
  onStage: (mapId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_MAPS.filter(([, name]) => name.toLowerCase().includes(q)).slice(0, SEARCH_LIMIT);
  }, [query]);
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <input
        type="text"
        aria-label="Search maps by name"
        placeholder="Or search maps by name…"
        value={query}
        disabled={disabled}
        className="tool-input"
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...toolStyles(theme).inputStyle, width: "100%", boxSizing: "border-box" }}
      />
      {matches.length > 0 && (
        <MapOptions
          theme={theme}
          maps={matches.map(([mapId, name]) => [mapId, `${name} (${spotLabel(mapId)})`])}
          staged={staged}
          guessed={guessed}
          disabled={disabled}
          onStage={onStage}
        />
      )}
    </div>
  );
}

function spotLabel(mapId: number): string {
  const loc = mapLocation(mapId);
  return loc ? getScreen(loc.screen)!.spots[loc.spot].label : "";
}

function ScreenArt({
  theme,
  screen,
  selected,
  missedSpots,
  answerSpot,
  onSelect,
  onBack,
}: {
  theme: AppTheme;
  screen: WorldScreen;
  selected: number | null;
  missedSpots: Set<number>;
  answerSpot: number | null;
  onSelect: (index: number) => void;
  /** Goes up one screen; null at a world's top screen. Also bound to right-click. */
  onBack: (() => void) | null;
}) {
  return (
    <div
      onContextMenu={(e) => {
        if (!onBack) return;
        e.preventDefault();
        onBack();
      }}
      style={{ position: "relative", width: "100%", borderRadius: 10, overflow: "hidden", border: `1px solid ${theme.border}` }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title="Back (or right-click the map)"
          style={{ ...backBtn, color: theme.accentOn, background: theme.accent }}
        >
          ← Back
        </button>
      )}
      <Image
        src={worldMapUrl(screen.id)}
        alt={`${screen.label} world map`}
        width={screen.w}
        height={screen.h}
        unoptimized
        style={{ display: "block", width: "100%", height: "auto" }}
      />
      {screen.spots.map((spot, i) => (
        <button
          key={i}
          type="button"
          aria-label={spot.label}
          title={spot.label}
          onClick={() => onSelect(i)}
          style={{
            ...markerStyle(theme, spot, selected === i, missedSpots.has(i), answerSpot === i),
            left: `${(spot.x / screen.w) * 100}%`,
            top: `${(spot.y / screen.h) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

/** Spot index on `screenId` for each map id that sits there. */
function spotsOf(screenId: string, mapIds: Iterable<number>): Set<number> {
  const spots = new Set<number>();
  for (const id of mapIds) {
    const loc = mapLocation(id);
    if (loc?.screen === screenId) spots.add(loc.spot);
  }
  return spots;
}

/**
 * The clickable world map players enter guesses on: pick a world, zoom through its
 * screens, click a spot, then pick a map at that spot (or search by name).
 */
export default function WorldMapPicker({
  theme,
  staged,
  guessed,
  disabled,
  revealMapId,
  onStage,
}: {
  theme: AppTheme;
  staged: number | null;
  guessed: Set<number>;
  disabled: boolean;
  /** When set (puzzle finished), opens on the answer's screen with its spot highlighted. */
  revealMapId: number | null;
  onStage: (mapId: number) => void;
}) {
  const reveal = revealMapId !== null ? mapLocation(revealMapId) : undefined;
  const [screenId, setScreenId] = useState(() => reveal?.screen ?? WORLDS[0].id);
  const [selected, setSelected] = useState<number | null>(() => reveal?.spot ?? null);
  const screen = getScreen(screenId)!;
  const chain = screenChain(screenId);
  const missedSpots = useMemo(() => spotsOf(screenId, guessed), [screenId, guessed]);
  const answerSpot = reveal?.screen === screenId ? reveal.spot : null;
  const spot = selected !== null ? screen.spots[selected] : undefined;

  function goTo(id: string) {
    setScreenId(id);
    setSelected(null);
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <nav aria-label="World map location" style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
          {chain.map((id, i) => (
            <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              {i > 0 && <span style={{ color: theme.muted, fontSize: "0.8rem" }}>›</span>}
              <button
                type="button"
                onClick={() => goTo(id)}
                disabled={id === screenId}
                style={{ ...crumbBtn, color: id === screenId ? theme.text : theme.accentText }}
              >
                {getScreen(id)!.label}
              </button>
            </span>
          ))}
        </nav>
        <PillGroup
          theme={theme}
          options={WORLDS.map((w) => ({ value: w.id, label: w.label }))}
          value={chain[0]}
          onChange={goTo}
        />
      </div>

      <ScreenArt
        theme={theme}
        screen={screen}
        selected={selected}
        missedSpots={missedSpots}
        answerSpot={answerSpot}
        onSelect={setSelected}
        onBack={screen.parent ? () => goTo(screen.parent!) : null}
      />

      {childScreens(screenId).length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
          <span className="tool-field-label" style={{ color: theme.muted, margin: 0 }}>Zoom into</span>
          {childScreens(screenId).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo(c.id)}
              style={{ ...chipBtn, color: theme.text, background: theme.timerBg, border: `1px solid ${theme.border}` }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {spot ? (
        <SpotPanel theme={theme} spot={spot} onZoom={goTo}>
          <MapOptions
            theme={theme}
            maps={spot.maps}
            staged={staged}
            guessed={guessed}
            disabled={disabled}
            onStage={onStage}
          />
        </SpotPanel>
      ) : (
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: theme.muted }}>
          Click a spot on the map to see the maps there. Hollow rings zoom into a closer map; Back or
          right-click zooms out.
        </div>
      )}

      {!disabled && (
        <MapSearch theme={theme} staged={staged} guessed={guessed} disabled={disabled} onStage={onStage} />
      )}
    </div>
  );
}
