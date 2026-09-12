// Shared dropdown/expand indicator, matching the SVG chevron style used by Inner Ability's
// grade selector (IAGradeHeader). Replaces the various ad hoc "▾" text glyphs that used to be
// scattered across dropdown triggers at inconsistent off-ramp font sizes.
export function DropdownChevron({ open, size = 14 }: { open: boolean; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// Shared left and right nav-arrow indicator, replacing ad hoc "‹" and "›" glyphs, which sit near
// cap-height rather than spanning the full line box, so flex centering visually centers empty
// space below the glyph instead of the glyph itself.
export function NavChevron({ direction, size = 14 }: { direction: "prev" | "next"; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d={direction === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
