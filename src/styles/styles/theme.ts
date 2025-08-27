// React Native Theme Configuration
// This replaces the CSS file with proper React Native theming

export interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;

  // Emergency theme colors (StimaSense specific)
  emergencyPrimary: string;
  emergencySecondary: string;
  emergencySuccess: string;
  emergencyWarning: string;
  emergencyDanger: string;
  emergencyInfo: string;

  // Power status colors
  powerOn: string;
  powerOff: string;
  powerUnstable: string;
  powerPredicted: string;

  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

export const lightTheme: ThemeColors = {
  // Base colors
  background: '#ffffff',
  foreground: '#030213',
  card: '#ffffff',
  cardForeground: '#030213',
  popover: '#ffffff',
  popoverForeground: '#030213',
  primary: '#030213',
  primaryForeground: '#ffffff',
  secondary: '#f3f3f5',
  secondaryForeground: '#030213',
  muted: '#ececf0',
  mutedForeground: '#717182',
  accent: '#e9ebef',
  accentForeground: '#030213',
  destructive: '#d4183d',
  destructiveForeground: '#ffffff',
  border: 'rgba(0, 0, 0, 0.1)',
  input: '#f3f3f5',
  ring: '#b0b0b6',

  // Emergency theme colors
  emergencyPrimary: '#EF6850',
  emergencySecondary: '#8B2192',
  emergencySuccess: '#22c55e',
  emergencyWarning: '#f59e0b',
  emergencyDanger: '#ef4444',
  emergencyInfo: '#3b82f6',

  // Power status colors
  powerOn: '#22c55e',
  powerOff: '#ef4444',
  powerUnstable: '#f59e0b',
  powerPredicted: '#f97316',

  // Chart colors
  chart1: '#e76e50',
  chart2: '#56a3a6',
  chart3: '#2f4858',
  chart4: '#f4a261',
  chart5: '#e9c46a',
};

export const darkTheme: ThemeColors = {
  // Base colors
  background: '#030213',
  foreground: '#ffffff',
  card: '#030213',
  cardForeground: '#ffffff',
  popover: '#030213',
  popoverForeground: '#ffffff',
  primary: '#ffffff',
  primaryForeground: '#030213',
  secondary: '#1f1f2e',
  secondaryForeground: '#ffffff',
  muted: '#1f1f2e',
  mutedForeground: '#b0b0b6',
  accent: '#1f1f2e',
  accentForeground: '#ffffff',
  destructive: '#e53e3e',
  destructiveForeground: '#ffffff',
  border: '#1f1f2e',
  input: '#1f1f2e',
  ring: '#646464',

  // Emergency theme colors (same as light for brand consistency)
  emergencyPrimary: '#EF6850',
  emergencySecondary: '#8B2192',
  emergencySuccess: '#16a34a',
  emergencyWarning: '#d97706',
  emergencyDanger: '#dc2626',
  emergencyInfo: '#2563eb',

  // Power status colors (darker variants)
  powerOn: '#16a34a',
  powerOff: '#dc2626',
  powerUnstable: '#d97706',
  powerPredicted: '#ea580c',

  // Chart colors (adjusted for dark theme)
  chart1: '#8b5cf6',
  chart2: '#06b6d4',
  chart3: '#84cc16',
  chart4: '#f59e0b',
  chart5: '#ef4444',
};

// Theme utilities
export const getThemeColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkTheme : lightTheme;
};

// Common styling utilities for React Native
export const createThemeStyles = (colors: ThemeColors) => ({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Card styles
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  
  // Text styles
  headingLarge: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: colors.foreground,
  },
  
  headingMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.foreground,
  },
  
  headingSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.foreground,
  },
  
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.foreground,
  },
  
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.foreground,
  },
  
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.mutedForeground,
  },
  
  // Button styles
  buttonPrimary: {
    backgroundColor: colors.emergencyPrimary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  
  buttonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  
  // Input styles
  input: {
    backgroundColor: colors.input,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.foreground,
  },
  
  // Emergency gradient
  emergencyGradient: {
    // This would be used with LinearGradient component
    colors: [colors.emergencyPrimary, colors.emergencySecondary],
  },
});

export default {
  light: lightTheme,
  dark: darkTheme,
  getThemeColors,
  createThemeStyles,
};