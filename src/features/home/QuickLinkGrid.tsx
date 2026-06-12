"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import type { AppTheme } from "../../components/themes";
import { useMounted } from "../../lib/useMounted";
import { writeGlobalTool } from "../tools/globalToolsStore";
import CustomizeToolsDialog from "./CustomizeToolsDialog";
import {
  ALL_QUICK_TOOLS,
  DEFAULT_TOOL_HREFS,
  HOME_TOOLS_COUNT,
  HOME_TOOLS_KEY,
  readHomeToolSelection,
  type QuickLink,
} from "./quickTools";
import { ToolIcon } from "./ToolIcon";

const iconWrapStyle: CSSProperties = {
  width: 36,
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 2,
};

/** Dashboard section: header row (title, optional customize button, "All X →"
 *  link) above a grid of link cards. Used for both Tools and Guides. */
export function QuickLinkGrid({
  theme,
  title,
  allHref,
  allLabel,
  items,
  gridClassName,
  columns,
  animationDelay,
  onCustomize,
}: {
  theme: AppTheme;
  title: string;
  allHref: string;
  allLabel: string;
  items: QuickLink[];
  gridClassName: string;
  columns: number;
  animationDelay: string;
  onCustomize?: () => void;
}) {
  const cardStyle: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "1rem 0.65rem 0.85rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
  };
  const customizeBtnStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.timerBg,
    color: theme.muted,
    cursor: "pointer",
    fontSize: "0.9rem",
    lineHeight: 1,
    padding: 0,
  };

  return (
    <div className="fade-in" style={{ marginBottom: "1.25rem", animationDelay }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="panel-header-title" style={{ color: theme.text, fontSize: "1rem" }}>
            {title}
          </span>
          {onCustomize && (
            <button
              type="button"
              className="customize-btn"
              onClick={onCustomize}
              aria-label={`Customize ${title.toLowerCase()}`}
              title={`Customize ${title.toLowerCase()}`}
              style={customizeBtnStyle}
            >
              ⚙
            </button>
          )}
        </div>
        <Link href={allHref} className="accent-link" style={{ color: theme.accent }}>
          {allLabel}
        </Link>
      </div>
      <div className={gridClassName} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "0.75rem" }}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <div className="hover-lift-card" style={cardStyle}>
              <div style={iconWrapStyle}>
                <ToolIcon tool={item} size={32} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.text, lineHeight: 1.2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600, lineHeight: 1.3 }}>
                {item.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** The customizable Tools section: persisted 5-tool selection + edit dialog. */
export function QuickToolsGrid({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [override, setOverride] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);

  const selectedHrefs = override ?? (mounted ? readHomeToolSelection() : DEFAULT_TOOL_HREFS);
  const selectedTools = selectedHrefs
    .map((href) => ALL_QUICK_TOOLS.find((t) => t.href === href))
    .filter((t): t is QuickLink => Boolean(t));

  const handleSave = (hrefs: string[]) => {
    setOverride(hrefs);
    writeGlobalTool(HOME_TOOLS_KEY, hrefs);
    setEditing(false);
  };

  return (
    <>
      <QuickLinkGrid
        theme={theme}
        title="Tools"
        allHref="/tools"
        allLabel="All tools →"
        items={selectedTools}
        gridClassName="quick-tools-grid"
        columns={HOME_TOOLS_COUNT}
        animationDelay="0.2s"
        onCustomize={() => setEditing(true)}
      />
      {editing && (
        <CustomizeToolsDialog
          theme={theme}
          current={selectedHrefs}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
