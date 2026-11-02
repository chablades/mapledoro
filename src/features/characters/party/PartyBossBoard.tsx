"use client";

import { useState } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { bossDifficultyIconUrl } from "../../../lib/mapleResource";
import { PillGroup } from "../../tools/shared-ui";
import type { ClearColorTier, PartyMemberShare } from "../scouter/bossClearFormula";
import FallbackSpriteIcon from "../scouter/FallbackSpriteIcon";
import BossBanner from "../scouter/BossBanner";
import { lossBreakdown } from "../scouter/bossLoss";
import HoverTooltip from "../../../components/HoverTooltip";
import { formatFigure } from "../scouter/scouterFormat";
import { CHARACTERS_COPY } from "../tabs/content";
import { formatPartyPercent, isRelevantForParty, type BossRegion, type PartyTile } from "./partyBoard";
import type { PartyMember } from "./usePartyMembers";

const COPY = CHARACTERS_COPY.partyScouter;

type Filter = "relevant" | "all";
const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "relevant", label: COPY.filterRelevant },
  { value: "all", label: COPY.filterAll },
];

// All splits the bosses by where they live, Grandis open and the rest folded, so it doesn't run a
// hundred tiles long.
const REGIONS: { region: BossRegion; label: string; open: boolean }[] = [
  { region: "grandis", label: COPY.regionGrandis, open: true },
  { region: "arcaneRiver", label: COPY.regionArcaneRiver, open: false },
  { region: "mapleWorld", label: COPY.regionMapleWorld, open: false },
];

// The same tag colours as a character's own Boss Clear, where Party Min is purple too.
function tagColor(theme: AppTheme, tier: ClearColorTier): string {
  if (tier === "green") return statusText(theme, "success");
  if (tier === "blue") return statusText(theme, "info");
  if (tier === "red") return statusText(theme, "danger");
  if (tier === "orange") return statusText(theme, "critical");
  if (tier === "purple") return statusText(theme, "severe");
  return theme.muted;
}

function tagText(tile: PartyTile): string {
  return tile.result.cannotEnter === "partyLimit" ? COPY.partyLimit(tile.result.partyLimit) : tile.result.tagEnglish;
}

/** Each member's part of the tile's strip, as a share of the party's total. */
function Strip({ tile, members }: { tile: PartyTile; members: PartyMember[] }) {
  const total = tile.result.clearRate;
  return (
    <span className="party-strip" aria-hidden="true">
      {tile.result.cannotEnter === null && total > 0 && tile.result.members.map((share, i) => (
        <i key={members[i].key} style={{ width: `${(share.clearRate / total) * 100}%`, background: members[i].color }} />
      ))}
    </span>
  );
}

function DifficultyRow({ theme, tile, members, selected, onSelect }: {
  theme: AppTheme; tile: PartyTile; members: PartyMember[]; selected: boolean; onSelect: () => void;
}) {
  const { entry, result } = tile;
  return (
    <button type="button" className={`party-row${result.cannotEnter ? " is-blocked" : ""}`} aria-pressed={selected} onClick={onSelect}>
      <FallbackSpriteIcon theme={theme} src={tile.iconId ? bossDifficultyIconUrl(tile.iconId, entry.difficulty) : undefined} size={24} displayName={tile.displayName} />
      <span className="party-row-name">
        <span>{entry.difficulty}</span>
        <span className="party-tag" style={{ color: tagColor(theme, result.colorTier) }}>{tagText(tile)}</span>
      </span>
      <strong>{formatPartyPercent(result.clearRate)}</strong>
      <Strip tile={tile} members={members} />
    </button>
  );
}

