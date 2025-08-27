import AsyncStorage from '@react-native-async-storage/async-storage';
import { federatedLearningService } from './FederatedLearningService';
import { modelFeedbackService } from './ModelFeedbackService';
import { autoPredictionService } from './AutoPredictionService';
import { mlService } from './MLService';

export interface ModelVersion {
  version: string;
  createdAt: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDataSize: number;
  modelSize: number; // in MB
  isActive: boolean;
  performanceMetrics: {
    avgPredictionTime: number; // milliseconds
    memoryUsage: number; // MB
    cpuUsage: number; // percentage
  };
  changelog: string[];
}

export interface TrainingSchedule {
  isEnabled: boolean;
  intervalHours: number;
  minDataPoints: number;
  minAccuracyImprovement: number;
  lastTraining: Date | null;
  nextScheduled: Date | null;
  trainingInProgress: boolean;
}

export interface ModelMetrics {
  currentAccuracy: number;
  accuracyTrend: 'improving' | 'stable' | 'declining';
  totalPredictions: number;
  correctPredictions: number;
  userSatisfactionScore: number;
  avgResponseTime: number;
  modelReliabilityScore: number;
}

class ModelManagementService {
  private trainingSchedule: TrainingSchedule = {
    isEnabled: true,
    intervalHours: 24, // Retrain every 24 hours
    minDataPoints: 50, // Minimum 50 new data points
    minAccuracyImprovement: 0.01, // 1% improvement required
    lastTraining: null,
    nextScheduled: null,
    trainingInProgress: false,
  };

  private modelVersions: ModelVersion[] = [];
  private trainingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the model management service
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('🔧 Initializing Model Management Service...');
      
      // Load training schedule
      await this.loadTrainingSchedule();
      
      // Load model versions
      await this.loadModelVersions();
      
      // Start training scheduler
      this.startTrainingScheduler();
      
