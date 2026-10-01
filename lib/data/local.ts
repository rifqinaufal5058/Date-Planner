"use client"

import type {
  Activity,
  ActivityStatus,
  DatePlan,
  FullPlan,
  Journal,
  JournalInput,
  PlaceReviewInput,
  Photo,
  PlaceReview,
  PlanStatus,
} from "@/lib/types"
import { applyChoice, derivePlanStatus, newId, newShareToken, normalizeActivity, sortPlan, type Repository } from "./repository"

/**
 * On-device fallback used when Supabase env vars are not configured.
 * Data lives in IndexedDB so it survives reloads and holds photos comfortably.
 */
const DB_NAME = "date-planner"
const DB_VERSION = 2 // v2: + reviews (per-place memories)
const STORES = ["plans", "activities", "journals", "photos", "reviews"] as const
type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      // Another tab is upgrading the schema: let go so it isn't blocked forever.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    req.onblocked = () => {
      // An older tab still holds the previous version open.
      console.warn("Date Planner: tutup tab lain dari aplikasi ini untuk menyelesaikan pembaruan data.")
    }
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function all<T>(store: StoreName): Promise<T[]> {
  const db = await openDb()
  return wrap(db.transaction(store).objectStore(store).getAll()) as Promise<T[]>
}

async function get<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDb()
  return wrap(db.transaction(store).objectStore(store).get(id)) as Promise<T | undefined>
}

/** Run several writes atomically. */
async function tx(stores: StoreName[], fn: (t: IDBTransaction) => void): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, "readwrite")
    fn(t)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

