// Class data measured from MapleScouter's results rather than probed. Since Nov 2026 MapleScouter
// sends no class curves or constants, so every change after that point (a new class, or a class
// MapleScouter retunes) is measured from what its calculator returns: HEXA, damage, the stat
// efficiency table, per-core shares. measured-classes.json holds those measurements, and
// build-engine-data.mjs applies them on top of the probed classes, so a rebuild keeps them.
//
// Each entry, keyed by class id:
//   how          what was measured and how (documentation only)
//   borrowFrom   start from another class's data (a new class with no probes); otherwise the
//                class's own probed data is the base
//   set          fields that replace the base's outright (a whole curve, a whole cores table)
//   patch        objects merged one level deep (one core value, one cooldown entry), for a fix to
//                part of an existing class
//   scaleFactor  multiplies the base class's scale (default 1)
import { readFileSync } from "node:fs";

export const MEASURED_CLASSES_FILE = new URL("./measured-classes.json", import.meta.url);

export function readMeasuredClasses() {
  return JSON.parse(readFileSync(MEASURED_CLASSES_FILE, "utf8"));
}

/** Applies the measured entries to `classes` in place. Run it after the probed classes' scales
 *  are set, since `scaleFactor` is relative to the base's scale. */
export function applyMeasuredClasses(classes, measured) {
  for (const [classId, { borrowFrom, set = {}, patch = {}, scaleFactor = 1 }] of Object.entries(measured)) {
    const base = classes[borrowFrom ?? classId];
    if (!base) throw new Error(`measured-classes.json: ${classId} has no base class ${borrowFrom ?? classId}`);
    const merged = { ...structuredClone(base), ...structuredClone(set) };
    for (const [field, values] of Object.entries(patch)) merged[field] = { ...merged[field], ...structuredClone(values) };
    merged.scale = base.scale * scaleFactor;
    classes[classId] = merged;
  }
}
