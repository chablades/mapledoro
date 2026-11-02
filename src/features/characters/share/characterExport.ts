// Single-character exports: the JSON file and the PNG card, which carries the same JSON inside
// it plus a QR with the compact format.

import {
  readCharactersStore,
  selectCharacterByIgn,
  selectCharactersList,
  type CharacterExportPayload,
  type CharactersStore,
} from "../model/charactersStore";
import { WORLD_NAMES } from "../model/constants";
import { whRankFromRoster } from "../setup/data/scouterQuestionsData";
import { resolveDisplayJobName } from "../setup/data/nexonJobMapping";
import { loadScouterResultFor } from "../scouter/scouterResult";
import { classPortraitUrl } from "../../../lib/classPortraits";
import { worldIconUrl } from "../../../lib/mapleResource";
import { embedJsonInPng } from "../../../lib/pngDataChunk";
import { QR_LINK_PREFIX, encodeCharacterQr } from "./qrCodec";
import { renderCharacterCard } from "./cardRender";

// Reads fresh from the store rather than trusting a rendered `character` prop, since tool writes
// elsewhere in the app do not always reach it. The world's Legion data rides along so the
// importer's Scouter can compute. A Wild Hunter rank can come from a Wild Hunter elsewhere in the
// roster, which a lone exported character would lose, so a rank never stored is resolved here.
function buildCharacterExportPayload(store: CharactersStore, charName: string): CharacterExportPayload | null {
  const character = selectCharacterByIgn(store, charName);
  if (!character) return null;
  const worldKey = String(character.worldID);
  const storedLegion = store.scouterLegionByWorld[worldKey];
  const rosterRank = whRankFromRoster(selectCharactersList(store).filter((c) => c.worldID === character.worldID));
  const wildHunterRank = storedLegion?.wildHunterRank ?? rosterRank ?? undefined;
  return {
    kind: "character",
    version: 1,
    character,
    world: {
      scouterLegion: storedLegion || wildHunterRank ? { ...storedLegion, wildHunterRank } : undefined,
      legionArtifact: store.legionArtifactByWorld[worldKey],
      linkSkillTotals: store.linkSkillTotalsByWorld[worldKey],
    },
  };
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const fileStem = (charName: string) => `mapledoro-${charName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`;

/** Downloads the character's JSON export. */
export function exportCharacterJson(charName: string | undefined) {
  if (!charName) return;
  const payload = buildCharacterExportPayload(readCharactersStore(), charName);
  if (!payload) return;
  download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${fileStem(charName)}.json`);
}

/** QR modules for the card link: the prefix in byte mode, the data in alphanumeric mode. */
async function qrModules(data: string): Promise<boolean[][]> {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "L");
  qr.addData(QR_LINK_PREFIX, "Byte");
  qr.addData(data, "Alphanumeric");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => qr.isDark(r, c)));
}

/** Renders and downloads the character's card: a PNG with the JSON export embedded and a QR of
 *  the compact format. The Scouter figure is computed live, as on the Overview. */
export async function exportCharacterCard(charName: string | undefined) {
  if (!charName) return;
  const payload = buildCharacterExportPayload(readCharactersStore(), charName);
  if (!payload) return;
  const { character } = payload;
  const result = await loadScouterResultFor(character);
  const className = resolveDisplayJobName(character.jobName);
  const worldName = WORLD_NAMES[character.worldID] ?? "";
  const { data } = encodeCharacterQr(character, payload.world);
  const png = await renderCharacterCard({
    ign: character.characterName,
    level: character.level,
    className,
    worldName,
    worldIconUrl: worldName ? worldIconUrl(worldName.toLowerCase()) : "",
    avatarUrl: character.characterImgURL,
    classArtUrl: classPortraitUrl(className),
    scouter: result?.ok ? Math.round(result.entry.boss380Hexa) : null,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    qr: { modules: await qrModules(data) },
  });
  const withData = await embedJsonInPng(png, JSON.stringify(payload));
  download(new Blob([new Uint8Array(withData)], { type: "image/png" }), `${fileStem(charName)}.png`);
}
