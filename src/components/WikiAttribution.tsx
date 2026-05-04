import type { AppTheme } from "./themes";

export interface AttributionSource {
  label: string;
  href: string;
  license?: { label: string; href: string };
}

interface WikiAttributionProps {
  theme: AppTheme;
  subject?: string;
  sources?: AttributionSource[];
}

export const WIKI_ATTRIBUTION_SOURCE: AttributionSource = {
  label: "MapleStory Wiki",
  href: "https://maplestorywiki.net",
  license: {
    label: "CC BY-NC-SA 4.0",
    href: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
};

export function WikiAttribution({ theme, subject, sources }: WikiAttributionProps) {
  const linkStyle = { color: theme.accent, textDecoration: "none" as const };

  if (sources && sources.length > 0) {
    return (
      <div
        style={{
          fontSize: "0.68rem",
          color: theme.muted,
          fontWeight: 600,
          lineHeight: 1.6,
          padding: "0 0.25rem",
        }}
      >
        {sources.map((src, i) => (
          <span key={src.href}>
            {i > 0 && " · "}
            <a href={src.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              {src.label}
            </a>
            {src.license && (
              <>
                {" "}(
                <a
                  href={src.license.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  {src.license.label}
                </a>
                )
              </>
            )}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        fontSize: "0.68rem",
        color: theme.muted,
        fontWeight: 600,
        lineHeight: 1.6,
        padding: "0 0.25rem",
      }}
    >
      {subject} sourced from{" "}
      <a
        href={WIKI_ATTRIBUTION_SOURCE.href}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        {WIKI_ATTRIBUTION_SOURCE.label}
      </a>
      , licensed under{" "}
      <a
        href={WIKI_ATTRIBUTION_SOURCE.license!.href}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
      >
        {WIKI_ATTRIBUTION_SOURCE.license!.label}
      </a>
      .
    </div>
  );
}
