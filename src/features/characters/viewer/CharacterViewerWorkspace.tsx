"use client";

// View a Character (/characters/view): opens a card or export and shows it in the profile
// binder, read-only and entirely outside the directory. Nothing here enters the roster or writes
// to the saved store: the binder runs read-only (no edits, no lookups by the character's name),
// Scouter computes from the card's own world data (ScouterWorldContext), and "Add to directory"
// hands the character to Import Character rather than saving it from here.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { AppTheme } from "../../../components/themes";
import { readCharactersStore, selectCharacterByIgn, type CharacterExportWorldData, type StoredCharacterRecord } from "../model/charactersStore";
import type { NormalizedCharacterData } from "../model/types";
import { readCharacterFile, readCharacterQrData, type CharacterFileResult, type QrSource } from "../share/readCharacterFile";
import { stashPendingImport } from "../share/pendingImport";
import { ScouterWorldContext } from "../scouter/scouterWorldContext";
import type { ScouterPayloadContext } from "../scouter/scouterApi";
import { getCharacterSetupFlowStyles } from "../tabs/CharacterSetupFlow.styles";
import { fetchFreshCharacter } from "../tabs/useAutoRefresh";
import { panelCardStyle } from "../tabs/components/uiStyles";
import CharacterProfileOverviewScreen, { type ProfileScreenActions, type ProfileScreenModel } from "../tabs/screens/CharacterProfileOverviewScreen";
import ViewerChooseCard, { viewerChooseStyles } from "./ViewerChooseCard";
import ViewerProfileCard from "./ViewerProfileCard";

type ViewState =
  // Nothing chosen: shows the card link's character if the URL carries one, otherwise the
  // choose-a-card screen.
  | { status: "idle" }
  | { status: "reading" }
  | { status: "error"; message: string }
  | { status: "viewing"; record: StoredCharacterRecord; world: CharacterExportWorldData; qrSource?: QrSource };

function viewingState(result: CharacterFileResult): ViewState {
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "viewing", record: result.record, world: result.world, qrSource: result.qrSource };
}

// The card link's data lives after the #, which never reaches the server: read it on the client,
// through useSyncExternalStore so the server render (null) hydrates cleanly.
const hashListeners = new Set<() => void>();
function subscribeHash(listener: () => void) {
  hashListeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => { hashListeners.delete(listener); window.removeEventListener("hashchange", listener); };
}
function clearHash() {
  window.history.replaceState(null, "", window.location.pathname);
  for (const listener of hashListeners) listener();
}

/** What the binder and Scouter see: the card plus the freshly looked-up avatar and rankings, with
 *  the tool keys always present so no "record first, then the saved store" fallback ever reaches
 *  the player's own character of the same name. */
function standaloneRecord(record: StoredCharacterRecord, fresh: NormalizedCharacterData | null): StoredCharacterRecord {
  const merged = fresh ? { ...record, ...fresh } : record;
  return { ...merged, tools: { hexaSkills: {}, hexaStat: {}, symbols: {}, ...merged.tools } };
}

const noop = () => {};

// The binder only calls these from controls the read-only mode hides (edit pencils, Customize
// layout, "Set preset as active"), so the viewer has nothing to do for any of them.
const viewerProfileActions: ProfileScreenActions = {
  rememberActiveBookmark: noop,
  clearRestoredBookmark: noop,
  startOptionalFlow: noop,
  setOverviewLayout: noop,
  setStatsActivePreset: noop,
  setEquipmentActivePreset: noop,
  setHexaStatActivePreset: noop,
  setFamiliarsActivePreset: noop,
};

const viewerProfileSetup: ProfileScreenModel["setup"] = {
  isUiLocked: false, isDeleteTransitioning: false, lastActiveBookmarkId: null, lastActiveBookmarkSubView: null,
};

