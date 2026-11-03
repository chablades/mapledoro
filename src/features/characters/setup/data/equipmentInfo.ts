// What the upgrade window needs to know about an equipped item, read from its
// public/data/equipment file: level, Flame Advantaged, base attack, upgrade slots.

import { canFlame, maxStarForce, type FlameItemInfo } from "./flameData";
import type { SlotKey } from "./equipmentStepDraft";

interface RawStats {
  reqLevel?: number;
  incPAD?: number;
  incMAD?: number;
  upgradeSlots?: number;
  bossReward?: boolean;
}
type RawEntry = [string, string] | [string, string, RawStats];

export interface EquipInfo extends FlameItemInfo {
  maxStars: number;
  flameable: boolean;
}

// Grid slot to data file, for the slots the window covers. A Zero's secondary is a weapon,
// so the secondary slot also looks in the weapon file.
const FILES: Partial<Record<SlotKey, string[]>> = {
  ring1: ["ring"], ring2: ["ring"], ring3: ["ring"], ring4: ["ring"],
  face: ["face"], eye: ["eye"], earring: ["earring"], pendant1: ["pendant"], pendant2: ["pendant"],
  belt: ["belt"], pocket: ["pocket"], hat: ["hat"], cape: ["cape"], top: ["top"], glove: ["glove"],
  bottom: ["bottom"], shoe: ["shoe"], shoulder: ["shoulder"], medal: ["medal"],
  weapon: ["weapon"], secondary: ["secondary", "weapon"], emblem: ["emblem"],
  android: ["android"], heart: ["heart"], badge: ["badge"],
};

const fileCache = new Map<string, Promise<Map<string, RawStats>>>();

function loadFile(file: string): Promise<Map<string, RawStats>> {
  let pending = fileCache.get(file);
  if (!pending) {
    pending = fetch(`/data/equipment/${file}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<RawEntry[]>) : []))
      .then((entries) => new Map(entries.map(([id, , stats]) => [id, stats ?? {}])))
      .catch(() => new Map<string, RawStats>());
    fileCache.set(file, pending);
  }
  return pending;
}

/** The item's info, or null when its slot isn't covered or the item isn't in the data. */
export async function loadEquipInfo(slot: SlotKey, id: string, name: string): Promise<EquipInfo | null> {
  for (const file of FILES[slot] ?? []) {
    const stats = (await loadFile(file)).get(id);
    if (!stats) continue;
    const level = stats.reqLevel ?? 0;
    return {
      level,
      isWeapon: slot === "weapon",
      bossReward: stats.bossReward === true,
      baseAtt: stats.incPAD ?? 0,
      baseMatt: stats.incMAD ?? 0,
      maxStars: maxStarForce(name, level, stats.upgradeSlots ?? 0),
      flameable: canFlame(slot, id),
    };
  }
  return null;
}

export function isUpgradeable(info: EquipInfo | null | undefined): boolean {
  return !!info && (info.maxStars > 0 || info.flameable);
}
