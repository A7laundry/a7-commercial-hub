/**
 * ai-copilot.ts — Sugestão de resposta WhatsApp via Anthropic API
 *
 * Copiloto NÃO autônomo: gera DRAFT que o operador revisa e envia.
 * Zero auto-resposta. Feature flag controla disponibilidade.
 *
 * Modelo padrão: claude-opus-4-7 (override via env AI_COPILOT_MODEL).
 * Pra produção com volume, recomenda-se claude-haiku-4-5 (10x mais barato,
 * latência menor, qualidade conversacional excelente).
 *
 * Prompt caching: SYSTEM_PROMPT é estável (~1500 tokens) → cache_control
 * ephemeral garante hit-rate alto após 1ª chamada.
 */

import Anthropic from "@anthropic-ai/sdk"
import { logger } from "./logger"

// ─── System prompt da A7 (estável — cacheado) ────────────────────────────────

const SYSTEM_PROMPT = `Você é o assistente comercial da A7 Lavanderia, ajudando o OPERADOR humano a responder leads no WhatsApp. Você NÃO envia mensagem — apenas sugere o que o operador escrever.

═══ PERSONA ═══
- Friendly mas direto, sem inflar palavras
- PT-BR informal, emoji moderado (NÃO exagerar)
- Tom de atendente real, não robô

═══ A7 LAVANDERIA ═══
- Rede operando desde 2015 no Vale do Paraíba + Manaus
- 7 unidades físicas + delivery (Mogi das Cruzes, São Paulo)
- Coleta e entrega no endereço sem custo extra
- Prazo padrão: 48h (delivery SP/Mogi: 5-7 dias)
- Avaliação 5.0 no Google
- Garantia: se não ficou bom, refazemos sem cobrar

═══ SERVIÇOS ═══
- Sofá (higienização no local, sem desmontar) — referência: 2L ~R$120, 3L ~R$160
- Tapete (úmida ou seco, por m²) — referência: ~R$15-25/m²
- Edredom (todos os tamanhos) — referência: solteiro ~R$49, casal ~R$59, king ~R$89
- Cortinas (voil, blackout, tecido pesado, por peso ou m²)
- Tênis (qualquer material, ~R$25-45/par)
- Roupas (lavagem comum, sociais, delicadas, por peça ou kg)
- Uniformes corporativos (B2B — plano mensal)

═══ ÁREAS ═══
- Unidades físicas: São José dos Campos (5 unidades), Jacareí, Taubaté, Manaus
- Delivery: Mogi das Cruzes, São Paulo (capital)
- B2B/empresas: atendimento nacional

═══ FLUXO DE QUALIFICAÇÃO (1º contato sem info) ═══
3 perguntas curtas:
1. Cidade/bairro do lead
2. Serviço específico + foto se possível
3. Quando precisa da coleta

═══ REGRAS DURAS ═══
- NUNCA invente valor exato — peça foto/medida pra orçamento preciso
- Valores aproximados estão OK como referência inicial
- SEMPRE confirme antes de "fechar" — agendamento é compromisso
- Pagamento: PIX, cartão (parcelado se necessário) ou dinheiro na entrega
- Se fora de área: ofereça delivery se viável, senão sugira procurar lavanderia local sem queimar marca

═══ QUANDO PASSAR PRO HUMANO (devolva resposta "[ESCALAR]") ═══
- Cliente pedindo desconto agressivo (>15%)
- Reclamação sobre serviço anterior
- Caso técnico complexo (mancha rara, peça de luxo, marca específica)
- Tom hostil ou cliente bravo
- Solicitação que envolve negociação de prazo/preço fora do padrão

═══ FORMATO DA RESPOSTA ═══
Sua resposta tem exatamente 2 partes, separadas por uma linha em branco:

[RACIONAL]: <explicação em ≤ 18 palavras pro operador entender por que essa abordagem>

<texto que o operador vai enviar — sem aspas, sem marcação, como se ele escrevesse no celular>

OU, se for caso de escalar:

[ESCALAR]: <motivo curto>

═══ EXEMPLO 1 — Lead novo com tag de sofá SJC ═══
[RACIONAL]: Lead novo via LP sofá SJC, manda 3 perguntas curtas pra qualificar antes de orçamento.

Oi! Sou da A7 🤝
Vou te ajudar agora.

Pra eu preparar seu orçamento:

1️⃣ Você é de qual bairro de SJC?
2️⃣ Qual o sofá — 2 lugares, 3 lugares, retrátil? (Pode mandar foto!)
3️⃣ Quando você gostaria de marcar a coleta?

═══ EXEMPLO 2 — Lead já qualificado, agora pedindo orçamento ═══
[RACIONAL]: Lead qualificado (sofá 3L SJC), dou referência aproximada + pede foto pra fechar valor.

Show! Pra sofá de 3 lugares, fica em torno de **R$ 160** com coleta e entrega em 48h.

Manda uma foto do sofá (com manchas, se tiver) pra eu travar o valor exato e te confirmar agendamento? 📸

═══ EXEMPLO 3 — Caso pra escalar ═══
[ESCALAR]: Cliente pedindo 30% de desconto + prazo de 24h. Fora do padrão — operador decide.`

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  direction: "inbound" | "outbound"
  text: string
  timestamp: string
}

