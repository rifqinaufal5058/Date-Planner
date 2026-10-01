"use client"

import { useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowClockwise,
  Camera,
  CaretDown,
  CheckCircle,
  CircleNotch,
  ImageSquare,
  MapPin,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useOnline } from "@/components/offline-banner"
import { CategoryIcon } from "@/components/timeline"
import { repo } from "@/lib/data"
import { newId } from "@/lib/data/repository"
import { useDeletePhoto, useSaveJournal } from "@/lib/queries"
import { formatTimeRange } from "@/lib/format"
import type { FullPlan, Photo, PlaceReviewInput } from "@/lib/types"
import { cn } from "@/lib/utils"

const MAX_MB = 10

type Upload = {
  key: string
  /** null = date-level photo, otherwise the place review id */
  target: string | null
  file: File
  preview: string
  progress: number
  state: "pending" | "uploading" | "error"
}

/** A place that can receive its own review. */
type Candidate = {
  reviewId: string
  activityId: string | null
  name: string
  category: string | null
  time: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
}

type ReviewDraft = {
  rating: number
  again: boolean | null
  food: string
  notes: string
}

const emptyDraft: ReviewDraft = { rating: 0, again: null, food: "", notes: "" }

function buildCandidates(plan: FullPlan): Candidate[] {
  const existing = plan.journal?.reviews ?? []
  const byActivity = new Map(existing.filter((r) => r.activity_id).map((r) => [r.activity_id!, r]))
  const done = plan.activities.filter((a) => a.status === "completed")
  // If the date was closed manually, nothing may be ticked: offer every non-skipped stop.
  const acts = done.length ? done : plan.activities.filter((a) => a.status !== "skipped")
  const out: Candidate[] = acts.map((a) => ({
    reviewId: byActivity.get(a.id)?.id ?? newId(),
    activityId: a.id,
    name: a.location_name || a.name,
    category: a.category,
    time: a.start_time ? formatTimeRange(a.start_time, a.end_time) : null,
    location_name: a.location_name,
    latitude: a.latitude,
    longitude: a.longitude,
  }))
  // Keep reviews whose activity was later removed from the plan, so nothing is lost.
  const used = new Set(out.map((c) => c.reviewId))
  for (const r of existing) {
    if (used.has(r.id)) continue
    out.push({
      reviewId: r.id,
      activityId: r.activity_id,
      name: r.place_name,
      category: null,
      time: null,
      location_name: r.location_name,
      latitude: r.latitude,
      longitude: r.longitude,
    })
  }
  return out
}

function StarInput({ value, onChange, size = "lg", label }: { value: number; onChange: (n: number) => void; size?: "lg" | "sm"; label: string }) {
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          onClick={() => onChange(n === value ? 0 : n)}
          className={cn(
            "grid place-items-center rounded-full transition-transform hover:bg-muted active:scale-90",
            size === "lg" ? "size-11" : "size-9"
          )}
        >
          <Star
            weight={n <= value ? "fill" : "regular"}
            className={cn(size === "lg" ? "size-7" : "size-6", n <= value ? "text-rose" : "text-muted-foreground/50")}
          />
        </button>
      ))}
    </div>
  )
}

