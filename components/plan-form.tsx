"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  ArrowsSplit,
  CarProfile,
  CircleNotch,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LocationPicker } from "@/components/map/location-picker"
import { ChoiceEditor, blankOption } from "@/components/choice-editor"
import { cn } from "@/lib/utils"
import { useOnline } from "@/components/offline-banner"
import { newId } from "@/lib/data/repository"
import { useSavePlan } from "@/lib/queries"
import { todayISO } from "@/lib/format"
import { ACTIVITY_CATEGORIES, type ActivityInput, type FullPlan, type GeoPoint } from "@/lib/types"

type DraftActivity = ActivityInput

function blankActivity(planId: string): DraftActivity {
  return {
    id: newId(),
    date_plan_id: planId,
    name: "",
    category: "Food",
    start_time: "",
    end_time: "",
    status: "scheduled",
    location_name: null,
    latitude: null,
    longitude: null,
    journey_duration_minutes: null,
    order_index: 0,
    options: null,
    chosen_option_id: null,
    chosen_by: null,
  }
}

export function PlanForm({
  initial,
  onSaved,
}: {
  initial?: FullPlan
  /** Called after save; defaults to navigating to the plan page. */
  onSaved?: (id: string) => void
}) {
  const router = useRouter()
  const online = useOnline()
  const save = useSavePlan()
  const [id] = useState(() => initial?.id ?? newId())
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [date, setDate] = useState(initial?.plan_date ?? todayISO())
  const [loc, setLoc] = useState<GeoPoint>({
    location_name: initial?.location_name ?? null,
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
  })
  const [acts, setActs] = useState<DraftActivity[]>(() =>
    initial?.activities.length
      ? initial.activities.map((a) => ({
          id: a.id,
          date_plan_id: a.date_plan_id,
          name: a.name,
          category: a.category,
          start_time: a.start_time?.slice(0, 5) ?? "",
          end_time: a.end_time?.slice(0, 5) ?? "",
          status: a.status,
          location_name: a.location_name,
          latitude: a.latitude,
          longitude: a.longitude,
          journey_duration_minutes: a.journey_duration_minutes,
          order_index: a.order_index,
          options: a.options,
          chosen_option_id: a.chosen_option_id,
          chosen_by: a.chosen_by,
        }))
      : [blankActivity(id)]
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (i: number, patch: Partial<DraftActivity>) =>
    setActs((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  const move = (i: number, dir: -1 | 1) =>
    setActs((list) => {
      const next = [...list]
      const j = i + dir
      if (j < 0 || j >= next.length) return list
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  /** Switch an activity between a single place and a set of 2+ options. */
  const setChoiceMode = (i: number, on: boolean) =>
    setActs((list) =>
      list.map((a, j) => {
        if (j !== i || !!a.options === on) return a
        if (on) {
          // Seed option A from the place that was already filled in.
          const first = a.location_name
            ? { ...blankOption(), label: a.location_name, location_name: a.location_name, latitude: a.latitude, longitude: a.longitude }
            : blankOption()
          return { ...a, options: [first, blankOption()], chosen_option_id: null, chosen_by: null, location_name: null, latitude: null, longitude: null }
        }
        // Back to single place: keep the chosen option's place, if any.
        const chosen = a.options?.find((o) => o.id === a.chosen_option_id)
        return {
          ...a,
          options: null,
          chosen_option_id: null,
          chosen_by: null,
          location_name: chosen ? (chosen.location_name ?? chosen.label) : null,
          latitude: chosen?.latitude ?? null,
          longitude: chosen?.longitude ?? null,
        }
      })
    )

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Judul wajib diisi"
    if (!date) e.date = "Tanggal wajib diisi"
    acts.forEach((a, i) => {
      if (!a.name.trim()) e[`act-${i}`] = "Nama aktivitas wajib diisi"
      // Same-day only: an end time before the start is almost always a typo.
      if (a.start_time && a.end_time && a.end_time <= a.start_time)
        e[`end-${i}`] = "Jam selesai harus setelah jam mulai"
      a.options?.forEach((o) => {
        if (!o.label.trim()) e[`opt-${o.id}`] = "Nama pilihan wajib diisi"
      })
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (save.isPending) return // guard against double submit
    if (!validate()) {
      toast.error("Lengkapi data yang masih kosong")
      return
    }
    save.mutate(
      {
        plan: {
          id,
          title: title.trim(),
          description: description.trim() || null,
          plan_date: date,
          ...loc,
        },
        activities: acts.map((a, i) => ({
          ...a,
          name: a.name.trim(),
          start_time: a.start_time || null,
          end_time: a.end_time || null,
          options: a.options?.map((o) => ({ ...o, label: o.label.trim(), note: o.note?.trim() || null })) ?? null,
          journey_duration_minutes: i === 0 ? null : a.journey_duration_minutes,
          order_index: i,
        })),
      },
      {
        onSuccess: () => {
          toast.success(initial ? "Rencana diperbarui" : "Rencana dibuat")
          if (onSaved) onSaved(id)
          else router.push(`/plans/${id}`)
        },
        onError: (err) => toast.error(`Gagal menyimpan: ${err.message}`),
      }
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10" noValidate>
      {/* Details */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight">Detail</h2>
        <div className="grid gap-2">
          <Label htmlFor="title">Judul</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Cinema Night + Saloka Trip"
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="desc">Deskripsi</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Catatan singkat tentang rencana ini"
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Tanggal</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!errors.date}
          />
          {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
        </div>
        <div className="grid gap-2">
          <Label>Daerah</Label>
          <LocationPicker value={loc} onChange={setLoc} placeholder="mis. Kota Semarang" suggestVisited={false} />
          <p className="text-xs text-muted-foreground">Cukup kota atau area. Tempat tujuan diisi di tiap aktivitas.</p>
        </div>
      </section>

      {/* Timeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
          <span className="font-mono text-xs text-muted-foreground">{acts.length} aktivitas</span>
        </div>
        <ol className="space-y-3">
          {acts.map((a, i) => (
            <li key={a.id} className="space-y-3">
              {i > 0 && (
                <div className="flex items-center gap-2 pl-4 text-sm text-muted-foreground">
                  <CarProfile className="size-4 shrink-0" />
                  <label htmlFor={`journey-${a.id}`} className="shrink-0">Perjalanan</label>
                  <Input
                    id={`journey-${a.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={a.journey_duration_minutes ?? ""}
                    onChange={(e) =>
                      update(i, {
                        journey_duration_minutes: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      })
                    }
                    placeholder="0"
                    className="h-9 w-20"
                  />
                  <span>menit</span>
                </div>
              )}
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-rose-soft font-mono text-xs font-semibold text-rose">
                    {i + 1}
                  </span>
                  <div className="flex items-center">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Naikkan" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Turunkan" disabled={i === acts.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus aktivitas"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setActs((l) => l.filter((_, j) => j !== i))}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor={`name-${a.id}`} className="text-xs text-muted-foreground">Nama aktivitas</Label>
                    <Input
                      id={`name-${a.id}`}
                      value={a.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="mis. Dinner"
                      aria-invalid={!!errors[`act-${i}`]}
                    />
                    {errors[`act-${i}`] && <p className="text-sm text-destructive">{errors[`act-${i}`]}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid min-w-0 gap-1.5">
                      <Label htmlFor={`time-${a.id}`} className="text-xs text-muted-foreground">Jam mulai</Label>
                      <Input
                        id={`time-${a.id}`}
                        type="time"
                        value={a.start_time ?? ""}
                        onChange={(e) => update(i, { start_time: e.target.value })}
                      />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                      <Label htmlFor={`end-${a.id}`} className="text-xs text-muted-foreground">Jam selesai</Label>
                      <Input
                        id={`end-${a.id}`}
                        type="time"
                        value={a.end_time ?? ""}
                        onChange={(e) => update(i, { end_time: e.target.value })}
                        aria-invalid={!!errors[`end-${i}`]}
                      />
                    </div>
                    {errors[`end-${i}`] && <p className="col-span-2 text-sm text-destructive">{errors[`end-${i}`]}</p>}
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Kategori</Label>
                    <Select value={a.category} onValueChange={(v) => update(i, { category: v as string })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">Tempat</Label>
                      <div role="radiogroup" aria-label="Jenis tempat" className="inline-flex rounded-full bg-secondary p-0.5 text-xs font-medium">
                        {[
                          { v: false, label: "Satu tempat" },
                          { v: true, label: "Beri pilihan" },
                        ].map(({ v, label }) => {
                          const on = !!a.options === v
                          return (
                            <button
                              key={label}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setChoiceMode(i, v)}
                              className={cn(
                                "flex h-7 items-center gap-1 rounded-full px-3 transition-colors",
                                on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                              )}
                            >
                              {v && <ArrowsSplit weight="bold" className="size-3.5" />}
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {a.options ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Pasangan kamu bisa memilih salah satu lewat link Bagikan.
                        </p>
                        <ChoiceEditor
                          activityId={a.id}
                          options={a.options}
                          chosenId={a.chosen_option_id}
                          errors={errors}
                          onChange={(options) => {
                            const stillChosen = options.some((o) => o.id === a.chosen_option_id)
                            // Keep the activity's place in sync with the chosen option's latest edits.
                            const chosen = options.find((o) => o.id === a.chosen_option_id)
                            update(i, {
                              options,
                              ...(stillChosen && chosen
                                ? { location_name: chosen.location_name ?? chosen.label, latitude: chosen.latitude, longitude: chosen.longitude }
                                : { chosen_option_id: null, chosen_by: null, location_name: null, latitude: null, longitude: null }),
                            })
                          }}
                        />
                      </>
                    ) : (
                      <LocationPicker
                        value={a}
                        onChange={(g) => update(i, g)}
                        placeholder="Lokasi aktivitas (opsional)"
                      />
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setActs((l) => [...l, blankActivity(id)])}
        >
          <Plus weight="bold" />
          Tambah aktivitas
        </Button>
      </section>

      <div className="flex flex-col gap-3 border-t pt-5 lg:col-span-2">
        {save.isError && (
          <p className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
            <WarningCircle weight="bold" className="size-4" />
            Gagal menyimpan. Data form tetap aman, silakan coba lagi.
          </p>
        )}
        <div className="grid grid-cols-[auto_1fr] gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" size="lg" disabled={save.isPending || !online}>
            {save.isPending && <CircleNotch className="animate-spin" />}
            {save.isError ? "Coba simpan lagi" : initial ? "Simpan perubahan" : "Simpan rencana"}
          </Button>
        </div>
      </div>
    </form>
  )
}
