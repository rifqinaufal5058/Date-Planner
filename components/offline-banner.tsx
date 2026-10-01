"use client"

import { WifiSlash } from "@phosphor-icons/react"
import { useSyncExternalStore } from "react"

function subscribe(cb: () => void) {
  window.addEventListener("online", cb)
  window.addEventListener("offline", cb)
  return () => {
    window.removeEventListener("online", cb)
    window.removeEventListener("offline", cb)
  }
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-foreground px-4 py-2 text-sm text-background"
    >
      <WifiSlash weight="bold" className="size-4" />
      Kamu sedang offline. Perubahan akan bisa disimpan lagi setelah koneksi kembali.
    </div>
  )
}
