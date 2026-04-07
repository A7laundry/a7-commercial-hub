import { useQuery } from "@tanstack/react-query"
import { getTenantMembers, type TenantMember } from "@/app/(app)/inbox/actions"

export type { TenantMember }

/**
 * Fetches all users in the current tenant for the assignment dropdown.
 * Backed by a server action that uses the service role to access auth.users.
 * Cached aggressively — member lists change rarely.
 */
export function useTenantMembers() {
  return useQuery<TenantMember[]>({
    queryKey: ["tenant:members"],
    queryFn: () => getTenantMembers(),
    staleTime: 5 * 60_000,   // 5 min — member lists are stable
    refetchInterval: false,
  })
}
