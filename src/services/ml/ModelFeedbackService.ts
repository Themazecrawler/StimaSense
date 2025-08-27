import AsyncStorage from '@react-native-async-storage/async-storage';
import { federatedLearningService } from './FederatedLearningService';
import { mlService } from './MLService';

export interface FeedbackData {
  predictionId: string;
  userId?: string;
  timestamp: Date;
  
  // User feedback on prediction accuracy
  predictionFeedback: {
    wasAccurate: boolean;
    accuracyRating: number; // 1-5 scale
    confidenceInFeedback: number; // 1-5 scale
    timeToFeedback: number; // minutes after prediction
  };
  
  // Actual outcome data
  actualOutcome: {
    hadOutage: boolean;
    outageDetails?: {
      startTime: Date;
      endTime?: Date;
      duration: number; // minutes
      cause: 'weather' | 'equipment' | 'overload' | 'maintenance' | 'unknown';
      severity: 'low' | 'medium' | 'high' | 'critical';
      affectedArea: string;
      estimatedCustomersAffected: number;
    };
    verificationSource: 'user_report' | 'utility_api' | 'news_report' | 'social_media' | 'app_users';
    verificationConfidence: number; // 0-1
  };
  
  // Additional context
  context: {
    userLocation: { latitude: number; longitude: number };
    reportMethod: 'manual' | 'automatic' | 'scheduled_check';
    hasPhotos: boolean;
    hasAdditionalReports: boolean; // Other users reporting same outage
    weatherConditionsAtTime: any;
  };
}

