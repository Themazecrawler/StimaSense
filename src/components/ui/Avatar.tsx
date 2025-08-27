import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface AvatarProps {
  source?: { uri: string } | number;
  size?: number;
  fallback?: string;
  style?: ViewStyle;
}

interface AvatarFallbackProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface AvatarImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
}

export function Avatar({ 
  source, 
  size = 40, 
  fallback, 
  style 
}: AvatarProps) {
  const { colors } = useTheme();
  const [imageError, setImageError] = React.useState(false);

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    fallbackText: {
      color: colors.mutedForeground,
      fontSize: size * 0.4,
      fontWeight: '500',
      textAlign: 'center',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {source && !imageError ? (
        <Image
          source={source}
          style={styles.image}
          onError={() => setImageError(true)}
        />
      ) : (
        <Text style={styles.fallbackText}>
          {fallback || '?'}
        </Text>
      )}
    </View>
  );
}

export function AvatarImage({ source, style }: AvatarImageProps) {
  return <Image source={source} style={style} />;
}

export function AvatarFallback({ children, style }: AvatarFallbackProps) {
  const { colors } = useTheme();
  
  return (
    <View style={[{ backgroundColor: colors.muted }, style]}>
      {children}
    </View>
  );
}