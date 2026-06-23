"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import { ItemIcon } from "../../../components/ResourceImage";
import { toolStyles } from "../tool-styles";
import { Field } from "../shared-ui";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { useMysticFrontierState, type SlotState } from "./useMysticFrontierState";
import { BonusItemPicker, FamiliarPicker, FamiliarSprite, LinePicker, getMfFamiliar } from "./pickers";
import {
  MF_RARITY_DICE, MF_RARITY_LABELS, MF_RARITY_ORDER, type MfElement, type MfRarity,
} from "./types";
import {
  MF_BONUS_FAMILIES, formatBonusEffect, getBonusItem, type MfBonusItem,
} from "./bonusItemsData";
import type { RerollSuggestion, ScoreResult } from "./calc";

// ── palette ──────────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<MfRarity, string> = {
  common: "#9aa0a6",
  rare: "#4080c0",
  epic: "#a855f7",
  unique: "#fbbf24",
  legendary: "#4ade80",
};

const ELEMENT_COLORS: Record<MfElement, string> = {
  None: "#9aa0a6",
  Fire: "#f97316",
  Ice: "#38bdf8",
  Lightning: "#facc15",
  Poison: "#a855f7",
  Dark: "#8b5cf6",
  Holy: "#fde68a",
};

const FAM_SPRITE = 60;

// ── small chips ───────────────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      padding: "0.1rem 0.45rem", borderRadius: 5, fontSize: "0.7rem", fontWeight: 800,
      letterSpacing: "0.02em", background: `${color}22`, border: `1px solid ${color}`, color,
      whiteSpace: "nowrap", lineHeight: 1.5,
    }}>
      {label}
    </span>
  );
}

// ── die picker (faces 1..max) ──────────────────────────────────────────────────

function DiePicker({ theme, value, max, onChange }: {
  theme: AppTheme; value: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={active}
            style={{
              width: 26, height: 26, borderRadius: 6, padding: 0, cursor: "pointer",
              fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
              border: `1px solid ${active ? theme.accent : theme.border}`,
              background: active ? theme.accent : "transparent",
              color: active ? "#fff" : theme.muted,
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

// ── lineup slot ────────────────────────────────────────────────────────────────

const slotCardBase: CSSProperties = {
  borderRadius: 12,
  padding: "0.85rem 0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.6rem",
};

function SlotTrigger({ slot, theme }: { slot: SlotState; theme: AppTheme }) {
  const fam = getMfFamiliar(slot.familiarId);
  if (!fam) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: FAM_SPRITE + 22, justifyContent: "center" }}>
        <span style={{ fontSize: 22, color: theme.muted, lineHeight: 1, fontWeight: 300 }}>+</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>Add familiar</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <FamiliarSprite fam={fam} size={FAM_SPRITE} />
      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: theme.text, textAlign: "center", lineHeight: 1.2 }}>
        {fam.label}
      </span>
    </div>
  );
}

