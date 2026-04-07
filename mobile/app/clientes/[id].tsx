import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/tokens'

// Static mock data — in production this would come from a query based on `id`
const CLIENT = {
  initials: 'LO',
  name: 'Localiza Rent A Car',
  subtitle: 'Cliente Ativo • desde 2022',
  kpis: [
    { label: 'Faturado', value: 'R$ 48.200' },
    { label: 'Contratos', value: '3' },
    { label: 'Satisfação', value: '92%' },
  ],
  contact: {
    name: 'Marcos Ferreira',
    role: 'Diretor Financeiro',
    phone: '(31) 99812-3456',
  },
  contracts: [
    { id: 'C-2024-018', date: 'Mar 2024', value: 'R$ 22.500', status: 'Ativo' },
    { id: 'C-2023-091', date: 'Set 2023', value: 'R$ 18.200', status: 'Concluído' },
    { id: 'C-2022-044', date: 'Abr 2022', value: 'R$ 7.500', status: 'Concluído' },
  ],
  activity: [
    { icon: '💬', text: 'E-mail enviado: proposta renovação Q2', time: 'Hoje, 10:32' },
    { icon: '📞', text: 'Ligação com Marcos Ferreira — 18 min', time: 'Ontem, 15:00' },
    { icon: '📄', text: 'Contrato C-2024-018 assinado', time: '12 Mar, 09:15' },
  ],
  tasks: [
    { text: 'Enviar proposta renovação atualizada', due: 'Amanhã' },
    { text: 'Agendar reunião de Q3 review', due: 'Próx. semana' },
  ],
}

const CONTRACT_STATUS: Record<string, { bg: string; text: string }> = {
  Ativo: { bg: '#e8f5e9', text: '#2e7d32' },
  Concluído: { bg: Colors.surfaceHighest, text: Colors.onSurfaceVariant },
}

export default function ClienteDetailScreen() {
  const { id } = useLocalSearchParams()

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.navyPrimary, Colors.navySecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn} activeOpacity={0.7}>
            <Text style={styles.moreIcon}>⋯</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.profileRow}>
          <View style={styles.initCircle}>
            <Text style={styles.initText}>{CLIENT.initials}</Text>
          </View>
          <View>
            <Text style={styles.clientName}>{CLIENT.name}</Text>
            <Text style={styles.clientSubtitle}>{CLIENT.subtitle}</Text>
          </View>
        </View>

        {/* KPI strip */}
        <View style={styles.kpiStrip}>
          {CLIENT.kpis.map((kpi) => (
            <View key={kpi.label} style={styles.kpiChip}>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contatos */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>Contatos</Text>
          <View style={styles.contactRow}>
            <View style={styles.contactAvatar}>
              <Text style={styles.contactAvatarText}>MF</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{CLIENT.contact.name}</Text>
              <Text style={styles.contactRole}>{CLIENT.contact.role}</Text>
              <Text style={styles.contactPhone}>{CLIENT.contact.phone}</Text>
            </View>
            <TouchableOpacity style={styles.whatsappBtn} activeOpacity={0.8}>
              <Text style={styles.whatsappIcon}>💬</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Histórico de Contratos */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>Histórico de Contratos</Text>
          {CLIENT.contracts.map((c) => {
            const sc = CONTRACT_STATUS[c.status]
            return (
              <View key={c.id} style={styles.contractRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contractId}>{c.id}</Text>
                  <Text style={styles.contractDate}>{c.date}</Text>
                </View>
                <Text style={styles.contractValue}>{c.value}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{c.status}</Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Atividade Recente */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>Atividade Recente</Text>
          {CLIENT.activity.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={styles.activityIconWrap}>
                <Text style={{ fontSize: 16 }}>{a.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>{a.text}</Text>
                <Text style={styles.activityTime}>{a.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Próximas Ações */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.cardTitle}>Próximas Ações</Text>
          {CLIENT.tasks.map((t, i) => (
            <View key={i} style={styles.taskRow}>
              <View style={styles.checkbox} />
              <Text style={styles.taskText}>{t.text}</Text>
              <View style={styles.dueBadge}>
                <Text style={styles.dueText}>{t.due}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>

      {/* Fixed CTA strip */}
      <View style={styles.ctaStrip}>
        <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnNavy]} activeOpacity={0.85}>
          <Text style={styles.ctaBtnTextWhite}>Nova Proposta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnAmber]} activeOpacity={0.85}>
          <Text style={styles.ctaBtnTextNavy}>💬 WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.white, lineHeight: 32 },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  moreIcon: { fontSize: 20, color: Colors.white },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  initCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  initText: { fontFamily: Typography.fontHeadlineEB, fontSize: 18, color: Colors.navyPrimary },
  clientName: { fontFamily: Typography.fontHeadlineEB, fontSize: 18, color: Colors.white },
  clientSubtitle: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.white + 'aa', marginTop: 2 },
  kpiStrip: { flexDirection: 'row', gap: Spacing.sm },
  kpiChip: {
    flex: 1, backgroundColor: Colors.white + '18',
    borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  kpiValue: { fontFamily: Typography.fontHeadline, fontSize: 15, color: Colors.white, marginBottom: 2 },
  kpiLabel: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.white + 'aa' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  card: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md,
  },
  cardTitle: { fontFamily: Typography.fontHeadline, fontSize: 15, color: Colors.navyPrimary, marginBottom: Spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contactAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.navySecondary, alignItems: 'center', justifyContent: 'center',
  },
  contactAvatarText: { fontFamily: Typography.fontHeadline, fontSize: 14, color: Colors.white },
  contactName: { fontFamily: Typography.fontBodySemiBold, fontSize: 14, color: Colors.onSurface },
  contactRole: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 1 },
  contactPhone: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.outline, marginTop: 2 },
  whatsappBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center',
  },
  whatsappIcon: { fontSize: 20 },
  contractRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  contractId: { fontFamily: Typography.fontBodySemiBold, fontSize: 13, color: Colors.onSurface },
  contractDate: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.outline, marginTop: 2 },
  contractValue: { fontFamily: Typography.fontBodySemiBold, fontSize: 13, color: Colors.onSurface, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontFamily: Typography.fontBodySemiBold, fontSize: 11 },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm },
  activityIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceLow, alignItems: 'center', justifyContent: 'center',
  },
  activityText: { fontFamily: Typography.fontBodyMedium, fontSize: 13, color: Colors.onSurface, lineHeight: 18 },
  activityTime: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.outline, marginTop: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  checkbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: Colors.outlineVariant,
  },
  taskText: { flex: 1, fontFamily: Typography.fontBodyMedium, fontSize: 13, color: Colors.onSurface },
  dueBadge: {
    backgroundColor: Colors.amberFixed, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  dueText: { fontFamily: Typography.fontBodySemiBold, fontSize: 11, color: '#6b4500' },
  ctaStrip: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row', gap: Spacing.md,
    borderTopWidth: 0,
    shadowColor: '#191c1d', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 8,
  },
  ctaBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnNavy: { backgroundColor: Colors.navyPrimary },
  ctaBtnAmber: { backgroundColor: Colors.amber },
  ctaBtnTextWhite: { fontFamily: Typography.fontBodySemiBold, fontSize: 14, color: Colors.white },
  ctaBtnTextNavy: { fontFamily: Typography.fontBodySemiBold, fontSize: 14, color: Colors.navyPrimary },
})
