import Link from "next/link";
import type { AppTheme } from "../../../../components/themes";
import { CHARACTERS_COPY } from "../content";
import { BackLabel } from "./ArrowLabels";
import { secondaryButtonStyle } from "./uiStyles";

/** The pill back to the Characters hub (/characters), in the same style as the other back pills
 *  in Characters (Import and Search's "Characters", a profile's "View Your Characters"). */
export default function BackToHubLink({ theme }: { theme: AppTheme }) {
  return (
    <Link
      href="/characters"
      className="tap-target-44"
      style={{
        ...secondaryButtonStyle(theme, "0.38rem 0.62rem"),
        // Its own box, so the label centres inside the pill's border wherever the pill sits. As a
        // plain inline link in a line with larger text, the label lined up with that taller line
        // instead and touched the pill's top edge.
        display: "inline-flex",
        alignItems: "center",
        fontSize: "0.76rem",
        fontWeight: 800,
        borderRadius: "999px",
        textDecoration: "none",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <BackLabel>{CHARACTERS_COPY.characterHub.backToHubButton}</BackLabel>
    </Link>
  );
}
