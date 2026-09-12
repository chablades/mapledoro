import { COMMON_SKILLS, common3Skill, type HexaClassDef } from "../../tools/hexa-skills/hexa-classes";
import type { SimulatorHexaCoreField } from "./scouterApi";

// generalCore2 = Sol Hecate, a COMMON_SKILLS entry (not part of the per-class HexaClassDef),
// same distinction buildHexa/hexaCoreLevels already draw in scouterApi.ts. generalCore3 is
// the class's own 3rd Common Node (v271), keyed by class name via common3Skill.
const SOL_HECATE = COMMON_SKILLS.find((s) => s.name === "Sol Hecate");

// Mastery nodes have no single name, since one composite icon covers several skills at once.
// HexaMatrixSetupStep.tsx's own tooltip joins them the same way.
function masteryName(node: { skills: string[] } | undefined): string | undefined {
  return node?.skills.join("\n");
}

/** Split out of ScouterSimulatorDialog.tsx so that file can stay component-exports-only
 *  under only-export-components, since a non-component export there defeats Fast Refresh. Used
 *  by both ScouterSimulatorDialog.tsx's HEXA tab rendering and useScouterSimulatorDraft.ts,
 *  which needs only each entry's `field` key to seed and serialize hexaCores. */
export function hexaCoreFields(classDef: HexaClassDef | null): { field: SimulatorHexaCoreField; label: string; name: string; iconId: string; iconUrl?: string }[] {
  const fallback = { iconId: "" };
  const common3 = classDef ? common3Skill(classDef.className) : null;
  return [
    { field: "skillCore1" as const, label: "Origin", ...(classDef?.origin ?? fallback), name: classDef?.origin.name ?? "Origin" },
    { field: "skillCore2" as const, label: "Ascent", ...(classDef?.ascent ?? fallback), name: classDef?.ascent?.name ?? "Ascent" },
    { field: "masteryCore1" as const, label: "Mastery I", ...(classDef?.mastery[0] ?? fallback), name: masteryName(classDef?.mastery[0]) ?? "Mastery I" },
    { field: "masteryCore2" as const, label: "Mastery II", ...(classDef?.mastery[1] ?? fallback), name: masteryName(classDef?.mastery[1]) ?? "Mastery II" },
    { field: "masteryCore3" as const, label: "Mastery III", ...(classDef?.mastery[2] ?? fallback), name: masteryName(classDef?.mastery[2]) ?? "Mastery III" },
    { field: "masteryCore4" as const, label: "Mastery IV", ...(classDef?.mastery[3] ?? fallback), name: masteryName(classDef?.mastery[3]) ?? "Mastery IV" },
    { field: "reinCore1" as const, label: "Enhance I", ...(classDef?.enhancement[0] ?? fallback), name: classDef?.enhancement[0]?.name ?? "Enhance I" },
    { field: "reinCore2" as const, label: "Enhance II", ...(classDef?.enhancement[1] ?? fallback), name: classDef?.enhancement[1]?.name ?? "Enhance II" },
    { field: "reinCore3" as const, label: "Enhance III", ...(classDef?.enhancement[2] ?? fallback), name: classDef?.enhancement[2]?.name ?? "Enhance III" },
    { field: "reinCore4" as const, label: "Enhance IV", ...(classDef?.enhancement[3] ?? fallback), name: classDef?.enhancement[3]?.name ?? "Enhance IV" },
    { field: "generalCore2" as const, label: "Sol Hecate", ...(SOL_HECATE ?? fallback), name: SOL_HECATE?.name ?? "Sol Hecate" },
    ...(common3 ? [{ field: "generalCore3" as const, label: "3rd Common", ...common3, name: common3.name }] : []),
  ];
}
