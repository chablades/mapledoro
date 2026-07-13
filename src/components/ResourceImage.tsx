import Image from "next/image";
import type { CSSProperties } from "react";
import { markIconUrl, resourceImageUrl } from "../lib/mapleResource";

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
// (reserved for inventory management). Pass `revealed` for the `iconD`/`iconRawD`
// variant some items have (e.g. androids: the egg-form default vs. the actual sprite
// shown once equipped) — orthogonal to `shadow`, so both can combine.
export function ItemIcon({ id, shadow = false, revealed = false, ...rest }: ResourceIconProps & { shadow?: boolean; revealed?: boolean }) {
  const base = shadow ? "icon" : "iconRaw";
  return <ResourceImage src={resourceImageUrl("item", id, `${base}${revealed ? "D" : ""}.png`)} {...rest} />;
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

// Erda Link skill icon (SHINE classes). `id` is the manifest's multi-segment
// "{outerId}/{type}/{id}" path (e.g. "18212/skill/102").
export function ErdaSkillIcon({ id, ...rest }: ResourceIconProps) {
  return <ResourceImage src={resourceImageUrl("erda-skill", id, "icon.png")} {...rest} />;
}

// World map area mark. IDs come from `ui-mark.json`.
export function MarkIcon({ id, ...rest }: ResourceIconProps) {
  return <ResourceImage src={markIconUrl(id)} {...rest} />;
}

// Direct familiar sprite only. For mob- or card-backed familiars (manifest
// `spriteFrom` = "mob" / null), use <MobSprite id={mobId}> or <ItemIcon id={cardId}>.
export function FamiliarSprite({ id, ...rest }: ResourceIconProps) {
  return <ResourceImage src={resourceImageUrl("familiar", id, "sprite.png")} {...rest} />;
}
