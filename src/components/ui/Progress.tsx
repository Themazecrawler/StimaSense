import React from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ProgressProps {
  value: number; // 0-100
  height?: number;
  style?: ViewStyle;
  color?: string;
}

export function Progress({
  value,
  height = 8,
  style,
  color,
}: ProgressProps) {
  const { colors } = useTheme();
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.min(Math.max(value, 0), 100),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const styles = StyleSheet.create({
    container: {
      height,
      backgroundColor: colors.muted,
      borderRadius: height / 2,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: color || colors.emergencyPrimary,
      borderRadius: height / 2,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: progress.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}