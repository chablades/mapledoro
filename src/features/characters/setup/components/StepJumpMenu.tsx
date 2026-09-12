"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AppTheme } from "../../../../components/themes";
import { DropdownChevron } from "../../DropdownChevron";
import type { VisibleSetupStep } from "../flows";

const triggerStyle = (theme: AppTheme, interactive: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  border: "none",
  background: "none",
  padding: 0,
  fontFamily: "inherit",
  color: theme.muted,
  fontWeight: 800,
  fontSize: "0.8rem",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  cursor: interactive ? "pointer" : "default",
});

const menuStyle = (theme: AppTheme, openAbove: boolean): CSSProperties => ({
  position: "absolute",
  ...(openAbove ? { bottom: "calc(100% + 0.3rem)" } : { top: "calc(100% + 0.3rem)" }),
  left: 0,
  zIndex: 200,
  background: theme.bg,
  borderRadius: "10px",
  padding: "0.35rem",
  minWidth: "200px",
  maxHeight: "min(320px, 60vh)",
  overflowY: "auto",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
});

function menuItemStyle(theme: AppTheme, active: boolean, disabled: boolean): CSSProperties {
  const activeColor = active ? theme.accent : theme.text;
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.4rem",
    width: "100%",
    border: "none",
    background: !disabled && active ? `${theme.accent}18` : "none",
    color: disabled ? theme.muted : activeColor,
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    fontWeight: !disabled && active ? 800 : 600,
    fontSize: "0.82rem",
    padding: "0.4rem 0.55rem",
    borderRadius: "8px",
    textAlign: "left",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

// Wraps the mobile split-button row (label + separate expand toggle) so the pair reads
// as ONE selection box, matching the desktop hover row where label+arrow are already a
// single <button>. The two buttons inside stay functionally separate (label jumps,
// toggle expands) but share this box's background/radius instead of each having their
// own, which previously made them look like two disconnected chips.
function splitRowContainerStyle(theme: AppTheme, active: boolean, disabled: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "stretch",
    borderRadius: "8px",
    overflow: "hidden",
    background: !disabled && active ? `${theme.accent}18` : "none",
  };
}

function splitLabelStyle(theme: AppTheme, active: boolean, disabled: boolean): CSSProperties {
  const activeColor = active ? theme.accent : theme.text;
  return {
    flex: 1,
    minWidth: 0,
    border: "none",
    background: "none",
    color: disabled ? theme.muted : activeColor,
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    fontWeight: !disabled && active ? 800 : 600,
    fontSize: "0.82rem",
    padding: "0.4rem 0.55rem",
    textAlign: "left",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function splitToggleStyle(theme: AppTheme, expanded: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "2.75rem",
    border: "none",
    borderLeft: `1px solid ${theme.border}`,
    background: "none",
    color: expanded ? theme.accent : theme.muted,
    cursor: "pointer",
  };
}

function substepIndicatorStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    flexShrink: 0,
    color: active ? theme.accent : theme.muted,
  };
}

// Mobile tap-to-expand substeps otherwise share near-identical padding/font/color with
// their parent row (desktop's hover flyout gets nesting for free from being a visually
// separate side panel). An indent plus a connecting rail marks them as children of the
// row above instead of more flat list entries.
function tapSubstepListStyle(theme: AppTheme): CSSProperties {
  return {
    marginLeft: "0.9rem",
    paddingLeft: "0.6rem",
    borderLeft: `2px solid ${theme.border}`,
  };
}