function PhotoGrid({
  existing,
  uploads,
  online,
  onAdd,
  onDeleteExisting,
  onRemoveUpload,
  onRetry,
  compact,
}: {
  existing: Photo[]
  uploads: Upload[]
  online: boolean
  onAdd: (files: FileList | null) => void
  onDeleteExisting: (p: Photo) => void
  onRemoveUpload: (u: Upload) => void
  onRetry: (u: Upload) => void
  compact?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <div className={cn("grid gap-2", compact ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-3 sm:grid-cols-4")}>
        {existing.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image_url} alt="" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Hapus foto"
              onClick={() => onDeleteExisting(p)}
              className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-background/85 backdrop-blur"
            >
              <Trash className="size-3.5" />
            </button>
          </div>
        ))}
        {uploads.map((u) => (
          <div key={u.key} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u.preview} alt="" className={cn("size-full object-cover", u.state !== "pending" && "opacity-60")} />
            {u.state === "pending" && (
              <button
                type="button"
                aria-label="Batal"
                onClick={() => onRemoveUpload(u)}
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-background/85 backdrop-blur"
              >
                <X className="size-3.5" />
              </button>
            )}
            {u.state === "uploading" && (
              <div className="absolute inset-x-1.5 bottom-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                  <div className="h-full bg-rose transition-all" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                </div>
                <p className="mt-0.5 text-center font-mono text-[10px] font-medium">{Math.round(u.progress * 100)}%</p>
              </div>
            )}
            {u.state === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/75 p-1 text-center backdrop-blur-sm">
                <WarningCircle weight="fill" className="size-4 text-destructive" />
                <div className="flex gap-0.5">
                  <Button type="button" size="icon-xs" variant="outline" aria-label="Unggah ulang" onClick={() => onRetry(u)} disabled={!online}>
                    <ArrowClockwise />
                  </Button>
                  <Button type="button" size="icon-xs" variant="ghost" aria-label="Buang" onClick={() => onRemoveUpload(u)}>
                    <X />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <ImageSquare className="size-5" />
          Galeri
        </button>
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted md:hidden"
        >
          <Camera className="size-5" />
          Kamera
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onAdd(e.target.files); e.target.value = "" }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onAdd(e.target.files); e.target.value = "" }} />
    </>
  )
}

