import type { NextRequest } from "next/server"
import { matchPlusCode, decodePlusCode, isGoogleHost, parseMapsUrl, recoverPlusCode } from "@/lib/gmaps"

/**
 * Resolves a Google Maps share link (incl. maps.app.goo.gl short links) to
 * { name, lat, lng }. Runs server-side because short links need redirect
 * following, which browsers block via CORS.
 */

const UA = "DatePlanner/1.0 (private date planner app)"
const MAX_REDIRECTS = 6

async function followRedirects(start: string): Promise<string> {
  let current = start
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const u = new URL(current)
    // Only ever talk to Google hosts (prevents using this route as an open proxy).
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Link tidak valid")
    if (!isGoogleHost(u.hostname)) throw new Error("Bukan link Google Maps")
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    })
    const loc = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).href
      continue
    }
    return current
  }
  return current
}

type Geo = { lat: number; lng: number; name?: string }

async function geocode(q: string): Promise<Geo | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers: { "User-Agent": UA, "Accept-Language": "id" }, signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  const [hit] = (await res.json()) as { lat: string; lon: string; name?: string }[]
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon), name: hit.name } : null
}

/** Geocode an address, dropping leading parts until something matches. */
async function geocodeLoose(address: string): Promise<Geo | null> {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    const hit = await geocode(parts.slice(i).join(", "))
    if (hit) return hit
  }
  return null
}

async function resolveQuery(query: string): Promise<{ lat: number; lng: number; name: string | null } | null> {
  const plus = matchPlusCode(query)
  if (plus) {
    const { code, rest } = plus
    const name = rest.split(",")[0]?.trim() || null
    if (code.indexOf("+") >= 8) {
      const p = decodePlusCode(code)
      if (p) return { ...p, name }
    }
    // Short plus code: needs a reference point from the locality text.
    const ref = rest ? await geocodeLoose(rest) : null
    if (ref) {
      const p = recoverPlusCode(code, ref.lat, ref.lng)
      if (p) return { ...p, name }
    }
    return null
  }
  const hit = await geocodeLoose(query)
  return hit ? { lat: hit.lat, lng: hit.lng, name: query.split(",")[0].trim() || hit.name || null } : null
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("url")?.trim()
  if (!input) return Response.json({ error: "Parameter url wajib diisi" }, { status: 400 })

  try {
    const finalUrl = await followRedirects(input)
    const parsed = parseMapsUrl(finalUrl)

    if (parsed.lat != null && parsed.lng != null) {
      return Response.json({ name: parsed.name ?? null, lat: parsed.lat, lng: parsed.lng, source: "url" })
    }
    if (parsed.query) {
      const hit = await resolveQuery(parsed.query)
      if (hit) return Response.json({ name: hit.name ?? parsed.name ?? null, lat: hit.lat, lng: hit.lng, source: "geocode" })
    }
    return Response.json(
      { error: "Koordinat tidak ditemukan di link ini. Coba bagikan ulang dari Google Maps atau pilih di peta." },
      { status: 422 }
    )
  } catch (err) {
    const msg = err instanceof Error && err.name !== "TimeoutError" ? err.message : "Gagal membuka link (timeout)"
    return Response.json({ error: msg }, { status: 400 })
  }
}
