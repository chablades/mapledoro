"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type ReminderId = "ursus" | "autoHarvest" | "solErda";

export interface ReminderDef {
  id: ReminderId;
  icon: string;
  title: string;
  description: string;
}

export const REMINDER_DEFS: ReminderDef[] = [
  {
    id: "ursus",
    icon: "🐻",
    title: "Ursus",
    description: "Complete the 3 daily Ursus runs",
  },
  {
    id: "autoHarvest",
    icon: "🌿",
    title: "Auto-Harvest",
    description: "Claim and start Auto Harvest.",
  },
  {
    id: "solErda",
    icon: "https://media.maplestorywiki.net/yetidb/Etc_Sol_Erda_Fragment_%28Full_Size%29.png",
    title: "Sol Erda Booster",
    description: "Claim daily Sol Erda Booster rewards.",
  },
];

export interface RemindersState {
  enabled: Record<ReminderId, boolean>;
  dismissed: Partial<Record<ReminderId, string>>;
}

export const REMINDERS_STORAGE_KEY = "mapledoro_reminders_v1";

export function defaultRemindersState(): RemindersState {
  return {
    enabled: { ursus: false, autoHarvest: false, solErda: false },
    dismissed: {},
  };
}

export function loadRemindersState(): RemindersState {
  if (typeof window === "undefined") return defaultRemindersState();
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return defaultRemindersState();
    const parsed = JSON.parse(raw) as Partial<RemindersState>;
    return {
      enabled: { ...defaultRemindersState().enabled, ...parsed.enabled },
      dismissed: parsed.dismissed ?? {},
    };
  } catch {
    return defaultRemindersState();
  }
}

function saveRemindersState(state: RemindersState) {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function useRemindersState() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [state, setState] = useState<RemindersState>(() => {
    if (typeof window === "undefined") return defaultRemindersState();
    return loadRemindersState();
  });

  useEffect(() => {
    if (mounted) saveRemindersState(state);
  }, [mounted, state]);

  const toggleEnabled = useCallback((id: ReminderId) => {
    setState((prev) => ({
      ...prev,
      enabled: { ...prev.enabled, [id]: !prev.enabled[id] },
    }));
  }, []);

  const markDone = useCallback((id: ReminderId, today: string) => {
    setState((prev) => ({
      ...prev,
      dismissed: { ...prev.dismissed, [id]: today },
    }));
  }, []);

  const clearAll = useCallback((today: string) => {
    setState((prev) => {
      const dismissed: Partial<Record<ReminderId, string>> = { ...prev.dismissed };
      for (const def of REMINDER_DEFS) {
        if (prev.enabled[def.id]) dismissed[def.id] = today;
      }
      return { ...prev, dismissed };
    });
  }, []);

  return { mounted, state, toggleEnabled, markDone, clearAll };
}
