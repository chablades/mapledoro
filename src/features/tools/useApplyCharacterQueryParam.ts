"use client";

import { useEffect, useRef } from "react";

interface Options {
  mounted: boolean;
  characters: { characterName: string }[];
  handleCharChange: (name: string | null) => void;
}

export function useApplyCharacterQueryParam({
  mounted,
  characters,
  handleCharChange,
}: Options) {
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current || !mounted || characters.length === 0) return;
    const name = new URLSearchParams(window.location.search).get("character");
    if (!name) {
      appliedRef.current = true;
      return;
    }
    const match = characters.find((c) => c.characterName === name);
    if (match) {
      appliedRef.current = true;
      handleCharChange(name);
    }
  }, [mounted, characters, handleCharChange]);
}