export interface FeedbackAnalytics {
  totalFeedbackCount: number;
  averageAccuracyRating: number;
  predictionAccuracyRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  avgTimeToFeedback: number; // minutes
  feedbackQualityScore: number; // 0-1
  userEngagementScore: number; // 0-1
  recentTrends: {
    accuracyTrend: 'improving' | 'stable' | 'declining';
    feedbackVolumeTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

class ModelFeedbackService {
  private feedbackData: FeedbackData[] = [];
  private maxStoredFeedback = 5000;
  
  constructor() {
    this.loadStoredFeedback();
  }

  /**
   * Submit feedback for a prediction
   */
  async submitPredictionFeedback(
    predictionId: string,
    wasAccurate: boolean,
    accuracyRating: number,
    actualOutcomeData?: any,
    additionalContext?: any
  ): Promise<string> {
    try {
      // Get the original prediction
      const originalPrediction = await this.getOriginalPrediction(predictionId);
      if (!originalPrediction) {
        throw new Error('Original prediction not found');
      }

      // Create feedback entry
      const feedback: FeedbackData = {
        predictionId,
        userId: await this.getCurrentUserId(),
        timestamp: new Date(),
        predictionFeedback: {
          wasAccurate,
          accuracyRating,
          confidenceInFeedback: additionalContext?.confidence || 4,
          timeToFeedback: this.calculateTimeToFeedback(originalPrediction.timestamp),
        },
        actualOutcome: {
          hadOutage: actualOutcomeData?.hadOutage || !wasAccurate,
          outageDetails: actualOutcomeData?.outageDetails,
          verificationSource: actualOutcomeData?.verificationSource || 'user_report',
          verificationConfidence: this.calculateVerificationConfidence(actualOutcomeData),
        },
        context: {
          userLocation: originalPrediction.location,
          reportMethod: additionalContext?.reportMethod || 'manual',
          hasPhotos: additionalContext?.hasPhotos || false,
          hasAdditionalReports: additionalContext?.hasAdditionalReports || false,
          weatherConditionsAtTime: originalPrediction.weatherData,
        },
      };

      // Store feedback
      this.feedbackData.push(feedback);
      
      // Limit storage
      if (this.feedbackData.length > this.maxStoredFeedback) {
        this.feedbackData = this.feedbackData.slice(-this.maxStoredFeedback);
      }

      await this.saveFeedback();

      // Send to federated learning service
      await federatedLearningService.addTrainingDataFromReport(
        predictionId,
        feedback.actualOutcome.hadOutage,
        feedback.actualOutcome.outageDetails,
        {
          reportedAt: feedback.timestamp,
          accuracy: feedback.predictionFeedback.accuracyRating,
          confidence: feedback.predictionFeedback.confidenceInFeedback,
          hasPhotos: feedback.context.hasPhotos,
          verified: feedback.actualOutcome.verificationConfidence > 0.7,
        }
      );

      console.log('Feedback submitted successfully:', feedback.predictionId);
      return feedback.predictionId;

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  /**
   * Submit automatic feedback from confirmed outages
   */
  async submitAutomaticFeedback(
    predictionId: string,
    confirmedOutageData: any
  ): Promise<void> {
    try {
      const accuracyRating = this.calculateAutomaticAccuracyRating(
        predictionId,
        confirmedOutageData
      );

      await this.submitPredictionFeedback(
        predictionId,
        true, // Was accurate since outage was confirmed
        accuracyRating,
        {
          hadOutage: true,
          outageDetails: confirmedOutageData,
          verificationSource: 'utility_api',
        },
        {
          reportMethod: 'automatic',
          confidence: 5,
          hasAdditionalReports: true,
        }
      );

    } catch (error) {
      console.error('Failed to submit automatic feedback:', error);
    }
  }

  /**
   * Bulk import feedback from external sources
   */
  async importExternalFeedback(feedbackBatch: any[]): Promise<number> {
    let importedCount = 0;

    for (const externalFeedback of feedbackBatch) {
      try {
        await this.submitPredictionFeedback(
          externalFeedback.predictionId,
          externalFeedback.wasAccurate,
          externalFeedback.accuracyRating,
          externalFeedback.actualOutcome,
          {
            reportMethod: 'automatic',
            verificationSource: externalFeedback.source,
          }
        );
        importedCount++;
      } catch (error) {
        console.warn('Failed to import feedback item:', error);
      }
    }

    console.log(`Imported ${importedCount} feedback items`);
    return importedCount;
  }

  /**
   * Get feedback analytics
   */
  async getFeedbackAnalytics(timeRange?: { start: Date; end: Date }): Promise<FeedbackAnalytics> {
    const filteredFeedback = timeRange 
      ? this.feedbackData.filter(f => 
          new Date(f.timestamp) >= timeRange.start && 
          new Date(f.timestamp) <= timeRange.end
        )
      : this.feedbackData;

    if (filteredFeedback.length === 0) {
      return this.getDefaultAnalytics();
    }

    // Calculate basic metrics
    const totalCount = filteredFeedback.length;
    const accuratePredictions = filteredFeedback.filter(f => f.predictionFeedback.wasAccurate).length;
    const averageRating = filteredFeedback.reduce((sum, f) => sum + f.predictionFeedback.accuracyRating, 0) / totalCount;
    const accuracyRate = accuratePredictions / totalCount;

    // Calculate false positive/negative rates
    const truePositives = filteredFeedback.filter(f => 
      f.actualOutcome.hadOutage && f.predictionFeedback.wasAccurate
    ).length;
    const falsePositives = filteredFeedback.filter(f => 
      !f.actualOutcome.hadOutage && !f.predictionFeedback.wasAccurate
    ).length;
    const falseNegatives = filteredFeedback.filter(f => 
      f.actualOutcome.hadOutage && !f.predictionFeedback.wasAccurate
    ).length;

    const totalPredictedOutages = truePositives + falsePositives;
    const totalActualOutages = truePositives + falseNegatives;

    const falsePositiveRate = totalPredictedOutages > 0 ? falsePositives / totalPredictedOutages : 0;
    const falseNegativeRate = totalActualOutages > 0 ? falseNegatives / totalActualOutages : 0;

    // Average time to feedback
    const avgTimeToFeedback = filteredFeedback.reduce(
      (sum, f) => sum + f.predictionFeedback.timeToFeedback, 0
    ) / totalCount;

    // Feedback quality score
    const avgConfidence = filteredFeedback.reduce(
      (sum, f) => sum + f.predictionFeedback.confidenceInFeedback, 0
    ) / totalCount;
    const verifiedFeedback = filteredFeedback.filter(f => 
      f.actualOutcome.verificationConfidence > 0.7
    ).length;
    const feedbackQualityScore = (avgConfidence / 5 * 0.5) + (verifiedFeedback / totalCount * 0.5);

    // User engagement score
    const recentFeedback = filteredFeedback.filter(f => 
      Date.now() - new Date(f.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    ).length;
    const userEngagementScore = Math.min(recentFeedback / 10, 1); // Target: 10+ feedback per week

    // Calculate trends
    const trends = this.calculateTrends(filteredFeedback);

    return {
      totalFeedbackCount: totalCount,
      averageAccuracyRating: averageRating,
      predictionAccuracyRate: accuracyRate,
      falsePositiveRate,
      falseNegativeRate,
      avgTimeToFeedback,
      feedbackQualityScore,
      userEngagementScore,
      recentTrends: trends,
    };
  }

  /**
   * Get pending feedback requests
   */
  async getPendingFeedbackRequests(): Promise<Array<{
    predictionId: string;
    predictionTime: Date;
    timeElapsed: number; // hours
    location: { latitude: number; longitude: number };
    riskLevel: string;
    priority: 'high' | 'medium' | 'low';
  }>> {
    try {
      // Get recent predictions without feedback
      const predictionHistory = await AsyncStorage.getItem('prediction_history');
      const predictions = predictionHistory ? JSON.parse(predictionHistory) : [];
      
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const pendingPredictions = predictions.filter((p: any) => 
        new Date(p.timestamp) > cutoffTime && 
        !this.hasFeedback(p.id) &&
        !p.feedbackRequested
      );

      return pendingPredictions.map((p: any) => ({
        predictionId: p.id,
        predictionTime: new Date(p.timestamp),
        timeElapsed: (Date.now() - new Date(p.timestamp).getTime()) / (1000 * 60 * 60),
        location: p.location,
        riskLevel: p.result.riskLevel,
        priority: this.calculateFeedbackPriority(p),
      }));

    } catch (error) {
      console.error('Failed to get pending feedback requests:', error);
      return [];
    }
  }

  /**
   * Mark prediction as feedback requested to avoid spam
   */
  async markFeedbackRequested(predictionId: string): Promise<void> {
    try {
      const predictionHistory = await AsyncStorage.getItem('prediction_history');
      const predictions = predictionHistory ? JSON.parse(predictionHistory) : [];
      
      const prediction = predictions.find((p: any) => p.id === predictionId);
      if (prediction) {
        prediction.feedbackRequested = true;
        prediction.feedbackRequestedAt = new Date().toISOString();
        await AsyncStorage.setItem('prediction_history', JSON.stringify(predictions));
      }
    } catch (error) {
      console.error('Failed to mark feedback requested:', error);
    }
  }

  /**
   * Export feedback data for analysis
   */
  async exportFeedbackData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      if (format === 'json') {
        return JSON.stringify(this.feedbackData, null, 2);
      } else {
        // Convert to CSV format
        const headers = [
          'predictionId', 'timestamp', 'wasAccurate', 'accuracyRating',
          'hadOutage', 'verificationSource', 'timeToFeedback'
        ];
        
        const csvData = this.feedbackData.map(f => [
          f.predictionId,
          f.timestamp.toISOString(),
          f.predictionFeedback.wasAccurate,
          f.predictionFeedback.accuracyRating,
          f.actualOutcome.hadOutage,
          f.actualOutcome.verificationSource,
          f.predictionFeedback.timeToFeedback
        ]);
        
        return [headers, ...csvData].map(row => row.join(',')).join('\n');
      }
    } catch (error) {
      console.error('Failed to export feedback data:', error);
      return '';
    }
  }

  // Private methods
  private async getOriginalPrediction(predictionId: string): Promise<any> {
    try {
      const predictionHistory = await AsyncStorage.getItem('prediction_history');
      const predictions = predictionHistory ? JSON.parse(predictionHistory) : [];
      return predictions.find((p: any) => p.id === predictionId);
    } catch (error) {
      console.error('Failed to get original prediction:', error);
      return null;
    }
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('user_id', userId);
      }
      return userId;
    } catch (error) {
      return 'anonymous';
    }
  }

  private calculateTimeToFeedback(predictionTimestamp: string): number {
    return Math.round((Date.now() - new Date(predictionTimestamp).getTime()) / (1000 * 60));
  }

  private calculateVerificationConfidence(actualOutcomeData: any): number {
    if (!actualOutcomeData) return 0.3; // Low confidence for user report only
    
    const sourceConfidence = {
      'utility_api': 0.95,
      'user_report': 0.6,
      'news_report': 0.8,
      'social_media': 0.4,
      'app_users': 0.7,
    };
    
    const sourceKey = ((actualOutcomeData as any)?.verificationSource ?? 'user_report') as keyof typeof sourceConfidence;
    const baseConfidence = (sourceConfidence as any)[sourceKey] ?? 0.3;
    
    // Increase confidence if multiple sources or detailed data
    let adjustedConfidence = baseConfidence;
    if (actualOutcomeData.hasAdditionalReports) adjustedConfidence += 0.1;
    if (actualOutcomeData.outageDetails) adjustedConfidence += 0.1;
    
    return Math.min(adjustedConfidence, 1.0);
  }

  private calculateAutomaticAccuracyRating(predictionId: string, outageData: any): number {
    // Calculate accuracy based on how well the prediction matched the actual outage
    let rating = 3; // Base rating
    
    // Adjust based on timing accuracy
    const timingAccuracy = this.calculateTimingAccuracy(predictionId, outageData);
    rating += timingAccuracy;
    
    // Adjust based on severity matching
    const severityMatch = this.calculateSeverityMatch(predictionId, outageData);
    rating += severityMatch;
    
    return Math.max(1, Math.min(5, Math.round(rating)));
  }

  private calculateTimingAccuracy(predictionId: string, outageData: any): number {
    // Simplified timing accuracy calculation
    // In reality, would compare predicted time window with actual outage time
    return Math.random() > 0.5 ? 1 : 0;
  }

  private calculateSeverityMatch(predictionId: string, outageData: any): number {
    // Simplified severity matching
    // In reality, would compare predicted severity with actual severity
    return Math.random() > 0.5 ? 1 : 0;
  }

  private hasFeedback(predictionId: string): boolean {
    return this.feedbackData.some(f => f.predictionId === predictionId);
  }

  private calculateFeedbackPriority(prediction: any): 'high' | 'medium' | 'low' {
    if (prediction.result.riskLevel === 'critical' || prediction.result.riskLevel === 'high') {
      return 'high';
    } else if (prediction.result.riskLevel === 'medium') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateTrends(feedbackData: FeedbackData[]): {
    accuracyTrend: 'improving' | 'stable' | 'declining';
    feedbackVolumeTrend: 'increasing' | 'stable' | 'decreasing';
  } {
    // Simple trend calculation - compare recent vs older data
    const midpoint = Math.floor(feedbackData.length / 2);
    
    if (feedbackData.length < 20) {
      return { accuracyTrend: 'stable', feedbackVolumeTrend: 'stable' };
    }
    
    const olderData = feedbackData.slice(0, midpoint);
    const recentData = feedbackData.slice(midpoint);
    
    const olderAccuracy = olderData.filter(f => f.predictionFeedback.wasAccurate).length / olderData.length;
    const recentAccuracy = recentData.filter(f => f.predictionFeedback.wasAccurate).length / recentData.length;
    
    const accuracyTrend = 
      recentAccuracy > olderAccuracy + 0.05 ? 'improving' :
      recentAccuracy < olderAccuracy - 0.05 ? 'declining' : 'stable';
    
    // For volume trend, compare recent week to previous week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const recentWeekCount = feedbackData.filter(f => new Date(f.timestamp) > oneWeekAgo).length;
    const previousWeekCount = feedbackData.filter(f => 
      new Date(f.timestamp) > twoWeeksAgo && new Date(f.timestamp) <= oneWeekAgo
    ).length;
    
    const feedbackVolumeTrend = 
      recentWeekCount > previousWeekCount * 1.2 ? 'increasing' :
      recentWeekCount < previousWeekCount * 0.8 ? 'decreasing' : 'stable';
    
    return { accuracyTrend, feedbackVolumeTrend };
  }

  private getDefaultAnalytics(): FeedbackAnalytics {
    return {
      totalFeedbackCount: 0,
      averageAccuracyRating: 0,
      predictionAccuracyRate: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      avgTimeToFeedback: 0,
      feedbackQualityScore: 0,
      userEngagementScore: 0,
      recentTrends: {
        accuracyTrend: 'stable',
        feedbackVolumeTrend: 'stable',
      },
    };
  }

  private async loadStoredFeedback(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('model_feedback_data');
      if (stored) {
        this.feedbackData = JSON.parse(stored).map((f: any) => ({
          ...f,
          timestamp: new Date(f.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    }
  }

  private async saveFeedback(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'model_feedback_data',
        JSON.stringify(this.feedbackData)
      );
    } catch (error) {
      console.error('Failed to save feedback data:', error);
    }
  }
}

export const modelFeedbackService = new ModelFeedbackService();
export default ModelFeedbackService;