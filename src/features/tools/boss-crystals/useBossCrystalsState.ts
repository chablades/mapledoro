"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  readCharactersStore,
  selectCharactersList,
} from "../../characters/model/charactersStore";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";
import { moveInArray } from "../useCardReorder";
import {
  type BossRow,
  type CharacterEntry,
  type CharacterProgress,
  type DialogState,
  type ServerType,
  createBosses,
  getDisabledSet,
  calcCharacterProgress,
  currentWeekId,
  currentMonthId,
  worldServerType,
  loadState,
  saveState,
  clearState,
} from "./boss-crystals-types";
import { MONTHLY_INDICES } from "./bosses";
import { exportBossCrystals } from "./exportBossCrystals";

// Module-level so the per-boss `.map` callbacks don't deepen hook nesting.
// `monthly` selects which cadence rolled over: true wipes monthly bosses (Black
// Mage), false wipes weekly bosses, so each resets on its own schedule.
function resetClearedFlags(chars: CharacterEntry[], monthly: boolean): CharacterEntry[] {
  return chars.map((c) => ({
    ...c,
    bosses: c.bosses.map((b, bi) =>
      b.cleared && MONTHLY_INDICES.has(bi) === monthly ? { ...b, cleared: false } : b,
    ),
  }));
}

function setClearedForChar(
  chars: CharacterEntry[],
  charIdx: number,
  cleared: boolean,
): CharacterEntry[] {
  return chars.map((c, i) =>
    i === charIdx
      ? { ...c, bosses: c.bosses.map((b) => (b.checked ? { ...b, cleared } : b)) }
      : c,
  );
}

function toggleClearedAt(
  chars: CharacterEntry[],
  charIdx: number,
  bossIdx: number,
): CharacterEntry[] {
  return chars.map((c, i) =>
    i === charIdx
      ? {
          ...c,
          bosses: c.bosses.map((b, bi) =>
            bi === bossIdx ? { ...b, cleared: !b.cleared } : b,
          ),
        }
      : c,
  );
}

