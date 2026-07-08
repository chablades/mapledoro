/*
  Step renderer for setup flow.
  Centralizes step-to-component mapping so each step can be specialized later.
*/
import type { AppTheme } from "../../../components/themes";
import { getFlowStepByIndex, getVisibleStepInfo, type SetupFlowId } from "./flows";
import { getClassSetupOverrides } from "./data/nexonJobMapping";
import type { SetupStepId } from "./steps";
import GenericSetupStep from "./components/GenericSetupStep";
import GenderSetupStep from "./components/GenderSetupStep";
import MarriageSetupStep from "./components/MarriageSetupStep";
import StatsSetupStep from "./components/StatsSetupStep";
import EquipmentSetupStep from "./components/EquipmentSetupStep";
import LinkSkillsSetupStep from "./components/LinkSkillsSetupStep";
import HexaMatrixSetupStep from "./components/HexaMatrixSetupStep";
import VMatrixSetupStep from "./components/VMatrixSetupStep";
import FamiliarsSetupStep from "./components/FamiliarsSetupStep";
import OzRingsSetupStep from "./components/OzRingsSetupStep";
import BuffsSetupStep from "./components/BuffsSetupStep";
import LegionArtifactsSetupStep from "./components/LegionArtifactsSetupStep";

interface StepRendererProps {
  theme: AppTheme;
  flowId: SetupFlowId;
  stepIndex: number;
  jobName?: string;
  direction?: "forward" | "backward";
  targetSubstep?: number | null;
  substepJumpNonce?: number;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  characterRoster?: import("../model/charactersStore").StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldLinkSkills?: string;
  worldScouterLegion?: import("../model/charactersStore").StoredScouterLegion;
  worldLegionArtifact?: import("../model/charactersStore").StoredLegionArtifact;
  characterLevel?: number;
  confirmedCharacterName?: string;
  confirmedCharacterImgURL?: string;
  stepValue: string;
  onStepValueChange: (value: string) => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onFinish: () => void;
}

const STEP_COMPONENTS: Record<SetupStepId, typeof GenericSetupStep> = {
  gender: GenderSetupStep,
  marriage: MarriageSetupStep,
  stats: StatsSetupStep,
  equipment: EquipmentSetupStep,
  v_matrix: VMatrixSetupStep,
  hexa_matrix: HexaMatrixSetupStep,
  familiars: FamiliarsSetupStep,
  link_skills: LinkSkillsSetupStep,
  oz_rings: OzRingsSetupStep,
  buffs: BuffsSetupStep,
  legion_artifacts: LegionArtifactsSetupStep,
};

export default function StepRenderer({
  theme,
  flowId,
  stepIndex,
  jobName = "",
  direction = "forward",
  targetSubstep,
  substepJumpNonce,
  onValidityChange,
  characterRoster,
  confirmedWorldId,
  worldLinkSkills,
  worldScouterLegion,
  worldLegionArtifact,
  characterLevel,
  confirmedCharacterName,
  confirmedCharacterImgURL,
  stepValue,
  onStepValueChange,
  onBackStep,
  onNextStep,
  onFinish,
}: StepRendererProps) {
  const step = getFlowStepByIndex(flowId, stepIndex);
  if (!step) return null;

  const StepComponent = STEP_COMPONENTS[step.id] ?? GenericSetupStep;
  const { gender, skipMarriage } = getClassSetupOverrides(jobName);
  const { visibleNumber, visibleTotal } = getVisibleStepInfo(flowId, stepIndex, gender, skipMarriage, characterLevel, jobName);

  return (
    <StepComponent
      // Remount on a substep jump even when stepIndex is unchanged (e.g. re-targeting
      // Stats' Inner Ability while already on Stats) — substepJumpNonce always changes
      // when jumpToSubstep fires, forcing the lazy substep-index initializer to rerun.
      key={`${step.id}-${substepJumpNonce ?? 0}`}
      theme={theme}
      step={step}
      flowId={flowId}
      stepNumber={visibleNumber}
      totalSteps={visibleTotal}
      jobName={jobName}
      direction={direction}
      targetSubstep={targetSubstep}
      onValidityChange={onValidityChange}
      characterRoster={characterRoster}
      confirmedWorldId={confirmedWorldId}
      worldLinkSkills={worldLinkSkills}
      worldScouterLegion={worldScouterLegion}
      worldLegionArtifact={worldLegionArtifact}
      characterLevel={characterLevel}
      confirmedCharacterName={confirmedCharacterName}
      confirmedCharacterImgURL={confirmedCharacterImgURL}
      value={stepValue}
      onChange={onStepValueChange}
      onBack={onBackStep}
      onNext={onNextStep}
      onFinish={onFinish}
    />
  );
}
