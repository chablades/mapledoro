import StepRenderer from "../../setup/StepRenderer";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { readCharactersStore } from "../../model/charactersStore";

interface SetupFlowScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

export default function SetupFlowScreen({ model, actions }: SetupFlowScreenProps) {
  const { theme, setup } = model;
  const confirmed = model.profile.confirmedCharacter;
  const jobName = confirmed?.jobName ?? "";

  const characterRoster = confirmed
    ? [
        confirmed,
        ...model.directory.allCharacters.filter((c) => c.characterName !== confirmed.characterName),
      ]
    : model.directory.allCharacters;

  const worldLinkSkills = confirmed?.worldID !== undefined
    ? (readCharactersStore().linkSkillsByWorld[String(confirmed.worldID)] ?? "")
    : "";

  const worldScouterWhRank = confirmed?.worldID !== undefined
    ? readCharactersStore().scouterLegionByWorld[String(confirmed.worldID)]?.wildHunterRank
    : undefined;

  return (
    <StepRenderer
      theme={theme}
      flowId={setup.activeFlowId}
      stepIndex={setup.setupStepIndex}
      jobName={jobName}
      direction={setup.setupStepDirection}
      characterRoster={characterRoster}
      confirmedWorldId={confirmed?.worldID}
      worldLinkSkills={worldLinkSkills}
      worldScouterWhRank={worldScouterWhRank}
      characterLevel={confirmed?.level}
      confirmedCharacterName={confirmed?.characterName}
      confirmedCharacterImgURL={confirmed?.characterImgURL}
      stepValue={setup.activeSetupStepValue}
      onStepValueChange={actions.stepValueChange}
      onBackStep={() => actions.setSetupStepWithDirection(setup.setupStepIndex - 1)}
      onNextStep={() => actions.setSetupStepWithDirection(setup.setupStepIndex + 1)}
      onFinish={actions.finishSetupFlow}
    />
  );
}
