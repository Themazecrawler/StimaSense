import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = 12;
        baseStyle.paddingVertical = 8;
        baseStyle.minHeight = 32;
        break;
      case 'lg':
        baseStyle.paddingHorizontal = 24;
        baseStyle.paddingVertical = 16;
        baseStyle.minHeight = 48;
        break;
      default: // md
        baseStyle.paddingHorizontal = 16;
        baseStyle.paddingVertical = 12;
        baseStyle.minHeight = 40;
    }

    // Variant styles
    switch (variant) {
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.border;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'destructive':
        baseStyle.backgroundColor = colors.destructive;
        break;
      default:
        baseStyle.backgroundColor = colors.primary;
    }

    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '500',
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseTextStyle.fontSize = 14;
        break;
      case 'lg':
        baseTextStyle.fontSize = 18;
        break;
      default:
        baseTextStyle.fontSize = 16;
    }

    // Variant styles
    switch (variant) {
      case 'outline':
        baseTextStyle.color = colors.foreground;
        break;
      case 'ghost':
        baseTextStyle.color = colors.foreground;
        break;
      case 'destructive':
        baseTextStyle.color = colors.destructiveForeground;
        break;
      default:
        baseTextStyle.color = colors.primaryForeground;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.foreground : colors.primaryForeground}
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}