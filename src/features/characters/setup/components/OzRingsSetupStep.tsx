"use client";

import { useRef, type CSSProperties } from "react";
import Image from "next/image";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { CLASS_SKILL_DATA } from "../data/classSkillData";
import {
  OZ_RING_ICON_IDS,
  OZ_RING_MAX_LEVEL,
  getOzWeaponJumpVariant,
  parseOzRingsDraft,
  sanitizeOzRingLevel,
  serializeOzRingsDraft,
  type OzRingId,
  type OzRingsDraft,
} from "../data/ozRingData";
import SetupStepFrame from "./SetupStepFrame";
import InfoTooltip from "./InfoTooltip";
import { LeveledIconTile } from "./LeveledIconTile";

// manifests/v<ver>/item.json, Item/Consume. Green/Red Jade's raw art fills its canvas
// edge-to-edge (31x26, no padding) while Black/White Jade/Life have a visible margin
// baked in (roughly a 36x36 canvas at 85-92% content), so they are shrunk and nudged down to
// visually match, offsets measured directly off a 4x-zoom screenshot comparing each
// icon's bottom edge against Black Jade's (the only one with zero baked-in padding
// asymmetry, so treated as the reference).
const BOSS_RING_BOX_ITEM_IDS: { id: string; scale?: number; offsetY?: number }[] = [
  { id: "02028407", scale: 0.89, offsetY: 1.25 }, // Green Jade Boss Ring Box
  { id: "02028408", scale: 0.89, offsetY: 1.25 }, // Red Jade Boss Ring Box
  { id: "02028409" }, // Black Jade Boss Ring Box (reference)
  { id: "02028410", offsetY: 0.5 }, // White Jade Boss Ring Box
  { id: "02028430", offsetY: 0.5 }, // Life Boss Ring Box
];

const OZ_RING_TOOLTIP = {
  title: "Oz Rings",
  description: "Special Skill Rings, better known as Oz Rings, drop from Boss Ring Boxes. Enter the level of each ring you use when bossing.",
  imageUrls: BOSS_RING_BOX_ITEM_IDS.map(({ id, scale, offsetY }) => ({ src: resourceImageUrl("item", id, "iconRaw.png"), scale, offsetY })),
  link: { href: "https://maplestorywiki.net/w/Skill_Rings", label: "MapleStory Wiki: Skill Rings" },
};

// A missing/failed icon falls back to the ring's name-initial (mirrors VMatrixNodeIcon's
// treatment) rather than a stray broken-image glyph. Each Oz Ring has a distinct name,
// unlike HEXA Stat's shared-prefix case, which needed a slot number instead.
function OzRingIcon({ id, name, theme, size = 32 }: { id: string; name: string; theme: AppTheme; size?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const src = resourceImageUrl("item", id, "iconRaw.png");
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image src={src} alt={name} width={size} height={size} unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "flex";
          }}
          style={{ objectFit: "contain", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{
        display: "none", alignItems: "center", justifyContent: "center", width: size, height: size,
        borderRadius: "6px", flexShrink: 0, fontWeight: 800, fontSize: Math.max(12, size * 0.35),
        background: "rgba(127,127,127,0.18)", color: theme.muted,
      }}>
        {name.match(/[a-zA-Z0-9]/)?.[0] ?? "?"}
      </div>
    </>
  );
}

interface OzRingsSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
}

const sectionLabelStyle = (theme: AppTheme): CSSProperties => ({
  margin: "0 0 0.4rem", fontSize: "0.75rem", fontWeight: 800,
  textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted,
});

export default function OzRingsSetupStep({
  theme, step, stepNumber, totalSteps, jobName = "", value, onChange, onBack, onNext, onFinish, onValidityChange,
}: OzRingsSetupStepProps) {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const weaponJump = getOzWeaponJumpVariant(classData?.requiredStats ?? []);
  const draft = parseOzRingsDraft(value);

  function setLevel(ring: OzRingId, val: string) {
    const next: OzRingsDraft = { levels: { ...draft.levels, [ring]: sanitizeOzRingLevel(ring, val) } };
    onChange(serializeOzRingsDraft(next));
  }

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Enter your Oz ring info if you use them when bossing."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
      onValidityChange={onValidityChange}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 360 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
            <span style={{ ...sectionLabelStyle(theme), margin: 0 }}>Ring Levels</span>
            <InfoTooltip content={OZ_RING_TOOLTIP} theme={theme} />
          </div>
          <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", color: theme.muted }}>
            Leave at 0 if unused.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <LeveledIconTile icon={<OzRingIcon id={OZ_RING_ICON_IDS.restraint} name="Ring of Restraint" theme={theme} />} name="Ring of Restraint"
            level={draft.levels.restraint ?? ""} onLevel={(v) => setLevel("restraint", v)} max={OZ_RING_MAX_LEVEL.restraint} theme={theme} />
          <LeveledIconTile icon={<OzRingIcon id={weaponJump.iconId} name={weaponJump.label} theme={theme} />} name={weaponJump.label}
            level={draft.levels.weaponJump ?? ""} onLevel={(v) => setLevel("weaponJump", v)} max={OZ_RING_MAX_LEVEL.weaponJump} theme={theme} />
          <LeveledIconTile icon={<OzRingIcon id={OZ_RING_ICON_IDS.continuous} name="Continuous Ring" theme={theme} />} name="Continuous Ring"
            level={draft.levels.continuous ?? ""} onLevel={(v) => setLevel("continuous", v)} max={OZ_RING_MAX_LEVEL.continuous} theme={theme} />
        </div>
      </div>
    </SetupStepFrame>
  );
}
