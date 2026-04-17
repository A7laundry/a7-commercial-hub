"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"

// ── Types ────────────────────────────────────────────────────────────────────

type Urgency = "urgent" | "high" | "normal"

const URGENCY_COLORS: Record<Urgency, { bg: string; text: string; border: string }> = {
  urgent: { bg: "rgba(239,68,68,0.15)",  text: "#F87171", border: "rgba(239,68,68,0.3)"  },
  high:   { bg: "rgba(245,158,11,0.12)", text: "#FBBF24", border: "rgba(245,158,11,0.3)" },
  normal: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA", border: "rgba(59,130,246,0.3)" },
}

// ── Mock data ────────────────────────────────────────────────────────────────

const BLIND_ROWS = [
  "Lavanderia Campos",
  "Maria Fernanda S.",
  "Têxtil Horizonte",
  "Casa do Uniforme",
  "Rouparia Central",
  "João Mendes ME",
]

const QUEUE_ROWS: { name: string; score: number; days: number; urgency: Urgency; label: string }[] = [
  { name: "Lavanderia Campos", score: 91, days: 47, urgency: "urgent", label: "Reativar cliente"  },
  { name: "Maria Fernanda S.", score: 78, days: 23, urgency: "high",   label: "Follow-up urgente" },
  { name: "Têxtil Horizonte",  score: 62, days: 12, urgency: "normal", label: "Enviar proposta"   },
]

// ── Animation variants ───────────────────────────────────────────────────────

const stagger: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MacBar({ title, live = false }: { title: string; live?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 14px",
        background: "#10131A",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}
    >
      {(live
        ? ["#FF5F57", "#FFBD2E", "#28C840"]
        : ["#FF5F5730", "#FFBD2E30", "#28C84030"]
      ).map((c, i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
      ))}
      <span style={{ fontSize: 10, color: live ? "#475569" : "#283040", marginLeft: 6, flex: 1 }}>
        {title}
      </span>
      {live && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            color: "#22C55E",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#22C55E",
              display: "inline-block",
              animation: "a7Pulse 2s ease-in-out infinite",
            }}
          />
          Ao vivo
        </span>
      )}
    </div>
  )
}

function BlindPanel() {
  return (
    <div style={{ opacity: 0.55, display: "flex", flexDirection: "column", height: "100%" }}>
      <MacBar title="planilha_clientes.xlsx" />
      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#374151",
            marginBottom: 10,
          }}
        >
          Clientes — sem dados
        </div>
        {/* Column headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 72px 52px",
            padding: "3px 8px",
            marginBottom: 3,
          }}
        >
          {["Nome", "Último contato", "Status"].map((h) => (
            <span key={h} style={{ fontSize: 9, color: "#374151", fontWeight: 600 }}>
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {BLIND_ROWS.map((name) => (
          <div
            key={name}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 72px 52px",
              alignItems: "center",
              padding: "7px 8px",
              borderRadius: 5,
              marginBottom: 2,
              background: "rgba(255,255,255,0.018)",
            }}
          >
            <span style={{ fontSize: 10, color: "#374151" }}>{name}</span>
            <span style={{ fontSize: 10, color: "#283040" }}>—</span>
            <div style={{ width: 34, height: 5, borderRadius: 3, background: "#1F2937" }} />
          </div>
        ))}
        {/* No alerts notice */}
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 7,
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.08)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 9, color: "#4B5563" }}>Nenhum alerta configurado</span>
        </div>
      </div>
    </div>
  )
}

function QueuePanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MacBar title="a7comercial.app — Minha Fila" live />
      <div style={{ padding: "14px 16px", flex: 1 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#64748B",
            }}
          >
            Minha Fila — Hoje
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              background: "rgba(239,68,68,0.15)",
              color: "#F87171",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            3 urgentes
          </span>
        </div>

        {/* Queue rows */}
        {QUEUE_ROWS.map((row, i) => {
          const c = URGENCY_COLORS[row.urgency]
          return (
            <motion.div
              key={row.name}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.3 + i * 0.18, duration: 0.38, ease: "easeOut" }}
              style={{
                padding: "9px 10px",
                borderRadius: 7,
                marginBottom: 5,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: "#E2E8F0" }}>
                  {row.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  Score {row.score}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 10, color: "#475569" }}>
                  Sem contato há{" "}
                  <strong style={{ color: "#94A3B8" }}>{row.days} dias</strong>
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(37,211,102,0.12)",
                    color: "#22C55E",
                    border: "1px solid rgba(37,211,102,0.2)",
                    cursor: "default",
                  }}
                >
                  WhatsApp ↗
                </span>
              </div>
            </motion.div>
          )
        })}

        {/* Score legend */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 12,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.015)",
          }}
        >
          {[
            { label: "Urgente", color: "#F87171" },
            { label: "Alto",    color: "#FBBF24" },
            { label: "Normal",  color: "#60A5FA" },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 9, color: "#475569" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main hero ────────────────────────────────────────────────────────────────

export function LandingHero() {
  return (
    <section
      className="relative w-full overflow-hidden flex flex-col items-center"
      style={{ minHeight: "100svh", background: "#080C14", paddingTop: "72px" }}
    >
      <style>{`
        @keyframes a7Pulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>

      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 50% 35%, black 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 50% 35%, black 30%, transparent 100%)",
        }}
      />

      {/* Center glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "500px",
          background:
            "radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── Copy block ── */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6 pt-14 pb-10"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Pill */}
        <motion.div variants={fadeUp}>
          <span
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-7"
            style={{
              background: "rgba(239,68,68,0.09)",
              color: "#F87171",
              border: "1px solid rgba(239,68,68,0.22)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#F87171",
                display: "inline-block",
                animation: "a7Pulse 2s ease-in-out infinite",
              }}
            />
            Churn invisível — o dinheiro que sai sem avisar
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="font-black leading-[1.05] mb-5"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(2.1rem, 4.2vw, 3.75rem)",
            letterSpacing: "-0.04em",
            color: "#fff",
            maxWidth: "680px",
          }}
        >
          Você está perdendo clientes{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #F87171 0%, #FB923C 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            agora mesmo.
          </span>
          <br />
          Você não sabe quais.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={fadeUp}
          className="text-lg mb-9"
          style={{
            color: "rgba(255,255,255,0.45)",
            maxWidth: "420px",
            lineHeight: 1.55,
          }}
        >
          O A7 vê quem está sumindo antes que seja tarde.
          <br />
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.95em" }}>
            Visibilidade total. Intervenção no momento certo.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 flex-wrap justify-center"
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.03] hover:opacity-95 active:scale-100"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              boxShadow: "0 8px 28px rgba(59,130,246,0.38)",
              color: "#fff",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Ver quem está em risco
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-base transition-all hover:scale-[1.03]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Como funciona →
          </Link>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-xs mt-4"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Sem cartão de crédito · 15 dias grátis
        </motion.p>
      </motion.div>

      {/* ── Split-screen visual ── */}
      <motion.div
        className="relative z-10 w-full px-6 pb-16"
        style={{ maxWidth: "960px", margin: "0 auto" }}
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Labels above panels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr",
            marginBottom: 8,
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#EF4444",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#EF4444",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Sem A7
            </span>
          </div>
          <div />
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#3B82F6",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              Com A7
            </span>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#3B82F6",
                boxShadow: "0 0 6px #3B82F6",
              }}
            />
          </div>
        </div>

        {/* Panel container */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr",
            background: "#0D1117",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow:
              "0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 80px rgba(59,130,246,0.05)",
            minHeight: "300px",
          }}
        >
          {/* LEFT */}
          <BlindPanel />

          {/* DIVIDER */}
          <div style={{ position: "relative", overflow: "visible" }}>
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
              style={{
                width: "1px",
                height: "100%",
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(59,130,246,0.7) 20%, rgba(59,130,246,0.7) 80%, transparent 100%)",
                boxShadow: "0 0 18px rgba(59,130,246,0.4)",
                transformOrigin: "top",
              }}
            />
            {/* VS badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.15, duration: 0.35, ease: "backOut" }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#080C14",
                border: "1px solid rgba(59,130,246,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
                fontWeight: 800,
                color: "#3B82F6",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.02em",
                boxShadow: "0 0 14px rgba(59,130,246,0.25)",
              }}
            >
              VS
            </motion.div>
          </div>

          {/* RIGHT */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.45 }}
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <QueuePanel />
          </motion.div>
        </div>

        {/* Bottom label */}
        <p
          className="text-center text-xs mt-5"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          Os mesmos clientes. Perspectivas completamente diferentes.
        </p>
      </motion.div>
    </section>
  )
}
