export type UrsusStatus =
  | { active: true; remaining: number }
  | { active: false; until: number };

export function getUrsusStatus(now: Date): UrsusStatus {
  const h = now.getUTCHours();
  const nowMs = now.getTime();

  const inWindow1 = h >= 1 && h < 5;
  const inWindow2 = h >= 18 && h < 22;

  if (inWindow1 || inWindow2) {
    const endHour = inWindow1 ? 5 : 22;
    const end = new Date(now);
    end.setUTCHours(endHour, 0, 0, 0);
    return {
      active: true as const,
      remaining: end.getTime() - nowMs,
    };
  }

  let nextStart: Date;
  if (h < 1) {
    nextStart = new Date(now);
    nextStart.setUTCHours(1, 0, 0, 0);
  } else if (h >= 5 && h < 18) {
    nextStart = new Date(now);
    nextStart.setUTCHours(18, 0, 0, 0);
  } else {
    nextStart = new Date(now);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    nextStart.setUTCHours(1, 0, 0, 0);
  }
  return { active: false as const, until: nextStart.getTime() - nowMs };
}

export function utcDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
