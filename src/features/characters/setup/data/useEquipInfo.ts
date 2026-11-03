"use client";

import { useEffect, useState } from "react";
import type { EquipmentItem, SlotKey } from "./equipmentStepDraft";
import { loadEquipInfo, type EquipInfo } from "./equipmentInfo";

type Infos = Partial<Record<SlotKey, EquipInfo | null>>;

/** Each item's upgrade info by slot, filled in once its data file has loaded. */
export function useEquipInfo(items: { slot: SlotKey; item: EquipmentItem }[]): Infos {
  // Callers rebuild `items` every render, so the effect keys on its content instead.
  const key = JSON.stringify(items.map(({ slot, item }) => [slot, item.id, item.name]));
  const [loaded, setLoaded] = useState<{ key: string; infos: Infos }>({ key: "", infos: {} });
  useEffect(() => {
    let alive = true;
    const wanted = JSON.parse(key) as [SlotKey, string, string][];
    void Promise.all(wanted.map(async ([slot, id, name]) => [slot, await loadEquipInfo(slot, id, name)] as const))
      .then((pairs) => { if (alive) setLoaded({ key, infos: Object.fromEntries(pairs) }); });
    return () => { alive = false; };
  }, [key]);
  return loaded.key === key ? loaded.infos : {};
}
