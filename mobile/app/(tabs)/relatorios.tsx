import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Typography, Spacing, Radius } from '../../src/tokens'

const { width: SCREEN_W } = Dimensions.get('window')

// ── Mock data ─────────────────────────────────────────────────────────────────
type Period = '7d' | '30d' | '90d'

const DATA: Record<Period, {
  kpis: { label: string; value: string; sub: string; up: boolean }[]
  funnel: { label: string; count: number; pct: number }[]
  bars: { label: string; value: number }[]
}> = {
  '7d': {
    kpis: [
      { label: 'Contratos novos', value: '3',        sub: '+1 vs semana ant.', up: true  },
      { label: 'Receita gerada',  value: 'R$ 8.400', sub: '+12%',              up: true  },
      { label: 'Deals fechados',  value: '2',        sub: '–1 vs semana ant.', up: false },
      { label: 'Taxa conversão',  value: '40%',      sub: '+5 pp',             up: true  },
    ],
    funnel: [
      { label: 'Leads',       count: 18, pct: 100 },
      { label: 'Propostas',   count: 10, pct: 56  },
      { label: 'Negociação',  count: 6,  pct: 33  },
      { label: 'Fechados',    count: 2,  pct: 11  },
    ],
    bars: [
      { label: 'Seg', value: 1 },
      { label: 'Ter', value: 3 },
      { label: 'Qua', value: 2 },
      { label: 'Qui', value: 5 },
      { label: 'Sex', value: 4 },
      { label: 'Sáb', value: 1 },
      { label: 'Dom', value: 0 },
    ],
  },
  '30d': {
    kpis: [
      { label: 'Contratos novos', value: '14',        sub: '+3 vs mês ant.',    up: true  },
      { label: 'Receita gerada',  value: 'R$ 38.200', sub: '+8%',               up: true  },
      { label: 'Deals fechados',  value: '9',         sub: '=  mês ant.',       up: true  },
      { label: 'Taxa conversão',  value: '35%',       sub: '–2 pp',             up: false },
    ],
    funnel: [
      { label: 'Leads',       count: 72,  pct: 100 },
      { label: 'Propostas',   count: 41,  pct: 57  },
      { label: 'Negociação',  count: 20,  pct: 28  },
      { label: 'Fechados',    count: 9,   pct: 13  },
    ],
    bars: [
      { label: 'S1', value: 8 },
      { label: 'S2', value: 12 },
      { label: 'S3', value: 7 },
      { label: 'S4', value: 11 },
    ],
  },
  '90d': {
    kpis: [
      { label: 'Contratos novos', value: '41',         sub: '+11 vs trim. ant.', up: true  },
      { label: 'Receita gerada',  value: 'R$ 112.500', sub: '+22%',              up: true  },
      { label: 'Deals fechados',  value: '28',         sub: '+6 vs trim. ant.',  up: true  },
      { label: 'Taxa conversão',  value: '38%',        sub: '+4 pp',             up: true  },
    ],
    funnel: [
      { label: 'Leads',       count: 210, pct: 100 },
      { label: 'Propostas',   count: 118, pct: 56  },
      { label: 'Negociação',  count: 55,  pct: 26  },
      { label: 'Fechados',    count: 28,  pct: 13  },
    ],
    bars: [
      { label: 'Jan', value: 12 },
      { label: 'Fev', value: 17 },
      { label: 'Mar', value: 19 },
    ],
  },
}

const BAR_MAX_H = 80

// ── Components ────────────────────────────────────────────────────────────────

function PeriodTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.periodTab, active && styles.periodTabActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.periodTabText, active && styles.periodTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function KpiCard({ label, value, sub, up }: { label: string; value: string; sub: string; up: boolean }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiSub, { color: up ? Colors.success : Colors.error }]}>{sub}</Text>
    </View>
  )
}

function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1)
  const barW = Math.max(24, (SCREEN_W - Spacing.xl * 2 - Spacing.lg * 2 - (bars.length - 1) * 8) / bars.length)
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.sectionTitle}>Atividade</Text>
      <View style={styles.barRow}>
        {bars.map((b) => {
          const h = Math.max(4, Math.round((b.value / max) * BAR_MAX_H))
          return (
            <View key={b.label} style={[styles.barWrapper, { width: barW }]}>
              <Text style={styles.barValue}>{b.value > 0 ? b.value : ''}</Text>
              <View style={[styles.bar, { height: h }]} />
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function FunnelSection({ funnel }: { funnel: { label: string; count: number; pct: number }[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Funil de vendas</Text>
      {funnel.map((step, i) => (
        <View key={step.label} style={styles.funnelRow}>
          <View style={styles.funnelLabelRow}>
            <Text style={styles.funnelLabel}>{step.label}</Text>
            <Text style={styles.funnelCount}>{step.count}</Text>
          </View>
          <View style={styles.funnelTrack}>
            <View style={[
              styles.funnelBar,
              { width: `${step.pct}%` as any },
              i === funnel.length - 1 && styles.funnelBarLast,
            ]} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function RelatoriosScreen() {
  const [period, setPeriod] = useState<Period>('30d')
  const data = DATA[period]

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[Colors.navyPrimary, Colors.navySecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Relatórios</Text>

        {/* Period selector */}
        <View style={styles.periodBar}>
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <PeriodTab key={p} label={p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'} active={period === p} onPress={() => setPeriod(p)} />
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          {data.kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </View>

        {/* Bar chart */}
        <BarChart bars={data.bars} />

        {/* Funnel */}
        <FunnelSection funnel={data.funnel} />

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  headerTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.white },

  periodBar: { flexDirection: 'row', gap: Spacing.xs, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, padding: 3 },
  periodTab: { flex: 1, paddingVertical: 6, borderRadius: Radius.sm, alignItems: 'center' },
  periodTabActive: { backgroundColor: Colors.amber },
  periodTabText: { fontFamily: Typography.fontBodySemiBold, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  periodTabTextActive: { color: Colors.navyPrimary },

  body: { padding: Spacing.xl, gap: Spacing.lg },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  kpiCard: {
    width: (SCREEN_W - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  kpiLabel: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.onSurfaceVariant },
  kpiValue: { fontFamily: Typography.fontHeadlineEB, fontSize: 20, color: Colors.navyPrimary, marginTop: 2 },
  kpiSub:   { fontFamily: Typography.fontBody, fontSize: 11 },

  chartContainer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: { fontFamily: Typography.fontBodySemiBold, fontSize: 13, color: Colors.navyPrimary, marginBottom: Spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: BAR_MAX_H + 32 },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.onSurfaceVariant, marginBottom: 2 },
  bar: { width: '100%', backgroundColor: Colors.amber, borderRadius: 4 },
  barLabel: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.onSurfaceVariant, marginTop: 4 },

  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  funnelRow: { marginBottom: Spacing.sm },
  funnelLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  funnelLabel: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.onSurface },
  funnelCount: { fontFamily: Typography.fontBodySemiBold, fontSize: 13, color: Colors.navyPrimary },
  funnelTrack: { height: 8, backgroundColor: Colors.surfaceLow, borderRadius: 4, overflow: 'hidden' },
  funnelBar: { height: '100%', backgroundColor: Colors.amber, borderRadius: 4 },
  funnelBarLast: { backgroundColor: Colors.navySecondary },
})
