/** Business-day helpers in the shop's timezone. */
export function tzOffsetMs(tz: string, at = new Date()) {
  const s = at.toLocaleString("en-US", { timeZone: tz });
  return new Date(s).getTime() - new Date(at.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
}

/** Start of the business day (in tz) containing `at`, as a UTC Date. */
export function startOfDay(tz: string, at = new Date()) {
  const off = tzOffsetMs(tz, at);
  const local = new Date(at.getTime() + off);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - off);
}

export function dayKey(tz: string, at: Date) {
  return at.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 86400_000);
}

export function startOfMonth(tz: string, at = new Date()) {
  const off = tzOffsetMs(tz, at);
  const local = new Date(at.getTime() + off);
  local.setUTCDate(1);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - off);
}

export function parseRange(sp: { from?: string; to?: string }, tz: string, defaultDays = 30) {
  const to = sp.to ? addDays(new Date(`${sp.to}T00:00:00Z`), 1) : addDays(startOfDay(tz), 1);
  const from = sp.from ? new Date(`${sp.from}T00:00:00Z`) : addDays(to, -defaultDays);
  return { from, to, fromKey: from.toISOString().slice(0, 10), toKey: addDays(to, -1).toISOString().slice(0, 10) };
}
