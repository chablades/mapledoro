import { useEffect, useLayoutEffect, useRef } from "react";

// useLayoutEffect warns when it runs during SSR; this codebase's setup steps are all
// client-rendered, but Next.js still does an initial server pass for "use client" components.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type PickerCoords = { top: number; left: number };

// Coords are applied directly to the portal element (no React state) so a slot can be
// swapped to another slot's picker in the same update without an intermediate render at
// {top:0,left:0}. The popover stays `position: "absolute"` and document-relative (rect +
// scroll offset): iOS Safari treats `position: fixed` as relative to the <html> element
// instead of the viewport when <html> has a non-visible `overflow` (set globally for
// rubber-band scrolling), which made viewport-relative `fixed` popovers jump to the wrong
// spot once the page was scrolled.
function calcPickerCoords(el: HTMLElement | null, width: number): PickerCoords {
  if (!el) return { top: 0, left: 0 };
  const rect = el.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
  return { top: rect.bottom + window.scrollY + 4, left: left + window.scrollX };
}

function applyPickerCoords(anchor: HTMLElement | null, portal: HTMLElement | null, width: number) {
  if (!portal) return;
  const { top, left } = calcPickerCoords(anchor, width);
  portal.style.top = `${top}px`;
  portal.style.left = `${left}px`;
}

export function usePickerCoords(isOpen: boolean, width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    const recompute = () => applyPickerCoords(ref.current, portalRef.current, width);
    recompute();
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
    };
  }, [isOpen, width]);

  return { ref, portalRef };
}
