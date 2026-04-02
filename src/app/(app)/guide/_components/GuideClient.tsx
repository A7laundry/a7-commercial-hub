"use client"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  MessageCircle, TrendingUp, Sparkles, Reply,
  LayoutDashboard, Zap, Send, RefreshCw,
  Users, Megaphone, CalendarCheck,
  AlertTriangle, CheckCircle2, Circle,
  ChevronRight, Clock,
} from "lucide-react"

const SECTIONS = [
  { n: 1, label: "Bem-vindo" },
  { n: 2, label: "Como funciona" },
  { n: 3, label: "Rotina diária" },
  { n: 4, label: "Telas principais" },
  { n: 5, label: "Atender clientes" },
  { n: 6, label: "Vender mais" },
  { n: 7, label: "Erros comuns" },
  { n: 8, label: "Primeira ação" },
]

// ── Section components ────────────────────────────────────────────────────────

function S1Welcome({ scrollTo }: { scrollTo: (n: number) => void }) {
  return (
    <div id="section-1" className="scroll-mt-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 md:p-12 flex flex-col items-start gap-4">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/20 text-white px-3 py-1 rounded-full">
        <Clock className="w-3 h-3" /> Leitura de 5 min
      </span>
      <span className="text-5xl">🚀</span>
      <h1 className="text-2xl md:text-3xl font-bold">Suas vendas organizadas em um só lugar</h1>
      <p className="text-blue-100 text-sm md:text-base max-w-[480px]">
        Atenda clientes, envie mensagens e acompanhe resultados — tudo pelo celular.
      </p>
      <Button
        className="bg-white text-blue-700 hover:bg-blue-50 font-semibold mt-2"
        onClick={() => scrollTo(2)}
      >
        Começar agora
      </Button>
      <p className="text-xs text-blue-200">Simples de usar. Rápido de aprender.</p>
    </div>
  )
}

