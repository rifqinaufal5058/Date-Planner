"use client"

import { useEffect, useState } from "react"
import { Check, Copy, ShareNetwork } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useShareToken } from "@/lib/queries"
import { isPendingChoice, type FullPlan } from "@/lib/types"

/**
 * Share dialog. Opened imperatively through `triggerRef.current()` so the
 * trigger can live anywhere (inline button on desktop, overflow menu on mobile).
 */
export function ShareDialog({
  plan,
  triggerRef,
}: {
  plan: FullPlan
  triggerRef: React.RefObject<(() => void) | null>
}) {
  const share = useShareToken()
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    triggerRef.current = () => {
      if (share.isPending) return
      share.mutate(plan.id, {
        onSuccess: (token) => setUrl(`${window.location.origin}/share/date-plan/${token}`),
        onError: (e) => toast.error(`Gagal membuat link: ${e.message}`),
      })
    }
    return () => {
      triggerRef.current = null
    }
  }, [plan.id, share, triggerRef])

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Tidak bisa menyalin, salin manual ya")
    }
  }

  const pending = plan.activities.filter(isPendingChoice)
  const message = pending.length
    ? `Pilih ya: ${pending.map((a) => `${a.name} (${a.options!.map((o) => o.label).join(" / ")})`).join(", ")}`
    : `Rencana date kita: ${plan.title}`

  const nativeShare = async () => {
    if (!url) return
    try {
      await navigator.share({ title: plan.title, text: message, url })
    } catch {}
  }

  const copyWithMessage = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(`${message}\n${url}`)
      toast.success("Pesan + link disalin")
    } catch {
      toast.error("Tidak bisa menyalin, salin manual ya")
    }
  }

  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && setUrl(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bagikan rencana</DialogTitle>
          <DialogDescription>
            {pending.length
              ? `Dia bisa memilih ${pending.length} pilihan yang belum diputuskan, juga membuka dan mengedit rencana.`
              : "Siapa pun yang punya link ini bisa membuka dan mengedit rencana."}
          </DialogDescription>
        </DialogHeader>
        {pending.length > 0 && (
          <div className="rounded-xl bg-rose-soft px-3.5 py-3 text-sm">
            <p className="mb-1 text-xs font-medium text-rose">Pesan yang dikirim</p>
            <p>{message}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Input readOnly value={url ?? ""} onFocus={(e) => e.target.select()} aria-label="Link berbagi" />
          <Button size="icon" variant="secondary" onClick={copy} aria-label="Salin link">
            {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
          </Button>
        </div>
        {typeof navigator !== "undefined" && "share" in navigator ? (
          <Button onClick={nativeShare}>
            <ShareNetwork weight="bold" />
            Kirim lewat aplikasi
          </Button>
        ) : (
          pending.length > 0 && (
            <Button onClick={copyWithMessage}>
              <Copy weight="bold" />
              Salin pesan + link
            </Button>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
