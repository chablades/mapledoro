/*
  Optional Google Drive cloud backup, appDataFolder pattern (as used by
  paimon.moe and friends).

  This is a cloud save, not data collection, and the whole module is built to
  keep it that way:

  - The only scope ever requested is drive.appdata, which grants access to a
    hidden per-app folder in the user's Drive and nothing else. Never widen it.
  - The flow is pure client side: the user's browser talks directly to Google's
    OAuth and Drive REST endpoints. No MapleDoro server, no third party, and no
    client secret is involved, and nothing here logs or inspects the payload.
  - The one file this module touches (`mapledoro-data.json`) only ever holds the
    caller-supplied backup payload; the Settings page builds that payload from
    MapleDoro's own localStorage keys.

  Auth is Google Identity Services' token client. Tokens are short-lived
  (~1 hour), held in memory only, and never persisted; when a Drive call comes
  back 401, driveFetch silently requests a fresh token once and retries. GIS
  itself decides how much UI that needs: silent iframe refresh when the grant
  and session are still live, a popup otherwise.

  The only thing persisted here is a small "connected" flag + last-backup
  timestamp under its own localStorage key. That key is deliberately excluded
  from the backup payload (see collectBackupData in settings) because it is sync
  metadata, not save data: a backup restored on another browser must not claim
  that browser is connected. It keeps the `mapledoro` prefix on purpose so the
  Settings hard reset clears it.
*/

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "mapledoro-data.json";

/** Deployments without a configured OAuth client ID simply don't render the
 *  Drive panel; there is nothing to degrade to. */
export const driveSyncConfigured = Boolean(CLIENT_ID);

/** Excluded from backup payloads -- see the module comment. */
export const DRIVE_SYNC_STORAGE_KEY = "mapledoro_drive_sync_v1";

interface DriveSyncState {
  connected: boolean;
  lastSyncedAt: number | null;
}

const DISCONNECTED: DriveSyncState = { connected: false, lastSyncedAt: null };

/* ---------- Minimal GIS typings (the script is loaded on demand below) ---------- */

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrides?: { prompt?: "" }) => void;
}

interface GoogleOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: { type?: string }) => void;
  }) => GoogleTokenClient;
  revoke: (token: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOauth2 } };
  }
}

/* ---------- Connected-flag persistence ---------- */

export function readDriveSyncState(): DriveSyncState {
  if (typeof window === "undefined") return DISCONNECTED;
  try {
    const raw = localStorage.getItem(DRIVE_SYNC_STORAGE_KEY);
    if (!raw) return DISCONNECTED;
    const parsed = JSON.parse(raw) as { version?: number; connected?: boolean; lastSyncedAt?: number };
    if (parsed?.version === 1) {
      return {
        connected: parsed.connected === true,
        lastSyncedAt: typeof parsed.lastSyncedAt === "number" ? parsed.lastSyncedAt : null,
      };
    }
  } catch { /* treat as disconnected */ }
  return DISCONNECTED;
}

function writeDriveSyncState(state: DriveSyncState): void {
  try {
    localStorage.setItem(DRIVE_SYNC_STORAGE_KEY, JSON.stringify({ version: 1, ...state }));
  } catch {
    // Not routed through storageWriteFailure: a lost write here costs the
    // "connected" badge on the next visit, never player data.
  }
}

/* ---------- GIS loading and tokens ---------- */

let gisLoading: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = null; // allow a retry on the next click
      reject(new Error("Couldn't load Google sign-in. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

let accessToken: string | null = null;
let tokenClient: GoogleTokenClient | null = null;
// The token client's callback is fixed at init, so each request parks its
// promise handlers here for that shared callback to settle. The Settings panel
// disables its buttons while a request is in flight, so only one pair is ever
// parked at a time.
let pendingToken: { resolve: (token: string) => void; reject: (error: Error) => void } | null = null;

function settlePendingToken(settle: (pending: NonNullable<typeof pendingToken>) => void): void {
  const pending = pendingToken;
  pendingToken = null;
  if (pending) settle(pending);
}

async function requestToken(): Promise<string> {
  await loadGis();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2 || !CLIENT_ID) throw new Error("Google sign-in isn't available.");
  tokenClient ??= oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    // Empty prompt below means Google shows exactly as much UI as needed: the
    // full consent screen on first connect, nothing on a silent renewal.
    callback: (response) => {
      settlePendingToken((pending) => {
        if (response.access_token) {
          accessToken = response.access_token;
          pending.resolve(response.access_token);
        } else {
          pending.reject(new Error("Google didn't grant access. Try connecting again."));
        }
      });
    },
    error_callback: (error) => {
      settlePendingToken((pending) => {
        pending.reject(new Error(
          error?.type === "popup_closed"
            ? "The Google sign-in window was closed before finishing."
            : "Google sign-in failed. Try again.",
        ));
      });
    },
  });
  const client = tokenClient;
  return new Promise((resolve, reject) => {
    pendingToken = { resolve, reject };
    client.requestAccessToken({ prompt: "" });
  });
}

