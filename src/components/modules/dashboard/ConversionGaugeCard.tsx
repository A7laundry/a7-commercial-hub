"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ConversionGaugeCardProps {
  conversionRate: number
  isLoading?: boolean
}

/**
 * Semicircular gauge card for conversion rate.
 * Arc from left (0%) to right (100%). Needle points to the current rate.
 */
export function ConversionGaugeCard({ conversionRate, isLoading }: ConversionGaugeCardProps) {
  // SVG gauge geometry — viewBox 0 0 100 50, semicircle centered at (50,50)
  const R = 38
  const cx = 50
  const cy = 50

  // Convert percentage (0–100) to an angle along the semicircle.
  // 0% = 180° (left), 100% = 0° (right), mapped over π radians.
  const pct = Math.min(Math.max(conversionRate, 0), 100)
  const angleRad = Math.PI - (pct / 100) * Math.PI
  const needleX = cx + R * Math.cos(angleRad)
  const needleY = cy - R * Math.sin(angleRad)

  // Foreground arc: stroke-dasharray on the navy arc, length proportional to rate.
  // Full semicircle circumference = π * R ≈ 119.4
  const arcLen = Math.PI * R
  const filledLen = (pct / 100) * arcLen

  // Trend label — static "+2.4%" placeholder when rate > 0
  const trendLabel = pct > 0 ? "+2.4% vs mês anterior" : "sem dados"

  return (
    <Card className="shadow-[0_24px_40px_rgba(25,28,29,0.03)] border-transparent flex flex-col items-center justify-center text-center">
      <CardHeader className="pb-0 w-full text-center">
        <CardTitle className="text-base font-extrabold font-headline text-[#022448]">
          Taxa de Conversão
        </CardTitle>
        <p
          className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Média Geral
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-4">
        {isLoading ? (
          <div className="w-48 h-24 bg-muted rounded animate-pulse" />
        ) : (
          <>
            {/* Gauge SVG */}
            <div className="relative w-48 h-24 overflow-hidden" aria-hidden="true">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                {/* Background arc */}
                <path
                  d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                  fill="none"
                  stroke="#e1e3e4"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Foreground arc — navy, proportional to rate */}
                <path
                  d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
                  fill="none"
                  stroke="#022448"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${filledLen} ${arcLen}`}
                  strokeDashoffset={0}
                />
                {/* Needle — amber line from center to arc position */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={needleX}
                  y2={needleY}
                  stroke="#F5A623"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Pivot dot */}
                <circle cx={cx} cy={cy} r="3" fill="#F5A623" />
              </svg>
            </div>

            {/* Value */}
            <div className="mt-2" aria-label={`Taxa de conversão: ${pct}%`}>
              <span
                className="text-4xl font-extrabold text-[#022448]"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {pct.toFixed(1)}%
              </span>
              <p
                className="text-[10px] font-bold text-emerald-600 mt-1"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {trendLabel}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
