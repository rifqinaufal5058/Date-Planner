"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarX } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import { PlanDetail } from "@/components/plan-detail"
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/states"
import { keys, usePlan } from "@/lib/queries"

export default function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isPending, isError, error, refetch } = usePlan(id)

  if (isPending) return <DetailSkeleton />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!data)
    return (
      <EmptyState
        icon={CalendarX}
        title="Rencana tidak ditemukan"
        description="Mungkin sudah dihapus."
        action={<Link href="/plans" className={buttonVariants({ size: "sm" })}>Kembali ke rencana</Link>}
      />
    )

  return (
    <PlanDetail
      plan={data}
      queryKey={keys.plan(id)}
      mode="owner"
      onEdit={() => router.push(`/plans/${id}/edit`)}
    />
  )
}
