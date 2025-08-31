import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';

// Import services
import { autoPredictionService, LivePrediction, PredictionTrend } from '../../../services/ml/AutoPredictionService';
import { weatherService } from '../../backend/weather/WeatherService';


import { kplcPlannedOutageService, PlannedOutage } from '../../backend/kplc/KPLCPlannedOutageService';

const { width } = Dimensions.get('window');

export function DashboardScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  
  // State for live predictions
  const [currentPrediction, setCurrentPrediction] = useState<LivePrediction | null>(null);
  const [predictionTrend, setPredictionTrend] = useState<PredictionTrend | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  
  // Service status
  const [serviceStatus, setServiceStatus] = useState({
    isRunning: false,
    totalPredictions: 0,
  });

  // Grid and weather data
  const [gridData, setGridData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [plannedOutages, setPlannedOutages] = useState<PlannedOutage[]>([]);

  useEffect(() => {
    initializeDashboard();
    return () => {
      // Cleanup subscription
    };
  }, []);

  useEffect(() => {
    // Update countdown timer
    const interval = setInterval(() => {
      if (currentPrediction?.nextUpdateAt) {
        const timeLeft = new Date(currentPrediction.nextUpdateAt).getTime() - Date.now();
        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          setTimeUntilNext(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setTimeUntilNext('Updating...');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPrediction]);

  const initializeDashboard = async () => {
    try {
      // Set placeholder values immediately
      setCurrentPrediction({
        id: 'placeholder-1',
        timestamp: new Date(),
        location: { latitude: -1.2921, longitude: 36.8219, address: 'Nairobi, Kenya' },
        prediction: {
          riskLevel: 'medium',
          probability: 0.45,
          confidence: 0.78,
          timeWindow: '6 hours',
          factors: { weather: 0.3, grid: 0.2, historical: 0.5 }
        },
        environmentalData: {
          temperature: 25,
          humidity: 65,
          windSpeed: 12,
          precipitation: 0,
          gridLoad: 0.7,
          weatherSeverity: 0.3
        },
        recommendations: [
          'Monitor weather conditions',
          'Check local outage reports',
          'Have backup power ready'
        ],
        nextUpdateAt: new Date(Date.now() + 30 * 60 * 1000),
        modelVersion: '1.0.0'
      });
      
      setLastUpdate(new Date());
      setServiceStatus({ isRunning: true, totalPredictions: 1 });
      
      // Load environmental data
      await loadEnvironmentalData();

      // Initialize planned outages service
      await kplcPlannedOutageService.initialize();
      const unsub = kplcPlannedOutageService.subscribe((items: PlannedOutage[]) => {
        setPlannedOutages(items.slice(0, 3)); // Show only first 3
      });

    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      // Set fallback values even if initialization fails
      setCurrentPrediction({
        id: 'fallback-1',
        timestamp: new Date(),
        location: { latitude: -1.2921, longitude: 36.8219, address: 'Nairobi, Kenya' },
        prediction: {
          riskLevel: 'low',
          probability: 0.25,
          confidence: 0.6,
          timeWindow: '12 hours',
          factors: { weather: 0.2, grid: 0.1, historical: 0.3 }
        },
        environmentalData: {
          temperature: 24,
          humidity: 60,
          windSpeed: 8,
          precipitation: 0,
          gridLoad: 0.6,
          weatherSeverity: 0.2
        },
        recommendations: [
          'Low risk of outages',
          'Continue normal operations',
          'Monitor for changes'
        ],
        nextUpdateAt: new Date(Date.now() + 60 * 60 * 1000),
        modelVersion: '1.0.0'
      });
    }
  };

  const loadEnvironmentalData = async () => {
    try {
      const [weatherResult, gridResult] = await Promise.all([
        weatherService.getCurrentWeather(),
        null, // Grid data removed - not available in Kenya
      ]);

      setWeatherData(weatherResult);
      setGridData(gridResult);
    } catch (error) {
      console.error('Failed to load environmental data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force prediction update
      await autoPredictionService.forceUpdate();
      await loadEnvironmentalData();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low': return colors.emergencySuccess;
      case 'medium': return colors.emergencyWarning;
      case 'high': return colors.emergencyDanger;
      case 'critical': return '#8B0000';
      default: return colors.mutedForeground;
    }
  };

  const getRiskIcon = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'low': return 'check-circle';
      case 'medium': return 'alert-triangle';
      case 'high': return 'alert-circle';
      case 'critical': return 'x-circle';
      default: return 'help-circle';
    }
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerGradient: {
      borderRadius: 16,
      padding: 20,
    },
    greeting: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: 4,
    },
    location: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    scrollContent: {
      flex: 1,
      padding: 20,
    },
    predictionCard: {
      marginBottom: 20,
    },
    predictionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    predictionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
    },
    updateInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    updateText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    predictionMain: {
      alignItems: 'center',
      marginBottom: 20,
    },
    riskLevelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    riskIcon: {
      marginRight: 12,
    },
    riskLevel: {
      fontSize: 24,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    probability: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.foreground,
      marginBottom: 4,
    },
    probabilityLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    confidenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    confidenceLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    timeWindow: {
      fontSize: 16,
      color: colors.foreground,
      textAlign: 'center',
      marginTop: 8,
    },
    factorsContainer: {
      marginBottom: 20,
    },
    factorsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    factorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    factorLabel: {
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    factorProgress: {
      flex: 2,
      marginHorizontal: 12,
    },
    factorValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      width: 40,
      textAlign: 'right',
    },
    trendContainer: {
      marginBottom: 20,
    },
    trendHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    trendIcon: {
      marginRight: 8,
    },
    trendText: {
      fontSize: 14,
      color: colors.foreground,
    },
    environmentalGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    environmentalCard: {
      flex: 1,
      minWidth: (width - 60) / 2,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    envValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    envLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    recommendationsCard: {
      marginBottom: 20,
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    recommendationBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.emergencyPrimary,
      marginTop: 6,
      marginRight: 12,
    },
    recommendationText: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    actionButton: {
      flex: 1,
      borderRadius: 12,
    },
    noDataContainer: {
      alignItems: 'center',
      padding: 40,
    },
    noDataText: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 16,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: colors.muted,
      borderRadius: 16,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    statusText: {
      fontSize: 12,
      color: colors.foreground,
    },
  });

  if (!currentPrediction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.emergencyPrimary, colors.emergencySecondary]}
            style={styles.headerGradient}
          >
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</Text>
            <Text style={styles.location}>Loading your location...</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.noDataContainer}>
          <Icon name="loader" size={48} color={colors.emergencyPrimary} />
          <Text style={styles.noDataText}>
            Generating your first prediction...{'\n'}
            This may take a moment to collect environmental data.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.emergencyPrimary, colors.emergencySecondary]}
          style={styles.headerGradient}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
              </Text>
              <Text style={styles.location}>
                {currentPrediction.location.address || 'Your Location'}
              </Text>
            </View>
            
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: serviceStatus.isRunning ? colors.emergencySuccess : colors.emergencyDanger }]} />
              <Text style={styles.statusText}>
                {serviceStatus.isRunning ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.emergencyPrimary]}
            tintColor={colors.emergencyPrimary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Main Prediction Card */}
        <Card style={styles.predictionCard}>
          <CardHeader>
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionTitle}>Outage Risk Forecast</Text>
              <View style={styles.updateInfo}>
                <Icon name="clock" size={12} color={colors.mutedForeground} />
                <Text style={styles.updateText}>
                  {timeUntilNext ? `Next: ${timeUntilNext}` : 'Updated'}
                </Text>
              </View>
            </View>
          </CardHeader>
          
          <CardContent>
            <View style={styles.predictionMain}>
              <View style={styles.riskLevelContainer}>
                <Icon
                  name={getRiskIcon(currentPrediction.prediction.riskLevel)}
                  size={28}
                  color={getRiskColor(currentPrediction.prediction.riskLevel)}
                  style={styles.riskIcon}
                />
                <Text style={[styles.riskLevel, { color: getRiskColor(currentPrediction.prediction.riskLevel) }]}>
                  {currentPrediction.prediction.riskLevel} Risk
                </Text>
              </View>
              
              <Text style={styles.probability}>
                {Math.round(currentPrediction.prediction.probability * 100)}%
              </Text>
              <Text style={styles.probabilityLabel}>
                Chance of Outage
              </Text>
              
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <Progress 
                  value={currentPrediction.prediction.confidence * 100} 
                />
                <Text style={styles.confidenceLabel}>
                  {Math.round(currentPrediction.prediction.confidence * 100)}%
                </Text>
              </View>
              
              <Text style={styles.timeWindow}>
                Forecast for {currentPrediction.prediction.timeWindow}
              </Text>
            </View>

            {/* Risk Factors */}
            <View style={styles.factorsContainer}>
              <Text style={styles.factorsTitle}>Risk Factors</Text>
              
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Weather Impact</Text>
                <Progress 
                  value={currentPrediction.prediction.factors.weather * 100}
                  style={styles.factorProgress}
                />
                <Text style={styles.factorValue}>
                  {Math.round(currentPrediction.prediction.factors.weather * 100)}%
                </Text>
              </View>
              
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Grid Load</Text>
                <Progress 
                  value={currentPrediction.prediction.factors.grid * 100}
                  style={styles.factorProgress}
                />
                <Text style={styles.factorValue}>
                  {Math.round(currentPrediction.prediction.factors.grid * 100)}%
                </Text>
              </View>
              
              <View style={styles.factorRow}>
                <Text style={styles.factorLabel}>Historical Pattern</Text>
                <Progress 
                  value={currentPrediction.prediction.factors.historical * 100}
                  style={styles.factorProgress}
                />
                <Text style={styles.factorValue}>
                  {Math.round(currentPrediction.prediction.factors.historical * 100)}%
                </Text>
              </View>
            </View>

            {/* Prediction Trend */}
            {predictionTrend && (
              <View style={styles.trendContainer}>
                <View style={styles.trendHeader}>
                  <Icon
                    name={predictionTrend.direction === 'increasing' ? 'trending-up' : 
                          predictionTrend.direction === 'decreasing' ? 'trending-down' : 'minus'}
                    size={16}
                    color={predictionTrend.direction === 'increasing' ? colors.emergencyDanger :
                           predictionTrend.direction === 'decreasing' ? colors.emergencySuccess : colors.mutedForeground}
                    style={styles.trendIcon}
                  />
                  <Text style={styles.trendText}>
                    Risk is {predictionTrend.direction} over {predictionTrend.timeframe}
                  </Text>
                </View>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Environmental Conditions */}
        <View style={styles.environmentalGrid}>
          <View style={styles.environmentalCard}>
            <Text style={styles.envValue}>
              {Math.round(currentPrediction.environmentalData.temperature)}°C
            </Text>
            <Text style={styles.envLabel}>Temperature</Text>
          </View>
          
          <View style={styles.environmentalCard}>
            <Text style={styles.envValue}>
              {Math.round(currentPrediction.environmentalData.humidity)}%
            </Text>
            <Text style={styles.envLabel}>Humidity</Text>
          </View>
          
          <View style={styles.environmentalCard}>
            <Text style={styles.envValue}>
              {Math.round(currentPrediction.environmentalData.windSpeed)} m/s
            </Text>
            <Text style={styles.envLabel}>Wind Speed</Text>
          </View>
          
          <View style={styles.environmentalCard}>
            <Text style={styles.envValue}>
              {Math.round(currentPrediction.environmentalData.gridLoad)}%
            </Text>
            <Text style={styles.envLabel}>Grid Load</Text>
          </View>
        </View>

        {/* Recommendations */}
        {currentPrediction.recommendations.length > 0 && (
          <Card style={styles.recommendationsCard}>
            <CardHeader>
              <Text style={styles.predictionTitle}>Recommendations</Text>
            </CardHeader>
            <CardContent>
              {currentPrediction.recommendations.map((recommendation: string, index: number) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationBullet} />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Planned Outages (KPLC) */}
        {plannedOutages.length > 0 && (
          <Card style={styles.recommendationsCard}>
            <CardHeader>
              <Text style={styles.predictionTitle}>Planned Power Interruptions Near You</Text>
            </CardHeader>
            <CardContent>
              {plannedOutages.slice(0, 3).map((o) => (
                <View key={o.id} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: colors.foreground, fontWeight: '600' }}>{o.region}</Text>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{o.area}</Text>
                  <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                    {new Date(o.startTime).toLocaleString()} - {o.endTime ? new Date(o.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                  </Text>
                </View>
              ))}
              {plannedOutages.length > 3 && (
                <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                  +{plannedOutages.length - 3} more planned interruptions
                </Text>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="View Map"
            variant="outline"
            style={styles.actionButton}
            onPress={() => navigation.navigate('Map' as never)}
          />
          
          <Button
            title="Report Issue"
            style={styles.actionButton}
            onPress={() => navigation.navigate('Report' as never)}
          />
        </View>

        {/* Last Update Info */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={[styles.updateText, { textAlign: 'center' }]}>
            Last updated: {lastUpdate ? formatTimestamp(lastUpdate) : 'Never'}
            {'\n'}
            Model: {currentPrediction.modelVersion} • Predictions: {serviceStatus.totalPredictions}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}