import { useReducer, useCallback } from "react";
import { EVENT_ITEMS_BY_ID, maxStarForLevel } from "./event-items";
import type { PlannerEntry } from "./useEventPlannerState";

export interface FormState {
  char: string;
  charCustom: string;
  item: string | null;
  currentStar: number;
  targetStar: number;
  replaceCost: number;
  safeguard: boolean;
}

export type FormAction =
  | { type: "setChar"; value: string }
  | { type: "setCharCustom"; value: string }
  | { type: "setItem"; value: string | null }
  | { type: "setCurrentStar"; value: number }
  | { type: "setTargetStar"; value: number }
  | { type: "setReplaceCost"; value: number }
  | { type: "setSafeguard"; value: boolean }
  | { type: "clearItem" };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "setChar": return { ...state, char: action.value };
    case "setCharCustom": return { ...state, charCustom: action.value };
    case "setItem": return { ...state, item: action.value };
    case "setCurrentStar": return { ...state, currentStar: action.value };
    case "setTargetStar": return { ...state, targetStar: action.value };
    case "setReplaceCost": return { ...state, replaceCost: action.value };
    case "setSafeguard": return { ...state, safeguard: action.value };
    case "clearItem": return { ...state, item: null };
  }
}

const INITIAL_FORM: FormState = {
  char: "",
  charCustom: "",
  item: null,
  currentStar: 17,
  targetStar: 22,
  replaceCost: 0,
  safeguard: false,
};

export function useEventPlannerForm(addEntry: (entry: Omit<PlannerEntry, "id">) => void) {
  const [form, dispatchForm] = useReducer(formReducer, INITIAL_FORM);

  const selectedItem = form.item ? EVENT_ITEMS_BY_ID.get(form.item) ?? null : null;
  const itemMaxStar = selectedItem ? maxStarForLevel(selectedItem.level) : 25;
  const canAdd = selectedItem !== null && form.currentStar < form.targetStar && form.targetStar <= itemMaxStar;

  const handleAdd = useCallback(() => {
    if (!form.item || !canAdd) return;
    const charName = form.char === "__custom__" ? form.charCustom.trim() : form.char;
    addEntry({
      characterName: charName,
      itemId: form.item,
      currentStar: form.currentStar,
      targetStar: form.targetStar,
      replacementCost: form.replaceCost,
      safeguard: form.safeguard,
    });
    dispatchForm({ type: "clearItem" });
  }, [form, canAdd, addEntry]);

  return { form, dispatchForm, itemMaxStar, canAdd, handleAdd };
}
