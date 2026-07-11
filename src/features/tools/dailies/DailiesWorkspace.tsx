"use client";

import type { AppTheme } from "../../../components/themes";
import { STATUS, statusText } from "../../../components/statusColors";
import { ToolHeader } from "../../../components/ToolHeader";
import CharacterChip from "../../../components/CharacterChip";
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
import { ActionButton } from "../shared-ui";
import { AddCharacterNameDialog } from "../AddCharacterNameDialog";
import { AddCharacterCard } from "../AddCharacterCard";
import { CardActions } from "../TrackerCard";
import { ToolDialog } from "../ToolDialog";
import { useCardReorder, type CardDragProps } from "../useCardReorder";

// -- Style helpers ------------------------------------------------------------

function checkboxItemStyle(
  theme: AppTheme,
  checked: boolean,
): React.CSSProperties {
  return {
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
  };
}

function counterBtnStyle(
  theme: AppTheme,
  disabled: boolean,
): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.panel,
    color: theme.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontWeight: 800,
  };
}

// Colors only; shape comes from the `.tool-dialog-btn` class.
function dialogCancelBtnStyle(theme: AppTheme): React.CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    background: theme.timerBg,
    color: theme.text,
  };
}

function accentBtnStyle(theme: AppTheme): React.CSSProperties {
  return {
    background: theme.accent,
    color: theme.accentOn,
    border: "none",
  };
}

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
    <label style={checkboxItemStyle(theme, checked)}>
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
  worldLabel,
  onChange,
}: {
  theme: AppTheme;
  task: CounterTask;
  value: number;
  worldTotal: number;
  worldLabel: string | null;
  onChange: (v: number) => void;
}) {
  const worldMax = task.worldMax ?? task.max;
  const worldCapped = worldTotal >= worldMax;
  const done = worldCapped || value >= task.max;
  // The world line only helps when the cap is genuinely shared (worldMax > max)
  // and the character belongs to a real world; typed characters count in a
  // private bucket, so their per-character line already tells the whole story.
  const showWorld = worldLabel !== null && worldMax > task.max;
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
        {showWorld && (
          <div
            style={{
              fontSize: "0.75rem",
              color: worldCapped ? theme.accentText : theme.muted,
              fontWeight: 700,
              marginTop: 1,
            }}
          >
            {worldLabel}: {worldTotal}/{worldMax}
            {worldCapped ? " · cap reached" : ""}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        style={counterBtnStyle(theme, value <= 0)}
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
          color: done ? theme.accentText : theme.muted,
        }}
      >
        {value}/{task.max}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={done}
        title={worldCapped ? "World cap reached" : undefined}
        style={counterBtnStyle(theme, done)}
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
        fontSize: "0.75rem",
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
      className="dailies-check-grid"
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
  name,
  storeChar,
  worldLabel,
  pos,
  total,
  onMove,
  progress,
  onDelete,
  onCheckAll,
  onEdit,
}: {
  theme: AppTheme;
  name: string;
  storeChar: StoredCharacterRecord | null;
  worldLabel: string | null;
  pos: number;
  total: number;
  onMove: (toPos: number) => void;
  progress: { done: number; total: number };
  onDelete: () => void;
  onCheckAll: (done: boolean) => void;
  onEdit: () => void;
}) {
  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
  const complete = progress.done >= progress.total && progress.total > 0;
  const subtitle = storeChar
    ? `Lv.${storeChar.level} ${storeChar.jobName} · ${worldLabel}`
    : "";

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
        <CharacterChip
          theme={theme}
          characterImgURL={storeChar?.characterImgURL ?? ""}
          characterName={name}
          subtitle={subtitle}
          nameFontSize="0.95rem"
          subtitleFontSize="0.72rem"
          subtitleFontWeight={700}
        />
        <CardActions
          theme={theme}
          pos={pos}
          total={total}
          onMove={onMove}
          label={name}
          onDelete={onDelete}
          onEdit={onEdit}
          editTitle="Edit tracked tasks"
          allDone={complete}
          onToggleAll={onCheckAll}
          toggleOnTitle="Mark all complete"
          toggleOffTitle="Clear all"
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.25rem",
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
              width: "100%",
              height: "100%",
              background: complete ? STATUS.success.fill : theme.accent,
              transform: `scaleX(${pct / 100})`,
              transformOrigin: "left",
              transition: "transform 0.25s",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            color: complete ? statusText(theme, "success") : theme.muted,
            flexShrink: 0,
          }}
        >
          {progress.done}/{progress.total}
        </div>
      </div>
    </>
  );
}

