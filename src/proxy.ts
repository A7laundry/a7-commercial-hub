import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

// Paths that do NOT require authentication
const PUBLIC_PATHS = ["/", "/login", "/onboarding"]

// Client portal has its own auth flow — do not redirect
const PORTAL_PREFIX = "/portal"

// ── IP-based rate limiting for auth-adjacent endpoints ────────────────────────
// In-memory per Edge instance — good for burst protection.
// For cluster-wide limits use Redis/Upstash.
const AUTH_RATE_LIMIT = 10    // max requests
const AUTH_WINDOW_MS  = 60_000 // per 60 s

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS })
    return true
  }
  if (entry.count >= AUTH_RATE_LIMIT) return false
  entry.count++
  return true
}

const RATE_LIMITED_PREFIXES = ["/login", "/signup", "/forgot-password", "/api/auth"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting ──────────────────────────────────────────────────────────
  if (RATE_LIMITED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown"

    if (!checkRateLimit(ip)) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60", "Content-Type": "text/plain" },
      })
    }
  }

  // Let public paths, portal, API routes and static assets pass through
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith(PORTAL_PREFIX) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Create a response object we can mutate for cookie writes (token refresh)
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() validates the JWT server-side — required for auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const proxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
