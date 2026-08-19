/**
 * Time formatting. Deliberately free of imports.
 *
 * This lived in lib/recents.ts, which is `server-only` because it reaches the
 * database — so a client component that wanted to format a timestamp dragged
 * the whole data layer into the browser bundle and broke the build. A pure
 * function has no business sitting behind that boundary.
 */

/** "12 minutes ago". Past only — these values are always historical. */
export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";

  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;

  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;

  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;

  const mo = Math.round(d / 30);
  return `${mo} month${mo === 1 ? "" : "s"} ago`;
}
