"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { AppTheme } from "./themes";

/** Fired on `window` every time a ModalShell-based dialog opens -- see HoverTooltip.tsx,
 *  which listens for this to force-close a bubble stuck open by its own trigger. */
export const MODAL_OPENED_EVENT = "mapledoro:modal-opened";

/** Native <dialog>-based modal shell: opens via showModal() on mount, so focus
 *  trapping and Escape come for free; closes on backdrop click or cancel.
 *  Width, padding, and scroll behavior come from `style`; layout CSS that must
 *  wait for the open state can target the consumer `className` scoped to
 *  `[open]` (the dialog stays display:none until showModal() runs). */
export default function ModalShell({
  theme,
  ariaLabel,
  onClose,
  className,
  style,
  children,
}: {
  theme: AppTheme;
  ariaLabel: string;
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The latest onClose, so the open effect below runs once. Callers often pass an inline arrow,
  // and re-running that effect on every render would refocus the dialog, pulling focus out of
  // whatever input the user is typing in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Mounted fresh per session, so open once on mount. Backdrop click-to-close
  // is a pointer-only convenience (keyboard users dismiss via Escape/cancel),
  // so it lives here as a native listener rather than an interactive handler
  // on the non-interactive <dialog> element.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (!dlg.open) dlg.showModal();
    // showModal() makes everything behind this dialog inert, so a HoverTooltip whose trigger
    // opened this same dialog stops receiving the mouse/focus events it'd normally rely on to
    // close itself, leaving its bubble stuck floating over the modal. Broadcasting this lets
    // HoverTooltip force-close on any modal open without ModalShell needing to know it exists.
    window.dispatchEvent(new Event(MODAL_OPENED_EVENT));
    // showModal() focuses the first focusable descendant, which paints a focus
    // ring on whatever control happens to be first (a character row, a Cancel
    // button) as if the user had tabbed to it. Focus the dialog itself instead:
    // the accessible name is still announced and Tab still walks the contents.
    dlg.focus();
    const onBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg) onCloseRef.current();
    };
    dlg.addEventListener("click", onBackdropClick);
    return () => dlg.removeEventListener("click", onBackdropClick);
  }, []);

  // showModal() blocks interaction behind the dialog but not scrolling, so the
  // page still slides around under it (worst on touch, where the modal reads as
  // a sheet). Pinning the body is the one lock iOS Safari honors; it needs the
  // scroll offset carried across and restored, since a fixed body sits at 0.
  // `html { overflow-y: scroll }` keeps the desktop scrollbar gutter, so
  // nothing shifts sideways while it's held.
  useEffect(() => {
    const { body } = document;
    const scrollY = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const baseStyle: CSSProperties = {
    padding: 0,
    background: theme.panel,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
    // Scrolling past the end of a scrollable dialog shouldn't hand the gesture
    // to whatever is behind it.
    overscrollBehavior: "contain",
  };

  return (
    <dialog
      ref={dialogRef}
      // Focus target for the mount effect; -1 keeps it out of the Tab order.
      tabIndex={-1}
      className={className ? `modal-shell ${className}` : "modal-shell"}
      aria-label={ariaLabel}
      onCancel={onClose}
      style={{ ...baseStyle, ...style }}
    >
      <style>{`
        dialog.modal-shell::backdrop { background: rgba(15, 23, 42, 0.42); }
        /* The shell takes focus on open purely to keep the ring off the first
           control, so it shouldn't paint a ring of its own. */
        dialog.modal-shell:focus { outline: none; }
      `}</style>
      {children}
    </dialog>
  );
}
