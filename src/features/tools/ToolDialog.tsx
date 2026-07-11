"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import type { AppTheme } from "../../components/themes";
import { Z } from "./zIndex";

// One backdrop dim shared by every tool dialog, so multi-step flows (name then
// tasks/bosses) don't flicker between two different opacities.
const BACKDROP = "rgba(0,0,0,0.5)";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: BACKDROP,
  zIndex: Z.modal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

function panelStyle(theme: AppTheme, maxWidth: number): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    maxWidth,
    width: "100%",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    padding: "1.5rem",
  };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
}

/**
 * Accessible modal shell shared by the manually-populated trackers. Real dialog
 * semantics: `role="dialog"` + `aria-modal`, Escape to close, backdrop click to
 * close, a focus trap, and focus restored to the opener on unmount. Consumers
 * supply the title, optional description, body, and footer actions; the body
 * region flexes and scrolls (wrap it in `.tool-dialog-scroll`).
 */
export function ToolDialog({
  theme,
  title,
  description,
  onClose,
  footer,
  children,
  maxWidth = 600,
}: {
  theme: AppTheme;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const opener = document.activeElement as HTMLElement | null;

    // Move focus into the dialog unless a child already claimed it (e.g. an
    // input that focuses itself on mount).
    if (!panel.contains(document.activeElement)) {
      (focusableWithin(panel)[0] ?? panel).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = focusableWithin(panel);
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Close dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
      style={overlayStyle}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={panelStyle(theme, maxWidth)}
      >
        <div
          id={titleId}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: description ? "0.25rem" : "1rem",
          }}
        >
          {title}
        </div>
        {description && (
          <div style={{ fontSize: "0.78rem", color: theme.muted, marginBottom: "1rem" }}>
            {description}
          </div>
        )}
        {children}
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
