/**
 * Column detector — maps raw spreadsheet headers to CRM schema fields.
 * Pattern-matches common Portuguese and English column names.
 */

export type CrmField =
  | "name"
  | "contact_name"
  | "contact_email"
  | "phone"
  | "segment"
  | "status"
  | "estimated_value"
  | "frequency"
  | "last_contact_at"
  | "notes"

export type ColumnMapping = Record<CrmField, string | null>

const PATTERNS: Record<CrmField, RegExp> = {
  name: /^(nome\s*empresa|razão\s*social|empresa|company|client\w*|cliente|nome\s*cliente|conta|account|customer)$/i,
  contact_name: /^(nome\s*contato|contato|contact|responsável|responsavel|pessoa|atendente|representante)$/i,
  contact_email: /^(email|e-mail|correio\s*eletrônico|mail)$/i,
  phone: /^(telefone|fone|whatsapp|celular|phone|mobile|cel|tel|contato\s*tel)$/i,
  segment: /^(segmento|segment|setor|sector|tipo|type|categoria|category|ramo|ramo\s*atividade)$/i,
  status: /^(status|situação|situacao|ativo|estado|state|condição|condicao)$/i,
  estimated_value: /^(valor|value|preço|preco|price|mensalidade|faturamento|receita|revenue|ticket)$/i,
  frequency: /^(frequência|frequencia|frequency|periodicidade|recorrência|recorrencia|periodo|intervalo)$/i,
  last_contact_at: /^(ultimo\s*contato|último\s*contato|last\s*contact|data\s*contato|contato\s*data|atualização|atualizacao)$/i,
  notes: /^(obs|observação|observacao|notes|nota|comentário|comentario|anotação|anotacao|detalhe|info\w*)$/i,
}

/** Auto-detect mapping from array of header strings */
export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    contact_name: null,
    contact_email: null,
    phone: null,
    segment: null,
    status: null,
    estimated_value: null,
    frequency: null,
    last_contact_at: null,
    notes: null,
  }

  const used = new Set<string>()

  for (const [field, pattern] of Object.entries(PATTERNS) as [CrmField, RegExp][]) {
    for (const header of headers) {
      if (!used.has(header) && pattern.test(header.trim())) {
        mapping[field] = header
        used.add(header)
        break
      }
    }
  }

  // Fallback: if no name detected, use first unmapped column
  if (!mapping.name && headers.length > 0) {
    const first = headers.find((h) => !used.has(h))
    if (first) mapping.name = first
  }

  return mapping
}

export const CRM_FIELD_LABELS: Record<CrmField, string> = {
  name: "Nome da empresa / cliente *",
  contact_name: "Nome do contato",
  contact_email: "Email",
  phone: "Telefone / WhatsApp",
  segment: "Segmento",
  status: "Status",
  estimated_value: "Valor estimado (R$)",
  frequency: "Frequência",
  last_contact_at: "Último contato",
  notes: "Observações",
}
