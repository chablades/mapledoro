"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const AVATAR_LOAD_TIMEOUT_MS = 8000;
const AVATAR_MAX_RETRIES = 2;
const AVATAR_RETRY_DELAY_MS = 350;
const FALLBACK_SRC =
  "https://haku.network/api/img/avatar/2000/stand1.png";

function appendRetryParam(src: string, attempt: number) {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}avatarRetry=${attempt}`;
}

function isCached(src: string) {
  if (typeof window === "undefined") return false;
  const img = new window.Image();
  img.src = src;
  return img.complete;
}

interface CharacterAvatarProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  onReady?: () => void;
}

export default function CharacterAvatar({
  src,
  alt,
  width,
  height,
  className,
  style,
  onReady,
}: CharacterAvatarProps) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [settled, setSettled] = useState(() => isCached(src));
  const onReadyCalledRef = useRef(false);
  const settledRef = useRef(settled);

  // Keep settledRef in sync so retry timeouts can check it without stale closure
  useEffect(() => { settledRef.current = settled; }, [settled]);

  // Fallback timeout — only runs while not settled
  useEffect(() => {
    if (settled) return;
    const timeout = window.setTimeout(() => {
      setDisplaySrc(FALLBACK_SRC);
      setSettled(true);
    }, AVATAR_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [settled]);

  // Fire onReady once after settled
  useEffect(() => {
    if (!settled || onReadyCalledRef.current) return;
    onReadyCalledRef.current = true;
    onReady?.();
  }, [onReady, settled]);

  return (
    <Image
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      loading="eager"
      onLoad={() => setSettled(true)}
      onError={() => {
        if (retryAttempt < AVATAR_MAX_RETRIES) {
          const next = retryAttempt + 1;
          window.setTimeout(() => {
            if (settledRef.current) return;
            setRetryAttempt(next);
            setDisplaySrc(appendRetryParam(src, next));
          }, AVATAR_RETRY_DELAY_MS);
          return;
        }
        setDisplaySrc(FALLBACK_SRC);
        setSettled(true);
      }}
      className={className}
      // Pin the rendered CSS size to the width/height props on BOTH axes. The fallback
      // avatar has a different natural aspect ratio than real avatars, so without an
      // explicit size next/image can lay it out with one axis derived from the ratio and
      // the other pinned to the attribute — which trips its "width or height modified, but
      // not the other" dev warning. Consumers can still override via `style`.
      style={{ color: "transparent", width, height, ...style }}
      unoptimized={displaySrc.startsWith("data:image/")}
    />
  );
}
