"use client"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useRef } from "react"
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet"
import type { Place } from "@/lib/places"

const DEFAULT_CENTER: [number, number] = [-2.5, 117] // Indonesia overview

function icon(place: Place, active: boolean) {
  const count = place.visits.length
  const size = active ? 40 : 32
  const bg = place.visited ? "var(--rose)" : "var(--card)"
  const fg = place.visited ? "var(--rose-foreground)" : "var(--rose)"
  const border = place.visited ? "var(--background)" : "var(--rose)"
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${bg};border:2px ${place.visited ? "solid" : "dashed"} ${border};box-shadow:0 6px 16px -6px rgba(0,0,0,.45);display:grid;place-items:center;transition:all .2s"><span style="transform:rotate(45deg);color:${fg};font:600 ${active ? 14 : 12}px/1 var(--font-outfit),sans-serif">${count > 1 ? count : "&#9829;"}</span></div>`,
  })
}

function Controller({ places, selected }: { places: Place[]; selected: string | null }) {
  const map = useMap()
  const fitted = useRef("")
  const sig = places.map((p) => p.key).join("|")

  // Fit all pins whenever the visible set changes
  useEffect(() => {
    if (fitted.current === sig) return
    fitted.current = sig
    if (!places.length) return
    if (places.length === 1) map.setView([places[0].lat, places[0].lng], 15)
    else map.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 15 })
  }, [sig, places, map])

  // Fly to selection
  useEffect(() => {
    const p = places.find((x) => x.key === selected)
    if (p) map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  // Leaflet needs a nudge when its container resizes (e.g. responsive layout)
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])

  return null
}

export default function PlacesMap({
  places,
  selected,
  onSelect,
}: {
  places: Place[]
  selected: string | null
  onSelect: (key: string) => void
}) {
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((p) => (
        <Marker
          key={p.key}
          position={[p.lat, p.lng]}
          icon={icon(p, p.key === selected)}
          zIndexOffset={p.key === selected ? 1000 : p.visited ? 100 : 0}
          eventHandlers={{ click: () => onSelect(p.key) }}
          title={p.name}
        />
      ))}
      <Controller places={places} selected={selected} />
    </MapContainer>
  )
}
