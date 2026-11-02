import type { CSSProperties, ReactNode } from "react";

// Arrows are drawn rather than typed: most fonts set "←" and "→" below the middle of the
// capitals, so a typed arrow sat visibly lower than the letters beside it.

const BACK = "M19 12H5M11 6l-6 6 6 6";
const FORWARD = "M5 12h14M13 6l6 6-6 6";

function Arrow({ d, style }: { d: string; style?: CSSProperties }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}>
      <path d={d} />
    </svg>
  );
}

// The label keeps the control's own line height and sits at the top of its line, so the text lands
// exactly where plain text in the same control would. With line-height: 1 and the default baseline
// alignment, the label was lifted about 2px inside its button (measured in a Chromium render).
const labelStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "0.3em", verticalAlign: "top" };

/** A back control's label: the arrow centred against the text, sized to the control's own font. */
export function BackLabel({ children }: { children: ReactNode }) {
  return <span style={labelStyle}><Arrow d={BACK} />{children}</span>;
}

/** A forward control's label, the arrow after the text. */
export function ForwardLabel({ children }: { children: ReactNode }) {
  return <span style={labelStyle}>{children}<Arrow d={FORWARD} /></span>;
}

/** A forward arrow inside running text (a link mid-sentence, "Old → New"), centred on the
 *  line's lowercase letters rather than sitting on the baseline. */
export function InlineArrow() {
  return <Arrow d={FORWARD} style={{ verticalAlign: "-0.125em", margin: "0 0.15em" }} />;
}
