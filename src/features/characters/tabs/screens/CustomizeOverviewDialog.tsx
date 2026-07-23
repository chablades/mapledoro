"use client";

import { useState, type CSSProperties } from "react";
import ModalShell from "../../../../components/ModalShell";
import { dialogBtnColors, dialogPrimaryBtnColors, type AppTheme } from "../../../../components/themes";
import { useCardReorder, type CardDragProps } from "../../../tools/useCardReorder";
import type { OverviewSectionId } from "../../model/charactersStore";

export interface OverviewAnchorDef {
  id: string;
  label: string;
  sections: OverviewSectionId[];
}

const DRAG_HANDLE_COLS = [7, 15];
const DRAG_HANDLE_ROWS = [4, 12, 20];

// Grip icon on the right of a shown row, signaling it's draggable to reorder.
function DragHandleIcon({ theme }: { theme: AppTheme }) {
  return (
    <svg width={12} height={20} viewBox="0 0 24 24" aria-hidden="true">
      {DRAG_HANDLE_COLS.flatMap((cx) => DRAG_HANDLE_ROWS.map((cy) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.4} fill={theme.muted} />))}
    </svg>
  );
}

function cardStyle(theme: AppTheme, accented: boolean, isDropTarget: boolean, isDragging: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.55rem",
    padding: "0.5rem 0.6rem",
    borderRadius: 12,
    border: `1px solid ${accented || isDropTarget ? theme.accent : theme.border}`,
    background: accented ? theme.accentSoft : theme.bg,
    opacity: isDragging ? 0.4 : 1,
  };
}

function removeButtonStyle(theme: AppTheme): CSSProperties {
  return {
    width: 20,
    height: 20,
    borderRadius: 6,
    flexShrink: 0,
    border: `1px solid ${theme.accent}`,
    background: theme.accent,
    color: theme.accentOn,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.78rem",
    fontWeight: 800,
    cursor: "pointer",
    padding: 0,
  };
}

// A currently-shown section, in the Order column: draggable to reorder, click to remove.
function OrderCard({
  theme, label, isDragging, isDropTarget, dragProps, onRemove,
}: {
  theme: AppTheme; label: string; isDragging: boolean; isDropTarget: boolean; dragProps: CardDragProps; onRemove: () => void;
}) {
  return (
    <div {...dragProps} style={{ ...cardStyle(theme, true, isDropTarget, isDragging), cursor: "grab" }}>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        style={removeButtonStyle(theme)}
      >
        ✓
      </button>
      <span style={{ flex: 1, fontWeight: 700, fontSize: "0.82rem", color: theme.text }}>{label}</span>
      <DragHandleIcon theme={theme} />
    </div>
  );
}

// An eligible-but-hidden add-on: click to add. Sits in the 2-col Choose grid, so no drag --
// its position among other unpicked add-ons has no effect on anything.
function AddonCard({ theme, label, disabled, onAdd }: { theme: AppTheme; label: string; disabled: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAdd}
      style={{ ...cardStyle(theme, false, false, false), width: "100%", textAlign: "left", fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: `1px solid ${theme.border}` }} />
      <span style={{ flex: 1, fontWeight: 700, fontSize: "0.82rem", color: theme.text }}>{label}</span>
    </button>
  );
}

// Single-select radio card for the Anchor group. Sits in the same 2-col Choose grid as
// AddonCard so the whole left column reads as one consistent picker grid.
function AnchorCard({ theme, label, active, onSelect }: { theme: AppTheme; label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      style={{ ...cardStyle(theme, active, false, false), width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}
    >
      <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `1px solid ${active ? theme.accent : theme.border}`, background: active ? theme.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accentOn }} />}
      </span>
      <span style={{ flex: 1, fontWeight: 700, fontSize: "0.8rem", color: theme.text }}>{label}</span>
    </button>
  );
}

function groupLabelStyle(theme: AppTheme): CSSProperties {
  return { fontSize: "0.72rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.4rem" };
}

