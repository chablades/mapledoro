export interface Boss {
  name: string;
  meso: number;
  shared?: string[];
  preset?: string[];
}

export const BOSSES: Boss[] = [
  { name: "Hilla (Hard)", meso: 56250000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Pink Bean (Chaos)", meso: 64000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Cygnus (Easy)", meso: 45562500, shared: ["Cygnus (Normal)"] },
  { name: "Cygnus (Normal)", meso: 72250000, shared: ["Cygnus (Easy)"], preset: ["cra", "akechi", "nlomien"] },
  { name: "Crimson Queen (Chaos)", meso: 81000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Von Bon (Chaos)", meso: 81000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Pierre (Chaos)", meso: 81000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Zakum (Chaos)", meso: 81000000, preset: ["cra", "akechi", "nlomien", "ctene"] },
  { name: "Princess No", meso: 81000000, preset: ["cra", "akechi", "nlomien", "ctene"] },
  { name: "Magnus (Hard)", meso: 95062500, preset: ["cra", "akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Vellum (Chaos)", meso: 105062500, preset: ["cra", "akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Papulatus (Chaos)", meso: 132250000, preset: ["akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Akechi Mitsuhide", meso: 144000000, preset: ["akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Lotus (Normal)", meso: 162562500, shared: ["Lotus (Hard)", "Lotus (Extreme)"], preset: ["nlomien"] },
  { name: "Lotus (Hard)", meso: 444675000, shared: ["Lotus (Normal)", "Lotus (Extreme)"], preset: ["ctene", "ekalos"] },
  { name: "Lotus (Extreme)", meso: 1397500000, shared: ["Lotus (Normal)", "Lotus (Hard)"] },
  { name: "Damien (Normal)", meso: 169000000, shared: ["Damien (Hard)"], preset: ["nlomien"] },
  { name: "Damien (Hard)", meso: 421875000, shared: ["Damien (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Guardian Angel Slime (Normal)", meso: 231673500, shared: ["Guardian Angel Slime (Chaos)"] },
  { name: "Guardian Angel Slime (Chaos)", meso: 600578125, shared: ["Guardian Angel Slime (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Lucid (Easy)", meso: 237009375, shared: ["Lucid (Normal)", "Lucid (Hard)"] },
  { name: "Lucid (Normal)", meso: 253828125, shared: ["Lucid (Easy)", "Lucid (Hard)"] },
  { name: "Lucid (Hard)", meso: 504000000, shared: ["Lucid (Easy)", "Lucid (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Will (Easy)", meso: 246744750, shared: ["Will (Normal)", "Will (Hard)"] },
  { name: "Will (Normal)", meso: 279075000, shared: ["Will (Easy)", "Will (Hard)"] },
  { name: "Will (Hard)", meso: 621810000, shared: ["Will (Easy)", "Will (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Gloom (Normal)", meso: 297675000, shared: ["Gloom (Chaos)"] },
  { name: "Gloom (Chaos)", meso: 563945000, shared: ["Gloom (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Darknell (Normal)", meso: 316875000, shared: ["Darknell (Hard)"] },
  { name: "Darknell (Hard)", meso: 667920000, shared: ["Darknell (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Verus Hilla (Normal)", meso: 581880000, shared: ["Verus Hilla (Hard)"] },
  { name: "Verus Hilla (Hard)", meso: 762105000, shared: ["Verus Hilla (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Chosen Seren (Normal)", meso: 889021875, shared: ["Chosen Seren (Hard)", "Chosen Seren (Extreme)"] },
  { name: "Chosen Seren (Hard)", meso: 1096562500, shared: ["Chosen Seren (Normal)", "Chosen Seren (Extreme)"], preset: ["ekalos"] },
  { name: "Chosen Seren (Extreme)", meso: 4235000000, shared: ["Chosen Seren (Normal)", "Chosen Seren (Hard)"] },
  { name: "Kalos the Guardian (Easy)", meso: 937500000, shared: ["Kalos the Guardian (Normal)", "Kalos the Guardian (Chaos)", "Kalos the Guardian (Extreme)"], preset: ["ekalos"] },
  { name: "Kalos the Guardian (Normal)", meso: 1300000000, shared: ["Kalos the Guardian (Easy)", "Kalos the Guardian (Chaos)", "Kalos the Guardian (Extreme)"] },
  { name: "Kalos the Guardian (Chaos)", meso: 2600000000, shared: ["Kalos the Guardian (Easy)", "Kalos the Guardian (Normal)", "Kalos the Guardian (Extreme)"] },
  { name: "Kalos the Guardian (Extreme)", meso: 5200000000, shared: ["Kalos the Guardian (Easy)", "Kalos the Guardian (Normal)", "Kalos the Guardian (Chaos)"] },
  { name: "First Adversary (Easy)", meso: 985000000, shared: ["First Adversary (Normal)", "First Adversary (Hard)", "First Adversary (Extreme)"] },
  { name: "First Adversary (Normal)", meso: 1365000000, shared: ["First Adversary (Easy)", "First Adversary (Hard)", "First Adversary (Extreme)"] },
  { name: "First Adversary (Hard)", meso: 2940000000, shared: ["First Adversary (Easy)", "First Adversary (Normal)", "First Adversary (Extreme)"] },
  { name: "First Adversary (Extreme)", meso: 5880000000, shared: ["First Adversary (Easy)", "First Adversary (Normal)", "First Adversary (Hard)"] },
  { name: "Kaling (Easy)", meso: 1031250000, shared: ["Kaling (Normal)", "Kaling (Hard)", "Kaling (Extreme)"] },
  { name: "Kaling (Normal)", meso: 1506500000, shared: ["Kaling (Easy)", "Kaling (Hard)", "Kaling (Extreme)"] },
  { name: "Kaling (Hard)", meso: 2990000000, shared: ["Kaling (Easy)", "Kaling (Normal)", "Kaling (Extreme)"] },
  { name: "Kaling (Extreme)", meso: 6026000000, shared: ["Kaling (Easy)", "Kaling (Normal)", "Kaling (Hard)"] },
  { name: "Limbo (Normal)", meso: 2100000000, shared: ["Limbo (Hard)"] },
  { name: "Limbo (Hard)", meso: 3745000000, shared: ["Limbo (Normal)"] },
  { name: "Baldrix (Normal)", meso: 2800000000, shared: ["Baldrix (Hard)"] },
  { name: "Baldrix (Hard)", meso: 6026000000, shared: ["Baldrix (Normal)"] },
];

// Precomputed: for each boss index, the indices of its shared bosses
const _nameToIdx = new Map(BOSSES.map((b, i) => [b.name, i]));
export const SHARED_INDICES: ReadonlyArray<readonly number[]> = BOSSES.map((b) =>
  (b.shared ?? []).map((name) => _nameToIdx.get(name)!),
);

export interface BossGroup {
  label: string;
  bossIndices: number[];
}

export const BOSS_GROUPS: BossGroup[] = (() => {
  const strip = (name: string) =>
    name.replace(/\s*\((?:Easy|Normal|Hard|Chaos|Extreme)\)$/, "");
  const groups: BossGroup[] = [];
  let current: BossGroup | null = null;
  for (let i = 0; i < BOSSES.length; i++) {
    const label = strip(BOSSES[i].name);
    if (!current || current.label !== label) {
      current = { label, bossIndices: [i] };
      groups.push(current);
    } else {
      current.bossIndices.push(i);
    }
  }
  return groups;
})();

export const PRESETS = [
  { key: "", label: "Empty" },
  { key: "cra", label: "CRA" },
  { key: "akechi", label: "Akechi" },
  { key: "nlomien", label: "NLomien" },
  { key: "ctene", label: "CTene" },
  { key: "ekalos", label: "EKalos" },
] as const;

export function formatMeso(n: number): string {
  return Math.floor(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

