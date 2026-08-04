#!/usr/bin/env node
/*
  Routine post-patch/maintenance check: runs everything that can self-validate without a
  fresh manifest download, and reports pass/fail for each. See MAINTENANCE.md (repo root)
  for what each check actually means and what to do if one fails -- this script only runs
  them and summarizes, it doesn't explain them.

  Run: node scripts/maintenance-check.mjs
  Exits non-zero if any check fails.
*/

import { spawnSync } from "node:child_process";

const checks = [
  { name: "Unit tests (npm test)", command: "npm", args: ["test"] },
  { name: "MapleScouter boss-cut data (scrape-bosscut.mjs)", command: "node", args: ["scripts/scrape-bosscut.mjs"] },
  { name: "Mastery%/Final Damage% baselines (gen-stat-baselines.mjs)", command: "node", args: ["scripts/gen-stat-baselines.mjs"] },
];

let failed = false;

for (const check of checks) {
  console.log(`\n--- ${check.name} ---`);
  const result = spawnSync(check.command, check.args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    failed = true;
    console.log(`\n✗ FAILED: ${check.name}`);
  } else {
    console.log(`\n✓ passed: ${check.name}`);
  }
}

console.log("\n=================================================");
console.log("NOT covered by this script (see MAINTENANCE.md):");
console.log("  - Whether a game version bump needs a fresh manifest");
console.log("    (gen-equipment.mjs, gen-familiars.mjs, gen-vmatrix.mjs)");
console.log("  - New-class / class-revamp checklist (Characters CLAUDE.md)");
console.log("  - MapleStory version string still matches root CLAUDE.md");
console.log("=================================================\n");

if (failed) {
  console.error("One or more automated checks FAILED. See MAINTENANCE.md for what to do next.");
  process.exit(1);
}
console.log("All automated checks passed.");
