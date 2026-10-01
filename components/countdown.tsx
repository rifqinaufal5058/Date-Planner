"use client"

import { useEffect, useState } from "react"

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

export function Countdown({ target }: { target: Date }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start clock on client only
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = now == null ? 0 : target.getTime() - now
  const p = parts(diff)
  const units = [
    { v: p.d, l: "hari" },
    { v: p.h, l: "jam" },
    { v: p.m, l: "menit" },
    { v: p.s, l: "detik" },
  ]
  if (now != null && diff <= 0) {
    return <p className="text-2xl font-semibold tracking-tight md:text-3xl">Hari ini!</p>
  }
  return (
    <div className="flex gap-2 md:gap-3" aria-live="off">
      {units.map((u) => (
        <div key={u.l} className="min-w-14 rounded-xl bg-background/60 px-2 py-2 text-center backdrop-blur md:min-w-18 md:px-3">
          <div className="font-mono text-2xl font-semibold tabular-nums md:text-3xl">
            {now == null ? "--" : String(u.v).padStart(2, "0")}
          </div>
          <div className="text-[11px] text-muted-foreground">{u.l}</div>
        </div>
      ))}
    </div>
  )
}
