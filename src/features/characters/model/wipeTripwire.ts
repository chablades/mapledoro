// Dev-only tripwire for the "my data wiped out of nowhere" class of bug.
//
// Three separate causes have produced it so far (handleRefreshed not carrying fields
// over, buildFullSetupRecord falling back to a blank base, and running main's older
// charactersStore against branch-shaped data on the same localhost origin). Each one
// was only diagnosed after the fact, from whatever evidence happened to survive, and
// the last one was recoverable purely because an export happened to be 30 minutes old.
//
// So this is a safety net first and a diagnostic second: it snapshots the pre-write
// store whenever a populated field goes blank, and logs the stack of whoever did it.
// Compiled out of production builds, since every entry point is behind NODE_ENV.

import type { CharactersStore, StoredCharacterRecord } from "./charactersStore";

const SNAPSHOT_KEY = "dev_wipe_snapshots_v1";
const MAX_SNAPSHOTS = 3;

// Deliberately does not start with "mapledoro": the /settings export and import walk keys
// by that prefix, and snapshots would triple the size of every backup file.

/** Record fields worth guarding. Scaffolding (ign, level, meta) is excluded: it is
 *  rewritten on every refresh and would only generate noise. `tools` is absent on purpose
 *  since it is a bag of independent per-tool blobs, checked one subkey at a time below so
 *  losing one tool's data isn't masked by its neighbours still being populated. */
const WATCHED_FIELDS = [
  "equipment", "vMatrix", "linkSkills", "familiars", "stats", "scouter", "expHistory",
] as const satisfies readonly (keyof StoredCharacterRecord)[];

/** World-keyed maps that live on the store rather than on a character record, so the
 *  per-character pass never sees them, meaning Legion's Artifact board. Link Skills moved to
 *  a per-character field (see charactersStore.ts's file-header reasoning), so they are now
 *  covered by WATCHED_FIELDS above instead of here. */
const WATCHED_WORLD_MAPS = [
  "legionArtifactByWorld",
] as const satisfies readonly (keyof CharactersStore)[];

/** Ignore fields that were near-empty to begin with, so adding then clearing a single
 *  value doesn't cry wolf. Real data (21 gear slots, a stat block) is far above this. */
const MIN_LEAVES_TO_GUARD = 3;

/** Counts meaningful leaf values in a subtree. `null`, `undefined`, `""`, `0` and
 *  `false` are all "absent", which makes a blank-but-well-formed object (every gear
 *  slot present and set to null) score 0, exactly the shape these wipes leave behind. */
function countLeaves(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countLeaves(v), 0);
  if (typeof value === "object") {
    return Object.values(value).reduce<number>((n, v) => n + countLeaves(v), 0);
  }
  if (typeof value === "string") return value.trim() === "" ? 0 : 1;
  if (typeof value === "number") return value === 0 ? 0 : 1;
  if (typeof value === "boolean") return value ? 1 : 0;
  return 1;
}

interface Wipe {
  /** Character store key, or `world <id>` for the store-level Legion maps. */
  subject: string;
  field: string;
  leavesBefore: number;
}

/** Populated before, nothing left after. */
function isWipe(prev: unknown, next: unknown): number | null {
  const leavesBefore = countLeaves(prev);
  if (leavesBefore < MIN_LEAVES_TO_GUARD) return null;
  return countLeaves(next) === 0 ? leavesBefore : null;
}

function findCharacterWipes(before: CharactersStore, after: CharactersStore): Wipe[] {
  const wipes: Wipe[] = [];
  for (const [key, prevRecord] of Object.entries(before.charactersById)) {
    const nextRecord = after.charactersById[key];
    // A character vanishing is almost always a deliberate removal (it has its own
    // confirmation dialog), so it is not treated as a wipe.
    if (!nextRecord) continue;
    for (const field of WATCHED_FIELDS) {
      const leavesBefore = isWipe(prevRecord[field], nextRecord[field]);
      if (leavesBefore !== null) wipes.push({ subject: key, field, leavesBefore });
    }
    for (const tool of Object.keys(prevRecord.tools ?? {})) {
      const leavesBefore = isWipe(prevRecord.tools?.[tool], nextRecord.tools?.[tool]);
      if (leavesBefore !== null) wipes.push({ subject: key, field: `tools.${tool}`, leavesBefore });
    }
  }
  return wipes;
}

