"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserProfile = {
  user_id: string
  display_name: string | null
  job_title: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the user_profiles row for the given userId.
 * Profile data is stable — use a 5-minute staleTime to avoid excessive reads.
 *
 * @example
 * const { data, isPending } = useUserProfile(currentUser.user_id)
 */
export function useUserProfile(userId: string) {
  const supabase = createClient()

  const query = useQuery<UserProfile | null>({
    enabled: !!userId,
    queryKey: ["user_profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, job_title, phone, bio, avatar_url")
        .eq("user_id", userId)
        .maybeSingle()

      if (error) throw error
      return data ?? null
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — profile changes rarely
  })

  return {
    data: query.data ?? null,
    isPending: query.isPending,
  }
}
