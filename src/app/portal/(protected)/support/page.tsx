"use client"

import { usePortalSession } from "@/components/providers/PortalProvider"
import { MessageCircle, Phone, Mail, Clock } from "lucide-react"

export default function PortalSupportPage() {
  const { account, tenant } = usePortalSession()

  const whatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? ""
  const whatsappMessage = encodeURIComponent(`Olá! Sou da empresa ${account.name} e preciso de suporte.`)
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${whatsappMessage}`
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Suporte</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Entre em contato com a {tenant.name}.</p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-base font-semibold mb-1">Fale conosco pelo WhatsApp</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Atendimento rápido e direto com nossa equipe comercial.
        </p>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Abrir WhatsApp
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Número de suporte não configurado. Contate o administrador.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Clock,   title: "Horário de atendimento", description: "Segunda a sexta, 8h às 18h" },
          { icon: Phone,   title: "Telefone",                description: whatsappNumber || "Consulte seu contrato" },
          { icon: Mail,    title: "Email",                   description: "Verifique seu contrato para o email de suporte" },
        ].map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-card border rounded-lg p-4 text-center">
            <Icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        ))}
      </div>

      <div className="bg-muted/40 rounded-lg p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados da sua conta</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Empresa</p><p className="font-medium mt-0.5">{account.name}</p></div>
          {account.contact_name && <div><p className="text-xs text-muted-foreground">Contato</p><p className="font-medium mt-0.5">{account.contact_name}</p></div>}
          {account.contact_email && <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium mt-0.5">{account.contact_email}</p></div>}
          {account.segment && <div><p className="text-xs text-muted-foreground">Segmento</p><p className="font-medium mt-0.5">{account.segment}</p></div>}
        </div>
      </div>
    </div>
  )
}
