"use client"

import { useEffect, useState, useRef } from "react"

// ── Live counter hook ────────────────────────────────────────────────────────
function useLiveCounter(base: number, variance: number, intervalMs: number) {
  const [value, setValue] = useState(base)
  useEffect(() => {
    // Animate in on mount
    let current = Math.max(0, base - Math.floor(variance * 1.5))
    const step = Math.ceil((base - current) / 24)
    const ramp = setInterval(() => {
      current = Math.min(base, current + step)
      setValue(current)
      if (current >= base) clearInterval(ramp)
    }, 40)

    // Fluctuate after mount
    const drift = setTimeout(() => {
      const live = setInterval(() => {
        const delta = Math.floor((Math.random() - 0.35) * variance)
        setValue((v) => Math.max(0, v + delta))
      }, intervalMs + Math.random() * 800)
      return () => clearInterval(live)
    }, 1200)

    return () => {
      clearInterval(ramp)
      clearTimeout(drift)
    }
  }, [base, variance, intervalMs])
  return value
}

// ── WhatsApp pulse ring ──────────────────────────────────────────────────────
function WaPulse({
  style,
  delay = 0,
  size = 32,
}: {
  style: React.CSSProperties
  delay?: number
  size?: number
}) {
  return (
    <div className="absolute pointer-events-none" style={style}>
      {/* Icon glow base */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(37,211,102,0.25)",
          boxShadow: "0 0 12px 4px rgba(37,211,102,0.3)",
          animation: `waPulseCore 2.8s ease-in-out ${delay}s infinite`,
        }}
      />
      {/* Outer ring 1 */}
      <div
        style={{
          position: "absolute",
          inset: -size * 0.4,
          borderRadius: "50%",
          border: "1.5px solid rgba(37,211,102,0.5)",
          animation: `waPulseRing 2.8s ease-out ${delay}s infinite`,
        }}
      />
      {/* Outer ring 2 */}
      <div
        style={{
          position: "absolute",
          inset: -size * 0.9,
          borderRadius: "50%",
          border: "1px solid rgba(37,211,102,0.25)",
          animation: `waPulseRing 2.8s ease-out ${delay + 0.4}s infinite`,
        }}
      />
    </div>
  )
}

