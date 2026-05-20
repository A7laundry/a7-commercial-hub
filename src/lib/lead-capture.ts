/**
 * lead-capture.ts — Captura automática de leads novos via webhook WhatsApp
 *
 * Quando uma mensagem WA chega de um telefone SEM `phone_mapping`:
 *   1. Parseia a tag operacional `[#xxx-yyy]` da mensagem
 *   2. Resolve LP de origem via TAG_LOOKUP
 *   3. Resolve unidade A7 via PHONE_NUMBER_ID_TO_UNIT
 *   4. Cria Account (pipeline_stage='lead') + Deal (stage='new') +
 *      phone_mapping + account_timeline
 *
 * Garantias:
 *   - Idempotência: race condition tratada via unique constraint em
 *     phone_mappings(tenant_id, phone) — se conflito, reusa existente
 *   - Fallback elegante: tag inválida → registra raw + source='website-no-tag-match'
 *   - Multi-tenant: tenant_id sempre obrigatório
 *
 * Para adicionar nova LP/unidade:
 *   - LP nova: append em TAG_LOOKUP
 *   - Unidade nova: append em PHONE_NUMBER_ID_TO_UNIT
 *   - 1 commit, pronto
 */

import type { SupabaseClient } from "@supabase/supabase-js"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LpInfo {
  lp_url: string
  lp_label: string
  tipo: string
}

export interface UnitInfo {
  unit: string         // slug interno (ex: 'vila-adyana')
  city: string         // slug da cidade (ex: 'sao-jose-dos-campos')
  unit_label: string   // exibição (ex: 'SJC — Vila Adyana')
}

export interface CreateLeadResult {
  account_id: string
  is_new: boolean
  parsed_tag: string | null
  lp_info: LpInfo | null
  unit_info: UnitInfo | null
}

// ─── TAG_LOOKUP — Catálogo de prefixos `[#xxx-yyy]` → LP ──────────────────────
// Espelha docs/operacao/sheets-template/04-TAGS.csv (gerado em a7lavanderia.com.br)
// Convenção: prefix = "<slug>-<location>" → o lookup faz match por prefixo
// (ignora a parte do `<location>` no fim, ex: hero/sticky_bar/cta_final/...).

