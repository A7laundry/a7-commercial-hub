import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/tokens'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.68

interface Deal {
  id: string
  company: string
  value: string
  days: number
  operator: string
}

interface Stage {
  id: string
  label: string
  headerColor: string
  deals: Deal[]
  total: string
}

const STAGES: Stage[] = [
  {
    id: 'prospeccao',
    label: 'Prospecção',
    headerColor: Colors.onSurfaceVariant,
    total: 'R$ 84.000',
    deals: [
      { id: '1', company: 'Nexus Logistics S.A.', value: 'R$ 42.500', days: 12, operator: 'JS' },
      { id: '2', company: 'Alpha Trading', value: 'R$ 128.000', days: 5, operator: 'MA' },
      { id: '3', company: 'FutureMed Saúde', value: 'R$ 18.750', days: 3, operator: 'TR' },
      { id: '4', company: 'LogiPrime Br', value: 'R$ 9.200', days: 1, operator: 'LB' },
    ],
  },
  {
    id: 'qualificacao',
    label: 'Qualificação',
    headerColor: Colors.amber,
    total: 'R$ 210.000',
    deals: [
      { id: '5', company: 'Stark Industries BR', value: 'R$ 215.000', days: 22, operator: 'TR' },
      { id: '6', company: 'Green Energy Co.', value: 'R$ 67.900', days: 8, operator: 'JS' },
      { id: '7', company: 'DataBridge Soluções', value: 'R$ 55.000', days: 14, operator: 'MA' },
    ],
  },
  {
    id: 'proposta',
    label: 'Proposta',
    headerColor: '#3949ab',
    total: 'R$ 395.000',
    deals: [
      { id: '8', company: 'Horizon Fintech', value: 'R$ 340.000', days: 31, operator: 'LB' },
      { id: '9', company: 'AgroMax Ltda', value: 'R$ 82.500', days: 18, operator: 'JS' },
      { id: '10', company: 'TechRise Platforms', value: 'R$ 120.000', days: 9, operator: 'TR' },
    ],
  },
  {
    id: 'fechamento',
    label: 'Fechamento',
    headerColor: '#2e7d32',
    total: 'R$ 180.000',
    deals: [
      { id: '11', company: 'Quantum Retail', value: 'R$ 15.200', days: 45, operator: 'JS' },
      { id: '12', company: 'PrimeData Analytics', value: 'R$ 164.800', days: 7, operator: 'MA' },
    ],
  },
]

function DealCard({ deal }: { deal: Deal }) {
  return (
    <View style={[styles.dealCard, Shadow.card]}>
      <View style={styles.dealTop}>
        <Text style={styles.dealCompany}>{deal.company}</Text>
        <View style={styles.operatorCircle}>
          <Text style={styles.operatorText}>{deal.operator}</Text>
        </View>
      </View>
      <Text style={styles.dealValue}>{deal.value}</Text>
      <View style={styles.dealFooter}>
        <View style={styles.daysBadge}>
          <Text style={styles.daysText}>{deal.days}d</Text>
        </View>
        <Text style={styles.daysLabel}>no estágio</Text>
      </View>
    </View>
  )
}

export default function PipelineScreen() {
  const totalPipeline = 'R$ 869k'

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
          <Text style={styles.headerTitle}>Pipeline</Text>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: totalPipeline },
            { label: 'Win Rate', value: '24%' },
            { label: 'Ciclo Médio', value: '18d' },
          ].map((s) => (
            <View key={s.label} style={styles.statChip}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Kanban — horizontal scroll of columns */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kanban}
        style={styles.kanbanScroll}
      >
        {STAGES.map((stage) => (
          <View key={stage.id} style={[styles.column, { width: CARD_W }]}>
            {/* Column header */}
            <View style={styles.colHeader}>
              <View style={[styles.colBadge, { backgroundColor: stage.headerColor + '25' }]}>
                <Text style={[styles.colBadgeText, { color: stage.headerColor }]}>{stage.label}</Text>
              </View>
              <View style={styles.colMeta}>
                <Text style={styles.colCount}>{stage.deals.length}</Text>
                <Text style={styles.colTotal}>{stage.total}</Text>
              </View>
            </View>

            {/* Deal cards */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.columnScroll}>
              {stage.deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </ScrollView>
          </View>
        ))}
        <View style={{ width: Spacing.lg }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, Shadow.float]} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  headerTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.white },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white + '20', alignItems: 'center', justifyContent: 'center',
  },
  filterIcon: { fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statChip: {
    flex: 1, backgroundColor: Colors.white + '18',
    borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  statValue: { fontFamily: Typography.fontHeadline, fontSize: 15, color: Colors.white, marginBottom: 2 },
  statLabel: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.white + 'aa' },
  kanbanScroll: { flex: 1 },
  kanban: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 80, gap: Spacing.md },
  column: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radius.lg, padding: Spacing.md, maxHeight: 520,
  },
  colHeader: { marginBottom: Spacing.md },
  colBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, marginBottom: 6 },
  colBadgeText: { fontFamily: Typography.fontBodySemiBold, fontSize: 12 },
  colMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colCount: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.navyPrimary },
  colTotal: { fontFamily: Typography.fontBodySemiBold, fontSize: 12, color: Colors.onSurfaceVariant },
  columnScroll: { flex: 1 },
  dealCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  dealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  dealCompany: { fontFamily: Typography.fontHeadline, fontSize: 13, color: Colors.onSurface, flex: 1, marginRight: 8 },
  operatorCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.navyPrimary, alignItems: 'center', justifyContent: 'center',
  },
  operatorText: { fontFamily: Typography.fontBodyBold, fontSize: 9, color: Colors.white },
  dealValue: { fontFamily: Typography.fontHeadlineEB, fontSize: 16, color: Colors.amber, marginBottom: 8 },
  dealFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  daysBadge: {
    backgroundColor: Colors.surfaceHigh, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  daysText: { fontFamily: Typography.fontBodySemiBold, fontSize: 11, color: Colors.onSurfaceVariant },
  daysLabel: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.outline },
  fab: {
    position: 'absolute', bottom: 84, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  fabText: { fontSize: 28, color: Colors.navyPrimary, lineHeight: 32, marginTop: -2 },
})
