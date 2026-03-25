import Link from "next/link";
import type { AppTheme } from "./themes";

interface ToolHeaderProps {
  theme: AppTheme;
  title: string;
  description: string;
}

export function ToolHeader({ theme, title, description }: ToolHeaderProps) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <Link
        href="/tools"
        style={{
          fontSize: "0.78rem",
          fontWeight: 800,
          color: theme.accent,
          textDecoration: "none",
        }}
      >
        ← Back to Tools
      </Link>
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.5rem",
          color: theme.text,
          marginTop: "0.5rem",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "0.8rem",
          color: theme.muted,
          fontWeight: 600,
          marginTop: "0.15rem",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
}