export function useBossCrystalsState(mounted: boolean) {
  const [server, setServer] = useState("heroic");
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const weekRef = useRef<string | null>(null);
  const monthRef = useRef<string | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameMode, setNameMode] = useState<"type" | "select">("type");
  const [typedName, setTypedName] = useState("");
  const [selectedStoreChar, setSelectedStoreChar] = useState<StoredCharacterRecord | null>(null);
  const [dialogBosses, setDialogBosses] = useState<BossRow[]>(() => createBosses(""));

  // Load from localStorage. A render-phase update (not a ref write, which would
  // survive a render React discards and leave `loaded` true with no state) so
  // the first painted frame already has the saved roster.
  if (mounted && !loaded) {
    setLoaded(true);
    const saved = loadState();
    if (saved) {
      // If every saved character shares one world, open on that world so the
      // view is never empty and interactive-only rosters default to Interactive.
      const worlds = new Set(saved.characters.map((c) => c.world));
      setServer(worlds.size === 1 ? [...worlds][0] : saved.server);
      setCharacters(saved.characters);
    }
  }

  /* Persistence goes inside the state updaters below, not an effect watching state
     (root CLAUDE.md), so the write is atomic with the change that caused it rather
     than landing a render later.

     `saveState` needs both halves of the state and they live in two `useState`s, so
     each commit takes its counterpart from the closure. That is the value as of the
     last committed render, which is the right one: a commit only ever runs from an
     event handler or the reset interval, both of which run after that render.

     Only user actions and the period resets commit. The initial load above sets
     state directly, which is the point -- the effect this replaced fired a redundant
     write of the value it had just read back. */
  const commitCharacters = useCallback(
    (updater: (prev: CharacterEntry[]) => CharacterEntry[]) => {
      setCharacters((prev) => {
        const next = updater(prev);
        saveState(server, next);
        return next;
      });
    },
    [server],
  );

  const commitServer = useCallback(
    (next: string) => {
      saveState(next, characters);
      setServer(next);
    },
    [characters],
  );

  // Period resets while the page stays open: weekly bosses on Thursday 00:00 UTC,
  // monthly bosses (Black Mage) on the 1st at 00:00 UTC.
  useEffect(() => {
    if (!mounted) return undefined;
    if (weekRef.current === null) weekRef.current = currentWeekId();
    if (monthRef.current === null) monthRef.current = currentMonthId();
    const id = setInterval(() => {
      const wk = currentWeekId();
      if (wk !== weekRef.current) {
        weekRef.current = wk;
        commitCharacters((prev) => resetClearedFlags(prev, false));
      }
      const mo = currentMonthId();
      if (mo !== monthRef.current) {
        monthRef.current = mo;
        commitCharacters((prev) => resetClearedFlags(prev, true));
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [mounted, commitCharacters]);

  // -- Calculations --
  // Only characters in the selected world are shown; totals (income and the
  // per-world 180 crystal cap) scope to them. `index` keeps the position in the
  // full `characters` array so edit/delete/reorder/toggle handlers stay correct.
  const visibleCharacters = useMemo(() => {
    const out: { char: CharacterEntry; index: number; income: CharacterProgress }[] = [];
    characters.forEach((char, index) => {
      if (char.world !== server) return;
      out.push({ char, index, income: calcCharacterProgress(char.bosses, server) });
    });
    return out;
  }, [characters, server]);
  let totalWeeklyMeso = 0;
  let totalMonthlyMeso = 0;
  let totalCrystals = 0;
  let clearedMeso = 0;
  let clearedCrystals = 0;
  for (const { income } of visibleCharacters) {
    totalWeeklyMeso += income.weeklyMeso;
    totalMonthlyMeso += income.monthlyMeso;
    // Monthly crystals count toward the 180 total but not a character's 14 cap.
    totalCrystals += income.crystals + income.monthlyCrystals;
    clearedMeso += income.clearedMeso;
    clearedCrystals += income.clearedCrystals;
  }
  const serverMult = server === "heroic" ? 1 : 5;

  // Available imported characters (not yet added)
  const usedNames = useMemo(
    () => new Set(characters.map((c) => c.name.toLowerCase())),
    [characters],
  );
  const availableStoreChars = useMemo(() => {
    if (!mounted) return [];
    const all = selectCharactersList(readCharactersStore());
    // Only offer characters from the world currently in view, so an import lands
    // in the same world it was picked under and stays visible after adding.
    return all.filter(
      (c) =>
        !usedNames.has(c.characterName.toLowerCase()) &&
        worldServerType(c.worldID) === server,
    );
  }, [mounted, usedNames, server]);

  // Dialog computed
  const dialogDisabled = useMemo(() => getDisabledSet(dialogBosses), [dialogBosses]);
  const dialogPreview = useMemo(
    () => calcCharacterProgress(dialogBosses, server),
    [dialogBosses, server],
  );
  // The world's crystal total as it will stand once the dialog is confirmed, so the
  // 180 cap can be watched while picking. Editing swaps that character's committed
  // contribution for the in-progress one; adding stacks on top of the current total.
  const dialogWorldCrystals = useMemo(() => {
    const pending = dialogPreview.crystals + dialogPreview.monthlyCrystals;
    if (dialog?.type !== "edit") return totalCrystals + pending;
    const editing = visibleCharacters.find((v) => v.index === dialog.index);
    const committed = editing ? editing.income.crystals + editing.income.monthlyCrystals : 0;
    return totalCrystals - committed + pending;
  }, [dialog, dialogPreview, totalCrystals, visibleCharacters]);
  const pendingName =
    nameMode === "type" ? typedName.trim() : (selectedStoreChar?.characterName ?? "");
  // The picker can't offer a name already added, but a typed one can still collide.
  // Two entries under one name leave the cards indistinguishable (they key on it),
  // so the dialog blocks it rather than letting a silent duplicate through.
  const pendingNameTaken = pendingName !== "" && usedNames.has(pendingName.toLowerCase());

  let dialogTitle = "";
  if (dialog?.type === "add-bosses") dialogTitle = `Select Bosses \u2014 ${dialog.name}`;
  else if (dialog?.type === "edit") dialogTitle = `Edit Bosses \u2014 ${characters[dialog.index]?.name ?? ""}`;

  const showBossDialog = dialog?.type === "add-bosses" || dialog?.type === "edit";

  // -- Dialog handlers --
  const openAdd = useCallback(() => {
    setNameMode("type");
    setTypedName("");
    setSelectedStoreChar(null);
    setDialog({ type: "add-name" });
  }, []);

  const proceedToBosses = useCallback(() => {
    if (!pendingName || pendingNameTaken) return;
    const imageURL =
      nameMode === "select" ? (selectedStoreChar?.characterImgURL ?? null) : null;
    // Imported characters take their real world; typed ones take the current view.
    const world: ServerType =
      nameMode === "select" && selectedStoreChar
        ? worldServerType(selectedStoreChar.worldID)
        : (server as ServerType);
    setDialogBosses(createBosses(""));
    setDialog({ type: "add-bosses", name: pendingName, imageURL, world });
  }, [pendingName, pendingNameTaken, nameMode, selectedStoreChar, server]);

  const confirmAdd = useCallback(() => {
    if (dialog?.type !== "add-bosses") return;
    commitCharacters((prev) => [
      ...prev,
      { name: dialog.name, imageURL: dialog.imageURL, world: dialog.world, bosses: dialogBosses },
    ]);
    setDialog(null);
  }, [dialog, dialogBosses, commitCharacters]);

  const openEdit = useCallback(
    (idx: number) => {
      setDialogBosses(characters[idx].bosses.map((b) => ({ ...b })));
      setDialog({ type: "edit", index: idx });
    },
    [characters],
  );

  const confirmEdit = useCallback(() => {
    if (dialog?.type !== "edit") return;
    const idx = dialog.index;
    commitCharacters((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, bosses: dialogBosses } : c)),
    );
    setDialog(null);
  }, [dialog, dialogBosses, commitCharacters]);

  const deleteCharacter = useCallback((idx: number) => {
    commitCharacters((prev) => prev.filter((_, i) => i !== idx));
  }, [commitCharacters]);

  const toggleBossCleared = useCallback((charIdx: number, bossIdx: number) => {
    commitCharacters((prev) => toggleClearedAt(prev, charIdx, bossIdx));
  }, [commitCharacters]);

  const setAllBossesCleared = useCallback((charIdx: number, cleared: boolean) => {
    commitCharacters((prev) => setClearedForChar(prev, charIdx, cleared));
  }, [commitCharacters]);

  const reorderCharacters = useCallback((from: number, to: number) => {
    commitCharacters((prev) => moveInArray(prev, from, to));
  }, [commitCharacters]);

  const toggleDialogBoss = useCallback((bi: number) => {
    setDialogBosses((prev) =>
      prev.map((b, i) => (i === bi ? { ...b, checked: !b.checked } : b)),
    );
  }, []);

  const setDialogParty = useCallback((bi: number, val: number) => {
    setDialogBosses((prev) =>
      prev.map((b, i) => (i === bi ? { ...b, partySize: val } : b)),
    );
  }, []);

  const applyPreset = useCallback((key: string) => {
    setDialogBosses(createBosses(key));
  }, []);

  // Raw setters, not the commits: `clearState` removes the stored blob, and
  // committing would immediately write an empty one back in its place.
  const clearData = useCallback(() => {
    clearState();
    setServer("heroic");
    setCharacters([]);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);
  const goBackToAddName = useCallback(() => setDialog({ type: "add-name" }), []);

  const exportXlsx = useCallback(() => {
    // Export the world currently in view; its meso values use that server's mult.
    exportBossCrystals(visibleCharacters.map((v) => v.char), server);
  }, [server, visibleCharacters]);

  return {
    server,
    setServer: commitServer,
    visibleCharacters,
    totalWeeklyMeso,
    totalMonthlyMeso,
    totalCrystals,
    clearedMeso,
    clearedCrystals,
    serverMult,
    dialog,
    dialogBosses,
    dialogDisabled,
    dialogPreview,
    dialogWorldCrystals,
    dialogTitle,
    showBossDialog,
    pendingName,
    pendingNameTaken,
    nameMode,
    setNameMode,
    typedName,
    setTypedName,
    selectedStoreChar,
    setSelectedStoreChar,
    availableStoreChars,
    openAdd,
    proceedToBosses,
    confirmAdd,
    openEdit,
    confirmEdit,
    deleteCharacter,
    toggleBossCleared,
    setAllBossesCleared,
    reorderCharacters,
    toggleDialogBoss,
    setDialogParty,
    applyPreset,
    clearData,
    closeDialog,
    goBackToAddName,
    exportXlsx,
  };
}