export default function CharacterViewerWorkspace({ theme }: { theme: AppTheme }) {
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => null);
  const linkData = hash && hash.length > 1 ? hash.slice(1) : null;
  const [view, setView] = useState<ViewState>({ status: "idle" });
  const [fresh, setFresh] = useState<NormalizedCharacterData | null>(null);

  useEffect(() => {
    if (!linkData) return;
    let cancelled = false;
    void readCharacterQrData(linkData, "link").then((result) => {
      // A file chosen while the link was still decoding wins.
      if (!cancelled) setView((current) => (current.status === "idle" ? viewingState(result) : current));
    });
    return () => { cancelled = true; };
  }, [linkData]);

  const viewedName = view.status === "viewing" ? view.record.characterName : null;

  // A card carries no avatar (a QR has no room for one) and its rankings are a snapshot, so look
  // the character up, the same request a search makes.
  useEffect(() => {
    if (!viewedName) return;
    const controller = new AbortController();
    void fetchFreshCharacter(viewedName, controller.signal).then((outcome) => {
      if (!controller.signal.aborted && outcome.kind === "done" && outcome.data) setFresh(outcome.data);
    });
    return () => controller.abort();
  }, [viewedName]);

  const handleFile = useCallback(async (file: File) => {
    setFresh(null);
    setView({ status: "reading" });
    setView(viewingState(await readCharacterFile(file)));
  }, []);

  const openAnother = useCallback(() => {
    setFresh(null);
    setView({ status: "idle" });
    clearHash();
  }, []);

  const viewing = view.status === "viewing" ? view : null;
  const freshForViewed = fresh && viewing && fresh.characterName.toLowerCase() === viewing.record.characterName.toLowerCase() ? fresh : null;
  const shown = useMemo(() => (viewing ? standaloneRecord(viewing.record, freshForViewed) : null), [viewing, freshForViewed]);

  const scouterContext = useMemo<ScouterPayloadContext | null>(() => {
    if (!viewing) return null;
    const legion = viewing.world.scouterLegion;
    return { scouterLegionByWorld: legion ? { [String(viewing.record.worldID)]: legion } : {}, standalone: true };
  }, [viewing]);

  function addToDirectory() {
    if (!viewing) return;
    stashPendingImport({ record: viewing.record, world: viewing.world, qrSource: viewing.qrSource });
    router.push("/characters?action=import");
  }

  const reading = view.status === "reading" || (view.status === "idle" && linkData !== null);
  const existsInDirectory = shown ? selectCharacterByIgn(readCharactersStore(), shown.characterName) !== null : false;

  return (
    <>
      <style>{getCharacterSetupFlowStyles(theme)}</style>
      <style>{viewerChooseStyles}</style>
      <main className="characters-main" style={{ flex: 1, position: "relative" }}>
        {shown && scouterContext ? (
          <div className="fade-in characters-content setup-active">
            <div className="search-pane">
              <ViewerProfileCard
                theme={theme}
                character={shown}
                existsInDirectory={existsInDirectory}
                fromQr={viewing?.qrSource !== undefined}
                onOpenAnother={openAnother}
                onAdd={addToDirectory}
              />
            </div>
            <div className="preview-pane">
              <aside className="character-search-panel setup-panel setup-panel-visible" style={{ ...panelCardStyle(theme, "0"), position: "relative" }}>
                <div className="setup-step-content initial-reveal-fade">
                  <ScouterWorldContext value={scouterContext}>
                    <CharacterProfileOverviewScreen
                      key={shown.characterName}
                      model={{ theme, profile: { confirmedCharacter: shown }, setup: viewerProfileSetup }}
                      actions={viewerProfileActions}
                    />
                  </ScouterWorldContext>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="fade-in characters-content">
            <div className="search-pane">
              <section className="character-search-panel search-card search-fade-in" style={panelCardStyle(theme, "1.5rem")}>
                {hash !== null && (
                  <ViewerChooseCard
                    theme={theme}
                    reading={reading}
                    error={view.status === "error" ? view.message : null}
                    onFile={(file) => void handleFile(file)}
                  />
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
