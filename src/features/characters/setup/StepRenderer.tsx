/*
  Step renderer for setup flow.
  Centralizes step-to-component mapping so each step can be specialized later.
*/
import type { AppTheme } from "../../../components/themes";
import { getFlowStepByIndex, getFlowStepCount, type SetupFlowId } from "./flows";
import type { SetupStepId } from "./steps";
import GenericSetupStep from "./components/GenericSetupStep";
import GenderSetupStep from "./components/GenderSetupStep";

interface StepRendererProps {
  theme: AppTheme;
  flowId: SetupFlowId;
  stepIndex: number;
  stepValue: string;
  onStepValueChange: (value: string) => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onFinish: () => void;
}

const STEP_COMPONENTS: Record<SetupStepId, typeof GenericSetupStep> = {
  gender: GenderSetupStep,
  stats: GenericSetupStep,
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
  stepValue,
  onStepValueChange,
  onBackStep,
  onNextStep,
  onFinish,
}: StepRendererProps) {
  const step = getFlowStepByIndex(flowId, stepIndex);
  if (!step) return null;

  const StepComponent = STEP_COMPONENTS[step.id] ?? GenericSetupStep;

  return (
    <StepComponent
      theme={theme}
      step={step}
      stepNumber={stepIndex}
      totalSteps={getFlowStepCount(flowId)}
      value={stepValue}
      onChange={onStepValueChange}
      onBack={onBackStep}
      onNext={onNextStep}
      onFinish={onFinish}
    />
  );
}