export interface CopilotInput {
  /** Nome do account (pode ser placeholder "Lead WA — +5XX...") */
  account_name: string
  /** Stage atual do pipeline (lead/em_contato/proposta/sucesso/cliente/recorrente) */
  pipeline_stage: string
  /** Telefone do lead (pra contexto, não exposto) */
  lead_phone?: string | null
  /** Tag de origem capturada (ex: 'sofa-sao-jose-dos-campos-hero') */
  origin_tag?: string | null
  /** LP de origem resolvida (ex: 'Sofá × SJC') */
  origin_lp_label?: string | null
  /** Unidade que atendeu (ex: 'SJC — Vila Adyana') */
  unit_label?: string | null
  /** Cidade do lead (se já qualificado) */
  city?: string | null
  /** Bairro do lead (se já qualificado) */
  neighborhood?: string | null
  /** Serviço pedido (se já qualificado) */
  service?: string | null
  /** Volume estimado (ex: '1 sofá 3 lugares retrátil') */
  volume_estimate?: string | null
  /** Notes da account (contexto livre) */
  notes?: string | null
  /** Últimas mensagens da conversa (mais recente por último) */
  conversation: ConversationMessage[]
  /** Hint adicional do operador (opcional — "quero oferecer desconto", "confirmar valor", etc.) */
  operator_hint?: string | null
}