export const TAG_LOOKUP: Record<string, LpInfo> = {
  // ─── Home + global ──────────────────────────────────────────
  "home":                          { lp_url: "/",                                lp_label: "Home institucional",         tipo: "home" },
  "global":                        { lp_url: "qualquer",                         lp_label: "Botão flutuante global",     tipo: "float" },

  // ─── Cards de cidade na home ────────────────────────────────
  "cidades-sao-jose-dos-campos":   { lp_url: "/lp/sao-jose-dos-campos",          lp_label: "Card SJC (home)",            tipo: "card-home" },
  "cidades-jacarei":               { lp_url: "/lp/jacarei",                      lp_label: "Card Jacareí (home)",        tipo: "card-home" },
  "cidades-taubate":               { lp_url: "/lp/taubate",                      lp_label: "Card Taubaté (home)",        tipo: "card-home" },
  "cidades-dom-pedro":             { lp_url: "/lp/dom-pedro",                    lp_label: "Card Manaus (home)",         tipo: "card-home" },
  "cidades-mogi-das-cruzes":       { lp_url: "/lp/mogi-das-cruzes",              lp_label: "Card Mogi (home)",           tipo: "card-home" },
  "cidades-sao-paulo":             { lp_url: "/lp/sao-paulo",                    lp_label: "Card SP (home)",             tipo: "card-home" },

  // ─── LPs por cidade ─────────────────────────────────────────
  "sao-jose-dos-campos":           { lp_url: "/lp/sao-jose-dos-campos",          lp_label: "LP SJC",                     tipo: "lp-cidade" },
  "jacarei":                       { lp_url: "/lp/jacarei",                      lp_label: "LP Jacareí",                 tipo: "lp-cidade" },
  "taubate":                       { lp_url: "/lp/taubate",                      lp_label: "LP Taubaté",                 tipo: "lp-cidade" },
  "bosque-eucaliptos":             { lp_url: "/lp/bosque-eucaliptos",            lp_label: "LP Bosque Eucaliptos",       tipo: "lp-bairro" },
  "urbanova":                      { lp_url: "/lp/urbanova",                     lp_label: "LP Urbanova",                tipo: "lp-bairro" },
  "jardim-morumbi":                { lp_url: "/lp/jardim-morumbi",               lp_label: "LP Jardim Morumbi",          tipo: "lp-bairro" },
  "jardim-satelite":               { lp_url: "/lp/jardim-satelite",              lp_label: "LP Jardim Satélite",         tipo: "lp-bairro" },
  "dom-pedro":                     { lp_url: "/lp/dom-pedro",                    lp_label: "LP Manaus Dom Pedro",        tipo: "lp-cidade" },
  "mogi-das-cruzes":               { lp_url: "/lp/mogi-das-cruzes",              lp_label: "LP Mogi (delivery)",         tipo: "lp-cidade" },
  "sao-paulo":                     { lp_url: "/lp/sao-paulo",                    lp_label: "LP SP (delivery)",           tipo: "lp-cidade" },
  "empresas":                      { lp_url: "/lp/empresas",                     lp_label: "LP B2B Nacional",            tipo: "lp-b2b" },

  // ─── LPs serviço × cidade (Sofá) ────────────────────────────
  "sofa-sao-jose-dos-campos":      { lp_url: "/lp/sofa-sao-jose-dos-campos",     lp_label: "Sofá × SJC",                 tipo: "lp-serv-cidade" },
  "sofa-jacarei":                  { lp_url: "/lp/sofa-jacarei",                 lp_label: "Sofá × Jacareí",             tipo: "lp-serv-cidade" },
  "sofa-taubate":                  { lp_url: "/lp/sofa-taubate",                 lp_label: "Sofá × Taubaté",             tipo: "lp-serv-cidade" },
  "sofa-bosque-eucaliptos":        { lp_url: "/lp/sofa-bosque-eucaliptos",       lp_label: "Sofá × Bosque",              tipo: "lp-serv-bairro" },
  "sofa-urbanova":                 { lp_url: "/lp/sofa-urbanova",                lp_label: "Sofá × Urbanova",            tipo: "lp-serv-bairro" },
  "sofa-jardim-morumbi":           { lp_url: "/lp/sofa-jardim-morumbi",          lp_label: "Sofá × Morumbi",             tipo: "lp-serv-bairro" },
  "sofa-dom-pedro":                { lp_url: "/lp/sofa-dom-pedro",               lp_label: "Sofá × Manaus",              tipo: "lp-serv-cidade" },
  "sofa-mogi-das-cruzes":          { lp_url: "/lp/sofa-mogi-das-cruzes",         lp_label: "Sofá × Mogi",                tipo: "lp-serv-cidade" },
  "sofa-sao-paulo":                { lp_url: "/lp/sofa-sao-paulo",               lp_label: "Sofá × SP",                  tipo: "lp-serv-cidade" },

  // ─── LPs serviço × cidade (Tapete / Edredom / Tênis / Cortinas) ──────
  "tapete-sao-jose-dos-campos":    { lp_url: "/lp/tapete-sao-jose-dos-campos",   lp_label: "Tapete × SJC",               tipo: "lp-serv-cidade" },
  "tapete-jacarei":                { lp_url: "/lp/tapete-jacarei",               lp_label: "Tapete × Jacareí",           tipo: "lp-serv-cidade" },
  "tapete-taubate":                { lp_url: "/lp/tapete-taubate",               lp_label: "Tapete × Taubaté",           tipo: "lp-serv-cidade" },
  "edredom-sao-jose-dos-campos":   { lp_url: "/lp/edredom-sao-jose-dos-campos",  lp_label: "Edredom × SJC",              tipo: "lp-serv-cidade" },
  "edredom-jacarei":               { lp_url: "/lp/edredom-jacarei",              lp_label: "Edredom × Jacareí",          tipo: "lp-serv-cidade" },
  "edredom-taubate":               { lp_url: "/lp/edredom-taubate",              lp_label: "Edredom × Taubaté",          tipo: "lp-serv-cidade" },
  "tenis-sao-jose-dos-campos":     { lp_url: "/lp/tenis-sao-jose-dos-campos",    lp_label: "Tênis × SJC",                tipo: "lp-serv-cidade" },
  "tenis-jacarei":                 { lp_url: "/lp/tenis-jacarei",                lp_label: "Tênis × Jacareí",            tipo: "lp-serv-cidade" },
  "tenis-taubate":                 { lp_url: "/lp/tenis-taubate",                lp_label: "Tênis × Taubaté",            tipo: "lp-serv-cidade" },
  "cortinas-sao-jose-dos-campos":  { lp_url: "/lp/cortinas-sao-jose-dos-campos", lp_label: "Cortinas × SJC",             tipo: "lp-serv-cidade" },

  // ─── Páginas institucionais de serviço ──────────────────────
  "servico-roupas":                { lp_url: "/servicos/roupas",                 lp_label: "Roupas (BOFU)",              tipo: "servico" },
  "servico-sofas":                 { lp_url: "/servicos/sofas",                  lp_label: "Sofás (BOFU)",               tipo: "servico" },
  "servico-tapetes":               { lp_url: "/servicos/tapetes",                lp_label: "Tapetes (BOFU)",             tipo: "servico" },
  "servico-edredom":               { lp_url: "/servicos/edredom",                lp_label: "Edredom (BOFU)",             tipo: "servico" },
  "servico-cortinas":              { lp_url: "/servicos/cortinas",               lp_label: "Cortinas (BOFU)",            tipo: "servico" },
  "servico-tenis":                 { lp_url: "/servicos/tenis",                  lp_label: "Tênis (BOFU)",               tipo: "servico" },
  "servico-uniformes":             { lp_url: "/servicos/uniformes",              lp_label: "Uniformes B2B (BOFU)",       tipo: "servico" },
}

