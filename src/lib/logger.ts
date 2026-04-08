/**
 * Structured logger for A7X Execution OS
 * P0 Fix: replace all silent catch{} with structured error logging
 *
 * Console-based in development, ready for Sentry/Axiom integration.
 * Format: { event, status, entity_id, tenant_id, timestamp, ...extras }
 */

export type LogLevel = "info" | "warn" | "error"

export type LogPayload = {
  event: string
  status: "ok" | "error" | "retry" | "skipped"
  tenant_id?: string | null
  entity_id?: string | null
  entity_type?: string
  attempt?: number
  duration_ms?: number
  error?: string
  error_code?: string
  metadata?: Record<string, unknown>
}

function buildEntry(level: LogLevel, payload: LogPayload) {
  return {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  }
}

function output(level: LogLevel, entry: ReturnType<typeof buildEntry>) {
  const line = JSON.stringify(entry)
  if (level === "error") {
    console.error(line)
  } else if (level === "warn") {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info(payload: LogPayload) {
    output("info", buildEntry("info", payload))
  },

  warn(payload: LogPayload) {
    output("warn", buildEntry("warn", payload))
  },

  error(payload: LogPayload & { error: string }) {
    output("error", buildEntry("error", payload))
  },
}

/** LGPD: mask a phone number — keeps country code + last 4 digits */
export function maskPhone(phone: string): string {
  // E.164 format: +5511987654321 → +55119****4321
  if (phone.length <= 6) return "****"
  return phone.slice(0, phone.length - 8) + "****" + phone.slice(-4)
}

/** Convenience: log a caught error with context */
export function logError(
  event: string,
  err: unknown,
  ctx: Omit<LogPayload, "event" | "status" | "error">
) {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : "Unknown error"

  logger.error({ event, status: "error", error: message, ...ctx })
}
