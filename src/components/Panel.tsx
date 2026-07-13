"use client";

import type { ReactNode } from "react";
import type { AppTheme } from "./themes";

/** Dashboard panel shell with a themed surface/border and an optional standard
 *  header row (icon + title + right-aligned slot). Panels
 *  with a nonstandard header (status line, filter row) omit `title` and
 *  render their own header as children. */
export default function Panel({
  theme,
  icon,
  title,
  headerRight,
  children,
}: {
  theme: AppTheme;
  icon?: string;
  title?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="fade-in panel panel-card"
      style={{ background: theme.panel, border: `1px solid ${theme.border}` }}
    >
      {title !== undefined && (
        <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: "1.1rem" }}>{icon}</span>
          <span className="panel-header-title" style={{ color: theme.text }}>{title}</span>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}
