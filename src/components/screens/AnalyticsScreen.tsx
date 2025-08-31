import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';

// Import services
import { modelManagementService, ModelMetrics, TrainingSchedule, ModelVersion } from '../../../services/ml/ModelManagementService';
import { modelFeedbackService } from '../../../services/ml/ModelFeedbackService';
import { autoPredictionService, LivePrediction } from '../../../services/ml/AutoPredictionService';
import { federatedLearningService } from '../../../services/ml/FederatedLearningService';

const { width } = Dimensions.get('window');

export function AnalyticsScreen() {
  const { colors } = useTheme();
  
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [trainingSchedule, setTrainingSchedule] = useState<TrainingSchedule | null>(null);
  const [activeModel, setActiveModel] = useState<ModelVersion | null>(null);
  const [trainingStats, setTrainingStats] = useState<any>(null);
  const [predictionStats, setPredictionStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const [
        metrics,
        schedule,
        model,
        stats,
        feedbackAnalytics,
        predictionHistory
      ] = await Promise.all([
        modelManagementService.getCurrentModelMetrics(),
        Promise.resolve(modelManagementService.getTrainingSchedule()),
        Promise.resolve(modelManagementService.getActiveModelVersion()),
        federatedLearningService.getTrainingDataStats(),
        modelFeedbackService.getFeedbackAnalytics(),
        Promise.resolve(autoPredictionService.getPredictionHistory(100))
      ]);

      setModelMetrics(metrics);
      setTrainingSchedule(schedule);
      setActiveModel(model);
      setTrainingStats(stats);
      
      // Process prediction statistics
      const riskLevelCounts = predictionHistory.reduce((acc: Record<string, number>, pred: LivePrediction) => {
        acc[pred.prediction.riskLevel] = (acc[pred.prediction.riskLevel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setPredictionStats({
        total: predictionHistory.length,
        riskLevelDistribution: riskLevelCounts,
        feedbackAnalytics,
      });

    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalyticsData();
    setIsRefreshing(false);
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      default: return 'minus';
    }
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'improving': return colors.emergencySuccess;
      case 'declining': return colors.emergencyDanger;
      default: return colors.mutedForeground;
    }
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
    headerTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    scrollContent: {
      flex: 1,
      padding: 20,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    metricCard: {
      flex: 1,
      minWidth: (width - 60) / 2,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    metricTrend: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    trendText: {
      fontSize: 11,
      marginLeft: 4,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    modelInfoCard: {
      marginBottom: 20,
    },
    modelInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    modelInfoLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    modelInfoValue: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: '500',
    },
    trainingCard: {
      marginBottom: 20,
    },
    trainingStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    trainingProgress: {
      marginBottom: 16,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressLabel: {
      fontSize: 14,
      color: colors.foreground,
    },
    progressValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    dataStatsGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    dataStatCard: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.muted,
      borderRadius: 8,
      alignItems: 'center',
    },
    dataStatValue: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    dataStatLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    predictionDistribution: {
      marginBottom: 20,
    },
    distributionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    distributionLabel: {
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    distributionBar: {
      flex: 2,
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: 4,
      marginHorizontal: 12,
      overflow: 'hidden',
    },
    distributionFill: {
      height: '100%',
      borderRadius: 4,
    },
    distributionValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      width: 30,
      textAlign: 'right',
    },
    performanceCard: {
      marginBottom: 20,
    },
    performanceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    performanceItem: {
      flex: 1,
      minWidth: (width - 60) / 3,
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    performanceValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    performanceLabel: {
      fontSize: 10,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.emergencyPrimary,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.mutedForeground,
      marginTop: 16,
    },
  });

  if (!modelMetrics || !trainingSchedule) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.emergencyPrimary, colors.emergencySecondary]}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>Model Analytics</Text>
            <Text style={styles.headerSubtitle}>Loading performance data...</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.loadingContainer}>
          <Icon name="bar-chart-2" size={48} color={colors.emergencyPrimary} />
          <Text style={styles.loadingText}>Gathering analytics data...</Text>
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
          <Text style={styles.headerTitle}>Model Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Performance insights and training metrics
          </Text>
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
        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatPercentage(modelMetrics.currentAccuracy)}
            </Text>
            <Text style={styles.metricLabel}>Model Accuracy</Text>
            <View style={styles.metricTrend}>
              <Icon 
                name={getTrendIcon(modelMetrics.accuracyTrend)} 
                size={12} 
                color={getTrendColor(modelMetrics.accuracyTrend)} 
              />
              <Text style={[styles.trendText, { color: getTrendColor(modelMetrics.accuracyTrend) }]}>
                {modelMetrics.accuracyTrend}
              </Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {modelMetrics.totalPredictions}
            </Text>
            <Text style={styles.metricLabel}>Total Predictions</Text>
            <Text style={[styles.trendText, { color: colors.emergencySuccess }]}>
              {modelMetrics.correctPredictions} correct
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatPercentage(modelMetrics.userSatisfactionScore)}
            </Text>
            <Text style={styles.metricLabel}>User Satisfaction</Text>
            <Text style={styles.trendText}>
              Based on feedback
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {modelMetrics.avgResponseTime}ms
            </Text>
            <Text style={styles.metricLabel}>Avg Response Time</Text>
            <Text style={[styles.trendText, { color: colors.emergencySuccess }]}>
              Excellent
            </Text>
          </View>
        </View>

        {/* Active Model Information */}
        <Card style={styles.modelInfoCard}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Active Model</Text>
          </CardHeader>
          <CardContent>
            {activeModel ? (
              <>
                <View style={styles.modelInfoRow}>
                  <Text style={styles.modelInfoLabel}>Version</Text>
                  <Badge variant="secondary">{activeModel.version}</Badge>
                </View>
                <View style={styles.modelInfoRow}>
                  <Text style={styles.modelInfoLabel}>Created</Text>
                  <Text style={styles.modelInfoValue}>
                    {formatDate(activeModel.createdAt)}
                  </Text>
                </View>
                <View style={styles.modelInfoRow}>
                  <Text style={styles.modelInfoLabel}>Training Data Size</Text>
                  <Text style={styles.modelInfoValue}>
                    {activeModel.trainingDataSize.toLocaleString()} samples
                  </Text>
                </View>
                <View style={styles.modelInfoRow}>
                  <Text style={styles.modelInfoLabel}>Model Size</Text>
                  <Text style={styles.modelInfoValue}>
                    {activeModel.modelSize} MB
                  </Text>
                </View>
                <View style={styles.modelInfoRow}>
                  <Text style={styles.modelInfoLabel}>F1 Score</Text>
                  <Text style={styles.modelInfoValue}>
                    {formatPercentage(activeModel.f1Score)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.modelInfoValue}>No active model found</Text>
            )}
          </CardContent>
        </Card>

        {/* Training Schedule */}
        <Card style={styles.trainingCard}>
          <CardHeader>
            <Text style={styles.sectionTitle}>Training Schedule</Text>
          </CardHeader>
          <CardContent>
            <View style={styles.trainingStatus}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: trainingSchedule.isEnabled ? colors.emergencySuccess : colors.emergencyDanger }
              ]} />
              <Text style={styles.statusText}>
                {trainingSchedule.isEnabled ? 'Automatic Training Enabled' : 'Training Disabled'}
              </Text>
            </View>

            <View style={styles.modelInfoRow}>
              <Text style={styles.modelInfoLabel}>Training Interval</Text>
              <Text style={styles.modelInfoValue}>
                Every {trainingSchedule.intervalHours} hours
              </Text>
            </View>

            <View style={styles.modelInfoRow}>
              <Text style={styles.modelInfoLabel}>Last Training</Text>
              <Text style={styles.modelInfoValue}>
                {formatDate(trainingSchedule.lastTraining)}
              </Text>
            </View>

            <View style={styles.modelInfoRow}>
              <Text style={styles.modelInfoLabel}>Next Scheduled</Text>
              <Text style={styles.modelInfoValue}>
                {formatDate(trainingSchedule.nextScheduled)}
              </Text>
            </View>

            {trainingSchedule.trainingInProgress && (
              <View style={styles.trainingProgress}>
                <Text style={styles.progressLabel}>Training in Progress...</Text>
                <Progress value={65} />
              </View>
            )}
          </CardContent>
        </Card>

        {/* Training Data Statistics */}
        {trainingStats && (
          <Card style={styles.section}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Training Data</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.dataStatsGrid}>
                <View style={styles.dataStatCard}>
                  <Text style={styles.dataStatValue}>
                    {trainingStats.totalDataPoints}
                  </Text>
                  <Text style={styles.dataStatLabel}>Total Samples</Text>
                </View>
                
                <View style={styles.dataStatCard}>
                  <Text style={styles.dataStatValue}>
                    {trainingStats.positiveExamples}
                  </Text>
                  <Text style={styles.dataStatLabel}>Outage Cases</Text>
                </View>
                
                <View style={styles.dataStatCard}>
                  <Text style={styles.dataStatValue}>
                    {trainingStats.negativeExamples}
                  </Text>
                  <Text style={styles.dataStatLabel}>Normal Cases</Text>
                </View>
                
                <View style={styles.dataStatCard}>
                  <Text style={styles.dataStatValue}>
                    {formatPercentage(trainingStats.dataQualityScore)}
                  </Text>
                  <Text style={styles.dataStatLabel}>Data Quality</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Prediction Distribution */}
        {predictionStats?.riskLevelDistribution && (
          <Card style={styles.predictionDistribution}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Risk Level Distribution</Text>
            </CardHeader>
            <CardContent>
              {Object.entries(predictionStats.riskLevelDistribution).map(([level, count]) => {
                const percentage = (count as number) / predictionStats.total;
                const colors_map = {
                  low: colors.emergencySuccess,
                  medium: colors.emergencyWarning,
                  high: colors.emergencyDanger,
                  critical: '#8B0000',
                };
                
                return (
                  <View key={level} style={styles.distributionItem}>
                    <Text style={styles.distributionLabel}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
                    <View style={styles.distributionBar}>
                      <View 
                        style={[
                          styles.distributionFill, 
                          { 
                            width: `${percentage * 100}%`, 
                            backgroundColor: colors_map[level as keyof typeof colors_map] || colors.mutedForeground 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.distributionValue}>{count as number}</Text>
                  </View>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        {activeModel && (
          <Card style={styles.performanceCard}>
            <CardHeader>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
            </CardHeader>
            <CardContent>
              <View style={styles.performanceGrid}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>
                    {activeModel.performanceMetrics.avgPredictionTime}ms
                  </Text>
                  <Text style={styles.performanceLabel}>Avg Prediction Time</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>
                    {activeModel.performanceMetrics.memoryUsage}MB
                  </Text>
                  <Text style={styles.performanceLabel}>Memory Usage</Text>
                </View>
                
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceValue}>
                    {activeModel.performanceMetrics.cpuUsage}%
                  </Text>
                  <Text style={styles.performanceLabel}>CPU Usage</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={async () => {
              try {
                await modelManagementService.triggerModelTraining('manual', 'User requested retraining');
                handleRefresh();
              } catch (error) {
                console.error('Manual training failed:', error);
              }
            }}
          >
            <Text style={styles.actionButtonText}>Retrain Model</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.emergencyWarning }]}
            onPress={async () => {
              try {
                const diagnostics = await modelManagementService.exportDiagnostics();
                console.log('Diagnostics exported:', diagnostics);
              } catch (error) {
                console.error('Export failed:', error);
              }
            }}
          >
            <Text style={styles.actionButtonText}>Export Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}