"use client"

import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarX } from "@phosphor-icons/react"
import { buttonVariants } from "@/components/ui/button"
import { JournalForm } from "@/components/journal-form"
import { DetailSkeleton, EmptyState, ErrorState } from "@/components/states"
import { usePlan } from "@/lib/queries"
import { formatDate } from "@/lib/format"

export default function JournalPage({ params }: PageProps<"/plans/[id]/journal">) {
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
        action={<Link href="/plans" className={buttonVariants({ size: "sm" })}>Kembali</Link>}
      />
    )

  return (
    <div className="mx-auto max-w-2xl space-y-6 md:space-y-8">
      <div className="space-y-3">
        <Link href={`/plans/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {data.title}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {data.journal ? "Edit kenangan" : "Tulis kenangan"}
        </h1>
        <p className="text-muted-foreground">{formatDate(data.plan_date, { weekday: "long", month: "long" })}</p>
      </div>
      <JournalForm plan={data} onDone={() => router.push(`/plans/${id}`)} />
    </div>
  )
}
