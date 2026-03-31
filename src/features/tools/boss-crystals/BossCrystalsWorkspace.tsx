"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  BOSSES,
  BOSS_GROUPS,
  SHARED_INDICES,
  PRESETS,
  formatMeso,
} from "./bosses";
import { generateXlsx, downloadBlob, colLetter, type Cell, type FormulaCell } from "./xlsx-export";
import {
  readCharactersStore,
  selectCharactersList,
} from "../../characters/model/charactersStore";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";

// -- Types --------------------------------------------------------------------

interface BossRow {
  checked: boolean;
  partySize: number;
}

interface CharacterEntry {
  name: string;
  imageURL: string | null;
  bosses: BossRow[];
}

type DialogState =
  | null
  | { type: "add-name" }
  | { type: "add-bosses"; name: string; imageURL: string | null }
  | { type: "edit"; index: number };

// -- Helpers ------------------------------------------------------------------

function createBosses(preset: string): BossRow[] {
  return BOSSES.map((b) => ({
    checked: !!(b.preset && b.preset.includes(preset)),
    partySize: 1,
  }));
}

function getDisabledSet(bosses: BossRow[]): Set<number> {
  const disabled = new Set<number>();
  for (let i = 0; i < bosses.length; i++) {
    if (bosses[i].checked) {
      for (const idx of SHARED_INDICES[i]) disabled.add(idx);
    }
  }
  return disabled;
}

function calcCharacterIncome(
  bosses: BossRow[],
  server: string,
): { meso: number; crystals: number } {
  const mult = server === "heroic" ? 1 : 5;
  const values: number[] = [];
  for (let i = 0; i < bosses.length; i++) {
    if (!bosses[i].checked) continue;
    values.push(BOSSES[i].meso / bosses[i].partySize);
  }
  values.sort((a, b) => b - a);
  const top14 = values.slice(0, 14);
  let total = 0;
  for (const v of top14) total += v / mult;
  return { meso: Math.floor(total), crystals: top14.length };
}

function checkBg(disabled: boolean, checked: boolean, accent: string, timerBg: string): string {
  if (disabled) return timerBg;
  if (checked) return accent;
  return "transparent";
}

// -- Storage ------------------------------------------------------------------

const STORAGE_KEY = "boss-crystals-v2";

interface SavedState {
  server: string;
  characters?: CharacterEntry[];
  columns?: { name: string; bosses: BossRow[] }[];
}

function loadState(): { server: string; characters: CharacterEntry[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: SavedState = JSON.parse(raw);
    const chars = parsed.characters ?? parsed.columns;
    if (!chars) return null;
    return {
      server: parsed.server,
      characters: chars.map((c) => ({
        name: c.name,
        imageURL: "imageURL" in c ? (c as CharacterEntry).imageURL : null,
        bosses: BOSSES.map((_, i) => {
          const s = c.bosses[i];
          return s
            ? { checked: s.checked, partySize: s.partySize }
            : { checked: false, partySize: 1 };
        }),
      })),
    };
  } catch {
    return null;
  }
}

function saveState(server: string, characters: CharacterEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ server, characters }));
}

// -- Sub-components -----------------------------------------------------------

