const STORAGE_KEY = "mapledoro_tools_v1";

interface GlobalToolsStore {
  version: 1;
  [key: string]: unknown;
}

function readStore(): GlobalToolsStore {
  if (typeof window === "undefined") return { version: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1 };
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1) return parsed as GlobalToolsStore;
  } catch { /* ignore */ }
  return { version: 1 };
}

function writeStore(store: GlobalToolsStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export function readGlobalTool<T>(key: string): T | null {
  const store = readStore();
  const data = store[key];
  return data != null ? (data as T) : null;
}

export function writeGlobalTool(key: string, data: unknown): void {
  const store = readStore();
  store[key] = data;
  writeStore(store);
}
