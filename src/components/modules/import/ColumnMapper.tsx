"use client"

import {
  CRM_FIELD_LABELS,
  type ColumnMapping,
  type CrmField,
} from "@/lib/import/column-detector"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle } from "lucide-react"

type Props = {
  headers: string[]
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
  sampleRows: Record<string, string>[]
}

const FIELD_ORDER: CrmField[] = [
  "name",
  "contact_name",
  "contact_email",
  "phone",
  "segment",
  "status",
  "estimated_value",
  "frequency",
  "last_contact_at",
  "notes",
]

export function ColumnMapper({ headers, mapping, onChange, sampleRows }: Props) {
  function update(field: CrmField, value: string | null) {
    onChange({ ...mapping, [field]: value === "__none__" || !value ? null : value })
  }

  const autoDetectedCount = Object.values(mapping).filter(Boolean).length
  const sample = sampleRows[0] ?? {}

  return (
    <div className="space-y-4">
      {/* Detection summary */}
      <div className="flex items-center gap-2 text-sm">
        {autoDetectedCount >= 3 ? (
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        )}
        <span>
          <strong>{autoDetectedCount} colunas</strong> detectadas automaticamente.
          {autoDetectedCount < 3 && " Verifique o mapeamento abaixo."}
        </span>
      </div>

      <div className="rounded-lg border divide-y">
        {FIELD_ORDER.map((field) => {
          const isRequired = field === "name"
          const currentCol = mapping[field]
          const preview = currentCol ? sample[currentCol] : null

          return (
            <div key={field} className="flex items-center gap-4 px-4 py-3">
              <div className="w-52 shrink-0">
                <p className="text-sm font-medium">
                  {CRM_FIELD_LABELS[field]}
                  {isRequired && (
                    <span className="ml-1 text-xs text-destructive">*</span>
                  )}
                </p>
                {preview && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                    Ex: {preview}
                  </p>
                )}
              </div>

              <Select
                value={currentCol ?? "__none__"}
                onValueChange={(v) => update(field, v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="— não importar —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— não importar —</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentCol && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  detectado
                </Badge>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        * Obrigatório. Os demais campos são opcionais e podem ser preenchidos depois no CRM.
      </p>
    </div>
  )
}
