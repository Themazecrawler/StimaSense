import React from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Switch({
  value,
  onValueChange,
  disabled = false,
  style,
}: SwitchProps) {
  const { colors } = useTheme();
  const translateX = React.useRef(new Animated.Value(value ? 20 : 2)).current;

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? 20 : 2,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  const styles = StyleSheet.create({
    container: {
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: value ? colors.emergencyPrimary : colors.muted,
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    },
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.22,
      shadowRadius: 2.22,
      elevation: 3,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }] }
        ]}
      />
    </TouchableOpacity>
  );
}