/*
  Placeholder individual character details tab.
  Future: stats, progression, and per-character analytics.
*/
import type { AppTheme } from "../../../components/themes";
import PlaceholderTabPanel from "./PlaceholderTabPanel";

interface CharacterTabProps {
  theme: AppTheme;
}

export default function CharacterTab({ theme }: CharacterTabProps) {
  return (
    <PlaceholderTabPanel
      theme={theme}
      title="Character View"
      description="Character details tab scaffold is ready. Add dynamic character views here."
    />
  );
}
