import type { AppTheme } from "./themes";

interface WikiAttributionProps {
  theme: AppTheme;
  subject: string;
}

export function WikiAttribution({ theme, subject }: WikiAttributionProps) {
  const linkStyle = { color: theme.accent, textDecoration: "none" as const };

  return (
    <div
      style={{
        fontSize: "0.75rem",
        color: theme.muted,
        fontWeight: 600,
        lineHeight: 1.6,
        padding: "0 0.25rem",
      }}
    >
      {subject} sourced from{" "}
      <a
        href="https://maplestorywiki.net"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        MapleStory Wiki
      </a>
      , licensed under{" "}
      <a
        href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        CC BY-NC-SA 4.0
      </a>
      .
    </div>
  );
}
