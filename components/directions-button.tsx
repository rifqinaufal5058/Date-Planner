"use client"

import { AppleLogo, CaretDown, GoogleLogo, NavigationArrow } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { appleMapsUrl, googleMapsUrl } from "@/lib/format"
import type { FullPlan } from "@/lib/types"
import { cn } from "@/lib/utils"

type Target = { name: string; lat: number; lng: number }

/**
 * Where "Direction" should take you: the next activity that still has to
 * happen, otherwise the first activity with a location. The plan's main
 * location is only an area label (e.g. "Kota Semarang"), never a destination.
 */
export function directionTarget(plan: FullPlan): Target | null {
  const withCoords = plan.activities.filter((a) => a.latitude != null && a.longitude != null)
  const next = plan.status !== "completed" ? withCoords.find((a) => a.status === "scheduled") : undefined
  if (next) return { name: next.location_name || next.name, lat: next.latitude!, lng: next.longitude! }
  const any = withCoords[0]
  return any ? { name: any.location_name || any.name, lat: any.latitude!, lng: any.longitude! } : null
}

export function DirectionsButton({
  plan,
  size = "sm",
  variant = "outline",
  className,
}: {
  plan: FullPlan
  size?: "sm" | "default" | "lg"
  variant?: "outline" | "default" | "secondary"
  className?: string
}) {
  const target = directionTarget(plan)
  if (!target) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant, size }), "relative z-10", className)}
        aria-label={`Direction ke ${target.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <NavigationArrow weight="fill" className="rotate-90" />
        Direction
        <CaretDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate px-2 py-1.5">Ke {target.name}</DropdownMenuLabel>
          <DropdownMenuItem
            className="gap-2.5 px-2 py-2.5"
            render={<a href={googleMapsUrl(target.lat, target.lng)} target="_blank" rel="noreferrer" />}
          >
            <GoogleLogo weight="bold" /> Google Maps
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2.5 px-2 py-2.5"
            render={<a href={appleMapsUrl(target.lat, target.lng, target.name)} target="_blank" rel="noreferrer" />}
          >
            <AppleLogo weight="fill" /> Apple Maps
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
