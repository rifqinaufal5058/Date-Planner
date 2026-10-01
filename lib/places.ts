import type { FullPlan } from "@/lib/types"

export type PlaceVisit = {
  planId: string
  planTitle: string
  date: string
  activity: string | null
  category: string | null
  rating: number | null
}

export type Place = {
  key: string
  name: string
  lat: number
  lng: number
  visits: PlaceVisit[]
  /** true when at least one visit is from a completed plan */
  visited: boolean
  upcoming: boolean
  lastDate: string
  avgRating: number | null
}

function placeRating(plan: FullPlan, activityId: string | null, name: string | null) {
  const reviews = plan.journal?.reviews ?? []
  const r = activityId
    ? reviews.find((x) => x.activity_id === activityId)
    : reviews.find((x) => !x.activity_id || (name && x.place_name.toLowerCase() === name.toLowerCase()))
  return r?.rating ?? null
}

/** ~11m grid so the same spot from different plans merges into one pin. */
function cellKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

/**
 * Collect places from activities. Visited = completed activity of any plan;
 * upcoming = scheduled activity of a plan not yet completed. The plan's main
 * location is just an area label and is intentionally not pinned.
 */
export function collectPlaces(plans: FullPlan[]): Place[] {
  const map = new Map<string, Place>()

  const add = (
    plan: FullPlan,
    name: string | null,
    lat: number | null,
    lng: number | null,
    kind: "visited" | "upcoming",
    activity?: { id: string; name: string; category: string }
  ) => {
    if (lat == null || lng == null) return
    const key = cellKey(lat, lng)
    let p = map.get(key)
    if (!p) {
      p = { key, name: name || plan.title, lat, lng, visits: [], visited: false, upcoming: false, lastDate: plan.plan_date, avgRating: null }
      map.set(key, p)
    }
    if (!p.name && name) p.name = name
    if (kind === "visited") p.visited = true
    else p.upcoming = true
    // one entry per plan per place
    if (!p.visits.some((v) => v.planId === plan.id)) {
      p.visits.push({
        planId: plan.id,
        planTitle: plan.title,
        date: plan.plan_date,
        activity: activity?.name ?? null,
        category: activity?.category ?? null,
        // Prefer the rating given to this specific place; fall back to the date rating.
        rating: placeRating(plan, activity?.id ?? null, name) ?? plan.journal?.rating ?? null,
      })
    }
    if (plan.plan_date > p.lastDate) p.lastDate = plan.plan_date
  }

  for (const plan of plans) {
    const done = plan.status === "completed"
    if (done) {
      const acts = plan.activities.filter((a) => a.status === "completed")
      for (const a of acts) add(plan, a.location_name, a.latitude, a.longitude, "visited", a)
    } else {
      for (const a of plan.activities) {
        if (a.status === "completed") add(plan, a.location_name, a.latitude, a.longitude, "visited", a)
        else if (a.status === "scheduled") add(plan, a.location_name, a.latitude, a.longitude, "upcoming", a)
      }
    }
  }

  return [...map.values()]
    .map((p) => {
      const rated = p.visits.filter((v) => v.rating)
      p.visits.sort((a, b) => b.date.localeCompare(a.date))
      return {
        ...p,
        avgRating: rated.length ? rated.reduce((s, v) => s + (v.rating ?? 0), 0) / rated.length : null,
      }
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}
