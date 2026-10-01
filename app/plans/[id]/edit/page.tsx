"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarX } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import { PlanForm } from "@/components/plan-form"
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/states"
import { usePlan } from "@/lib/queries"

export default function EditPlanPage({ params }: PageProps<"/plans/[id]/edit">) {
  const { id } = use(params)
  const { data, isPending, isError, error, refetch } = usePlan(id)

  if (isPending) return <DetailSkeleton />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data)
    return (
      <EmptyState
        icon={CalendarX}
        title="Rencana tidak ditemukan"
        description="Mungkin sudah dihapus."
        action={<Link href="/plans" className={buttonVariants({ size: "sm" })}>Kembali</Link>}
      />
    )

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-3">
        <Link href={`/plans/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {data.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Edit rencana</h1>
      </div>
      <PlanForm initial={data} />
    </div>
  )
}
