"use client";

import { useMounted } from "../../../lib/useMounted";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { STATUS, statusText } from "../../../components/statusColors";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  BOSSES,
  BOSS_GROUPS,
  PRESETS,
} from "./bosses";
import { formatMesoFull } from "../format";
import {
  type BossRow,
  type CharacterEntry,
  type CharacterProgress,
  checkBg,
} from "./boss-crystals-types";
import { useBossCrystalsState } from "./useBossCrystalsState";
import { AddCharacterNameDialog } from "../AddCharacterNameDialog";
import { AddCharacterCard } from "../AddCharacterCard";
import { CardActions } from "../TrackerCard";
import { ToolDialog } from "../ToolDialog";
import { useCardReorder, type CardDragProps } from "../useCardReorder";
import { Z } from "../zIndex";
import { ConfirmButton } from "../../../components/ConfirmButton";

// -- Style helpers ------------------------------------------------------------

// 64px card-header avatar fallback (picker rows use CharacterPickerRow).
function bcAvatarFallbackStyle(theme: AppTheme): CSSProperties {
  return {
    width: 64,
    height: 64,
    borderRadius: "10px",
    background: theme.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    color: theme.accentText,
    fontWeight: 800,
    flexShrink: 0,
  };
}

// Colors only; static settings come from the `.tool-input` class.
function bcPresetBtnStyle(theme: AppTheme): CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 800,
    color: theme.accentText,
    background: theme.accentSoft,
    border: `1px solid ${theme.border}`,
  };
}

function bcClearPresetBtnStyle(theme: AppTheme): CSSProperties {
  return {
    marginLeft: "auto",
    padding: "5px 12px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 800,
    color: statusText(theme, "danger"),
    background: "transparent",
    border: `1px solid ${STATUS.danger.fill}33`,
  };
}

function bcSummaryBarStyle(theme: AppTheme): CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: Z.sticky,
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "14px",
    padding: "1rem 1.5rem",
    marginBottom: "1.25rem",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "1rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  };
}

function bcControlsPanelStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    alignItems: "center",
  };
}

// Colors from theme; compact sizing is context-specific (kept inline). Border,
// radius, font-family and cursor come from the `.tool-select` class.
function bcPartySizeSelectStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.timerBg,
    borderColor: theme.border,
    color: theme.text,
    padding: "2px 6px",
    fontSize: "0.75rem",
  };
}

const bcCheckboxBase: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 5,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, border-color 0.15s",
};

const bcCardCheckboxBase: CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: 4,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s, border-color 0.15s",
};

function bcSummaryLabelStyle(theme: AppTheme): CSSProperties {
  return {
    fontFamily: "var(--font-heading)",
    fontSize: "0.9rem",
    color: theme.text,
  };
}

function bcSummaryValueStyle(theme: AppTheme): CSSProperties {
  return {
    fontFamily: "var(--font-heading)",
    fontSize: "1.2rem",
    color: theme.accentText,
  };
}

function bcBossGroupLabelStyle(theme: AppTheme): CSSProperties {
  return {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "0.5rem 8px 0.15rem",
  };
}

// -- Sub-components -----------------------------------------------------------

