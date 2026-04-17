"use client"

import { useState, useTransition } from "react"
import { UserX } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deactivateMember } from "./actions"

interface Props {
  userId: string
  displayName: string | null
  email: string
}

export function DeactivateMemberButton({ userId, displayName, email }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDeactivate() {
    setError(null)
    startTransition(async () => {
      const result = await deactivateMember(userId)
      if (result.error) setError(result.error)
    })
  }

  const name = displayName ?? email.split("@")[0]

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger
          disabled={isPending}
          className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <UserX className="w-3 h-3" />
          {isPending ? "Desativando..." : "Desativar acesso"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar acesso de {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário <strong>{name}</strong> perderá imediatamente o acesso ao sistema.
              Esta ação pode ser revertida convidando o usuário novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Desativar acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
