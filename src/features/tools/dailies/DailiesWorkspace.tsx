"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import CharacterAvatar from "../../characters/tabs/components/CharacterAvatar";
import { WORLD_NAMES } from "../../characters/model/constants";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";
import {
  ARCANE_SYMBOL_QUESTS,
  SACRED_SYMBOL_QUESTS,
  DAILY_BOSSES,
  DAILY_ACTIVITIES,
  DAILY_CONTENT,
  type DailyTask,
  type CounterTask,
} from "./dailies-data";
import {
  useDailiesState,
  computeProgress,
  hasAnySelected,
  type CharDailyState,
  type SelectedTasks,
  type TaskSection,
} from "./useDailiesState";
import RemindersConfigBar from "./RemindersConfigBar";

// -- Small UI bits ------------------------------------------------------------

function CheckboxItem({
  theme,
  label,
  checked,
  onToggle,
}: {
  theme: AppTheme;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "5px 8px",
        borderRadius: "8px",
        cursor: "pointer",
        background: checked ? theme.accentSoft : theme.timerBg,
        border: `1px solid ${checked ? theme.accent : theme.border}`,
        fontSize: "0.78rem",
        fontWeight: 700,
        color: checked ? theme.accentText : theme.text,
        userSelect: "none",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ accentColor: theme.accent, cursor: "pointer" }}
      />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </label>
  );
}

function CounterRow({
  theme,
  task,
  value,
  worldTotal,
  onChange,
}: {
  theme: AppTheme;
  task: CounterTask;
  value: number;
  worldTotal: number;
  onChange: (v: number) => void;
}) {
  const worldCapped = worldTotal >= task.max;
  const done = worldCapped || value >= task.max;
  const cannotIncrement = worldCapped || value >= task.max;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "6px 10px",
        borderRadius: "10px",
        background: done ? theme.accentSoft : theme.timerBg,
        border: `1px solid ${done ? theme.accent : theme.border}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: done ? theme.accentText : theme.text,
          }}
        >
          {task.label}
        </div>
        <div
          style={{
            fontSize: "0.65rem",
            color: worldCapped ? theme.accent : theme.muted,
            fontWeight: 700,
            marginTop: 1,
          }}
        >
          World: {worldTotal}/{task.max}
          {worldCapped ? " · cap reached" : ""}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          color: theme.text,
          cursor: value <= 0 ? "not-allowed" : "pointer",
          opacity: value <= 0 ? 0.4 : 1,
          fontWeight: 800,
        }}
        aria-label={`Decrement ${task.label}`}
      >
        −
      </button>
      <div
        style={{
          minWidth: 32,
          textAlign: "center",
          fontSize: "0.8rem",
          fontWeight: 800,
          color: done ? theme.accent : theme.muted,
        }}
      >
        {value}/{task.max}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={cannotIncrement}
        title={worldCapped ? "World cap reached" : undefined}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          color: theme.text,
          cursor: cannotIncrement ? "not-allowed" : "pointer",
          opacity: cannotIncrement ? 0.4 : 1,
          fontWeight: 800,
        }}
        aria-label={`Increment ${task.label}`}
      >
        +
      </button>
    </div>
  );
}

function SectionHeader({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <div
      style={{
        fontSize: "0.68rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: theme.muted,
        marginBottom: "0.4rem",
        marginTop: "0.8rem",
      }}
    >
      {label}
    </div>
  );
}

function TaskGrid({
  theme,
  tasks,
  values,
  onToggle,
}: {
  theme: AppTheme;
  tasks: DailyTask[];
  values: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "5px",
      }}
    >
      {tasks.map((t) => (
        <CheckboxItem
          key={t.id}
          theme={theme}
          label={t.label}
          checked={!!values[t.id]}
          onToggle={() => onToggle(t.id)}
        />
      ))}
    </div>
  );
}

// -- Card sub-components ------------------------------------------------------

function CardHeader({
  theme,
  char,
  progress,
  onReset,
  onCheckAll,
  onEdit,
  onToggleCollapsed,
  collapsed,
}: {
  theme: AppTheme;
  char: StoredCharacterRecord;
  progress: { done: number; total: number };
  onReset: () => void;
  onCheckAll: () => void;
  onEdit: () => void;
  onToggleCollapsed: () => void;
  collapsed: boolean;
}) {
  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
  const complete = progress.done >= progress.total && progress.total > 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
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
            src={char.characterImgURL}
            alt={char.characterName}
            width={48}
            height={48}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "0.95rem",
              color: theme.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {char.characterName}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              color: theme.muted,
              fontWeight: 700,
              marginTop: 1,
            }}
          >
            Lv.{char.level} {char.jobName} · {WORLD_NAMES[char.worldID] ?? `World ${char.worldID}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onEdit}
            title="Edit tracked tasks"
            aria-label="Edit tracked tasks"
            style={iconBtn(theme, theme.muted)}
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onCheckAll}
            title="Mark all complete"
            aria-label="Mark all complete"
            style={iconBtn(theme, complete ? theme.accent : theme.muted)}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset this character"
            aria-label="Reset character"
            style={iconBtn(theme, theme.muted)}
          >
            ⟳
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand" : "Collapse"}
            aria-label={collapsed ? "Expand" : "Collapse"}
            style={iconBtn(theme, theme.muted)}
          >
            {collapsed ? "▾" : "▴"}
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: collapsed ? 0 : "0.25rem",
        }}
      >
        <div
          style={{
            flex: 1,
            height: 8,
            borderRadius: 99,
            background: theme.timerBg,
            overflow: "hidden",
            border: `1px solid ${theme.border}`,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: complete ? "#10b981" : theme.accent,
              transition: "width 0.25s",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            color: complete ? "#10b981" : theme.muted,
            flexShrink: 0,
          }}
        >
          {progress.done}/{progress.total}
        </div>
      </div>
    </>
  );
}

