/*
  Shared placeholder panel for in-progress character tabs.
*/
import type { AppTheme } from "../../../components/themes";

interface PlaceholderTabPanelProps {
  theme: AppTheme;
  title: string;
  description: string;
}

export default function PlaceholderTabPanel({
  theme,
  title,
  description,
}: PlaceholderTabPanelProps) {
  return (
    <div
      style={{
        flex: 1,
        padding: "1rem 1.5rem 2rem 2.75rem",
      }}
    >
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          border: `1px solid ${theme.border}`,
          borderRadius: "16px",
          background: theme.panel,
          padding: "1.2rem",
        }}
      >
        <h2 style={{ fontSize: "1.15rem", marginBottom: "0.4rem" }}>{title}</h2>
        <p style={{ color: theme.muted, fontWeight: 600 }}>{description}</p>
      </section>
    </div>
  );
}

