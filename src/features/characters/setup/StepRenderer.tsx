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

interface StepRendererProps {
  theme: AppTheme;
  flowId: SetupFlowId;
  stepIndex: number;
  jobName?: string;
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
  equipment_core: GenericSetupStep,
  inventory: GenericSetupStep,
  v_matrix: GenericSetupStep,
  hexa_matrix: GenericSetupStep,
  familiars: GenericSetupStep,
  link_skills: GenericSetupStep,
  legion: GenericSetupStep,
};

export default function StepRenderer({
  theme,
  flowId,
  stepIndex,
  jobName = "",
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
  const { visibleNumber, visibleTotal } = getVisibleStepInfo(flowId, stepIndex, gender, skipMarriage);

  return (
    <StepComponent
      theme={theme}
      step={step}
      stepNumber={visibleNumber}
      totalSteps={visibleTotal}
      jobName={jobName}
      value={stepValue}
      onChange={onStepValueChange}
      onBack={onBackStep}
      onNext={onNextStep}
      onFinish={onFinish}
    />
  );
}
