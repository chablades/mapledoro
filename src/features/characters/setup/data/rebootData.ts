// Reboot's Final Damage bonus — a permanent, level-bracketed multiplicative buff every Reboot-world
// character gets automatically, no liberation/skill/setup answer involved. Not shown anywhere in
// Character Info's own stat tooltip breakdown, but it's real and already baked into a Reboot
// character's displayed Final Damage/Damage Range — the calc needs to add it back in explicitly or
// it silently undershoots (strategywiki, confirmed 2026-07-18 against 4 real Reboot characters:
// Hoyoung lv210, Zero lv231, Buccaneer lv201, Cannoneer lv210).
import { WORLD_NAMES } from "../../model/constants";

// Kronos/Solis/Hyperion are GMS's 3 Reboot worlds; Bera/Scania/Luna are Interactive — confirmed by
// Yuki 2026-07-18. Checked by name (not a separate hardcoded id list) so this stays correct if
// WORLD_NAMES' own ids ever get renumbered.
const REBOOT_WORLD_NAMES = new Set(["Kronos", "Solis", "Hyperion"]);

export function isRebootWorld(worldId: number | undefined): boolean {
  if (worldId === undefined) return false;
  const name = WORLD_NAMES[worldId];
  return name !== undefined && REBOOT_WORLD_NAMES.has(name);
}

/** strategywiki's level-bracket table for Reboot's Final Damage bonus. */
export function rebootFinalDamageBonusPercent(level: number): number {
  if (level < 100) return 15;
  if (level < 150) return 20;
  if (level < 200) return 25;
  if (level < 250) return 35;
  return 45;
}
