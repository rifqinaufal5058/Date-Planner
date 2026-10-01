"use client"

import { localRepository } from "./local"
import type { Repository } from "./repository"
import { isSupabaseConfigured, supabaseRepository } from "./supabase"

export const repo: Repository = isSupabaseConfigured ? supabaseRepository : localRepository
export { newId, derivePlanStatus } from "./repository"
