"use client"

import { Plus, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LocationPicker } from "@/components/map/location-picker"
import { newId } from "@/lib/data/repository"
import type { ActivityOption } from "@/lib/types"
import { cn } from "@/lib/utils"

export const MAX_OPTIONS = 4
const LETTERS = "ABCD"

export function blankOption(): ActivityOption {
  return { id: newId(), label: "", note: null, location_name: null, latitude: null, longitude: null }
}

/** Editor for the alternatives of a "choice" activity (2 to 4 options). */
export function ChoiceEditor({
  activityId,
  options,
  chosenId,
  errors,
  onChange,
}: {
  activityId: string
  options: ActivityOption[]
  chosenId: string | null
  errors: Record<string, string>
  onChange: (next: ActivityOption[]) => void
}) {
  const patch = (i: number, p: Partial<ActivityOption>) =>
    onChange(options.map((o, j) => (j === i ? { ...o, ...p } : o)))

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {options.map((o, i) => (
          <li
            key={o.id}
            className={cn("min-w-0 space-y-2.5 rounded-xl border bg-background/60 p-3", o.id === chosenId && "border-rose/50")}
          >
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose-soft font-mono text-xs font-semibold text-rose">
                {LETTERS[i]}
              </span>
              <label htmlFor={`opt-${activityId}-${o.id}`} className="sr-only">
                Nama pilihan {LETTERS[i]}
              </label>
              <Input
                id={`opt-${activityId}-${o.id}`}
                value={o.label}
                onChange={(e) => patch(i, { label: e.target.value })}
                placeholder={i === 0 ? "mis. Warung Taburai" : "mis. Tom Sushi"}
                aria-invalid={!!errors[`opt-${o.id}`]}
                className="h-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus pilihan ${LETTERS[i]}`}
                disabled={options.length <= 2}
                onClick={() => onChange(options.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </div>
            {errors[`opt-${o.id}`] && <p className="pl-9 text-sm text-destructive">{errors[`opt-${o.id}`]}</p>}
            <div className="min-w-0 space-y-2 pl-9">
              <LocationPicker
                value={o}
                onChange={(g) =>
                  // Pre-fill the option name from the picked place when still empty.
                  patch(i, { ...g, label: o.label.trim() ? o.label : (g.location_name ?? "") })
                }
                placeholder="Lokasi (opsional)"
              />
              <Input
                value={o.note ?? ""}
                onChange={(e) => patch(i, { note: e.target.value || null })}
                placeholder="Catatan singkat, mis. lebih murah, ada live music"
                aria-label={`Catatan pilihan ${LETTERS[i]}`}
                className="h-10"
              />
            </div>
          </li>
        ))}
      </ol>
      {options.length < MAX_OPTIONS && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...options, blankOption()])}
          className="text-rose hover:text-rose"
        >
          <Plus weight="bold" /> Tambah pilihan {LETTERS[options.length]}
        </Button>
      )}
    </div>
  )
}
