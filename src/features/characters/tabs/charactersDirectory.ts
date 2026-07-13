import type { StoredCharacterRecord } from "../model/charactersStore";
import { toCharacterKey } from "../model/characterKeys";
import { CHARACTERS_TRANSITION_MS } from "./useSetupFlowTransitions";

export type DirectorySortBy = "name" | "level" | "class" | "world";

function sortCharacters(
  characters: StoredCharacterRecord[],
  sortBy: DirectorySortBy,
) {
  const entries = [...characters];
  if (sortBy === "level") {
    entries.sort((a, b) => b.level - a.level || a.characterName.localeCompare(b.characterName));
    return entries;
  }
  if (sortBy === "class") {
    entries.sort(
      (a, b) => a.jobName.localeCompare(b.jobName) || a.characterName.localeCompare(b.characterName),
    );
    return entries;
  }
  // Only meaningful in All Worlds view, where the merged Champions/Mules sections would
  // otherwise interleave characters from different worlds with nothing but the small
  // per-card world badge to tell them apart.
  if (sortBy === "world") {
    entries.sort((a, b) => a.worldID - b.worldID || a.characterName.localeCompare(b.characterName));
    return entries;
  }
  entries.sort((a, b) => a.characterName.localeCompare(b.characterName));
  return entries;
}

export function buildDirectoryGroups(args: {
  allCharacters: StoredCharacterRecord[];
  sortBy: DirectorySortBy;
  mainCharacterKey: string | null;
  championCharacterKeys: string[];
  maxCharacters: number;
}) {
  const sortedCharacters = sortCharacters(args.allCharacters, args.sortBy);
  const mainCharacter =
    sortedCharacters.find((character) => toCharacterKey(character) === args.mainCharacterKey) ??
    null;
  const mainCharacterCompositeKey = mainCharacter ? toCharacterKey(mainCharacter) : null;

  const championSet = new Set(args.championCharacterKeys);
  const championCharacters = sortedCharacters.filter((character) =>
    championSet.has(toCharacterKey(character)),
  );
  const isMainAlsoChampion = mainCharacterCompositeKey
    ? championSet.has(mainCharacterCompositeKey)
    : false;
  const championCharactersForDirectory = championCharacters.filter(
    (character) => toCharacterKey(character) !== mainCharacterCompositeKey,
  );
  const otherCharacters = sortedCharacters.filter((character) => {
    const key = toCharacterKey(character);
    if (mainCharacterCompositeKey && key === mainCharacterCompositeKey) return false;
    return !championSet.has(key);
  });

  const reservedMainSlots = mainCharacterCompositeKey ? 1 : 0;
  const muleCapacity = Math.max(
    0,
    args.maxCharacters - reservedMainSlots - championCharactersForDirectory.length,
  );

  return {
    sortedCharacters,
    mainCharacter,
    championCharacters,
    championCharactersForDirectory,
    otherCharacters,
    muleCapacity,
    canAddCharacter: sortedCharacters.length < args.maxCharacters,
    hasChampionSection: championCharactersForDirectory.length > 0 || isMainAlsoChampion,
    isMainAlsoChampion,
  };
}

// All Worlds view merges every tracked world's Main/Champions/Mules into three flat
// buckets instead of repeating the three-tier structure (and its own Mules pagination)
// once per world, which stacks badly once a player has several worlds. Character keys
// are globally unique by name (not per-world scoped, see characters/CLAUDE.md), so a
// Set of keys collected across every world's main/champion lookups is a safe way to
// classify the merged roster with no cross-world collision risk.
export function buildMergedDirectoryGroups(args: {
  allCharacters: StoredCharacterRecord[];
  sortBy: DirectorySortBy;
  mainCharacterKeys: ReadonlySet<string>;
  championCharacterKeys: ReadonlySet<string>;
}) {
  const sortedCharacters = sortCharacters(args.allCharacters, args.sortBy);
  const mainCharacters = sortedCharacters.filter((character) =>
    args.mainCharacterKeys.has(toCharacterKey(character)),
  );
  const championCharacters = sortedCharacters.filter((character) => {
    const key = toCharacterKey(character);
    return args.championCharacterKeys.has(key) && !args.mainCharacterKeys.has(key);
  });
  const otherCharacters = sortedCharacters.filter((character) => {
    const key = toCharacterKey(character);
    return !args.mainCharacterKeys.has(key) && !args.championCharacterKeys.has(key);
  });

  return { sortedCharacters, mainCharacters, championCharacters, otherCharacters };
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(0, page), pageCount - 1);
  const start = clampedPage * pageSize;
  return { pageItems: items.slice(start, start + pageSize), pageCount, clampedPage };
}

export function getDirectoryRevealDelays(
  fastDirectoryRevealOnce: boolean,
  hasChampionSection: boolean,
) {
  if (fastDirectoryRevealOnce) {
    return { mainDelay: 24, championDelay: 56, mulesDelay: hasChampionSection ? 88 : 56 };
  }
  return { mainDelay: 60, championDelay: 120, mulesDelay: hasChampionSection ? 180 : 120 };
}

export function getDirectoryRevealStyle(visible: boolean) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(10px)",
    transition: `opacity ${CHARACTERS_TRANSITION_MS.standard}ms ease, transform ${CHARACTERS_TRANSITION_MS.standard}ms ease`,
    pointerEvents: visible ? ("auto" as const) : ("none" as const),
  };
}
