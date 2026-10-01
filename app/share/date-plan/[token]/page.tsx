"use client"

import { use, useState } from "react"
import Link from "next/link"
import { LinkBreak, ArrowLeft } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import { PlanDetail } from "@/components/plan-detail"
import { PlanForm } from "@/components/plan-form"
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/states"
import { keys, useSharedPlan } from "@/lib/queries"

export default function SharedPlanPage({ params }: PageProps<"/share/date-plan/[token]">) {
  const { token } = use(params)
  const { data, isPending, isError, error, refetch } = useSharedPlan(token)
  const [editing, setEditing] = useState(false)

  if (isPending) return <DetailSkeleton />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data)
    return (
      <EmptyState
        icon={LinkBreak}
        title="Link tidak tersedia"
        description="Link berbagi ini tidak valid atau rencananya sudah dihapus."
        action={<Link href="/" className={buttonVariants({ size: "sm" })}>Ke beranda</Link>}
        className="mt-10"
      />
    )

  if (editing)
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="space-y-3">
          <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> {data.title}
          </button>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Edit rencana</h1>
        </div>
        <PlanForm initial={data} onSaved={() => setEditing(false)} />
      </div>
    )

  return (
    <div className="space-y-4">
      <p className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
        Kamu membuka rencana yang dibagikan
      </p>
      <PlanDetail plan={data} queryKey={keys.share(token)} mode="shared" onEdit={() => setEditing(true)} />
    </div>
  )
}