/* ---------- Drive REST, with the silent 401 retry ---------- */

async function driveFetch(url: string, init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }): Promise<Response> {
  const call = (token: string) =>
    fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  let response = await call(accessToken ?? (await requestToken()));
  if (response.status === 401) {
    // GIS access tokens last about an hour; renew once and retry.
    accessToken = null;
    response = await call(await requestToken());
  }
  return response;
}

/** Finds the backup file, with Drive's own last-modified time (server-stamped,
 *  so it is trustworthy across devices in a way client clocks are not). Null
 *  when no backup exists yet. Callers pass the result to saveToAppData /
 *  loadFromAppData so one metadata fetch serves the whole flow. */
export async function getDriveBackupMeta(): Promise<{ id: string; savedAt: number | null } | null> {
  const query = encodeURIComponent(`name='${FILE_NAME}'`);
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)`,
    { method: "GET" },
  );
  if (!response.ok) throw new Error("Couldn't reach Google Drive. Try again in a moment.");
  const body = (await response.json()) as { files?: { id: string; modifiedTime?: string }[] };
  const file = body.files?.[0];
  if (!file) return null;
  const savedAt = file.modifiedTime ? Date.parse(file.modifiedTime) : NaN;
  return { id: file.id, savedAt: Number.isNaN(savedAt) ? null : savedAt };
}

// A constant boundary is fine here: both multipart parts are JSON we serialize
// ourselves, and JSON.stringify escapes any string into one line that cannot
// reproduce the CRLF-delimited boundary marker.
const MULTIPART_BOUNDARY = "mapledoro_drive_backup_boundary";

function multipartCreateBody(content: string): string {
  const metadata = JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" });
  return [
    `--${MULTIPART_BOUNDARY}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${MULTIPART_BOUNDARY}`,
    "Content-Type: application/json",
    "",
    content,
    `--${MULTIPART_BOUNDARY}--`,
  ].join("\r\n");
}

/** Writes the backup payload as the one appDataFolder file: overwrites
 *  `existing` (a getDriveBackupMeta result) when given, creates the file
 *  otherwise. A 404 on the overwrite falls back to creating, covering a backup
 *  deleted between the caller's metadata fetch and this write. */
export async function saveToAppData(data: unknown, existing: { id: string } | null): Promise<void> {
  const content = JSON.stringify(data);
  if (existing) {
    const response = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: content,
    });
    if (response.status !== 404) {
      if (!response.ok) throw new Error("Couldn't save the backup to Google Drive. Try again in a moment.");
      return;
    }
  }
  const response = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${MULTIPART_BOUNDARY}` },
    body: multipartCreateBody(content),
  });
  if (!response.ok) throw new Error("Couldn't save the backup to Google Drive. Try again in a moment.");
}

/** Downloads the backup file's content, given an id from getDriveBackupMeta. */
export async function loadFromAppData(fileId: string): Promise<unknown> {
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: "GET",
  });
  if (!response.ok) throw new Error("Couldn't download the backup from Google Drive. Try again in a moment.");
  return response.json();
}

/* ---------- Connect / disconnect ---------- */

/** Runs the sign-in flow (Google shows its consent popup as needed) and
 *  persists the connected flag. Returns the new state for the caller's UI. */
export async function connectDrive(): Promise<DriveSyncState> {
  await requestToken();
  const state: DriveSyncState = { connected: true, lastSyncedAt: readDriveSyncState().lastSyncedAt };
  writeDriveSyncState(state);
  return state;
}

/** Stamps a successful backup. Returns the new state for the caller's UI. */
export function markDriveSynced(): DriveSyncState {
  const state: DriveSyncState = { connected: true, lastSyncedAt: Date.now() };
  writeDriveSyncState(state);
  return state;
}

/** Drops the in-memory token (revoking the grant when one is held -- after a
 *  reload there is no token to revoke, and the user can always prune the grant
 *  from their Google account settings) and clears the connected flag. The
 *  backup file itself stays in their Drive. */
export function disconnectDrive(): DriveSyncState {
  const token = accessToken;
  accessToken = null;
  if (token) window.google?.accounts?.oauth2?.revoke(token, () => undefined);
  try {
    localStorage.removeItem(DRIVE_SYNC_STORAGE_KEY);
  } catch { /* nothing to clear */ }
  return DISCONNECTED;
}
