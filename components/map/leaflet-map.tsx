"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect } from "react"
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet"

export type MapPoint = {
  lat: number
  lng: number
  label?: string
  index?: number | string
  /** Dashed outline pin, excluded from the route (e.g. an undecided option). */
  ghost?: boolean
}

const DEFAULT_CENTER: [number, number] = [-7.2575, 112.7521] // Indonesia (Surabaya) fallback

function pinIcon(label?: string | number, ghost?: boolean) {
  const bg = ghost ? "var(--card)" : "var(--rose)"
  const fg = ghost ? "var(--rose)" : "var(--rose-foreground)"
  const border = ghost ? "2px dashed var(--rose)" : "2px solid var(--background)"
  return L.divIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${bg};border:${border};box-shadow:0 4px 12px -4px rgba(0,0,0,.4);display:grid;place-items:center"><span style="transform:rotate(45deg);color:${fg};font:600 11px/1 var(--font-outfit),sans-serif">${label ?? ""}</span></div>`,
  })
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap()
  const sig = points.map((p) => `${p.lat},${p.lng}`).join("|")
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15)
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, map])
  return null
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function LeafletMap({
  points,
  onPick,
  showRoute = false,
  className,
}: {
  points: MapPoint[]
  onPick?: (lat: number, lng: number) => void
  showRoute?: boolean
  className?: string
}) {
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : DEFAULT_CENTER
  return (
    <MapContainer
      center={center}
      zoom={points.length ? 14 : 11}
      scrollWheelZoom={false}
      className={className}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <Marker key={`${p.lat}-${p.lng}-${i}`} position={[p.lat, p.lng]} icon={pinIcon(p.index, p.ghost)}>
          {p.label && <Tooltip direction="top" offset={[0, -28]}>{p.label}</Tooltip>}
        </Marker>
      ))}
      {showRoute && points.filter((p) => !p.ghost).length > 1 && (
        <Polyline
          positions={points.filter((p) => !p.ghost).map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "var(--rose)", weight: 3, dashArray: "6 8", opacity: 0.8 }}
        />
      )}
      <FitBounds points={points} />
      {onPick && <ClickCapture onPick={onPick} />}
    </MapContainer>
  )
}
