import type { AppTheme } from "./themes";

interface WikiAttributionProps {
  theme: AppTheme;
  subject: string;
}

export function WikiAttribution({ theme, subject }: WikiAttributionProps) {
  const linkStyle = { color: theme.accent, textDecoration: "none" as const };

  return (
    <>
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
    </>
  );
}