function CardBody({
  theme,
  cs,
  worldTotalFor,
  worldLabel,
  onToggle,
  onCounterChange,
  onEdit,
}: {
  theme: AppTheme;
  cs: CharDailyState;
  worldTotalFor: (counterId: string) => number;
  worldLabel: string | null;
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
        <ActionButton
          theme={theme}
          label="+ Add tasks"
          onClick={onEdit}
          style={{ padding: "0.5rem 1rem" }}
        />
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
                  worldLabel={worldLabel}
                  onChange={(v) => onCounterChange(c, v)}
                />
              ))}
            </div>
          )}
        </>
      )}
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
            fontSize: "0.75rem",
            fontWeight: 800,
            color: theme.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            flex: 1,
          }}
        >
          {title}
        </div>
        <button type="button" onClick={onAll} style={dialogPillBtn(theme)}>
          All
        </button>
        <button type="button" onClick={onNone} style={dialogPillBtn(theme)}>
          None
        </button>
      </div>
      <div
        className="dailies-check-grid"
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
    fontSize: "0.75rem",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function DailiesSelectionDialog({
  theme,
  charName,
  mode,
  draft,
  setDraft,
  onBack,
  onCancel,
  onConfirm,
}: {
  theme: AppTheme;
  charName: string;
  mode: "add" | "edit";
  draft: SelectedTasks;
  setDraft: (updater: (prev: SelectedTasks) => SelectedTasks) => void;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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

  const footer = (
    <>
      {mode === "add" && (
        <button
          type="button"
          onClick={onBack}
          className="tool-dialog-btn"
          style={{ ...dialogCancelBtnStyle(theme), marginRight: "auto" }}
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="tool-dialog-btn"
        style={dialogCancelBtnStyle(theme)}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="tool-dialog-btn"
        style={accentBtnStyle(theme)}
      >
        {mode === "add" ? "Add" : "Save"}
      </button>
    </>
  );

  return (
    <ToolDialog
      theme={theme}
      title={mode === "add" ? "Select Tasks" : "Edit Tracked Tasks"}
      description={
        <>
          Choose what to track for <strong style={{ color: theme.text }}>{charName}</strong>.
        </>
      }
      onClose={onCancel}
      footer={footer}
    >
      <div
        className="tool-dialog-scroll"
        style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "0.25rem" }}
      >
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
    </ToolDialog>
  );
}

// -- Main card ----------------------------------------------------------------

function CharacterCard({
  theme,
  name,
  storeChar,
  cs,
  index,
  count,
  reorder,
  isDragging,
  isDropTarget,
  dragProps,
  worldTotalFor,
  onToggle,
  onCounterChange,
  onCheckAll,
  onEdit,
  onDelete,
}: {
  theme: AppTheme;
  name: string;
  storeChar: StoredCharacterRecord | null;
  cs: CharDailyState;
  index: number;
  count: number;
  reorder: (from: number, to: number) => void;
  isDragging: boolean;
  isDropTarget: boolean;
  dragProps: CardDragProps;
  worldTotalFor: (counterId: string) => number;
  onToggle: (section: TaskSection, id: string) => void;
  onCounterChange: (task: CounterTask, next: number) => void;
  onCheckAll: (done: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const progress = computeProgress(cs);
  const worldLabel = storeChar
    ? (WORLD_NAMES[storeChar.worldID] ?? `World ${storeChar.worldID}`)
    : null;

  return (
    <div
      className="fade-in dailies-card panel-card"
      {...dragProps}
      style={{
        background: theme.panel,
        border: `1px solid ${isDropTarget ? theme.accent : theme.border}`,
        borderRadius: 14,
        padding: "1.1rem",
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <CardHeader
        theme={theme}
        name={name}
        storeChar={storeChar}
        worldLabel={worldLabel}
        pos={index}
        total={count}
        onMove={(to) => reorder(index, to)}
        progress={progress}
        onDelete={onDelete}
        onCheckAll={onCheckAll}
        onEdit={onEdit}
      />
      <CardBody
        theme={theme}
        cs={cs}
        worldTotalFor={worldTotalFor}
        worldLabel={worldLabel}
        onToggle={onToggle}
        onCounterChange={onCounterChange}
        onEdit={onEdit}
      />
    </div>
  );
}

// -- Workspace ----------------------------------------------------------------

export default function DailiesWorkspace({ theme }: { theme: AppTheme }) {
  const {
    mounted,
    characters,
    getStoreChar,
    getWorldCounterTotal,
    availableStoreChars,
    dialog,
    nameMode,
    setNameMode,
    typedName,
    setTypedName,
    selectedStoreChar,
    setSelectedStoreChar,
    pendingName,
    draft,
    setDraft,
    openAdd,
    proceedToTasks,
    confirmAdd,
    openEdit,
    confirmEdit,
    deleteCharacter,
    reorderCharacters,
    toggleTask,
    setCounter,
    setAllTasks,
    closeDialog,
    goBackToAddName,
  } = useDailiesState();

  const { dragProps, isDragging, isDropTarget } = useCardReorder(reorderCharacters);

  if (!mounted) return null;

  let dialogCharName = "";
  if (dialog?.type === "add-tasks") dialogCharName = dialog.name;
  else if (dialog?.type === "edit") dialogCharName = characters[dialog.index]?.name ?? "";

  return (
    <>
      <style>{`
        .dailies-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.1rem; align-items: start; }
        .dailies-card { transition: box-shadow 0.15s, opacity 0.15s, border-color 0.15s; }
        .dailies-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        @media (max-width: 860px) {
          .dailies-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 435px) {
          .dailies-check-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="page-content">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <ToolHeader
            theme={theme}
            title="Daily Tracker"
            description="Add characters, tap the edit icon to choose which dailies to track, then check them off as you go. Resets at 00:00 UTC."
          />

          <RemindersConfigBar theme={theme} />

          <div className="dailies-grid">
            {characters.map((char, index) => (
              <CharacterCard
                key={char.name}
                theme={theme}
                name={char.name}
                storeChar={getStoreChar(char.name)}
                cs={char.state}
                index={index}
                count={characters.length}
                reorder={reorderCharacters}
                isDragging={isDragging(index)}
                isDropTarget={isDropTarget(index)}
                dragProps={dragProps(index)}
                worldTotalFor={(cid) => getWorldCounterTotal(char.name, cid)}
                onToggle={(section, id) => toggleTask(index, section, id)}
                onCounterChange={(task, next) =>
                  setCounter(index, task.id, next, task.max, task.worldMax ?? task.max)
                }
                onCheckAll={(done) => setAllTasks(index, done)}
                onEdit={() => openEdit(index)}
                onDelete={() => deleteCharacter(index)}
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
          onNext={proceedToTasks}
          onClose={closeDialog}
        />
      )}

      {(dialog?.type === "add-tasks" || dialog?.type === "edit") && (
        <DailiesSelectionDialog
          key={dialogCharName}
          theme={theme}
          charName={dialogCharName}
          mode={dialog.type === "add-tasks" ? "add" : "edit"}
          draft={draft}
          setDraft={(updater) => setDraft(updater)}
          onBack={goBackToAddName}
          onCancel={closeDialog}
          onConfirm={dialog.type === "add-tasks" ? confirmAdd : confirmEdit}
        />
      )}
    </>
  );
}
