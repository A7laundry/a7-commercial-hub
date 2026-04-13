import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// GET /api/accounts/search?q=&limit=20&status=
// Server-side account search with RLS. Used by AccountSearchSelect.
// ---------------------------------------------------------------------------
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!tu?.tenant_id) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
  const status = searchParams.get("status")

  let query = supabase
    .from("accounts")
    .select("id, name, pipeline_stage, status")
    .eq("tenant_id", tu.tenant_id)
    .order("name")
    .limit(limit)

  if (q.length >= 1) {
    query = query.ilike("name", `%${q}%`)
  }

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ accounts: data ?? [] })
}
