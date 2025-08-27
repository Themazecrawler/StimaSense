import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  children,
  variant = 'default',
  style,
  textStyle,
}: BadgeProps) {
  const { colors } = useTheme();

  const getBadgeStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start',
      borderWidth: 1,
    };

    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        baseStyle.borderColor = 'transparent';
        break;
      case 'destructive':
        baseStyle.backgroundColor = colors.destructive;
        baseStyle.borderColor = 'transparent';
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = colors.border;
        break;
      default:
        baseStyle.backgroundColor = colors.primary;
        baseStyle.borderColor = 'transparent';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    };

    switch (variant) {
      case 'secondary':
        baseTextStyle.color = colors.secondaryForeground;
        break;
      case 'destructive':
        baseTextStyle.color = colors.destructiveForeground;
        break;
      case 'outline':
        baseTextStyle.color = colors.foreground;
        break;
      default:
        baseTextStyle.color = colors.primaryForeground;
    }

    return baseTextStyle;
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={[getTextStyle(), textStyle]}>
        {children}
      </Text>
    </View>
  );
}