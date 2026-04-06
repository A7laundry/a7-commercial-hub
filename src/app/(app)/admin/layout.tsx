import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSubNav } from "./AdminSubNav"

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adminEmails = getAdminEmails()
  if (!adminEmails.length) redirect("/dashboard")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !adminEmails.includes(user.email.toLowerCase())) {
    redirect("/dashboard")
  }

  return (
    <div className="flex gap-8 items-start">
      <AdminSubNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
