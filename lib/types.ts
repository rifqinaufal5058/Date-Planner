export type PlanStatus = "planned" | "completed"
export type ActivityStatus = "scheduled" | "completed" | "skipped"

export const ACTIVITY_CATEGORIES = [
  "Food",
  "Coffee",
  "Movie",
  "Activity",
  "Shopping",
  "Nature",
  "Travel",
  "Other",
] as const
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]

export interface GeoPoint {
  location_name: string | null
  latitude: number | null
  longitude: number | null
}

export interface DatePlan extends GeoPoint {
  id: string
  title: string
  description: string | null
  plan_date: string // YYYY-MM-DD
  status: PlanStatus
  share_token: string | null
  created_at: string
  updated_at: string
}

/** One alternative inside a "choice" activity, e.g. Taburai vs Tom Sushi. */
export interface ActivityOption extends GeoPoint {
  id: string
  label: string
  note: string | null
}

export type ChoiceBy = "owner" | "partner"

export interface Activity extends GeoPoint {
  id: string
  date_plan_id: string
  name: string
  /**
   * When set (2+ items) the activity is a choice. The chosen option's place is
   * copied into the activity's own location fields, so everything downstream
   * (direction, map, reviews) works unchanged.
   */
  options: ActivityOption[] | null
  chosen_option_id: string | null
  chosen_by: ChoiceBy | null
  category: string
  start_time: string | null // HH:MM
  end_time: string | null // HH:MM
  status: ActivityStatus
  /** Travel time (minutes) from the previous activity to this one. */
  journey_duration_minutes: number | null
  order_index: number
  created_at: string
}

export interface Photo {
  id: string
  journal_id: string
  /** Set when the photo belongs to a specific place review, null = photo of the whole date. */
  place_review_id: string | null
  image_url: string
  created_at: string
}

/** Date-level memory: overall rating + the story of the day. */
export interface Journal {
  id: string
  date_plan_id: string
  title: string
  rating: number | null
  favorite_moment: string | null
  /** "Ceritain date hari ini gimana" */
  notes: string | null
  /** Legacy (pre per-place reviews). Still shown when present. */
  would_go_again: boolean | null
  food_menu: string | null
  created_at: string
}

/** Per-place review inside a date (one per visited activity / main location). */
export interface PlaceReview extends GeoPoint {
  id: string
  journal_id: string
  /** null = the plan's main location */
  activity_id: string | null
  place_name: string
  rating: number | null
  would_go_again: boolean | null
  notes: string | null
  food_menu: string | null
  created_at: string
}

export interface JournalWithPhotos extends Journal {
  photos: Photo[]
  reviews: PlaceReview[]
}

export interface FullPlan extends DatePlan {
  activities: Activity[]
  journal: JournalWithPhotos | null
}

export type PlanInput = Pick<
  DatePlan,
  "id" | "title" | "description" | "plan_date" | "location_name" | "latitude" | "longitude"
>
export type ActivityInput = Omit<Activity, "created_at">
export type JournalInput = Omit<Journal, "created_at">
export type PlaceReviewInput = Omit<PlaceReview, "created_at">

/** A choice activity that nobody has picked yet. */
export function isPendingChoice(a: Pick<Activity, "options" | "chosen_option_id">) {
  return (a.options?.length ?? 0) >= 2 && !a.chosen_option_id
}

export function chosenOption(a: Pick<Activity, "options" | "chosen_option_id">) {
  return a.options?.find((o) => o.id === a.chosen_option_id) ?? null
}
