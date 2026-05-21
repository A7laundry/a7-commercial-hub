/**
 * useGenerateDraft — Mutation hook pra acionar o copiloto.
 *
 * Uso:
 *   const { mutate, data, isPending, error } = useGenerateDraft()
 *   mutate({ account_id: '...', operator_hint: 'oferecer foto' })
 */

import { useMutation } from "@tanstack/react-query"
import type { CopilotResult } from "@/lib/ai-copilot"

export interface GenerateDraftInput {
  account_id: string
  operator_hint?: string
}

export function useGenerateDraft() {
  return useMutation<CopilotResult, Error, GenerateDraftInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/ai-copilot/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }

      return res.json() as Promise<CopilotResult>
    },
  })
}
