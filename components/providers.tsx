"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { ThemeSync } from "@/components/theme"
import { OfflineBanner } from "@/components/offline-banner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true },
          // Pause mutations while offline instead of firing duplicate requests on reconnect.
          mutations: { networkMode: "online", retry: 0 },
        },
      })
  )
  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      <OfflineBanner />
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}
