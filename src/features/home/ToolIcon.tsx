import { ItemIcon } from "../../components/ResourceImage";
import type { QuickLink } from "./quickTools";

export function ToolIcon({ tool, size }: { tool: QuickLink; size: number }) {
  return tool.iconType === "item" ? (
    <ItemIcon id={tool.itemId} size={size} />
  ) : (
    <span style={{ fontSize: size * 0.78, lineHeight: 1 }}>{tool.icon}</span>
  );
}
