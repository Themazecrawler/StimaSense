import React from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  style?: ViewStyle;
  textStyle?: TextStyle;
  error?: boolean;
}

export function Input({
  style,
  textStyle,
  error = false,
  ...props
}: InputProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    input: {
      backgroundColor: colors.input || colors.background,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: error ? colors.destructive : colors.border,
      minHeight: 48,
    },
  });

  return (
    <TextInput
      style={[styles.input, textStyle, style]}
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.emergencyPrimary}
      {...props}
    />
  );
}