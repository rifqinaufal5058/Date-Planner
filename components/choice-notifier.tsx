"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { usePlans } from "@/lib/queries"
import { chosenOption } from "@/lib/types"

const KEY = "seen-partner-choices"

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"))
  } catch {
    return new Set()
  }
}

function writeSeen(s: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s].slice(-200)))
  } catch {}
}

/**
 * On the owner's device: announce choices the partner made through the share
 * link, once each. Keyed by activity + option so a changed mind shows again.
 */
export function ChoiceNotifier() {
  const pathname = usePathname()
  const router = useRouter()
  const onShare = pathname.startsWith("/share")
  const { data } = usePlans()

  useEffect(() => {
    if (onShare || !data) return
    const seen = readSeen()
    const fresh: { key: string; planId: string; text: string }[] = []
    for (const plan of data) {
      for (const a of plan.activities) {
        if (a.chosen_by !== "partner") continue
        const o = chosenOption(a)
        if (!o) continue
        const key = `${a.id}:${o.id}`
        if (seen.has(key)) continue
        fresh.push({ key, planId: plan.id, text: `${a.name}: ${o.label}` })
      }
    }
    if (!fresh.length) return
    fresh.forEach((f) => seen.add(f.key))
    writeSeen(seen)
    const first = fresh[0]
    toast.success(fresh.length === 1 ? "Dia sudah memilih" : `Dia sudah memilih ${fresh.length} pilihan`, {
      description: fresh.map((f) => f.text).join(" · "),
      duration: 8000,
      action: { label: "Lihat", onClick: () => router.push(`/plans/${first.planId}`) },
    })
  }, [data, onShare, router])

  return null
}
