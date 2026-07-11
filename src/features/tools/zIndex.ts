/** Shared stacking order for tool surfaces, so modals, sticky bars and
 *  dropdowns don't collide with arbitrary one-off z-index values. Ordered
 *  low to high: content < sticky < dropdown < modal. */
export const Z = {
  sticky: 10,
  dropdown: 20,
  modal: 100,
} as const;
