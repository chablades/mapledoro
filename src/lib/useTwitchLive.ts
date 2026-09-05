"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

/** Polls /api/twitch-live for whether da_wakaiyuki is streaming, so the home
 *  page's live dot updates without a page reload. Fails closed: any error or
 *  non-OK response just leaves the dot off. */
export function useTwitchLive(): boolean {
  const [live, setLive] = useState(false);

  // react-doctor-disable-next-line no-fetch-in-effect -- polling fetch with cleanup via `cancelled`; this project hasn't adopted a data-fetching library, matches the rule's own documented FP criteria
  useEffect(() => {
    let cancelled = false;

    async function checkLive() {
      try {
        const res = await fetch("/api/twitch-live");
        if (!res.ok) return;
        const data = (await res.json()) as { live: boolean };
        if (!cancelled) setLive(data.live);
      } catch {
        // Cosmetic feature: a failed check just leaves the dot off.
      }
    }

    checkLive();
    const interval = setInterval(checkLive, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return live;
}