function CharacterCard({
  theme,
  char,
  income,
  serverMult,
  onEdit,
  onDelete,
}: {
  theme: AppTheme;
  char: CharacterEntry;
  income: { meso: number; crystals: number };
  serverMult: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const selected = char.bosses
    .map((b, bi) => ({ ...b, boss: BOSSES[bi] }))
    .filter((b) => b.checked);

  return (
    <div
      className="fade-in bc-card panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        padding: "1.25rem",
        position: "relative",
      }}
    >
      {/* Top-right actions */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          right: "0.75rem",
          display: "flex",
          gap: "4px",
        }}
      >
        <div
          className="bc-btn"
          onClick={onDelete}
          title="Remove character"
          style={{
            padding: "5px 7px",
            borderRadius: "8px",
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            fontSize: "0.65rem",
            fontWeight: 800,
            color: "#e05a5a",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </div>
        <div
          className="bc-btn"
          onClick={onEdit}
          title="Edit bosses"
          style={{
            padding: "5px",
            borderRadius: "8px",
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill={theme.muted}>
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </div>
      </div>

      {/* Character header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.75rem",
          paddingRight: "4rem",
        }}
      >
        {char.imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={char.imageURL}
            alt={char.name}
            width={48}
            height={48}
            style={{
              borderRadius: "10px",
              background: theme.timerBg,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "10px",
              background: theme.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              color: theme.accent,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {char.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.95rem",
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {char.name}
          </div>
          <div style={{ fontSize: "0.72rem", color: theme.muted, fontWeight: 700 }}>
            {income.crystals}/14 crystals · {formatMeso(income.meso)} mesos
          </div>
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
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.72rem",
                color: theme.text,
                fontWeight: 600,
                padding: "1.5px 0",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {b.boss.name}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: theme.muted,
                  marginLeft: "4px",
                  flexShrink: 0,
                }}
              >
                {b.partySize > 1 ? `${b.partySize}p · ` : ""}
                {formatMeso(b.boss.meso / b.partySize / serverMult)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddNameDialog({
  theme,
  available,
  nameMode,
  onNameMode,
  typedName,
  onTypedName,
  selectedChar,
  onSelectedChar,
  pendingName,
  onNext,
  onClose,
}: {
  theme: AppTheme;
  available: StoredCharacterRecord[];
  nameMode: "type" | "select";
  onNameMode: (m: "type" | "select") => void;
  typedName: string;
  onTypedName: (v: string) => void;
  selectedChar: StoredCharacterRecord | null;
  onSelectedChar: (c: StoredCharacterRecord) => void;
  pendingName: string;
  onNext: () => void;
  onClose: () => void;
}) {
  const hasAvailable = available.length > 0;

  return (
    <div className="bc-overlay" onClick={onClose}>
      <div
        className="bc-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "1.5rem" }}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: "1.25rem",
          }}
        >
          Add Character
        </div>

        {hasAvailable ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="bc-name-mode"
                checked={nameMode === "type"}
                onChange={() => onNameMode("type")}
                style={{ accentColor: theme.accent }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
                Type a name
              </span>
            </label>
            {nameMode === "type" && (
              <input
                type="text"
                placeholder="Character name"
                maxLength={14}
                value={typedName}
                onChange={(e) => onTypedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && typedName.trim()) onNext();
                }}
                autoFocus
                className="tool-input"
                style={{
                  background: theme.timerBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: theme.text,
                  fontSize: "0.85rem",
                  width: "calc(100% - 1.5rem)",
                  marginLeft: "1.5rem",
                  outline: "none",
                }}
              />
            )}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="bc-name-mode"
                checked={nameMode === "select"}
                onChange={() => onNameMode("select")}
                style={{ accentColor: theme.accent }}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
                Select from imported characters
              </span>
            </label>
            {nameMode === "select" && (
              <div
                style={{
                  marginLeft: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  maxHeight: "40vh",
                  overflowY: "auto",
                }}
              >
                {available.map((c) => {
                  const isSelected = selectedChar?.characterName === c.characterName;
                  return (
                    <div
                      key={c.characterName}
                      className="bc-char-opt"
                      onClick={() => onSelectedChar(c)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: isSelected ? theme.accentSoft : theme.timerBg,
                        border: `1px solid ${isSelected ? theme.accent : theme.border}`,
                      }}
                    >
                      {c.characterImgURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.characterImgURL}
                          alt={c.characterName}
                          width={32}
                          height={32}
                          style={{
                            borderRadius: "6px",
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "6px",
                            background: theme.accentSoft,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color: theme.accent,
                            flexShrink: 0,
                          }}
                        >
                          {c.characterName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>
                          {c.characterName}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: theme.muted }}>
                          Lv.{c.level} {c.jobName}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: "1.25rem" }}>
            <input
              type="text"
              placeholder="Character name"
              maxLength={14}
              value={typedName}
              onChange={(e) => onTypedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && typedName.trim()) onNext();
              }}
              autoFocus
              className="tool-input"
              style={{
                background: theme.timerBg,
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: theme.text,
                fontSize: "0.85rem",
                width: "100%",
                outline: "none",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <div
            className="bc-btn"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.muted,
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
            }}
          >
            Cancel
          </div>
          <div
            className="bc-btn"
            onClick={pendingName ? onNext : undefined}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: pendingName ? theme.accentText : theme.muted,
              background: pendingName ? theme.accentSoft : theme.timerBg,
              border: `1px solid ${pendingName ? theme.accent : theme.border}`,
              opacity: pendingName ? 1 : 0.5,
              cursor: pendingName ? "pointer" : "not-allowed",
            }}
          >
            Next
          </div>
        </div>
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
  preview: { meso: number; crystals: number };
  showBack: boolean;
  confirmLabel: string;
  onToggle: (bi: number) => void;
  onPartyChange: (bi: number, val: number) => void;
  onPreset: (key: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="bc-overlay" onClick={onCancel}>
      <div
        className="bc-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "1.5rem" }}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: "0.5rem",
          }}
        >
          {title}
        </div>

        {/* Presets */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            marginBottom: "0.75rem",
            paddingBottom: "0.75rem",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          {PRESETS.map((p) => (
            <div
              key={p.key}
              className="bc-btn"
              onClick={() => onPreset(p.key)}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                fontSize: "0.72rem",
                fontWeight: 800,
                color: theme.accentText,
                background: theme.accentSoft,
                border: `1px solid ${theme.border}`,
              }}
            >
              {p.label}
            </div>
          ))}
        </div>

        {/* Boss groups */}
        <div style={{ maxHeight: "50vh", overflowY: "auto", marginBottom: "0.75rem" }}>
          {BOSS_GROUPS.map((group) => (
            <div key={group.label}>
              {group.bossIndices.length > 1 && group.label !== "Cygnus" && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: theme.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "0.5rem 8px 0.15rem",
                  }}
                >
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
                    <div
                      onClick={() => {
                        if (!isDisabled) onToggle(bi);
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        border: `2px solid ${checked ? theme.accent : theme.border}`,
                        background: checkBg(isDisabled, row.checked, theme.accent, theme.timerBg),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {checked && (
                        <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 900 }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: theme.text,
                        cursor: isDisabled ? "not-allowed" : "pointer",
                      }}
                      onClick={() => {
                        if (!isDisabled) onToggle(bi);
                      }}
                    >
                      {boss.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: theme.muted,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMeso(boss.meso / serverMult)}
                    </span>
                    {checked && (
                      <select
                        value={row.partySize}
                        onChange={(e) => onPartyChange(bi, parseInt(e.target.value))}
                        className="tool-input"
                        style={{
                          background: theme.timerBg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: "6px",
                          padding: "2px 4px",
                          color: theme.text,
                          fontSize: "0.72rem",
                          width: "44px",
                          cursor: "pointer",
                        }}
                      >
                        {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}p
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
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              color: preview.crystals >= 14 ? theme.accent : theme.muted,
            }}
          >
            {preview.crystals}/14
          </span>
          {" crystals · "}
          <span style={{ color: theme.accent }}>{formatMeso(preview.meso)}</span>
          {" mesos"}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          {showBack && (
            <div
              className="bc-btn"
              onClick={onBack}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: 800,
                color: theme.muted,
                background: theme.timerBg,
                border: `1px solid ${theme.border}`,
              }}
            >
              Back
            </div>
          )}
          <div
            className="bc-btn"
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.muted,
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
            }}
          >
            Cancel
          </div>
          <div
            className="bc-btn"
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 800,
              color: theme.accentText,
              background: theme.accentSoft,
              border: `1px solid ${theme.accent}`,
            }}
          >
            {confirmLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Main Component -----------------------------------------------------------

export default function BossCrystalsWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const [server, setServer] = useState("heroic");
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const loadedRef = useRef<true | null>(null);

  // Dialog state
  const [dialog, setDialog] = useState<DialogState>(null);
  const [nameMode, setNameMode] = useState<"type" | "select">("type");
  const [typedName, setTypedName] = useState("");
  const [selectedStoreChar, setSelectedStoreChar] = useState<StoredCharacterRecord | null>(null);
  const [dialogBosses, setDialogBosses] = useState<BossRow[]>(() => createBosses(""));

  // Load from localStorage — uses the allowed null-ref-check pattern
  if (loadedRef.current == null) {
    if (mounted) {
      loadedRef.current = true;
      const saved = loadState();
      if (saved) {
        setServer(saved.server);
        setCharacters(saved.characters);
      }
    }
  }

  // Persist on change (ref access in effects is fine — runs after render)
  useEffect(() => {
    if (loadedRef.current != null) saveState(server, characters);
  }, [server, characters]);

  // -- Calculations --
  const charIncomes = useMemo(
    () => characters.map((c) => calcCharacterIncome(c.bosses, server)),
    [characters, server],
  );
  let totalMeso = 0;
  let totalCrystals = 0;
  for (const income of charIncomes) {
    totalMeso += income.meso;
    totalCrystals += income.crystals;
  }
  const serverMult = server === "heroic" ? 1 : 5;

  // Available imported characters (not yet added)
  const usedNames = useMemo(
    () => new Set(characters.map((c) => c.name.toLowerCase())),
    [characters],
  );
  const availableStoreChars = useMemo(() => {
    if (!mounted) return [];
    const all = selectCharactersList(readCharactersStore());
    return all.filter((c) => !usedNames.has(c.characterName.toLowerCase()));
  }, [mounted, usedNames]);

  // Dialog computed
  const dialogDisabled = useMemo(() => getDisabledSet(dialogBosses), [dialogBosses]);
  const dialogPreview = useMemo(
    () => calcCharacterIncome(dialogBosses, server),
    [dialogBosses, server],
  );
  const pendingName =
    nameMode === "type" ? typedName.trim() : (selectedStoreChar?.characterName ?? "");

  let dialogTitle = "";
  if (dialog?.type === "add-bosses") dialogTitle = `Select Bosses \u2014 ${dialog.name}`;
  else if (dialog?.type === "edit") dialogTitle = `Edit Bosses \u2014 ${characters[dialog.index]?.name ?? ""}`;

  const showBossDialog = dialog?.type === "add-bosses" || dialog?.type === "edit";

  // -- Dialog handlers --
  const openAdd = useCallback(() => {
    setNameMode("type");
    setTypedName("");
    setSelectedStoreChar(null);
    setDialog({ type: "add-name" });
  }, []);

  const proceedToBosses = useCallback(() => {
    if (!pendingName) return;
    const imageURL =
      nameMode === "select" ? (selectedStoreChar?.characterImgURL ?? null) : null;
    setDialogBosses(createBosses(""));
    setDialog({ type: "add-bosses", name: pendingName, imageURL });
  }, [pendingName, nameMode, selectedStoreChar]);

  const confirmAdd = useCallback(() => {
    if (dialog?.type !== "add-bosses") return;
    setCharacters((prev) => [
      ...prev,
      { name: dialog.name, imageURL: dialog.imageURL, bosses: dialogBosses },
    ]);
    setDialog(null);
  }, [dialog, dialogBosses]);

  const openEdit = useCallback(
    (idx: number) => {
      setDialogBosses(characters[idx].bosses.map((b) => ({ ...b })));
      setDialog({ type: "edit", index: idx });
    },
    [characters],
  );

  const confirmEdit = useCallback(() => {
    if (dialog?.type !== "edit") return;
    const idx = dialog.index;
    setCharacters((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, bosses: dialogBosses } : c)),
    );
    setDialog(null);
  }, [dialog, dialogBosses]);

  const deleteCharacter = useCallback((idx: number) => {
    setCharacters((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const toggleDialogBoss = useCallback((bi: number) => {
    setDialogBosses((prev) => {
      const next = prev.map((b) => ({ ...b }));
      next[bi].checked = !next[bi].checked;
      return next;
    });
  }, []);

  const setDialogParty = useCallback((bi: number, val: number) => {
    setDialogBosses((prev) => {
      const next = prev.map((b) => ({ ...b }));
      next[bi].partySize = val;
      return next;
    });
  }, []);

  const applyPreset = useCallback((key: string) => {
    setDialogBosses(createBosses(key));
  }, []);

  const clearData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setServer("heroic");
    setCharacters([]);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  // -- Export (same spreadsheet format) --
  const exportXlsx = useCallback(() => {
    if (characters.length === 0) return;
    const mult = server === "heroic" ? 1 : 5;
    const f = (formula: string, array?: boolean): FormulaCell => ({ formula, array });
    const rows: Cell[][] = [];
    const firstDataRow = 2;
    const lastBossRow = firstDataRow + BOSSES.length - 1;

    rows.push(["Boss", "Mesos", ...characters.map((c, i) => c.name || `Character ${i + 1}`)]);

    for (let bi = 0; bi < BOSSES.length; bi++) {
      const boss = BOSSES[bi];
      const row: Cell[] = [boss.name, Math.floor(boss.meso / mult)];
      for (const col of characters) {
        const br = col.bosses[bi];
        row.push(br.checked ? br.partySize : null);
      }
      rows.push(row);
    }

    rows.push([]);
    const charTotalRowIdx = rows.length;
    {
      const ks = "{1,2,3,4,5,6,7,8,9,10,11,12,13,14}";
      const row: Cell[] = ["Character Total", null];
      for (let ci = 0; ci < characters.length; ci++) {
        const cc = colLetter(2 + ci);
        const range = `${cc}${firstDataRow}:${cc}${lastBossRow}`;
        const mesos = `B${firstDataRow}:B${lastBossRow}`;
        row.push(f(`SUM(LARGE(IF(${range}<>"",${mesos}/${range},0),${ks}))`, true));
      }
      rows.push(row);
    }

    rows.push([]);
    rows.push(["Weekly Income Summary", null]);
    rows.push([]);
    rows.push(["Bossing", null]);

    for (let ci = 0; ci < characters.length; ci++) {
      const cc = colLetter(2 + ci);
      const charName = characters[ci].name || `Character ${ci + 1}`;
      const income = calcCharacterIncome(characters[ci].bosses, server);
      rows.push([charName, f(`${cc}${charTotalRowIdx + 1}`), `Crystals: ${income.crystals}`]);
    }

    rows.push([]);
    {
      const charTotalCells = characters
        .map((_, ci) => `${colLetter(2 + ci)}${charTotalRowIdx + 1}`)
        .join("+");
      let tc = 0;
      for (const col of characters) tc += calcCharacterIncome(col.bosses, server).crystals;
      rows.push(["Total", f(charTotalCells), `Crystals: ${tc} / 180`]);
    }

    const colWidths = [34, 22, ...characters.map(() => 22)];
    const xlsx = generateXlsx([{ name: "Boss Crystals", rows, colWidths }]);
    downloadBlob(xlsx, "boss-crystals.xlsx");
  }, [server, characters]);

  // -- Render -----------------------------------------------------------------

  return (
    <>
      <style>{`
        .bc-card { transition: box-shadow 0.15s, transform 0.15s; }
        .bc-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .bc-btn { transition: background 0.15s, transform 0.1s; cursor: pointer; user-select: none; }
        .bc-btn:hover { transform: translateY(-1px); }
        .bc-btn:active { transform: translateY(0); }
        .bc-add-card { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
        .bc-add-card:hover { border-color: ${theme.accent} !important; background: ${theme.accentSoft} !important; }
        .bc-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .bc-dialog { background: ${theme.panel}; border: 1px solid ${theme.border}; border-radius: 16px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
        .bc-boss-row:hover { background: ${theme.accentSoft} !important; }
        .bc-char-opt { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
        .bc-char-opt:hover { border-color: ${theme.accent} !important; }
        @media (max-width: 860px) {
          .bc-main { padding: 1rem !important; }
        }
      `}</style>

      <div
        className="bc-main"
        style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ToolHeader
            theme={theme}
            title="Boss Crystal Calculator"
            description="Track weekly boss crystals and meso income across characters."
          />

          {/* Controls */}
          <div
            className="fade-in panel-card"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              padding: "1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <div
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
                <div
                  key={s}
                  className="bc-btn"
                  onClick={() => setServer(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: server === s ? theme.accentText : theme.muted,
                    background: server === s ? theme.accentSoft : "transparent",
                  }}
                >
                  {s === "heroic" ? "Heroic" : "Interactive"}
                </div>
              ))}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <div
                className="bc-btn"
                onClick={clearData}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "#e05a5a",
                  background: "transparent",
                  border: "1px solid #e05a5a33",
                }}
              >
                Clear All
              </div>
              <div
                className="bc-btn"
                onClick={exportXlsx}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accentText,
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                }}
              >
                Export
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div
            className="fade-in"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
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
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.9rem",
                  color: theme.text,
                }}
              >
                Weekly:
              </span>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.2rem",
                  color: theme.accent,
                }}
              >
                {formatMeso(totalMeso)} mesos
              </span>
            </div>
            <div style={{ width: "1px", height: "24px", background: theme.border }} />
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "10px",
                background: totalCrystals > 180 ? "#e05a5a22" : theme.accentSoft,
                fontSize: "0.78rem",
                fontWeight: 800,
                color: totalCrystals > 180 ? "#e05a5a" : theme.accentText,
              }}
            >
              {totalCrystals} / 180 crystals
            </div>
          </div>

          {/* Card grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            {characters.map((char, ci) => (
              <CharacterCard
                key={ci}
                theme={theme}
                char={char}
                income={charIncomes[ci]}
                serverMult={serverMult}
                onEdit={() => openEdit(ci)}
                onDelete={() => deleteCharacter(ci)}
              />
            ))}

            {/* Add character card */}
            <div
              className="fade-in bc-add-card panel-card"
              onClick={openAdd}
              title="Add character"
              style={{
                background: theme.timerBg,
                border: `2px dashed ${theme.border}`,
                borderRadius: "14px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 180,
              }}
            >
              <svg viewBox="0 0 24 24" width="36" height="36" fill={theme.muted}>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: theme.muted,
                  marginTop: "0.5rem",
                }}
              >
                Add character
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {dialog?.type === "add-name" && (
        <AddNameDialog
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
          onBack={() => setDialog({ type: "add-name" })}
          onCancel={closeDialog}
          onConfirm={dialog?.type === "add-bosses" ? confirmAdd : confirmEdit}
        />
      )}
    </>
  );
}
