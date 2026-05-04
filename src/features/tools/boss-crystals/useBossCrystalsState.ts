"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  readCharactersStore,
  selectCharactersList,
} from "../../characters/model/charactersStore";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";
import {
  type BossRow,
  type CharacterEntry,
  type DialogState,
  createBosses,
  getDisabledSet,
  calcCharacterIncome,
  loadState,
  saveState,
  STORAGE_KEY,
} from "./boss-crystals-types";
import { exportBossCrystals } from "./exportBossCrystals";

export function useBossCrystalsState(mounted: boolean) {
  const [server, setServer] = useState("heroic");
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const loadedRef = useRef<true | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameMode, setNameMode] = useState<"type" | "select">("type");
  const [typedName, setTypedName] = useState("");
  const [selectedStoreChar, setSelectedStoreChar] = useState<StoredCharacterRecord | null>(null);
  const [dialogBosses, setDialogBosses] = useState<BossRow[]>(() => createBosses(""));

  // Load from localStorage
  if (loadedRef.current == null) {
    if (mounted) {
      loadedRef.current = true;
      const saved = loadState();
      if (saved) {
        setServer(saved.server);
        setCharacters(saved.characters);
      }
    }
  }

  // Persist on change
  useEffect(() => {
    if (loadedRef.current != null) saveState(server, characters);
  }, [server, characters]);

  // -- Calculations --
  const charIncomes = useMemo(
    () => characters.map((c) => calcCharacterIncome(c.bosses, server)),
    [characters, server],
  );
  let totalMeso = 0;
  let totalCrystals = 0;
  for (const income of charIncomes) {
    totalMeso += income.meso;
    totalCrystals += income.crystals;
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
    return all.filter((c) => !usedNames.has(c.characterName.toLowerCase()));
  }, [mounted, usedNames]);

  // Dialog computed
  const dialogDisabled = useMemo(() => getDisabledSet(dialogBosses), [dialogBosses]);
  const dialogPreview = useMemo(
    () => calcCharacterIncome(dialogBosses, server),
    [dialogBosses, server],
  );
  const pendingName =
    nameMode === "type" ? typedName.trim() : (selectedStoreChar?.characterName ?? "");

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
    if (!pendingName) return;
    const imageURL =
      nameMode === "select" ? (selectedStoreChar?.characterImgURL ?? null) : null;
    setDialogBosses(createBosses(""));
    setDialog({ type: "add-bosses", name: pendingName, imageURL });
  }, [pendingName, nameMode, selectedStoreChar]);

  const confirmAdd = useCallback(() => {
    if (dialog?.type !== "add-bosses") return;
    setCharacters((prev) => [
      ...prev,
      { name: dialog.name, imageURL: dialog.imageURL, bosses: dialogBosses },
    ]);
    setDialog(null);
  }, [dialog, dialogBosses]);

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
    setCharacters((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, bosses: dialogBosses } : c)),
    );
    setDialog(null);
  }, [dialog, dialogBosses]);

  const deleteCharacter = useCallback((idx: number) => {
    setCharacters((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const reorderCharacters = useCallback((from: number, to: number) => {
    if (from === to) return;
    setCharacters((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const toggleDialogBoss = useCallback((bi: number) => {
    setDialogBosses((prev) => {
      const next = prev.map((b) => ({ ...b }));
      next[bi].checked = !next[bi].checked;
      return next;
    });
  }, []);

  const setDialogParty = useCallback((bi: number, val: number) => {
    setDialogBosses((prev) => {
      const next = prev.map((b) => ({ ...b }));
      next[bi].partySize = val;
      return next;
    });
  }, []);

  const applyPreset = useCallback((key: string) => {
    setDialogBosses(createBosses(key));
  }, []);

  const clearData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setServer("heroic");
    setCharacters([]);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);
  const goBackToAddName = useCallback(() => setDialog({ type: "add-name" }), []);

  const exportXlsx = useCallback(() => {
    exportBossCrystals(characters, server);
  }, [server, characters]);

  return {
    server,
    setServer,
    characters,
    charIncomes,
    totalMeso,
    totalCrystals,
    serverMult,
    dialog,
    dialogBosses,
    dialogDisabled,
    dialogPreview,
    dialogTitle,
    showBossDialog,
    pendingName,
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
