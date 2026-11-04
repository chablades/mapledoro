"use client";

// An equipped item's hover tooltip once it has logged enhancements: its name, Star Force and
// flame lines. Only mounted while the tooltip is open, so an item's data loads on first hover.

import type { AppTheme } from "../../../../components/themes";
import type { EquipmentItem, SlotKey } from "../data/equipmentStepDraft";
import { useEquipInfo } from "../data/useEquipInfo";
import FlameLines, { FlameTotals } from "./FlameLines";
import { useFlameDetails } from "../data/flameDetailsPref";

/** Champion Gold, the app's colour for stars, tuned per colour mode. */
const starInk = (theme: AppTheme) => (theme.colorMode === "dark" ? "#f0c869" : "#8c5b16");

export default function ItemTooltip({ theme, slot, item }: { theme: AppTheme; slot: SlotKey; item: EquipmentItem }) {
  const info = useEquipInfo(item.flame?.length ? [{ slot, item }] : [])[slot];
  const [details] = useFlameDetails();
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, textAlign: "left" }}>
      <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{item.name}</span>
      {!!item.starForce && (
        <span style={{ fontWeight: 800, fontSize: "0.8rem", color: starInk(theme) }}>
          {item.starForce}
          <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: -1, marginLeft: 1 }}>
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
          </svg>
          <span className="sr-only"> Star Force</span>
        </span>
      )}
      {!!item.flame?.length && info && (details
        ? <FlameLines theme={theme} info={info} lines={item.flame} />
        : <FlameTotals theme={theme} info={info} lines={item.flame} />)}
    </span>
  );
}

