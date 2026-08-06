/*
  mapledoro's LinkSkillId (named after the skill effect, e.g. "unfairAdvantage") -> the
  literal key MapleScouter's linkSkill object uses (named after the class, e.g. "kadena").
  Confirmed against a real request capture. "kadena" (not "cadena") is MapleScouter's own
  spelling, kept as-is since it's their real field.

  MapleScouter also has mihile/kaiser/hayato keys with no mapledoro equivalent, confirmed
  these can't even be entered on MapleScouter's own UI, so they always send "0".

  This is intentionally NOT exhaustive over LinkSkillId: MapleScouter's own linkSkill
  object is a fixed external contract that only covers the classes above, unrelated to
  mapledoro's own LINK_SKILLS coverage (see linkSkillsData.ts) -- a link skill added there
  for mapledoro's own Legion panel has no bearing on what MapleScouter's API accepts.
*/

import type { LinkSkillId } from "../model/charactersStore";

export const LINK_SKILL_TO_SCOUTER_KEY: Partial<Record<LinkSkillId, string>> = {
  unfairAdvantage: "kadena",
  tideOfBattle: "illium",
  solus: "ark",
  timeToPrepare: "kain",
  termsAndConditions: "angel",
  elementalism: "kanna",
  qiCultivation: "mukhyun",
  bravado: "hoyoung",
  empiricalKnowledge: "magician",
  thiefsCunning: "thief",
};

/** Scouter linkSkill keys with no mapledoro equivalent, always sent as "0". */
export const SCOUTER_UNMODELED_LINK_SKILL_KEYS = ["mihile", "kaiser", "hayato"] as const;
