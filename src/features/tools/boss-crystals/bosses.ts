export interface Boss {
  name: string;
  icon: string;
  meso: number;
  shared?: string[];
  preset?: string[];
}

const ICON_BASE = "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_";
const icon = (name: string) => `${ICON_BASE}${name}.png`;

export const BOSSES: Boss[] = [
  { name: "Hilla (Hard)", icon: icon("Hilla"), meso: 56250000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Pink Bean (Chaos)", icon: icon("Pink_Bean"), meso: 64000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Cygnus (Easy)", icon: icon("Cygnus"), meso: 45562500, shared: ["Cygnus (Normal)"] },
  { name: "Cygnus (Normal)", icon: icon("Cygnus"), meso: 72250000, shared: ["Cygnus (Easy)"], preset: ["cra", "akechi", "nlomien"] },
  { name: "Crimson Queen (Chaos)", icon: icon("Crimson_Queen"), meso: 81000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Von Bon (Chaos)", icon: icon("Von_Bon"), meso: 81000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Pierre (Chaos)", icon: icon("Pierre"), meso: 81000000, preset: ["cra", "akechi", "nlomien"] },
  { name: "Zakum (Chaos)", icon: icon("Zakum"), meso: 81000000, preset: ["cra", "akechi", "nlomien", "ctene"] },
  { name: "Princess No", icon: icon("Princess_No"), meso: 81000000, preset: ["cra", "akechi", "nlomien", "ctene"] },
  { name: "Magnus (Hard)", icon: icon("Magnus"), meso: 95062500, preset: ["cra", "akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Vellum (Chaos)", icon: icon("Vellum"), meso: 105062500, preset: ["cra", "akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Papulatus (Chaos)", icon: icon("Papulatus"), meso: 132250000, preset: ["akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Akechi Mitsuhide", icon: icon("Akechi_Mitsuhide"), meso: 144000000, preset: ["akechi", "nlomien", "ctene", "ekalos"] },
  { name: "Lotus (Normal)", icon: icon("Lotus"), meso: 162562500, shared: ["Lotus (Hard)", "Lotus (Extreme)"], preset: ["nlomien"] },
  { name: "Lotus (Hard)", icon: icon("Lotus"), meso: 444675000, shared: ["Lotus (Normal)", "Lotus (Extreme)"], preset: ["ctene", "ekalos"] },
  { name: "Lotus (Extreme)", icon: icon("Lotus"), meso: 1397500000, shared: ["Lotus (Normal)", "Lotus (Hard)"] },
  { name: "Damien (Normal)", icon: icon("Damien"), meso: 169000000, shared: ["Damien (Hard)"], preset: ["nlomien"] },
  { name: "Damien (Hard)", icon: icon("Damien"), meso: 421875000, shared: ["Damien (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Guardian Angel Slime (Normal)", icon: icon("Guardian_Angel_Slime"), meso: 231673500, shared: ["Guardian Angel Slime (Chaos)"] },
  { name: "Guardian Angel Slime (Chaos)", icon: icon("Guardian_Angel_Slime"), meso: 600578125, shared: ["Guardian Angel Slime (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Lucid (Easy)", icon: icon("Lucid"), meso: 237009375, shared: ["Lucid (Normal)", "Lucid (Hard)"] },
  { name: "Lucid (Normal)", icon: icon("Lucid"), meso: 253828125, shared: ["Lucid (Easy)", "Lucid (Hard)"] },
  { name: "Lucid (Hard)", icon: icon("Lucid"), meso: 504000000, shared: ["Lucid (Easy)", "Lucid (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Will (Easy)", icon: icon("Will"), meso: 246744750, shared: ["Will (Normal)", "Will (Hard)"] },
  { name: "Will (Normal)", icon: icon("Will"), meso: 279075000, shared: ["Will (Easy)", "Will (Hard)"] },
  { name: "Will (Hard)", icon: icon("Will"), meso: 621810000, shared: ["Will (Easy)", "Will (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Gloom (Normal)", icon: icon("Giant_Monster_Gloom"), meso: 297675000, shared: ["Gloom (Chaos)"] },
  { name: "Gloom (Chaos)", icon: icon("Giant_Monster_Gloom"), meso: 563945000, shared: ["Gloom (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Darknell (Normal)", icon: icon("Guard_Captain_Darknell"), meso: 316875000, shared: ["Darknell (Hard)"] },
  { name: "Darknell (Hard)", icon: icon("Guard_Captain_Darknell"), meso: 667920000, shared: ["Darknell (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Verus Hilla (Normal)", icon: icon("Verus_Hilla"), meso: 581880000, shared: ["Verus Hilla (Hard)"] },
  { name: "Verus Hilla (Hard)", icon: icon("Verus_Hilla"), meso: 762105000, shared: ["Verus Hilla (Normal)"], preset: ["ctene", "ekalos"] },
  { name: "Chosen Seren (Normal)", icon: icon("Chosen_Seren"), meso: 889021875, shared: ["Chosen Seren (Hard)", "Chosen Seren (Extreme)"] },
  { name: "Chosen Seren (Hard)", icon: icon("Chosen_Seren"), meso: 1096562500, shared: ["Chosen Seren (Normal)", "Chosen Seren (Extreme)"], preset: ["ekalos"] },
  { name: "Chosen Seren (Extreme)", icon: icon("Chosen_Seren"), meso: 4235000000, shared: ["Chosen Seren (Normal)", "Chosen Seren (Hard)"] },
  { name: "Kalos the Guardian (Easy)", icon: icon("Kalos_the_Guardian"), meso: 937500000, shared: ["Kalos the Guardian (Normal)", "Kalos the Guardian (Chaos)", "Kalos the Guardian (Extreme)"], preset: ["ekalos"] },
  { name: "Kalos the Guardian (Normal)", icon: icon("Kalos_the_Guardian"), meso: 1300000000, shared: ["Kalos the Guardian (Easy)", "Kalos the Guardian (Chaos)", "Kalos the Guardian (Extreme)"] },
  { name: "Kalos the Guardian (Chaos)", icon: icon("Kalos_the_Guardian"), meso: 2600000000, shared: ["Kalos the Guardian (Easy)", "Kalos the Guardian (Normal)", "Kalos the Guardian (Extreme)"] },
  { name: "Kalos the Guardian (Extreme)", icon: icon("Kalos_the_Guardian"), meso: 5200000000, shared: ["Kalos the Guardian (Easy)", "Kalos the Guardian (Normal)", "Kalos the Guardian (Chaos)"] },
  { name: "First Adversary (Easy)", icon: icon("First_Adversary"), meso: 985000000, shared: ["First Adversary (Normal)", "First Adversary (Hard)", "First Adversary (Extreme)"] },
  { name: "First Adversary (Normal)", icon: icon("First_Adversary"), meso: 1365000000, shared: ["First Adversary (Easy)", "First Adversary (Hard)", "First Adversary (Extreme)"] },
  { name: "First Adversary (Hard)", icon: icon("First_Adversary"), meso: 2940000000, shared: ["First Adversary (Easy)", "First Adversary (Normal)", "First Adversary (Extreme)"] },
  { name: "First Adversary (Extreme)", icon: icon("First_Adversary"), meso: 5880000000, shared: ["First Adversary (Easy)", "First Adversary (Normal)", "First Adversary (Hard)"] },
  { name: "Kaling (Easy)", icon: icon("Kaling"), meso: 1031250000, shared: ["Kaling (Normal)", "Kaling (Hard)", "Kaling (Extreme)"] },
  { name: "Kaling (Normal)", icon: icon("Kaling"), meso: 1506500000, shared: ["Kaling (Easy)", "Kaling (Hard)", "Kaling (Extreme)"] },
  { name: "Kaling (Hard)", icon: icon("Kaling"), meso: 2990000000, shared: ["Kaling (Easy)", "Kaling (Normal)", "Kaling (Extreme)"] },
  { name: "Kaling (Extreme)", icon: icon("Kaling"), meso: 6026000000, shared: ["Kaling (Easy)", "Kaling (Normal)", "Kaling (Hard)"] },
  { name: "Limbo (Normal)", icon: icon("Limbo"), meso: 2100000000, shared: ["Limbo (Hard)"] },
  { name: "Limbo (Hard)", icon: icon("Limbo"), meso: 3745000000, shared: ["Limbo (Normal)"] },
  { name: "Baldrix (Normal)", icon: icon("Baldrix"), meso: 2800000000, shared: ["Baldrix (Hard)"] },
  { name: "Baldrix (Hard)", icon: icon("Baldrix"), meso: 6026000000, shared: ["Baldrix (Normal)"] },
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
  const DIFFICULTY_SUFFIXES = ["(Easy)", "(Normal)", "(Hard)", "(Chaos)", "(Extreme)"];
  const strip = (name: string) => {
    for (const suffix of DIFFICULTY_SUFFIXES) {
      if (name.endsWith(suffix)) return name.slice(0, -suffix.length).trimEnd();
    }
    return name;
  };
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
  return new Intl.NumberFormat("en-US").format(Math.floor(n));
}

