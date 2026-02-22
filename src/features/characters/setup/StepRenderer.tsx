/*
  Step renderer for setup flow.
  Centralizes step-to-component mapping so each step can be specialized later.
*/
import type { AppTheme } from "../../../components/themes";
import { SETUP_STEPS } from "./steps";
import type { SetupStepId } from "./steps";
import GenericSetupStep from "./components/GenericSetupStep";
import EquipmentStep from "./components/steps/EquipmentStep";

interface StepRendererProps {
  theme: AppTheme;
  stepIndex: number;
  stepValue: string;
  onStepValueChange: (value: string) => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onFinish: () => void;
}

const STEP_COMPONENTS: Record<SetupStepId, typeof GenericSetupStep> = {
  equipment: EquipmentStep,
  inventory: GenericSetupStep,
  v_matrix: GenericSetupStep,
  hexa_matrix: GenericSetupStep,
  familiars: GenericSetupStep,
  link_skills: GenericSetupStep,
  legion: GenericSetupStep,
  stats: GenericSetupStep,
};

export default function StepRenderer({
  theme,
  stepIndex,
  stepValue,
  onStepValueChange,
  onBackStep,
  onNextStep,
  onFinish,
}: StepRendererProps) {
  const step = SETUP_STEPS[stepIndex - 1];
  if (!step) return null;

  const StepComponent = STEP_COMPONENTS[step.id] ?? GenericSetupStep;

  return (
    <StepComponent
      theme={theme}
      step={step}
      stepNumber={stepIndex}
      totalSteps={SETUP_STEPS.length}
      value={stepValue}
      onChange={onStepValueChange}
      onBack={onBackStep}
      onNext={onNextStep}
      onFinish={onFinish}
    />
  );
}
