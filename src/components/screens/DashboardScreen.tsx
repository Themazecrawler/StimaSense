import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import { kplcPlannedOutageService, PlannedOutage } from '../../backend/kplc/KPLCPlannedOutageService';
import { WeatherData, weatherService } from '../../backend/weather/WeatherService';
import { useTheme } from '../../contexts/ThemeContext';
import { logger } from '../../observability/logger';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

const WEATHER_FRESHNESS_MS = 30 * 60 * 1000;

type WeatherState =
  | { status: 'loading' }
  | { status: 'ready' | 'stale'; data: WeatherData }
  | { status: 'unavailable' };

export function DashboardScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' });
  const [plannedOutages, setPlannedOutages] = useState<PlannedOutage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadWeather = useCallback(async () => {
    const result = await weatherService.getCurrentWeather();
    if (!result) {
      setWeather({ status: 'unavailable' });
      return;
    }

    const stale = Date.now() - result.timestamp.getTime() > WEATHER_FRESHNESS_MS;
    setWeather({ status: stale ? 'stale' : 'ready', data: result });
  }, []);

  useEffect(() => {
    const unsubscribe = kplcPlannedOutageService.subscribe(items => {
      setPlannedOutages(items.slice(0, 3));
    });

    Promise.all([
      loadWeather(),
      kplcPlannedOutageService.initialize(),
    ]).catch(error => logger.error('dashboard.initialize_failed', error));

    return unsubscribe;
  }, [loadWeather]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadWeather(), kplcPlannedOutageService.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    header: { marginBottom: 4 },
    title: { color: colors.foreground, fontSize: 28, fontWeight: '700' },
    subtitle: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
    cardTitle: { color: colors.foreground, fontSize: 18, fontWeight: '600' },
    body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
    unavailableCopy: { marginTop: 10 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusText: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
    weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
    metric: { minWidth: '45%', flex: 1 },
    metricValue: { color: colors.foreground, fontSize: 20, fontWeight: '700' },
    metricLabel: { color: colors.mutedForeground, fontSize: 12 },
    notice: { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: 12 },
    noticeTitle: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
    noticeMeta: { color: colors.mutedForeground, fontSize: 12, marginTop: 3 },
    actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    action: { flex: 1 },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.emergencyPrimary]}
            tintColor={colors.emergencyPrimary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>StimaSense</Text>
          <Text style={styles.subtitle}>Sourced outage information for your area</Text>
        </View>

        <Card>
          <CardHeader>
            <Text style={styles.cardTitle}>Outage Risk Forecast</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.statusRow}>
              <Icon name="slash" size={22} color={colors.emergencyWarning} />
              <Text style={styles.statusText}>Prediction unavailable</Text>
            </View>
            <Text style={[styles.body, styles.unavailableCopy]}>
              No model validated for Kenyan service areas is installed. StimaSense will not substitute demo or heuristic predictions.
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.cardTitle}>Current Weather</Text>
          </CardHeader>
          <CardContent>
            {weather.status === 'loading' && <Text style={styles.body}>Loading current observation…</Text>}
            {weather.status === 'unavailable' && (
              <Text style={styles.body}>Weather is unavailable. Check location permission, configuration, and connectivity, then retry.</Text>
            )}
            {(weather.status === 'ready' || weather.status === 'stale') && (
              <>
                <Text style={styles.statusText}>
                  {weather.data.location.city}, {weather.data.location.region}
                  {weather.status === 'stale' ? ' · Stale' : ''}
                </Text>
                <Text style={styles.body}>Observed {weather.data.timestamp.toLocaleString()} · WeatherAPI</Text>
                <View style={styles.weatherGrid}>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{Math.round(weather.data.temperature)}°C</Text>
                    <Text style={styles.metricLabel}>Temperature</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{Math.round(weather.data.humidity)}%</Text>
                    <Text style={styles.metricLabel}>Humidity</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{weather.data.windSpeed.toFixed(1)} m/s</Text>
                    <Text style={styles.metricLabel}>Wind speed</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricValue}>{weather.data.precipitation.toFixed(1)} mm</Text>
                    <Text style={styles.metricLabel}>Precipitation</Text>
                  </View>
                </View>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Text style={styles.cardTitle}>Planned Interruption Notices</Text>
          </CardHeader>
          <CardContent>
            {plannedOutages.length === 0 ? (
              <Text style={styles.body}>No current, valid KPLC notices are available.</Text>
            ) : plannedOutages.map(notice => (
              <View key={notice.id} style={styles.notice}>
                <Text style={styles.noticeTitle}>{notice.region}: {notice.area}</Text>
                <Text style={styles.noticeMeta}>
                  {new Date(notice.startTime).toLocaleString()} – {new Date(notice.endTime).toLocaleString()}
                </Text>
                <Text style={styles.noticeMeta}>Source: Kenya Power · fetched {new Date(notice.createdAt).toLocaleString()}</Text>
              </View>
            ))}
          </CardContent>
        </Card>

        <View style={styles.actions}>
          <Button title="View Map" variant="outline" style={styles.action} onPress={() => navigation.navigate('Map' as never)} />
          <Button title="Report Issue" style={styles.action} onPress={() => navigation.navigate('Report' as never)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
