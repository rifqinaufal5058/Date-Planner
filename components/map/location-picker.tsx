"use client"

import { useMemo, useState } from "react"
import { ClockCounterClockwise, CircleNotch, Crosshair, GoogleLogo, MagnifyingGlass, MapPin, Star, X } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LeafletMap } from "@/components/map"
import type { GeoPoint } from "@/lib/types"
import { extractMapsLink, sharedPlaceName } from "@/lib/gmaps"
import { usePlans } from "@/lib/queries"
import { collectPlaces, type Place } from "@/lib/places"
import { formatDate } from "@/lib/format"

/** How many past places to show before the user types anything. */
const RECENT_LIMIT = 3
const MATCH_LIMIT = 6

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

type Result = { display_name: string; lat: string; lon: string }

async function search(q: string): Promise<Result[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=id&q=${encodeURIComponent(q)}`,
    { headers: { "Accept-Language": "id" } }
  )
  if (!res.ok) throw new Error("Pencarian lokasi gagal")
  return res.json()
}

async function reverse(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { "Accept-Language": "id" } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { name?: string; display_name?: string }
    return data.name || data.display_name?.split(",").slice(0, 2).join(",") || null
  } catch {
    return null
  }
}

function shortName(full: string) {
  return full.split(",").slice(0, 2).join(",").trim()
}

export function LocationPicker({
  value,
  onChange,
  placeholder = "Pilih lokasi",
  suggestVisited = true,
}: {
  value: GeoPoint
  onChange: (v: GeoPoint) => void
  placeholder?: string
  /** Offer places from completed dates. Off for the "Daerah" (area) field. */
  suggestVisited?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<GeoPoint>(value)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState<"search" | "gps" | "link" | null>(null)

  const hasCoords = value.latitude != null && value.longitude != null

  // Places already visited on completed dates, newest first.
  const { data: plans } = usePlans()
  const visited = useMemo(
    () => (suggestVisited && plans ? collectPlaces(plans).filter((p) => p.visited) : []),
    [plans, suggestVisited]
  )
  const typed = q.trim()
  const isLink = !!extractMapsLink(typed)
  const visitedMatches = useMemo(() => {
    if (isLink) return []
    if (!typed) return visited.slice(0, RECENT_LIMIT)
    const needle = normalize(typed)
    return visited
      .filter((p) =>
        [p.name, ...p.visits.map((v) => `${v.activity ?? ""} ${v.planTitle}`)].some((t) => normalize(t).includes(needle))
      )
      .slice(0, MATCH_LIMIT)
  }, [visited, typed, isLink])

  const pickVisited = (p: Place) => {
    setDraft({ location_name: p.name, latitude: p.lat, longitude: p.lng })
    setResults([])
    setQ("")
  }

  const openDialog = () => {
    setDraft(value)
    setQ("")
    setResults([])
    setOpen(true)
  }

  const runSearch = async () => {
    const text = q.trim()
    if (!text) return
    if (extractMapsLink(text)) return importLink(text)
    if (visitedMatches.length === 1 && normalize(visitedMatches[0].name) === normalize(text)) {
      return pickVisited(visitedMatches[0])
    }
    setBusy("search")
    try {
      const r = await search(q)
      setResults(r)
      if (!r.length) toast.info("Lokasi tidak ditemukan. Coba kata kunci lain atau ketuk peta.")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  /** `text` may be a bare link or "Place name\nhttps://maps.app.goo.gl/..." from the share sheet. */
  const importLink = async (text: string) => {
    const url = extractMapsLink(text)
    if (!url) {
      toast.error("Link Google Maps tidak dikenali")
      return
    }
    const sharedName = sharedPlaceName(text)
    setBusy("link")
    setResults([])
    try {
      const res = await fetch(`/api/resolve-map?url=${encodeURIComponent(url)}`)
      const data = (await res.json().catch(() => ({}))) as { name?: string | null; lat?: number; lng?: number; error?: string }
      if (!res.ok || data.lat == null || data.lng == null) throw new Error(data.error || "Link tidak bisa dibaca")
      setDraft({
        location_name: sharedName || data.name || draft.location_name || null,
        latitude: data.lat,
        longitude: data.lng,
      })
      if (!data.name) {
        const name = await reverse(data.lat, data.lng)
        if (name) setDraft((d) => ({ ...d, location_name: d.location_name || name }))
      }
      setQ("")
      toast.success("Lokasi dari Google Maps ditambahkan")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!extractMapsLink(text)) {
        toast.info("Clipboard tidak berisi link Google Maps. Tempel manual di kolom pencarian.")
        return
      }
      setQ(text)
      importLink(text)
    } catch {
      toast.info("Tidak bisa membaca clipboard. Tempel link di kolom pencarian.")
    }
  }

  const pickPoint = async (lat: number, lng: number) => {
    setDraft((d) => ({ ...d, latitude: lat, longitude: lng }))
    const name = await reverse(lat, lng)
    if (name) setDraft((d) => ({ ...d, location_name: d.location_name || name }))
  }

  const useGps = () => {
    if (!navigator.geolocation) return toast.error("Perangkat tidak mendukung GPS")
    setBusy("gps")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setBusy(null)
        await pickPoint(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setBusy(null)
        toast.error("Tidak bisa mengambil lokasi saat ini")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const points =
    draft.latitude != null && draft.longitude != null
      ? [{ lat: draft.latitude, lng: draft.longitude, label: draft.location_name ?? undefined }]
      : []

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={openDialog}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <MapPin weight={hasCoords ? "fill" : "regular"} className={hasCoords ? "size-4 shrink-0 text-rose" : "size-4 shrink-0 text-muted-foreground"} />
          <span className={value.location_name ? "truncate" : "truncate text-muted-foreground"}>
            {value.location_name || placeholder}
          </span>
        </button>
        {(value.location_name || hasCoords) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Hapus lokasi"
            onClick={() => onChange({ location_name: null, latitude: null, longitude: null })}
          >
            <X />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] gap-3 overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pilih lokasi</DialogTitle>
          </DialogHeader>
          {/* Not a <form>: this dialog is portaled, but React submit events still bubble to the parent plan form. */}
          <div className="flex gap-2" role="search">
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setResults([]) // stale map results would mix with the live history filter
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  e.stopPropagation()
                  runSearch()
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text").trim()
                if (extractMapsLink(text)) {
                  e.preventDefault()
                  setQ(text)
                  importLink(text)
                }
              }}
              enterKeyHint="search"
              placeholder="Cari tempat atau tempel link Google Maps"
              aria-label="Cari lokasi atau tempel link Google Maps"
            />
            <Button type="button" size="icon" variant="secondary" aria-label="Cari" onClick={runSearch} disabled={busy !== null}>
              {busy === "search" || busy === "link" ? <CircleNotch className="animate-spin" /> : <MagnifyingGlass weight="bold" />}
            </Button>
          </div>
          <button
            type="button"
            onClick={pasteFromClipboard}
            disabled={busy !== null}
            className="flex items-center gap-2 self-start text-sm font-medium text-rose hover:underline disabled:opacity-50"
          >
            <GoogleLogo weight="bold" className="size-4" />
            Tempel link dari Google Maps
          </button>
          {visitedMatches.length > 0 && (
            <section aria-label="Tempat yang pernah dikunjungi" className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClockCounterClockwise className="size-3.5" />
                {typed ? "Pernah dikunjungi" : "Terakhir dikunjungi"}
              </p>
              <ul className="divide-y overflow-hidden rounded-xl border">
                {visitedMatches.map((p) => {
                  const selected = draft.latitude === p.lat && draft.longitude === p.lng
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => pickVisited(p)}
                        aria-pressed={selected}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${selected ? "bg-rose-soft" : ""}`}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-soft text-rose">
                          <MapPin weight="fill" className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.visits.length > 1 ? `${p.visits.length}x · ` : ""}
                            {formatDate(p.lastDate, { weekday: undefined })}
                            {p.visits[0]?.planTitle ? ` · ${p.visits[0].planTitle}` : ""}
                          </span>
                        </span>
                        {p.avgRating ? (
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium">
                            <Star weight="fill" className="size-3.5 text-rose" /> {p.avgRating.toFixed(1)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {typed && !isLink && visitedMatches.length === 0 && results.length === 0 && busy !== "search" && visited.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Belum pernah ke tempat ini. Tekan Enter untuk mencari di peta.
            </p>
          )}
          {results.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MagnifyingGlass className="size-3.5" /> Hasil pencarian
            </p>
          )}
          {results.length > 0 && (
            <ul className="max-h-40 divide-y overflow-y-auto rounded-xl border">
              {results.map((r) => (
                <li key={`${r.lat}${r.lon}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setDraft({
                        location_name: shortName(r.display_name),
                        latitude: Number(r.lat),
                        longitude: Number(r.lon),
                      })
                      setResults([])
                    }}
                  >
                    <span className="font-medium">{shortName(r.display_name)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="relative h-64 overflow-hidden rounded-xl border md:h-72">
            <LeafletMap points={points} onPick={pickPoint} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="absolute right-2 bottom-2 z-[500] shadow-sm"
              onClick={useGps}
              disabled={busy === "gps"}
            >
              {busy === "gps" ? <CircleNotch className="animate-spin" /> : <Crosshair weight="bold" />}
              Lokasi saya
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Ketuk peta untuk menaruh pin.</p>
          <div className="grid gap-2">
            <label htmlFor="loc-name" className="text-sm font-medium">Nama lokasi</label>
            <Input
              id="loc-name"
              value={draft.location_name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, location_name: e.target.value }))}
              placeholder="mis. XXI Tunjungan Plaza"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              type="button"
              onClick={() => {
                onChange({ ...draft, location_name: draft.location_name?.trim() || null })
                setOpen(false)
              }}
            >
              Simpan lokasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