function LineupSlot({
  index, slot, theme, openId, setOpenId, mf,
}: {
  index: number;
  slot: SlotState;
  theme: AppTheme;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  mf: ReturnType<typeof useMysticFrontierState>;
}) {
  const styles = toolStyles(theme);
  const fam = getMfFamiliar(slot.familiarId);
  const present = fam !== undefined;
  const max = mf.maxDieFor(slot.rarity);

  const cardStyle: CSSProperties = {
    ...slotCardBase,
    border: `1px ${present ? "solid" : "dashed"} ${present ? RARITY_COLORS[slot.rarity] : theme.border}`,
    background: present ? theme.panel : "transparent",
  };

  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <div style={cardStyle}>
      <FamiliarPicker
        theme={theme}
        familiarId={slot.familiarId}
        isOpen={openId === `fam-${index}`}
        onToggle={() => toggle(`fam-${index}`)}
        onClose={() => setOpenId(null)}
        onSelect={(id) => mf.setFamiliar(index, id)}
      >
        <SlotTrigger slot={slot} theme={theme} />
      </FamiliarPicker>

      {present && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Chip label={fam.type} color={theme.muted} />
            <Chip label={fam.element === "None" ? "Non-elemental" : fam.element} color={ELEMENT_COLORS[fam.element]} />
          </div>

          <Field label="Rarity" style={styles.labelStyle}>
            <select
              className="tool-select"
              value={slot.rarity}
              onChange={(e) => mf.setRarity(index, e.target.value as MfRarity)}
              style={styles.selectStyle}
            >
              {MF_RARITY_ORDER.map((r) => (
                <option key={r} value={r}>{`${MF_RARITY_LABELS[r]} (d${MF_RARITY_DICE[r]})`}</option>
              ))}
            </select>
          </Field>

          <Field label="Die roll" style={styles.labelStyle}>
            <DiePicker theme={theme} value={slot.die} max={max} onChange={(v) => mf.setDie(index, v)} />
          </Field>

          <Field label="Potential" style={styles.labelStyle}>
            <LinePicker
              theme={theme} value={slot.line} rarity={slot.rarity}
              isOpen={openId === `line-${index}`} placeholder="Select line…"
              onToggle={() => toggle(`line-${index}`)} onClose={() => setOpenId(null)}
              onChange={(id) => mf.setLine(index, id)}
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ── bonus items ─────────────────────────────────────────────────────────────

function EquippedBonusItem({ item, theme, onRemove }: {
  item: MfBonusItem; theme: AppTheme; onRemove: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0.6rem",
      borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.bg,
    }}>
      <ItemIcon id={item.id} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>{item.name}</div>
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: theme.muted }}>{formatBonusEffect(item)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${item.name}`}
        style={{
          background: "none", border: "none", padding: "0 0.25rem", cursor: "pointer",
          color: theme.muted, fontSize: "1.2rem", fontWeight: 700, lineHeight: 1, flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function AddBonusTrigger({ theme }: { theme: AppTheme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "0.6rem", borderRadius: 10, border: `1px dashed ${theme.border}`, color: theme.muted,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 300 }}>+</span>
      <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>Add Bonus Item</span>
    </div>
  );
}

// ── wave selector ─────────────────────────────────────────────────────────────

function WaveSelector({ theme, activeWave, waveCount, filledCounts, onChange, inputStyle }: {
  theme: AppTheme;
  activeWave: number;
  waveCount: number;
  filledCounts: number[];
  onChange: (i: number) => void;
  inputStyle: CSSProperties;
}) {
  return (
    <div className="mf-wave" style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
      <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>Wave</div>
      <select
        className="tool-select"
        value={activeWave}
        onChange={(e) => onChange(Number(e.target.value))}
        // Height matches the CharacterDropdown trigger (34px avatar + padding + border).
        style={{ ...inputStyle, minWidth: 150, height: 46 }}
      >
        {Array.from({ length: waveCount }, (_, i) => {
          const count = filledCounts[i] ? `${filledCounts[i]}/3` : "empty";
          return (
            <option key={i} value={i}>{`Wave ${i + 1} (${count})`}</option>
          );
        })}
      </select>
    </div>
  );
}

// ── result + rerolls ──────────────────────────────────────────────────────────

function Stat({ label, value, theme, color }: {
  label: string; value: string; theme: AppTheme; color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted }}>{label}</span>
      <span style={{ fontSize: "1.1rem", fontWeight: 800, color: color ?? theme.text, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function Op({ symbol, theme }: { symbol: string; theme: AppTheme }) {
  return (
    <span style={{ fontSize: "1.2rem", fontWeight: 700, color: theme.muted, lineHeight: 1, paddingBottom: 1 }}>
      {symbol}
    </span>
  );
}

function ResultStats({ result, theme }: { result: ScoreResult; theme: AppTheme }) {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      <Stat label="Dice total" value={String(result.diceSum)} theme={theme} />
      <Op symbol="+" theme={theme} />
      <Stat label="Flat bonus" value={`${result.totalFlat >= 0 ? "+" : ""}${result.totalFlat}`} theme={theme} />
      <Op symbol="×" theme={theme} />
      <Stat label="Multiplier" value={result.totalMult === null ? "—" : `×${result.totalMult.toFixed(2)}`} theme={theme} />
      <Op symbol="=" theme={theme} />
      <Stat label="Final score" value={String(result.finalResult)} theme={theme} color={theme.accent} />
    </div>
  );
}

function ActiveLines({ result, theme }: { result: ScoreResult; theme: AppTheme }) {
  if (result.activeLines.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: theme.text }}>Active potential lines</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {result.activeLines.map((l, i) => (
          <span
            key={`${l.label}-${i}`}
            style={{
              fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: 6,
              background: `${theme.accent}1a`, border: `1px solid ${theme.accent}55`, color: theme.text,
            }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const DIE_LABELS = ["1st die", "2nd die", "3rd die"];

function RerollPanel({ rerolls, passed, theme }: {
  rerolls: RerollSuggestion[]; passed: boolean; theme: AppTheme;
}) {
  if (passed || rerolls.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: theme.text }}>Rerolls that would pass</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {rerolls.map((s) => {
          const possible = s.passingValues.length > 0;
          const borderColor = possible ? theme.border : `${theme.muted}55`;
          return (
            <div
              key={s.slotIndex}
              style={{
                flex: "1 1 150px", minWidth: 140, padding: "0.6rem 0.7rem", borderRadius: 10,
                border: `1px solid ${borderColor}`, background: theme.bg,
              }}
            >
              <div style={{ fontSize: "0.74rem", fontWeight: 800, color: theme.text }}>
                {DIE_LABELS[s.slotIndex]} <span style={{ color: theme.muted, fontWeight: 600 }}>(now {s.currentDie}, d{s.maxDie})</span>
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: possible ? theme.accent : theme.muted, marginTop: 4 }}>
                {possible ? `Need: ${s.passingValues.join(", ")}` : "Can't pass alone"}
              </div>
              {possible && (
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: theme.muted, marginTop: 2 }}>
                  {Math.round(s.odds * 100)}% chance ({s.passingValues.length}/{s.maxDie})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── workspace ───────────────────────────────────────────────────────────────

export default function MysticFrontierWorkspace({ theme }: { theme: AppTheme }) {
  const mf = useMysticFrontierState();
  const styles = toolStyles(theme);
  const [openId, setOpenId] = useState<string | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    function onMouseDown(e: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [openId]);

  if (!mf.mounted) return null;

  const targetEntered = mf.target > 0;

  const equippedBonus = MF_BONUS_FAMILIES.flatMap((family) => {
    const color = mf.bonus[family];
    const item = color ? getBonusItem(family, color) : undefined;
    return item ? [{ family, item }] : [];
  });
  const availableFamilies = MF_BONUS_FAMILIES.filter((family) => !mf.bonus[family]);

  return (
    <div className="page-content">
      <style>{`
        .mf-wave { margin-left: auto; }
        @media (max-width: 760px) {
          .mf-lineup { grid-template-columns: 1fr !important; }
          .mf-wave { margin-left: 0; flex-basis: 100%; }
        }
      `}</style>
      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Mystic Frontier Solver"
          description="Set your active lineup, dice, and target, then see whether your roll passes and which rerolls would get you there."
        />

        {/* Character + wave selector */}
        <div className="fade-in panel-card" style={styles.sectionPanel}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem 2rem", flexWrap: "wrap" }}>
            {mf.characters.length > 0 && (
              <CharacterSyncPanel
                theme={theme}
                characters={mf.characters}
                selectedCharName={mf.selectedCharName}
                onCharChange={mf.handleCharChange}
                inputStyle={styles.inputStyle}
              />
            )}
            <WaveSelector
              theme={theme}
              activeWave={mf.activeWave}
              waveCount={mf.waveCount}
              filledCounts={mf.waveFilledCounts}
              onChange={mf.setActiveWave}
              inputStyle={styles.inputStyle}
            />
          </div>
        </div>

        {/* Lineup */}
        <div className="fade-in panel-card" style={styles.sectionPanel}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.85rem" }}>
            <div className="section-label" style={{ color: theme.muted, marginBottom: 0, lineHeight: 1 }}>
              {`Active Lineup · Wave ${mf.activeWave + 1}`}
            </div>
            <ConfirmButton
              theme={theme}
              label="Reset wave"
              title="Reset wave"
              message={`This clears every familiar slot and the target score for Wave ${mf.activeWave + 1}. This can't be undone.`}
              confirmLabel="Reset wave"
              onConfirm={mf.reset}
              style={{ marginLeft: "auto" }}
            />
          </div>
          <div ref={zoneRef} className="mf-lineup" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, alignItems: "start" }}>
            {mf.slots.map((slot, i) => (
              <LineupSlot key={i} index={i} slot={slot} theme={theme} openId={openId} setOpenId={setOpenId} mf={mf} />
            ))}
          </div>
          {mf.diceCap !== null && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.74rem", fontWeight: 600, color: theme.muted }}>
              A &ldquo;Prevents dice from rolling over {mf.diceCap}&rdquo; line is active — every die is capped at {mf.diceCap}.
            </div>
          )}
        </div>

        {/* Bonus items */}
        <div className="fade-in panel-card" style={styles.sectionPanel}>
          <div className="section-label" style={{ color: theme.muted }}>Bonus Items</div>
          <div style={{ fontSize: "0.76rem", fontWeight: 600, color: theme.muted, marginBottom: "0.85rem" }}>
            Equipped dice items apply to every roll. Add the dice you own — one per type.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {equippedBonus.length === 0 && (
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: theme.muted }}>No bonus dice equipped yet.</div>
            )}
            {equippedBonus.map(({ family, item }) => (
              <EquippedBonusItem key={family} item={item} theme={theme} onRemove={() => mf.setBonus(family, null)} />
            ))}
            {availableFamilies.length > 0 && (
              <BonusItemPicker
                theme={theme}
                isOpen={openId === "bonus"}
                available={availableFamilies}
                onToggle={() => setOpenId(openId === "bonus" ? null : "bonus")}
                onClose={() => setOpenId(null)}
                onSelect={(family, color) => mf.setBonus(family, color)}
              >
                <AddBonusTrigger theme={theme} />
              </BonusItemPicker>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="fade-in panel-card" style={styles.sectionPanel}>
          <div className="section-label" style={{ color: theme.muted }}>Result</div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "1.5rem", flexWrap: "wrap" }}>
            <Field label="Target score" style={styles.labelStyle} containerStyle={{ width: 130 }}>
              <input
                className="tool-input"
                type="number"
                min={0}
                inputMode="numeric"
                value={mf.target || ""}
                placeholder="0"
                onKeyDown={replaceZeroOnDigit}
                onChange={(e) => mf.setTarget(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                style={{ ...styles.inputStyle, width: "100%", boxSizing: "border-box" }}
              />
            </Field>
            <ResultStats result={mf.result} theme={theme} />
            {targetEntered && mf.hasLineup && (
              <span style={{
                marginLeft: "auto", padding: "0.3rem 0.9rem", borderRadius: 8, fontSize: "0.95rem", fontWeight: 900,
                letterSpacing: "0.04em", color: "#fff", background: mf.passed ? "#16a34a" : "#dc2626",
              }}>
                {mf.passed ? "PASS" : "FAIL"}
              </span>
            )}
          </div>

          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <ActiveLines result={mf.result} theme={theme} />
            <RerollPanel rerolls={mf.rerolls} passed={mf.passed} theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}
