import type { AppTheme } from "../../../../components/themes";
import { ExportTabIcon } from "../screens/CharacterProfileOverviewScreen";

/** "Export" as named in running text, with the profile's Export icon and the punctuation that
 *  follows it, kept together on one line. An inline box rather than a flex row of the whole
 *  sentence, which on a narrow screen dropped this onto a line of its own. Sits at the top of its
 *  line so the word lands where plain text would (the same alignment as ArrowLabels). */
export default function ExportMention({ theme, label, punctuation = "" }: { theme: AppTheme; label: string; punctuation?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "top", whiteSpace: "nowrap" }}>
      <ExportTabIcon strokeWidth={2.5} />
      <span style={{ marginLeft: "0.2rem", fontWeight: 800, color: theme.text }}>{label}</span>
      {punctuation}
    </span>
  );
}
