import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors } = useTheme();
  const themedStyles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });

  return (
    <View style={[themedStyles.card, style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {children}
    </View>
  );
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View style={[styles.content, style]}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  content: { padding: 16, paddingTop: 0 },
});
