import { useEffect, useRef, useState } from "react";

type PickerCoords = { top: number; left: number };

function calcPickerCoords(el: HTMLElement | null, width: number): PickerCoords {
  if (!el) return { top: 0, left: 0 };
  const rect = el.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8));
  return { top: rect.bottom + 4, left };
}

export function usePickerCoords(isOpen: boolean, width: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<PickerCoords>({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return;
    const recompute = () => setCoords(calcPickerCoords(ref.current, width));
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [isOpen, width]);

  return {
    ref,
    coords,
    compute: () => setCoords(calcPickerCoords(ref.current, width)),
  };
}
