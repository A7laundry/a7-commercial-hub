"use client"

import { createContext, useContext, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar, MobileSidebarTrigger } from "./Sidebar"
import { CommandPalette } from "./CommandPalette"
import { InternalChat } from "./InternalChat"
import { cn } from "@/lib/utils"
import { Search, User, Settings, LogOut } from "lucide-react"
import { Toaster } from "sonner"
import { useTenant } from "@/hooks/useTenant"
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents"
import { OnboardingBanner } from "@/components/layout/OnboardingBanner"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { useUserProfile } from "@/hooks/useUserProfile"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

// ── Sidebar collapse context ───────────────────────────────────────────────────

type SidebarCtx = { collapsed: boolean; toggle: () => void }
const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} })

export function useSidebarCollapsed() {
  return useContext(SidebarContext)
}

// ── User menu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const { currentUser } = useTenant()
  const { data: profile } = useUserProfile(currentUser.user_id)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const displayName = profile?.display_name ?? null
  const jobTitle = profile?.job_title ?? null
  const avatarUrl = profile?.avatar_url ?? null
  const label = displayName ?? currentUser.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu do usuário"
          />
        }
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          displayName={displayName}
          email={currentUser.email}
          size={28}
        />
        <span className="hidden sm:inline max-w-[120px] truncate text-foreground font-medium">
          {label}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6}>
        {/* Profile header */}
        <div className="flex items-center gap-3 px-2 py-2.5">
          <UserAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            email={currentUser.email}
            size={40}
          />
          <div className="flex flex-col min-w-0">
            {displayName && (
              <span className="text-sm font-semibold truncate leading-tight">{displayName}</span>
            )}
            <span className="text-xs text-muted-foreground truncate">{currentUser.email}</span>
            {jobTitle && (
              <span className="text-xs text-muted-foreground truncate">{jobTitle}</span>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/settings/profile" />}>
          <User className="w-4 h-4" />
          Meu Perfil
        </DropdownMenuItem>

        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="w-4 h-4" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Realtime events — mounted once, provides tenant-wide live signals ──────────

function RealtimeProvider() {
  const { tenant, currentUser } = useTenant()
  useRealtimeEvents(tenant.id, currentUser.user_id)
  return null
}

// ── AppShell ───────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div
          className={cn(
            "flex flex-col min-h-screen transition-all duration-300",
            collapsed ? "lg:pl-[68px]" : "lg:pl-60"
          )}
        >
          {/* Top bar with search trigger and user menu */}
          <header className="h-12 border-b bg-background/95 backdrop-blur sticky top-0 z-20 flex items-center gap-3 px-4 lg:px-6">
            <MobileSidebarTrigger />
            <button
              type="button"
              onClick={() => {
                // Trigger the command palette via keyboard event
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
                )
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] border rounded px-1.5 py-0.5 ml-1 group-hover:border-foreground/30 transition-colors">
                ⌘K
              </kbd>
            </button>
            {/* Push to right */}
            <div className="ml-auto flex items-center gap-2">
              <InternalChat />
              <UserMenu />
            </div>
          </header>

          <main className="flex-1">
            <OnboardingBanner />
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>

      {/* Command palette — mounted at root to overlay everything */}
      <CommandPalette />

      {/* Realtime event subscriptions — tenant-wide channels + toast dispatch */}
      <RealtimeProvider />

      {/* Toast renderer — bottom-right, rich colors */}
      <Toaster position="bottom-right" richColors closeButton />
    </SidebarContext.Provider>
  )
}
