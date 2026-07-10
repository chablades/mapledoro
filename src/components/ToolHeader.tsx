import Link from "next/link";
import type { AppTheme } from "./themes";

interface ToolHeaderProps {
  theme: AppTheme;
  title: string;
  description: string;
}

export function ToolHeader({ theme, title, description }: ToolHeaderProps) {
  return (
    <div className="tool-header">
      <Link href="/tools" className="tool-header-back" style={{ color: theme.accent }}>
        ← Back to Tools
      </Link>
      <h1 className="tool-header-title" style={{ color: theme.text }}>
        {title}
      </h1>
      <div className="tool-header-desc" style={{ color: theme.muted }}>
        {description}
      </div>
    </div>
  );
}
