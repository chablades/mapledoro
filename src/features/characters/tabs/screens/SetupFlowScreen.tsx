import StepRenderer from "../../setup/StepRenderer";
import StepJumpMenu from "../../setup/components/StepJumpMenu";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { readCharactersStore, linkSkillsStoredToDraftString } from "../../model/charactersStore";
import { getClassSetupOverrides } from "../../setup/data/nexonJobMapping";
import { getVisibleSteps, getVisibleStepInfo, getRequiredSetupFlowId, getStepSubsteps, getFirstInvalidStepIndex, getFirstInvalidSubstepIndex, getFlowStepByIndex, getStepValidityKey } from "../../setup/flows";

interface SetupFlowScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

export default function SetupFlowScreen({ model, actions }: SetupFlowScreenProps) {
  const { theme, setup } = model;
  const confirmed = model.profile.confirmedCharacter;
  const jobName = confirmed?.jobName ?? "";
  const { gender, skipMarriage } = getClassSetupOverrides(jobName);
  const visibleSteps = getVisibleSteps(setup.activeFlowId, gender, skipMarriage, confirmed?.level, jobName);
  const { visibleNumber, visibleTotal } = getVisibleStepInfo(
    setup.activeFlowId, setup.setupStepIndex, gender, skipMarriage, confirmed?.level, jobName,
  );
  // Jumping to step 0 only lands on the setup-selection screen while the required
  // (quick) flow hasn't been completed yet — once it has, step 0 shows the character's
  // profile instead (see getActiveScreenId in PreviewSetupPane.tsx), so the "Setup
  // selection" menu entry would be a misleading label there and is omitted.
  const canBackToIntro = !setup.completedFlowIds.includes(getRequiredSetupFlowId());
  // Mirrors the Next button's own gate (SetupStepFrame's nextDisabled, reported up via
  // onValidityChange): forward jumps are blocked past the earliest step (in this
  // flow's order) whose last-known validity is false. Recomputed from the persisted
  // per-step-id map every render, not from "whichever step happens to be current" —
  // a step's draft data (and thus its validity) is shared across flows and outlives
  // navigating away from it, so the block has to hold even after backing out or
  // switching flows entirely, not just while sitting on the broken step.
  const firstInvalidStepIndex = getFirstInvalidStepIndex(
    setup.activeFlowId, setup.stepValidityById, gender, skipMarriage, confirmed?.level, jobName,
  );
  const jumpSteps = visibleSteps.map((s) => {
    const stepDisabled = firstInvalidStepIndex !== null && s.index > firstInvalidStepIndex;
    const labels = getStepSubsteps(s.stepId, setup.activeFlowId, confirmed?.level);
    // The broken step's own substeps before the specific broken one stay navigable —
    // only that substep onward (within it) and every step strictly after it are
    // blocked, since jumping between substeps of the step you're actually fixing
    // doesn't skip past anything.
    const firstInvalidSubstep = s.index === firstInvalidStepIndex
      ? getFirstInvalidSubstepIndex(s.stepId, setup.activeFlowId, setup.stepValidityById, confirmed?.level)
      : null;
    const substeps = labels?.map((label, i) => ({
      label,
      disabled: stepDisabled || (firstInvalidSubstep !== null && i > firstInvalidSubstep),
    })) ?? null;
    return { ...s, substeps, disabled: stepDisabled };
  });
  const currentStepId = getFlowStepByIndex(setup.activeFlowId, setup.setupStepIndex)?.id;

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
    <>
      <StepJumpMenu
        theme={theme}
        steps={jumpSteps}
        currentVisibleNumber={visibleNumber}
        totalSteps={visibleTotal}
        // Force "forward" regardless of numeric direction: jumping to a step (not a
        // specific substep) must always land on its first substep, not the direction-
        // based heuristic Prev/Next relies on (which would otherwise land on a step's
        // LAST substep when jumping to an earlier index).
        onJumpStep={(stepIndex) => actions.setSetupStepWithDirection(stepIndex, "forward")}
        onJumpSubstep={(stepIndex, substepIndex) => actions.jumpToSubstep(stepIndex, substepIndex)}
        onBackToIntro={canBackToIntro ? () => actions.setSetupStepWithDirection(0, "backward") : undefined}
      />
      <StepRenderer
        theme={theme}
        flowId={setup.activeFlowId}
        stepIndex={setup.setupStepIndex}
        jobName={jobName}
        direction={setup.setupStepDirection}
        targetSubstep={setup.setupTargetSubstep}
        substepJumpNonce={setup.substepJumpNonce}
        onValidityChange={currentStepId
          ? (valid: boolean, substepIndex = 0) => actions.onValidityChange(getStepValidityKey(currentStepId, substepIndex, setup.activeFlowId), valid)
          : undefined}
        onSubstepChange={actions.reportCurrentSubstep}
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
    </>
  );
}
