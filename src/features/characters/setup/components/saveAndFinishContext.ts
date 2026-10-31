import { createContext } from "react";

/** Finishes setup from any step, set by SetupFlowScreen only while editing an already-set-up
 *  character with no step invalid, and read by SetupStepFrame. A context rather than a prop,
 *  since every step renders its own frame. */
export const SaveAndFinishContext = createContext<(() => void) | null>(null);
