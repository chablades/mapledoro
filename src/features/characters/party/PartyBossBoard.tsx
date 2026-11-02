"use client";

// Party Scouter's bosses as a boss select: a strip of boss art to pick from, and one hero panel
// for the picked boss holding its difficulties and the chosen difficulty's breakdown together.

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import HoverTooltip from "../../../components/HoverTooltip";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { bossSplashUrl } from "../../../lib/mapleResource";
import { PillGroup } from "../../tools/shared-ui";
import type { ClearColorTier, PartyMemberShare } from "../scouter/bossClearFormula";
import { BOSS_ART_POSITION, DEFAULT_ART_POSITION } from "../scouter/bossArt";
import { lossBreakdown } from "../scouter/bossLoss";
import { formatFigure } from "../scouter/scouterFormat";
import { CHARACTERS_COPY } from "../tabs/content";
import { formatPartyPercent, isRelevantForParty, type BossRegion, type PartyTile } from "./partyBoard";
import type { PartyMember } from "./usePartyMembers";

const COPY = CHARACTERS_COPY.partyScouter;

type Filter = "relevant" | BossRegion;
const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "relevant", label: COPY.filterRelevant },
  { value: "grandis", label: COPY.regionGrandis },
  { value: "arcaneRiver", label: COPY.regionArcaneRiver },
  { value: "mapleWorld", label: COPY.regionMapleWorld },
];

interface BossGroup {
  boss: string;
  displayName: string;
  iconId: string | undefined;
  /** Every difficulty of the boss, easiest first. */
  tiles: PartyTile[];
}

function byBoss(tiles: PartyTile[]): BossGroup[] {
  const groups = new Map<string, BossGroup>();
  for (const tile of tiles) {
    const group = groups.get(tile.entry.boss);
    if (group) group.tiles.push(tile);
    else groups.set(tile.entry.boss, { boss: tile.entry.boss, displayName: tile.displayName, iconId: tile.iconId, tiles: [tile] });
  }
  return [...groups.values()];
}

const clears = (tile: PartyTile) => tile.result.cannotEnter === null && tile.result.colorTier !== "gray";

/** The hardest difficulty this party clears, else the first one it can enter, else the first. */
function defaultTile(group: BossGroup): PartyTile {
  return group.tiles.findLast(clears) ?? group.tiles.find((t) => t.result.cannotEnter === null) ?? group.tiles[0];
}

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

// Bosses whose art sits too high in Party Scouter's frames, moved further down (a share of the
// frame's height).
const ART_SHIFT: Partial<Record<string, string>> = { 루시드: "8%", "진 힐라": "4%" };

/** A boss's splash art, aimed at its face (the profile's Quick View crops), with the top strip
 *  where the art letters the boss's name always cut off. Hidden if it fails to load. */
function BossArt({ boss, iconId, className, sizes }: { boss: string; iconId: string | undefined; className: string; sizes: string }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!iconId) return null;
  return (
    <div ref={ref} className={className} aria-hidden="true">
      {/* Reaches above the visible area so the name lettered across the top of every splash
          stays cut off at any width. */}
      <div className="party-art-crop" style={{ "--art-shift": ART_SHIFT[boss] ?? "0%" } as CSSProperties}>
        <Image
          src={bossSplashUrl(iconId)}
          alt=""
          fill
          unoptimized
          sizes={sizes}
          onError={() => { if (ref.current) ref.current.style.display = "none"; }}
          style={{ objectFit: "cover", objectPosition: BOSS_ART_POSITION[boss] ?? DEFAULT_ART_POSITION }}
        />
      </div>
    </div>
  );
}

/** A boss in the strip: its art and name, with a bar in the colour of the hardest difficulty this
 *  party clears (none when it clears nothing). */
function BossThumb({ theme, group, selected, onSelect }: { theme: AppTheme; group: BossGroup; selected: boolean; onSelect: () => void }) {
  const best = group.tiles.findLast(clears);
  return (
    <button type="button" className="party-thumb" aria-pressed={selected} onClick={onSelect}>
      <BossArt boss={group.boss} iconId={group.iconId} className="party-thumb-art" sizes="160px" />
      <b>{group.displayName}</b>
      {best && <span className="party-thumb-bar" style={{ background: tagColor(theme, best.result.colorTier) }} />}
    </button>
  );
}

/** Each member's part of a difficulty, as a share of the party's total. */
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

function DifficultyTab({ theme, tile, members, selected, onSelect }: {
  theme: AppTheme; tile: PartyTile; members: PartyMember[]; selected: boolean; onSelect: () => void;
}) {
  const { entry, result } = tile;
  return (
    <button type="button" role="tab" aria-selected={selected} className={`party-diff${result.cannotEnter ? " is-blocked" : ""}`} onClick={onSelect}>
      <span className="party-diff-name">{entry.difficulty}</span>
      <strong>{formatPartyPercent(result.clearRate)}</strong>
      <span className="party-tag" style={{ color: tagColor(theme, result.colorTier) }}>{tagText(tile)}</span>
      <Strip tile={tile} members={members} />
    </button>
  );
}

