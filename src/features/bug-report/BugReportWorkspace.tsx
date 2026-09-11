"use client";

import { useId, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { AppTheme } from "../../components/themes";
import { statusText } from "../../components/statusColors";
import { useMounted } from "../../lib/useMounted";
import { WORLD_NAMES } from "../characters/model/constants";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../characters/model/charactersStore";
import { ActionButton, Field } from "../tools/shared-ui";
import { toolStyles } from "../tools/tool-styles";
import {
  BUG_REPORT_LIMITS,
  BUG_REPORT_PAGE_GROUPS,
  BUG_REPORT_PAGE_LABELS,
  type BugReportPayload,
} from "./bugReportContract";

const NO_CHARACTER = "";

type SendStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "sent" };

interface Draft {
  page: string;
  characterName: string;
  happened: string;
  expected: string;
  steps: string;
}

/** `?from=` is the path the footer link was clicked on. Only a known page
 *  preselects; character profile paths collapse to the Characters entry. */
function pageFromQuery(): string {
  const from = new URLSearchParams(window.location.search).get("from") ?? "";
  if (BUG_REPORT_PAGE_LABELS.has(from)) return from;
  if (from.startsWith("/characters/")) return "/characters";
  return "other";
}

function emptyDraft(page: string): Draft {
  return { page, characterName: NO_CHARACTER, happened: "", expected: "", steps: "" };
}

function toPayload(draft: Draft, character: StoredCharacterRecord | null, theme: AppTheme): BugReportPayload {
  return {
    page: draft.page,
    character: character
      ? {
          name: character.characterName,
          job: character.jobName,
          level: character.level,
          world: WORLD_NAMES[character.worldID] ?? "",
        }
      : null,
    happened: draft.happened,
    expected: draft.expected,
    steps: draft.steps,
    meta: {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      theme: `${theme.name} ${theme.colorMode}`,
    },
    nickname: "",
  };
}

async function sendReport(payload: BugReportPayload): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/bug-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const message = typeof data?.error === "string" ? data.error : "Couldn't send the report. Please try again.";
    return { ok: false, message };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }
}

const columnStyle: CSSProperties = { maxWidth: 680, margin: "0 auto" };

const panelBase: CSSProperties = {
  padding: "1.5rem 1.75rem",
};

const controlGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1rem",
  marginBottom: "1.25rem",
};

const stackedFieldStyle: CSSProperties = { marginBottom: "1.25rem" };

const fullWidthControl: CSSProperties = { width: "100%", boxSizing: "border-box" };

const helperTextBase: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  lineHeight: 1.5,
  margin: "0.9rem 0 0",
};

// Off-screen, not `display: none`, so form-filling bots still see and fill it.
const honeypotStyle: CSSProperties = {
  position: "absolute",
  left: "-10000px",
  width: 1,
  height: 1,
  overflow: "hidden",
};

export default function BugReportWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  return (
    <div className="page-content">
      <div className="page-container" style={columnStyle}>
        <h1 className="page-title" style={{ color: theme.text, marginTop: 0 }}>
          Report a Bug
        </h1>
        <div className="page-subtitle" style={{ color: theme.muted }}>
          Something broken or acting strange? Tell us and it goes straight to the dev team.
        </div>
        {mounted && <BugReportForm theme={theme} />}
      </div>
    </div>
  );
}

/** Mounted only after hydration, so the lazy initializers can read the URL
 *  and localStorage without a server/client mismatch. */