function findWorldWipes(before: CharactersStore, after: CharactersStore): Wipe[] {
  const wipes: Wipe[] = [];
  for (const map of WATCHED_WORLD_MAPS) {
    const prevMap = before[map] ?? {};
    const nextMap = after[map] ?? {};
    for (const worldId of Object.keys(prevMap)) {
      const leavesBefore = isWipe(prevMap[worldId], nextMap[worldId]);
      if (leavesBefore !== null) wipes.push({ subject: `world ${worldId}`, field: map, leavesBefore });
    }
  }
  return wipes;
}

function findWipes(before: CharactersStore, after: CharactersStore): Wipe[] {
  return [...findCharacterWipes(before, after), ...findWorldWipes(before, after)];
}

function saveSnapshot(rawBefore: string, wipes: Wipe[]): string | null {
  try {
    const existing = window.localStorage.getItem(SNAPSHOT_KEY);
    const parsed: unknown = existing ? JSON.parse(existing) : [];
    const snapshots = Array.isArray(parsed) ? parsed : [];
    const id = new Date().toISOString();
    snapshots.unshift({
      id,
      wipes: wipes.map((w) => `${w.subject}.${w.field} (${w.leavesBefore} values)`),
      store: rawBefore,
    });
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, MAX_SNAPSHOTS)));
    return id;
  } catch {
    // Quota is the likely failure here, and losing the snapshot must not break the write.
    return null;
  }
}

/** Dev-only drill: `__mapledoroTestTripwire("<character name>")` in the console runs the real
 *  detector against the real stored data with one character's equipment blanked, so the
 *  wiring, the snapshot write and the log output can all be checked in a browser. Builds
 *  the blanked store in memory and never persists it, so no character data is touched. */
function installTripwireDrill() {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return;
  const target = window as typeof window & { __mapledoroTestTripwire?: (name: string) => void };
  if (target.__mapledoroTestTripwire) return;
  target.__mapledoroTestTripwire = (name: string) => {
    const raw = window.localStorage.getItem("mapledoro_characters_store_v1");
    if (!raw) return console.warn("[wipe tripwire] no stored characters to drill against.");
    const key = name.trim().toLowerCase();
    const fake = JSON.parse(raw) as CharactersStore;
    const record = fake.charactersById[key];
    if (!record) {
      return console.warn(`[wipe tripwire] no character "${key}". Have: ${Object.keys(fake.charactersById).join(", ")}`);
    }
    record.equipment = null as unknown as StoredCharacterRecord["equipment"];
    console.info(`[wipe tripwire] drill: pretending ${key}.equipment was blanked. Nothing is being saved.`);
    checkForWipe(raw, fake);
  };
}

installTripwireDrill();

/** Call immediately before persisting `next`. No-op in production. */
export function checkForWipe(rawBefore: string | null, next: CharactersStore) {
  if (process.env.NODE_ENV === "production") return;
  if (!rawBefore) return;

  let before: CharactersStore;
  try {
    before = JSON.parse(rawBefore) as CharactersStore;
  } catch {
    return;
  }
  if (!before?.charactersById || !next?.charactersById) return;

  const wipes = findWipes(before, next);
  if (wipes.length === 0) return;

  const snapshotId = saveSnapshot(rawBefore, wipes);
  const lines = wipes.map((w) => `  ${w.subject}.${w.field}: ${w.leavesBefore} values -> empty`);
  console.error(
    `[wipe tripwire] ${wipes.length} field(s) went from populated to empty:\n${lines.join("\n")}\n` +
    (snapshotId
      ? `Previous store saved. Recover with:\n` +
        `  copy(JSON.parse(localStorage.getItem("${SNAPSHOT_KEY}"))[0].store)\n` +
        `then paste over localStorage.${"mapledoro_characters_store_v1"} and reload.\n`
      : `Snapshot could NOT be saved (localStorage quota?).\n`) +
    `Stack of the write that did this:\n${new Error().stack ?? "(unavailable)"}`,
  );
}
