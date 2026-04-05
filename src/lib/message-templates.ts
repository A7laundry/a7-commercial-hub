// src/lib/message-templates.ts
// Central WhatsApp message templates with {name} and {service} interpolation

export type MessageTemplateType = "reactivation" | "follow_up" | "upsell" | "proposal" | "renewal"

export type MessageTemplate = {
  type: MessageTemplateType
  label: string
  emoji: string
  text: string
}

/** All variants per template type. Index 0 = formal (V1), 1 = casual (V2), 2 = brief (V3) */
export const MESSAGE_VARIANTS: Record<MessageTemplateType, MessageTemplate[]> = {
  reactivation: [
    {
      type: "reactivation",
      label: "Reativar contato",
      emoji: "💬",
      text: "Olá {name}! Tudo bem? Faz um tempo que não nos falamos. Gostaríamos de entender como podemos continuar apoiando {service} com nossos serviços de lavanderia. Podemos conversar?",
    },
    {
      type: "reactivation",
      label: "Reativar contato",
      emoji: "💬",
      text: "Oi {name}, sumiu né? 😅 Passando pra ver se tudo certo com {service} e se precisam de algo nosso",
    },
    {
      type: "reactivation",
      label: "Reativar contato",
      emoji: "💬",
      text: "Oi {name}! Retomando contato — algo que possamos resolver pra {service}?",
    },
  ],
  follow_up: [
    {
      type: "follow_up",
      label: "Follow-up",
      emoji: "📞",
      text: "Olá {name}! Passando para dar um oi e verificar se tem alguma novidade sobre nosso serviço. Fico à disposição para qualquer dúvida!",
    },
    {
      type: "follow_up",
      label: "Follow-up",
      emoji: "📞",
      text: "Oi {name}! Tudo certo por aí? Só passando pra checar se {service} tá precisando de algo 👋",
    },
    {
      type: "follow_up",
      label: "Follow-up",
      emoji: "📞",
      text: "{name}, alguma novidade? Qualquer coisa pode chamar",
    },
  ],
  upsell: [
    {
      type: "upsell",
      label: "Upsell",
      emoji: "💰",
      text: "Olá {name}! Considerando o volume que {service} já processa conosco, temos uma proposta especial que pode aumentar a eficiência e reduzir seus custos. Posso apresentar os detalhes?",
    },
    {
      type: "upsell",
      label: "Upsell",
      emoji: "💰",
      text: "Oi {name}! Vendo o volume que {service} usa, acho que dá pra melhorar bastante o custo-benefício. Topa uma conversa rápida?",
    },
    {
      type: "upsell",
      label: "Upsell",
      emoji: "💰",
      text: "{name}, temos uma proposta pra {service} que vale a pena ver. Quando posso mostrar?",
    },
  ],
  proposal: [
    {
      type: "proposal",
      label: "Enviar proposta",
      emoji: "📋",
      text: "Olá {name}! Conforme conversado, segue nossa proposta personalizada para {service}. Qualquer dúvida estou à disposição para esclarecer!",
    },
    {
      type: "proposal",
      label: "Enviar proposta",
      emoji: "📋",
      text: "Oi {name}! Preparei a proposta pra {service} — dá uma olhada e me fala o que acha 😊",
    },
    {
      type: "proposal",
      label: "Enviar proposta",
      emoji: "📋",
      text: "{name}, proposta pronta. Qualquer ajuste é só falar",
    },
  ],
  renewal: [
    {
      type: "renewal",
      label: "Renovação",
      emoji: "🔄",
      text: "Olá {name}! Seu contrato de serviços com a A7 Lavanderia está próximo do vencimento. Gostaria de conversar sobre a renovação? Posso preparar condições especiais para {service}.",
    },
    {
      type: "renewal",
      label: "Renovação",
      emoji: "🔄",
      text: "Oi {name}! O contrato de {service} tá quase no fim — bora renovar e garantir a continuidade? 🤝",
    },
    {
      type: "renewal",
      label: "Renovação",
      emoji: "🔄",
      text: "{name}, contrato vencendo em breve. Podemos renovar?",
    },
  ],
}

/** Backwards-compatible: points to V1 (index 0) for each type */
export const MESSAGE_TEMPLATES: Record<MessageTemplateType, MessageTemplate> = {
  reactivation: MESSAGE_VARIANTS.reactivation[0],
  follow_up:    MESSAGE_VARIANTS.follow_up[0],
  upsell:       MESSAGE_VARIANTS.upsell[0],
  proposal:     MESSAGE_VARIANTS.proposal[0],
  renewal:      MESSAGE_VARIANTS.renewal[0],
}

export function interpolateTemplate(template: string, vars: { name?: string | null; service?: string | null }): string {
  return template
    .replace(/\{name\}/g, vars.name ?? "cliente")
    .replace(/\{service\}/g, vars.service ?? "sua empresa")
}

export function getTemplate(type: MessageTemplateType): MessageTemplate {
  return MESSAGE_TEMPLATES[type]
}
