import CharacterAvatar from "../features/characters/tabs/components/CharacterAvatar";
import type { AppTheme } from "./themes";

interface CharacterChipProps {
  theme: AppTheme;
  characterImgURL: string;
  characterName: string;
  subtitle: string;
}

export default function CharacterChip({
  theme,
  characterImgURL,
  characterName,
  subtitle,
}: CharacterChipProps) {
  return (
    <>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "12px",
          overflow: "hidden",
          background: theme.timerBg,
          border: `1px solid ${theme.border}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CharacterAvatar
          src={characterImgURL}
          alt={characterName}
          width={48}
          height={48}
          style={{ objectFit: "contain" }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: "0.9rem",
            color: theme.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {characterName}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: theme.muted,
            fontWeight: 600,
            marginTop: 1,
          }}
        >
          {subtitle}
        </div>
      </div>
    </>
  );
}
