/** Accept unix seconds/millis, ISO strings, or yt-dlp YYYYMMDD → YYYY-MM-DD. */
export function toDate(ts: unknown): string | undefined {
  if (ts === null || ts === undefined || ts === "" || ts === 0) return undefined;
  try {
    if (typeof ts === "string") {
      const t = ts.trim();
      if (/^\d{8}$/.test(t)) return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
      if (/^\d{10,13}$/.test(t)) return fromEpoch(Number(t));
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return undefined;
    }
    if (typeof ts === "number") return fromEpoch(ts);
  } catch {
    return undefined;
  }
  return undefined;
}

function fromEpoch(n: number): string | undefined {
  if (!Number.isFinite(n)) return undefined;
  const ms = n > 1e12 ? n : n * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}