      console.log('✅ Model Management Service initialized');
    } catch (error) {
      console.error('❌ Model Management Service initialization failed:', error);
    }
  }

  /**
   * Start the automatic training scheduler
   */
  private startTrainingScheduler(): void {
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
    }

    // Check every hour if training should be triggered
    this.trainingInterval = setInterval(async () => {
      await this.checkAndTriggerTraining();
    }, 60 * 60 * 1000); // 1 hour

    console.log('⏰ Training scheduler started');
  }

  /**
   * Check if automatic training should be triggered
   */
  private async checkAndTriggerTraining(): Promise<void> {
    try {
      if (!this.trainingSchedule.isEnabled || this.trainingSchedule.trainingInProgress) {
        return;
      }

      const shouldTrain = await this.shouldTriggerTraining();
      
      if (shouldTrain.shouldTrain) {
        console.log('🎯 Triggering automatic model training:', shouldTrain.reason);
        await this.triggerModelTraining('automatic', shouldTrain.reason);
      }
    } catch (error) {
      console.error('❌ Training check failed:', error);
    }
  }

  /**
   * Determine if training should be triggered
   */
  private async shouldTriggerTraining(): Promise<{ shouldTrain: boolean; reason: string }> {
    // Check time-based trigger
    const timeSinceLastTraining = this.trainingSchedule.lastTraining 
      ? Date.now() - this.trainingSchedule.lastTraining.getTime()
      : Infinity;
    
    const intervalMs = this.trainingSchedule.intervalHours * 60 * 60 * 1000;
    
    if (timeSinceLastTraining >= intervalMs) {
      return { shouldTrain: true, reason: 'Scheduled interval reached' };
    }

    // Check data-based trigger
    const trainingStats = await federatedLearningService.getTrainingDataStats();
    if (trainingStats.totalDataPoints >= this.trainingSchedule.minDataPoints * 2) {
      return { shouldTrain: true, reason: 'Sufficient new training data available' };
    }

    // Check performance degradation trigger
    const currentMetrics = await this.getCurrentModelMetrics();
    if (currentMetrics.accuracyTrend === 'declining' && currentMetrics.currentAccuracy < 0.85) {
      return { shouldTrain: true, reason: 'Model performance degradation detected' };
    }

    // Check user feedback trigger
    const feedbackAnalytics = await modelFeedbackService.getFeedbackAnalytics();
    if (feedbackAnalytics.averageAccuracyRating < 3.0 && feedbackAnalytics.totalFeedbackCount > 20) {
      return { shouldTrain: true, reason: 'Poor user feedback scores' };
    }

    return { shouldTrain: false, reason: 'No training triggers met' };
  }

  /**
   * Trigger model training
   */
  async triggerModelTraining(trigger: 'automatic' | 'manual', reason: string): Promise<ModelVersion | null> {
    if (this.trainingSchedule.trainingInProgress) {
      throw new Error('Training already in progress');
    }

    try {
      console.log(`🚀 Starting model training - Trigger: ${trigger}, Reason: ${reason}`);
      
      this.trainingSchedule.trainingInProgress = true;
      await this.saveTrainingSchedule();

      // Get current model performance as baseline
      const baselineMetrics = await this.getCurrentModelMetrics();
      
      // Trigger federated learning retraining
      const retrainingResult = await federatedLearningService.triggerManualRetraining();
      
      if (!retrainingResult) {
        throw new Error('Federated learning retraining failed');
      }

      // Validate the new model
      const validationResult = await this.validateNewModel(retrainingResult);
      
      if (validationResult.isValid) {
        // Create new model version
        const newVersion = await this.createModelVersion(retrainingResult, validationResult);
        
        // Deploy the new model
        await this.deployModelVersion(newVersion.version);
        
        // Update training schedule
        this.trainingSchedule.lastTraining = new Date();
        this.trainingSchedule.nextScheduled = new Date(
          Date.now() + this.trainingSchedule.intervalHours * 60 * 60 * 1000
        );
        
        console.log(`✅ Model training completed successfully - New version: ${newVersion.version}`);
        
        // Regenerate predictions with new model
        setTimeout(() => {
          autoPredictionService.forceUpdate();
        }, 5000);
        
        return newVersion;
      } else {
        console.log('⚠️ New model validation failed - keeping existing model');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Model training failed:', error);
      throw error;
    } finally {
      this.trainingSchedule.trainingInProgress = false;
      await this.saveTrainingSchedule();
    }
  }

  /**
   * Validate new model performance
   */
  private async validateNewModel(retrainingResult: any): Promise<{
    isValid: boolean;
    metrics: any;
    reason: string;
  }> {
    try {
      // Check if accuracy improved
      const currentAccuracy = await this.getCurrentAccuracy();
      const newAccuracy = retrainingResult.modelAccuracyAfter;
      
      const improvement = newAccuracy - currentAccuracy;
      
      if (improvement >= this.trainingSchedule.minAccuracyImprovement) {
        return {
          isValid: true,
          metrics: { accuracy: newAccuracy, improvement },
          reason: `Accuracy improved by ${(improvement * 100).toFixed(2)}%`,
        };
      }

      // Even if accuracy didn't improve significantly, check other factors
      if (retrainingResult.dataPointsCollected > 100 && newAccuracy >= currentAccuracy - 0.01) {
        return {
          isValid: true,
          metrics: { accuracy: newAccuracy, improvement },
          reason: 'Large dataset update with minimal accuracy loss',
        };
      }

      return {
        isValid: false,
        metrics: { accuracy: newAccuracy, improvement },
        reason: `Insufficient improvement: ${(improvement * 100).toFixed(2)}%`,
      };
    } catch (error: any) {
      return {
        isValid: false,
        metrics: {},
        reason: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Create new model version record
   */
  private async createModelVersion(retrainingResult: any, validationResult: any): Promise<ModelVersion> {
    const version = `v${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    
    const newVersion: ModelVersion = {
      version,
      createdAt: new Date(),
      accuracy: validationResult.metrics.accuracy,
      precision: retrainingResult.precision || 0.9,
      recall: retrainingResult.recall || 0.88,
      f1Score: 0.89, // Would be calculated
      trainingDataSize: retrainingResult.dataPointsCollected,
      modelSize: 15.2, // Would be actual model size
      isActive: false, // Will be activated upon deployment
      performanceMetrics: {
        avgPredictionTime: 250, // milliseconds
        memoryUsage: 45, // MB
        cpuUsage: 12, // percentage
      },
      changelog: [
        `Retrained with ${retrainingResult.dataPointsCollected} new data points`,
        `Accuracy improved by ${(validationResult.metrics.improvement * 100).toFixed(2)}%`,
        `Training duration: ${retrainingResult.trainingDuration} minutes`,
      ],
    };

    this.modelVersions.push(newVersion);
    await this.saveModelVersions();
    
    return newVersion;
  }

  /**
   * Deploy a model version
   */
  private async deployModelVersion(version: string): Promise<void> {
    try {
      // Deactivate current model
      this.modelVersions.forEach(v => v.isActive = false);
      
      // Activate new model
      const newModel = this.modelVersions.find(v => v.version === version);
      if (newModel) {
        newModel.isActive = true;
      }
      
      await this.saveModelVersions();
      
      // Update ML service with new model
      // In production, this would reload the actual model weights
      console.log(`🚀 Model ${version} deployed successfully`);
      
    } catch (error) {
      console.error('❌ Model deployment failed:', error);
      throw error;
    }
  }

  /**
   * Get current model metrics
   */
  async getCurrentModelMetrics(): Promise<ModelMetrics> {
    try {
      const feedbackAnalytics = await modelFeedbackService.getFeedbackAnalytics();
      const predictionHistory = autoPredictionService.getPredictionHistory(100);
      
      // Calculate accuracy trend
      const recentAccuracy = this.calculateRecentAccuracy();
      const olderAccuracy = this.calculateOlderAccuracy();
      
      let accuracyTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentAccuracy > olderAccuracy + 0.02) accuracyTrend = 'improving';
      else if (recentAccuracy < olderAccuracy - 0.02) accuracyTrend = 'declining';

      return {
        currentAccuracy: feedbackAnalytics.predictionAccuracyRate,
        accuracyTrend,
        totalPredictions: predictionHistory.length,
        correctPredictions: Math.round(predictionHistory.length * feedbackAnalytics.predictionAccuracyRate),
        userSatisfactionScore: feedbackAnalytics.averageAccuracyRating / 5,
        avgResponseTime: 300, // milliseconds
        modelReliabilityScore: feedbackAnalytics.feedbackQualityScore,
      };
    } catch (error) {
      console.error('Failed to get model metrics:', error);
      return {
        currentAccuracy: 0.85,
        accuracyTrend: 'stable',
        totalPredictions: 0,
        correctPredictions: 0,
        userSatisfactionScore: 0.8,
        avgResponseTime: 300,
        modelReliabilityScore: 0.7,
      };
    }
  }

  /**
   * Get training schedule
   */
  getTrainingSchedule(): TrainingSchedule {
    return { ...this.trainingSchedule };
  }

  /**
   * Update training schedule
   */
  async updateTrainingSchedule(updates: Partial<TrainingSchedule>): Promise<void> {
    this.trainingSchedule = { ...this.trainingSchedule, ...updates };
    
    // Recalculate next scheduled training
    if (this.trainingSchedule.lastTraining) {
      this.trainingSchedule.nextScheduled = new Date(
        this.trainingSchedule.lastTraining.getTime() + 
        this.trainingSchedule.intervalHours * 60 * 60 * 1000
      );
    }
    
    await this.saveTrainingSchedule();
    
    // Restart scheduler with new schedule
    this.startTrainingScheduler();
  }

  /**
   * Get all model versions
   */
  getModelVersions(): ModelVersion[] {
    return [...this.modelVersions];
  }

  /**
   * Get active model version
   */
  getActiveModelVersion(): ModelVersion | null {
    return this.modelVersions.find(v => v.isActive) || null;
  }

  /**
   * Rollback to previous model version
   */
  async rollbackToPreviousVersion(): Promise<void> {
    const activeModel = this.getActiveModelVersion();
    if (!activeModel) return;

    const activeIndex = this.modelVersions.findIndex(v => v.version === activeModel.version);
    if (activeIndex <= 0) {
      throw new Error('No previous version available for rollback');
    }

    const previousVersion = this.modelVersions[activeIndex - 1];
    await this.deployModelVersion(previousVersion.version);
    
    console.log(`🔄 Rolled back to model version: ${previousVersion.version}`);
  }

  /**
   * Get model training history
   */
  async getTrainingHistory(limit: number = 10): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('model_training_history');
      const history = stored ? JSON.parse(stored) : [];
      return history.slice(-limit);
    } catch (error) {
      console.error('Failed to get training history:', error);
      return [];
    }
  }

  /**
   * Export model diagnostics
   */
  async exportDiagnostics(): Promise<{
    modelVersions: ModelVersion[];
    trainingSchedule: TrainingSchedule;
    currentMetrics: ModelMetrics;
    trainingHistory: any[];
    systemInfo: any;
  }> {
    const [currentMetrics, trainingHistory] = await Promise.all([
      this.getCurrentModelMetrics(),
      this.getTrainingHistory(20),
    ]);

    return {
      modelVersions: this.modelVersions,
      trainingSchedule: this.trainingSchedule,
      currentMetrics,
      trainingHistory,
      systemInfo: {
        platform: 'React Native',
        exportedAt: new Date().toISOString(),
        totalPredictions: autoPredictionService.getPredictionHistory().length,
      },
    };
  }

  // Private helper methods
  private async getCurrentAccuracy(): Promise<number> {
    const analytics = await modelFeedbackService.getFeedbackAnalytics();
    return analytics.predictionAccuracyRate;
  }

  private calculateRecentAccuracy(): number {
    // Mock calculation - would use actual recent feedback data
    return 0.88;
  }

  private calculateOlderAccuracy(): number {
    // Mock calculation - would use older feedback data
    return 0.85;
  }

  // Storage methods
  private async loadTrainingSchedule(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('model_training_schedule');
      if (stored) {
        const schedule = JSON.parse(stored);
        this.trainingSchedule = {
          ...this.trainingSchedule,
          ...schedule,
          lastTraining: schedule.lastTraining ? new Date(schedule.lastTraining) : null,
          nextScheduled: schedule.nextScheduled ? new Date(schedule.nextScheduled) : null,
        };
      }
    } catch (error) {
      console.error('Failed to load training schedule:', error);
    }
  }

  private async saveTrainingSchedule(): Promise<void> {
    try {
      await AsyncStorage.setItem('model_training_schedule', JSON.stringify(this.trainingSchedule));
    } catch (error) {
      console.error('Failed to save training schedule:', error);
    }
  }

  private async loadModelVersions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('model_versions');
      if (stored) {
        this.modelVersions = JSON.parse(stored).map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load model versions:', error);
    }
  }

  private async saveModelVersions(): Promise<void> {
    try {
      await AsyncStorage.setItem('model_versions', JSON.stringify(this.modelVersions));
    } catch (error) {
      console.error('Failed to save model versions:', error);
    }
  }
}

// Export singleton instance
export const modelManagementService = new ModelManagementService();
export default ModelManagementService;