/** One row per boss: its art (the profile's Quick View banner) and its difficulties beside it. */
function BossCard({ theme, tiles, members, selectedId, onSelect }: {
  theme: AppTheme; tiles: PartyTile[]; members: PartyMember[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const first = tiles[0];
  return (
    <div className="party-boss">
      <BossBanner theme={theme} boss={first.entry.boss} iconId={first.iconId} displayName={first.displayName} />
      <div className="party-boss-cells">
        {tiles.map((tile) => (
          <DifficultyRow key={tile.id} theme={theme} tile={tile} members={members} selected={tile.id === selectedId} onSelect={() => onSelect(tile.id)} />
        ))}
      </div>
    </div>
  );
}

/** Tiles grouped by boss, in the order they came. */
function byBoss(tiles: PartyTile[]): PartyTile[][] {
  const groups = new Map<string, PartyTile[]>();
  for (const tile of tiles) groups.set(tile.entry.boss, [...(groups.get(tile.entry.boss) ?? []), tile]);
  return [...groups.values()];
}

/** The boss's own numbers: its level, force requirement and party size. */
function BossFacts({ tile }: { tile: PartyTile }) {
  const { entry, result } = tile;
  const facts = [COPY.bossLevel(entry.level)];
  if (entry.arcaneForce) facts.push(COPY.bossArcane(formatFigure(entry.arcaneForce)));
  if (entry.authenticForce) facts.push(COPY.bossSacred(formatFigure(entry.authenticForce)));
  facts.push(COPY.partyLimit(result.partyLimit));
  return <p className="party-facts">{facts.join(" · ")}</p>;
}

const figure = (value: number | string) => (typeof value === "number" ? formatFigure(value) : value);

/** What the boss's requirements cost this member: their total Final Damage loss beside their
 *  name, the reasons (member vs boss, the same figures as the profile's Spotlight) on hover or
 *  tap. Or that they can't go in at all. */
function MemberLosses({ theme, share }: { theme: AppTheme; share: PartyMemberShare }) {
  const color = statusText(theme, "warning");
  if (share.cannotEnter) return <span className="party-loss" style={{ color }}>{COPY.underLevel}</span>;
  const { combinedLossPercent, lines } = lossBreakdown(share.solo);
  const shortfalls = lines.filter((l) => l.lossPercent !== null);
  if (shortfalls.length === 0) return null;
  const table = (
    <span className="party-loss-table">
      {shortfalls.map((l) => (
        <span key={l.label} className="party-loss-row">
          <span>{l.label}</span>
          <span>{figure(l.yourValue)} / {figure(l.bossValue)}</span>
          <b style={{ color }}>−{Math.round(l.lossPercent ?? 0)}%</b>
        </span>
      ))}
    </span>
  );
  return (
    <HoverTooltip theme={theme} label={table} className="party-loss">
      <span className="party-loss-figure" style={{ color }}>−{Math.round(combinedLossPercent)}% FD</span>
    </HoverTooltip>
  );
}

function Breakdown({ theme, tile, members }: { theme: AppTheme; tile: PartyTile | null; members: PartyMember[] }) {
  if (!tile) return <aside className="party-panel party-side"><p className="party-empty">{COPY.pickTile}</p></aside>;
  const { result } = tile;
  // Bars share one scale, the strongest member's share, so the longest bar is full.
  const top = Math.max(...result.members.map((m) => m.clearRate), 0.0001);
  return (
    <aside className="party-panel party-side" aria-live="polite">
      <div className="party-side-head">
        <h3>{tile.displayName} <span>{tile.entry.difficulty}</span></h3>
        <span className="party-tag" style={{ color: tagColor(theme, result.colorTier), fontSize: "0.8rem" }}>{tagText(tile)}</span>
      </div>
      <BossFacts tile={tile} />
      <p className="party-label">{COPY.breakdownTitle}</p>
      {result.members.map((share, i) => {
        const member = members[i];
        return (
          <div key={member.key} className="party-share">
            <div className="party-share-line">
              <span className="party-share-name">
                <span>{member.record.characterName}</span>
                <MemberLosses theme={theme} share={share} />
              </span>
              <span>{formatPartyPercent(share.clearRate)}</span>
            </div>
            <div className="party-bar"><i style={{ width: `${(share.clearRate / top) * 100}%`, background: member.color }} /></div>
          </div>
        );
      })}
      <div className="party-total">
        <span>{COPY.partyTotal}</span>
        <span>{formatPartyPercent(result.clearRate)}</span>
      </div>
      <div className="party-hexa-box">
        <p className="party-label" style={{ margin: 0 }}>{COPY.partyHexa}</p>
        <strong>{formatFigure(result.partyHexa)}</strong>
      </div>
    </aside>
  );
}

/** The member keeping the party out of the most bosses by level, if anyone is. */
function levelBlocker(tiles: PartyTile[], members: PartyMember[]): PartyMember | null {
  const counts = members.map((_, i) => tiles.filter((t) => t.result.cannotEnter === "level" && t.result.members[i].cannotEnter).length);
  const most = Math.max(0, ...counts);
  return most > 0 ? members[counts.indexOf(most)] : null;
}

/** When Relevant leaves nothing (typically a low-level member keeping the party out of every boss
 *  the rest haven't outgrown), says who and offers the two ways out. */
function NothingRelevant({ theme, tiles, members, onSitOut, onShowAll }: {
  theme: AppTheme; tiles: PartyTile[]; members: PartyMember[]; onSitOut: (key: string) => void; onShowAll: () => void;
}) {
  const blocker = levelBlocker(tiles, members);
  return (
    <div className="party-empty">
      <p style={{ margin: "0 0 12px", color: theme.text }}>{blocker ? COPY.blockedBy(blocker.record.characterName) : COPY.nothingRelevant}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {blocker && (
          <button type="button" className="tool-dialog-btn" style={{ background: theme.accent, color: theme.accentOn, border: "none" }} onClick={() => onSitOut(blocker.key)}>
            {COPY.sitOut(blocker.record.characterName)}
          </button>
        )}
        <button type="button" className="tool-dialog-btn" style={{ background: "none", color: theme.text, border: `1px solid ${theme.border}` }} onClick={onShowAll}>
          {COPY.showAll}
        </button>
      </div>
    </div>
  );
}

/** The bosses as tiles, each with the party's combined clear and a strip showing who carries,
 *  and the chosen boss's breakdown beside them. */
export default function PartyBossBoard({ theme, tiles, members, onSitOut }: {
  theme: AppTheme; tiles: PartyTile[]; members: PartyMember[]; onSitOut: (key: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("relevant");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shown = tiles.filter((t) => isRelevantForParty(t.result));
  const selected = tiles.find((t) => t.id === selectedId) ?? null;
  const tileList = (list: PartyTile[]) => (
    <div className="party-tiles">
      {byBoss(list).map((group) => (
        <BossCard key={group[0].entry.boss} theme={theme} tiles={group} members={members} selectedId={selectedId} onSelect={setSelectedId} />
      ))}
    </div>
  );

  return (
    <div className="party-work">
      <section className="party-panel">
        <div className="party-panel-head">
          <h2>{COPY.bossClearTitle}</h2>
          <PillGroup theme={theme} options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        </div>
        {filter === "relevant" && (shown.length > 0
          ? tileList(shown)
          : <NothingRelevant theme={theme} tiles={tiles} members={members} onSitOut={onSitOut} onShowAll={() => setFilter("all")} />)}
        {filter === "all" && REGIONS.map(({ region, label, open }) => (
          <details key={region} className="party-fold" open={open}>
            <summary>{label}</summary>
            {tileList(tiles.filter((t) => t.region === region))}
          </details>
        ))}
        <p className="party-note">{COPY.caveat}</p>
      </section>
      <Breakdown theme={theme} tile={selected} members={members} />
    </div>
  );
}
