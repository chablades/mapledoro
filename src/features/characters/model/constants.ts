/*
  Shared constants for character setup/search flow.
*/
export const MIN_QUERY_LENGTH = 4;
export const MAX_QUERY_LENGTH = 12;
export const CHARACTER_NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9]{4,12}$/;
export const CHARACTER_NAME_INPUT_FILTER_REGEX = /[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]/g;
export const LOOKUP_RESPONSE_SCHEMA_VERSION = "v1";
export const COOLDOWN_MS = 5000;
export const LOOKUP_REQUEST_TIMEOUT_MS = 25000;
export const LOOKUP_SLOW_NOTICE_MS = 12000;
export const CHARACTER_CACHE_STORAGE_KEY = `mapledoro_character_cache_${LOOKUP_RESPONSE_SCHEMA_VERSION}`;
export const SETUP_DRAFT_STORAGE_PREFIX = `mapledoro_character_setup_draft_${LOOKUP_RESPONSE_SCHEMA_VERSION}:`;
export const SETUP_DRAFT_LAST_KEY = `mapledoro_character_setup_draft_last_${LOOKUP_RESPONSE_SCHEMA_VERSION}`;
export const MAX_BROWSER_CACHE_ENTRIES = 100;

export const WORLD_NAMES: Record<number, string> = {
  1: "Bera",
  19: "Scania",
  30: "Luna",
  45: "Kronos",
  46: "Solis",
  70: "Hyperion",
};

export type SetupMode = "intro" | "search" | "import";
