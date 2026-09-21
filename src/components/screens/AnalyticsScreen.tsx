import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardHeader } from '../ui/Card';

export function AnalyticsScreen() {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    title: { color: colors.foreground, fontSize: 26, fontWeight: '700' },
    cardTitle: { color: colors.foreground, fontSize: 18, fontWeight: '600' },
    body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Analytics</Text>
        <Card>
          <CardHeader><Text style={styles.cardTitle}>Operational model</Text></CardHeader>
          <CardContent>
            <Text style={styles.body}>Unavailable. The bundled US storm model is research-only and cannot produce Kenyan outage-risk analytics.</Text>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Text style={styles.cardTitle}>Evidence required</Text></CardHeader>
          <CardContent>
            <Text style={styles.body}>Analytics will appear after a model passes Kenyan provenance, pre-event feature, temporal/geographic holdout, calibration, baseline, and mobile round-trip checks.</Text>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
