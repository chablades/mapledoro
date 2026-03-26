import StepRenderer from "../../setup/StepRenderer";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";

interface SetupFlowScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

export default function SetupFlowScreen({ model, actions }: SetupFlowScreenProps) {
  const { theme, setup } = model;

  return (
    <StepRenderer
      theme={theme}
      flowId={setup.activeFlowId}
      stepIndex={setup.setupStepIndex}
      stepValue={setup.activeSetupStepValue}
      onStepValueChange={actions.stepValueChange}
      onBackStep={() => actions.setSetupStepWithDirection(setup.setupStepIndex - 1)}
      onNextStep={() => actions.setSetupStepWithDirection(setup.setupStepIndex + 1)}
      onFinish={actions.finishSetupFlow}
    />
  );
}