function iconBtn(theme: AppTheme, color: string): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.timerBg,
    color,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.85rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  };
}

function CardBody({
  theme,
  charName,
  cs,
  worldTotalFor,
  onToggle,
  onCounterChange,
  onEdit,
}: {
  theme: AppTheme;
  charName: string;
  cs: CharDailyState;
  worldTotalFor: (counterId: string) => number;
  onToggle: (section: TaskSection, id: string) => void;
  onCounterChange: (task: CounterTask, next: number) => void;
  onEdit: () => void;
}) {
  if (!hasAnySelected(cs)) {
    return (
      <div
        style={{
          padding: "1.5rem 0.5rem",
          textAlign: "center",
          color: theme.muted,
          fontSize: "0.82rem",
        }}
      >
        <div style={{ marginBottom: "0.75rem" }}>No tasks tracked yet.</div>
        <button
          type="button"
          onClick={onEdit}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            background: theme.accent,
            color: "#fff",
            border: "none",
            fontWeight: 800,
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          + Add tasks
        </button>
      </div>
    );
  }

  const arcaneTasks = ARCANE_SYMBOL_QUESTS.filter((t) => cs.selected.arcane.includes(t.id));
  const sacredTasks = SACRED_SYMBOL_QUESTS.filter((t) => cs.selected.sacred.includes(t.id));
  const bossTasks = DAILY_BOSSES.filter((t) => cs.selected.bosses.includes(t.id));
  const activityTasks = DAILY_ACTIVITIES.filter((t) => cs.selected.activities.includes(t.id));
  const contentTasks = DAILY_CONTENT.filter((t) => cs.selected.content.includes(t.id));

  return (
    <>
      {arcaneTasks.length > 0 && (
        <>
          <SectionHeader theme={theme} label="Arcane Symbols" />
          <TaskGrid
            theme={theme}
            tasks={arcaneTasks}
            values={cs.arcane}
            onToggle={(id) => onToggle("arcane", id)}
          />
        </>
      )}
      {sacredTasks.length > 0 && (
        <>
          <SectionHeader theme={theme} label="Sacred Symbols" />
          <TaskGrid
            theme={theme}
            tasks={sacredTasks}
            values={cs.sacred}
            onToggle={(id) => onToggle("sacred", id)}
          />
        </>
      )}
      {bossTasks.length > 0 && (
        <>
          <SectionHeader theme={theme} label="Daily Bosses" />
          <TaskGrid
            theme={theme}
            tasks={bossTasks}
            values={cs.bosses}
            onToggle={(id) => onToggle("bosses", id)}
          />
        </>
      )}
      {(activityTasks.length > 0 || contentTasks.length > 0) && (
        <>
          <SectionHeader theme={theme} label="Daily Content" />
          {activityTasks.length > 0 && (
            <TaskGrid
              theme={theme}
              tasks={activityTasks}
              values={cs.activities}
              onToggle={(id) => onToggle("activities", id)}
            />
          )}
          {contentTasks.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                marginTop: activityTasks.length > 0 ? "5px" : 0,
              }}
            >
              {contentTasks.map((c) => (
                <CounterRow
                  key={c.id}
                  theme={theme}
                  task={c}
                  value={cs.counters[c.id] ?? 0}
                  worldTotal={worldTotalFor(c.id)}
                  onChange={(v) => onCounterChange(c, v)}
                />
              ))}
            </div>
          )}
        </>
      )}
      <div style={{ fontSize: "0.65rem", color: theme.muted, marginTop: "0.6rem" }}>
        Resets at 00:00 UTC · {charName}
      </div>
    </>
  );
}

