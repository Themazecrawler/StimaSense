import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../src/observability/logger';
import { computeFeedbackAnalytics } from './feedbackAnalytics';
import type { FeedbackAnalytics, FeedbackData } from './feedbackTypes';

export type { FeedbackAnalytics, FeedbackData } from './feedbackTypes';

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

      logger.info('model.feedback_submitted');
      return feedback.predictionId;

    } catch (error) {
      logger.error('model.feedback_submit_failed', error);
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
      logger.error('model.automatic_feedback_failed', error);
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
        logger.warn('model.feedback_import_item_skipped', { reason: error instanceof Error ? error.name : 'invalid_item' });
      }
    }

    logger.info('model.feedback_imported', { importedCount });
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

    return computeFeedbackAnalytics(filteredFeedback);
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
      logger.error('model.pending_feedback_load_failed', error);
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
      logger.error('model.feedback_request_update_failed', error);
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
      logger.error('model.feedback_export_failed', error);
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
      logger.error('model.original_prediction_load_failed', error);
      return null;
    }
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        userId = `local_user_${Date.now()}`;
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

  private calculateTimingAccuracy(_predictionId: string, _outageData: any): number {
    return 0;
  }

  private calculateSeverityMatch(_predictionId: string, _outageData: any): number {
    return 0;
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
      logger.error('model.feedback_storage_load_failed', error);
    }
  }

  private async saveFeedback(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'model_feedback_data',
        JSON.stringify(this.feedbackData)
      );
    } catch (error) {
      logger.error('model.feedback_storage_save_failed', error);
    }
  }
}

export const modelFeedbackService = new ModelFeedbackService();
export default ModelFeedbackService;
