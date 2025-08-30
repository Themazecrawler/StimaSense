import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          elevation: 5,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return (
    <View
      style={[
        {
          padding: 16,
          paddingBottom: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View
      style={[
        {
          padding: 16,
          paddingTop: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  
  return (
    <View style={style}>
      {children}
    </View>
  );
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  
  return (
    <View style={style}>
      {children}
    </View>
  );
}