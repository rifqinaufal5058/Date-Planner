"use client"

import {
  ArrowCounterClockwise,
  CarProfile,
  Check,
  Coffee,
  FilmSlate,
  ForkKnife,
  MapPin,
  Mountains,
  ShoppingBag,
  SkipForward,
  Sparkle,
  Airplane,
  Star,
  DotsThreeCircle,
  type Icon,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { isPendingChoice, type Activity, type ActivityStatus, type ChoiceBy, type PlaceReview } from "@/lib/types"
import { ChoicePicker } from "@/components/choice-picker"
import { formatDuration, formatTimeRange, spanMinutes } from "@/lib/format"
import { useSetActivityStatus } from "@/lib/queries"
import { NavLinks } from "@/components/map/nav-links"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const categoryIcon: Record<string, Icon> = {
  Food: ForkKnife,
  Coffee: Coffee,
  Movie: FilmSlate,
  Activity: Sparkle,
  Shopping: ShoppingBag,
  Nature: Mountains,
  Travel: Airplane,
  Other: DotsThreeCircle,
}

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const C = categoryIcon[category] ?? DotsThreeCircle
  return <C className={className} />
}

const statusLabel: Record<ActivityStatus, string> = {
  scheduled: "Terjadwal",
  completed: "Selesai",
  skipped: "Dilewati",
}

export function Timeline({
  activities,
  reviews = [],
  queryKey,
  readOnly = false,
  viewer = "owner",
}: {
  activities: Activity[]
  reviews?: PlaceReview[]
  queryKey: readonly unknown[]
  readOnly?: boolean
  /** Who is looking: affects choice wording ("Aku pilih ini" on the share link). */
  viewer?: ChoiceBy
}) {
  const setStatus = useSetActivityStatus(queryKey)
  const nextId = activities.find((a) => a.status === "scheduled")?.id

  const change = (a: Activity, status: ActivityStatus) =>
    setStatus.mutate(
      { id: a.id, status },
      { onError: (e) => toast.error(`Gagal memperbarui: ${e.message}`) }
    )

  return (
    <ol className="relative">
      {activities.map((a, i) => {
        const done = a.status === "completed"
        const skipped = a.status === "skipped"
        const isNext = a.id === nextId
        const last = i === activities.length - 1
        return (
          <li key={a.id} className="reveal relative" style={{ "--i": i } as React.CSSProperties}>
            {i > 0 && a.journey_duration_minutes != null && a.journey_duration_minutes > 0 && (
              <div className="flex items-center gap-2 py-1 pl-[3.25rem] text-xs text-muted-foreground">
                <CarProfile className="size-3.5" />
                {formatDuration(a.journey_duration_minutes)} perjalanan
              </div>
            )}
            <div className="relative flex gap-3 pb-4">
              {/* Vertical indicator */}
              <div className="relative flex w-10 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "z-10 grid size-10 place-items-center rounded-full border-2 transition-colors",
                    done && "border-success bg-success text-background",
                    skipped && "border-border bg-muted text-muted-foreground",
                    !done && !skipped && isNext && "border-rose bg-rose-soft text-rose",
                    !done && !skipped && !isNext && "border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? (
                    <Check weight="bold" className="size-4.5" />
                  ) : skipped ? (
                    <SkipForward weight="bold" className="size-4" />
                  ) : (
                    <CategoryIcon category={a.category} className="size-4.5" />
                  )}
                </span>
                {!last && (
                  <span
                    className={cn(
                      "absolute top-10 -bottom-6 w-0.5",
                      done ? "bg-success/60" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Card */}
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-2xl border bg-card p-4 transition-all",
                  isNext && "border-rose/40 shadow-[0_10px_30px_-18px_var(--rose)]",
                  (done || skipped) && "bg-muted/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-muted-foreground">
                      <span className="font-mono text-sm font-medium">{formatTimeRange(a.start_time, a.end_time)}</span>
                      <span className="text-xs">
                        {a.category}
                        {spanMinutes(a.start_time, a.end_time) ? ` · ${formatDuration(spanMinutes(a.start_time, a.end_time)!)}` : ""}
                      </span>
                    </p>
                    <h3
                      className={cn(
                        "mt-0.5 text-base font-semibold tracking-tight break-words",
                        skipped && "text-muted-foreground line-through",
                        done && "text-muted-foreground"
                      )}
                    >
                      {a.name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      done && "bg-success-soft text-success",
                      skipped && "bg-muted text-muted-foreground",
                      a.status === "scheduled" && (isNext ? "bg-rose-soft text-rose" : "bg-secondary text-secondary-foreground")
                    )}
                  >
                    {a.status === "scheduled" && isPendingChoice(a)
                      ? "Pilih dulu"
                      : isNext && a.status === "scheduled"
                        ? "Berikutnya"
                        : statusLabel[a.status]}
                  </span>
                </div>

                {(() => {
                  const r = reviews.find((x) => x.activity_id === a.id)
                  if (!r || (!r.rating && r.would_go_again == null)) return null
                  return (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      {r.rating ? (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Star weight="fill" className="size-4 text-rose" /> {r.rating}/5
                        </span>
                      ) : null}
                      {r.would_go_again != null && (
                        <span className={cn("text-xs", r.would_go_again ? "text-success" : "text-muted-foreground")}>
                          {r.would_go_again ? "Mau balik lagi" : "Sekali cukup"}
                        </span>
                      )}
                    </p>
                  )
                })()}
                {a.options && (
                  <ChoicePicker activity={a} queryKey={queryKey} viewer={viewer} locked={readOnly || a.status !== "scheduled"} />
                )}
                {!a.options && a.location_name && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0" />
                    <span className="truncate">{a.location_name}</span>
                  </p>
                )}
                {(!a.options || a.status !== "scheduled") && a.latitude != null && a.longitude != null && (
                  <NavLinks lat={a.latitude} lng={a.longitude} name={a.location_name} size="xs" className="mt-3" />
                )}

                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    {a.status === "scheduled" ? (
                      <>
                        <Button size="sm" onClick={() => change(a, "completed")} className="flex-1 sm:flex-none">
                          <Check weight="bold" />
                          Selesai
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => change(a, "skipped")} className="flex-1 sm:flex-none">
                          <SkipForward weight="bold" />
                          Lewati
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => change(a, "scheduled")}>
                        <ArrowCounterClockwise weight="bold" />
                        Batalkan
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
