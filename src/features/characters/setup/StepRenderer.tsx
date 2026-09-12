/*
  Step renderer for setup flow.
  Centralizes step-to-component mapping so each step can be specialized later.
*/
import type { ComponentType } from "react";
import type { AppTheme } from "../../../components/themes";
import { getFlowStepByIndex, getVisibleStepInfo, type SetupFlowId } from "./flows";
import { getClassSetupOverrides } from "./data/nexonJobMapping";
import type { SetupStepId, SetupStepDefinition } from "./steps";
import type { StoredCharacterRecord, StoredScouterLegion, StoredLegionArtifact } from "../model/charactersStore";
import type { MapleScouterImportResult } from "./data/maplescouterImportData";
import GenderSetupStep from "./components/GenderSetupStep";
import MarriageSetupStep from "./components/MarriageSetupStep";
import MapleScouterImportStep from "./components/MapleScouterImportStep";
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
  /** When true, the step should present targetSubstep as if it were the step's only
   *  substep. See StatsSetupStep's confineToSubstep prop. */
  confineToSubstep?: boolean;
  substepJumpNonce?: number;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  /** Reports the current substep of Stats/Equipment/HEXA Matrix as it navigates
   *  internally, so the controller can persist it for resume across a full reload. */
  onSubstepChange?: (substepIndex: number) => void;
  characterRoster?: import("../model/charactersStore").StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldScouterLegion?: import("../model/charactersStore").StoredScouterLegion;
  worldLegionArtifact?: import("../model/charactersStore").StoredLegionArtifact;
  /** This session's own live Equipment/Legion Artifacts step drafts, independent of
   *  which step is currently active. Lets the Stats step's Quick Questions re-derive its
   *  locked answers from this session's in-progress edits rather than only what's already
   *  persisted. See StatsSetupStep.tsx's resolveEffectiveEquipment and
   *  resolveEffectiveLegionBoard. */
  equipmentRawValue?: string;
  legionArtifactsRawValue?: string;
  characterLevel?: number;
  confirmedCharacterName?: string;
  confirmedCharacterImgURL?: string;
  stepValue: string;
  onStepValueChange: (value: string) => void;
  onMapleScouterImport?: (result: MapleScouterImportResult) => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onFinish: () => void;
}

/** Superset props shape every step component must be assignable from. Each concrete
 *  component destructures only the subset it needs. */
interface SetupStepComponentProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  flowId?: SetupFlowId;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  direction?: "forward" | "backward";
  targetSubstep?: number | null;
  confineToSubstep?: boolean;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  onSubstepChange?: (substepIndex: number) => void;
  characterRoster?: StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldScouterLegion?: StoredScouterLegion;
  worldLegionArtifact?: StoredLegionArtifact;
  equipmentRawValue?: string;
  legionArtifactsRawValue?: string;
  characterLevel?: number;
  confirmedCharacterName?: string;
  confirmedCharacterImgURL?: string;
  value: string;
  onChange: (value: string) => void;
  onImport?: (result: MapleScouterImportResult) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const STEP_COMPONENTS: Record<SetupStepId, ComponentType<SetupStepComponentProps>> = {
  gender: GenderSetupStep,
  marriage: MarriageSetupStep,
  maplescouter_import: MapleScouterImportStep,
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
  confineToSubstep,
  substepJumpNonce,
  onValidityChange,
  onSubstepChange,
  characterRoster,
  confirmedWorldId,
  worldScouterLegion,
  worldLegionArtifact,
  equipmentRawValue,
  legionArtifactsRawValue,
  characterLevel,
  confirmedCharacterName,
  confirmedCharacterImgURL,
  stepValue,
  onStepValueChange,
  onMapleScouterImport,
  onBackStep,
  onNextStep,
  onFinish,
}: StepRendererProps) {
  const step = getFlowStepByIndex(flowId, stepIndex);
  if (!step) return null;

  const StepComponent = STEP_COMPONENTS[step.id];
  const { gender, skipMarriage } = getClassSetupOverrides(jobName);
  const { visibleNumber, visibleTotal } = getVisibleStepInfo(flowId, stepIndex, gender, skipMarriage, characterLevel, jobName);

  return (
    <StepComponent
      // Remount on a substep jump even when stepIndex is unchanged, such as re-targeting
      // Stats' Inner Ability while already on Stats. substepJumpNonce always changes when
      // jumpToSubstep fires, forcing the lazy substep-index initializer to rerun.
      key={`${step.id}-${substepJumpNonce ?? 0}`}
      theme={theme}
      step={step}
      flowId={flowId}
      stepNumber={visibleNumber}
      totalSteps={visibleTotal}
      jobName={jobName}
      direction={direction}
      targetSubstep={targetSubstep}
      confineToSubstep={confineToSubstep}
      onValidityChange={onValidityChange}
      onSubstepChange={onSubstepChange}
      characterRoster={characterRoster}
      confirmedWorldId={confirmedWorldId}
      worldScouterLegion={worldScouterLegion}
      worldLegionArtifact={worldLegionArtifact}
      equipmentRawValue={equipmentRawValue}
      legionArtifactsRawValue={legionArtifactsRawValue}
      characterLevel={characterLevel}
      confirmedCharacterName={confirmedCharacterName}
      confirmedCharacterImgURL={confirmedCharacterImgURL}
      value={stepValue}
      onChange={onStepValueChange}
      onImport={onMapleScouterImport}
      onBack={onBackStep}
      onNext={onNextStep}
      onFinish={onFinish}
    />
  );
}
