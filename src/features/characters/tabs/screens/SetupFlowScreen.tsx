import StepRenderer from "../../setup/StepRenderer";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { readCharactersStore, linkSkillsStoredToDraftString } from "../../model/charactersStore";

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
    ? linkSkillsStoredToDraftString(readCharactersStore().linkSkillsByWorld[String(confirmed.worldID)])
    : "";

  const worldScouterLegion = confirmed?.worldID !== undefined
    ? readCharactersStore().scouterLegionByWorld[String(confirmed.worldID)]
    : undefined;

  const worldLegionArtifact = confirmed?.worldID !== undefined
    ? readCharactersStore().legionArtifactByWorld[String(confirmed.worldID)]
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
      worldScouterLegion={worldScouterLegion}
      worldLegionArtifact={worldLegionArtifact}
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
