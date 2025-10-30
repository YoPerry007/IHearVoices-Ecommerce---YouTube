export const COLORS = {
  // Primary Ghana-inspired colors
  primary: '#10B981', // Emerald green
  primaryDark: '#059669',
  primaryLight: '#34D399',
  
  // Secondary colors
  secondary: '#F59E0B', // Amber (Ghana flag inspired)
  secondaryDark: '#D97706',
  secondaryLight: '#FCD34D',
  
  // Neutral colors (dark theme optimized)
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  surfaceLight: '#334155', // Slate 700
  
  // Text colors
  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#CBD5E1', // Slate 300
  textMuted: '#94A3B8', // Slate 400
  
  // Border colors
  border: '#475569', // Slate 600
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Accent colors
  accent: '#8B5CF6', // Purple for premium feel
  accentLight: '#A78BFA',
  
  // Transparent overlays
  overlay: 'rgba(15, 23, 42, 0.8)',
  overlayLight: 'rgba(15, 23, 42, 0.4)',
  
  // White and black
  white: '#FFFFFF',
  black: '#000000',
};

export const TYPOGRAPHY = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font weights
  fontWeight: {
    light: '300' as '300',
    normal: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
    extrabold: '800' as '800',
  },
  
  // Text styles
  h1: {
    fontSize: 48,
    fontWeight: '700' as '700',
    lineHeight: 1.25,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as '400',
    lineHeight: 1.5,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as '600',
    lineHeight: 1.25,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as '400',
    lineHeight: 1.25,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
};

export const ANIMATIONS = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
  },
};

export const LAYOUT = {
  screenPadding: SPACING.md,
  cardPadding: SPACING.md,
  buttonHeight: 56,
  inputHeight: 56,
  headerHeight: 60,
  tabBarHeight: 80,
};
