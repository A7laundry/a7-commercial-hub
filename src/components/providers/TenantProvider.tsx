"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Tenant, TenantUser } from "@/types"

type TenantContextValue = {
  tenant: Tenant
  currentUser: TenantUser & { email: string }
  isSuperAdmin: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({
  children,
  tenant,
  currentUser,
  isSuperAdmin = false,
}: {
  children: ReactNode
  tenant: Tenant
  currentUser: TenantUser & { email: string }
  isSuperAdmin?: boolean
}) {
  return (
    <TenantContext.Provider value={{ tenant, currentUser, isSuperAdmin }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error("useTenantContext must be used inside TenantProvider")
  return ctx
}