export interface CopilotResult {
  /** Texto pronto pra operador enviar (vazio se escalou) */
  draft: string
  /** Racional curto pro operador entender a abordagem */
  reasoning: string
  /** Se true, IA recomenda passar pro humano (não há draft) */
  escalate: boolean
  /** Motivo da escalação (se escalate=true) */
  escalate_reason?: string
  /** Métricas pra observabilidade */
  model_used: string
  tokens_input: number
  tokens_output: number
  cache_read_tokens: number
  cache_created_tokens: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildContextString(input: CopilotInput): string {
  const lines: string[] = []

  lines.push("═══ CONTEXTO DO LEAD ═══")
  lines.push(`Nome no sistema: ${input.account_name}`)
  lines.push(`Stage do pipeline: ${input.pipeline_stage}`)
  if (input.lead_phone) lines.push(`Telefone do lead: ${input.lead_phone}`)
  if (input.origin_lp_label) lines.push(`Origem (LP): ${input.origin_lp_label}`)
  if (input.origin_tag) lines.push(`Tag operacional: ${input.origin_tag}`)
  if (input.unit_label) lines.push(`Unidade que atende: ${input.unit_label}`)
  if (input.city) lines.push(`Cidade: ${input.city}`)
  if (input.neighborhood) lines.push(`Bairro: ${input.neighborhood}`)
  if (input.service) lines.push(`Serviço pedido: ${input.service}`)
  if (input.volume_estimate) lines.push(`Volume estimado: ${input.volume_estimate}`)
  if (input.notes) lines.push(`Notes da conta:\n${input.notes}`)

  if (input.conversation.length > 0) {
    lines.push("")
    lines.push("═══ ÚLTIMAS MENSAGENS ═══")
    for (const msg of input.conversation.slice(-10)) {
      const who = msg.direction === "inbound" ? "LEAD" : "OPERADOR"
      lines.push(`[${who} · ${msg.timestamp}]`)
      lines.push(msg.text)
      lines.push("")
    }
  } else {
    lines.push("")
    lines.push("═══ ÚLTIMAS MENSAGENS ═══")
    lines.push("(nenhuma conversa ainda — este será o primeiro contato)")
  }

  if (input.operator_hint) {
    lines.push("")
    lines.push("═══ HINT DO OPERADOR ═══")
    lines.push(input.operator_hint)
  }

  lines.push("")
  lines.push("═══ TAREFA ═══")
  lines.push("Gere a próxima mensagem do operador no formato definido (RACIONAL + texto, ou ESCALAR).")

  return lines.join("\n")
}

/**
 * Parser da resposta do modelo. Extrai [RACIONAL] + texto OU [ESCALAR] + motivo.
 */
function parseResponse(raw: string): { draft: string; reasoning: string; escalate: boolean; escalate_reason?: string } {
  const trimmed = raw.trim()

  // Caso ESCALAR
  const escalateMatch = trimmed.match(/^\[ESCALAR\]:\s*(.+)$/im)
  if (escalateMatch) {
    return {
      draft: "",
      reasoning: "",
      escalate: true,
      escalate_reason: escalateMatch[1].trim(),
    }
  }

  // Caso normal: [RACIONAL]: ...\n\n<texto>
  const racionalMatch = trimmed.match(/^\[RACIONAL\]:\s*([^\n]+)\n+([\s\S]+)$/i)
  if (racionalMatch) {
    return {
      draft: racionalMatch[2].trim(),
      reasoning: racionalMatch[1].trim(),
      escalate: false,
    }
  }

  // Fallback: usa tudo como draft, sem racional
  return {
    draft: trimmed,
    reasoning: "(modelo não forneceu racional explícito)",
    escalate: false,
  }
}

// ─── Função principal ────────────────────────────────────────────────────────

/**
 * Gera draft de resposta WhatsApp via Anthropic API.
 * Throws se ANTHROPIC_API_KEY não configurada ou se API retornar erro.
 */
export async function generateReplyDraft(input: CopilotInput): Promise<CopilotResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no ambiente")
  }

  const client = new Anthropic()
  const model = process.env.AI_COPILOT_MODEL || "claude-opus-4-7"

  const userMessage = buildContextString(input)

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: userMessage },
    ],
    thinking: { type: "disabled" },
  })

  // Extrai texto
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  const parsed = parseResponse(text)

  const result: CopilotResult = {
    ...parsed,
    model_used: response.model,
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    cache_read_tokens: response.usage.cache_read_input_tokens ?? 0,
    cache_created_tokens: response.usage.cache_creation_input_tokens ?? 0,
  }

  logger.info({
    event: "ai_copilot.draft.generated",
    status: "ok",
    metadata: {
      model: result.model_used,
      tokens_input: result.tokens_input,
      tokens_output: result.tokens_output,
      cache_read: result.cache_read_tokens,
      cache_created: result.cache_created_tokens,
      escalate: result.escalate,
      stage: input.pipeline_stage,
      origin_tag: input.origin_tag,
    },
  })

  return result
}
