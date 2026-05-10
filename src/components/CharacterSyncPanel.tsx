import type { AppTheme } from "./themes";
import type { StoredCharacterRecord } from "../features/characters/model/charactersStore";

interface CharacterSyncPanelProps {
  theme: AppTheme;
  characters: StoredCharacterRecord[];
  selectedCharName: string | null;
  onCharChange: (name: string | null) => void;
  inputStyle: React.CSSProperties;
  sectionPanel: React.CSSProperties;
}

export function CharacterSyncPanel({
  theme,
  characters,
  selectedCharName,
  onCharChange,
  inputStyle,
  sectionPanel,
}: CharacterSyncPanelProps) {
  if (characters.length === 0) return null;

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          className="section-label"
          style={{ color: theme.muted, marginBottom: 0 }}
        >
          Character
        </div>
        <select
          className="tool-input"
          value={selectedCharName ?? ""}
          onChange={(e) => onCharChange(e.target.value || null)}
          style={{
            ...inputStyle,
            flex: 1,
            maxWidth: "280px",
            cursor: "pointer",
          }}
        >
          <option value="">None (global)</option>
          {characters.map((c) => (
            <option key={c.characterName} value={c.characterName}>
              {c.characterName} (Lv.{c.level} {c.jobName})
            </option>
          ))}
        </select>
        {selectedCharName && (
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: theme.accent,
            }}
          >
            Synced to {selectedCharName}
          </span>
        )}
      </div>
    </div>
  );
}
