"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const AVATAR_LOAD_TIMEOUT_MS = 4000;
const AVATAR_MAX_RETRIES = 2;
const AVATAR_RETRY_DELAY_MS = 350;
const DEFAULT_FALLBACK_AVATAR_SRC =
  "https://maplestory.io/api/character/%7B%22itemId%22%3A2000%2C%22version%22%3A%22265%22%7D%2C%7B%22itemId%22%3A12000%2C%22version%22%3A%22265%22%7D/stand1/0?showears=false&showLefEars=false&showHighLefEars=undefined&resize=1&name=&flipX=false&bgColor=0,0,0,0";

function appendRetryParam(src: string, retryAttempt: number) {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}avatarRetry=${retryAttempt}`;
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
  const [settled, setSettled] = useState(false);
  const readyCalledRef = useRef(false);
  const fallbackSrc = useMemo(() => DEFAULT_FALLBACK_AVATAR_SRC, []);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setDisplaySrc(src);
      setRetryAttempt(0);
      setSettled(false);
      readyCalledRef.current = false;
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [src]);

  useEffect(() => {
    if (settled) return;
    const timeout = window.setTimeout(() => {
      setDisplaySrc(fallbackSrc);
      setSettled(true);
    }, AVATAR_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [fallbackSrc, settled, displaySrc]);

  useEffect(() => {
    if (!settled || readyCalledRef.current === true) return;
    readyCalledRef.current = true;
    onReady?.();
  }, [onReady, settled]);

  return (
    <Image
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      onLoad={() => {
        setSettled(true);
      }}
      onError={() => {
        if (retryAttempt < AVATAR_MAX_RETRIES) {
          const nextAttempt = retryAttempt + 1;
          window.setTimeout(() => {
            setRetryAttempt(nextAttempt);
            setDisplaySrc(appendRetryParam(src, nextAttempt));
          }, AVATAR_RETRY_DELAY_MS);
          return;
        }
        setDisplaySrc(fallbackSrc);
        setSettled(true);
      }}
      className={className}
      style={{
        color: "transparent",
        ...style,
      }}
      unoptimized={displaySrc.startsWith("data:image/")}
    />
  );
}
