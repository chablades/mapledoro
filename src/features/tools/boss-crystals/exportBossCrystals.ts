import { BOSSES } from "./bosses";
import { generateXlsx, downloadBlob, colLetter, type Cell, type FormulaCell } from "./xlsx-export";
import { type CharacterEntry, calcCharacterIncome } from "./boss-crystals-types";

export function exportBossCrystals(characters: CharacterEntry[], server: string): void {
  if (characters.length === 0) return;
  const mult = server === "heroic" ? 1 : 5;
  const f = (formula: string, array?: boolean): FormulaCell => ({ formula, array });
  const rows: Cell[][] = [];
  const firstDataRow = 2;
  const lastBossRow = firstDataRow + BOSSES.length - 1;

  rows.push(["Boss", "Mesos", ...characters.map((c, i) => c.name || `Character ${i + 1}`)]);

  for (let bi = 0; bi < BOSSES.length; bi++) {
    const boss = BOSSES[bi];
    const row: Cell[] = [boss.name, Math.floor(boss.meso / mult)];
    for (const col of characters) {
      const br = col.bosses[bi];
      row.push(br.checked ? br.partySize : null);
    }
    rows.push(row);
  }

  rows.push([]);
  const charTotalRowIdx = rows.length;
  {
    const ks = "{1,2,3,4,5,6,7,8,9,10,11,12,13,14}";
    const row: Cell[] = ["Character Total", null];
    for (let ci = 0; ci < characters.length; ci++) {
      const cc = colLetter(2 + ci);
      const range = `${cc}${firstDataRow}:${cc}${lastBossRow}`;
      const mesos = `B${firstDataRow}:B${lastBossRow}`;
      row.push(f(`SUM(LARGE(IF(${range}<>"",${mesos}/${range},0),${ks}))`, true));
    }
    rows.push(row);
  }

  rows.push([]);
  rows.push(["Weekly Income Summary", null]);
  rows.push([]);
  rows.push(["Bossing", null]);

  for (let ci = 0; ci < characters.length; ci++) {
    const cc = colLetter(2 + ci);
    const charName = characters[ci].name || `Character ${ci + 1}`;
    const income = calcCharacterIncome(characters[ci].bosses, server);
    rows.push([charName, f(`${cc}${charTotalRowIdx + 1}`), `Crystals: ${income.crystals}`]);
  }

  rows.push([]);
  {
    const charTotalCells = characters
      .map((_, ci) => `${colLetter(2 + ci)}${charTotalRowIdx + 1}`)
      .join("+");
    let tc = 0;
    for (const col of characters) tc += calcCharacterIncome(col.bosses, server).crystals;
    rows.push(["Total", f(charTotalCells), `Crystals: ${tc} / 180`]);
  }

  const colWidths = [34, 22, ...characters.map(() => 22)];
  const xlsx = generateXlsx([{ name: "Boss Crystals", rows, colWidths }]);
  downloadBlob(xlsx, "boss-crystals.xlsx");
}
