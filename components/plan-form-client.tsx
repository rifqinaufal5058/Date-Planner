"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/** The new-plan form generates ids + today's date in the browser, so skip SSR. */
export const PlanFormClient = dynamic(() => import("./plan-form").then((m) => m.PlanForm), {
  ssr: false,
  loading: () => (
    <div className="grid gap-8 lg:grid-cols-[5fr_7fr]">
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  ),
})
