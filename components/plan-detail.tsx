"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowsSplit,
  BookOpenText,
  CalendarBlank,
  CheckCircle,
  CircleNotch,
  ClockCountdown,
  ConfettiIcon,
  MapPin,
  PencilSimple,
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LeafletMap, type MapPoint } from "@/components/map"
import { Timeline } from "@/components/timeline"
import { JournalView } from "@/components/journal-view"
import { StatusPill } from "@/components/plan-card"
import { ShareDialog } from "@/components/share-button"
import { PlanActions } from "@/components/plan-actions"
import { EmptyState } from "@/components/states"
import { useDeletePlan, useSetPlanStatus } from "@/lib/queries"
import { formatDate, progressOf, todayISO } from "@/lib/format"
import { markPrompted } from "@/components/feedback-prompt"
import { isPendingChoice, type FullPlan } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PlanDetail({
  plan,
  queryKey,
  mode,
  onEdit,
}: {
  plan: FullPlan
  queryKey: readonly unknown[]
  mode: "owner" | "shared"
  onEdit: () => void
}) {
  const router = useRouter()
  const del = useDeletePlan()
  const setPlanStatus = useSetPlanStatus()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const shareRef = useRef<(() => void) | null>(null)
  const { done, total, pct } = progressOf(plan)
  const completed = plan.status === "completed"
  const isPast = plan.plan_date < todayISO()

  // Completion prompt: fire when the plan transitions to completed while viewing.
  const prevStatus = useRef(plan.status)
  useEffect(() => {
    if (prevStatus.current !== "completed" && plan.status === "completed" && !plan.journal) {
      setCelebrate(true)
      markPrompted(plan.id) // don't show the global popup again for this plan
    }
    prevStatus.current = plan.status
  }, [plan.status, plan.journal, plan.id])

  const points: MapPoint[] = []
  // Main location is only an area label ("Kota Semarang"), so it is not pinned.
  plan.activities.forEach((a, i) => {
    if (a.latitude != null && a.longitude != null)
      points.push({ lat: a.latitude, lng: a.longitude, label: a.name, index: i + 1 })
    else if (isPendingChoice(a))
      // Undecided choice: show every option so the place can be compared on the map.
      a.options!.forEach((o, k) => {
        if (o.latitude != null && o.longitude != null)
          points.push({ lat: o.latitude, lng: o.longitude, label: `${a.name}: ${o.label}`, index: `${i + 1}${"ABCD"[k]}`, ghost: true })
      })
  })
  const routePoints = points.filter((p) => !p.ghost)
  const pendingChoices = plan.activities.filter((a) => a.status === "scheduled" && isPendingChoice(a))
  const journalHref = `/plans/${plan.id}/journal`

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-4">
        {mode === "owner" && (
          <Link href="/plans" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Semua rencana
          </Link>
        )}
        <div className="space-y-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{plan.title}</h1>
            {plan.description && (
              <p className="max-w-[60ch] leading-relaxed text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank className="size-4" />
              {formatDate(plan.plan_date, { weekday: "long", month: "long" })}
            </span>
            <StatusPill plan={plan} />
          </div>
          {plan.location_name && (
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{plan.location_name}</span>
            </p>
          )}
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <PlanActions
              plan={plan}
              mode={mode}
              onEdit={onEdit}
              onShare={() => shareRef.current?.()}
              onDelete={() => setConfirmDelete(true)}
            />
            {mode === "owner" && <ShareDialog plan={plan} triggerRef={shareRef} />}
          </div>
        </div>
      </div>

      {/* Choices waiting for an answer */}
      {pendingChoices.length > 0 && !completed && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-rose/30 bg-rose-soft p-4"
        >
          <ArrowsSplit weight="bold" className="mt-0.5 size-5 shrink-0 text-rose" />
          <div className="min-w-0 text-sm">
            {mode === "shared" ? (
              <>
                <p className="font-medium">Ada {pendingChoices.length} pilihan buat kamu</p>
                <p className="text-muted-foreground">
                  Pilih yang kamu mau di {pendingChoices.map((a) => a.name).join(", ")}. Pilihanmu langsung tersimpan.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Menunggu pilihan: {pendingChoices.map((a) => a.name).join(", ")}</p>
                <p className="text-muted-foreground">Kirim link lewat Bagikan supaya dia bisa memilih, atau pilih sendiri di timeline.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Past-date prompt */}
      {!completed && isPast && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose/30 bg-rose-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm">
            <ClockCountdown weight="bold" className="size-5 shrink-0 text-rose" />
            Tanggal date ini sudah lewat. Sudah selesai?
          </p>
          <Button
            size="sm"
            disabled={setPlanStatus.isPending}
            onClick={() =>
              setPlanStatus.mutate(
                { id: plan.id, status: "completed" },
                { onError: (e) => toast.error(e.message) }
              )
            }
          >
            {setPlanStatus.isPending ? <CircleNotch className="animate-spin" /> : <CheckCircle weight="bold" />}
            Tandai selesai
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        {/* Timeline column */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
            {total > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", completed ? "bg-success" : "bg-rose")} style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{done}/{total}</span>
              </div>
            )}
          </div>
          {total ? (
            <Timeline
              activities={plan.activities}
              reviews={plan.journal?.reviews}
              queryKey={queryKey}
              viewer={mode === "shared" ? "partner" : "owner"}
            />
          ) : (
            <EmptyState
              icon={CalendarBlank}
              title="Belum ada aktivitas"
              description="Tambahkan aktivitas supaya timeline bisa diikuti saat date."
              action={<Button size="sm" onClick={onEdit}>Tambah aktivitas</Button>}
            />
          )}
        </section>

        {/* Side column */}
        <aside className="space-y-6">
          {points.length > 0 && (
            <section className="overflow-hidden rounded-2xl border bg-card">
              <div className="h-56 md:h-64">
                <LeafletMap points={points} showRoute />
              </div>
              <p className="px-4 py-3 text-xs text-muted-foreground">
                {routePoints.length > 0 && `Rute ${routePoints.length} tempat sesuai urutan timeline.`}
                {points.length > routePoints.length && " Pin bergaris = pilihan yang belum diputuskan."}
              </p>
            </section>
          )}

          {completed && mode === "owner" && (
            <section className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Kenangan</h2>
                {plan.journal && (
                  <Link href={journalHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <PencilSimple /> Edit
                  </Link>
                )}
              </div>
              {plan.journal ? (
                <JournalView plan={plan} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Date sudah selesai. Simpan rating, momen favorit, dan foto selagi masih segar.
                  </p>
                  <Link href={journalHref} className={cn(buttonVariants(), "w-full")}>
                    <BookOpenText weight="bold" /> Tulis kenangan
                  </Link>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>

      {/* Completion prompt */}
      <Dialog open={celebrate} onOpenChange={setCelebrate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center">
            <span className="mb-1 grid size-14 place-items-center rounded-full bg-rose-soft text-rose">
              <ConfettiIcon weight="duotone" className="size-7" />
            </span>
            <DialogTitle className="text-lg">Date selesai!</DialogTitle>
            <DialogDescription>Semua aktivitas sudah dijalani. Mau simpan kenangannya sekarang?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCelebrate(false)}>Nanti saja</Button>
            {mode === "owner" ? (
              <Link href={journalHref} className={buttonVariants()}>Tulis kenangan</Link>
            ) : (
              <Button onClick={() => setCelebrate(false)}>Oke</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus rencana ini?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{plan.title}&rdquo; beserta timeline, jurnal, dan fotonya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(plan.id, {
                  onSuccess: () => {
                    toast.success("Rencana dihapus")
                    router.replace("/plans")
                  },
                  onError: (e) => toast.error(`Gagal menghapus: ${e.message}`),
                })
              }
            >
              {del.isPending && <CircleNotch className="animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
