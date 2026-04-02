/**
 * Next.js instrumentation hook — runs once at server boot.
 * Validates required environment variables early so misconfigured
 * deployments fail loudly instead of silently degrading at runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("@/lib/env")
    assertEnv()
  }
}
