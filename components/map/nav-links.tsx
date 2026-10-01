import { AppleLogo, GoogleLogo } from "@phosphor-icons/react/dist/ssr"
import { appleMapsUrl, googleMapsUrl } from "@/lib/format"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavLinks({
  lat,
  lng,
  name,
  size = "sm",
  className,
}: {
  lat: number
  lng: number
  name?: string | null
  size?: "sm" | "xs"
  className?: string
}) {
  const cls = cn(buttonVariants({ variant: "outline", size }), "gap-1.5")
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <a href={googleMapsUrl(lat, lng)} target="_blank" rel="noreferrer" className={cls}>
        <GoogleLogo weight="bold" />
        Google Maps
      </a>
      <a href={appleMapsUrl(lat, lng, name)} target="_blank" rel="noreferrer" className={cls}>
        <AppleLogo weight="fill" />
        Apple Maps
      </a>
    </div>
  )
}
