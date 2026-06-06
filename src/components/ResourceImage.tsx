import Image from "next/image";
import type { CSSProperties } from "react";
import { resourceImageUrl } from "../lib/mapleResource";

// Reusable templates for game art served by the MapleResource API (haku.network).
// One pure id->URL builder per resource type. IDs come from the committed manifests
// in `manifests/v<version>/`; see CLAUDE.md "Image Policy".

interface ResourceIconProps {
  id: string;
  size: number;
  alt?: string;
  style?: CSSProperties;
  className?: string;
}

function ResourceImage({
  src,
  size,
  alt = "",
  style,
  className,
}: Omit<ResourceIconProps, "id"> & { src: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={className}
      style={{ objectFit: "contain", flexShrink: 0, ...style }}
    />
  );
}

// Defaults to the shadowless `iconRaw.png`. Pass `shadow` for the framed `icon.png`
// (reserved for inventory management).
export function ItemIcon({ id, shadow = false, ...rest }: ResourceIconProps & { shadow?: boolean }) {
  return <ResourceImage src={resourceImageUrl("item", id, shadow ? "icon.png" : "iconRaw.png")} {...rest} />;
}

export function MobSprite({ id, ...rest }: ResourceIconProps) {
  return <ResourceImage src={resourceImageUrl("mob", id, "sprite.png")} {...rest} />;
}

export function SkillIcon({ id, disabled = false, ...rest }: ResourceIconProps & { disabled?: boolean }) {
  return <ResourceImage src={resourceImageUrl("skill", id, disabled ? "iconDisabled.png" : "icon.png")} {...rest} />;
}

export function HexaSkillIcon({ id, disabled = false, ...rest }: ResourceIconProps & { disabled?: boolean }) {
  return <ResourceImage src={resourceImageUrl("hexa-skill", id, disabled ? "iconDisabled.png" : "icon.png")} {...rest} />;
}

// Direct familiar sprite only. For mob- or card-backed familiars (manifest
// `spriteFrom` = "mob" / null), use <MobSprite id={mobId}> or <ItemIcon id={cardId}>.
export function FamiliarSprite({ id, ...rest }: ResourceIconProps) {
  return <ResourceImage src={resourceImageUrl("familiar", id, "sprite.png")} {...rest} />;
}
