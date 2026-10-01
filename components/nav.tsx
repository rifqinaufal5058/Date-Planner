"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookmarkSimple,
  CalendarHeart,
  HouseSimple,
  MapTrifold,
  Moon,
  Plus,
  Sun,
  type Icon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme"
import { buttonVariants } from "@/components/ui/button"

type NavItem = { href: string; label: string; icon: Icon; match: (p: string) => boolean }

const items: NavItem[] = [
  { href: "/", label: "Beranda", icon: HouseSimple, match: (p) => p === "/" },
  {
    href: "/plans",
    label: "Rencana",
    icon: CalendarHeart,
    match: (p) => p.startsWith("/plans") && p !== "/plans/new",
  },
  { href: "/map", label: "Peta", icon: MapTrifold, match: (p) => p.startsWith("/map") },
  { href: "/memories", label: "Kenangan", icon: BookmarkSimple, match: (p) => p.startsWith("/memories") },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setTheme } = useTheme()
  const next = resolved === "dark" ? "light" : "dark"
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Ganti ke mode ${next === "dark" ? "gelap" : "terang"}`}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative overflow-hidden",
        className
      )}
    >
      <Sun
        weight="bold"
        className="size-5 transition-all duration-300 dark:scale-0 dark:-rotate-90"
      />
      <Moon
        weight="bold"
        className="absolute size-5 scale-0 rotate-90 transition-all duration-300 dark:scale-100 dark:rotate-0"
      />
    </button>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      {/* 64px asset for a 32px slot = sharp on retina; tiny WebP, so a plain <img> is fine */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-64.webp"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-full ring-2 ring-rose/30"
      />
      <span className="text-[1.05rem]">Date Planner</span>
    </Link>
  )
}

/** Desktop / tablet header (md and up). On mobile it shrinks to brand + theme toggle. */
export function Header() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {items.map((it) => {
            const active = it.match(pathname)
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {it.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/plans/new"
            className={cn(buttonVariants({ size: "default" }), "hidden md:inline-flex")}
          >
            <Plus weight="bold" />
            Buat Rencana
          </Link>
        </div>
      </div>
    </header>
  )
}

/**
 * Mobile-only floating tab bar (iOS 26 style): a rounded glass pill with the
 * four tabs, plus a separate circular "+" button on the right.
 */
export function BottomNav() {
  const pathname = usePathname()
  const createActive = pathname === "/plans/new"
  return (
    <nav
      aria-label="Navigasi utama"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="glass-bar pointer-events-auto flex h-16 min-w-0 flex-1 items-center rounded-full p-1.5">
          {items.map((it) => {
            const active = it.match(pathname)
            const IconCmp = it.icon
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium transition-all duration-300 active:scale-95",
                  active ? "bg-foreground/[0.07] text-rose dark:bg-white/10" : "text-foreground/70"
                )}
              >
                <IconCmp weight={active ? "fill" : "regular"} className="size-[22px]" />
                <span className="truncate">{it.label}</span>
              </Link>
            )
          })}
        </div>
        <Link
          href="/plans/new"
          aria-label="Buat rencana"
          aria-current={createActive ? "page" : undefined}
          className={cn(
            "pointer-events-auto grid size-16 shrink-0 place-items-center rounded-full bg-rose text-rose-foreground shadow-[0_10px_28px_-10px_var(--rose),inset_0_1px_0_rgb(255_255_255/0.25)] transition-transform active:scale-90",
            createActive && "ring-4 ring-rose/25"
          )}
        >
          <Plus weight="bold" className="size-6" />
        </Link>
      </div>
    </nav>
  )
}
