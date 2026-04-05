import { useQuery } from "@tanstack/react-query"
import { getAccountTimeline, type TimelineEvent } from "@/app/(app)/accounts/timeline-actions"

export function useAccountTimeline(tenantId: string, accountId: string) {
  return useQuery<TimelineEvent[]>({
    queryKey: ["account_timeline", tenantId, accountId],
    queryFn: async () => {
      const { data } = await getAccountTimeline(accountId, 50)
      return data
    },
    staleTime: 30_000,
    enabled: !!accountId,
  })
}
