// src/lib/message-templates.ts
// Central WhatsApp message templates with {name} and {service} interpolation

export type MessageTemplateType = "reactivation" | "follow_up" | "upsell" | "proposal" | "renewal"

export type MessageTemplate = {
  type: MessageTemplateType
  label: string
  emoji: string
  text: string
}

export const MESSAGE_TEMPLATES: Record<MessageTemplateType, MessageTemplate> = {
  reactivation: {
    type: "reactivation",
    label: "Reativar contato",
    emoji: "💬",
    text: "Olá {name}! Tudo bem? Faz um tempo que não nos falamos. Gostaríamos de entender como podemos continuar apoiando {service} com nossos serviços de lavanderia. Podemos conversar?",
  },
  follow_up: {
    type: "follow_up",
    label: "Follow-up",
    emoji: "📞",
    text: "Olá {name}! Passando para dar um oi e verificar se tem alguma novidade sobre nosso serviço. Fico à disposição para qualquer dúvida!",
  },
  upsell: {
    type: "upsell",
    label: "Upsell",
    emoji: "💰",
    text: "Olá {name}! Considerando o volume que {service} já processa conosco, temos uma proposta especial que pode aumentar a eficiência e reduzir seus custos. Posso apresentar os detalhes?",
  },
  proposal: {
    type: "proposal",
    label: "Enviar proposta",
    emoji: "📋",
    text: "Olá {name}! Conforme conversado, segue nossa proposta personalizada para {service}. Qualquer dúvida estou à disposição para esclarecer!",
  },
  renewal: {
    type: "renewal",
    label: "Renovação",
    emoji: "🔄",
    text: "Olá {name}! Seu contrato de serviços com a A7 Lavanderia está próximo do vencimento. Gostaria de conversar sobre a renovação? Posso preparar condições especiais para {service}.",
  },
}

export function interpolateTemplate(template: string, vars: { name?: string | null; service?: string | null }): string {
  return template
    .replace(/\{name\}/g, vars.name ?? "cliente")
    .replace(/\{service\}/g, vars.service ?? "sua empresa")
}

export function getTemplate(type: MessageTemplateType): MessageTemplate {
  return MESSAGE_TEMPLATES[type]
}
