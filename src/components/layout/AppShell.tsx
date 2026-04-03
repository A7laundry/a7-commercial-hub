"use client"

import { createContext, useContext, useState } from "react"
import { Sidebar } from "./Sidebar"
import { cn } from "@/lib/utils"

// ── Sidebar collapse context ───────────────────────────────────────────────────

type SidebarCtx = { collapsed: boolean; toggle: () => void }
const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} })

export function useSidebarCollapsed() {
  return useContext(SidebarContext)
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
            collapsed ? "pl-[68px]" : "pl-60"
          )}
        >
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
