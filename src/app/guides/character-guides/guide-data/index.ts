import type { ClassConfig } from "../guide-types";
import { hero } from "./hero";
import { paladin } from "./paladin";

export const CLASS_CONFIGS: Record<string, ClassConfig> = {
  hero,
  paladin,
};
