import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, Typography } from '../../src/tokens'

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '⬛',
    clientes: '👥',
    pipeline: '📊',
    relatorios: '📈',
    perfil: '👤',
  }
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.iconText, focused && styles.iconTextActive]}>
        {icons[name] ?? '⬛'}
      </Text>
    </View>
  )
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.amber,
        tabBarInactiveTintColor: Colors.outlineVariant,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused }) => <TabIcon name="clientes" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Clientes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: 'Pipeline',
          tabBarIcon: ({ focused }) => <TabIcon name="pipeline" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Pipeline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ focused }) => <TabIcon name="relatorios" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Relatórios" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon name="perfil" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.navyPrimary,
    borderTopWidth: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {},
  iconText: {
    fontSize: 18,
    opacity: 0.5,
  },
  iconTextActive: {
    opacity: 1,
  },
  label: {
    fontFamily: Typography.fontBodyMedium,
    fontSize: 10,
    color: Colors.outlineVariant,
  },
  labelActive: {
    color: Colors.amber,
  },
})
