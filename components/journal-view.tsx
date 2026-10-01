"use client"

import { useState } from "react"
import { ForkKnife, MapPin, NotePencil, Quotes, Star, ThumbsDown, ThumbsUp } from "@phosphor-icons/react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { CategoryIcon } from "@/components/timeline"
import type { FullPlan, Photo, PlaceReview } from "@/lib/types"
import { cn } from "@/lib/utils"

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} aria-label={`Rating ${value} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} weight={n <= value ? "fill" : "regular"} className={n <= value ? "text-rose" : "text-muted-foreground/40"} />
      ))}
    </span>
  )
}

export function AgainPill({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        value ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
      )}
    >
      {value ? <ThumbsUp weight="fill" className="size-3" /> : <ThumbsDown weight="fill" className="size-3" />}
      {value ? "Mau balik lagi" : "Sekali cukup"}
    </span>
  )
}

function Thumbs({ photos, onOpen, featured }: { photos: Photo[]; onOpen: (url: string) => void; featured?: boolean }) {
  if (!photos.length) return null
  return (
    <div className={cn("grid gap-2", featured ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-4")}>
      {photos.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p.image_url)}
          className={cn("overflow-hidden rounded-xl bg-muted", featured && i === 0 && photos.length > 2 && "col-span-2 row-span-2")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image_url} alt="Foto kenangan" loading="lazy" className="aspect-square size-full object-cover transition-transform hover:scale-[1.03]" />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({
  review,
  category,
  photos,
  onOpen,
}: {
  review: PlaceReview
  category: string | null
  photos: Photo[]
  onOpen: (url: string) => void
}) {
  return (
    <li className="space-y-3 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-rose">
            {category ? <CategoryIcon category={category} className="size-4" /> : <MapPin className="size-4" />}
          </span>
          <p className="min-w-0 font-medium break-words">{review.place_name}</p>
        </div>
        {review.rating ? <Stars value={review.rating} className="shrink-0 pt-1 [&_svg]:size-4" /> : null}
      </div>
      {review.would_go_again != null && <AgainPill value={review.would_go_again} />}
      {review.food_menu && (
        <p className="flex gap-2 text-sm">
          <ForkKnife className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="whitespace-pre-line">{review.food_menu}</span>
        </p>
      )}
      {review.notes && (
        <p className="flex gap-2 text-sm text-muted-foreground">
          <NotePencil className="mt-0.5 size-4 shrink-0" />
          <span className="whitespace-pre-line">{review.notes}</span>
        </p>
      )}
      <Thumbs photos={photos} onOpen={onOpen} />
    </li>
  )
}

export function JournalView({ plan }: { plan: FullPlan }) {
  const j = plan.journal
  const [preview, setPreview] = useState<string | null>(null)
  if (!j) return null
  const datePhotos = j.photos.filter((p) => !p.place_review_id)
  const categoryOf = (r: PlaceReview) => plan.activities.find((a) => a.id === r.activity_id)?.category ?? null

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold tracking-tight">{j.title}</h3>
        {j.rating ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={j.rating} className="[&_svg]:size-5" /> rating date
          </div>
        ) : null}
        {/* Legacy date-level flag (memories saved before per-place reviews). */}
        {j.would_go_again != null && <AgainPill value={j.would_go_again} />}
      </div>

      <Thumbs photos={datePhotos} onOpen={setPreview} featured />

      {j.notes && <p className="leading-relaxed whitespace-pre-line">{j.notes}</p>}

      {j.favorite_moment && (
        <blockquote className="relative rounded-2xl bg-rose-soft p-5 pl-12 text-[0.95rem] leading-relaxed">
          <Quotes weight="fill" className="absolute top-5 left-4 size-5 text-rose" />
          <p className="mb-1 text-xs font-medium text-rose">Momen favorit</p>
          {j.favorite_moment}
        </blockquote>
      )}

      {j.food_menu && (
        <p className="flex gap-2 text-sm">
          <ForkKnife className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="whitespace-pre-line">{j.food_menu}</span>
        </p>
      )}

      {j.reviews.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Tempat ({j.reviews.length})</h4>
          <ul className="space-y-3">
            {j.reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                category={categoryOf(r)}
                photos={j.photos.filter((p) => p.place_review_id === r.id)}
                onOpen={setPreview}
              />
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">Pratinjau foto</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="Foto kenangan" className="max-h-[80dvh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
