"use client";

// An equipped item's hover tooltip once it has logged enhancements: its name, Star Force and
// flame lines. Only mounted while the tooltip is open, so an item's data loads on first hover.

import type { AppTheme } from "../../../../components/themes";
import type { EquipmentItem, SlotKey } from "../data/equipmentStepDraft";
import { useEquipInfo } from "../data/useEquipInfo";
import FlameLines, { FlameTotals } from "./FlameLines";
import type { StoredCharacterRecord } from "../../model/charactersStore";
import type { EquipInfo } from "../data/equipmentInfo";
import type { StoredFlameLine } from "../data/flameData";
import { flameScore } from "../data/flameScore";
import { useScouterResult } from "../../scouter/useScouterResult";
import { resolveEfficiencyStatLabels } from "../../scouter/statEfficiency";
import { useFlameDetails } from "../data/flameDetailsPref";

/** Champion Gold, the app's colour for stars, tuned per colour mode. */
const starInk = (theme: AppTheme) => (theme.colorMode === "dark" ? "#f0c869" : "#8c5b16");

/** The flame's score in this character's main stat, to 2 decimals like the community's flame
 *  calculators; nothing until their Scouter has a result
 *  (MapleScouter Setup done), and nothing for a class flame score doesn't apply to. */
function FlameScoreLine({ theme, character, info, lines }: {
  theme: AppTheme; character: StoredCharacterRecord; info: EquipInfo; lines: StoredFlameLine[];
}) {
  const status = useScouterResult(character);
  const eff = status.kind === "ready" ? status.entry.specEfficiency : undefined;
  if (!eff) return null;
  const score = flameScore(lines, info, eff, resolveEfficiencyStatLabels(character.jobName));
  if (score === null) return null;
  return (
    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>
      Flame score <b style={{ color: theme.text }}>{score.toFixed(2)}</b>
    </span>
  );
}

export default function ItemTooltip({ theme, slot, item, character }: {
  theme: AppTheme; slot: SlotKey; item: EquipmentItem;
  /** The wearer, for the flame score; absent where there's no saved character to score against. */
  character?: StoredCharacterRecord;
}) {
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
      {!!item.flame?.length && info && character && <FlameScoreLine theme={theme} character={character} info={info} lines={item.flame} />}
    </span>
  );
}

