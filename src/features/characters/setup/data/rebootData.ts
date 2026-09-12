// Reboot's Final Damage bonus: a permanent, level-bracketed multiplicative buff every
// Reboot-world character gets automatically, with no liberation, skill or setup answer involved.
// It appears nowhere in Character Info's own stat tooltip breakdown, but it is real and already
// baked into a Reboot character's displayed Final Damage and Damage Range, so the calc has to add
// it back explicitly or it silently undershoots. Per strategywiki, and checked against 4 Reboot
// characters, all of them inside the 200-249 bracket below, so the other brackets rest on
// strategywiki's table alone.
import { WORLD_NAMES } from "../../model/constants";

// Kronos, Solis and Hyperion are GMS's 3 Reboot worlds, while Bera, Scania and Luna are
// Interactive. Checked by name rather than a separate hardcoded id list, so this stays correct
// if WORLD_NAMES' own ids are ever renumbered.
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
