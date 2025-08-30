import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeType: ThemeType;
  colors: ThemeColors;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const lightColors: ThemeColors = {
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

const darkColors: ThemeColors = {
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

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );

  // Calculate actual theme
  const theme = themeType === 'system' ? systemTheme : themeType;
  const colors = theme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    loadSavedTheme();
    
    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription.remove();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeType(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error('Failed to load saved theme:', error);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    setThemeType(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = () => {
    if (themeType === 'light') {
      setTheme('dark');
    } else if (themeType === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    themeType,
    colors,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper function to create theme-aware styles
export function createThemedStyles<T extends Record<string, any>>(
  styleCreator: (colors: ThemeColors) => T
) {
  return (colors: ThemeColors) => styleCreator(colors);
}

// Common theme utilities
export const ThemeUtils = {
  /**
   * Get appropriate text color for a background color
   */
  getContrastColor: (backgroundColor: string): string => {
    // Simple contrast calculation - in production, use a proper contrast ratio calculation
    if (!backgroundColor || backgroundColor === 'transparent') {
      return '#000000';
    }
    
    // Check if it's a dark color by examining the hex value
    const hex = backgroundColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    }
    
    return '#000000';
  },

  /**
   * Create gradient colors for emergency theme
   */
  getEmergencyGradient: (colors: ThemeColors): string[] => {
    return [colors.emergencyPrimary, colors.emergencySecondary];
  },

  /**
   * Get power status color with opacity
   */
  getPowerStatusColor: (
    status: 'on' | 'off' | 'unstable' | 'predicted',
    colors: ThemeColors,
    opacity: number = 1
  ): string => {
    const colorMap = {
      on: colors.powerOn,
      off: colors.powerOff,
      unstable: colors.powerUnstable,
      predicted: colors.powerPredicted,
    };
    
    const color = colorMap[status];
    
    if (opacity < 1) {
      // Convert hex to rgba (simplified)
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
  },

  /**
   * Get chart color by index
   */
  getChartColor: (index: number, colors: ThemeColors): string => {
    const chartColors = [
      colors.chart1,
      colors.chart2,
      colors.chart3,
      colors.chart4,
      colors.chart5,
    ];
    return chartColors[index % chartColors.length];
  },
};

export default ThemeContext;