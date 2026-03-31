"use client"

import { useState, useTransition } from "react"
import { FileDropzone } from "@/components/modules/import/FileDropzone"
import { ColumnMapper } from "@/components/modules/import/ColumnMapper"
import { DataPreview } from "@/components/modules/import/DataPreview"
import { ImportSummary } from "@/components/modules/import/ImportSummary"
import { detectColumns, type ColumnMapping } from "@/lib/import/column-detector"
import { processRows, type RawRow, type ImportRow } from "@/lib/import/normalizer"
import { analyzeRows, buildSummary, type ImportSummaryStats } from "@/lib/import/intelligence-analyzer"
import { batchImportAccounts, type BatchImportResult } from "./actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Upload, Settings, Eye, CheckCircle, ChevronRight, Loader2 } from "lucide-react"

type Step = 0 | 1 | 2 | 3

const STEPS = [
  { label: "Upload",    icon: Upload },
  { label: "Mapeamento", icon: Settings },
  { label: "Prévia",    icon: Eye },
  { label: "Importar",  icon: CheckCircle },
]

export default function ImportPage() {
  const [step, setStep] = useState<Step>(0)

  // File data
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [fileName, setFileName] = useState("")

  // Processed data
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null, contact_name: null, contact_email: null, phone: null,
    segment: null, status: null, estimated_value: null, frequency: null,
    last_contact_at: null, notes: null,
  })
  const [processedRows, setProcessedRows] = useState<ImportRow[]>([])
  const [stats, setStats] = useState<ImportSummaryStats | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  // Import result
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleParsed(h: string[], rows: RawRow[], name: string) {
    setHeaders(h)
    setRawRows(rows)
    setFileName(name)
    setMapping(detectColumns(h))
  }

  function handleMappingConfirm() {
    const processed = processRows(rawRows, mapping)
    const analyzed = analyzeRows(processed)
    const summary = buildSummary(analyzed)
    setProcessedRows(analyzed)
    setStats(summary)
    setStep(2)
  }

  function handleImport() {
    startTransition(async () => {
      const result = await batchImportAccounts(processedRows, { skipDuplicates })
      setImportResult(result)
      setStep(3)
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">Importar base de clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Carregue um arquivo CSV ou Excel e transforme dados brutos em inteligência comercial.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isDone = i < step
          const isActive = i === step
          return (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                isDone ? "bg-primary/20 text-primary" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-3 h-3" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className={cn("w-4 h-4", isDone ? "text-primary/50" : "text-muted-foreground/30")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="bg-card border rounded-xl p-6">
        {step === 0 && (
          <div className="space-y-6">
            <FileDropzone onParsed={handleParsed} />

            {rawRows.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{rawRows.length}</strong> linhas detectadas em{" "}
                  <strong className="text-foreground">{fileName}</strong> ·{" "}
                  {headers.length} colunas
                </div>
                <Button onClick={() => setStep(1)} className="gap-2">
                  Mapear colunas
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <ColumnMapper
              headers={headers}
              mapping={mapping}
              onChange={setMapping}
              sampleRows={rawRows.slice(0, 3)}
            />
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(0)}>Voltar</Button>
              <Button
                onClick={handleMappingConfirm}
                disabled={!mapping.name}
                className="gap-2"
              >
                Analisar dados
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && stats && (
          <div className="space-y-6">
            <DataPreview
              rows={processedRows}
              stats={stats}
              skipDuplicates={skipDuplicates}
              onSkipDuplicatesChange={setSkipDuplicates}
            />
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {skipDuplicates
                    ? `${stats.unique} contas serão importadas`
                    : `${processedRows.length} registros serão importados`}
                </p>
                <Button onClick={handleImport} disabled={isPending} className="gap-2">
                  {isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Importando...</>
                  ) : (
                    <>Confirmar importação <CheckCircle className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && importResult && stats && (
          <ImportSummary importResult={importResult} stats={stats} />
        )}
      </div>
    </div>
  )
}
