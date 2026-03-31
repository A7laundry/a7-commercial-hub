"use client"

import Link from "next/link"
import { StatusBadge } from "@/components/shared/StatusBadge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { Account } from "@/types"

type AccountsTableProps = {
  accounts: Account[]
  isLoading?: boolean
}

export function AccountsTable({ accounts, isLoading }: AccountsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Segmento</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id} className="hover:bg-muted/50">
            <TableCell>
              <Link
                href={`/accounts/${account.id}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {account.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {account.segment ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {account.contact_name ?? "—"}
              {account.contact_email && (
                <span className="text-xs block text-muted-foreground/70">
                  {account.contact_email}
                </span>
              )}
            </TableCell>
            <TableCell>
              <StatusBadge status={account.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
