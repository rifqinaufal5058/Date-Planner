import type { FullPlan } from "@/lib/types"

/** Parse YYYY-MM-DD as a local date (avoids UTC shift). */
export function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(y, m - 1, day)
}

export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function formatDate(d: string, opts: Intl.DateTimeFormatOptions = {}) {
  return parseDate(d).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  })
}

export function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : "--:--"
}

/** "18:00 – 19:30", or just "18:00" when there is no end time. */
export function formatTimeRange(start: string | null, end: string | null) {
  if (!start && !end) return "--:--"
  if (!end) return formatTime(start)
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** Minutes between two HH:MM times on the same day, or null. */
export function spanMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }
  const d = toMin(end) - toMin(start)
  return d > 0 ? d : null
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} menit`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} jam ${m} menit` : `${h} jam`
}

/** Start datetime of a plan: date + first activity time (fallback 00:00). */
export function planStart(plan: FullPlan): Date {
  const d = parseDate(plan.plan_date)
  const first = plan.activities.find((a) => a.start_time)?.start_time
  if (first) {
    const [h, m] = first.split(":").map(Number)
    d.setHours(h, m)
  }
  return d
}

/** Upcoming = not completed and the date is today or later. */
export function isUpcoming(plan: FullPlan, today = todayISO()) {
  return plan.status !== "completed" && plan.plan_date >= today
}

export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function appleMapsUrl(lat: number, lng: number, name?: string | null) {
  const q = name ? `&q=${encodeURIComponent(name)}` : ""
  return `https://maps.apple.com/?daddr=${lat},${lng}${q}`
}

export function progressOf(plan: FullPlan) {
  const total = plan.activities.length
  const done = plan.activities.filter((a) => a.status !== "scheduled").length
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 }
}
