/**
 * Shared WhatsApp Meta API helpers.
 * Used by both /api/whatsapp/send and /api/cron/digest.
 * Server-only — never import in client code.
 */

export type SendToMetaResult = {
  wa_message_id: string | null
  attempts: number
  error: string | null
}

/**
 * Send a text message via Meta Cloud API with exponential-backoff retry.
 * Delays: 1 s → 3 s → 10 s (up to maxAttempts).
 * 4xx responses are not retried (bad request / auth failure).
 */
export async function sendToMeta(
  phoneNumberId: string,
  accessToken: string,
  phone: string,
  message: string,
  maxAttempts = 3,
): Promise<SendToMetaResult> {
  const delays = [1000, 3000, 10000]
  let lastError: string | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone.replace(/\D/g, ""),
            type: "text",
            text: { body: message },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      )

      if (res.ok) {
        const data = await res.json()
        const wa_message_id = (data as { messages?: { id: string }[] })?.messages?.[0]?.id ?? null
        return { wa_message_id, attempts: attempt, error: null }
      }

      let errBody = `HTTP ${res.status}`
      try {
        const errData = await res.json() as { error?: { message?: string } }
        errBody = errData?.error?.message ?? errBody
      } catch { /* ignore */ }
      lastError = errBody

      // 4xx → not retryable
      if (res.status >= 400 && res.status < 500) {
        return { wa_message_id: null, attempts: attempt, error: lastError }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delays[attempt - 1]))
    }
  }

  return { wa_message_id: null, attempts: maxAttempts, error: lastError }
}
