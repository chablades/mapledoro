/*
  Sacred Symbols and the bosses they boost. Each region's symbol gives +20% damage to its own boss
  at Lv 11, Grand Sacred included (Tallahart Baldrix, Geardock Jupiter). MapleScouter has a single
  switch for all of them (doping.authenticDmg), which MapleDoro sends for the HEXA figure once all
  of them are maxed; Boss Clear applies each boss's own symbol instead (bossClearFormula.ts).
*/

import type { StoredCharacterRecord, StoredScouterBuffs } from "../model/charactersStore";
import { readCharacterToolData } from "../../tools/characterToolStorage";

interface SacredSymbolBoss {
  /** Symbol region, as named in the Symbols tool (symbol-data.ts). */
  area: string;
  /** Item id of the symbol, for its icon. */
  itemId: string;
  /** Boss Clear data name of the boss it boosts. */
  boss: string;
  bossLabel: string;
  grand: boolean;
}

export const SACRED_SYMBOL_BOSSES: readonly SacredSymbolBoss[] = [
  { area: "Cernium", itemId: "01713000", boss: "seren", bossLabel: "Seren", grand: false },
  { area: "Hotel Arcus", itemId: "01713001", boss: "kalos", bossLabel: "Kalos", grand: false },
  { area: "Odium", itemId: "01713002", boss: "adversary", bossLabel: "First Adversary", grand: false },
  { area: "Shangri-La", itemId: "01713003", boss: "kaling", bossLabel: "Kaling", grand: false },
  { area: "Arteria", itemId: "01713004", boss: "maleficStar", bossLabel: "Malefic Star", grand: false },
  { area: "Carcion", itemId: "01713005", boss: "limbo", bossLabel: "Limbo", grand: false },
  { area: "Tallahart", itemId: "01714000", boss: "bardrix", bossLabel: "Baldrix", grand: true },
  { area: "Geardock", itemId: "01714001", boss: "jupiter", bossLabel: "Jupiter", grand: true },
];

const SACRED_SYMBOL_MAX_LEVEL = 11;

/** Areas whose symbol is Lv 11 in saved symbol levels, or null when none of them are saved. */
export function maxedSymbolsFromLevels(symbols: Partial<Record<string, { level?: number } | undefined>> | undefined): string[] | null {
  if (!symbols || !SACRED_SYMBOL_BOSSES.some((s) => symbols[s.area])) return null;
  return SACRED_SYMBOL_BOSSES.filter((s) => (symbols[s.area]?.level ?? 0) >= SACRED_SYMBOL_MAX_LEVEL).map((s) => s.area);
}

/** Which symbols count as maxed: the Buffs step's Maxed Symbols, kept in step with saved symbol
 *  levels by Full Setup. Characters saved before that list existed fall back to their saved
 *  symbol levels, then to the old single "Lv. 11 Sacred Symbols" answer (all or nothing). */
export function maxedSacredSymbols(buffs: StoredScouterBuffs | undefined, savedLevels?: string[] | null): string[] {
  if (buffs?.maxedSymbols) return buffs.maxedSymbols;
  if (savedLevels) return savedLevels;
  return buffs?.maxedSacredSymbol ? SACRED_SYMBOL_BOSSES.map((s) => s.area) : [];
}

/** MapleScouter's single switch, which adds the symbols' damage to the HEXA figure: on only when
 *  every symbol is maxed, Grand Sacred included, so the figure carries it only once every symbol
 *  boss would. Boss Clear then removes it from bosses with no symbol (bossClearFormula.ts). */
export function sacredSwitchOn(maxed: readonly string[]): boolean {
  const maxedSet = new Set(maxed);
  return SACRED_SYMBOL_BOSSES.every((s) => maxedSet.has(s.area));
}

/** The Boss 380 tooltip line saying whether the figure carries the symbols' damage. */
export function sacredFigureNote(switchOn: boolean | undefined): string | null {
  if (switchOn === undefined) return null;
  return switchOn
    ? "Includes all 8 Sacred Symbols"
    : "Excludes Sacred Symbols until all 8 are maxed. Boss Clear counts each boss's own symbol.";
}

type SavedSymbols = Partial<Record<string, { level?: number } | undefined>>;

/** A character's saved symbol levels by region: the in-memory record first, since a setup Finish
 *  saves it before storage, then storage. */
function savedSymbols(character: StoredCharacterRecord): SavedSymbols | undefined {
  type Saved = { symbols?: SavedSymbols };
  return ((character.tools?.symbols as Saved | undefined) ?? readCharacterToolData<Saved>(character.characterName, "symbols"))?.symbols;
}

/** maxedSymbolsFromLevels for a character's saved symbol levels. */
export function savedMaxedSymbols(character: StoredCharacterRecord): string[] | null {
  return maxedSymbolsFromLevels(savedSymbols(character));
}

/** Saved Sacred Symbol levels by region, or null when none are saved. */
export function savedSacredLevels(character: StoredCharacterRecord): Partial<Record<string, number>> | null {
  const symbols = savedSymbols(character);
  if (!symbols || !SACRED_SYMBOL_BOSSES.some((s) => symbols[s.area])) return null;
  return Object.fromEntries(SACRED_SYMBOL_BOSSES.map((s) => [s.area, symbols[s.area]?.level ?? 0]));
}
