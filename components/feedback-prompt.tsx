"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpenText } from "@phosphor-icons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePlans } from "@/lib/queries"
import { formatDate } from "@/lib/format"
import type { FullPlan } from "@/lib/types"

const KEY = "feedback-prompted"

function readPrompted(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]")
  } catch {
    return []
  }
}

/** Remember that a plan has already shown its feedback popup. */
export function markPrompted(id: string) {
  try {
    const ids = new Set(readPrompted())
    ids.add(id)
    localStorage.setItem(KEY, JSON.stringify([...ids]))
  } catch {}
}

/**
 * On app open, if a completed plan has no journal, show a reminder once.
 * Never shown on share links or while already writing a journal.
 */
export function FeedbackPrompt() {
  const pathname = usePathname()
  const suppressed = pathname.startsWith("/share") || pathname.endsWith("/journal")
  const { data } = usePlans()
  const [target, setTarget] = useState<FullPlan | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (checked || suppressed || !data) return
    const prompted = new Set(readPrompted())
    const candidate = data
      .filter((p) => p.status === "completed" && !p.journal && !prompted.has(p.id))
      .sort((a, b) => b.plan_date.localeCompare(a.plan_date))[0]
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot check after data loads
    setChecked(true)
    if (candidate) {
      markPrompted(candidate.id)
      setTarget(candidate)
    }
  }, [data, checked, suppressed])

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 grid size-14 place-items-center rounded-full bg-rose-soft text-rose">
            <BookOpenText weight="duotone" className="size-7" />
          </span>
          <DialogTitle className="text-lg">Gimana date-nya?</DialogTitle>
          <DialogDescription>
            {target && (
              <>
                &ldquo;{target.title}&rdquo; pada {formatDate(target.plan_date)} belum punya catatan kenangan.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTarget(null)}>Nanti saja</Button>
          {target && (
            <Link
              href={`/plans/${target.id}/journal`}
              onClick={() => setTarget(null)}
              className={buttonVariants()}
            >
              Tulis kenangan
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
