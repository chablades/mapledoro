import type { AppTheme } from "../../../components/themes";
import type { SymbolType, SymbolArea, SymbolState } from "./symbol-data";

export interface PerSymbolData {
  area: SymbolArea;
  state: SymbolState;
  remaining: number;
  days: number;
  consumed: number;
  levelMax: number;
  isMaxed: boolean;
  isTracked: boolean;
}

function TogglePill({
  active,
  label,
  onClick,
  theme,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  theme: AppTheme;
}) {
  return (
    <div
      className="sym-btn"
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "0.72rem",
        fontWeight: 800,
        color: active ? theme.accentText : theme.muted,
        background: active ? theme.accentSoft : "transparent",
        border: `1px solid ${active ? theme.accent + "44" : theme.border}`,
      }}
    >
      {label}
    </div>
  );
}

interface SymbolCardProps {
  theme: AppTheme;
  type: SymbolType;
  symbol: PerSymbolData;
  totalForOneArea: number;
  maxLevel: number;
  dailyMax: number;
  inputStyle: React.CSSProperties;
  updateSymbol: (areaName: string, patch: Partial<SymbolState>) => void;
  addDays: (days: number) => string;
}

export function SymbolCard({
  theme,
  type,
  symbol,
  totalForOneArea,
  maxLevel,
  dailyMax,
  inputStyle,
  updateSymbol,
  addDays,
}: SymbolCardProps) {
  const { area, state, days, levelMax, isMaxed, isTracked, consumed } = symbol;
  const isSacred = type === "sacred";
  const disabled = isSacred && !isTracked;
  const levelPct = isMaxed ? 100 : levelMax > 0 ? (state.current / levelMax) * 100 : 0;
  const areaPct = totalForOneArea > 0 ? (consumed / totalForOneArea) * 100 : 0;

  const disabledFade: React.CSSProperties = {
    opacity: disabled ? 0.4 : 1,
    transition: "opacity 0.15s",
  };

  const miniLabel: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: theme.muted,
    marginBottom: "3px",
  };

  return (
    <div
      style={{
        background: theme.timerBg,
        border: `1px solid ${isMaxed && isTracked ? theme.accent + "55" : theme.border}`,
        borderRadius: "14px",
        padding: "1rem",
        transition: "border-color 0.15s, opacity 0.15s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "0.75rem",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={area.icon}
          alt={area.name}
          width={38}
          height={38}
          style={{
            borderRadius: "8px",
            objectFit: "contain",
            flexShrink: 0,
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            padding: "2px",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "0.9rem",
              color: theme.text,
            }}
          >
            {area.name}
          </div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: theme.muted }}>
            Lv. {area.requiredLevel}+
          </div>
        </div>

        {isSacred && (
          <TogglePill
            active={isTracked}
            label={isTracked ? "Tracking" : "Not tracking"}
            onClick={() => updateSymbol(area.name, { enabled: !state.enabled })}
            theme={theme}
          />
        )}

        {isTracked && (
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: "6px",
              flexShrink: 0,
              whiteSpace: "nowrap",
              color: isMaxed ? "#fff" : days === Infinity ? "#e05a5a" : theme.accent,
              background: isMaxed ? theme.accent : theme.accentSoft,
            }}
          >
            {isMaxed ? "MAX" : days === Infinity ? "--" : `~${days}d`}
          </div>
        )}
      </div>

      {/* Level + Current */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "0.5rem",
          ...disabledFade,
        }}
      >
        <div style={{ flex: "0 0 auto" }}>
          <div style={miniLabel}>Level</div>
          <select
            value={state.level}
            disabled={disabled}
            onChange={(e) => {
              updateSymbol(area.name, { level: Number(e.target.value), current: 0 });
            }}
            style={{
              ...inputStyle,
              width: "70px",
              cursor: disabled ? "not-allowed" : "pointer",
              padding: "4px 6px",
              fontSize: "0.78rem",
            }}
          >
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}{lvl === maxLevel ? " (MAX)" : ""}
              </option>
            ))}
          </select>
        </div>

        {!isMaxed ? (
          <div style={{ flex: 1 }}>
            <div style={miniLabel}>Current / Needed</div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <input
                type="number"
                min={0}
                max={levelMax}
                value={state.current}
                disabled={disabled}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(levelMax, parseInt(e.target.value) || 0));
                  updateSymbol(area.name, { current: v });
                }}
                style={{
                  ...inputStyle,
                  width: "64px",
                  textAlign: "center",
                  padding: "4px 6px",
                  fontSize: "0.78rem",
                  cursor: disabled ? "not-allowed" : "text",
                }}
              />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
                / {levelMax.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.accent,
              textAlign: "center",
              padding: "8px 0",
            }}
          >
            Symbol Maxed
          </div>
        )}
      </div>

      {/* Level progress bar + Daily/Weekly controls */}
      {!isMaxed && (
        <>
          <div
            style={{
              height: "6px",
              borderRadius: "3px",
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              overflow: "hidden",
              marginBottom: "0.6rem",
              ...disabledFade,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${levelPct}%`,
                background: theme.accent,
                borderRadius: "3px",
                transition: "width 0.25s ease",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "0.6rem",
              ...disabledFade,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: theme.muted }}>
                Daily
              </span>
              <input
                type="number"
                min={0}
                max={dailyMax}
                value={state.daily}
                disabled={disabled}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(dailyMax, parseInt(e.target.value) || 0));
                  updateSymbol(area.name, { daily: v });
                }}
                style={{
                  ...inputStyle,
                  width: "52px",
                  textAlign: "center",
                  padding: "3px 4px",
                  fontSize: "0.75rem",
                  cursor: disabled ? "not-allowed" : "text",
                }}
              />
            </div>

            {!isSacred && (
              <TogglePill
                active={state.weeklyEnabled}
                label={`Weekly ${state.weeklyEnabled ? "120" : "OFF"}`}
                onClick={() => updateSymbol(area.name, { weeklyEnabled: !state.weeklyEnabled })}
                theme={theme}
              />
            )}
          </div>
        </>
      )}

      {/* Overall area progress + completion */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: theme.muted,
          ...disabledFade,
        }}
      >
        <span>{areaPct.toFixed(1)}% complete</span>
        {!isMaxed && isTracked && (
          <span
            style={{
              fontWeight: 800,
              color: days === Infinity ? "#e05a5a" : theme.accent,
            }}
          >
            {days === Infinity ? "No income set" : addDays(days)}
          </span>
        )}
      </div>
    </div>
  );
}
