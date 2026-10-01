"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Heart, MapTrifold, Star, X } from "@phosphor-icons/react"
import { PlacesMap } from "@/components/map"
import { NavLinks } from "@/components/map/nav-links"
import { EmptyState, ErrorState } from "@/components/states"
import { Skeleton } from "@/components/ui/skeleton"
import { buttonVariants } from "@/components/ui/button"
import { usePlans } from "@/lib/queries"
import { collectPlaces, type Place } from "@/lib/places"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

function PlaceDetail({ place, onClose }: { place: Place; onClose?: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs font-medium", place.visited ? "text-rose" : "text-muted-foreground")}>
            {place.visited ? `Dikunjungi ${place.visits.length}x` : "Rencana mendatang"}
          </p>
          <h2 className="text-lg font-semibold tracking-tight break-words">{place.name}</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <ul className="space-y-1.5">
        {place.visits.slice(0, 4).map((v) => (
          <li key={v.planId}>
            <Link
              href={`/plans/${v.planId}`}
              className="group flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm hover:bg-secondary"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{v.planTitle}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(v.date)}
                  {v.activity ? ` · ${v.activity}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {v.rating ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium">
                    <Star weight="fill" className="size-3.5 text-rose" /> {v.rating}
                  </span>
                ) : null}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <NavLinks lat={place.lat} lng={place.lng} name={place.name} size="xs" />
    </div>
  )
}

export default function MapPage() {
  const { data, isPending, isError, error, refetch } = usePlans()
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const all = useMemo(() => collectPlaces(data ?? []), [data])
  const places = useMemo(
    () => all.filter((p) => p.visited || (showUpcoming && p.upcoming)),
    [all, showUpcoming]
  )
  const visitedCount = all.filter((p) => p.visited).length
  const upcomingCount = all.filter((p) => !p.visited && p.upcoming).length
  const current = places.find((p) => p.key === selected) ?? null

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />

  return (
    // Full-bleed map: cancel the main padding on mobile, fill viewport minus header + bottom nav.
    <div className="-mx-4 -mt-5 -mb-[calc(7.5rem+env(safe-area-inset-bottom))] md:mx-0 md:mt-0 md:mb-0">
      <div className="relative grid grid-cols-1 h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem-5rem)] md:grid-cols-[20rem_minmax(0,1fr)] md:gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden min-h-0 flex-col gap-4 md:flex">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Peta kenangan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{visitedCount}</span> tempat sudah kalian datangi
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showUpcoming} onChange={(e) => setShowUpcoming(e.target.checked)} className="size-4 accent-[var(--rose)]" />
            Tampilkan rencana mendatang
            <span className="font-mono text-xs text-muted-foreground">({upcomingCount})</span>
          </label>
          {current && (
            <div className="rounded-2xl border bg-card p-4">
              <PlaceDetail place={current} onClose={() => setSelected(null)} />
            </div>
          )}
          <ul className="-mr-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-2">
            {isPending
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              : places.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(p.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        p.key === selected ? "bg-rose-soft" : "hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold",
                          p.visited ? "bg-rose text-rose-foreground" : "border border-dashed border-rose text-rose"
                        )}
                      >
                        {p.visits.length}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(p.lastDate)}</span>
                      </span>
                      {p.avgRating ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium">
                          <Star weight="fill" className="size-3.5 text-rose" /> {p.avgRating.toFixed(1)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
          </ul>
        </aside>

        {/* Map */}
        <div className="relative min-h-0 overflow-hidden md:rounded-3xl md:border">
          {isPending ? (
            <Skeleton className="size-full rounded-none" />
          ) : (
            <PlacesMap places={places} selected={selected} onSelect={setSelected} />
          )}

          {/* Mobile top overlay */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start justify-between gap-2 md:hidden">
            <div className="pointer-events-auto rounded-2xl bg-background/90 px-3.5 py-2 shadow-sm ring-1 ring-border backdrop-blur">
              <p className="text-sm font-semibold">Peta kenangan</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{visitedCount}</span> tempat dikunjungi
              </p>
            </div>
            <button
              type="button"
              aria-pressed={showUpcoming}
              onClick={() => setShowUpcoming((v) => !v)}
              className={cn(
                "pointer-events-auto h-9 rounded-full px-3.5 text-xs font-medium shadow-sm ring-1 backdrop-blur transition-colors",
                showUpcoming ? "bg-foreground text-background ring-foreground" : "bg-background/90 ring-border"
              )}
            >
              + Mendatang ({upcomingCount})
            </button>
          </div>

          {/* Empty overlay */}
          {!isPending && places.length === 0 && (
            <div className="absolute inset-0 z-[500] grid place-items-center bg-background/60 p-6 backdrop-blur-sm">
              <EmptyState
                icon={MapTrifold}
                title="Belum ada titik di peta"
                description="Tambahkan lokasi pada aktivitas, lalu selesaikan date-nya. Tempat yang dikunjungi akan muncul di sini."
                action={<Link href="/plans/new" className={buttonVariants({ size: "sm" })}>Buat rencana</Link>}
                className="bg-card"
              />
            </div>
          )}

          {/* Mobile bottom: selected card or scroll list */}
          {places.length > 0 && (
            <div className="absolute inset-x-0 bottom-[calc(5.5rem+max(0.75rem,env(safe-area-inset-bottom)))] z-[500] md:hidden">
              {current ? (
                <div className="mx-3 rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border">
                  <PlaceDetail place={current} onClose={() => setSelected(null)} />
                </div>
              ) : (
                <ul className="flex snap-x gap-2 overflow-x-auto px-3 pb-1 [&::-webkit-scrollbar]:hidden">
                  {places.map((p) => (
                    <li key={p.key} className="snap-start">
                      <button
                        type="button"
                        onClick={() => setSelected(p.key)}
                        className="flex w-56 items-center gap-2.5 rounded-2xl bg-card p-3 text-left shadow-md ring-1 ring-border"
                      >
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-full",
                            p.visited ? "bg-rose text-rose-foreground" : "border border-dashed border-rose text-rose"
                          )}
                        >
                          <Heart weight="fill" className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.visits.length}x · {formatDate(p.lastDate, { weekday: undefined })}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
