/*
  classId -> MapleScouter's Korean class name (their `stat.myClass` / `hexa.character_class`
  value). Resolved by cross-referencing maplestorywiki.net's KoreaMS field for real KMS
  classes, and live capture on maplescouter.com for classes that don't exist in KMS at all
  (Kanna, Mo Xuan, Lynn, Sia, Hayato, Erel Light).

  Classes absent from this table (the legacy job names, and any class MapleScouter hasn't
  added yet) have no valid `myClass` value, so callers must check for that absence and skip
  the Scouter fetch entirely rather than sending a request with nowhere to route to.
*/

export const SCOUTER_CLASS_KOREAN_NAMES: Record<string, string> = {
  hoyoung: "호영",
  lara: "라라",
  ren: "렌",
  blaze_wizard: "플레임위자드",
  dawn_warrior: "소울마스터",
  mihile: "미하일",
  night_walker: "나이트워커",
  thunder_breaker: "스트라이커",
  wind_archer: "윈드브레이커",
  demon_avenger: "데몬어벤져",
  demon_slayer: "데몬슬레이어",
  arch_mage_f_p: "아크메이지(불,독)",
  arch_mage_i_l: "아크메이지(썬,콜)",
  bishop: "비숍",
  blade_master: "듀얼블레이드",
  bow_master: "보우마스터",
  buccaneer: "바이퍼",
  cannoneer: "캐논슈터",
  corsair: "캡틴",
  dark_knight: "다크나이트",
  hero: "히어로",
  marksman: "신궁",
  night_lord: "나이트로드",
  paladin: "팔라딘",
  pathfinder: "패스파인더",
  shadower: "섀도어",
  adele: "아델",
  ark: "아크",
  illium: "일리움",
  khali: "칼리",
  kinesis: "키네시스",
  aran: "아란",
  evan: "에반",
  luminous: "루미너스",
  mercedes: "메르세데스",
  phantom: "팬텀",
  shade: "은월",
  lynn: "린",
  mo_xuan: "묵현",
  angelic_buster: "엔젤릭버스터",
  cadena: "카데나",
  kain: "카인",
  kaiser: "카이저",
  battle_mage: "배틀메이지",
  blaster: "블래스터",
  mechanic: "메카닉",
  wild_hunter: "와일드헌터",
  xenon: "제논",
  hayato: "하야토",
  kanna: "칸나",
  sia_astelle: "시아",
  erel_light: "에렐",
  zero: "제로",
};

/** Korean class name for MapleScouter, or null if this class isn't supported by their site. */
export function scouterKoreanClassName(classId: string): string | null {
  return SCOUTER_CLASS_KOREAN_NAMES[classId] ?? null;
}
