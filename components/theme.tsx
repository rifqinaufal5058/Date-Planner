"use client"

import { useEffect, useSyncExternalStore } from "react"

export type ThemePref = "light" | "dark" | "system"
const KEY = "theme"

/**
 * Runs in <head> before paint so there is no light/dark flash.
 * Mirrors the logic of `apply()` below.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`

const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    return (localStorage.getItem(KEY) as ThemePref) || "system"
  } catch {
    return "system"
  }
}

function apply(pref: ThemePref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const el = document.documentElement
  el.classList.toggle("dark", dark)
  el.style.colorScheme = dark ? "dark" : "light"
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#1c1918" : "#fbf9f9")
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function setTheme(t: ThemePref) {
  try {
    localStorage.setItem(KEY, t)
  } catch {}
  apply(t)
}

/** Keeps "system" in sync with OS changes. Mount once. */
export function ThemeSync() {
  useEffect(() => {
    apply(readPref())
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => readPref() === "system" && apply("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return null
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref)
  const resolved = useSyncExternalStore<"light" | "dark">(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light"
  )
  return { theme, resolved, setTheme }
}
