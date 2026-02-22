/*
  Placeholder inventory tab.
  Future: render equipped/items/inventory views for selected character.
*/
import type { AppTheme } from "../../../components/themes";
import PlaceholderTabPanel from "./PlaceholderTabPanel";

interface InventoryTabProps {
  theme: AppTheme;
}

export default function InventoryTab({ theme }: InventoryTabProps) {
  return (
    <PlaceholderTabPanel
      theme={theme}
      title="Inventory"
      description="Inventory tab scaffold is ready. Connect character + item data here."
    />
  );
}
