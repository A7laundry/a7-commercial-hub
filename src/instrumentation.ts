export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const errors: string[] = []

    if (!url) {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is not set")
    } else if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
      errors.push(`NEXT_PUBLIC_SUPABASE_URL looks invalid: "${url}"`)
    }

    if (!anonKey) {
      errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
    }

    if (!serviceKey) {
      errors.push("SUPABASE_SERVICE_ROLE_KEY is not set")
    }

    if (errors.length > 0) {
      const msg = `[instrumentation] Boot validation FAILED:\n${errors.map(e => `  - ${e}`).join("\n")}`
      console.error(msg)
      throw new Error(msg)
    }

    console.log(`[instrumentation] ✓ Supabase URL: ${url}`)
    console.log(`[instrumentation] ✓ All required env vars present`)
  }
}
