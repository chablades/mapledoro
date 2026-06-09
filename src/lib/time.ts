/** Next UTC reset after `base`: daily at `hour`, or weekly when `dayOfWeek`
 *  (0 = Sunday) is given. */
export function getNextReset(base: Date, hour: number, dayOfWeek?: number) {
  const next = new Date(base);
  next.setUTCHours(hour, 0, 0, 0);
  if (dayOfWeek !== undefined) {
    const day = base.getUTCDay();
    let diff = dayOfWeek - day;
    if (diff < 0 || (diff === 0 && base >= next)) diff += 7;
    next.setUTCDate(base.getUTCDate() + diff);
  } else {
    if (base >= next) next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

/** Format a millisecond duration as HH:MM:SS, clamped at zero. */
export function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return [h, m, sc].map((n) => String(n).padStart(2, "0")).join(":");
}
