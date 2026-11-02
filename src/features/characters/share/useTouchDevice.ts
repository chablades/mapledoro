import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Touch-first devices (phones, tablets), where "Scan QR code" opens the camera. On a desktop
 *  it would open the same file picker as "Choose File", so it is only offered on touch. Read
 *  through useSyncExternalStore so the server's `false` reconciles without a hydration mismatch. */
export function useTouchDevice(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}
