import Image from "next/image"
import Link from "next/link"
import { HeroEffects } from "@/components/landing/HeroEffects"

export const metadata = {
  title: "A7 Comercial — CRM Comercial para Lavanderias",
  description:
    "Gerencie sua carteira, automatize o atendimento no WhatsApp e dispare campanhas. Venda mais sem aumentar o time.",
}

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ fontFamily: "'DM Sans', sans-serif", background: "#080C14" }}
    >
      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(8, 12, 20, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          A7<span style={{ color: "#3B82F6" }}>.</span>
        </span>
        <div className="flex items-center gap-8">
          <Link
            href="#como-funciona"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Como funciona
          </Link>
          <Link
            href="#depoimentos"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Depoimentos
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-all"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              color: "#fff",
            }}
          >
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* HERO — FULL SCREEN */}
      <section className="relative w-full overflow-hidden" style={{ height: "100svh", minHeight: "640px" }}>

        {/* Background image — Ken Burns alive loop */}
        <div className="absolute inset-0 hero-shimmer">
          <Image
            src="/1775536225050.jpg"
            alt="Caos vs Controle — A7 Comercial"
            fill
            priority
            sizes="100vw"
            className="hero-bg-img object-cover object-center"
          />
        </div>

        {/* Dark overlay — garante legibilidade do texto */}
        <div
          className="hero-overlay absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,12,20,0.55) 0%, rgba(8,12,20,0.45) 35%, rgba(8,12,20,0.65) 75%, #080C14 100%)",
          }}
        />
        {/* Radial escuro centrado — reforça contraste onde o texto está */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(8,12,20,0.45) 0%, transparent 70%)",
          }}
        />
        {/* Side vignettes */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(8,12,20,0.55) 0%, transparent 25%, transparent 75%, rgba(8,12,20,0.55) 100%)",
          }}
        />
        {/* Glow ciano — harmoniza com neon da imagem */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 52% 52%, rgba(34,211,238,0.07) 0%, rgba(59,130,246,0.06) 50%, transparent 75%)",
          }}
        />

        {/* Efeitos animados sobre a imagem */}
        <HeroEffects />

        {/* Content — centered, full impact */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6" style={{ paddingTop: "80px" }}>

          {/* Pill badge */}
          <div
            className="hero-text-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8"
            style={{
              background: "rgba(59,130,246,0.15)",
              color: "#60A5FA",
              border: "1px solid rgba(59,130,246,0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            CRM Comercial para Lavanderias
          </div>

          {/* Headline — massive */}
          <h1
            className="hero-text-2 font-black leading-[1.0] mb-6 max-w-5xl"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(3rem, 7vw, 6.5rem)",
              letterSpacing: "-0.04em",
              textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.7), 0 8px 48px rgba(0,0,0,0.5)",
            }}
          >
            Quantos clientes você
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #60A5FA 50%, #3B82F6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              perdeu sem saber?
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="hero-text-3 text-xl leading-relaxed mb-10 max-w-xl"
            style={{
              color: "rgba(255,255,255,0.92)",
              textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7)",
            }}
          >
            O A7 organiza sua carteira, centraliza o WhatsApp da equipe
            e dispara campanhas para os clientes certos.
            <br />
            <strong style={{ color: "#fff" }}>Venda mais. Sem aumentar o time.</strong>
          </p>

          {/* CTAs */}
          <div className="hero-text-4 flex items-center gap-4 flex-wrap justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:opacity-95"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
                boxShadow: "0 8px 40px rgba(59,130,246,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
                color: "#fff",
              }}
            >
              Começar grátis por 15 dias
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="#como-funciona"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl font-semibold text-base transition-all hover:scale-105"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                color: "#fff",
              }}
            >
              Ver como funciona →
            </Link>
          </div>

          {/* Microcopy */}
          <p className="hero-text-5 text-sm mt-5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Sem cartão de crédito. Sem compromisso.
          </p>

          {/* Scroll cue */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
              <rect x="5" y="1" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M4 17l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      {/* TENSION — REALITY MIRROR */}
      <section style={{ background: "#0C1120" }} className="py-28">
        <div className="max-w-5xl mx-auto px-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-6"
            style={{ color: "#F5A623" }}
          >
            O Diagnóstico
          </p>
          <h2
            className="font-bold mb-5 leading-tight"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
              letterSpacing: "-0.025em",
            }}
          >
            Seu time atende. Mas não existe processo.
            <br />
            Você cresce. Mas não sabe o porquê.
          </h2>
          <p
            className="text-lg mb-16 mx-auto"
            style={{ color: "#64748B", maxWidth: "540px" }}
          >
            Sem CRM, sem pipeline, sem histórico de cliente — cada venda depende
            da memória de alguém. Isso tem um custo invisível, todo dia.
          </p>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <path
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
                iconColor: "#EF4444",
                title: "WhatsApp sem controle",
                body: "Cada vendedor atende pelo próprio celular. Sem histórico, sem atribuição, sem visibilidade do que está sendo prometido.",
              },
              {
                icon: (
                  <path
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
                iconColor: "#F5A623",
                title: "Clientes sumindo em silêncio",
                body: "Você não sabe qual cliente parou de comprar. Não tem alerta. Não tem fila de reativação. Descobre quando é tarde.",
              },
              {
                icon: (
                  <path
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ),
                iconColor: "#3B82F6",
                title: "Sem pipeline de vendas",
                body: "Quantos deals abertos você tem hoje? Qual o valor total? Qual a taxa de conversão? Se você não sabe, o problema é esse.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-6 text-left"
                style={{
                  background: "#111827",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${item.iconColor}18` }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ color: item.iconColor }}
                  >
                    {item.icon}
                  </svg>
                </div>
                <h3
                  className="font-semibold text-white mb-2"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEFORE vs AFTER */}
      <section style={{ background: "#080C14" }} className="py-28">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#F5A623" }}
            >
              A Transformação
            </p>
            <h2
              className="font-bold leading-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              O mesmo time. Resultado completamente diferente.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* ANTES */}
            <div
              className="rounded-2xl p-8"
              style={{
                background:
                  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(15,18,30,0.9) 100%)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.15)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="#EF4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ color: "#EF4444" }}
                >
                  Antes
                </span>
              </div>
              <ul className="flex flex-col gap-5">
                {[
                  "Carteira de clientes no Excel ou na memória",
                  "WhatsApp pessoal misturado com o comercial",
                  "Sem pipeline — não sabe quantos deals estão abertos",
                  "Campanhas disparadas manualmente, sem segmentação",
                  "Cliente some e você descobre semanas depois",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(239,68,68,0.15)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M18 6L6 18M6 6l12 12"
                          stroke="#EF4444"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* COM A7 */}
            <div
              className="rounded-2xl p-8"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(15,18,30,0.9) 100%)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(59,130,246,0.15)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ color: "#3B82F6" }}
                >
                  Com A7
                </span>
              </div>
              <ul className="flex flex-col gap-5">
                {[
                  "CRM com histórico completo de cada cliente",
                  "Inbox de WhatsApp com atribuição e status da equipe",
                  "Pipeline de deals com conversão e valor em tempo real",
                  "Campanhas segmentadas com um clique",
                  "Alertas automáticos de clientes em risco de churn",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(59,130,246,0.15)" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17l-5-5"
                          stroke="#3B82F6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="como-funciona"
        style={{ background: "#0C1120" }}
        className="py-28"
      >
        <div className="max-w-5xl mx-auto px-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-4"
            style={{ color: "#F5A623" }}
          >
            Como funciona
          </p>
          <h2
            className="font-bold mb-20"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            Três passos para dominar sua carteira.
          </h2>

          <div className="grid grid-cols-3 gap-8">
            {[
              {
                n: "01",
                title: "Importe sua carteira",
                body: "Cadastre seus clientes e conecte o WhatsApp da equipe. Onboarding guiado, sem precisar de TI.",
              },
              {
                n: "02",
                title: "O sistema te diz o que fazer",
                body: "Fila de ações priorizadas, alertas de churn, contratos vencendo — você sempre sabe quem ligar hoje.",
              },
              {
                n: "03",
                title: "Dispare, feche e repita",
                body: "Campanhas de WhatsApp segmentadas, deals no pipeline, conversão rastreada. Venda com método.",
              },
            ].map((step, i) => (
              <div key={step.n} className="relative text-left">
                {i < 2 && (
                  <div
                    className="absolute top-7 left-full w-full h-px"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(59,130,246,0.3), transparent)",
                    }}
                  />
                )}
                <div
                  className="text-6xl font-black mb-6 leading-none"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "rgba(59,130,246,0.15)",
                    letterSpacing: "-0.04em",
                  }}
                >
                  {step.n}
                </div>
                <h3
                  className="font-semibold text-white mb-3 text-lg"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD SHOWCASE */}
      <section style={{ background: "#080C14" }} className="py-28">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-12">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#F5A623" }}
            >
              O sistema
            </p>
            <h2
              className="font-bold"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              Visibilidade comercial total. Em tempo real.
            </h2>
          </div>

          {/* Full dashboard */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#0D1117",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 120px rgba(59,130,246,0.06)",
            }}
          >
            {/* Top bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                background: "#161B22",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5">
                {["#FF5F57", "#FFBD2E", "#28C840"].map((c) => (
                  <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: "#475569" }}>
                a7comercial.app — Visão Comercial
              </span>
              <div className="w-20" />
            </div>

            <div className="flex">
              {/* Sidebar */}
              <div
                className="flex flex-col gap-1 py-4 px-3"
                style={{
                  width: "56px",
                  background: "#0D1117",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {[
                  "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
                  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                  "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                  "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
                ].map((d, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: i === 0 ? "rgba(59,130,246,0.15)" : "transparent",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: i === 0 ? "#3B82F6" : "#374151" }}
                    >
                      <path
                        d={d}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-5">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Clientes ativos", value: "184", color: "#3B82F6", up: true },
                    { label: "Pipeline aberto", value: "R$ 47.200", color: "#22C55E", up: true },
                    { label: "Em risco de churn", value: "7", color: "#F5A623", up: false },
                    { label: "Taxa de conversão", value: "34%", color: "#A855F7", up: true },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="rounded-xl p-4"
                      style={{
                        background: "#111827",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <p className="text-xs mb-2" style={{ color: "#475569" }}>
                        {kpi.label}
                      </p>
                      <p
                        className="text-lg font-bold"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          color: kpi.color,
                        }}
                      >
                        {kpi.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div
                  className="rounded-xl p-4 mb-5"
                  style={{
                    background: "#111827",
                    border: "1px solid rgba(255,255,255,0.05)",
                    height: "120px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <p className="text-xs mb-3" style={{ color: "#475569" }}>
                    Faturamento semanal
                  </p>
                  <svg
                    viewBox="0 0 400 60"
                    style={{ width: "100%", height: "60px" }}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="chartGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,45 L57,38 L114,30 L171,35 L228,20 L285,15 L342,22 L400,10"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M0,45 L57,38 L114,30 L171,35 L228,20 L285,15 L342,22 L400,10 L400,60 L0,60 Z"
                      fill="url(#chartGrad)"
                    />
                  </svg>
                </div>

                {/* Mini kanban */}
                <div className="grid grid-cols-4 gap-3">
                  {["Prospecção", "Proposta", "Negociação", "Fechado"].map(
                    (col, i) => {
                      const colors = ["#6366F1", "#F5A623", "#3B82F6", "#22C55E"]
                      const counts = [5, 8, 3, 12]
                      return (
                        <div
                          key={col}
                          className="rounded-xl p-3"
                          style={{
                            background: "#111827",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: colors[i] }}
                              />
                              <span
                                className="text-xs font-medium"
                                style={{ color: "#94A3B8" }}
                              >
                                {col}
                              </span>
                            </div>
                            <span
                              className="text-xs font-bold"
                              style={{ color: colors[i] }}
                            >
                              {counts[i]}
                            </span>
                          </div>
                          <div
                            className="h-1 rounded-full"
                            style={{
                              background: `${colors[i]}22`,
                              position: "relative",
                            }}
                          >
                            <div
                              className="h-1 rounded-full"
                              style={{
                                background: colors[i],
                                width: `${(counts[i] / 12) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        id="depoimentos"
        style={{ background: "#0C1120" }}
        className="py-28"
      >
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#F5A623" }}
            >
              O que dizem os donos de lavanderia
            </p>
            <h2
              className="font-bold"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
                letterSpacing: "-0.025em",
              }}
            >
              Resultados reais. Palavras reais.
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                quote:
                  "A gente não sabia quais clientes estavam em risco. Com o A7, a fila de urgências aparece todo dia — meu time sabe exatamente quem ligar.",
                name: "Carlos Menezes",
                business: "Lavanderia Express — São Paulo, SP",
              },
              {
                quote:
                  "Antes cada vendedor atendia pelo próprio WhatsApp. Hoje tudo fica no inbox do A7, com histórico e atribuição. A gestão mudou completamente.",
                name: "Fernanda Rodrigues",
                business: "LavaMax — Belo Horizonte, MG",
              },
              {
                quote:
                  "Disparei uma campanha de reativação para 60 clientes inativos e fechei 11 contratos em 2 semanas. Nunca tinha conseguido isso antes.",
                name: "Roberto Santos",
                business: "CleanPro — Rio de Janeiro, RJ",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-7"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="text-4xl font-black mb-5 leading-none"
                  style={{
                    color: "#3B82F6",
                    fontFamily: "Georgia, serif",
                    opacity: 0.6,
                  }}
                >
                  &ldquo;
                </div>
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: "#CBD5E1" }}
                >
                  {t.quote}
                </p>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                    {t.business}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(59,130,246,0.15) 0%, transparent 70%), #080C14",
        }}
        className="py-32 text-center"
      >
        <div className="max-w-3xl mx-auto px-8">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-6"
            style={{ color: "#F5A623" }}
          >
            Sua decisão
          </p>
          <h2
            className="font-black leading-tight mb-3"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.03em",
              color: "#94A3B8",
            }}
          >
            Você pode continuar vendendo
            <br />
            na base do improviso.
          </h2>
          <h2
            className="font-black leading-tight mb-10"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #60A5FA, #3B82F6, #818CF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Ou começar a vender com método.
          </h2>

          <p className="text-base mb-8" style={{ color: "#64748B" }}>
            15 dias grátis. Sem cartão. Sua carteira organizada em minutos.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              boxShadow: "0 12px 40px rgba(59,130,246,0.4)",
            }}
          >
            Começar grátis agora
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <div
            className="flex items-center justify-center gap-6 mt-6 text-xs"
            style={{ color: "#334155" }}
          >
            <span>Sem contrato</span>
            <span style={{ color: "#1E293B" }}>·</span>
            <span>Cancele quando quiser</span>
            <span style={{ color: "#1E293B" }}>·</span>
            <span>Suporte incluso</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-8 px-8"
        style={{
          background: "#040710",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            A7<span style={{ color: "#3B82F6" }}>.</span>
          </span>
          <div className="flex items-center gap-6">
            {["Privacidade", "Termos", "Contato"].map((l) => (
              <Link
                key={l}
                href="#"
                className="text-xs transition-colors hover:text-white"
                style={{ color: "#334155" }}
              >
                {l}
              </Link>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#1E293B" }}>
            © 2025 A7 Comercial. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
