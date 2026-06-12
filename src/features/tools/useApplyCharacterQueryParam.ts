"use client";

import { useEffect, useRef } from "react";
import { readCharactersStore, selectMainCharacter } from "../characters/model/charactersStore";

interface Options {
  mounted: boolean;
  characters: { characterName: string }[];
  handleCharChange: (name: string | null) => void;
}

/** Selects the tool's initial character once after mount: the `?character=`
 *  query param if it names a known character, otherwise the world Main. */
export function useApplyCharacterQueryParam({
  mounted,
  characters,
  handleCharChange,
}: Options) {
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current || !mounted || characters.length === 0) return;
    appliedRef.current = true;
    const name = new URLSearchParams(window.location.search).get("character");
    if (name && characters.some((c) => c.characterName === name)) {
      handleCharChange(name);
      return;
    }
    const main = selectMainCharacter(readCharactersStore());
    if (main && characters.some((c) => c.characterName === main.characterName)) {
      handleCharChange(main.characterName);
    }
  }, [mounted, characters, handleCharChange]);
}
