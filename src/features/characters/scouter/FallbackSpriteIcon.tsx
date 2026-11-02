"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";

// Dual-render with refs, keeping the fallback at display:none and swapping via onError, rather
// than useState, per the React-Doctor Rules in the root CLAUDE.md. The same pattern covers
// every boss sprite here, including row difficulty chips and spotlight tile icons. Handles both
// a load failure and a boss with no known icon id, where src is undefined and the Image simply
// never mounts.
export default function FallbackSpriteIcon({ theme, src, size, displayName }: {
  theme: AppTheme; src: string | undefined; size: number; displayName: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const fallbackStyle: CSSProperties = {
    width: size, height: size, borderRadius: 6, background: theme.accentSoft,
    display: src ? "none" : "flex", alignItems: "center", justifyContent: "center",
    fontSize: Math.max(12, size * 0.35), fontWeight: 800, color: theme.accentText, flexShrink: 0,
  };
  return (
    <>
      {src && (
        <div ref={wrapperRef} style={{ width: size, height: size, flexShrink: 0 }}>
          <Image
            src={src}
            alt=""
            width={size}
            height={size}
            unoptimized
            onError={() => {
              if (wrapperRef.current) wrapperRef.current.style.display = "none";
              if (fallbackRef.current) fallbackRef.current.style.display = "flex";
            }}
            style={{ borderRadius: 6, objectFit: "cover", display: "block" }}
          />
        </div>
      )}
      <div ref={fallbackRef} style={fallbackStyle}>{displayName.charAt(0)}</div>
    </>
  );
}
