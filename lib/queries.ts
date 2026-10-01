"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { repo } from "@/lib/data"
import { applyChoice, derivePlanStatus } from "@/lib/data/repository"
import type {
  ActivityInput,
  ActivityStatus,
  ChoiceBy,
  FullPlan,
  JournalInput,
  PlaceReviewInput,
  Photo,
  PlanInput,
} from "@/lib/types"

export const keys = {
  plans: ["plans"] as const,
  plan: (id: string) => ["plan", id] as const,
  share: (token: string) => ["share", token] as const,
}

export function usePlans() {
  return useQuery({ queryKey: keys.plans, queryFn: () => repo.listPlans() })
}

export function usePlan(id: string) {
  return useQuery({ queryKey: keys.plan(id), queryFn: () => repo.getPlan(id) })
}

export function useSharedPlan(token: string) {
  return useQuery({
    queryKey: keys.share(token),
    queryFn: () => repo.getPlanByShareToken(token),
  })
}

function useInvalidateAll() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}

export function useSavePlan() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ plan, activities }: { plan: PlanInput; activities: ActivityInput[] }) =>
      repo.savePlan(plan, activities),
    onSuccess: invalidate,
  })
}

export function useDeletePlan() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (id: string) => repo.deletePlan(id), onSuccess: invalidate })
}

/** Optimistic: the checklist reacts instantly and rolls back on failure. */
export function useSetActivityStatus(queryKey: readonly unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActivityStatus }) =>
      repo.setActivityStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<FullPlan | null>(queryKey)
      if (prev) {
        const activities = prev.activities.map((a) => (a.id === id ? { ...a, status } : a))
        qc.setQueryData<FullPlan>(queryKey, {
          ...prev,
          activities,
          status: derivePlanStatus(activities.map((a) => a.status)),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(queryKey, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries(),
  })
}

/** Optimistic: the picked card highlights immediately, rolls back on failure. */
export function useChooseOption(queryKey: readonly unknown[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, optionId, by }: { activityId: string; optionId: string | null; by: ChoiceBy }) =>
      repo.chooseOption(activityId, optionId, by),
    onMutate: async ({ activityId, optionId, by }) => {
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData<FullPlan | null>(queryKey)
      if (prev) {
        qc.setQueryData<FullPlan>(queryKey, {
          ...prev,
          activities: prev.activities.map((a) => (a.id === activityId ? { ...a, ...applyChoice(a, optionId, by) } : a)),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(queryKey, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries(),
  })
}

export function useSetPlanStatus() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FullPlan["status"] }) =>
      repo.setPlanStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useShareToken() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (id: string) => repo.ensureShareToken(id), onSuccess: invalidate })
}

export function useSaveJournal() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ journal, reviews }: { journal: JournalInput; reviews: PlaceReviewInput[] }) =>
      repo.saveJournal(journal, reviews),
    onSuccess: invalidate,
  })
}

export function useDeletePhoto() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: (p: Photo) => repo.deletePhoto(p), onSuccess: invalidate })
}