// ── Floating counter badge ───────────────────────────────────────────────────
function LiveBadge({
  base,
  variance,
  interval,
  style,
  delay = 0,
  prefix = "",
  color = "#22D3EE",
}: {
  base: number
  variance: number
  interval: number
  style: React.CSSProperties
  delay?: number
  prefix?: string
  color?: string
}) {
  const value = useLiveCounter(base, variance, interval)
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        ...style,
        animation: `badgeFloat 4s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        style={{
          background: "rgba(8,12,20,0.72)",
          backdropFilter: "blur(8px)",
          border: `1px solid ${color}40`,
          borderRadius: "8px",
          padding: "3px 8px",
          boxShadow: `0 0 12px ${color}30, 0 2px 8px rgba(0,0,0,0.4)`,
          display: "flex",
          alignItems: "center",
          gap: "5px",
          whiteSpace: "nowrap",
        }}
      >
        {/* Dot */}
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
            boxShadow: `0 0 6px ${color}`,
            animation: "dotBlink 1.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            color,
            letterSpacing: "-0.02em",
            minWidth: "28px",
            textAlign: "right",
          }}
        >
          {prefix}{value}
        </span>
      </div>
    </div>
  )
}

// ── Energy beam SVG ──────────────────────────────────────────────────────────
function EnergyBeam() {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Main beam gradient */}
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#EF4444" stopOpacity="0" />
          <stop offset="20%"  stopColor="#F97316" stopOpacity="0.7" />
          <stop offset="50%"  stopColor="#22D3EE" stopOpacity="1" />
          <stop offset="80%"  stopColor="#3B82F6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </linearGradient>

        {/* Particle glow */}
        <radialGradient id="particleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#22D3EE" stopOpacity="1" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-500%" width="200%" height="1100%">
          <feGaussianBlur stdDeviation="0.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Stronger glow for core */}
        <filter id="coreGlow" x="-100%" y="-1000%" width="300%" height="2100%">
          <feGaussianBlur stdDeviation="0.25" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main arc — chaos to control */}
      {/* Outer glow */}
      <path
        d="M 20,52 C 32,48 38,46 50,44 C 62,42 68,46 80,50"
        stroke="#22D3EE"
        strokeWidth="0.8"
        fill="none"
        strokeOpacity="0.25"
        filter="url(#glow)"
      >
        <animate attributeName="stroke-dasharray" values="0,200;80,120;0,200" dur="3s" repeatCount="indefinite" />
        <animate attributeName="stroke-dashoffset" values="0;-200" dur="3s" repeatCount="indefinite" />
      </path>

      {/* Core beam */}
      <path
        d="M 20,52 C 32,48 38,46 50,44 C 62,42 68,46 80,50"
        stroke="url(#beamGrad)"
        strokeWidth="0.25"
        fill="none"
        filter="url(#coreGlow)"
      >
        <animate attributeName="stroke-dasharray" values="0,200;60,140;0,200" dur="3s" repeatCount="indefinite" />
        <animate attributeName="stroke-dashoffset" values="0;-200" dur="3s" repeatCount="indefinite" />
      </path>

      {/* Second arc — slight variation */}
      <path
        d="M 22,56 C 34,52 40,54 50,50 C 60,46 66,44 78,46"
        stroke="#6366F1"
        strokeWidth="0.2"
        fill="none"
        strokeOpacity="0.5"
      >
        <animate attributeName="stroke-dasharray" values="0,200;50,150;0,200" dur="4.2s" repeatCount="indefinite" begin="1.1s" />
        <animate attributeName="stroke-dashoffset" values="0;-200" dur="4.2s" repeatCount="indefinite" begin="1.1s" />
      </path>

      {/* Spark particles along beam */}
      {[
        { cx: 30, cy: 50, r: 0.5, dur: "3s", begin: "0s" },
        { cx: 42, cy: 46, r: 0.6, dur: "3s", begin: "0.6s" },
        { cx: 50, cy: 44, r: 0.7, dur: "3s", begin: "1.0s" },
        { cx: 60, cy: 43, r: 0.5, dur: "3s", begin: "1.5s" },
        { cx: 70, cy: 47, r: 0.5, dur: "3s", begin: "2.0s" },
      ].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#22D3EE" filter="url(#particleGlow)">
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur={p.dur}
            begin={p.begin}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values={`${p.r * 0.3};${p.r};${p.r * 0.3}`}
            dur={p.dur}
            begin={p.begin}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* Branch spark — diagonal */}
      <path
        d="M 50,44 L 53,38 L 55,35"
        stroke="#22D3EE"
        strokeWidth="0.15"
        fill="none"
        strokeOpacity="0.6"
      >
        <animate attributeName="opacity" values="0;0;1;0;0" dur="5s" repeatCount="indefinite" begin="1.5s" />
      </path>

      {/* Branch spark — other direction */}
      <path
        d="M 42,46 L 39,42 L 37,40"
        stroke="#F97316"
        strokeWidth="0.12"
        fill="none"
        strokeOpacity="0.5"
      >
        <animate attributeName="opacity" values="0;0;1;0;0" dur="6s" repeatCount="indefinite" begin="2.8s" />
      </path>
    </svg>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function HeroEffects() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <>
      <style>{`
        @keyframes waPulseCore {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes waPulseRing {
          0%   { opacity: 0.8; transform: scale(0.7); }
          70%  { opacity: 0;   transform: scale(1.8); }
          100% { opacity: 0;   transform: scale(2.0); }
        }
        @keyframes badgeFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      {/* ── WhatsApp pulses — calibrated to the icons in the image ── */}
      <WaPulse style={{ left: "18%", top: "38%", transform: "translate(-50%,-50%)" }} size={28} delay={0} />
      <WaPulse style={{ left: "13%", top: "55%", transform: "translate(-50%,-50%)" }} size={22} delay={0.9} />
      <WaPulse style={{ left: "26%", top: "30%", transform: "translate(-50%,-50%)" }} size={20} delay={1.6} />
      <WaPulse style={{ left: "34%", top: "62%", transform: "translate(-50%,-50%)" }} size={18} delay={0.4} />

      {/* ── Live counters — números da imagem com vida ── */}
      <LiveBadge
        base={746}  variance={12} interval={1800}
        style={{ left: "36%", top: "18%", transform: "translate(-50%,-50%)" }}
        color="#22D3EE" delay={0}
      />
      <LiveBadge
        base={384}  variance={8}  interval={2200}
        style={{ left: "41%", top: "70%", transform: "translate(-50%,-50%)" }}
        color="#22C55E" delay={0.5}
      />
      <LiveBadge
        base={990}  variance={15} interval={1500}
        style={{ left: "44%", top: "48%", transform: "translate(-50%,-50%)" }}
        color="#F5A623" delay={1.2}
      />
      <LiveBadge
        base={75}   variance={5}  interval={2800}
        style={{ left: "59%", top: "22%", transform: "translate(-50%,-50%)" }}
        color="#A78BFA" delay={0.8}
      />
      <LiveBadge
        base={431}  variance={10} interval={2000}
        style={{ left: "65%", top: "32%", transform: "translate(-50%,-50%)" }}
        color="#F472B6" delay={1.8}
      />

      {/* ── Energy beam SVG ── */}
      <EnergyBeam />
    </>
  )
}
