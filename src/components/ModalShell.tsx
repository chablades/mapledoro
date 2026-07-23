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
    const onBackdropClick = (e: MouseEvent) => {
      if (e.target === dlg) onClose();
    };
    dlg.addEventListener("click", onBackdropClick);
    return () => dlg.removeEventListener("click", onBackdropClick);
  }, [onClose]);

  // showModal() makes the page behind inert to clicks/keyboard, but doesn't stop wheel/touch
  // scroll from reaching it -- lock it explicitly for as long as this dialog is mounted
  // (mounted fresh per open session, so mount/unmount = open/close). Reuses the existing
  // scroll-lock convention (SearchPaneCard's remove-confirm dialog, globals.css's
  // `html.scroll-locked` rule) rather than setting body.style.overflow directly -- `html`
  // itself is the actual scrolling element here (explicit `overflow-y: scroll`), so a
  // body-only lock does nothing.
  useEffect(() => {
    document.documentElement.classList.add("scroll-locked");
    return () => { document.documentElement.classList.remove("scroll-locked"); };
  }, []);

  const baseStyle: CSSProperties = {
    padding: 0,
    background: theme.panel,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
  };

  return (
    <dialog
      ref={dialogRef}
      className={className ? `modal-shell ${className}` : "modal-shell"}
      aria-label={ariaLabel}
      onCancel={onClose}
      style={{ ...baseStyle, ...style }}
    >
      <style>{`dialog.modal-shell::backdrop { background: rgba(15, 23, 42, 0.42); }`}</style>
      {children}
    </dialog>
  );
}
