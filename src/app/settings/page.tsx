"use client";

/*
  Settings page.
  Placeholder — will allow users to configure preferences.
*/
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

function SettingsContent({ theme }: { theme: AppTheme }) {
  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        padding: "1.5rem 1.5rem 2rem 2.75rem",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1.5rem",
            color: theme.text,
            marginBottom: "0.25rem",
          }}
        >
          Settings
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: theme.muted,
            fontWeight: 600,
            marginBottom: "1.5rem",
          }}
        >
          Customize your MapleDoro experience
        </div>

        <div
          className="fade-in"
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "18px",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚙️</div>
          <div
            style={{
              fontSize: "0.9rem",
              color: theme.muted,
              fontWeight: 600,
            }}
          >
            Settings coming soon.
          </div>
        </div>
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