function BugReportForm({ theme }: { theme: AppTheme }) {
  const styles = toolStyles(theme);
  const ids = useId();
  const happenedRef = useRef<HTMLTextAreaElement>(null);
  const [characters] = useState<StoredCharacterRecord[]>(() => selectCharactersList(readCharactersStore()));
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(pageFromQuery()));
  const [status, setStatus] = useState<SendStatus>({ kind: "idle" });

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.kind === "sending") return;
    if (!draft.happened.trim()) {
      setStatus({ kind: "error", message: "Tell us what happened before sending." });
      happenedRef.current?.focus();
      return;
    }
    const character = characters.find((c) => c.characterName === draft.characterName) ?? null;
    const form = event.currentTarget;
    const honeypot = (form.elements.namedItem("nickname") as HTMLInputElement | null)?.value ?? "";
    setStatus({ kind: "sending" });
    const payload = { ...toPayload(draft, character, theme), nickname: honeypot };
    const result = await sendReport(payload);
    setStatus(result.ok ? { kind: "sent" } : { kind: "error", message: result.message });
  };

  const panelStyle: CSSProperties = {
    ...panelBase,
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    color: theme.text,
  };

  if (status.kind === "sent") {
    return (
      <div className="fade-in panel-card" style={panelStyle} role="status">
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
          Report sent. Thank you!
        </div>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", lineHeight: 1.6, color: theme.muted, fontWeight: 600 }}>
          Bug has been submitted. If it turns out to be a bug, it will be addressed shortly.
        </p>
        <ActionButton
          theme={theme}
          label="Send another report"
          onClick={() => {
            setDraft(emptyDraft(draft.page));
            setStatus({ kind: "idle" });
          }}
        />
      </div>
    );
  }

  const sending = status.kind === "sending";
  const textareaStyle: CSSProperties = { ...styles.inputStyle };

  return (
    <form className="fade-in panel-card" style={panelStyle} onSubmit={handleSubmit} noValidate>
      <style>{`.bug-report-textarea::placeholder { color: ${theme.muted}; opacity: 1; }`}</style>

      <div style={controlGridStyle}>
        <Field label="Page or tool" htmlFor={`${ids}-page`} style={styles.labelStyle}>
          <select
            id={`${ids}-page`}
            className="tool-select"
            style={{ ...styles.selectStyle, ...fullWidthControl }}
            value={draft.page}
            onChange={(e) => update("page", e.target.value)}
          >
            {BUG_REPORT_PAGE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.pages.map((page) => (
                  <option key={page.value} value={page.value}>{page.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Character (optional)" htmlFor={`${ids}-character`} style={styles.labelStyle}>
          <select
            id={`${ids}-character`}
            className="tool-select"
            style={{ ...styles.selectStyle, ...fullWidthControl }}
            value={draft.characterName}
            onChange={(e) => update("characterName", e.target.value)}
            disabled={characters.length === 0}
          >
            <option value={NO_CHARACTER}>
              {characters.length === 0 ? "No saved characters" : "Not tied to a character"}
            </option>
            {characters.map((c) => (
              <option key={c.characterName} value={c.characterName}>
                {c.characterName} (Lv. {c.level} {c.jobName})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="What happened" htmlFor={`${ids}-happened`} style={styles.labelStyle} containerStyle={stackedFieldStyle}>
        <textarea
          ref={happenedRef}
          id={`${ids}-happened`}
          className="tool-textarea bug-report-textarea"
          style={textareaStyle}
          value={draft.happened}
          onChange={(e) => update("happened", e.target.value)}
          maxLength={BUG_REPORT_LIMITS.happened}
          placeholder="What went wrong? Include any error message you saw."
          required
          aria-required="true"
        />
      </Field>

      <Field label="What you expected (optional)" htmlFor={`${ids}-expected`} style={styles.labelStyle} containerStyle={stackedFieldStyle}>
        <textarea
          id={`${ids}-expected`}
          className="tool-textarea bug-report-textarea"
          style={{ ...textareaStyle, minHeight: "5rem" }}
          value={draft.expected}
          onChange={(e) => update("expected", e.target.value)}
          maxLength={BUG_REPORT_LIMITS.expected}
          placeholder="What should have happened instead?"
        />
      </Field>

      <Field label="Steps to reproduce (optional)" htmlFor={`${ids}-steps`} style={styles.labelStyle} containerStyle={stackedFieldStyle}>
        <textarea
          id={`${ids}-steps`}
          className="tool-textarea bug-report-textarea"
          style={{ ...textareaStyle, minHeight: "5rem" }}
          value={draft.steps}
          onChange={(e) => update("steps", e.target.value)}
          maxLength={BUG_REPORT_LIMITS.steps}
          placeholder={"1. Open the tool\n2. Click...\n3. See the problem"}
        />
      </Field>

      <div style={honeypotStyle} aria-hidden="true">
        <label htmlFor={`${ids}-nickname`}>Nickname</label>
        <input id={`${ids}-nickname`} name="nickname" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {status.kind === "error" && (
        <p role="alert" style={{ ...helperTextBase, margin: "0 0 0.9rem", color: statusText(theme, "danger") }}>
          {status.message}
        </p>
      )}

      <ActionButton theme={theme} type="submit" label={sending ? "Sending…" : "Send report"} disabled={sending} style={{ minWidth: 140 }} />

      <p style={{ ...helperTextBase, color: theme.muted }}>
        Your browser version, screen size and the page you picked are sent along with the report.
        Nothing saved in MapleDoro is included.
      </p>
    </form>
  );
}
