import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

/**
 * Counts conversations with unread_count > 0 from wa_conversations.
 * O(1) query — replaces the old 500-message client-side computation.
 */
export function useInboxUnreadCount(tenantId: string) {
  const supabase = createClient()

  return useQuery<number>({
    queryKey: ["inbox:unread-count", tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("wa_conversations")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gt("unread_count", 0)

      if (error) return 0
      return count ?? 0
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
