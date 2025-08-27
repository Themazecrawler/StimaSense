import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  const { colors } = useTheme();
  
  const styles = StyleSheet.create({
    separator: {
      backgroundColor: colors.border,
    },
    horizontal: {
      height: 1,
      width: '100%',
    },
    vertical: {
      width: 1,
      height: '100%',
    },
  });

  return (
    <View 
      style={[
        styles.separator,
        orientation === 'horizontal' ? styles.horizontal : styles.vertical
      ]} 
    />
  );
}

