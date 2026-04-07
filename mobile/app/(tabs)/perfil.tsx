import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/tokens'

const MENU_ITEMS = [
  { icon: '🔔', label: 'Notificações' },
  { icon: '🔒', label: 'Segurança' },
  { icon: '🌐', label: 'Idioma e Região' },
  { icon: '💬', label: 'Suporte' },
  { icon: '📝', label: 'Termos de Uso' },
]

export default function PerfilScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[Colors.navyPrimary, Colors.navySecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatarLg}>
            <Text style={styles.avatarText}>RA</Text>
          </View>
          <View>
            <Text style={styles.profileName}>Rafael Almeida</Text>
            <Text style={styles.profileRole}>Gerente Comercial · A7X</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={[styles.menuItem, Shadow.card]} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.logoutBtn]} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  headerTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.white, marginBottom: Spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  avatarLg: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.amber, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Typography.fontHeadlineEB, fontSize: 20, color: Colors.navyPrimary },
  profileName: { fontFamily: Typography.fontHeadlineEB, fontSize: 18, color: Colors.white },
  profileRole: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.white + 'aa', marginTop: 2 },
  body: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 100 },
  menuItem: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontFamily: Typography.fontBodyMedium, fontSize: 15, color: Colors.onSurface },
  menuChevron: { fontSize: 22, color: Colors.outlineVariant },
  logoutBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center',
  },
  logoutText: { fontFamily: Typography.fontBodySemiBold, fontSize: 15, color: Colors.error },
})
