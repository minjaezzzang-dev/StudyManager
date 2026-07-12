export const UI_COLORS = {
  primary: '#FF9B82', // Soft Coral
  accent: '#84DCC6', // Pastel Mint
  background: '#FFF8F5',
  surface: '#FFFFFF',
  textPrimary: '#2D2D2D',
  textSecondary: '#6B6B6B',
  border: '#E8E8E8',
  error: '#E57373',
  success: '#81C784',
  warning: '#FFB74D',
} as const;

export const BORDER_RADIUS = 20;

export const FONTS = {
  heading: 'Quicksand',
  body: 'Nunito',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;