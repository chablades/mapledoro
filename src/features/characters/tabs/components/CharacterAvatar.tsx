"use client";

import { useEffect, useRef, useState } from "react";

const AVATAR_LOAD_TIMEOUT_MS = 8000;
const AVATAR_MAX_RETRIES = 2;
const AVATAR_RETRY_DELAY_MS = 350;
export const FALLBACK_SRC =
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
  ...props
}: CharacterAvatarProps) {
  return <CharacterAvatarImage key={src} src={src} {...props} />;
}

function CharacterAvatarImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  onReady,
}: CharacterAvatarProps) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const [settled, setSettled] = useState(() => isCached(src));
  const readySrcRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);

  useEffect(() => {
    if (settled) return;
    const timeout = window.setTimeout(() => {
      setDisplaySrc(FALLBACK_SRC);
      setSettled(true);
    }, AVATAR_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [settled]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!settled) return;
    if (readySrcRef.current === src) return;
    readySrcRef.current = src;
    onReady?.();
  }, [onReady, settled, src]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */ /* react-doctor-disable-next-line nextjs-no-img-element -- needs an onError-driven retry/fallback chain (timeout, retry with cache-busting param, then a fallback avatar) that next/image's declarative API can't express */
    <img
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      loading="eager"
      decoding="async"
      onLoad={() => setSettled(true)}
      onError={() => {
        if (retryAttemptRef.current < AVATAR_MAX_RETRIES) {
          const next = retryAttemptRef.current + 1;
          retryTimeoutRef.current = window.setTimeout(() => {
            retryAttemptRef.current = next;
            setDisplaySrc(appendRetryParam(src, next));
          }, AVATAR_RETRY_DELAY_MS);
          return;
        }
        setDisplaySrc(FALLBACK_SRC);
        setSettled(true);
      }}
      className={className}
      style={{ color: "transparent", width, height, ...style }}
    />
  );
}