function CharacterCard({
  theme,
  char,
  income,
  serverMult,
  pos,
  total,
  onMove,
  isDragging,
  isDropTarget,
  dragProps,
  onEdit,
  onDelete,
  onToggleCleared,
  onSetAllCleared,
}: {
  theme: AppTheme;
  char: CharacterEntry;
  income: CharacterProgress;
  serverMult: number;
  pos: number;
  total: number;
  onMove: (toPos: number) => void;
  isDragging: boolean;
  isDropTarget: boolean;
  dragProps: CardDragProps;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCleared: (bossIndex: number) => void;
  onSetAllCleared: (cleared: boolean) => void;
}) {
  const selected = char.bosses.flatMap((b, bi) =>
    b.checked ? [{ ...b, boss: BOSSES[bi], index: bi }] : [],
  );
  const allCleared = selected.length > 0 && selected.every((b) => b.cleared);

  // `muted` reads too dim in dark mode; lift the subtext halfway to `text` there.
  const subtitleRowStyle: CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 700,
    color:
      theme.colorMode === "dark"
        ? `color-mix(in srgb, ${theme.muted}, ${theme.text})`
        : theme.muted,
    whiteSpace: "nowrap",
    lineHeight: 1.4,
  };

  return (
    <div
      className="fade-in bc-card panel-card"
      {...dragProps}
      style={{
        background: theme.panel,
        border: `1px solid ${isDropTarget ? theme.accent : theme.border}`,
        borderRadius: "14px",
        padding: "1.25rem",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {/* Character header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        {char.imageURL ? (
          <Image
            src={char.imageURL}
            alt={char.name}
            width={64}
            height={64}
            unoptimized
            style={{
              borderRadius: "10px",
              background: theme.timerBg,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={bcAvatarFallbackStyle(theme)}>
            {char.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + actions on one row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                fontWeight: 800,
                color: theme.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {char.name}
            </div>
            <CardActions
              theme={theme}
              pos={pos}
              total={total}
              onMove={onMove}
              label={char.name}
              onDelete={onDelete}
              onEdit={onEdit}
              editTitle="Edit bosses"
              allDone={allCleared}
              onToggleAll={onSetAllCleared}
              toggleOnTitle="Mark all bosses cleared"
              toggleOffTitle="Unmark all bosses"
            />
          </div>
          {/* Crystal count and meso count, one per row */}
          <div style={subtitleRowStyle}>
            {income.crystals}/14
            {income.monthlyCrystals > 0 ? ` +${income.monthlyCrystals}` : ""} crystals
          </div>
          <div style={subtitleRowStyle}>{formatMesoFull(income.meso)} mesos</div>
        </div>
      </div>

      {/* Boss list */}
      <div
        style={{
          borderTop: `1px solid ${theme.border}`,
          paddingTop: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        {selected.length === 0 ? (
          <div
            style={{
              fontSize: "0.75rem",
              color: theme.muted,
              fontStyle: "italic",
              padding: "0.25rem 0",
            }}
          >
            No bosses selected
          </div>
        ) : (
          selected.map((b) => (
            <div
              key={b.boss.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.75rem",
                color: theme.text,
                fontWeight: 600,
                padding: "1.5px 0",
              }}
            >
              <button
                type="button"
                className="btn-reset bc-btn"
                aria-pressed={!!b.cleared}
                onClick={() => onToggleCleared(b.index)}
                title={b.cleared ? "Mark as not cleared" : "Mark as cleared this week"}
                style={{
                  ...bcCardCheckboxBase,
                  border: `2px solid ${b.cleared ? theme.accent : theme.border}`,
                  background: b.cleared ? theme.accent : "transparent",
                }}
              >
                {b.cleared && (
                  <span style={{ color: theme.accentOn, fontSize: "0.6rem", fontWeight: 900, lineHeight: 1 }}>
                    ✓
                  </span>
                )}
              </button>
              <Image
                src={b.boss.icon}
                alt=""
                width={18}
                height={18}
                unoptimized
                style={{
                  borderRadius: "3px",
                  objectFit: "cover",
                  flexShrink: 0,
                  opacity: b.cleared ? 0.55 : 1,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  textDecoration: b.cleared ? "line-through" : "none",
                  color: b.cleared ? theme.muted : theme.text,
                }}
              >
                {b.boss.name}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: theme.muted,
                  marginLeft: "4px",
                  flexShrink: 0,
                }}
              >
                {b.partySize > 1 ? `${b.partySize}p · ` : ""}
                {formatMesoFull(b.boss.meso / b.partySize / serverMult)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BossSelectionDialog({
  theme,
  title,
  serverMult,
  bosses,
  disabled,
  preview,
  showBack,
  confirmLabel,
  onToggle,
  onPartyChange,
  onPreset,
  onBack,
  onCancel,
  onConfirm,
}: {
  theme: AppTheme;
  title: string;
  serverMult: number;
  bosses: BossRow[];
  disabled: Set<number>;
  preview: { meso: number; crystals: number; monthlyCrystals: number };
  showBack: boolean;
  confirmLabel: string;
  onToggle: (bi: number) => void;
  onPartyChange: (bi: number, val: number) => void;
  onPreset: (key: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogActionBtnStyle = (variant: "secondary" | "primary"): CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "10px",
    fontSize: "0.82rem",
    fontWeight: 800,
    color: variant === "primary" ? theme.accentText : theme.muted,
    background: variant === "primary" ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${variant === "primary" ? theme.accent : theme.border}`,
  });

  const footer = (
    <>
      {showBack && (
        <button
          type="button"
          className="btn-reset bc-btn"
          onClick={onBack}
          style={{ ...dialogActionBtnStyle("secondary"), marginRight: "auto" }}
        >
          Back
        </button>
      )}
      <button
        type="button"
        className="btn-reset bc-btn"
        onClick={onCancel}
        style={dialogActionBtnStyle("secondary")}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn-reset bc-btn"
        onClick={onConfirm}
        style={dialogActionBtnStyle("primary")}
      >
        {confirmLabel}
      </button>
    </>
  );

  return (
    <ToolDialog theme={theme} title={title} onClose={onCancel} footer={footer}>
      {/* Presets */}
      <div
        className="bc-presets"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          flexWrap: "wrap",
          marginBottom: "0.75rem",
          paddingBottom: "0.75rem",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <span
          className="bc-presets-label"
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            color: theme.muted,
            marginRight: "0.25rem",
          }}
        >
          Presets
        </span>
        {PRESETS.flatMap((p) => p.key === "" ? [] : [(
          <button
            key={p.key}
            type="button"
            className="btn-reset bc-btn bc-preset-btn"
            onClick={() => onPreset(p.key)}
            style={bcPresetBtnStyle(theme)}
          >
            {p.label}
          </button>
        )])}
        <button
          type="button"
          className="btn-reset bc-btn bc-preset-btn bc-preset-clear"
          onClick={() => onPreset("")}
          style={bcClearPresetBtnStyle(theme)}
        >
          Clear
        </button>
      </div>

      {/* Boss groups */}
      <div
        className="tool-dialog-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: "auto", marginBottom: "0.75rem" }}
      >
        {BOSS_GROUPS.map((group) => (
          <div key={group.label}>
            {group.bossIndices.length > 1 && group.label !== "Cygnus" && (
              <div style={bcBossGroupLabelStyle(theme)}>
                {group.label}
              </div>
            )}
            {group.bossIndices.map((bi) => {
              const boss = BOSSES[bi];
              const row = bosses[bi];
              const isDisabled = disabled.has(bi);
              const maxParty = boss.name === "Lotus (Extreme)" ? 2 : 6;
              const checked = row.checked && !isDisabled;

              return (
                <div
                  key={boss.name}
                  className="bc-boss-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                >
                  <button
                    type="button"
                    className="btn-reset"
                    aria-pressed={checked}
                    disabled={isDisabled}
                    onClick={() => onToggle(bi)}
                    style={{
                      ...bcCheckboxBase,
                      border: `2px solid ${checked ? theme.accent : theme.border}`,
                      background: checkBg(isDisabled, row.checked, theme.accent, theme.timerBg),
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {checked && (
                      <span style={{ color: theme.accentOn, fontSize: "0.75rem", fontWeight: 900 }}>
                        ✓
                      </span>
                    )}
                  </button>
                  <Image
                    src={boss.icon}
                    alt=""
                    width={22}
                    height={22}
                    unoptimized
                    style={{
                      borderRadius: "4px",
                      objectFit: "cover",
                      flexShrink: 0,
                      background: theme.panel,
                    }}
                  />
                  <button
                    type="button"
                    className="btn-reset"
                    disabled={isDisabled}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: theme.text,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                    onClick={() => onToggle(bi)}
                  >
                    {boss.name}
                  </button>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: theme.muted,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatMesoFull(boss.meso / serverMult)}
                  </span>
                  {checked && (
                    <select
                      value={row.partySize}
                      onChange={(e) => onPartyChange(bi, parseInt(e.target.value))}
                      className="tool-select"
                      style={bcPartySizeSelectStyle(theme)}
                    >
                      {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n === 1 ? "1 person" : `${n} people`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Preview */}
      <div
        style={{
          paddingTop: "0.75rem",
          borderTop: `1px solid ${theme.border}`,
          fontSize: "0.82rem",
          fontWeight: 700,
          color: theme.text,
        }}
      >
        <span
          style={{
            color: preview.crystals >= 14 ? theme.accentText : theme.muted,
          }}
        >
          {preview.crystals}/14
          {preview.monthlyCrystals > 0 ? ` +${preview.monthlyCrystals}` : ""}
        </span>
        {" crystals · "}
        <span style={{ color: theme.accentText }}>{formatMesoFull(preview.meso)}</span>
        {" mesos"}
      </div>
    </ToolDialog>
  );
}

// -- Extracted Sections -------------------------------------------------------

function BossCrystalsControls({
  theme,
  server,
  setServer,
  onClear,
  exportXlsx,
}: {
  theme: AppTheme;
  server: string;
  setServer: (s: string) => void;
  onClear: () => void;
  exportXlsx: () => void;
}) {
  return (
    <div className="fade-in panel-card bc-controls" style={bcControlsPanelStyle(theme)}>
      <div
        className="bc-server-group"
        style={{
          display: "flex",
          gap: "4px",
          background: theme.timerBg,
          borderRadius: "10px",
          padding: "3px",
          border: `1px solid ${theme.border}`,
        }}
      >
        {(["heroic", "interactive"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className="btn-reset bc-btn bc-server-opt"
            onClick={() => setServer(s)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 800,
              textAlign: "center",
              color: server === s ? theme.accentText : theme.muted,
              background: server === s ? theme.accentSoft : "transparent",
            }}
          >
            {s === "heroic" ? "Heroic" : "Interactive"}
          </button>
        ))}
      </div>
      <div className="bc-actions" style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
        <ConfirmButton
          theme={theme}
          label="Clear"
          title="Wipe all bosses?"
          message="This removes every character and their tracked bosses. This can't be undone."
          confirmLabel="Wipe all"
          onConfirm={onClear}
          className="bc-btn bc-action-btn"
          style={{ padding: "6px 14px", borderRadius: "10px", fontSize: "0.78rem", textAlign: "center" }}
        />
        <button
          type="button"
          className="btn-reset bc-btn bc-action-btn"
          onClick={exportXlsx}
          style={{
            padding: "6px 14px",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontWeight: 800,
            textAlign: "center",
            color: theme.accentText,
            background: "transparent",
            border: `1px solid ${theme.border}`,
          }}
        >
          Export
        </button>
      </div>
    </div>
  );
}

function BossCrystalsSummary({
  theme,
  totalWeeklyMeso,
  totalMonthlyMeso,
  totalCrystals,
  clearedMeso,
  clearedCrystals,
}: {
  theme: AppTheme;
  totalWeeklyMeso: number;
  totalMonthlyMeso: number;
  totalCrystals: number;
  clearedMeso: number;
  clearedCrystals: number;
}) {
  const allCleared = totalCrystals > 0 && clearedCrystals >= totalCrystals;
  const overCap = totalCrystals > 180;
  return (
    <div className="fade-in bc-summary" style={bcSummaryBarStyle(theme)}>
      <div className="bc-weekly" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div className="bc-summary-headline" style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
          <span style={bcSummaryLabelStyle(theme)}>Weekly:</span>
          <span className="bc-summary-value" style={bcSummaryValueStyle(theme)}>{formatMesoFull(totalWeeklyMeso)} mesos</span>
          {totalMonthlyMeso > 0 && (
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.muted }}>
              + {formatMesoFull(totalMonthlyMeso)} mesos (monthly)
            </span>
          )}
        </div>
        <div
          className="bc-pill"
          style={{
            padding: "4px 12px",
            borderRadius: "10px",
            background: overCap ? `${STATUS.danger.fill}22` : theme.accentSoft,
            fontSize: "0.78rem",
            fontWeight: 800,
            whiteSpace: "nowrap",
            color: overCap ? statusText(theme, "danger") : theme.accentText,
          }}
        >
          {totalCrystals} / 180 crystals
        </div>
      </div>
      {clearedCrystals > 0 && (
        <div className="bc-progress" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="bc-summary-headline" style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
            <span style={bcSummaryLabelStyle(theme)}>Weekly Progress:</span>
            <span className="bc-summary-value" style={bcSummaryValueStyle(theme)}>{formatMesoFull(clearedMeso)} mesos</span>
          </div>
          <div
            className="bc-pill"
            style={{
              padding: "4px 12px",
              borderRadius: "10px",
              background: allCleared ? theme.accent : theme.accentSoft,
              fontSize: "0.78rem",
              fontWeight: 800,
              whiteSpace: "nowrap",
              color: allCleared ? theme.accentOn : theme.accentText,
            }}
          >
            {clearedCrystals} / {totalCrystals} crystals
          </div>
        </div>
      )}
    </div>
  );
}

function BossCrystalsEmptyState({ theme, server }: { theme: AppTheme; server: string }) {
  return (
    <div
      className="fade-in panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "1.5rem",
        marginBottom: "1.25rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.text, marginBottom: "0.35rem" }}>
        No {server === "heroic" ? "Heroic" : "Interactive"} characters yet
      </div>
      <div style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 600 }}>
        Add a character to start tracking weekly boss crystals and meso income. Your totals appear here once you do.
      </div>
    </div>
  );
}

// -- Main Component -----------------------------------------------------------

export default function BossCrystalsWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const {
    server, setServer, visibleCharacters,
    totalWeeklyMeso, totalMonthlyMeso, totalCrystals, clearedMeso, clearedCrystals, serverMult,
    dialog, dialogBosses, dialogDisabled, dialogPreview,
    dialogTitle, showBossDialog, pendingName,
    nameMode, setNameMode, typedName, setTypedName,
    selectedStoreChar, setSelectedStoreChar, availableStoreChars,
    openAdd, proceedToBosses, confirmAdd, openEdit, confirmEdit,
    deleteCharacter, toggleBossCleared, setAllBossesCleared, reorderCharacters, toggleDialogBoss, setDialogParty, applyPreset,
    clearData, closeDialog, goBackToAddName, exportXlsx,
  } = useBossCrystalsState(mounted);

  const { dragProps, isDragging, isDropTarget } = useCardReorder(reorderCharacters);

  // -- Render -----------------------------------------------------------------

  if (!mounted) return null;

  return (
    <>
      <style>{`
        .bc-card { transition: box-shadow 0.15s, opacity 0.15s, border-color 0.15s; }
        .bc-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .bc-btn { transition: background 0.15s; cursor: pointer; user-select: none; }
        .bc-boss-row:hover { background: ${theme.accentSoft} !important; }
        @media (max-width: 860px) {
          .bc-server-group { width: 100%; }
          .bc-server-opt { flex: 1; }
          .bc-actions { margin-left: 0 !important; width: 100%; }
          .bc-action-btn { flex: 1; }
          .bc-summary { padding: 0.85rem 1rem !important; gap: 0.85rem !important; }
          .bc-weekly, .bc-progress {
            width: 100%;
            margin-left: 0 !important;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.1rem;
          }
          .bc-summary-value { font-size: 1.15rem !important; }
          .bc-pill {
            padding: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            font-size: 0.8rem !important;
            font-weight: 700 !important;
            color: ${theme.muted} !important;
          }
          .bc-presets-label { width: 100%; margin-right: 0 !important; margin-bottom: 0.1rem; }
          .bc-preset-btn { flex: 1 1 28%; margin-left: 0 !important; text-align: center; }
        }
      `}</style>

      <div className="page-content">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ToolHeader
            theme={theme}
            title="Boss Crystal Tracker"
            description="Select your server type, add characters, and check off the bosses you clear each week to track your meso income."
          />

          <BossCrystalsControls
            theme={theme}
            server={server}
            setServer={setServer}
            onClear={clearData}
            exportXlsx={exportXlsx}
          />

          {visibleCharacters.length > 0 ? (
            <BossCrystalsSummary
              theme={theme}
              totalWeeklyMeso={totalWeeklyMeso}
              totalMonthlyMeso={totalMonthlyMeso}
              totalCrystals={totalCrystals}
              clearedMeso={clearedMeso}
              clearedCrystals={clearedCrystals}
            />
          ) : (
            <BossCrystalsEmptyState theme={theme} server={server} />
          )}

          {/* Card grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            {visibleCharacters.map(({ char, index, income }, pos) => (
              <CharacterCard
                key={char.name}
                theme={theme}
                char={char}
                income={income}
                serverMult={serverMult}
                pos={pos}
                total={visibleCharacters.length}
                onMove={(to) => reorderCharacters(index, visibleCharacters[to].index)}
                isDragging={isDragging(index)}
                isDropTarget={isDropTarget(index)}
                dragProps={dragProps(index)}
                onEdit={() => openEdit(index)}
                onDelete={() => deleteCharacter(index)}
                onToggleCleared={(bi) => toggleBossCleared(index, bi)}
                onSetAllCleared={(cleared) => setAllBossesCleared(index, cleared)}
              />
            ))}

            {/* Add character card */}
            <AddCharacterCard theme={theme} onClick={openAdd} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {dialog?.type === "add-name" && (
        <AddCharacterNameDialog
          theme={theme}
          available={availableStoreChars}
          nameMode={nameMode}
          onNameMode={(m) => {
            setNameMode(m);
            if (m === "type") setSelectedStoreChar(null);
            else setTypedName("");
          }}
          typedName={typedName}
          onTypedName={setTypedName}
          selectedChar={selectedStoreChar}
          onSelectedChar={setSelectedStoreChar}
          pendingName={pendingName}
          onNext={proceedToBosses}
          onClose={closeDialog}
        />
      )}

      {showBossDialog && (
        <BossSelectionDialog
          theme={theme}
          title={dialogTitle}
          serverMult={serverMult}
          bosses={dialogBosses}
          disabled={dialogDisabled}
          preview={dialogPreview}
          showBack={dialog?.type === "add-bosses"}
          confirmLabel={dialog?.type === "add-bosses" ? "Add" : "Save"}
          onToggle={toggleDialogBoss}
          onPartyChange={setDialogParty}
          onPreset={applyPreset}
          onBack={goBackToAddName}
          onCancel={closeDialog}
          onConfirm={dialog?.type === "add-bosses" ? confirmAdd : confirmEdit}
        />
      )}
    </>
  );
}
