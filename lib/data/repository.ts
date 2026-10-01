import type {
  ActivityInput,
  ActivityStatus,
  Activity,
  ChoiceBy,
  FullPlan,
  JournalInput,
  PlaceReview,
  PlaceReviewInput,
  Photo,
  PlanInput,
  PlanStatus,
} from "@/lib/types"

/**
 * Storage-agnostic contract. Every write uses client-generated ids and is an
 * upsert, so retrying a request after a network failure never creates
 * duplicates.
 */
export interface Repository {
  readonly kind: "supabase" | "local"
  listPlans(): Promise<FullPlan[]>
  getPlan(id: string): Promise<FullPlan | null>
  getPlanByShareToken(token: string): Promise<FullPlan | null>
  savePlan(plan: PlanInput, activities: ActivityInput[]): Promise<void>
  deletePlan(id: string): Promise<void>
  setActivityStatus(activityId: string, status: ActivityStatus): Promise<void>
  /** Pick (or clear with null) an option of a choice activity. */
  chooseOption(activityId: string, optionId: string | null, by: ChoiceBy): Promise<void>
  setPlanStatus(id: string, status: PlanStatus): Promise<void>
  ensureShareToken(id: string): Promise<string>
  /** Upserts the journal and replaces its place reviews with `reviews`. */
  saveJournal(journal: JournalInput, reviews: PlaceReviewInput[]): Promise<void>
  uploadPhoto(
    journalId: string,
    file: File,
    placeReviewId: string | null,
    onProgress?: (fraction: number) => void
  ): Promise<Photo>
  deletePhoto(photo: Photo): Promise<void>
}

export function newId(): string {
  return crypto.randomUUID()
}

export function newShareToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export function sortPlan(plan: FullPlan): FullPlan {
  return {
    ...plan,
    activities: [...plan.activities].map(normalizeActivity).sort((a, b) => a.order_index - b.order_index),
    journal: plan.journal
      ? {
          ...plan.journal,
          photos: [...plan.journal.photos]
            .map((p) => ({ ...p, place_review_id: p.place_review_id ?? null }))
            .sort((a, b) => a.created_at.localeCompare(b.created_at)),
          reviews: sortReviews(plan.journal.reviews ?? [], plan),
        }
      : null,
  }
}

/** A plan is finished when it has activities and none are still scheduled. */
export function derivePlanStatus(statuses: ActivityStatus[]): PlanStatus {
  return statuses.length > 0 && statuses.every((s) => s !== "scheduled")
    ? "completed"
    : "planned"
}

/** Order reviews the same way as the timeline (main location last). */
function sortReviews(reviews: PlaceReview[], plan: FullPlan): PlaceReview[] {
  const order = new Map(plan.activities.map((a) => [a.id, a.order_index]))
  return [...reviews].sort(
    (a, b) => (order.get(a.activity_id ?? "") ?? 1e9) - (order.get(b.activity_id ?? "") ?? 1e9)
  )
}

/** Fill fields that older rows (before "choices" existed) don't have. */
export function normalizeActivity(a: Activity): Activity {
  const options = Array.isArray(a.options) && a.options.length >= 2 ? a.options : null
  return {
    ...a,
    end_time: a.end_time ?? null,
    options,
    chosen_option_id: options ? (a.chosen_option_id ?? null) : null,
    chosen_by: options ? (a.chosen_by ?? null) : null,
  }
}

/**
 * Activity patch for choosing an option: the chosen place is copied into the
 * activity's own location so direction/map/reviews keep working unchanged.
 */
export function applyChoice(a: Activity, optionId: string | null, by: ChoiceBy) {
  const opt = optionId ? a.options?.find((o) => o.id === optionId) : null
  if (optionId && !opt) throw new Error("Pilihan tidak ditemukan")
  return {
    chosen_option_id: opt ? opt.id : null,
    chosen_by: opt ? by : null,
    location_name: opt ? opt.location_name ?? opt.label : null,
    latitude: opt ? opt.latitude : null,
    longitude: opt ? opt.longitude : null,
  } satisfies Partial<Activity>
}