/** The boss's own numbers: its level, force requirement and party size. */
function bossFacts(tile: PartyTile): string {
  const { entry, result } = tile;
  const facts = [COPY.bossLevel(entry.level)];
  if (entry.arcaneForce) facts.push(COPY.bossArcane(formatFigure(entry.arcaneForce)));
  if (entry.authenticForce) facts.push(COPY.bossSacred(formatFigure(entry.authenticForce)));
  facts.push(COPY.partyLimit(result.partyLimit));
  return facts.join(" · ");
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

/** Who carries the chosen difficulty: each member's share, their losses, the total and the
 *  Adjusted party HEXA. */
function Breakdown({ theme, tile, members }: { theme: AppTheme; tile: PartyTile; members: PartyMember[] }) {
  const { result } = tile;
  // Bars share one scale, the strongest member's share, so the longest bar is full.
  const top = Math.max(...result.members.map((m) => m.clearRate), 0.0001);
  return (
    <div className="party-breakdown" role="tabpanel" aria-live="polite">
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
    </div>
  );
}

/** The picked boss: its art large, its difficulties as tabs, and the chosen one's breakdown. */
function BossHero({ theme, group, tile, members, onSelectTile }: {
  theme: AppTheme; group: BossGroup; tile: PartyTile; members: PartyMember[]; onSelectTile: (id: string) => void;
}) {
  return (
    <section className="party-hero">
      <BossArt key={group.boss} boss={group.boss} iconId={group.iconId} className="party-hero-art" sizes="760px" />
      <div className="party-hero-body">
        <h3>{group.displayName}</h3>
        <p className="party-facts">{bossFacts(tile)}</p>
        <div className="party-diffs" role="tablist" aria-label={group.displayName}>
          {group.tiles.map((t) => (
            <DifficultyTab key={t.id} theme={theme} tile={t} members={members} selected={t.id === tile.id} onSelect={() => onSelectTile(t.id)} />
          ))}
        </div>
        <Breakdown theme={theme} tile={tile} members={members} />
      </div>
    </section>
  );
}

/** The member keeping the party out of the most bosses by level, if anyone is. */
function levelBlocker(tiles: PartyTile[], members: PartyMember[]): PartyMember | null {
  const counts = members.map((_, i) => tiles.filter((t) => t.result.cannotEnter === "level" && t.result.members[i].cannotEnter).length);
  const most = Math.max(0, ...counts);
  return most > 0 ? members[counts.indexOf(most)] : null;
}

/** When Relevant leaves nothing (typically a low-level member keeping the party out of every boss
 *  the rest haven't outgrown), says who and offers the ways out. */
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

/** The bosses in the strip for a filter: Relevant keeps those with at least one relevant
 *  difficulty, a region keeps its own. Either way a boss brings all its difficulties along. */
function groupsFor(filter: Filter, tiles: PartyTile[]): BossGroup[] {
  const groups = byBoss(tiles);
  if (filter === "relevant") return groups.filter((g) => g.tiles.some((t) => isRelevantForParty(t.result)));
  return groups.filter((g) => g.tiles[0].region === filter);
}

export default function PartyBossBoard({ theme, tiles, members, onSitOut }: {
  theme: AppTheme; tiles: PartyTile[]; members: PartyMember[]; onSitOut: (key: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("relevant");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const groups = groupsFor(filter, tiles);
  const picked = groups.find((g) => g.tiles.some((t) => t.id === selectedId)) ?? groups[0];
  const tile = picked?.tiles.find((t) => t.id === selectedId) ?? (picked ? defaultTile(picked) : null);

  return (
    <section className="party-panel party-board">
      <div className="party-panel-head">
        <h2>{COPY.bossClearTitle}</h2>
        <PillGroup theme={theme} options={FILTER_OPTIONS} value={filter} onChange={setFilter} wrap />
      </div>
      {groups.length === 0 ? (
        <NothingRelevant theme={theme} tiles={tiles} members={members} onSitOut={onSitOut} onShowAll={() => setFilter("grandis")} />
      ) : (
        <>
          <div className="party-thumbs">
            {groups.map((group) => (
              <BossThumb
                key={group.boss}
                theme={theme}
                group={group}
                selected={group === picked}
                onSelect={() => setSelectedId(defaultTile(group).id)}
              />
            ))}
          </div>
          {picked && tile && <BossHero theme={theme} group={picked} tile={tile} members={members} onSelectTile={setSelectedId} />}
        </>
      )}
      <p className="party-note">{COPY.caveat}</p>
    </section>
  );
}