function readAsDataUrl(file: Blob, onProgress?: (f: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function assemble(plans: DatePlan[]): Promise<FullPlan[]> {
  const [activities, journals, photos, reviews] = await Promise.all([
    all<Activity>("activities"),
    all<Journal>("journals"),
    all<Photo>("photos"),
    all<PlaceReview>("reviews"),
  ])
  return plans.map((p) => {
    const journal = journals.find((j) => j.date_plan_id === p.id) ?? null
    return sortPlan({
      ...p,
      activities: activities.filter((a) => a.date_plan_id === p.id),
      journal: journal
        ? {
            ...journal,
            photos: photos.filter((ph) => ph.journal_id === journal.id),
            reviews: reviews.filter((r) => r.journal_id === journal.id),
          }
        : null,
    })
  })
}

async function recomputeStatus(planId: string) {
  const plan = await get<DatePlan>("plans", planId)
  if (!plan) return
  const acts = (await all<Activity>("activities")).filter((a) => a.date_plan_id === planId)
  const status = derivePlanStatus(acts.map((a) => a.status))
  if (status !== plan.status) {
    await tx(["plans"], (t) =>
      t.objectStore("plans").put({ ...plan, status, updated_at: new Date().toISOString() })
    )
  }
}

export const localRepository: Repository = {
  kind: "local",

  async listPlans() {
    return assemble(await all<DatePlan>("plans"))
  },

  async getPlan(id) {
    const plan = await get<DatePlan>("plans", id)
    if (!plan) return null
    return (await assemble([plan]))[0]
  },

  async getPlanByShareToken(token) {
    const plan = (await all<DatePlan>("plans")).find((p) => p.share_token === token)
    if (!plan) return null
    return (await assemble([plan]))[0]
  },

  async savePlan(input, activities) {
    const now = new Date().toISOString()
    const existing = await get<DatePlan>("plans", input.id)
    const existingActs = (await all<Activity>("activities")).filter(
      (a) => a.date_plan_id === input.id
    )
    const keep = new Set(activities.map((a) => a.id))
    const plan: DatePlan = {
      ...input,
      status: derivePlanStatus(activities.map((a) => a.status)),
      share_token: existing?.share_token ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    }
    await tx(["plans", "activities"], (t) => {
      t.objectStore("plans").put(plan)
      const store = t.objectStore("activities")
      for (const a of existingActs) if (!keep.has(a.id)) store.delete(a.id)
      for (const a of activities) {
        const prev = existingActs.find((p) => p.id === a.id)
        store.put({ ...a, created_at: prev?.created_at ?? now } satisfies Activity)
      }
    })
  },

  async deletePlan(id) {
    const [acts, journals, photos, reviews] = await Promise.all([
      all<Activity>("activities"),
      all<Journal>("journals"),
      all<Photo>("photos"),
      all<PlaceReview>("reviews"),
    ])
    const journalIds = new Set(journals.filter((j) => j.date_plan_id === id).map((j) => j.id))
    await tx(["plans", "activities", "journals", "photos", "reviews"], (t) => {
      t.objectStore("plans").delete(id)
      for (const a of acts) if (a.date_plan_id === id) t.objectStore("activities").delete(a.id)
      for (const jid of journalIds) t.objectStore("journals").delete(jid)
      for (const p of photos) if (journalIds.has(p.journal_id)) t.objectStore("photos").delete(p.id)
      for (const r of reviews) if (journalIds.has(r.journal_id)) t.objectStore("reviews").delete(r.id)
    })
  },

  async setActivityStatus(activityId: string, status: ActivityStatus) {
    const act = await get<Activity>("activities", activityId)
    if (!act) throw new Error("Activity not found")
    await tx(["activities"], (t) => t.objectStore("activities").put({ ...act, status }))
    await recomputeStatus(act.date_plan_id)
  },

  async chooseOption(activityId, optionId, by) {
    const act = await get<Activity>("activities", activityId)
    if (!act) throw new Error("Aktivitas tidak ditemukan")
    const next = { ...act, ...applyChoice(normalizeActivity(act), optionId, by) }
    await tx(["activities"], (t) => t.objectStore("activities").put(next))
  },

  async setPlanStatus(id: string, status: PlanStatus) {
    const plan = await get<DatePlan>("plans", id)
    if (!plan) throw new Error("Plan not found")
    await tx(["plans"], (t) =>
      t.objectStore("plans").put({ ...plan, status, updated_at: new Date().toISOString() })
    )
  },

  async ensureShareToken(id) {
    const plan = await get<DatePlan>("plans", id)
    if (!plan) throw new Error("Plan not found")
    if (plan.share_token) return plan.share_token
    const share_token = newShareToken()
    await tx(["plans"], (t) => t.objectStore("plans").put({ ...plan, share_token }))
    return share_token
  },

  async saveJournal(input: JournalInput, reviewInputs: PlaceReviewInput[]) {
    const now = new Date().toISOString()
    const existing = await get<Journal>("journals", input.id)
    const prevReviews = (await all<PlaceReview>("reviews")).filter((r) => r.journal_id === input.id)
    const keep = new Set(reviewInputs.map((r) => r.id))
    const orphanPhotos = (await all<Photo>("photos")).filter(
      (p) => p.journal_id === input.id && p.place_review_id && !keep.has(p.place_review_id)
    )
    await tx(["journals", "reviews", "photos"], (t) => {
      t.objectStore("journals").put({ ...input, created_at: existing?.created_at ?? now } satisfies Journal)
      const store = t.objectStore("reviews")
      for (const r of prevReviews) if (!keep.has(r.id)) store.delete(r.id)
      for (const r of reviewInputs) {
        const prev = prevReviews.find((p) => p.id === r.id)
        store.put({ ...r, created_at: prev?.created_at ?? now } satisfies PlaceReview)
      }
      // Photos of a removed place review fall back to the date-level gallery.
      for (const p of orphanPhotos) t.objectStore("photos").put({ ...p, place_review_id: null })
    })
  },

  async uploadPhoto(journalId, file, placeReviewId, onProgress) {
    const image_url = await readAsDataUrl(file, onProgress)
    const photo: Photo = {
      id: newId(),
      journal_id: journalId,
      place_review_id: placeReviewId,
      image_url,
      created_at: new Date().toISOString(),
    }
    await tx(["photos"], (t) => t.objectStore("photos").put(photo))
    onProgress?.(1)
    return photo
  },

  async deletePhoto(photo) {
    await tx(["photos"], (t) => t.objectStore("photos").delete(photo.id))
  },
}
