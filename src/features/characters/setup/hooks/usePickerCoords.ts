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
function calcPickerCoords(el: HTMLElement, portalHeight: number, width: number, openAbove: boolean): PickerCoords {
  const rect = el.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
  const top = openAbove
    ? rect.top + window.scrollY - portalHeight - 4
    : rect.bottom + window.scrollY + 4;
  return { top, left: left + window.scrollX };
}

// Prefer opening below the anchor; flip above it when there isn't enough room left in the
// viewport and opening above would actually fit better. Without this, a popover anchored
// near the bottom of the page (e.g. the last row of a grid) forces the document to grow to
// fit it, visibly pushing content past the footer.
function decideOpenAbove(el: HTMLElement, portalHeight: number): boolean {
  const rect = el.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  return portalHeight > 0 && spaceBelow < portalHeight + 4 && rect.top > spaceBelow;
}

export function usePickerCoords(isOpen: boolean, width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  // Which side the popover opened on, decided once per open and kept sticky afterward.
  const openAboveRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;

    function applyCoords() {
      const anchor = ref.current;
      const portal = portalRef.current;
      if (!anchor || !portal) return;
      const { top, left } = calcPickerCoords(anchor, portal.offsetHeight, width, openAboveRef.current);
      portal.style.top = `${top}px`;
      portal.style.left = `${left}px`;
    }

    // Re-decides which side to open on (used at open time and on window resize, both real
    // viewport changes). Deliberately NOT re-run on every content-height change (e.g. a
    // search query narrowing the result list) — the picker's content starts at its tallest
    // (the full, unfiltered list) on open, so deciding the side then and keeping it sticky
    // is always a valid fit for anything the content later shrinks/regrows to. Re-deciding
    // on every keystroke instead made the popover visibly flip between above/below mid-type.
    function recomputeSide() {
      const anchor = ref.current;
      const portal = portalRef.current;
      if (!anchor || !portal) return;
      openAboveRef.current = decideOpenAbove(anchor, portal.offsetHeight);
      applyCoords();
    }

    recomputeSide();
    window.addEventListener("resize", recomputeSide);
    // Keeps the offset following the portal's actual rendered height (without re-deciding
    // the side) so a shrinking/growing list re-anchors instead of floating disconnected.
    const observer = portalRef.current ? new ResizeObserver(applyCoords) : null;
    if (observer && portalRef.current) observer.observe(portalRef.current);
    return () => {
      window.removeEventListener("resize", recomputeSide);
      observer?.disconnect();
    };
  }, [isOpen, width]);

  return { ref, portalRef };
}
