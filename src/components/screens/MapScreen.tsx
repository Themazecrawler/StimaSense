import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { useTheme } from '../../contexts/ThemeContext';

export function MapScreen() {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
    content: { alignItems: 'center' },
    title: { color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: 18 },
    body: { color: colors.mutedForeground, fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Icon name="map-pin" size={44} color={colors.emergencyWarning} />
        <Text style={styles.title}>Outage map unavailable</Text>
        <Text style={styles.body}>
          StimaSense does not yet have a verified geospatial feed for active outages. Demo markers and default locations are excluded from production.
        </Text>
      </View>
    </SafeAreaView>
  );
}
