"use client"

import Link from "next/link"
import {
  ArrowRight,
  CalendarHeart,
  CalendarPlus,
  Heart,
  MapPin,
  Star,
  Clock,
} from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Countdown } from "@/components/countdown"
import { PlanCard } from "@/components/plan-card"
import { DirectionsButton } from "@/components/directions-button"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states"
import { usePlans } from "@/lib/queries"
import { formatDate, formatTime, isUpcoming, planStart } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const { data, isPending, isError, error, refetch } = usePlans()

  if (isPending) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <ListSkeleton />
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />

  const upcoming = data
    .filter((p) => isUpcoming(p))
    .sort((a, b) => planStart(a).getTime() - planStart(b).getTime())
  const next = upcoming[0]
  const completed = data
    .filter((p) => p.status === "completed")
    .sort((a, b) => b.plan_date.localeCompare(a.plan_date))
  const places = new Set<string>()
  for (const p of completed) {
    for (const a of p.activities)
      if (a.status === "completed" && a.location_name) places.add(a.location_name.toLowerCase())
  }
  const rated = completed.filter((p) => p.journal?.rating)
  const avg = rated.length
    ? rated.reduce((s, p) => s + (p.journal!.rating ?? 0), 0) / rated.length
    : null

  const stats = [
    { label: "Total date", value: String(completed.length), icon: Heart },
    { label: "Tempat dikunjungi", value: String(places.size), icon: MapPin },
    { label: "Rata-rata rating", value: avg ? avg.toFixed(1) : "-", icon: Star },
  ]

  return (
    <div className="space-y-10 md:space-y-14">
      {/* Upcoming hero */}
      {next ? (
        <section className="reveal relative overflow-hidden rounded-3xl border bg-[radial-gradient(120%_120%_at_100%_0%,var(--rose-soft),transparent_60%)] p-5 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div className="min-w-0 space-y-3">
              <p className="text-sm font-medium text-rose">Date berikutnya</p>
              <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">{next.title}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarHeart className="size-4" /> {formatDate(next.plan_date, { weekday: "long", month: "long" })}
                </span>
                {next.activities[0]?.start_time && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" /> {formatTime(next.activities[0].start_time)}
                    {(() => {
                      const last = [...next.activities].reverse().find((a) => a.end_time)
                      return last ? ` – ${formatTime(last.end_time)}` : ""
                    })()}
                  </span>
                )}
                {next.location_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" /> {next.location_name}
                  </span>
                )}
              </div>
            </div>
            <Countdown target={planStart(next)} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link href={`/plans/${next.id}`} className={buttonVariants({ size: "lg" })}>
              Buka timeline <ArrowRight weight="bold" />
            </Link>
            <DirectionsButton plan={next} size="lg" />
            {upcoming.length > 1 && (
              <Link href="/plans" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                +{upcoming.length - 1} rencana lain
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="reveal flex flex-col items-start gap-5 rounded-3xl border bg-[radial-gradient(120%_120%_at_100%_0%,var(--rose-soft),transparent_60%)] p-6 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Belum ada date terjadwal</h1>
            <p className="max-w-[48ch] text-muted-foreground">
              Susun timeline, tentukan lokasi, lalu jalani bareng. Kenangannya tersimpan otomatis di sini.
            </p>
          </div>
          <Link href="/plans/new" className={buttonVariants({ size: "lg" })}>
            <CalendarPlus weight="bold" /> Buat rencana
          </Link>
        </section>
      )}

      {/* Stats */}
      <section aria-label="Statistik" className="grid grid-cols-3 gap-2 md:gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="reveal flex flex-col gap-2 rounded-2xl border bg-card p-3 md:flex-row md:items-center md:gap-4 md:p-5"
            style={{ "--i": i + 1 } as React.CSSProperties}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary md:size-11">
              <s.icon weight="duotone" className="size-4.5 text-rose md:size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-2xl font-semibold tracking-tight md:text-3xl">{s.value}</p>
              <p className="text-xs leading-tight text-muted-foreground md:text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Recent memories */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Kenangan terbaru</h2>
          {completed.length > 0 && (
            <Link href="/memories" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              Lihat semua <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
        {completed.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.slice(0, 3).map((p, i) => (
              <PlanCard
                key={p.id}
                plan={p}
                className={cn("reveal", i === 0 && completed.length >= 3 && "lg:row-span-2")}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="Belum ada kenangan"
            description="Setelah semua aktivitas sebuah date selesai, date itu akan muncul di sini."
          />
        )}
      </section>
    </div>
  )
}
