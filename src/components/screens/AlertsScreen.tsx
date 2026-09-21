import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { kplcPlannedOutageService, PlannedOutage } from '../../backend/kplc/KPLCPlannedOutageService';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../observability/logger';
import { Card, CardContent } from '../ui/Card';

export default function AlertsScreen() {
  const { colors } = useTheme();
  const [notices, setNotices] = useState<PlannedOutage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = kplcPlannedOutageService.subscribe(setNotices);
    kplcPlannedOutageService.initialize().catch(error => logger.error('alerts.initialize_failed', error));
    return unsubscribe;
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await kplcPlannedOutageService.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 12 },
    title: { color: colors.foreground, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: colors.mutedForeground, fontSize: 14, marginBottom: 12 },
    empty: { color: colors.mutedForeground, fontSize: 15, lineHeight: 22, textAlign: 'center', padding: 28 },
    notice: { gap: 5 },
    noticeTitle: { color: colors.foreground, fontSize: 16, fontWeight: '600' },
    meta: { color: colors.mutedForeground, fontSize: 13 },
    badge: { color: colors.emergencyWarning, fontSize: 12, fontWeight: '700' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Text style={styles.title}>Notices</Text>
        <Text style={styles.subtitle}>Official planned interruptions only. This is not a live outage-confirmation feed.</Text>
        {notices.length === 0 ? (
          <Card><CardContent><Text style={styles.empty}>No current, valid KPLC interruption notices are available.</Text></CardContent></Card>
        ) : notices.map(notice => (
          <Card key={notice.id}>
            <CardContent>
              <View style={styles.notice}>
                <Text style={styles.badge}>PLANNED INTERRUPTION</Text>
                <Text style={styles.noticeTitle}>{notice.region}: {notice.area}</Text>
                <Text style={styles.meta}>{new Date(notice.startTime).toLocaleString()} – {new Date(notice.endTime).toLocaleString()}</Text>
                <Text style={styles.meta}>Source: Kenya Power</Text>
              </View>
            </CardContent>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
