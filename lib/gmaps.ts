/**
 * Helpers for turning Google Maps share links into coordinates.
 *
 * Supported shapes (after following short-link redirects):
 *   .../place/Name/@-6.99,110.42,17z/data=!3d-6.99!4d110.42
 *   ...?q=-6.99,110.42  |  ?ll=  |  ?query=  |  ?destination=
 *   ...?q=XCRQ+27 Warung Taburai - Semarang, Jl. ...   (Plus Code + locality)
 *   ...?q=Some address text                             (geocoded)
 */

const SHORT_HOSTS = ["maps.app.goo.gl", "goo.gl", "g.co"]

export function isGoogleHost(host: string) {
  const h = host.toLowerCase()
  return (
    SHORT_HOSTS.includes(h) ||
    /(^|\.)google\.[a-z.]{2,6}$/.test(h) // google.com, maps.google.co.id, ...
  )
}

function isMapsUrl(u: URL) {
  if (!/^https?:$/.test(u.protocol) || !isGoogleHost(u.hostname)) return false
  if (SHORT_HOSTS.includes(u.hostname)) return u.hostname !== "goo.gl" || u.pathname.startsWith("/maps")
  return u.hostname.startsWith("maps.") || u.pathname.startsWith("/maps")
}

/**
 * Find a Google Maps link anywhere inside pasted text. The Google Maps app
 * shares "Place name\nhttps://maps.app.goo.gl/..." and users may also paste
 * without the scheme, so a strict `new URL(text)` is not enough.
 */
export function extractMapsLink(text: string): string | null {
  const candidates = text.match(/(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?/gi) ?? []
  for (const raw of candidates) {
    const cleaned = raw.replace(/[).,;!?]+$/, "")
    try {
      const u = new URL(/^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`)
      if (isMapsUrl(u)) return u.href
    } catch {}
  }
  return null
}

export function looksLikeMapsLink(text: string) {
  return extractMapsLink(text) !== null
}

/** Text the user pasted before the link, e.g. the place name from the share sheet. */
export function sharedPlaceName(text: string): string | null {
  const link = text.match(/(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl|g\.co|(?:www\.|maps\.)?google\.[a-z.]+)\S*/i)
  if (!link || link.index == null) return null
  // Share sheets put the name on the first line, the address on following lines.
  const first = text.slice(0, link.index).split(/\r?\n/).map((l) => l.trim()).find(Boolean)
  return first && first.length <= 120 ? first : null
}

const COORD = /(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/

function validCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

export type ParsedLink = {
  lat?: number
  lng?: number
  name?: string
  /** Free text (address / plus code) that still needs geocoding. */
  query?: string
}

/** Extract whatever we can from a (long) Google Maps URL without network. */
export function parseMapsUrl(raw: string): ParsedLink {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return {}
  }
  const full = decodeURIComponent(url.href.replace(/\+/g, " "))
  const out: ParsedLink = {}

  const place = url.pathname.match(/\/place\/([^/]+)/)
  if (place) out.name = decodeURIComponent(place[1].replace(/\+/g, " "))

  // Most precise: the pin itself
  const pin = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pin && validCoord(+pin[1], +pin[2])) return { ...out, lat: +pin[1], lng: +pin[2] }

  for (const key of ["q", "query", "ll", "destination", "daddr", "center"]) {
    const v = url.searchParams.get(key)
    if (!v) continue
    const m = v.trim().match(new RegExp(`^${COORD.source}$`))
    if (m && validCoord(+m[1], +m[2])) return { ...out, lat: +m[1], lng: +m[2] }
    if (key === "q" || key === "query" || key === "destination" || key === "daddr") {
      out.query ??= v.trim()
    }
  }

  // Viewport centre (less precise than the pin, but fine)
  const at = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (at && validCoord(+at[1], +at[2])) return { ...out, lat: +at[1], lng: +at[2] }

  if (!out.query && out.name) out.query = out.name
  return out
}

/* ---------------- Open Location Code (Plus Codes) ---------------- */

const ALPHABET = "23456789CFGHJMPQRVWX"
const PAIR_RES = [20, 1, 0.05, 0.0025, 0.000125]

/**
 * Plus code at the start of a query, e.g. "XCRQ+27 Warung ...".
 * Share links put a raw "+" in the query string, which decodes to a space,
 * so a space is accepted as the separator too.
 */
const PLUS_RE = /^([23456789CFGHJMPQRVWX]{4,8})[+ ]([23456789CFGHJMPQRVWX]{2,3})(?=[\s,]|$)[\s,]*/

export function matchPlusCode(q: string): { code: string; rest: string } | null {
  const m = q.trim().match(PLUS_RE)
  if (!m || m[1].length % 2) return null
  return { code: `${m[1]}+${m[2]}`, rest: q.trim().slice(m[0].length) }
}

function encodePairs(lat: number, lng: number, digits: number) {
  let la = Math.min(Math.max(lat, -90), 89.9999999) + 90
  let ln = (((lng + 180) % 360) + 360) % 360
  let code = ""
  for (let i = 0; i < digits / 2; i++) {
    const r = PAIR_RES[i]
    const a = Math.floor(la / r)
    const b = Math.floor(ln / r)
    la -= a * r
    ln -= b * r
    code += ALPHABET[a] + ALPHABET[b]
  }
  return code
}

/** Decode a full plus code to its centre point. */
export function decodePlusCode(code: string): { lat: number; lng: number } | null {
  const clean = code.toUpperCase().replace("+", "").replace(/0+$/, "")
  if (clean.length < 2 || [...clean].some((c) => !ALPHABET.includes(c))) return null
  let lat = -90
  let lng = -180
  let latRes = 0
  let lngRes = 0
  const pairs = clean.slice(0, 10)
  for (let i = 0; i < pairs.length; i += 2) {
    const r = PAIR_RES[i / 2]
    lat += ALPHABET.indexOf(pairs[i]) * r
    if (pairs[i + 1]) lng += ALPHABET.indexOf(pairs[i + 1]) * r
    latRes = lngRes = r
  }
  // Grid refinement (digits 11+): 5 rows x 4 cols
  for (const c of clean.slice(10)) {
    latRes /= 5
    lngRes /= 4
    const idx = ALPHABET.indexOf(c)
    lat += Math.floor(idx / 4) * latRes
    lng += (idx % 4) * lngRes
  }
  return { lat: lat + latRes / 2, lng: lng + lngRes / 2 }
}

/** Recover a short plus code (e.g. "XCRQ+27") using a nearby reference point. */
export function recoverPlusCode(code: string, refLat: number, refLng: number) {
  const c = code.toUpperCase()
  const sep = c.indexOf("+")
  if (sep >= 8) return decodePlusCode(c)
  const padding = 8 - sep
  const resolution = Math.pow(20, 2 - padding / 2)
  const half = resolution / 2
  const prefix = encodePairs(refLat, refLng, 10).slice(0, padding)
  const area = decodePlusCode(prefix + c)
  if (!area) return null
  let { lat, lng } = area
  if (refLat + half < lat && lat - resolution >= -90) lat -= resolution
  else if (refLat - half > lat && lat + resolution <= 90) lat += resolution
  if (refLng + half < lng) lng -= resolution
  else if (refLng - half > lng) lng += resolution
  return { lat, lng }
}