export function JournalForm({ plan, onDone }: { plan: FullPlan; onDone?: () => void }) {
  const qc = useQueryClient()
  const online = useOnline()
  const saveJournal = useSaveJournal()
  const deletePhoto = useDeletePhoto()
  const j = plan.journal
  const [journalId] = useState(() => j?.id ?? newId())

  // Date-level
  const [title, setTitle] = useState(j?.title ?? plan.title)
  const [rating, setRating] = useState<number>(j?.rating ?? 0)
  const [story, setStory] = useState(j?.notes ?? "")
  const [favorite, setFavorite] = useState(j?.favorite_moment ?? "")
  const [titleErr, setTitleErr] = useState(false)

  // Per place
  const [candidates] = useState(() => buildCandidates(plan))
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>(() => {
    const init: Record<string, ReviewDraft> = {}
    for (const r of j?.reviews ?? []) {
      init[r.id] = { rating: r.rating ?? 0, again: r.would_go_again, food: r.food_menu ?? "", notes: r.notes ?? "" }
    }
    return init
  })
  const [open, setOpen] = useState<Record<string, boolean>>({})

  // Photos
  const [uploads, setUploads] = useState<Upload[]>([])
  const [existing, setExisting] = useState<Photo[]>(j?.photos ?? [])
  const [busy, setBusy] = useState(false)

  const draftOf = (id: string) => drafts[id] ?? emptyDraft
  const setDraft = (id: string, patch: Partial<ReviewDraft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? emptyDraft), ...patch } }))

  const photosFor = (target: string | null) => existing.filter((p) => (p.place_review_id ?? null) === target)
  const uploadsFor = (target: string | null) => uploads.filter((u) => u.target === target)

  const hasContent = (c: Candidate) => {
    const d = draftOf(c.reviewId)
    return (
      d.rating > 0 || d.again !== null || !!d.food.trim() || !!d.notes.trim() ||
      photosFor(c.reviewId).length > 0 || uploadsFor(c.reviewId).length > 0
    )
  }
  const reviewedCount = useMemo(
    () => candidates.filter(hasContent).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates, drafts, existing, uploads]
  )

  const addFiles = (target: string | null) => (files: FileList | null) => {
    if (!files) return
    const next: Upload[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} bukan gambar`)
        continue
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast.error(`${file.name} lebih dari ${MAX_MB} MB`)
        continue
      }
      next.push({ key: newId(), target, file, preview: URL.createObjectURL(file), progress: 0, state: "pending" })
    }
    setUploads((u) => [...u, ...next])
  }

  const patchUpload = (key: string, p: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)))

  const removeUpload = (u: Upload) => {
    URL.revokeObjectURL(u.preview)
    setUploads((l) => l.filter((x) => x.key !== u.key))
  }

  const uploadOne = async (u: Upload): Promise<boolean> => {
    patchUpload(u.key, { state: "uploading", progress: 0 })
    try {
      const photo = await repo.uploadPhoto(journalId, u.file, u.target, (f) => patchUpload(u.key, { progress: f }))
      URL.revokeObjectURL(u.preview)
      setUploads((list) => list.filter((x) => x.key !== u.key))
      setExisting((e) => [...e, photo])
      return true
    } catch {
      patchUpload(u.key, { state: "error" })
      return false
    }
  }

  const removeExisting = (p: Photo) =>
    deletePhoto.mutate(p, {
      onSuccess: () => setExisting((e) => e.filter((x) => x.id !== p.id)),
      onError: (err) => toast.error(err.message),
    })

  const reviewInputs = (): PlaceReviewInput[] =>
    candidates.filter(hasContent).map((c) => {
      const d = draftOf(c.reviewId)
      return {
        id: c.reviewId,
        journal_id: journalId,
        activity_id: c.activityId,
        place_name: c.name,
        location_name: c.location_name,
        latitude: c.latitude,
        longitude: c.longitude,
        rating: d.rating || null,
        would_go_again: d.again,
        food_menu: d.food.trim() || null,
        notes: d.notes.trim() || null,
      }
    })

  const persist = () =>
    saveJournal.mutateAsync({
      journal: {
        id: journalId,
        date_plan_id: plan.id,
        title: title.trim(),
        rating: rating || null,
        notes: story.trim() || null,
        favorite_moment: favorite.trim() || null,
        // legacy date-level fields are preserved untouched
        would_go_again: j?.would_go_again ?? null,
        food_menu: j?.food_menu ?? null,
      },
      reviews: reviewInputs(),
    })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!title.trim()) {
      setTitleErr(true)
      document.getElementById("j-title")?.focus()
      return
    }
    setBusy(true)
    try {
      // 1. Text + reviews first, so they're kept even if photos fail.
      await persist()
      // 2. Then photos, sequentially.
      let failed = 0
      for (const u of uploads.filter((x) => x.state !== "uploading")) if (!(await uploadOne(u))) failed++
      await qc.invalidateQueries()
      if (failed) toast.warning(`Kenangan tersimpan, tapi ${failed} foto gagal diunggah. Ketuk ikon ulang pada foto.`)
      else {
        toast.success("Kenangan tersimpan")
        onDone?.()
      }
    } catch (err) {
      toast.error(`Gagal menyimpan: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const retry = async (u: Upload) => {
    try {
      await persist() // rows must exist before photos reference them
    } catch (err) {
      toast.error((err as Error).message)
      return
    }
    if (await uploadOne(u)) qc.invalidateQueries()
  }

  const photoProps = (target: string | null) => ({
    existing: photosFor(target),
    uploads: uploadsFor(target),
    online,
    onAdd: addFiles(target),
    onDeleteExisting: removeExisting,
    onRemoveUpload: removeUpload,
    onRetry: retry,
  })

  return (
    <form onSubmit={submit} className="space-y-10" noValidate>
      {/* ---------- The date as a whole ---------- */}
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Date hari ini</h2>
          <p className="text-sm text-muted-foreground">Nilai keseluruhan dan cerita harinya.</p>
        </div>
        <div className="grid gap-2">
          <Label>Rating date</Label>
          <StarInput value={rating} onChange={setRating} label="Rating date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="j-story">Ceritain date hari ini gimana</Label>
          <Textarea
            id="j-story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={5}
            placeholder="Dari berangkat sampai pulang, apa yang terjadi, gimana rasanya..."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="j-fav">Momen favorit</Label>
          <Textarea id="j-fav" value={favorite} onChange={(e) => setFavorite(e.target.value)} rows={2} placeholder="Satu momen yang paling berkesan" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="j-title">Judul kenangan</Label>
          <Input id="j-title" value={title} onChange={(e) => { setTitle(e.target.value); setTitleErr(false) }} aria-invalid={titleErr} />
          {titleErr && <p className="text-sm text-destructive">Judul wajib diisi</p>}
        </div>
        <div className="grid gap-2">
          <Label>Foto date</Label>
          <PhotoGrid {...photoProps(null)} />
          <p className="text-xs text-muted-foreground">Maks. {MAX_MB} MB per foto. Foto diunggah saat kamu menekan simpan.</p>
        </div>
      </section>

      {/* ---------- Per place ---------- */}
      {candidates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Tempat yang dikunjungi</h2>
              <p className="text-sm text-muted-foreground">Nilai tiap tempat, jadi gampang dicari lagi nanti.</p>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{reviewedCount}/{candidates.length}</span>
          </div>
          <ul className="space-y-3">
            {candidates.map((c) => {
              const d = draftOf(c.reviewId)
              const isOpen = open[c.reviewId] ?? false
              const filled = hasContent(c)
              const detailCount = [d.again !== null, d.food.trim(), d.notes.trim()].filter(Boolean).length +
                photosFor(c.reviewId).length + uploadsFor(c.reviewId).length
              return (
                <li key={c.reviewId} className={cn("rounded-2xl border bg-card transition-colors", filled && "border-rose/30")}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", filled ? "bg-rose-soft text-rose" : "bg-secondary text-muted-foreground")}>
                        {c.category ? <CategoryIcon category={c.category} className="size-4.5" /> : <MapPin className="size-4.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.time ? `${c.time} · ` : ""}
                          {c.category ?? "Tempat"}
                        </p>
                      </div>
                    </div>
                    <StarInput value={d.rating} onChange={(n) => setDraft(c.reviewId, { rating: n })} size="sm" label={`Rating ${c.name}`} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [c.reviewId]: !isOpen }))}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      {detailCount > 0 && <CheckCircle weight="fill" className="size-4 text-rose" />}
                      {isOpen ? "Sembunyikan detail" : detailCount > 0 ? `Detail (${detailCount})` : "Tambah detail: mau balik lagi, menu, catatan, foto"}
                    </span>
                    <CaretDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t p-4">
                      <div className="grid gap-2">
                        <Label>Mau ke sini lagi?</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { v: true, label: "Mau", icon: ThumbsUp },
                            { v: false, label: "Sekali cukup", icon: ThumbsDown },
                          ].map(({ v, label, icon: I }) => (
                            <button
                              key={label}
                              type="button"
                              aria-pressed={d.again === v}
                              onClick={() => setDraft(c.reviewId, { again: d.again === v ? null : v })}
                              className={cn(
                                "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                                d.again === v ? "border-rose bg-rose-soft text-rose" : "hover:bg-muted"
                              )}
                            >
                              <I weight={d.again === v ? "fill" : "regular"} className="size-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`food-${c.reviewId}`}>Makanan & menu</Label>
                        <Textarea id={`food-${c.reviewId}`} rows={2} value={d.food} onChange={(e) => setDraft(c.reviewId, { food: e.target.value })} placeholder="Yang dipesan, yang enak, yang skip" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`notes-${c.reviewId}`}>Catatan tempat</Label>
                        <Textarea id={`notes-${c.reviewId}`} rows={2} value={d.notes} onChange={(e) => setDraft(c.reviewId, { notes: e.target.value })} placeholder="Suasana, harga, parkir, tips..." />
                      </div>
                      <div className="grid gap-2">
                        <Label>Foto tempat</Label>
                        <PhotoGrid {...photoProps(c.reviewId)} compact />
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-2 border-t pt-5 sm:flex sm:justify-end">
        {onDone && <Button type="button" variant="outline" size="lg" onClick={onDone}>Batal</Button>}
        <Button type="submit" size="lg" disabled={busy || !online}>
          {busy && <CircleNotch className="animate-spin" />}
          Simpan kenangan
        </Button>
      </div>
    </form>
  )
}

