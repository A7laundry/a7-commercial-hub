"use client"

import Link from "next/link"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { Contract } from "@/types"

type ContractsTableProps = {
  contracts: Contract[]
  isLoading?: boolean
}

export function ContractsTable({ contracts, isLoading }: ContractsTableProps) {
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
          <TableHead>Título</TableHead>
          <TableHead>Conta</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id} className="hover:bg-muted/50">
            <TableCell>
              <Link
                href={`/contracts/${contract.id}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {contract.title}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {contract.account_name ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatCurrency(contract.total_value, contract.currency)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(contract.ends_at)}
            </TableCell>
            <TableCell>
              <StatusBadge status={contract.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
