/**
 * Environment variable validation
 * P0 Fix: fail fast at boot if required vars are missing
 *
 * Call validateEnv() in the Next.js instrumentation hook or
 * at the top of critical API routes.
 */

type EnvVar = {
  key: string
  required: boolean
  description: string
}

const ENV_SCHEMA: EnvVar[] = [
  // Supabase — always required
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase project URL",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase anon key (public)",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase service role key (server-only)",
  },

  // App URL — required for redirects and portal magic links
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: true,
    description: "Base URL of the application (e.g. https://app.a7x.com.br)",
  },

  // WhatsApp — optional but must warn clearly when absent
  {
    key: "WHATSAPP_PHONE_NUMBER_ID",
    required: false,
    description: "Meta WhatsApp phone number ID — send disabled without this",
  },
  {
    key: "WHATSAPP_ACCESS_TOKEN",
    required: false,
    description: "Meta WhatsApp access token — send disabled without this",
  },
  {
    key: "WHATSAPP_VERIFY_TOKEN",
    required: false,
    description: "Meta webhook verify token — ingest disabled without this",
  },
  {
    key: "WHATSAPP_API_KEY",
    required: false,
    description: "Internal API key for webhook ingest endpoint",
  },
]

export type EnvValidationResult = {
  ok: boolean
  missing_required: string[]
  missing_optional: string[]
}

/** Validate env vars. Returns result — does NOT throw. */
export function validateEnv(): EnvValidationResult {
  const missing_required: string[] = []
  const missing_optional: string[] = []

  for (const spec of ENV_SCHEMA) {
    const val = process.env[spec.key]
    if (!val || val.trim() === "") {
      if (spec.required) {
        missing_required.push(spec.key)
      } else {
        missing_optional.push(spec.key)
      }
    }
  }

  return {
    ok: missing_required.length === 0,
    missing_required,
    missing_optional,
  }
}

/** Validate and throw if required vars are missing. Use in server boot. */
export function assertEnv(): void {
  const result = validateEnv()
  if (result.missing_optional.length > 0) {
    console.warn(
      `[env] Optional vars not set — some features disabled: ${result.missing_optional.join(", ")}`
    )
  }
  if (!result.ok) {
    throw new Error(
      `[env] FATAL: Required environment variables missing: ${result.missing_required.join(", ")}. ` +
        `Set them in .env.local or Vercel environment settings.`
    )
  }
}

/** Check if WhatsApp send is configured */
export function isWhatsAppConfigured(): boolean {
  return (
    Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
    Boolean(process.env.WHATSAPP_ACCESS_TOKEN)
  )
}

/** Check if WhatsApp ingest webhook is configured */
export function isWhatsAppIngestConfigured(): boolean {
  return (
    Boolean(process.env.WHATSAPP_VERIFY_TOKEN) &&
    Boolean(process.env.WHATSAPP_API_KEY)
  )
}
