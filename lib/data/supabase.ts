"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import type { Activity, DatePlan, FullPlan, Journal, Photo, PlaceReview } from "@/lib/types"
import { applyChoice, derivePlanStatus, newId, newShareToken, normalizeActivity, sortPlan, type Repository } from "./repository"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const PHOTO_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? "photos"

export const isSupabaseConfigured = Boolean(URL && KEY)

let client: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!client) client = createClient(URL!, KEY!, { auth: { persistSession: false } })
  return client
}

const SELECT_FULL = "*, activities(*), journals(*, photos(*), place_reviews(*))"

type JournalRow = Journal & { photos: Photo[]; place_reviews: PlaceReview[] }
type Row = DatePlan & {
  activities: Activity[]
  journals: JournalRow[] | JournalRow | null
}

function toFull(row: Row): FullPlan {
  const { journals, ...rest } = row
  const j = Array.isArray(journals) ? (journals[0] ?? null) : journals
  const journal = j
    ? (({ place_reviews, ...jr }) => ({ ...jr, photos: jr.photos ?? [], reviews: place_reviews ?? [] }))(j)
    : null
  return sortPlan({ ...rest, activities: row.activities ?? [], journal })
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const MIGRATION_FILE = "supabase/migrations/2026-10-03_activity_choices.sql"

export class MigrationError extends Error {
  constructor() {
    super(`Database Supabase perlu dimigrasi untuk fitur pilihan. Jalankan ${MIGRATION_FILE} di SQL editor`)
  }
}

function omitColumns<T extends object>(a: T, keys: string[]): Partial<T> {
  const copy = { ...a } as Record<string, unknown>
  for (const k of keys) delete copy[k]
  return copy as Partial<T>
}

let warned = false
function warnMissingMigration() {
  if (warned) return
  warned = true
  toast.warning(
    `Sebagian data belum tersimpan karena database Supabase perlu dimigrasi. Jalankan ${MIGRATION_FILE}.`,
    { duration: 10000 }
  )
}

async function recomputeStatus(planId: string) {
  const acts = check(
    await sb().from("activities").select("status").eq("date_plan_id", planId)
  ) as Pick<Activity, "status">[]
  const status = derivePlanStatus(acts.map((a) => a.status))
  check(
    await sb()
      .from("date_plans")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", planId)
  )
}

/** XHR upload so we can surface real progress (supabase-js has no progress callback). */
function uploadWithProgress(path: string, file: File, onProgress?: (f: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`)
    xhr.setRequestHeader("Authorization", `Bearer ${KEY}`)
    xhr.setRequestHeader("apikey", KEY!)
    xhr.setRequestHeader("x-upsert", "true")
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`))
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.send(file)
  })
}

export const supabaseRepository: Repository = {
  kind: "supabase",

  async listPlans() {
    const rows = check(await sb().from("date_plans").select(SELECT_FULL)) as Row[]
    return rows.map(toFull)
  },

  async getPlan(id) {
    const row = check(
      await sb().from("date_plans").select(SELECT_FULL).eq("id", id).maybeSingle()
    ) as Row | null
    return row ? toFull(row) : null
  },

  async getPlanByShareToken(token) {
    const row = check(
      await sb().from("date_plans").select(SELECT_FULL).eq("share_token", token).maybeSingle()
    ) as Row | null
    return row ? toFull(row) : null
  },

  async savePlan(plan, activities) {
    const now = new Date().toISOString()
    check(
      await sb()
        .from("date_plans")
        .upsert({
          ...plan,
          status: derivePlanStatus(activities.map((a) => a.status)),
          updated_at: now,
        })
    )
    const keep = activities.map((a) => a.id)
    let del = sb().from("activities").delete().eq("date_plan_id", plan.id)
    if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`)
    check(await del)
    if (activities.length) {
      const res = await sb().from("activities").upsert(activities)
      if (res.error && /options|chosen_/.test(res.error.message)) {
        // Choices need the new columns; refuse rather than silently dropping the options.
        if (activities.some((a) => a.options?.length)) throw new MigrationError()
        warnMissingMigration()
        check(await sb().from("activities").upsert(activities.map((a) => omitColumns(a, ["options", "chosen_option_id", "chosen_by"]))))
      } else if (res.error && /end_time/.test(res.error.message)) {
        // DB not migrated yet: save without end time instead of losing the plan.
        warnMissingMigration()
        check(await sb().from("activities").upsert(activities.map((a) => omitColumns(a, ["end_time"]))))
      } else check(res)
    }
  },

  async deletePlan(id) {
    const plan = await this.getPlan(id)
    const paths = (plan?.journal?.photos ?? [])
      .map((p) => p.image_url.split(`/${PHOTO_BUCKET}/`)[1])
      .filter(Boolean)
    if (paths.length) await sb().storage.from(PHOTO_BUCKET).remove(paths)
    check(await sb().from("date_plans").delete().eq("id", id))
  },

  async setActivityStatus(activityId, status) {
    const row = check(
      await sb()
        .from("activities")
        .update({ status })
        .eq("id", activityId)
        .select("date_plan_id")
        .single()
    ) as { date_plan_id: string }
    await recomputeStatus(row.date_plan_id)
  },

  async chooseOption(activityId, optionId, by) {
    const row = check(await sb().from("activities").select("*").eq("id", activityId).single()) as Activity
    const patch = applyChoice(normalizeActivity(row), optionId, by)
    const res = await sb().from("activities").update(patch).eq("id", activityId)
    if (res.error && /chosen_|options/.test(res.error.message)) throw new MigrationError()
    check(res)
  },

  async setPlanStatus(id, status) {
    check(
      await sb()
        .from("date_plans")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
    )
  },

  async ensureShareToken(id) {
    const row = check(
      await sb().from("date_plans").select("share_token").eq("id", id).single()
    ) as { share_token: string | null }
    if (row.share_token) return row.share_token
    const token = newShareToken()
    check(await sb().from("date_plans").update({ share_token: token }).eq("id", id))
    return token
  },

  async saveJournal(journal, reviews) {
    check(await sb().from("journals").upsert(journal, { onConflict: "id" }))
    const keep = reviews.map((r) => r.id)
    let del = sb().from("place_reviews").delete().eq("journal_id", journal.id)
    if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`)
    check(await del) // photos.place_review_id is "on delete set null"
    if (reviews.length) check(await sb().from("place_reviews").upsert(reviews))
  },

  async uploadPhoto(journalId, file, placeReviewId, onProgress) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const id = newId()
    const path = `${journalId}/${id}.${ext}`
    await uploadWithProgress(path, file, onProgress)
    const { data } = sb().storage.from(PHOTO_BUCKET).getPublicUrl(path)
    const photo = check(
      await sb()
        .from("photos")
        .insert({ id, journal_id: journalId, place_review_id: placeReviewId, image_url: data.publicUrl })
        .select()
        .single()
    ) as Photo
    return photo
  },

  async deletePhoto(photo) {
    const path = photo.image_url.split(`/${PHOTO_BUCKET}/`)[1]
    if (path) await sb().storage.from(PHOTO_BUCKET).remove([path])
    check(await sb().from("photos").delete().eq("id", photo.id))
  },
}