// -- Selection dialog ---------------------------------------------------------

function DialogSection({
  theme,
  title,
  tasks,
  selected,
  onToggle,
  onAll,
  onNone,
}: {
  theme: AppTheme;
  title: string;
  tasks: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
}) {
  const selSet = new Set(selected);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.4rem",
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            color: theme.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            flex: 1,
          }}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={onAll}
          style={dialogPillBtn(theme)}
        >
          All
        </button>
        <button
          type="button"
          onClick={onNone}
          style={dialogPillBtn(theme)}
        >
          None
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5px",
        }}
      >
        {tasks.map((t) => (
          <CheckboxItem
            key={t.id}
            theme={theme}
            label={t.label}
            checked={selSet.has(t.id)}
            onToggle={() => onToggle(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function dialogPillBtn(theme: AppTheme): React.CSSProperties {
  return {
    padding: "3px 10px",
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.timerBg,
    color: theme.muted,
    fontSize: "0.68rem",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function DailiesSelectionDialog({
  theme,
  charName,
  initial,
  onCancel,
  onConfirm,
}: {
  theme: AppTheme;
  charName: string;
  initial: SelectedTasks;
  onCancel: () => void;
  onConfirm: (next: SelectedTasks) => void;
}) {
  const [draft, setDraft] = useState<SelectedTasks>(initial);

  const toggleIn = (key: keyof SelectedTasks, id: string) => {
    setDraft((prev) => {
      const cur = prev[key];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [key]: next };
    });
  };

  const setAll = (key: keyof SelectedTasks, ids: string[]) => {
    setDraft((prev) => ({ ...prev, [key]: ids }));
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          padding: "1.5rem",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: theme.text,
            marginBottom: "0.25rem",
          }}
        >
          Edit Tracked Tasks
        </div>
        <div style={{ fontSize: "0.78rem", color: theme.muted, marginBottom: "1rem" }}>
          Choose what to track for <strong style={{ color: theme.text }}>{charName}</strong>.
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem" }}>
          <DialogSection
            theme={theme}
            title="Arcane Symbols"
            tasks={ARCANE_SYMBOL_QUESTS}
            selected={draft.arcane}
            onToggle={(id) => toggleIn("arcane", id)}
            onAll={() => setAll("arcane", ARCANE_SYMBOL_QUESTS.map((t) => t.id))}
            onNone={() => setAll("arcane", [])}
          />
          <DialogSection
            theme={theme}
            title="Sacred Symbols"
            tasks={SACRED_SYMBOL_QUESTS}
            selected={draft.sacred}
            onToggle={(id) => toggleIn("sacred", id)}
            onAll={() => setAll("sacred", SACRED_SYMBOL_QUESTS.map((t) => t.id))}
            onNone={() => setAll("sacred", [])}
          />
          <DialogSection
            theme={theme}
            title="Daily Bosses"
            tasks={DAILY_BOSSES}
            selected={draft.bosses}
            onToggle={(id) => toggleIn("bosses", id)}
            onAll={() => setAll("bosses", DAILY_BOSSES.map((t) => t.id))}
            onNone={() => setAll("bosses", [])}
          />
          <DialogSection
            theme={theme}
            title="Daily Content"
            tasks={[...DAILY_ACTIVITIES, ...DAILY_CONTENT]}
            selected={[...draft.activities, ...draft.content]}
            onToggle={(id) => {
              if (DAILY_ACTIVITIES.some((t) => t.id === id)) toggleIn("activities", id);
              else toggleIn("content", id);
            }}
            onAll={() => {
              setAll("activities", DAILY_ACTIVITIES.map((t) => t.id));
              setAll("content", DAILY_CONTENT.map((t) => t.id));
            }}
            onNone={() => {
              setAll("activities", []);
              setAll("content", []);
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: `1px solid ${theme.border}`,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.timerBg,
              color: theme.text,
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(draft)}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 8,
              background: theme.accent,
              color: "#fff",
              border: "none",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Main card ----------------------------------------------------------------

function CharacterCard({
  theme,
  char,
  cs,
  worldTotalFor,
  onToggle,
  onCounterChange,
  onReset,
  onCheckAll,
  onEdit,
  onToggleCollapsed,
}: {
  theme: AppTheme;
  char: StoredCharacterRecord;
  cs: CharDailyState;
  worldTotalFor: (counterId: string) => number;
  onToggle: (section: TaskSection, id: string) => void;
  onCounterChange: (task: CounterTask, next: number) => void;
  onReset: () => void;
  onCheckAll: () => void;
  onEdit: () => void;
  onToggleCollapsed: () => void;
}) {
  const progress = computeProgress(cs);
  const collapsed = !!cs.collapsed;

  return (
    <div
      className="fade-in panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: "1.1rem",
      }}
    >
      <CardHeader
        theme={theme}
        char={char}
        progress={progress}
        onReset={onReset}
        onCheckAll={onCheckAll}
        onEdit={onEdit}
        onToggleCollapsed={onToggleCollapsed}
        collapsed={collapsed}
      />
      {!collapsed && (
        <CardBody
          theme={theme}
          charName={char.characterName}
          cs={cs}
          worldTotalFor={worldTotalFor}
          onToggle={onToggle}
          onCounterChange={onCounterChange}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}

// -- Empty state --------------------------------------------------------------

function EmptyState({ theme }: { theme: AppTheme }) {
  return (
    <div
      className="panel-card"
      style={{
        background: theme.panel,
        border: `1px dashed ${theme.border}`,
        padding: "3rem 2rem",
        textAlign: "center",
        color: theme.muted,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <div style={{ fontSize: "2rem" }}>📋</div>
      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: theme.text }}>
        No characters yet
      </div>
      <div style={{ fontSize: "0.8rem", maxWidth: 360 }}>
        Add a character to start tracking daily symbols, bosses, and content.
      </div>
      <Link
        href="/characters"
        style={{
          marginTop: "0.5rem",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "0.55rem 1.25rem",
          borderRadius: 10,
          background: theme.accent,
          color: "#fff",
          fontWeight: 800,
          fontSize: "0.85rem",
          textDecoration: "none",
        }}
      >
        + Add Character
      </Link>
    </div>
  );
}

// -- Workspace ----------------------------------------------------------------

export default function DailiesWorkspace({ theme }: { theme: AppTheme }) {
  const {
    mounted,
    characters,
    getCharState,
    getWorldCounterTotal,
    toggleTask,
    setCounter,
    resetCharacter,
    toggleCollapsed,
    setSelected,
    checkAll,
  } = useDailiesState();

  const [editingChar, setEditingChar] = useState<string | null>(null);

  if (!mounted) return null;

  const editingState = editingChar ? getCharState(editingChar) : null;

  return (
    <>
      <style>{`
        .dailies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.1rem; }
        @media (max-width: 860px) {
          .dailies-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ToolHeader
            theme={theme}
            title="Daily Tracker"
            description="Track symbol dailies, daily bosses, and daily content across all your characters. Resets at 00:00 UTC."
          />

          <RemindersConfigBar theme={theme} />

          {characters.length === 0 ? (
            <EmptyState theme={theme} />
          ) : (
            <div className="dailies-grid">
              {characters.map((char) => (
                <CharacterCard
                  key={char.characterName}
                  theme={theme}
                  char={char}
                  cs={getCharState(char.characterName)}
                  worldTotalFor={(cid) => getWorldCounterTotal(char.worldID, cid)}
                  onToggle={(section, id) => toggleTask(char.characterName, section, id)}
                  onCounterChange={(task, next) =>
                    setCounter(char.characterName, task.id, next, task.max)
                  }
                  onReset={() => resetCharacter(char.characterName)}
                  onCheckAll={() => checkAll(char.characterName)}
                  onEdit={() => setEditingChar(char.characterName)}
                  onToggleCollapsed={() => toggleCollapsed(char.characterName)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingChar && editingState && (
        <DailiesSelectionDialog
          theme={theme}
          charName={editingChar}
          initial={editingState.selected}
          onCancel={() => setEditingChar(null)}
          onConfirm={(next) => {
            setSelected(editingChar, next);
            setEditingChar(null);
          }}
        />
      )}
    </>
  );
}
