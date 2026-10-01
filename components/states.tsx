"use client"

import { ArrowClockwise, WarningCircle, type Icon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ErrorState({
  title = "Gagal memuat data",
  error,
  onRetry,
  className,
}: {
  title?: string
  error?: unknown
  onRetry?: () => void
  className?: string
}) {
  const msg = error instanceof Error ? error.message : undefined
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-5",
        className
      )}
    >
      <div className="flex items-center gap-2 font-medium text-destructive">
        <WarningCircle weight="bold" className="size-5" />
        {title}
      </div>
      <p className="text-sm text-muted-foreground">
        {msg ? `${msg}. ` : ""}Periksa koneksi lalu coba lagi. Data kamu tidak hilang.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <ArrowClockwise weight="bold" />
          Coba lagi
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: IconCmp,
  title,
  description,
  action,
  className,
}: {
  icon: Icon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center",
        className
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-rose-soft text-rose">
        <IconCmp weight="duotone" className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="mx-auto max-w-[40ch] text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border p-5", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-2/3" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
