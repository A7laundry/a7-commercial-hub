"use client"

import { createContext, useContext, useState } from "react"
import { Sidebar } from "./Sidebar"
import { CommandPalette } from "./CommandPalette"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

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
          {/* Top bar with search trigger */}
          <header className="h-12 border-b bg-background/95 backdrop-blur sticky top-0 z-20 flex items-center px-6">
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
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>

      {/* Command palette — mounted at root to overlay everything */}
      <CommandPalette />
    </SidebarContext.Provider>
  )
}
