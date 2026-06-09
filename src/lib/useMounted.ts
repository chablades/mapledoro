"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => undefined;

/** SSR/client gate: `false` on the server and during hydration, `true` once
 *  mounted. Gate localStorage-backed reads behind it. */
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
