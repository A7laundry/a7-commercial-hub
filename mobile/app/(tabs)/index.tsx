import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/tokens'

const { width: SCREEN_W } = Dimensions.get('window')

// Mini sparkline SVG-equivalent using View bars
function SparkBar({ heights, color }: { heights: number[]; color: string }) {
  const max = Math.max(...heights)
  return (
    <View style={spark.row}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[spark.bar, { height: (h / max) * 28, backgroundColor: color }]}
        />
      ))}
    </View>
  )
}

const spark = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28 },
  bar: { width: 5, borderRadius: 2 },
})

const dashboardData = [
  { label: 'Clientes', value: '1.284', delta: '+12', color: Colors.navyPrimary, spark: [40, 55, 48, 62, 70, 58, 75] },
  { label: 'Pipeline Ativo', value: 'R$ 4.8M', delta: '+8%', color: Colors.amber, spark: [30, 45, 40, 55, 48, 65, 72] },
  { label: 'Alertas', value: '12', delta: '-3', color: '#e53935', spark: [20, 25, 18, 22, 30, 15, 12] },
]

const actions = [
  { icon: '🔄', title: 'Renovação Alpha Corp', subtitle: 'Vence em 48 horas', badge: 'Urgente', badgeColor: '#e53935' },
  { icon: '⚠️', title: 'Alerta de Churn', subtitle: 'Usuário inativo: Beta Ltda', badge: 'Risco', badgeColor: Colors.amber },
  { icon: '💳', title: 'Fatura Pendente', subtitle: 'Aguardando aprovação', badge: 'Pendente', badgeColor: Colors.outlineVariant },
]

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.navyPrimary, Colors.navySecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerGreeting}>Bom dia, Rafael</Text>
            <Text style={styles.headerTitle}>Painel Executivo</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>RA</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        <Text style={styles.sectionTitle}>Visão Geral</Text>
        <View style={styles.kpiRow}>
          {dashboardData.map((kpi) => (
            <View key={kpi.label} style={[styles.kpiCard, Shadow.card]}>
              <View style={styles.kpiTop}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={[styles.kpiDelta, { color: kpi.delta.startsWith('-') && kpi.label !== 'Alertas' ? '#e53935' : kpi.label === 'Alertas' ? Colors.success : '#2e7d32' }]}>
                  {kpi.delta}
                </Text>
              </View>
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <SparkBar heights={kpi.spark} color={kpi.color + '60'} />
            </View>
          ))}
        </View>

        {/* Activity Chart — simplified bar chart */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>Atividade — Últimos 30 dias</Text>
          <Text style={styles.cardSubtitle}>Contratos fechados por semana</Text>
          <View style={styles.chartArea}>
            {[6, 9, 7, 12, 8, 14, 11, 10].map((v, i) => (
              <View key={i} style={styles.chartColWrap}>
                <View style={[styles.chartBar, { height: v * 8, backgroundColor: i === 5 ? Colors.amber : Colors.navyPrimary + '40' }]} />
                <Text style={styles.chartTick}>S{i + 1}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            <View style={[styles.legendDot, { backgroundColor: Colors.navyPrimary + '40' }]} />
            <Text style={styles.legendText}>Contratos</Text>
            <View style={[styles.legendDot, { backgroundColor: Colors.amber, marginLeft: 12 }]} />
            <Text style={styles.legendText}>Destaque</Text>
          </View>
        </View>

        {/* O que fazer agora */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>O que fazer agora?</Text>
          {actions.map((a) => (
            <TouchableOpacity key={a.title} style={styles.actionRow} activeOpacity={0.7}>
              <View style={styles.actionIcon}>
                <Text style={{ fontSize: 20 }}>{a.icon}</Text>
              </View>
              <View style={styles.actionBody}>
                <Text style={styles.actionTitle}>{a.title}</Text>
                <Text style={styles.actionSub}>{a.subtitle}</Text>
              </View>
              <View style={[styles.actionBadge, { backgroundColor: a.badgeColor + '20' }]}>
                <Text style={[styles.actionBadgeText, { color: a.badgeColor }]}>{a.badge}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Insight card */}
        <View style={[styles.insightCard, Shadow.card]}>
          <Text style={styles.insightIcon}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Otimização de Portfólio</Text>
            <Text style={styles.insightText}>
              4 oportunidades no Pipeline com probabilidade acima de 85% não foram contactadas hoje.
            </Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.white + 'aa', marginBottom: 2 },
  headerTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.white },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Typography.fontHeadline, fontSize: 14, color: Colors.navyPrimary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  sectionTitle: {
    fontFamily: Typography.fontHeadline, fontSize: 16, color: Colors.navyPrimary,
    marginBottom: Spacing.md,
  },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  kpiCard: {
    flex: 1, backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  kpiLabel: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.onSurfaceVariant },
  kpiDelta: { fontFamily: Typography.fontBodySemiBold, fontSize: 10 },
  kpiValue: { fontFamily: Typography.fontHeadlineEB, fontSize: 18, marginBottom: 6 },
  card: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  cardTitle: { fontFamily: Typography.fontHeadline, fontSize: 15, color: Colors.navyPrimary, marginBottom: 4 },
  cardSubtitle: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: Spacing.md },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 },
  chartColWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '80%', borderRadius: 4 },
  chartTick: { fontFamily: Typography.fontBody, fontSize: 9, color: Colors.onSurfaceVariant, marginTop: 4 },
  chartLegend: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.onSurfaceVariant, marginLeft: 4 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 0,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceLow, alignItems: 'center', justifyContent: 'center',
  },
  actionBody: { flex: 1 },
  actionTitle: { fontFamily: Typography.fontBodySemiBold, fontSize: 13, color: Colors.onSurface },
  actionSub: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.onSurfaceVariant, marginTop: 2 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  actionBadgeText: { fontFamily: Typography.fontBodySemiBold, fontSize: 10 },
  insightCard: {
    backgroundColor: Colors.navyPrimary + '08',
    borderLeftWidth: 3, borderLeftColor: Colors.amber,
    borderRadius: Radius.lg, padding: Spacing.lg,
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg,
  },
  insightIcon: { fontSize: 20 },
  insightTitle: { fontFamily: Typography.fontHeadline, fontSize: 13, color: Colors.navyPrimary, marginBottom: 4 },
  insightText: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },
})
