import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/tokens'

type Status = 'Ativo' | 'Em risco' | 'Inativo'
type FilterKey = 'Todos' | Status

interface Client {
  id: string
  initials: string
  name: string
  industry: string
  status: Status
  lastActivity: string
}

const CLIENTS: Client[] = [
  { id: '1', initials: 'IU', name: 'Itaú Unibanco', industry: 'Setor Bancário', status: 'Ativo', lastActivity: 'Hoje, 14:20' },
  { id: '2', initials: 'ML', name: 'Magazine Luiza', industry: 'Varejo', status: 'Ativo', lastActivity: 'Ontem' },
  { id: '3', initials: 'LO', name: 'Localiza', industry: 'Aluguel de Veículos', status: 'Em risco', lastActivity: '2 dias atrás' },
  { id: '4', initials: 'BT', name: 'BTG Pactual', industry: 'Serviços Financeiros', status: 'Ativo', lastActivity: 'Hoje, 09:15' },
  { id: '5', initials: 'AM', name: 'Ambev', industry: 'Bebidas', status: 'Inativo', lastActivity: '5 dias atrás' },
  { id: '6', initials: 'VA', name: 'Vale S.A.', industry: 'Mineração', status: 'Ativo', lastActivity: 'Ontem, 17:45' },
  { id: '7', initials: 'EM', name: 'Embraer', industry: 'Aeroespacial', status: 'Em risco', lastActivity: '1 semana atrás' },
]

const STATUS_CONFIG: Record<Status, { bg: string; text: string }> = {
  'Ativo': { bg: '#e8f5e9', text: '#2e7d32' },
  'Em risco': { bg: Colors.amberFixed, text: '#6b4500' },
  'Inativo': { bg: Colors.surfaceHighest, text: Colors.onSurfaceVariant },
}

const FILTERS: FilterKey[] = ['Todos', 'Ativo', 'Em risco', 'Inativo']

export default function ClientesScreen() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('Todos')

  const filtered = CLIENTS.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Todos' || c.status === filter
    return matchSearch && matchFilter
  })

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
          <Text style={styles.headerTitle}>Clientes</Text>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>RA</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor={Colors.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && styles.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const sc = STATUS_CONFIG[item.status]
          return (
            <TouchableOpacity
              style={[styles.clientCard, Shadow.card]}
              activeOpacity={0.8}
              onPress={() => router.push(`/clientes/${item.id}`)}
            >
              <View style={styles.initCircle}>
                <Text style={styles.initText}>{item.initials}</Text>
              </View>
              <View style={styles.clientBody}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientIndustry}>{item.industry}</Text>
                <Text style={styles.clientActivity}>Última atividade: {item.lastActivity}</Text>
              </View>
              <View style={styles.clientRight}>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  headerTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.white },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Typography.fontHeadline, fontSize: 13, color: Colors.navyPrimary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white + 'ee', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1, fontFamily: Typography.fontBody, fontSize: 14, color: Colors.onSurface,
  },
  filterRow: { backgroundColor: Colors.surfaceCard, paddingVertical: Spacing.sm },
  filterScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
  },
  chipActive: { backgroundColor: Colors.navyPrimary },
  chipText: { fontFamily: Typography.fontBodyMedium, fontSize: 13, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 100 },
  clientCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  initCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.navyPrimary, alignItems: 'center', justifyContent: 'center',
  },
  initText: { fontFamily: Typography.fontHeadline, fontSize: 14, color: Colors.white },
  clientBody: { flex: 1 },
  clientName: { fontFamily: Typography.fontHeadline, fontSize: 15, color: Colors.onSurface, marginBottom: 2 },
  clientIndustry: { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.onSurfaceVariant, marginBottom: 4 },
  clientActivity: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.outline },
  clientRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontFamily: Typography.fontBodySemiBold, fontSize: 11 },
  chevron: { fontSize: 20, color: Colors.outlineVariant },
  fab: {
    position: 'absolute', bottom: 84, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  fabText: { fontSize: 28, color: Colors.navyPrimary, lineHeight: 32, marginTop: -2 },
})