function substepItemStyle(theme: AppTheme, disabled: boolean): CSSProperties {
  return {
    display: "block",
    width: "100%",
    border: "none",
    background: "none",
    color: disabled ? theme.muted : theme.text,
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: "0.8rem",
    padding: "0.4rem 0.55rem",
    borderRadius: "8px",
    textAlign: "left",
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

// Rendered as a sibling of the scrollable menu box rather than nested inside it. Per the CSS
// spec, a scrollable ancestor's overflow-y forces overflow-x to clip too, which would hide a
// right-side flyout nested inside it. Positioned absolute relative to the outer container
// rather than fixed to the viewport, because the setup flow's step-transition slide animation
// puts a `transform` on an ancestor, which redefines the containing block for
// `position: fixed` and sends it to the wrong spot.
function flyoutPanelStyle(theme: AppTheme, top: number, left: number): CSSProperties {
  return {
    position: "absolute",
    top,
    left,
    zIndex: 210,
    background: theme.bg,
    borderRadius: "10px",
    padding: "0.35rem",
    minWidth: "160px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  };
}

// Marks the top-level roving-nav stops (back-to-intro + step rows) regardless of
// which layout (hover flyout vs. tap-to-expand) rendered them, since the two layouts
// nest their row button at different DOM depths under the menu.
const TOP_LEVEL_SELECTOR = '[data-jump-row="true"]:not(:disabled)';

// Shared by both substep layouts, the hover flyout and the tap-expanded inline list. Only
// the scope to search within and the step-back-out target differ between them.
// Takes no component state, so it lives at module scope instead of being rebuilt
// every render.
function handleSubstepKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, scope: HTMLElement | null, backTarget: HTMLButtonElement | undefined) {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    backTarget?.focus();
    return;
  }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  e.preventDefault();
  const buttons = Array.from(scope?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
  const currentIndex = buttons.indexOf(e.currentTarget);
  if (currentIndex === -1) return;
  const nextIndex = e.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
  buttons[nextIndex]?.focus();
}

function backToIntroItemStyle(theme: AppTheme): CSSProperties {
  return {
    display: "block",
    width: "100%",
    border: "none",
    borderBottom: `1px solid ${theme.border}`,
    borderRadius: 0,
    background: "none",
    color: theme.muted,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    padding: "0.4rem 0.55rem",
    marginBottom: "0.3rem",
    textAlign: "left",
    cursor: "pointer",
  };
}

interface JumpSubstep {
  label: string;
  /** True while this substep can't be jumped to, because its parent step is fully disabled
   *  or it sits at or after the substep that is currently invalid. */
  disabled: boolean;
}

interface JumpStep extends VisibleSetupStep {
  /** Substeps for steps that split one in-game window across multiple screens, such as Stats'
   *  Quick Questions, Stats, Hyper Stats and Inner Ability. Null when this step has no
   *  substeps to jump into directly. */
  substeps: JumpSubstep[] | null;
  /** True while this step can't be jumped to, because the earliest invalid step in this flow's
   *  order comes before it. Same forward-only gate as the Next button. */
  disabled: boolean;
}

// Touch-device row: split label/expand-toggle button, plus its own tap-expanded
// substeps list. Extracted from the main component's steps.map() to keep that
// function under the cognitive-complexity cap. All state, refs and handlers stay owned by
// the parent, since rows never mount or unmount independently of it, and are passed down,
// so behavior is unchanged.
function TapStepRow({
  theme, step, isActive, isTapExpanded, rowButtonRefs, tapSubstepsRef,
  onRowClick, onToggleExpand, onRowKeyDown, onSubstepClick, onSubstepKeyDown,
}: {
  theme: AppTheme;
  step: JumpStep;
  isActive: boolean;
  isTapExpanded: boolean;
  rowButtonRefs: React.MutableRefObject<Map<number, HTMLButtonElement>>;
  tapSubstepsRef: React.RefObject<HTMLDivElement | null>;
  onRowClick: () => void;
  onToggleExpand: () => void;
  onRowKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
  onSubstepClick: (substepIndex: number) => void;
  onSubstepKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div>
      <div style={splitRowContainerStyle(theme, isActive, step.disabled)}>
        <button
          ref={(el) => {
            if (el) rowButtonRefs.current.set(step.index, el);
            else rowButtonRefs.current.delete(step.index);
          }}
          type="button"
          disabled={step.disabled}
          onClick={onRowClick}
          style={splitLabelStyle(theme, isActive, step.disabled)}
          onKeyDown={onRowKeyDown}
          data-jump-row="true"
        >
          {step.visibleNumber}. {step.label}
        </button>
        {step.substeps && (
          <button
            type="button"
            aria-label={isTapExpanded ? `Collapse ${step.label} substeps` : `Expand ${step.label} substeps`}
            onClick={onToggleExpand}
            style={splitToggleStyle(theme, isTapExpanded)}
          >
            <DropdownChevron open={isTapExpanded} size={20} />
          </button>
        )}
      </div>
      {isTapExpanded && (
        <div ref={tapSubstepsRef} style={tapSubstepListStyle(theme)}>
          {step.substeps?.map((substep, substepIndex) => (
            <button
              key={substep.label}
              type="button"
              disabled={substep.disabled}
              onClick={() => onSubstepClick(substepIndex)}
              style={substepItemStyle(theme, substep.disabled)}
              onKeyDown={onSubstepKeyDown}
            >
              {substep.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hover-capable row: plain menu-item button that opens a sibling flyout on
// hover/focus. Same extraction rationale as TapStepRow above.
function HoverStepRow({
  theme, step, isActive, isFlyoutActive, rowButtonRefs,
  onRowClick, onRowEnter, onRowLeave, onRowFocus, onRowBlur, onRowKeyDown,
}: {
  theme: AppTheme;
  step: JumpStep;
  isActive: boolean;
  isFlyoutActive: boolean;
  rowButtonRefs: React.MutableRefObject<Map<number, HTMLButtonElement>>;
  onRowClick: () => void;
  onRowEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRowLeave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onRowFocus: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onRowBlur: () => void;
  onRowKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      ref={(el) => {
        if (el) rowButtonRefs.current.set(step.index, el);
        else rowButtonRefs.current.delete(step.index);
      }}
      type="button"
      disabled={step.disabled}
      onClick={onRowClick}
      style={menuItemStyle(theme, isActive, step.disabled)}
      onMouseEnter={onRowEnter}
      onMouseLeave={onRowLeave}
      onFocus={onRowFocus}
      onBlur={onRowBlur}
      onKeyDown={onRowKeyDown}
      data-jump-row="true"
    >
      <span>{step.visibleNumber}. {step.label}</span>
      {step.substeps && (
        <span aria-hidden style={substepIndicatorStyle(theme, isFlyoutActive)}>▸</span>
      )}
    </button>
  );
}

// The hover flyout panel itself (siblings of the scrollable menu, see flyoutPanelStyle's
// comment for why). Same extraction rationale as the two row components above.
function SubstepFlyout({
  theme, flyoutRef, top, left, substeps, activeStepIndex, rowButtonRefs, onCancelClose, onScheduleClose, onSelect,
}: {
  theme: AppTheme;
  flyoutRef: React.RefObject<HTMLDivElement | null>;
  top: number;
  left: number;
  substeps: JumpSubstep[];
  activeStepIndex: number;
  rowButtonRefs: React.MutableRefObject<Map<number, HTMLButtonElement>>;
  onCancelClose: () => void;
  onScheduleClose: () => void;
  onSelect: (substepIndex: number) => void;
}) {
  return (
    <div
      ref={flyoutRef}
      style={flyoutPanelStyle(theme, top, left)}
      onMouseEnter={onCancelClose}
      onMouseLeave={onScheduleClose}
      onFocus={onCancelClose}
      onBlur={onScheduleClose}
    >
      {substeps.map((substep, substepIndex) => (
        <button
          key={substep.label}
          type="button"
          disabled={substep.disabled}
          onClick={() => onSelect(substepIndex)}
          style={substepItemStyle(theme, substep.disabled)}
          onMouseEnter={(e) => { if (!substep.disabled) e.currentTarget.style.background = `${theme.accent}18`; }}
          onMouseLeave={(e) => { if (!substep.disabled) e.currentTarget.style.background = "none"; }}
          onKeyDown={(e) => handleSubstepKeyDown(e, flyoutRef.current, rowButtonRefs.current.get(activeStepIndex))}
        >
          {substep.label}
        </button>
      ))}
    </div>
  );
}

interface StepJumpMenuProps {
  theme: AppTheme;
  steps: JumpStep[];
  currentVisibleNumber: number;
  totalSteps: number;
  onJumpStep: (stepIndex: number) => void;
  onJumpSubstep: (stepIndex: number, substepIndex: number) => void;
  /** Omit when jumping back to step 0 wouldn't land on the setup-selection screen, such as
   *  when this character already has required setup completed and step 0 shows its profile
   *  instead. Showing this entry there would be a misleading label. */
  onBackToIntro?: () => void;
  /** The other side of that omission: shown instead of onBackToIntro when this step
   *  was reached by editing an already-set-up character (a profile bookmark), where
   *  step 0 lands back on that character's profile rather than a setup-selection
   *  screen. Mutually exclusive with onBackToIntro in practice, since both are gated
   *  on the same completed-required-flow check from opposite sides. */
  onExitToProfile?: () => void;
}

export default function StepJumpMenu({
  theme,
  steps,
  currentVisibleNumber,
  totalSteps,
  onJumpStep,
  onJumpSubstep,
  onBackToIntro,
  onExitToProfile,
}: StepJumpMenuProps) {
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  // Touch devices have no hover at all, so the hover-reveal flyout is unreachable
  // there, so it falls back to tap-to-toggle. Checked once at mount, since hover support
  // doesn't change mid-session for any real device this app needs to support. Safe as a
  // lazy useState initializer (not useSyncExternalStore) since every usage below is
  // nested behind `open &&`, which is false on both server and first client render.
  // react-doctor-disable-next-line no-match-media-in-state-initializer
  const [supportsHover] = useState(() => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches);
  const [activeFlyoutStep, setActiveFlyoutStep] = useState<number | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const [tapExpandedStep, setTapExpandedStep] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const tapSubstepsRef = useRef<HTMLDivElement>(null);
  // react-doctor false positive: empty new Map() is a trivial allocation, not worth lazy-init ceremony.
  // react-doctor-disable-next-line react-doctor/rerender-lazy-ref-init
  const rowButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  // Set by the trigger's ArrowDown and ArrowUp handler while the menu is still closed. The
  // menu and its rows don't exist in the DOM yet to focus this same tick, so the post-open
  // effect below reads this once the rows have rendered.
  const pendingFocusRef = useRef<"first" | "last" | null>(null);
  // Same idea for the tap-to-expand layout's substeps: set by ArrowRight on a row
  // that isn't expanded yet, read once the substeps effect below sees them mount.
  const pendingSubstepFocusRef = useRef(false);
  // The row and flyout aren't touching (there's a small gap plus real cursor travel
  // time to cross it), so closing on the row's mouseleave the instant it fires would
  // unmount the flyout before the mouse ever reaches it. Close on a short delay
  // instead, canceled if the row or the flyout itself is re-entered in time.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canJump = steps.length > 1 || Boolean(onBackToIntro) || Boolean(onExitToProfile);

  function cancelFlyoutClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleFlyoutClose() {
    cancelFlyoutClose();
    closeTimerRef.current = setTimeout(() => setActiveFlyoutStep(null), 250);
  }

  function handleRowEnter(step: JumpStep, e: { currentTarget: HTMLButtonElement }) {
    if (!step.substeps || !containerRef.current) return;
    cancelFlyoutClose();
    const rowRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setFlyoutPos({ top: rowRect.top - containerRect.top, left: rowRect.right - containerRect.left + 4 });
    setActiveFlyoutStep(step.index);
  }

  function focusTopLevelSibling(current: HTMLButtonElement, direction: 1 | -1) {
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(TOP_LEVEL_SELECTOR) ?? []);
    const nextIndex = buttons.indexOf(current) + direction;
    if (nextIndex < 0) {
      triggerRef.current?.focus();
      return;
    }
    buttons[nextIndex]?.focus();
  }

  function handleRowKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, step: JumpStep) {
    if (e.key === "ArrowRight" && step.substeps) {
      e.preventDefault();
      flyoutRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    focusTopLevelSibling(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
  }

  // Tap-to-expand layout: substeps aren't rendered until `tapExpandedStep` opens
  // them, so ArrowRight has to trigger that expansion first and defer the focus
  // (via pendingSubstepFocusRef) to the effect below, once they've actually mounted.
  function handleTapRowKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, step: JumpStep) {
    if (e.key === "ArrowRight" && step.substeps) {
      e.preventDefault();
      if (tapExpandedStep === step.index) {
        tapSubstepsRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
      } else {
        pendingSubstepFocusRef.current = true;
        setTapExpandedStep(step.index);
      }
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    focusTopLevelSibling(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
  }

  function handleBackToIntroKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    focusTopLevelSibling(e.currentTarget, e.key === "ArrowDown" ? 1 : -1);
  }

  function handleTriggerKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!canJump || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    if (!open) {
      pendingFocusRef.current = e.key === "ArrowDown" ? "first" : "last";
      setOpen(true);
      return;
    }
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(TOP_LEVEL_SELECTOR) ?? []);
    const target = e.key === "ArrowDown" ? buttons[0] : buttons[buttons.length - 1];
    target?.focus();
  }

  useEffect(() => {
    if (!open || pendingFocusRef.current === null) return;
    const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(TOP_LEVEL_SELECTOR) ?? []);
    const target = pendingFocusRef.current === "first" ? buttons[0] : buttons[buttons.length - 1];
    pendingFocusRef.current = null;
    target?.focus();
  }, [open]);

  useEffect(() => {
    if (tapExpandedStep === null || !pendingSubstepFocusRef.current) return;
    pendingSubstepFocusRef.current = false;
    tapSubstepsRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [tapExpandedStep]);

  // A plain value derived during render rather than read inside the flyout's ref-bearing JSX
  // via a called function. That keeps `ref={flyoutRef}` in an ordinary conditional render
  // instead of nested inside an IIFE, which the refs lint rule can't verify is safe.
  const activeFlyoutSubsteps = (activeFlyoutStep !== null ? steps.find((s) => s.index === activeFlyoutStep)?.substeps : null) ?? [];

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const menu = menuRef.current;
    if (container && menu) {
      const rect = container.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Flip above the trigger when there isn't enough room below. Otherwise a menu opened
      // near the bottom of the page forces it to grow past the footer.
      setOpenAbove(spaceBelow < menu.offsetHeight + 8 && rect.top > spaceBelow);
    }
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      // The menu is closing, for whatever reason, so drop stale flyout state and keep
      // reopening from briefly showing a flyout from wherever the mouse last was.
      cancelFlyoutClose();
      setActiveFlyoutStep(null);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", marginBottom: "0.35rem" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => canJump && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        style={triggerStyle(theme, canJump)}
      >
        Step {currentVisibleNumber} of {totalSteps}
        {canJump && <DropdownChevron open={open} />}
      </button>
      {open && canJump && (
        <div ref={menuRef} style={menuStyle(theme, openAbove)}>
          {onBackToIntro && (
            <button
              type="button"
              onClick={() => {
                onBackToIntro();
                setOpen(false);
              }}
              style={backToIntroItemStyle(theme)}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}18`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              onKeyDown={handleBackToIntroKeyDown}
              data-jump-row="true"
            >
              ← Setup selection
            </button>
          )}
          {onExitToProfile && (
            <button
              type="button"
              onClick={() => {
                onExitToProfile();
                setOpen(false);
              }}
              style={backToIntroItemStyle(theme)}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}18`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              onKeyDown={handleBackToIntroKeyDown}
              data-jump-row="true"
            >
              ← Exit setup
            </button>
          )}
          {steps.map((step) => {
            const isActive = step.visibleNumber === currentVisibleNumber;

            if (!supportsHover) {
              const isTapExpanded = tapExpandedStep === step.index;
              return (
                <TapStepRow
                  key={step.index}
                  theme={theme} step={step} isActive={isActive} isTapExpanded={isTapExpanded}
                  rowButtonRefs={rowButtonRefs} tapSubstepsRef={tapSubstepsRef}
                  onRowClick={() => { onJumpStep(step.index); setOpen(false); }}
                  onToggleExpand={() => setTapExpandedStep((prev) => (prev === step.index ? null : step.index))}
                  onRowKeyDown={(e) => handleTapRowKeyDown(e, step)}
                  onSubstepClick={(substepIndex) => { onJumpSubstep(step.index, substepIndex); setOpen(false); }}
                  onSubstepKeyDown={(e) => handleSubstepKeyDown(e, tapSubstepsRef.current, rowButtonRefs.current.get(step.index))}
                />
              );
            }

            const isFlyoutActive = activeFlyoutStep === step.index;
            return (
              <HoverStepRow
                key={step.index}
                theme={theme} step={step} isActive={isActive} isFlyoutActive={isFlyoutActive}
                rowButtonRefs={rowButtonRefs}
                onRowClick={() => { onJumpStep(step.index); setOpen(false); }}
                onRowEnter={(e) => {
                  if (!step.disabled && !isActive) e.currentTarget.style.background = `${theme.accent}18`;
                  handleRowEnter(step, e);
                }}
                onRowLeave={(e) => {
                  if (!step.disabled && !isActive) e.currentTarget.style.background = "none";
                  if (step.substeps) scheduleFlyoutClose();
                }}
                onRowFocus={(e) => handleRowEnter(step, e)}
                onRowBlur={() => { if (step.substeps) scheduleFlyoutClose(); }}
                onRowKeyDown={(e) => handleRowKeyDown(e, step)}
              />
            );
          })}
        </div>
      )}
      {open && supportsHover && activeFlyoutStep !== null && flyoutPos && activeFlyoutSubsteps.length > 0 && (
        <SubstepFlyout
          theme={theme} flyoutRef={flyoutRef} top={flyoutPos.top} left={flyoutPos.left}
          substeps={activeFlyoutSubsteps} activeStepIndex={activeFlyoutStep} rowButtonRefs={rowButtonRefs}
          onCancelClose={cancelFlyoutClose} onScheduleClose={scheduleFlyoutClose}
          onSelect={(substepIndex) => { onJumpSubstep(activeFlyoutStep, substepIndex); setOpen(false); }}
        />
      )}
    </div>
  );
}
