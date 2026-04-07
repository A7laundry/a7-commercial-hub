export const Colors = {
  navyPrimary: '#022448',
  navySecondary: '#1E3A5F',
  navyDeep: '#000e24',
  amber: '#F5A623',
  amberDim: '#ffb955',
  amberFixed: '#ffddb4',

  surface: '#f8f9fa',
  surfaceLow: '#f3f4f5',
  surfaceHigh: '#e7e8e9',
  surfaceHighest: '#e1e3e4',
  surfaceCard: '#ffffff',

  onSurface: '#191c1d',
  onSurfaceVariant: '#43474e',
  outline: '#74777f',
  outlineVariant: '#c4c6cf',

  success: '#2e7d32',
  successContainer: '#e8f5e9',
  warning: '#F5A623',
  warningContainer: '#fff3e0',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',

  white: '#ffffff',
  transparent: 'transparent',
} as const

export const Typography = {
  fontHeadline: 'Manrope_700Bold',
  fontHeadlineEB: 'Manrope_800ExtraBold',
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodySemiBold: 'Inter_600SemiBold',
  fontBodyBold: 'Inter_700Bold',
} as const

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 999,
} as const

export const Shadow = {
  card: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  float: {
    shadowColor: '#191c1d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
} as const
