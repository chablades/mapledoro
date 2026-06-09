"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import Panel from "../../components/Panel";
import type { AppTheme } from "../../components/themes";
import { getPatchNotesSnapshot, initialPatchNotes, subscribePatchNotes } from "./patchNotesStore";

const PATCH_DISPLAY_LIMIT = 3;
const PATCH_FILTERS = ["All", "MAINTENANCE", "SALE", "UPDATE", "EVENTS", "COMMUNITY"] as const;
type PatchFilter = (typeof PATCH_FILTERS)[number];

const filterBtnBase: CSSProperties = {
  border: "none",
  borderRadius: "8px",
  padding: "3px 8px",
  fontSize: "0.75rem",
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
  transition: "background 0.15s, color 0.15s",
};

export default function PatchNotesPanel({ theme }: { theme: AppTheme }) {
  const patchNotes = useSyncExternalStore(subscribePatchNotes, getPatchNotesSnapshot, () => initialPatchNotes);
  const [patchFilter, setPatchFilter] = useState<PatchFilter>("All");
  const [patchExpanded, setPatchExpanded] = useState(false);

  const allFilteredPatchNotes =
    patchFilter === "All"
      ? patchNotes
      : patchNotes.filter((p) => p.tags.includes(patchFilter));
  const filteredPatchNotes = patchExpanded
    ? allFilteredPatchNotes
    : allFilteredPatchNotes.slice(0, PATCH_DISPLAY_LIMIT);
  const hasMoreNotes = allFilteredPatchNotes.length > PATCH_DISPLAY_LIMIT;

  const versionBadgeStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: theme.accentText,
    background: theme.accentSoft,
    padding: "2px 7px",
    borderRadius: "6px",
  };
  const tagBadgeStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: theme.badgeText,
    background: theme.badge,
    padding: "2px 7px",
    borderRadius: "6px",
  };
  const patchRowStyle: CSSProperties = {
    padding: "0.85rem 1.25rem",
    cursor: "pointer",
    borderBottom: `1px solid ${theme.border}`,
    transition: "background 0.15s",
  };
  const showMoreBtnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    width: "100%",
    padding: "0.6rem 1.25rem",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 700,
    fontFamily: "inherit",
    color: theme.accent,
    transition: "background 0.15s",
  };
  return (
    <Panel theme={theme} delay="0.3s">
      <div
        style={{
          padding: "0.9rem 1.25rem 0.5rem",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
          <span>&#128203;</span>
          <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.1rem" }}>
            Patch Notes
          </span>
          <a
            href="https://maplestory.nexon.net/news/patch-notes"
            target="_blank"
            rel="noopener noreferrer"
            className="accent-link"
            style={{ color: theme.accent }}
          >
            All →
          </a>
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", paddingBottom: "0.4rem" }}>
          {PATCH_FILTERS.map((filter) => {
            const active = patchFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => { setPatchFilter(filter); setPatchExpanded(false); }}
                style={{
                  ...filterBtnBase,
                  background: active ? theme.accent : theme.bg,
                  color: active ? "#fff" : theme.muted,
                }}
              >
                {filter === "All" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>
      {filteredPatchNotes.length === 0 ? (
        <div className="empty-state" style={{ padding: "1.5rem 1.25rem", color: theme.muted, fontWeight: 600 }}>
          No notes for this filter.
        </div>
      ) : (
        <>
          {filteredPatchNotes.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div className="row-hover" style={patchRowStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                  <span style={versionBadgeStyle}>{p.version}</span>
                  {p.tags.map((tag) => (
                    <span key={tag} style={tagBadgeStyle}>{tag}</span>
                  ))}
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: theme.muted }}>
                    {p.date}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: theme.accent, marginLeft: "4px" }}>
                    ↗
                  </span>
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: theme.text }}>
                  {p.title}
                </div>
              </div>
            </a>
          ))}
          {hasMoreNotes && (
            <button
              type="button"
              className="patch-show-more"
              onClick={() => setPatchExpanded((prev) => !prev)}
              style={showMoreBtnStyle}
            >
              {patchExpanded
                ? "Show less ▲"
                : `Show ${allFilteredPatchNotes.length - PATCH_DISPLAY_LIMIT} more ▼`}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}
