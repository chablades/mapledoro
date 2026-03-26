/** Shared date utilities for tool workspaces. */

/** Today's date as a UTC "YYYY-MM-DD" string. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
