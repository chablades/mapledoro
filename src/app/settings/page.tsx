"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";
import { ACCENT_THEMES } from "../../components/themes";
import { useTheme } from "../../components/ThemeContext";
import ConfirmModal from "../../components/ConfirmModal";

function hardReset() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith("mapledoro"));
  keys.forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}

function exportData() {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("mapledoro")) {
      data[key] = localStorage.getItem(key) ?? "";
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mapledoro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function SettingsContent({ theme }: { theme: AppTheme }) {
  const { themeKey, setThemeKey } = useTheme();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [accentDropdownOpen, setAccentDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accentDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccentDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccentDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [accentDropdownOpen]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (typeof data !== "object" || data === null) {
          setImportStatus("Invalid file format.");
          return;
        }
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith("mapledoro") && typeof value === "string") {
            localStorage.setItem(key, value);
            count++;
          }
        }
        setImportStatus(`Imported ${count} item${count === 1 ? "" : "s"}. Reloading...`);
        setTimeout(() => window.location.reload(), 800);
      } catch {
        setImportStatus("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const panelStyle = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "14px",
    padding: "1.25rem 1.5rem",
    marginTop: "1rem",
  } as const;

  const labelStyle = {
    margin: 0,
    fontWeight: 800 as const,
    fontSize: "0.95rem",
    color: theme.text,
  };

  const descStyle = {
    margin: 0,
    marginTop: "0.2rem",
    fontSize: "0.82rem",
    color: theme.muted,
    fontWeight: 700 as const,
  };

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-title" style={{ color: theme.text }}>
          Settings
        </div>
        <div className="page-subtitle" style={{ color: theme.muted }}>
          Customize your MapleDoro experience
        </div>

        {/* Accent theme selector */}
        <div
          className="fade-in panel-card settings-row-panel settings-theme-panel"
          style={{
            ...panelStyle,
          }}
        >
          <div>
            <p style={labelStyle}>Theme</p>
            <p style={descStyle}>Choose the theme used across the site.</p>
          </div>
          <div ref={dropdownRef} className="settings-dropdown-root">
            <button
              type="button"
              onClick={() => setAccentDropdownOpen((prev) => !prev)}
              className="settings-dropdown-trigger"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.bg,
                color: theme.text,
              }}
            >
              <span
                className="settings-swatch settings-swatch-current"
                style={{
                  background: theme.accent,
                }}
              />
              <span>{ACCENT_THEMES[themeKey]?.name ?? "Default"}</span>
              <svg className="settings-dropdown-icon" width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path
                  d="M1 1L5 5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {accentDropdownOpen && (
              <div
                className="settings-dropdown-menu"
                style={{
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {Object.entries(ACCENT_THEMES).map(([key, accent]) => {
                  const active = themeKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setThemeKey(key);
                        setAccentDropdownOpen(false);
                      }}
                      className="settings-dropdown-item"
                      style={{
                        background: active ? theme.accentSoft : "transparent",
                        color: active ? theme.accentText : theme.text,
                      }}
                    >
                      <span
                        className="settings-swatch settings-swatch-option"
                        style={{
                          background: accent.accent,
                        }}
                      />
                      <span style={{ fontWeight: active ? 800 : 500 }}>{accent.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Import / Export */}
        <div
          className="fade-in panel-card settings-row-panel"
          style={{
            ...panelStyle,
          }}
        >
          <div>
            <p style={labelStyle}>Data management</p>
            <p style={descStyle}>Export your data as a backup, or import a previous backup.</p>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              onClick={exportData}
              className="settings-pill-btn"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.accentSoft,
                color: theme.accentText,
              }}
            >
              Export data
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="settings-pill-btn"
              style={{
                border: `1px solid ${theme.border}`,
                background: theme.bg,
                color: theme.text,
              }}
            >
              Import data
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
            {importStatus && (
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.muted }}>
                {importStatus}
              </span>
            )}
          </div>
        </div>

        {/* Reset */}
        <div
          className="fade-in panel-card settings-row-panel"
          style={{
            ...panelStyle,
          }}
        >
          <div>
            <p style={labelStyle}>Reset all data</p>
            <p style={descStyle}>
              Clears all characters, settings, and saved state from this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="settings-pill-btn"
            style={{
              border: "1px solid #ef4444",
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            Reset all data
          </button>
        </div>

        {showResetConfirm && (
          <ConfirmModal
            theme={theme}
            title="Reset all data?"
            description="This will delete all your characters, world settings, and saved state from this browser. There is no undo."
            confirmLabel="Reset everything"
            confirmDanger
            onConfirm={hardReset}
            onCancel={() => setShowResetConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell currentPath="/settings">
      {({ theme }) => <SettingsContent theme={theme} />}
    </AppShell>
  );
}
