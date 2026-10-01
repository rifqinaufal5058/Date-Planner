"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/** Leaflet touches `window`, so it is loaded client-side only and code-split. */
export const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
})

export type { MapPoint } from "./leaflet-map"

export const PlacesMap = dynamic(() => import("./places-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
})