function S2HowItWorks() {
  const steps = [
    { icon: MessageCircle, title: "Cliente chega", desc: "Um novo contato entra e o sistema já registra tudo automaticamente." },
    { icon: Reply, title: "Você atende", desc: "Abra a conversa, veja o histórico e responda pelo WhatsApp direto aqui." },
    { icon: Sparkles, title: "Sistema sugere", desc: "O CRM indica a melhor mensagem para cada momento do cliente." },
    { icon: TrendingUp, title: "Você vende", desc: "Avance o cliente no pipeline e feche mais negócios com menos esforço." },
  ]

  return (
    <div id="section-2" className="scroll-mt-4 bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Como funciona</h2>
        <p className="text-sm text-muted-foreground mt-1">4 passos simples para começar</p>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0">
        {steps.map(({ icon: Icon, title, desc }, idx) => (
          <React.Fragment key={title}>
            <div className="flex md:flex-col items-start md:items-center gap-3 md:gap-2 flex-1">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                {idx + 1}
              </div>
              <Icon className="w-5 h-5 text-blue-500 md:hidden lg:block" />
              <div className="md:text-center">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="hidden md:block w-5 h-5 text-gray-300 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function S3DailyRoutine() {
  const routineItems = [
    { icon: LayoutDashboard, timeHint: "☀️ Ao amanhecer", action: "Abrir o Dashboard", desc: "Veja o resumo do dia e saiba exatamente onde focar a energia." },
    { icon: Zap, timeHint: "🔔 Logo cedo", action: "Verificar ações urgentes", desc: "Clientes esperando resposta aparecem em destaque — não deixe ninguém esperando." },
    { icon: Send, timeHint: "💬 A qualquer hora", action: "Enviar mensagens", desc: "Use as Campanhas para alcançar vários clientes de uma vez, sem esforço." },
    { icon: RefreshCw, timeHint: "✅ Antes de fechar", action: "Atualizar clientes", desc: "Mova cada cliente para a etapa certa no pipeline e durma tranquilo." },
  ]

  return (
    <div id="section-3" className="scroll-mt-4 bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Sua rotina em 4 passos</h2>
        <p className="text-sm text-muted-foreground mt-1">Menos de 20 minutos por dia já fazem diferença.</p>
      </div>
      <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
        {routineItems.map(({ icon: Icon, timeHint, action, desc }) => (
          <div key={action} className="relative flex items-start gap-4">
            <div className="absolute -left-8 mt-1 w-4 h-4 rounded-full bg-white border-2 border-green-500" />
            <div className="shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Icon className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 pb-1">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">{timeHint}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{action}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function S4MainScreens() {
  const screens = [
    { icon: LayoutDashboard, name: "Dashboard", desc: "Veja o panorama do dia e as ações que pedem atenção agora.", href: "/dashboard", bg: "bg-blue-100", color: "text-blue-600" },
    { icon: Users, name: "Clientes", desc: "Todos os seus contatos organizados, com histórico e WhatsApp em um clique.", href: "/accounts", bg: "bg-green-100", color: "text-green-600" },
    { icon: MessageCircle, name: "Inbox", desc: "Todas as mensagens do WhatsApp em um só lugar, sem perder nenhuma.", href: "/inbox", bg: "bg-purple-100", color: "text-purple-600" },
    { icon: Megaphone, name: "Campanhas", desc: "Envie mensagens para vários clientes ao mesmo tempo com poucos cliques.", href: "/campaigns", bg: "bg-amber-100", color: "text-amber-600" },
    { icon: CalendarCheck, name: "Desempenho", desc: "Acompanhe os resultados do dia e veja o que está funcionando.", href: "/dashboard/daily", bg: "bg-orange-100", color: "text-orange-600" },
  ]

  return (
    <div id="section-4" className="scroll-mt-4 bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">5 telas, tudo que você precisa</h2>
        <p className="text-sm text-muted-foreground mt-1">Cada tela tem uma função clara. Sem complicação.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {screens.map(({ icon: Icon, name, desc, href, bg, color }, idx) => (
          <Link
            key={name}
            href={href}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors group",
              idx === screens.length - 1 ? "sm:col-span-2" : ""
            )}
          >
            <div className={cn("shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
            </div>
            <span className="shrink-0 text-xs text-blue-600 font-medium group-hover:underline mt-0.5">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function S5ServingClient() {
  const attendSteps = [
    { title: "Abrir o cliente", desc: "Acesse a tela Clientes e toque no nome do contato. Todas as informações aparecem ali." },
    { title: "Ver a sugestão do sistema", desc: "O CRM indica o que dizer com base no histórico. Você não precisa adivinhar." },
    { title: "Enviar a mensagem", desc: "Aprove a sugestão ou edite à vontade. A mensagem vai direto pelo WhatsApp." },
    { title: "Continuar a conversa", desc: "As respostas chegam no Inbox. Acompanhe tudo sem sair do sistema." },
    { title: "Atualizar o pipeline", desc: "Depois do atendimento, mova o cliente para a próxima etapa. Isso mantém tudo organizado." },
  ]

  return (
    <div id="section-5" className="scroll-mt-4 bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Atendendo um cliente passo a passo</h2>
        <p className="text-sm text-muted-foreground mt-1">Da primeira mensagem até o fechamento — veja como é simples.</p>
      </div>
      <div className="space-y-4">
        {attendSteps.map(({ title, desc }, idx) => (
          <div key={title} className="flex items-start gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
              {idx + 1}
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function S6SellMore() {
  const tips = [
    { emoji: "⚡", title: "Resposta rápida", desc: "Quem responde primeiro vende mais — use o Inbox para não perder nenhuma mensagem.", bg: "bg-green-50" },
    { emoji: "🔁", title: "Follow-up", desc: "Se o cliente não respondeu, o sistema lembra você de entrar em contato de novo.", bg: "bg-blue-50" },
    { emoji: "⬆️", title: "Upsell", desc: "Clientes que já compraram estão prontos para ouvir uma nova oferta — use as Campanhas.", bg: "bg-amber-50" },
    { emoji: "💤", title: "Reativação", desc: "Tem cliente sumido? Mande uma mensagem pelo Campanhas e traga ele de volta.", bg: "bg-purple-50" },
  ]

  return (
    <div id="section-6" className="scroll-mt-4 bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">4 hábitos que aumentam suas vendas</h2>
        <p className="text-sm text-muted-foreground mt-1">Pequenas ações, grandes resultados.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tips.map(({ emoji, title, desc, bg }) => (
          <div key={title} className={cn("rounded-xl p-4 space-y-1.5", bg)}>
            <span className="text-2xl">{emoji}</span>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function S7CommonMistakes() {
  const mistakes = [
    { title: "Não responder", consequence: "Cliente sem resposta vai embora — e às vezes não volta mais." },
    { title: "Não atualizar o pipeline", consequence: "Sem atualização, você perde o controle de quem está perto de fechar." },
    { title: "Ignorar follow-ups", consequence: "Follow-up esquecido é venda perdida. O sistema avisa — você só precisa agir." },
  ]

  return (
    <div id="section-7" className="scroll-mt-4 bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Evite esses 3 erros</h2>
        <p className="text-sm text-muted-foreground mt-1">São fáceis de cometer e fáceis de evitar.</p>
      </div>
      <div className="space-y-3">
        {mistakes.map(({ title, consequence }) => (
          <div key={title} className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">{title}</p>
              <p className="text-xs text-red-600 mt-0.5">{consequence}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function S8FirstAction() {
  return (
    <div id="section-8" className="scroll-mt-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white p-8 md:p-12 flex flex-col items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-white" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold">Pronto para começar?</h2>
      <p className="text-green-100 text-sm max-w-[480px]">
        Abra a tela de Clientes e veja quem está esperando por você. O primeiro passo é o mais importante.
      </p>
      <Link
        href="/accounts"
        className={cn(buttonVariants({ variant: "default" }), "bg-white text-green-700 hover:bg-green-50 font-semibold")}
      >
        Ir para clientes
      </Link>
      <Link
        href="/dashboard"
        className="text-sm text-green-100 underline underline-offset-2 hover:text-white transition-colors"
      >
        Ver dashboard
      </Link>
      <p className="text-xs text-green-200 mt-2">
        Você já está na frente. A maioria das empresas ainda usa caderno.
      </p>
    </div>
  )
}

// ── Nav components ────────────────────────────────────────────────────────────

function GuideNav({
  activeSection,
  seenSections,
  scrollToSection,
}: {
  activeSection: number
  seenSections: Set<number>
  scrollToSection: (n: number) => void
}) {
  return (
    <nav className="hidden md:flex flex-col sticky top-8 self-start w-[200px] shrink-0">
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-1">
        <p className="text-xs text-muted-foreground font-medium mb-3 px-2">
          <span className="text-green-600 font-semibold">{seenSections.size}</span> de 8 seções
        </p>
        {SECTIONS.map(({ n, label }) => (
          <button
            key={n}
            className={cn(
              "w-full text-left text-sm px-3 py-2 rounded-lg flex items-center gap-2 transition-colors",
              activeSection === n
                ? "border-l-4 border-green-500 font-semibold text-green-700 bg-green-50 pl-2"
                : "text-muted-foreground hover:bg-gray-50 hover:text-gray-900"
            )}
            onClick={() => scrollToSection(n)}
          >
            {seenSections.has(n) && n !== activeSection
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              : <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            }
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function MobilePills({
  activeSection,
  scrollToSection,
}: {
  activeSection: number
  scrollToSection: (n: number) => void
}) {
  return (
    <div className="md:hidden overflow-x-auto flex gap-2 pb-2 mb-6 [&::-webkit-scrollbar]:hidden">
      {SECTIONS.map(({ n, label }) => (
        <button
          key={n}
          className={cn(
            "shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap",
            activeSection === n
              ? "bg-green-600 text-white border-green-600"
              : "bg-white text-muted-foreground border-gray-200"
          )}
          onClick={() => scrollToSection(n)}
        >
          {n}. {label}
        </button>
      ))}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function GuideClient() {
  const [activeSection, setActiveSection] = useState<number>(1)
  const [seenSections, setSeenSections] = useState<Set<number>>(new Set([1]))

  useEffect(() => {
    localStorage.setItem("guide_seen", "true")
  }, [])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    for (let i = 1; i <= 8; i++) {
      const el = document.getElementById(`section-${i}`)
      if (!el) continue

      const n = i
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(n)
              setSeenSections((prev) => new Set([...prev, n]))
            }
          })
        },
        { threshold: 0.3 }
      )
      observer.observe(el)
      observers.push(observer)
    }

    return () => {
      observers.forEach((o) => o.disconnect())
    }
  }, [])

  function scrollToSection(n: number) {
    document.getElementById(`section-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop side nav */}
      <div className="hidden md:block p-8 pr-0">
        <GuideNav
          activeSection={activeSection}
          seenSections={seenSections}
          scrollToSection={scrollToSection}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 py-8 px-4 md:px-8">
        {/* Mobile pills */}
        <MobilePills activeSection={activeSection} scrollToSection={scrollToSection} />

        {/* Content area */}
        <div className="max-w-[700px] mx-auto space-y-10">
          <S1Welcome scrollTo={scrollToSection} />
          <S2HowItWorks />
          <S3DailyRoutine />
          <S4MainScreens />
          <S5ServingClient />
          <S6SellMore />
          <S7CommonMistakes />
          <S8FirstAction />
        </div>
      </div>
    </div>
  )
}
