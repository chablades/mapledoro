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

/** Format a millisecond duration as "Dd:HHh:MMm" once it spans a day,
 *  falling back to HH:MM:SS under 24 hours. Clamped at zero. */
export function formatCountdownDays(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  if (d === 0) return formatCountdown(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d:${pad(h)}h:${pad(m)}m`;
}