// ─── PHONE_NUMBER_ID_TO_UNIT — Mapa Meta phone_number_id → unidade A7 ────────
// Atualizar com IDs reais do Meta Business (cada unidade tem 1 phone_number_id).
// Como descobrir: Meta Business Manager → WhatsApp → Phone Numbers → copy ID.
// Enquanto vazio: lead cai com unit=null, source='website-whatsapp', operador
// classifica manualmente.

export const PHONE_NUMBER_ID_TO_UNIT: Record<string, UnitInfo> = {
  // Exemplos (substituir pelos IDs reais quando souber):
  // "123456789012345": { unit: "vila-adyana",       city: "sao-jose-dos-campos", unit_label: "SJC — Vila Adyana (Central)" },
  // "234567890123456": { unit: "bosque-eucaliptos", city: "sao-jose-dos-campos", unit_label: "SJC — Bosque dos Eucaliptos" },
  // "345678901234567": { unit: "urbanova",          city: "sao-jose-dos-campos", unit_label: "SJC — Urbanova" },
  // "456789012345678": { unit: "jardim-morumbi",    city: "sao-jose-dos-campos", unit_label: "SJC — Jardim Morumbi" },
  // "567890123456789": { unit: "vila-branca",       city: "jacarei",             unit_label: "Jacareí — Vila Branca" },
  // "678901234567890": { unit: "esplanada",         city: "taubate",             unit_label: "Taubaté — Esplanada" },
  // "789012345678901": { unit: "dom-pedro",         city: "manaus",              unit_label: "Manaus — Dom Pedro" },
}

// ─── DISPLAY_PHONE_TO_UNIT — Fallback por número visível ─────────────────────
// Quando Meta envia `metadata.display_phone_number` (formato '5512974128390').
// Mesmo mapeamento do `src/lib/wa.ts` no a7lavanderia.com.br.

export const DISPLAY_PHONE_TO_UNIT: Record<string, UnitInfo> = {
  "5512974128390":  { unit: "vila-adyana",       city: "sao-jose-dos-campos", unit_label: "SJC — Vila Adyana (Central)" },
  "551239174807":   { unit: "bosque-eucaliptos", city: "sao-jose-dos-campos", unit_label: "SJC — Bosque dos Eucaliptos" },
  "551233466490":   { unit: "urbanova",          city: "sao-jose-dos-campos", unit_label: "SJC — Urbanova" },
  "551233075748":   { unit: "jardim-morumbi",    city: "sao-jose-dos-campos", unit_label: "SJC — Jardim Morumbi" },
  "551239585006":   { unit: "vila-branca",       city: "jacarei",             unit_label: "Jacareí — Vila Branca" },
  "5512981778142":  { unit: "esplanada",         city: "taubate",             unit_label: "Taubaté — Esplanada" },
  "5592981154947":  { unit: "dom-pedro",         city: "manaus",              unit_label: "Manaus — Dom Pedro" },
}

// ─── Parsers / Resolvers ──────────────────────────────────────────────────────

