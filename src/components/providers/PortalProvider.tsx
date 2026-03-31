"use client"

import { createContext, useContext } from "react"
import type { PortalClient, Account, Tenant } from "@/types"

type PortalSession = {
  portalClient: PortalClient
  account: Account
  tenant: Tenant
}

const PortalContext = createContext<PortalSession | null>(null)

export function PortalProvider({
  session,
  children,
}: {
  session: PortalSession
  children: React.ReactNode
}) {
  return (
    <PortalContext.Provider value={session}>{children}</PortalContext.Provider>
  )
}

export function usePortalSession(): PortalSession {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error("usePortalSession must be used within PortalProvider")
  return ctx
}
