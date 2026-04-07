import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

// ── Types ─────────────────────────────────────────────────────────────────────

export type UnreportedState = {
  hasPending: boolean
  yesterdayDate: string   // YYYY-MM-DD
  yesterdayFormatted: string // DD/MM
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Format "YYYY-MM-DD" → "DD/MM" without toLocaleDateString (avoids hydration mismatch)
function formatDDMM(isoDate: string): string {
  const parts = isoDate.split("-")
  // parts = ["YYYY", "MM", "DD"]
  return `${parts[2]}/${parts[1]}`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUnreportedYesterday(tenantId: string) {
  const supabase = createClient()

  const yesterday = getYesterday()

  return useQuery<UnreportedState>({
    enabled: !!tenantId,
    queryKey: ["unreported_yesterday", tenantId, yesterday],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("interaction_outcomes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("date", yesterday)

      if (error) throw error

      return {
        hasPending: (count ?? 0) === 0,
        yesterdayDate: yesterday,
        yesterdayFormatted: formatDDMM(yesterday),
      }
    },
    staleTime: 60_000,
  })
}
