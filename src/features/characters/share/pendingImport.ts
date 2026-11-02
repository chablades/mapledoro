// Hands a character from the viewer to Import Character: the viewer stashes what it was showing
// and opens /characters?action=import, where the import screen picks it up as if the file had
// been chosen there, conflict handling and all. sessionStorage, so it never outlives the tab.

import { parseImportedCharacterFile, type CharacterExportWorldData, type StoredCharacterRecord } from "../model/charactersStore";
import type { QrSource } from "./readCharacterFile";

const KEY = "mapledoro_pending_import";
const QR_SOURCES: readonly QrSource[] = ["image", "strippedPng", "link"];

export interface PendingImport {
  record: StoredCharacterRecord;
  world: CharacterExportWorldData;
  qrSource?: QrSource;
}

export function stashPendingImport(pending: PendingImport) {
  try {
    // The same wrapper a JSON export uses, so reading it back goes through the same validation.
    sessionStorage.setItem(KEY, JSON.stringify({ kind: "character", character: pending.record, world: pending.world, qrSource: pending.qrSource }));
  } catch {
    // Storage blocked: Import Character just opens empty, and the card can be chosen there.
  }
}

/** The stashed character, if any. Doesn't remove it (see clearPendingImport). */
export function peekPendingImport(): PendingImport | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const json: unknown = JSON.parse(raw);
    const parsed = parseImportedCharacterFile(json);
    if (!parsed) return null;
    const stashed = (json as { qrSource?: unknown }).qrSource;
    const qrSource = QR_SOURCES.find((s) => s === stashed);
    return { record: parsed.record, world: parsed.world, qrSource };
  } catch {
    return null;
  }
}

export function clearPendingImport() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