function cardGridStyle(): CSSProperties {
  return { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" };
}

// Lets a player show/hide and reorder any Overview section their character is currently
// eligible for -- not just the ones their level/legacy tier defaults to (e.g. a 260+ player
// re-adding Gear or Familiars). Two tiers:
// - Anchor (pick at most one, or "None"): curated bundles, each already vetted to fill
//   Overview's available room on its own -- whether that's one big section (Gear/V Matrix
//   alone) or a pair of smaller ones (HEXA Stat + Skills, V Matrix + Arcane). Picking any
//   anchor other than "None" blocks add-ons entirely, since the bundle is already sized to fit.
// - Add-ons (pick up to `maxAddons`, only available when Anchor is "None"): freely
//   combinable, fixed-size sections for building a custom mix from scratch.
// Both feed into one draggable `order` list (a separate "Order" column on wide viewports,
// below on narrow ones) -- the anchor/add-on split only decides what CAN be added, not how
// the final saved order works. Removing a card that belongs to the active anchor breaks that
// bundle back into loose add-ons (clears anchorId) rather than leaving a half-selected anchor.
export default function CustomizeOverviewDialog({
  theme,
  eligibleSections,
  anchors,
  maxAddons,
  current,
  canReset,
  onClose,
  onSave,
  onReset,
}: {
  theme: AppTheme;
  eligibleSections: { id: OverviewSectionId; label: string; isLarge: boolean }[];
  anchors: OverviewAnchorDef[];
  maxAddons: number;
  current: OverviewSectionId[];
  // Whether this character currently has a saved custom layout to reset away from -- hides
  // the Reset button entirely when there's nothing to reset (still on the tier default).
  canReset: boolean;
  onClose: () => void;
  onSave: (next: OverviewSectionId[]) => void;
  // Clears the saved layout override back to "follow the tier default" -- distinct from
  // Save, which would instead freeze whatever's currently in `order` as a permanent choice
  // even if it happens to match today's default. Applies immediately (like Cancel/Save),
  // not staged into local state first.
  onReset: () => void;
}) {
  // Captured once on purpose: the dialog is mounted fresh per edit session, so these props
  // can't change while it's open. If `current` happens to exactly match a curated anchor,
  // pre-select it so continuity carries over from whatever tier default was already showing.
  const [order, setOrder] = useState<OverviewSectionId[]>(() => current);
  const [anchorId, setAnchorId] = useState<string | null>(() => {
    // Both arrays are single-digit in length (a handful of anchors, at most 2 sections each)
    // and this runs once on mount, not per render -- a Set would add indirection with no
    // measurable benefit at this scale.
    // react-doctor-disable-next-line js-set-map-lookups
    const match = anchors.find((a) => a.sections.length === current.length && a.sections.every((id) => current.includes(id)));
    return match?.id ?? null;
  });

  const { dragProps, isDragging, isDropTarget } = useCardReorder((from, to) => {
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  });

  const labelsById = new Map(eligibleSections.map((s) => [s.id, s.label]));
  const activeAnchorSections = anchors.find((a) => a.id === anchorId)?.sections ?? [];
  // Any picked anchor (not just a "large" one) is already a fitted bundle -- HEXA Stat +
  // Skills together take up as much room as Gear or V Matrix alone, so it blocks add-ons the
  // same way. Only "None" leaves room to freely combine add-ons.
  const anchorActive = anchorId !== null;
  const atAddonCap = order.length >= maxAddons;

  const selectAnchor = (anchor: OverviewAnchorDef | null) => {
    setAnchorId(anchor?.id ?? null);
    setOrder(anchor ? [...anchor.sections] : []);
  };
  const addSection = (id: OverviewSectionId) => {
    if (anchorActive || atAddonCap) return;
    setOrder((prev) => [...prev, id]);
  };
  const removeSection = (id: OverviewSectionId) => {
    if (activeAnchorSections.includes(id)) setAnchorId(null);
    setOrder((prev) => prev.filter((x) => x !== id));
  };

  // Large sections only ever come from the Anchor group above -- excluded here so there's
  // exactly one path to picking Gear/V Matrix, not two that could disagree. `eligibleSections`
  // and `order` are both single-digit in length (at most 9 catalog sections, at most 3
  // shown), and this only re-runs when the user opens this dialog and clicks around in it,
  // not on any hot path -- a Set would add indirection with no measurable benefit here.
  // react-doctor-disable-next-line js-set-map-lookups
  const availableAddons = eligibleSections.filter((s) => !s.isLarge && !order.includes(s.id));

  return (
    <ModalShell
      theme={theme}
      className="customize-overview-dialog"
      ariaLabel="Customize Overview layout"
      onClose={onClose}
      // Fixed height (not maxHeight/shrink-to-fit) -- picking an anchor or add-on changes how
      // much content each group renders (e.g. the Add-ons grid disappears entirely once an
      // anchor is picked), and a shrink-to-fit dialog would visibly resize on every click.
      // The scrollable body below absorbs any content taller than this instead of growing it.
      style={{ width: "min(720px, 100%)", height: "min(520px, 85vh)", overflow: "hidden" }}
    >
      <style>{`
        dialog.customize-overview-dialog[open] { display: flex; flex-direction: column; }
        .customize-overview-body { display: flex; flex-direction: column; }
        @media (min-width: 620px) {
          .customize-overview-body { flex-direction: row; }
          .customize-overview-choose { flex: 3; min-width: 0; }
          .customize-overview-order { flex: 2; min-width: 0; border-left: 1px solid ${theme.border}; padding-left: 1.1rem; margin-left: 1.1rem; }
        }
      `}</style>
      <div style={{ padding: "1rem 1.1rem 0.75rem", borderBottom: `1px solid ${theme.border}` }}>
        <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.05rem" }}>
          Customize Layout
        </span>
        <div style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600, marginTop: 4 }}>
          Pick an anchor, or up to {maxAddons} add-ons of your own, to show below Key Stats. Drag to reorder them.
        </div>
      </div>

      <div className="customize-overview-body" style={{ padding: "0.85rem 1.1rem", overflowY: "auto", flex: 1, minHeight: 0 }}>
        <div className="customize-overview-choose">
          <p style={groupLabelStyle(theme)}>Anchor</p>
          <div style={{ ...cardGridStyle(), marginBottom: "1rem" }}>
            <AnchorCard theme={theme} label="None" active={anchorId === null} onSelect={() => selectAnchor(null)} />
            {anchors.map((a) => (
              <AnchorCard key={a.id} theme={theme} label={a.label} active={anchorId === a.id} onSelect={() => selectAnchor(a)} />
            ))}
          </div>

          <p style={groupLabelStyle(theme)}>Add-ons</p>
          {anchorActive ? (
            <p style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600, margin: 0 }}>
              This anchor already fills the layout on its own. Pick &quot;None&quot; above to build a custom mix of add-ons instead.
            </p>
          ) : (
            <div style={cardGridStyle()}>
              {availableAddons.map((s) => (
                <AddonCard key={s.id} theme={theme} label={s.label} disabled={atAddonCap} onAdd={() => addSection(s.id)} />
              ))}
              {availableAddons.length === 0 && (
                <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600 }}>Nothing else is eligible for this character.</span>
              )}
            </div>
          )}
        </div>

        <div className="customize-overview-order" style={{ marginTop: "1.25rem" }}>
          <p style={groupLabelStyle(theme)}>Order</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {order.map((id, index) => (
              <OrderCard
                key={id}
                theme={theme}
                label={labelsById.get(id) ?? id}
                isDragging={isDragging(index)}
                isDropTarget={isDropTarget(index)}
                dragProps={dragProps(index)}
                onRemove={() => removeSection(id)}
              />
            ))}
            {order.length === 0 && (
              <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 600 }}>Nothing selected yet.</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.55rem", padding: "0.8rem 1.1rem", borderTop: `1px solid ${theme.border}` }}>
        {canReset ? (
          <button
            type="button"
            onClick={onReset}
            className="tool-btn"
            style={{ color: theme.muted, background: "none", border: "none", padding: "5px 4px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
          >
            Reset to Default
          </button>
        ) : <span />}
        <div style={{ display: "flex", gap: "0.55rem" }}>
          <button type="button" onClick={onClose} className="tool-btn tool-dialog-btn" style={dialogBtnColors(theme)}>
            Cancel
          </button>
          <button type="button" onClick={() => onSave(order)} className="tool-btn tool-dialog-btn" style={dialogPrimaryBtnColors(theme)}>
            Save
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
