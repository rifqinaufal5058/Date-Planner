"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/** The new-plan form generates ids + today's date in the browser, so skip SSR. */
export const PlanFormClient = dynamic(() => import("./plan-form").then((m) => m.PlanForm), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  ),
})
