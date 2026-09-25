import { StyleSheet } from 'react-native';
import type { ThemeColors } from '../../contexts/ThemeContext';

/** Styles common to the login and registration screens. */
export function createAuthStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoGradient: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    logoSubtext: {
      fontSize: 16,
      color: colors.mutedForeground,
    },
    card: {
      marginBottom: 24,
    },
    cardHeader: {
      alignItems: 'center',
      paddingBottom: 16,
    },
    cardTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    googleButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.foreground,
      marginLeft: 8,
    },
    separator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    separatorText: {
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      backgroundColor: colors.background,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputWrapper: {
      position: 'relative',
    },
    inputIcon: {
      position: 'absolute',
      left: 12,
      top: 14,
    },
    passwordToggle: {
      position: 'absolute',
      right: 12,
      top: 14,
    },
    gradientButton: {
      borderRadius: 8,
      marginBottom: 16,
      minHeight: 48,
    },
    gradientButtonInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    gradientButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    googleIconContainer: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#4285F4', // Google's official blue color
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    googleIcon: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
    },
  });
}
