import type { CSSProperties } from "react";
import { ErdaSkillIcon, HexaSkillIcon, SkillIcon } from "../../../components/ResourceImage";
import type { SkillGuesserPuzzle } from "./puzzles";

/** Renders a puzzle's icon from whichever MapleResource type it came from. */
export default function PuzzleSkillIcon({
  puzzle,
  size,
  alt,
  style,
}: {
  puzzle: SkillGuesserPuzzle;
  size: number;
  alt: string;
  style?: CSSProperties;
}) {
  const props = { id: puzzle.skillId, size, alt, style };
  if (puzzle.resource === "hexa-skill") return <HexaSkillIcon {...props} />;
  if (puzzle.resource === "erda-skill") return <ErdaSkillIcon {...props} />;
  return <SkillIcon {...props} />;
}