const TAG_REGEX = /\[#([a-z0-9_-]+)\]/i

/**
 * Extrai a tag operacional do texto da mensagem.
 * Retorna o conteúdo entre `[#` e `]`, ou null se não houver match.
 *
 * Aceita:  `[#sofa-sjc-hero]` → 'sofa-sjc-hero'
 *          `[#home-hero]`     → 'home-hero'
 *          `[#GLOBAL-FLOAT]`  → 'GLOBAL-FLOAT'  (case preservada)
 */
export function parseTagFromMessage(text: string): string | null {
  if (!text) return null
  const match = text.match(TAG_REGEX)
  return match?.[1] ?? null
}

/**
 * Dada a tag completa `<slug>-<location>`, busca o slug-prefix mais específico
 * no TAG_LOOKUP. Estratégia: tenta a tag inteira primeiro; depois remove o
 * último segmento `-xxx` e tenta de novo, até achar ou esgotar.
 *
 * Ex: 'sofa-sao-jose-dos-campos-hero'
 *  → tenta 'sofa-sao-jose-dos-campos-hero'  (não está no lookup)
 *  → tenta 'sofa-sao-jose-dos-campos'       ✓ match
 */
export function resolveLpInfoByTag(tag: string | null): LpInfo | null {
  if (!tag) return null
  const normalized = tag.toLowerCase()
  const parts = normalized.split("-")
  while (parts.length > 0) {
    const candidate = parts.join("-")
    if (TAG_LOOKUP[candidate]) return TAG_LOOKUP[candidate]
    parts.pop()
  }
  return null
}

/**
 * Resolve a unidade A7 que recebeu o lead, tentando 2 fontes:
 *   1. phone_number_id (preferido — vem sempre do Meta webhook)
 *   2. display_phone_number (fallback — também vem do Meta na metadata)
 */
export function resolveUnitInfo(
  phoneNumberId: string | null | undefined,
  displayPhone: string | null | undefined
): UnitInfo | null {
  if (phoneNumberId && PHONE_NUMBER_ID_TO_UNIT[phoneNumberId]) {
    return PHONE_NUMBER_ID_TO_UNIT[phoneNumberId]
  }
  if (displayPhone) {
    const normalized = displayPhone.replace(/\D/g, "")
    if (DISPLAY_PHONE_TO_UNIT[normalized]) {
      return DISPLAY_PHONE_TO_UNIT[normalized]
    }
  }
  return null
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  admin:            SupabaseClient
  tenant_id:        string
  sender_phone:     string           // telefone do lead (msg.from)
  first_message:    string
  message_timestamp: string          // ISO timestamp
  phone_number_id:  string | null    // Meta phone_number_id que recebeu
  display_phone:    string | null    // Meta display_phone_number
}

/**
 * Cria Account + Deal + phone_mapping + timeline pra um lead novo.
 * Idempotente: se phone_mapping já existir (race), retorna account existente.
 *
 * Esta função NÃO insere a mensagem em `whatsapp_messages` — o caller
 * (`handleMetaWebhook`) faz isso depois com o account_id retornado.
 */
export async function createLeadFromWebhook(
  input: CreateLeadInput
): Promise<CreateLeadResult> {
  const { admin, tenant_id, sender_phone, first_message, message_timestamp,
          phone_number_id, display_phone } = input

  // 1. Parse tag + resolve LP + resolve unit
  const parsedTag = parseTagFromMessage(first_message)
  const lpInfo    = resolveLpInfoByTag(parsedTag)
  const unitInfo  = resolveUnitInfo(phone_number_id, display_phone)

  // 2. Decide source baseado no que conseguiu identificar
  //    - 'website-whatsapp'         : tag válida identificada
  //    - 'website-no-tag-match'     : tem tag mas não bateu no LOOKUP
  //    - 'website-no-tag'           : mensagem sem tag (direto, GMB, IG, etc.)
  const source =
    !parsedTag       ? "website-no-tag"        :
    !lpInfo          ? "website-no-tag-match"  :
                       "website-whatsapp"

  // 3. Race-safe: tenta criar phone_mapping primeiro com unique constraint.
  //    Se outro webhook já criou o mapping (race), recupera e reusa o account.
  const provisionalName = `Lead WA — ${sender_phone}`
  const tagsArray = parsedTag ? [parsedTag] : ["website-no-tag"]

  // 3a. Cria account novo (placeholder — phone_mapping garante unicidade depois)
  const { data: newAccount, error: accError } = await admin
    .from("accounts")
    .insert({
      tenant_id,
      name: provisionalName,
      status: "prospect",
      pipeline_stage: "lead",
      commercial_status: "active",
      client_type: "pf",
      source,
      tags: tagsArray,
      unit: unitInfo?.unit ?? null,
      in_pipeline: true,
      last_contact_at: message_timestamp,
      next_action: "Qualificar: cidade, serviço, prazo",
      notes: buildLeadNotes({ parsedTag, lpInfo, unitInfo, first_message, sender_phone }),
    })
    .select("id")
    .single<{ id: string }>()

  if (accError || !newAccount) {
    throw new Error(`createLeadFromWebhook: falha ao criar account — ${accError?.message ?? "no row"}`)
  }

  // 3b. Tenta inserir phone_mapping. Se conflito (outro webhook ganhou a race),
  //     remove o account recém-criado e usa o que já existe.
  const { error: mappingError } = await admin
    .from("phone_mappings")
    .insert({
      tenant_id,
      phone: sender_phone,
      account_id: newAccount.id,
      source: "auto",
    })

  if (mappingError) {
    // Possível conflito (lead simultâneo) — busca o account existente e
    // descarta o que acabamos de criar.
    const { data: existing } = await admin
      .from("phone_mappings")
      .select("account_id")
      .eq("tenant_id", tenant_id)
      .eq("phone", sender_phone)
      .maybeSingle()

    if (existing?.account_id) {
      // Rollback: deleta o account placeholder criado
      await admin.from("accounts").delete().eq("id", newAccount.id).eq("tenant_id", tenant_id)
      return {
        account_id: existing.account_id,
        is_new: false,
        parsed_tag: parsedTag,
        lp_info: lpInfo,
        unit_info: unitInfo,
      }
    }
    // Outro erro: propaga
    throw new Error(`createLeadFromWebhook: falha ao criar phone_mapping — ${mappingError.message}`)
  }

  // 4. Cria Deal vinculado
  const dealTitle = lpInfo
    ? `Lead ${lpInfo.lp_label}`
    : parsedTag
      ? `Lead WA (tag não mapeada: ${parsedTag})`
      : `Lead WA (sem tag)`

  await admin
    .from("deals")
    .insert({
      tenant_id,
      account_id: newAccount.id,
      title: dealTitle,
      stage: "new",
      notes: `Lead chegou via WhatsApp · primeira msg: "${truncate(first_message, 120)}"`,
    })

  // 5. Timeline event — visibilidade pro operador
  await admin
    .from("account_timeline")
    .insert({
      tenant_id,
      account_id: newAccount.id,
      event_type: "lead_created",
      summary: lpInfo
        ? `Novo lead via ${lpInfo.lp_label}`
        : parsedTag
          ? `Novo lead via WhatsApp (tag: ${parsedTag})`
          : "Novo lead via WhatsApp (sem tag)",
      metadata: {
        source,
        raw_tag: parsedTag,
        lp_url: lpInfo?.lp_url ?? null,
        lp_label: lpInfo?.lp_label ?? null,
        unit: unitInfo?.unit ?? null,
        unit_label: unitInfo?.unit_label ?? null,
        city: unitInfo?.city ?? null,
        sender_phone,
        first_message: truncate(first_message, 500),
        phone_number_id,
        display_phone,
      },
    })

  return {
    account_id: newAccount.id,
    is_new: true,
    parsed_tag: parsedTag,
    lp_info: lpInfo,
    unit_info: unitInfo,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (!s) return ""
  return s.length > max ? s.slice(0, max - 1) + "…" : s
}

function buildLeadNotes(args: {
  parsedTag: string | null
  lpInfo: LpInfo | null
  unitInfo: UnitInfo | null
  first_message: string
  sender_phone: string
}): string {
  const lines: string[] = []
  if (args.lpInfo) {
    lines.push(`Origem: ${args.lpInfo.lp_label} (${args.lpInfo.lp_url})`)
  } else if (args.parsedTag) {
    lines.push(`Tag (não mapeada): ${args.parsedTag}`)
  } else {
    lines.push(`Origem: WhatsApp sem tag (direto / GMB / IG / indicação)`)
  }
  if (args.unitInfo) {
    lines.push(`Unidade que atendeu: ${args.unitInfo.unit_label}`)
  }
  lines.push(`Telefone do lead: ${args.sender_phone}`)
  lines.push(`Primeira mensagem: "${truncate(args.first_message, 300)}"`)
  return lines.join("\n")
}
