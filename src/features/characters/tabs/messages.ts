/*
  Centralized status/error messages for character lookup and setup.
*/
export function getUsageMessage(min: number, max: number) {
  return `Use ${min}-${max} characters (letters/numbers only).`;
}

export function getInvalidIgnMessage(min: number, max: number) {
  return `Invalid IGN. Use ${min}-${max} characters (letters/numbers only).`;
}

export function getCooldownMessage(remainingMs: number) {
  return `Please wait ${Math.ceil(remainingMs / 1000)}s before searching again.`;
}

export function getFoundMessage() {
  return "Character found.";
}

export function getNotFoundMessage() {
  return "Character not found.";
}

export const LOOKUP_MESSAGES = {
  searching: "Searching...",
  searchingSlow: "Still searching... high traffic may cause delays.",
  timeout: "Search timed out. Please retry in a few seconds.",
  failed: "Search failed. Please try again.",
  setupSaved: "Setup progress saved. You can continue editing anytime.",
} as const;
