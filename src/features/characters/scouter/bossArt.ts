// Where to aim the crop of each boss's splash art (ui/boss mob.png), shared by the profile's Quick
// View banner and Party Scouter's boss select.

// Vertical anchor for the wide banner crop of mob.png, which is a tall splash. 20% lands
// roughly on the head and shoulders for the 2 splashes checked so far, Malefic Star and First
// Adversary. Not checked across the full roster.
export const DEFAULT_ART_POSITION = "50% 20%";
// Per-boss override, keyed like BOSS_ICON_ID, since framing varies enough per splash that a
// single default crop misses most faces. Tuned by hand against each boss's real mob.png in the
// WZ image dump, picking the vertical anchor as a percentage of source height that lands on the
// face in the wide banner crop. Gloom has no face, being an inanimate seal, so it is positioned
// on the portal's glowing center.
export const BOSS_ART_POSITION: Record<string, string> = {
  스우: "50% 25%", 데미안: "42% 50%", 루시드: "50% 43%", 윌: "68% 61%", 더스크: "50% 53%",
  "진 힐라": "50% 23%", 듄켈: "48% 46%", "검은 마법사": "42% 19%", 세렌: "50% 33%",
  칼로스: "55% 60%", 대적자: "75% 29%", 흉성: "50% 26%", 카링: "50% 26%", 림보: "50% 58%",
  발드릭스: "50% 40%", 유피테르: "48% 25%", 가엔슬: "50% 51%", 카이: "50% 28%",
  "Akechi Mitsuhide": "50% 29%", "Princess No": "50% 35%", Vellum: "50% 65%", "Pink Bean": "50% 50%", Cygnus: "50% 62%", Arkarium: "50% 74%", Horntail: "50% 30%", Papulatus: "50% 35%",
  Pierre: "50% 40%", "Von Bon": "50% 40%", "Crimson Queen": "50% 24%",
  "Von Leon": "50% 54%", Hilla: "50% 40%", Magnus: "50% 40%", Zakum: "50% 54%",
};
