"use client"

import { useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import { BookmarkSimple, Images, MagnifyingGlass, MapPin, Star, ThumbsUp } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states"
import { Stars } from "@/components/journal-view"
import { usePlans } from "@/lib/queries"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FullPlan } from "@/lib/types"

/** Date-level flag (legacy) or any place in it marked "mau balik lagi". */
function wantsAgain(p: FullPlan) {
  return !!p.journal && (p.journal.would_go_again === true || p.journal.reviews.some((r) => r.would_go_again))
}

type Sort = "newest" | "oldest" | "rating"
type Filter = "all" | "again" | "journal" | "no-journal" | "photos"

const sortLabels: Record<Sort, string> = {
  newest: "Terbaru",
  oldest: "Terlama",
  rating: "Rating tertinggi",
}
const filterLabels: Record<Filter, string> = {
  all: "Semua",
  again: "Mau diulang",
  photos: "Ada foto",
  journal: "Sudah dijurnal",
  "no-journal": "Belum dijurnal",
}

export default function MemoriesPage() {
  const { data, isPending, isError, error, refetch } = usePlans()
  const [q, setQ] = useState("")
  const query = useDeferredValue(q.trim().toLowerCase())
  const [sort, setSort] = useState<Sort>("newest")
  const [filter, setFilter] = useState<Filter>("all")
  const [minRating, setMinRating] = useState(0)

  const list = useMemo(() => {
    let items = (data ?? []).filter((p) => p.status === "completed")
    if (query) {
      items = items.filter((p) => {
        const hay = [
          p.title,
          p.description,
          p.location_name,
          p.journal?.title,
          p.journal?.notes,
          p.journal?.favorite_moment,
          p.journal?.food_menu,
          ...(p.journal?.reviews ?? []).map((r) => `${r.place_name} ${r.notes ?? ""} ${r.food_menu ?? ""}`),
          ...p.activities.map((a) => `${a.name} ${a.location_name ?? ""} ${a.category}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return hay.includes(query)
      })
    }
    if (filter === "again") items = items.filter((p) => wantsAgain(p))
    if (filter === "photos") items = items.filter((p) => (p.journal?.photos.length ?? 0) > 0)
    if (filter === "journal") items = items.filter((p) => p.journal)
    if (filter === "no-journal") items = items.filter((p) => !p.journal)
    if (minRating) items = items.filter((p) => (p.journal?.rating ?? 0) >= minRating)
    return [...items].sort((a, b) => {
      if (sort === "rating") return (b.journal?.rating ?? 0) - (a.journal?.rating ?? 0) || b.plan_date.localeCompare(a.plan_date)
      return sort === "newest" ? b.plan_date.localeCompare(a.plan_date) : a.plan_date.localeCompare(b.plan_date)
    })
  }, [data, query, filter, sort, minRating])

  const total = (data ?? []).filter((p) => p.status === "completed").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Kenangan</h1>
        <p className="mt-1 text-muted-foreground">Arsip date yang sudah dijalani, jadi referensi untuk date berikutnya.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari judul, tempat, makanan, catatan..."
            className="pl-10"
            aria-label="Cari kenangan"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="-mx-4 flex flex-1 snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            {(Object.keys(filterLabels) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "h-9 shrink-0 snap-start rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                  filter === f ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
              <SelectTrigger size="sm" className="flex-1 sm:w-36" aria-label="Rating minimum">
                <SelectValue>{(v: string) => (v === "0" ? "Semua rating" : `${v}+ bintang`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Semua rating</SelectItem>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}+ bintang</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger size="sm" className="flex-1 sm:w-40" aria-label="Urutkan">
                <SelectValue>{(v: Sort) => sortLabels[v]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as Sort[]).map((s) => (
                  <SelectItem key={s} value={s}>{sortLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isPending ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !total ? (
        <EmptyState
          icon={BookmarkSimple}
          title="Belum ada kenangan"
          description="Date yang sudah selesai akan tersimpan di sini lengkap dengan jurnal dan fotonya."
        />
      ) : !list.length ? (
        <EmptyState icon={MagnifyingGlass} title="Tidak ada yang cocok" description="Coba kata kunci atau filter lain." />
      ) : (
        <>
          <p className="font-mono text-xs text-muted-foreground">{list.length} dari {total} kenangan</p>
          <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 [&>*]:mb-3">
            {list.map((p, i) => {
              const cover = p.journal?.photos[0]?.image_url
              const photoCount = p.journal?.photos.length ?? 0
              return (
                <Link
                  key={p.id}
                  href={`/plans/${p.id}`}
                  className="reveal group block break-inside-avoid overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_oklch(0.4_0.05_20/0.35)]"
                  style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
                >
                  {cover && (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cover} alt="" loading="lazy" className={cn("w-full object-cover", i % 3 === 0 ? "aspect-[4/5]" : "aspect-[4/3]")} />
                      {photoCount > 1 && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 font-mono text-xs backdrop-blur">
                          <Images className="size-3.5" /> {photoCount}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(p.plan_date)}</span>
                      {p.journal?.rating ? <Stars value={p.journal.rating} className="[&_svg]:size-3.5" /> : null}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">{p.journal?.title || p.title}</h3>
                    {p.journal?.favorite_moment && (
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        &ldquo;{p.journal.favorite_moment}&rdquo;
                      </p>
                    )}
                    {(p.journal?.reviews.length ?? 0) > 0 && (
                      <ul className="space-y-1 pt-1">
                        {p.journal!.reviews.slice(0, 3).map((r) => (
                          <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate">{r.place_name}</span>
                            {r.rating ? (
                              <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium">
                                <Star weight="fill" className="size-3 text-rose" /> {r.rating}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {p.location_name && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3.5" /> {p.location_name}
                        </span>
                      )}
                      {wantsAgain(p) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">
                          <ThumbsUp weight="fill" className="size-3" /> Mau diulang
                        </span>
                      )}
                      {!p.journal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-2 py-0.5 font-medium text-rose">
                          <Star className="size-3" /> Belum dijurnal
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
