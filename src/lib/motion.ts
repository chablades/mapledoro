/** True when motion should be reduced: the device asks for it, or the Settings >
 *  Accessibility switch is on (mirrored to <html data-motion> by ThemeProvider).
 *  For scripted motion that the blanket CSS rule in globals.css cannot reach,
 *  like smooth scrolling and requestAnimationFrame count-ups. Client only. */
export function prefersReducedMotion(): boolean {
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The `behavior` for a scripted scroll: instant under reduced motion. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
