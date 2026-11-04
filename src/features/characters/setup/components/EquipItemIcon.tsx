"use client";

import { useRef } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import { resourceImageUrl } from "../../../../lib/mapleResource";

// A missing/failed icon falls back to the item's name-initial (mirrors VMatrixNodeIcon's
// treatment) instead of a stray broken-image glyph. `revealed` mirrors ItemIcon's own prop
// (androids' actual-appearance variant vs. their pre-equip egg icon).
export default function EquipItemIcon({ id, name, theme, size, revealed }: {
  id: string;
  name: string;
  theme: AppTheme;
  size: number;
  revealed?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const src = resourceImageUrl("item", id, `iconRaw${revealed ? "D" : ""}.png`);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image src={src} alt={name} width={size} height={size} unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "flex";
          }}
          style={{ objectFit: "contain", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{
        display: "none", alignItems: "center", justifyContent: "center", width: size, height: size,
        borderRadius: "6px", flexShrink: 0, fontWeight: 800, fontSize: Math.max(12, size * 0.35),
        background: "rgba(127,127,127,0.18)", color: theme.muted,
      }}>
        {name.match(/[a-zA-Z0-9]/)?.[0] ?? "?"}
      </div>
    </>
  );
}
