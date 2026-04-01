"use client"

import { useState } from "react"
import { Plus, LayoutGrid, TableProperties } from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAccounts } from "@/hooks/accounts/useAccounts"
import { useQueryClient } from "@tanstack/react-query"
import { createAccountFull } from "./actions"
import { AccountCardGrid } from "@/components/modules/accounts/AccountCardGrid"
import { AccountsSpreadsheet } from "@/components/modules/accounts/AccountsSpreadsheet"
import { AccountCreateWizard } from "@/components/modules/accounts/AccountCreateWizard"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

type ViewMode = "cards" | "spreadsheet"

export default function AccountsPage() {
  const { tenant } = useTenant()
  const router = useRouter()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("spreadsheet")

  const { data: accounts = [], isLoading } = useAccounts(tenant.id, {})

  function handleSuccess(accountId: string) {
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
    qc.invalidateQueries({ queryKey: ["accounts_table", tenant.id] })
  }

  return (
    <div className={cn(
      "flex flex-col",
      viewMode === "spreadsheet" ? "h-[calc(100vh-3.5rem)]" : ""
    )}>
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e parceiros"
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Cards"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("spreadsheet")}
                title="Planilha"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "spreadsheet"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <TableProperties className="w-3.5 h-3.5" />
                Planilha
              </button>
            </div>

            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo cliente
            </Button>
          </div>
        }
      />

      {/* Content */}
      <div className={cn("flex-1 overflow-hidden", viewMode === "cards" ? "overflow-auto" : "")}>
        {viewMode === "cards" ? (
          <div className="pb-6">
            <AccountCardGrid accounts={accounts} isLoading={isLoading} />
          </div>
        ) : (
          <AccountsSpreadsheet tenantId={tenant.id} />
        )}
      </div>

      {/* Create wizard dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <AccountCreateWizard
            createFn={createAccountFull}
            onSuccess={(accountId) => {
              handleSuccess(accountId)
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
