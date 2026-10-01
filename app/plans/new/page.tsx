import { PlanFormClient } from "@/components/plan-form-client"

export const metadata = { title: "Rencana baru" }

export default function NewPlanPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Rencana baru</h1>
        <p className="mt-1 text-muted-foreground">Isi detail date lalu susun urutan aktivitasnya.</p>
      </div>
      <PlanFormClient />
    </div>
  )
}
