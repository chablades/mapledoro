// Keeps characters from silently disappearing from the saved store.
//
// The Characters page saves by rebuilding the whole store from its in-memory roster, so a
// character that is on disk but missing from that roster is erased by the write, along with
// its Main and Champion roles. Two open tabs are enough to cause it: one tab adds a
// character, and the other tab's next save, built from a roster that never had it, writes it
// away. A past wipe was persisted the same way, after a different bug emptied the roster.
//
// Every real removal (the Remove button, and existing residents unchecked to make room in a
// world import) calls markIntentionalRemoval first. Any other disappearance is undone before
// the write rather than refused, so the rest of the write (whatever the user just changed)
// still saves.
//
// Type-only imports keep this module runnable on its own under `node --test`.

import type { CharactersStore } from "./charactersStore";

/** Mirrors MAX_CHAMPIONS in useCharacterSetupController.ts, which a model module can't import. */
const MAX_CHAMPIONS_PER_WORLD = 5;

const intentionalRemovals = new Set<string>();

/** Call from a delete path before the roster update that removes the character. */
export function markIntentionalRemoval(characterKey: string) {
  intentionalRemovals.add(characterKey.trim().toLowerCase());
}

export function isIntentionalRemoval(characterKey: string): boolean {
  return intentionalRemovals.has(characterKey);
}

/** Forgets markers once their removal has reached disk, so a character removed and later
 *  re-added is protected again. */
export function clearIntentionalRemovals(characterKeys: readonly string[]) {
  for (const key of characterKeys) intentionalRemovals.delete(key);
}

interface GuardResult {
  store: CharactersStore;
  /** Keys that `next` dropped without a removal request and were put back. */
  restored: string[];
  /** Keys whose requested removal this write carries out. */
  removed: string[];
}

function restoreRoles(before: CharactersStore, store: CharactersStore, key: string) {
  for (const [worldId, mainKey] of Object.entries(before.mainCharacterIdByWorld)) {
    // Only into an empty slot: a world that has since chosen another Main keeps it.
    if (mainKey === key && !store.mainCharacterIdByWorld[worldId]) {
      store.mainCharacterIdByWorld[worldId] = key;
    }
  }
  for (const [worldId, championKeys] of Object.entries(before.championCharacterIdsByWorld)) {
    if (!championKeys.includes(key)) continue;
    const current = store.championCharacterIdsByWorld[worldId] ?? [];
    if (current.includes(key) || current.length >= MAX_CHAMPIONS_PER_WORLD) continue;
    store.championCharacterIdsByWorld[worldId] = [...current, key];
  }
}

/** `next` with every character that `before` (the store on disk) has and `next` lacks put
 *  back, along with its Main and Champion roles where those slots are still free, unless its
 *  removal was requested. Pure: neither input is modified. */
export function restoreVanishedCharacters(before: CharactersStore, next: CharactersStore): GuardResult {
  const restored: string[] = [];
  const removed: string[] = [];
  for (const key of Object.keys(before.charactersById)) {
    if (next.charactersById[key]) continue;
    (isIntentionalRemoval(key) ? removed : restored).push(key);
  }
  if (restored.length === 0) return { store: next, restored, removed };

  const store: CharactersStore = {
    ...next,
    charactersById: { ...next.charactersById },
    order: [...next.order],
    mainCharacterIdByWorld: { ...next.mainCharacterIdByWorld },
    championCharacterIdsByWorld: { ...next.championCharacterIdsByWorld },
  };
  const ordered = new Set(store.order);
  for (const key of restored) {
    store.charactersById[key] = before.charactersById[key];
    if (!ordered.has(key)) store.order.push(key);
    restoreRoles(before, store, key);
  }
  return { store, restored, removed };
}
