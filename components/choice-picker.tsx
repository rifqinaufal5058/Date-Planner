"use client"

import { ArrowCounterClockwise, CheckCircle, Heart, MapPin, NavigationArrow } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { googleMapsUrl } from "@/lib/format"
import { useChooseOption } from "@/lib/queries"
import type { Activity, ChoiceBy } from "@/lib/types"
import { cn } from "@/lib/utils"

const LETTERS = "ABCD"

/**
 * Options of a choice activity. `viewer` decides the wording:
 * - partner (share link): "Aku pilih ini" and the result reads "Kamu memilih"
 * - owner: "Pilih ini" and the result reads "Dia memilih" when the partner chose
 */
export function ChoicePicker({
  activity,
  queryKey,
  viewer,
  locked,
}: {
  activity: Activity
  queryKey: readonly unknown[]
  viewer: ChoiceBy
  /** True once the activity is done/skipped: show the result only. */
  locked?: boolean
}) {
  const choose = useChooseOption(queryKey)
  const options = activity.options ?? []
  const chosenId = activity.chosen_option_id
  const pending = choose.isPending ? choose.variables : null
  const shownId = pending ? pending.optionId : chosenId

  const pick = (optionId: string | null) =>
    choose.mutate(
      { activityId: activity.id, optionId, by: viewer },
      {
        onSuccess: () => {
          if (!optionId) return
          const o = options.find((x) => x.id === optionId)
          toast.success(viewer === "partner" ? `Pilihanmu terkirim: ${o?.label}` : `Dipilih: ${o?.label}`)
        },
        onError: (e) => toast.error(`Gagal menyimpan pilihan: ${e.message}`),
      }
    )

  const who =
    activity.chosen_by === viewer ? "Kamu memilih" : activity.chosen_by === "partner" ? "Dia memilih" : "Dipilih"

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {shownId ? (
          <span className="inline-flex items-center gap-1 text-rose">
            <Heart weight="fill" className="size-3.5" /> {who}
          </span>
        ) : viewer === "partner" ? (
          "Kamu mau yang mana?"
        ) : (
          "Menunggu pilihan, atau pilih sendiri"
        )}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Pilihan untuk ${activity.name}`}>
        {options.map((o, i) => {
          const selected = o.id === shownId
          const dimmed = !!shownId && !selected
          const hasCoords = o.latitude != null && o.longitude != null
          return (
            <li key={o.id}>
              <div
                className={cn(
                  "flex h-full flex-col gap-2 rounded-xl border p-3 transition-all",
                  selected ? "border-rose bg-rose-soft/60 ring-1 ring-rose/40" : "bg-background/60",
                  dimmed && "opacity-55"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold",
                      selected ? "bg-rose text-rose-foreground" : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {selected ? <CheckCircle weight="fill" className="size-4" /> : LETTERS[i]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{o.label}</p>
                    {o.location_name && o.location_name !== o.label && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{o.location_name}</span>
                      </p>
                    )}
                    {o.note && <p className="mt-0.5 text-xs text-muted-foreground">{o.note}</p>}
                  </div>
                </div>
                {!locked && (
                  <div className="mt-auto flex items-center gap-1.5">
                    {selected ? (
                      <span className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-rose">
                        <CheckCircle weight="fill" className="size-4" />
                        {viewer === "partner" ? "Pilihanmu" : "Terpilih"}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant={shownId ? "outline" : "default"}
                        role="radio"
                        aria-checked={false}
                        disabled={choose.isPending}
                        onClick={() => pick(o.id)}
                        className="flex-1"
                      >
                        {viewer === "partner" ? (shownId ? "Ganti ke ini" : "Aku pilih ini") : "Pilih ini"}
                      </Button>
                    )}
                    {hasCoords && (
                      <a
                        href={googleMapsUrl(o.latitude!, o.longitude!)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Lihat ${o.label} di Google Maps`}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <NavigationArrow weight="fill" className="size-4 rotate-90" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {!locked && chosenId && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => pick(null)}
          disabled={choose.isPending}
          className="text-muted-foreground"
        >
          <ArrowCounterClockwise /> Batalkan pilihan
        </Button>
      )}
    </div>
  )
}
