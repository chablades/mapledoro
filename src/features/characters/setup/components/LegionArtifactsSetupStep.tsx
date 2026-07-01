"use client";

import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import type { StoredScouterLegion } from "../../model/charactersStore";
import {
  parseLegionArtifactsDraft,
  serializeLegionArtifactsDraft,
  type LegionArtifactsDraft,
} from "../data/scouterQuestionsData";
import { BoolToggle, LegionFinalAttackField } from "./QuestionControls";
import SetupStepFrame from "./SetupStepFrame";

interface LegionArtifactsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  worldScouterLegion?: StoredScouterLegion;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export default function LegionArtifactsSetupStep({
  theme, step, stepNumber, totalSteps, worldScouterLegion, value, onChange, onBack, onNext, onFinish,
}: LegionArtifactsSetupStepProps) {
  const draft = parseLegionArtifactsDraft(value);

  function update(patch: Partial<LegionArtifactsDraft>) {
    onChange(serializeLegionArtifactsDraft({ ...draft, ...patch }));
  }

  const finalAtkValue = draft.artifactFinalAttackDmg
    ?? (worldScouterLegion?.artifactFinalAttackDmg != null ? String(worldScouterLegion.artifactFinalAttackDmg) : "");

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your Legion Artifact effects, found in the Legion window's Artifacts tab. This is account-wide for your world."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 360 }}>
        <BoolToggle
          question="Do you have the +1 attack target Legion artifact?"
          value={draft.artifactExtraTarget ?? worldScouterLegion?.artifactExtraTarget}
          onToggle={(v) => update({ artifactExtraTarget: v })}
          theme={theme}
          tooltip={{
            title: "Legion Artifact",
            description: 'Found in your Legion window, in the Artifacts tab. The stat is called: "+1 targets hit when using multi-target skills and EXP acquired."',
          }}
        />
        <LegionFinalAttackField
          value={finalAtkValue}
          onUpdate={(v) => update({ artifactFinalAttackDmg: v })}
          theme={theme}
        />
      </div>
    </SetupStepFrame>
  );
}
