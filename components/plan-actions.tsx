"use client"

import { DotsThree, PencilSimple, ShareNetwork, Trash } from "@phosphor-icons/react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DirectionsButton, directionTarget } from "@/components/directions-button"
import type { FullPlan } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Plan header actions.
 * - Mobile: one even row. Direction (primary, grows) + Edit + overflow menu (Bagikan, Hapus).
 * - md+:    everything inline, delete as a quiet icon at the end.
 */
export function PlanActions({
  plan,
  mode,
  onEdit,
  onShare,
  onDelete,
}: {
  plan: FullPlan
  mode: "owner" | "shared"
  onEdit: () => void
  onShare: () => void
  onDelete: () => void
}) {
  const hasDirection = directionTarget(plan) !== null
  const owner = mode === "owner"

  return (
    <>
      {/* Mobile */}
      <div className="flex w-full items-center gap-2 md:hidden">
        {hasDirection && <DirectionsButton plan={plan} size="lg" variant="default" className="min-w-0 flex-1" />}
        <Button
          variant="outline"
          size="lg"
          onClick={onEdit}
          className={cn(hasDirection ? "px-4" : "flex-1")}
        >
          <PencilSimple weight="bold" /> Edit
        </Button>
        {owner && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Aksi lainnya"
              className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "shrink-0")}
            >
              <DotsThree weight="bold" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5">
              <DropdownMenuItem className="gap-2.5 px-2 py-2.5" onClick={onShare}>
                <ShareNetwork weight="bold" /> Bagikan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" className="gap-2.5 px-2 py-2.5" onClick={onDelete}>
                <Trash weight="bold" /> Hapus rencana
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <DirectionsButton plan={plan} size="default" variant="default" />
        <Button variant="outline" onClick={onEdit}>
          <PencilSimple weight="bold" /> Edit
        </Button>
        {owner && (
          <Button variant="outline" onClick={onShare}>
            <ShareNetwork weight="bold" /> Bagikan
          </Button>
        )}
        {owner && (
          <Button variant="ghost" size="icon" aria-label="Hapus rencana" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash weight="bold" />
          </Button>
        )}
      </div>
    </>
  )
}
