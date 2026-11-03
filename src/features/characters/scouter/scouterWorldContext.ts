// Where Scouter gets the world-level data a character's result depends on (Legion answers, Wild
// Hunter rank). Normally that is the saved store. A standalone character, such as a card opened in
// the viewer, isn't in the store, so the viewer provides its own copy through this context and
// Scouter neither reads the store for it nor writes anything back.

import { createContext, useContext } from "react";
import { readCharactersStore } from "../model/charactersStore";
import type { ScouterPayloadContext } from "./scouterApi";

export const ScouterWorldContext = createContext<ScouterPayloadContext | null>(null);

/** The viewer's context when inside one, otherwise null (meaning: use the saved store). */
export function useScouterWorldContext(): ScouterPayloadContext | null {
  return useContext(ScouterWorldContext);
}

/** The context to compute with: the one given, or the saved store's. */
export function resolveScouterContext(ctx: ScouterPayloadContext | null | undefined): ScouterPayloadContext {
  return ctx ?? { scouterLegionByWorld: readCharactersStore().scouterLegionByWorld };
}
