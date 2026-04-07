import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Typography, Spacing, Radius } from '../../src/tokens'

export default function RelatoriosScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[Colors.navyPrimary, Colors.navySecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Relatórios</Text>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.placeholder}>📈</Text>
        <Text style={styles.placeholderTitle}>Em breve</Text>
        <Text style={styles.placeholderText}>
          Relatórios analíticos com gráficos detalhados de performance comercial.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xl },
  headerTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.white },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl },
  placeholder: { fontSize: 56, marginBottom: Spacing.lg },
  placeholderTitle: { fontFamily: Typography.fontHeadlineEB, fontSize: 22, color: Colors.navyPrimary, marginBottom: Spacing.sm },
  placeholderText: {
    fontFamily: Typography.fontBody, fontSize: 14, color: Colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 22,
  },
})
