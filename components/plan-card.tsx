import Link from "next/link"
import { ArrowsSplit, CalendarBlank, CheckCircle, MapPin, Star } from "@phosphor-icons/react/dist/ssr"
import { isPendingChoice, type FullPlan } from "@/lib/types"
import { formatDate, progressOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { DirectionsButton } from "@/components/directions-button"

export function StatusPill({ plan }: { plan: FullPlan }) {
  if (plan.status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle weight="fill" className="size-3.5" />
        Selesai
      </span>
    )
  }
  const { done, total } = progressOf(plan)
  const choices = plan.activities.filter((a) => a.status === "scheduled" && isPendingChoice(a)).length
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-2.5 py-1 text-xs font-medium text-rose">
      {choices > 0 ? (
        <>
          <ArrowsSplit weight="bold" className="size-3.5" />
          {choices} menunggu pilihan
        </>
      ) : done > 0 ? (
        `Berjalan ${done}/${total}`
      ) : (
        "Terjadwal"
      )}
    </span>
  )
}

export function PlanCard({ plan, className }: { plan: FullPlan; className?: string }) {
  const { pct, total } = progressOf(plan)
  const cover = plan.journal?.photos[0]?.image_url
  const reviewed = plan.journal?.reviews.length ?? 0
  return (
    // Not a <Link>: the Direction menu is a button and can't be nested in an anchor.
    // The title link is stretched over the whole card instead.
    <article
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 transition-all has-[a[data-card-link]:hover]:-translate-y-0.5 has-[a[data-card-link]:hover]:shadow-[0_12px_32px_-16px_oklch(0.4_0.05_20/0.35)] md:p-5",
        className
      )}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="-mx-4 -mt-4 aspect-[16/9] w-[calc(100%+2rem)] object-cover md:-mx-5 md:-mt-5 md:w-[calc(100%+2.5rem)]" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarBlank className="size-3.5" />
            {formatDate(plan.plan_date)}
          </p>
          <h3 className="truncate text-base font-semibold tracking-tight md:text-lg">
            <Link
              href={`/plans/${plan.id}`}
              data-card-link
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {plan.title}
            </Link>
          </h3>
        </div>
        <StatusPill plan={plan} />
      </div>
      {plan.location_name && (
        <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{plan.location_name}</span>
        </p>
      )}
      <div className="mt-auto flex items-center gap-3 pt-1">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {plan.status === "completed" && plan.journal ? (
            <span className="flex items-center gap-2 text-sm">
              {plan.journal.rating ? (
                <span className="flex items-center gap-1 font-medium">
                  <Star weight="fill" className="size-4 text-rose" />
                  {plan.journal.rating}/5
                </span>
              ) : null}
              {reviewed > 0 && <span className="text-xs text-muted-foreground">{reviewed} tempat dinilai</span>}
            </span>
          ) : plan.status === "completed" ? (
            <span className="truncate text-sm text-rose">Belum ada kenangan</span>
          ) : (
            <>
              <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-rose transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{total} aktivitas</span>
            </>
          )}
        </div>
        <DirectionsButton plan={plan} />
      </div>
    </article>
  )
}
