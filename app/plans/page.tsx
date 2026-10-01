"use client"

import Link from "next/link"
import { CalendarPlus, Plus } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlanCard } from "@/components/plan-card"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states"
import { usePlans } from "@/lib/queries"
import { isUpcoming, planStart } from "@/lib/format"
import type { FullPlan } from "@/lib/types"

function Grid({ plans, empty }: { plans: FullPlan[]; empty: React.ReactNode }) {
  if (!plans.length) return <>{empty}</>
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((p, i) => (
        <div key={p.id} className="reveal" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
          <PlanCard plan={p} className="h-full" />
        </div>
      ))}
    </div>
  )
}

export default function PlansPage() {
  const { data, isPending, isError, error, refetch } = usePlans()

  const upcoming = (data ?? [])
    .filter((p) => isUpcoming(p))
    .sort((a, b) => planStart(a).getTime() - planStart(b).getTime())
  const pending = (data ?? [])
    .filter((p) => p.status !== "completed" && !isUpcoming(p))
    .sort((a, b) => b.plan_date.localeCompare(a.plan_date))
  const done = (data ?? [])
    .filter((p) => p.status === "completed")
    .sort((a, b) => b.plan_date.localeCompare(a.plan_date))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Rencana</h1>
          <p className="mt-1 text-muted-foreground">Semua date yang sudah dan akan dijalani.</p>
        </div>
        <Link href="/plans/new" className={cn(buttonVariants(), "hidden md:inline-flex")}>
          <Plus weight="bold" /> Buat Rencana
        </Link>
      </div>

      {isPending ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <Tabs defaultValue="upcoming" className="gap-5">
          <TabsList className="h-10! w-full bg-secondary sm:w-fit">
            <TabsTrigger value="upcoming" className="px-4">Mendatang <span className="font-mono text-xs opacity-60">{upcoming.length}</span></TabsTrigger>
            {pending.length > 0 && (
              <TabsTrigger value="pending" className="px-4">Terlewat <span className="font-mono text-xs opacity-60">{pending.length}</span></TabsTrigger>
            )}
            <TabsTrigger value="done" className="px-4">Selesai <span className="font-mono text-xs opacity-60">{done.length}</span></TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">
            <Grid
              plans={upcoming}
              empty={
                <EmptyState
                  icon={CalendarPlus}
                  title="Belum ada rencana mendatang"
                  description="Buat rencana baru dan susun timeline aktivitasnya."
                  action={<Link href="/plans/new" className={buttonVariants({ size: "sm" })}>Buat rencana</Link>}
                />
              }
            />
          </TabsContent>
          <TabsContent value="pending">
            <Grid plans={pending} empty={null} />
          </TabsContent>
          <TabsContent value="done">
            <Grid
              plans={done}
              empty={
                <EmptyState
                  icon={CalendarPlus}
                  title="Belum ada date selesai"
                  description="Tandai aktivitas sebagai selesai atau dilewati untuk menutup sebuah date."
                />
              }
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
