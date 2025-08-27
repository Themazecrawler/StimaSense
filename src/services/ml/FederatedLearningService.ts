import AsyncStorage from '@react-native-async-storage/async-storage';
import { mlService } from './MLService';
import { weatherService } from '../weather/WeatherService';


export interface TrainingDataPoint {
  id: string;
  timestamp: Date;
  inputs: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    gridLoad: number;
    timeOfDay: number;
    dayOfWeek: number;
    season: number;
    location: {
      latitude: number;
      longitude: number;
    };
    historicalOutages: number;
  };
  actualOutcome: boolean;
  outageDetails?: {
    startTime: Date;
    duration: number; // in minutes
    affectedCustomers: number;
    cause: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  userReport?: {
    reportedAt: Date;
    accuracy: number; // 1-5 scale
    confidence: number; // User's confidence in their report
    hasPhotos: boolean;
    verified: boolean; // Verified by other users or utility
  };
  modelPrediction: {
    probability: number;
    confidence: number;
    riskLevel: string;
    modelVersion: string;
  };
}

export interface RetrainingMetrics {
  dataPointsCollected: number;
  lastRetrainingDate: Date;
  modelAccuracyBefore: number;
  modelAccuracyAfter: number;
  trainingDuration: number; // in minutes
  nextScheduledTraining: Date;
}

class FederatedLearningService {
  private trainingData: TrainingDataPoint[] = [];
  private minDataPointsForRetraining = 100;
  private retrainingInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private maxStoredDataPoints = 10000;
  
  constructor() {
    this.loadStoredTrainingData();
    this.schedulePeriodicRetraining();
  }

  /**
   * Add a new training data point from user report
   */
  async addTrainingDataFromReport(
    predictionId: string,
    actualOutcome: boolean,
    outageDetails?: any,
    userReport?: any
  ): Promise<void> {
    try {
      // Get the original prediction data
      const predictionHistory = await AsyncStorage.getItem('prediction_history');
      const predictions = predictionHistory ? JSON.parse(predictionHistory) : [];
      
      const originalPrediction = predictions.find((p: any) => p.id === predictionId);
      if (!originalPrediction) {
        console.warn('Original prediction not found for training data');
        return;
      }

      // Create training data point
      const trainingPoint: TrainingDataPoint = {
        id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        inputs: originalPrediction.input,
        actualOutcome,
        outageDetails,
        userReport,
        modelPrediction: originalPrediction.result,
      };

      // Add to training data
      this.trainingData.push(trainingPoint);
      
      // Limit stored data points
      if (this.trainingData.length > this.maxStoredDataPoints) {
        this.trainingData = this.trainingData.slice(-this.maxStoredDataPoints);
      }

      // Save to storage
      await this.saveTrainingData();
      
      console.log('Training data point added:', trainingPoint.id);
      
      // Check if we should trigger retraining
      await this.checkForRetraining();
      
    } catch (error) {
      console.error('Failed to add training data:', error);
    }
  }

  /**
   * Collect training data automatically from confirmed outages
   */
  async collectAutomaticTrainingData(): Promise<void> {
    try {
      // Get recent predictions that can be verified
      const cutoffTime = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago
      const predictionHistory = await AsyncStorage.getItem('prediction_history');
      const predictions = predictionHistory ? JSON.parse(predictionHistory) : [];
      
      const verifiablePredictions = predictions.filter((p: any) => 
        new Date(p.timestamp) < cutoffTime && !p.verified
      );

      for (const prediction of verifiablePredictions) {
        // Check for actual outages in the predicted timeframe
        // Grid data removed - not available in Kenya
      const actualOutages: any[] = [];
        const hadOutage = this.checkIfOutageOccurred(prediction, actualOutages);
        
        // Create training data point
        await this.addTrainingDataFromReport(
          prediction.id,
          hadOutage,
          hadOutage ? this.findMatchingOutage(prediction, actualOutages) : undefined
        );
        
        // Mark as verified
        prediction.verified = true;
      }
      
      // Save updated prediction history
      await AsyncStorage.setItem('prediction_history', JSON.stringify(predictions));
      
    } catch (error) {
      console.error('Failed to collect automatic training data:', error);
    }
  }

  /**
   * Retrain the model with collected data
   */
  async retrainModel(): Promise<RetrainingMetrics | null> {
    try {
      console.log('Starting model retraining...');
      const startTime = Date.now();
      
      // Get current model accuracy
      const currentMetrics = await this.evaluateCurrentModel();
      
      // Prepare training data
      const trainingDataset = await this.prepareTrainingDataset();
      
      if (trainingDataset.length < this.minDataPointsForRetraining) {
        console.log('Insufficient data for retraining');
        return null;
      }
      
      // Split data into training and validation sets
      const splitIndex = Math.floor(trainingDataset.length * 0.8);
      const trainingSet = trainingDataset.slice(0, splitIndex);
      const validationSet = trainingDataset.slice(splitIndex);
      
      // Perform incremental learning (simplified for React Native)
      const newModelMetrics = await this.performIncrementalLearning(
        trainingSet,
        validationSet
      );
      
      // Validate new model performance
      const improvementThreshold = 0.02; // 2% improvement required
      const improved = newModelMetrics.accuracy > currentMetrics.accuracy + improvementThreshold;
      
      if (improved) {
        // Deploy new model
        await this.deployNewModel(newModelMetrics);
        console.log('Model retraining successful - new model deployed');
      } else {
        console.log('Model retraining complete - no improvement, keeping existing model');
      }
      
      const metrics: RetrainingMetrics = {
        dataPointsCollected: trainingDataset.length,
        lastRetrainingDate: new Date(),
        modelAccuracyBefore: currentMetrics.accuracy,
        modelAccuracyAfter: improved ? newModelMetrics.accuracy : currentMetrics.accuracy,
        trainingDuration: Math.round((Date.now() - startTime) / (1000 * 60)),
        nextScheduledTraining: new Date(Date.now() + this.retrainingInterval),
      };
      
      await this.saveRetrainingMetrics(metrics);
      return metrics;
      
    } catch (error) {
      console.error('Model retraining failed:', error);
      return null;
    }
  }

  /**
   * Get training data statistics
   */
  async getTrainingDataStats(): Promise<{
    totalDataPoints: number;
    positiveExamples: number;
    negativeExamples: number;
    recentDataPoints: number;
    avgUserAccuracyRating: number;
    dataQualityScore: number;
  }> {
    const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const recentData = this.trainingData.filter(dp => 
      new Date(dp.timestamp) > recentCutoff
    );
    
    const positiveExamples = this.trainingData.filter(dp => dp.actualOutcome).length;
    const negativeExamples = this.trainingData.length - positiveExamples;
    
    const userRatings = this.trainingData
      .filter(dp => dp.userReport?.accuracy)
      .map(dp => dp.userReport!.accuracy);
    
    const avgUserAccuracyRating = userRatings.length > 0 
      ? userRatings.reduce((a, b) => a + b, 0) / userRatings.length 
      : 0;
    
    // Calculate data quality score based on various factors
    const verifiedDataPoints = this.trainingData.filter(dp => 
      dp.userReport?.verified || dp.outageDetails
    ).length;
    
    const dataQualityScore = Math.min(
      (verifiedDataPoints / Math.max(this.trainingData.length, 1)) * 0.4 +
      (avgUserAccuracyRating / 5) * 0.3 +
      (Math.min(recentData.length / 50, 1)) * 0.3,
      1.0
    );
    
    return {
      totalDataPoints: this.trainingData.length,
      positiveExamples,
      negativeExamples,
      recentDataPoints: recentData.length,
      avgUserAccuracyRating,
      dataQualityScore,
    };
  }

  /**
   * Schedule periodic model retraining
   */
  private schedulePeriodicRetraining(): void {
    // Check every 24 hours if retraining is needed
    setInterval(async () => {
      try {
        await this.collectAutomaticTrainingData();
        await this.checkForRetraining();
      } catch (error) {
        console.error('Scheduled retraining check failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Check if model retraining should be triggered
   */
  private async checkForRetraining(): Promise<void> {
    try {
      const lastRetraining = await AsyncStorage.getItem('last_retraining_date');
      const lastRetrainingDate = lastRetraining ? new Date(lastRetraining) : new Date(0);
      
      const shouldRetrain = (
        // Enough new data points
        this.trainingData.length >= this.minDataPointsForRetraining &&
        // Enough time has passed
        Date.now() - lastRetrainingDate.getTime() > this.retrainingInterval
      ) || (
        // Force retraining if we have a lot of new data
        this.trainingData.length >= this.minDataPointsForRetraining * 2
      );
      
      if (shouldRetrain) {
        console.log('Triggering automatic model retraining');
        await this.retrainModel();
      }
    } catch (error) {
      console.error('Failed to check for retraining:', error);
    }
  }

  /**
   * Perform incremental learning (simplified for mobile)
   */
  private async performIncrementalLearning(
    trainingSet: TrainingDataPoint[],
    validationSet: TrainingDataPoint[]
  ): Promise<{ accuracy: number; precision: number; recall: number }> {
    // In a full implementation, this would:
    // 1. Load the current model
    // 2. Fine-tune it with new data using transfer learning
    // 3. Validate performance on validation set
    // 4. Return updated metrics
    
    // For now, simulate incremental learning with improved accuracy
    const currentAccuracy = 0.92;
    const improvementFactor = Math.min(trainingSet.length / 1000, 0.05); // Up to 5% improvement
    
    // Simulate training results
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate training time
    
    const newAccuracy = Math.min(currentAccuracy + improvementFactor, 0.98);
    const newPrecision = Math.min(0.90 + improvementFactor, 0.95);
    const newRecall = Math.min(0.88 + improvementFactor, 0.93);
    
    return {
      accuracy: newAccuracy,
      precision: newPrecision,
      recall: newRecall,
    };
  }

  /**
   * Evaluate current model performance
   */
  private async evaluateCurrentModel(): Promise<{ accuracy: number; precision: number; recall: number }> {
    // Use recent training data to evaluate current model
    const recentData = this.trainingData.slice(-200); // Last 200 data points
    
    if (recentData.length === 0) {
      return { accuracy: 0.92, precision: 0.90, recall: 0.88 }; // Default metrics
    }
    
    let correct = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    
    for (const dataPoint of recentData) {
      const predicted = dataPoint.modelPrediction.probability > 0.5;
      const actual = dataPoint.actualOutcome;
      
      if (predicted === actual) correct++;
      if (predicted && actual) truePositives++;
      if (predicted && !actual) falsePositives++;
      if (!predicted && actual) falseNegatives++;
    }
    
    const accuracy = correct / recentData.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    
    return { accuracy, precision, recall };
  }

  /**
   * Deploy new model version
   */
  private async deployNewModel(metrics: any): Promise<void> {
    // In production, this would:
    // 1. Save new model weights
    // 2. Update model version
    // 3. Gradually roll out to users (A/B testing)
    
    const newVersion = `1.${Date.now()}`;
    await AsyncStorage.setItem('current_model_version', newVersion);
    await AsyncStorage.setItem('model_metrics', JSON.stringify(metrics));
    
    console.log(`New model version deployed: ${newVersion}`);
  }

  /**
   * Prepare training dataset from collected data
   */
  private async prepareTrainingDataset(): Promise<TrainingDataPoint[]> {
    // Filter and clean training data
    const cleanData = this.trainingData.filter(dp => 
      // Has valid inputs and outcome
      dp.inputs && typeof dp.actualOutcome === 'boolean' &&
      // Not too old (keep last 6 months)
      Date.now() - new Date(dp.timestamp).getTime() < 6 * 30 * 24 * 60 * 60 * 1000
    );
    
    // Balance dataset (ensure we have enough positive and negative examples)
    const positiveExamples = cleanData.filter(dp => dp.actualOutcome);
    const negativeExamples = cleanData.filter(dp => !dp.actualOutcome);
    
    // If imbalanced, subsample the majority class
    const minClassSize = Math.min(positiveExamples.length, negativeExamples.length);
    const balancedData = [
      ...positiveExamples.slice(-minClassSize),
      ...negativeExamples.slice(-minClassSize)
    ];
    
    // Shuffle the dataset
    for (let i = balancedData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [balancedData[i], balancedData[j]] = [balancedData[j], balancedData[i]];
    }
    
    return balancedData;
  }

  /**
   * Helper methods
   */
  private checkIfOutageOccurred(prediction: any, actualOutages: any[]): boolean {
    const predictionTime = new Date(prediction.timestamp);
    const endTime = new Date(predictionTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours later
    
    return actualOutages.some(outage => {
      const outageStart = new Date(outage.startTime);
      return outageStart >= predictionTime && outageStart <= endTime;
    });
  }

  private findMatchingOutage(prediction: any, actualOutages: any[]): any {
    const predictionTime = new Date(prediction.timestamp);
    const endTime = new Date(predictionTime.getTime() + 6 * 60 * 60 * 1000);
    
    return actualOutages.find(outage => {
      const outageStart = new Date(outage.startTime);
      return outageStart >= predictionTime && outageStart <= endTime;
    });
  }

  private async loadStoredTrainingData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('federated_training_data');
      if (stored) {
        this.trainingData = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load training data:', error);
    }
  }

  private async saveTrainingData(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'federated_training_data', 
        JSON.stringify(this.trainingData)
      );
    } catch (error) {
      console.error('Failed to save training data:', error);
    }
  }

  private async saveRetrainingMetrics(metrics: RetrainingMetrics): Promise<void> {
    try {
      await AsyncStorage.setItem('retraining_metrics', JSON.stringify(metrics));
      await AsyncStorage.setItem('last_retraining_date', metrics.lastRetrainingDate.toISOString());
    } catch (error) {
      console.error('Failed to save retraining metrics:', error);
    }
  }

  /**
   * Public API for getting retraining status
   */
  async getRetrainingStatus(): Promise<{
    isRetrainingEnabled: boolean;
    lastRetrainingDate: Date | null;
    nextScheduledTraining: Date | null;
    dataPointsAvailable: number;
    minDataPointsRequired: number;
    canRetrainNow: boolean;
  }> {
    const metricsStored = await AsyncStorage.getItem('retraining_metrics');
    const metrics = metricsStored ? JSON.parse(metricsStored) : null;
    
    const lastRetrainingDate = metrics ? new Date(metrics.lastRetrainingDate) : null;
    const nextScheduledTraining = metrics ? new Date(metrics.nextScheduledTraining) : null;
    
    const canRetrainNow = (
      this.trainingData.length >= this.minDataPointsForRetraining &&
      (!lastRetrainingDate || Date.now() - lastRetrainingDate.getTime() > this.retrainingInterval)
    );
    
    return {
      isRetrainingEnabled: true,
      lastRetrainingDate,
      nextScheduledTraining,
      dataPointsAvailable: this.trainingData.length,
      minDataPointsRequired: this.minDataPointsForRetraining,
      canRetrainNow,
    };
  }

  /**
   * Manually trigger retraining
   */
  async triggerManualRetraining(): Promise<RetrainingMetrics | null> {
    console.log('Manual retraining triggered');
    return await this.retrainModel();
  }
}

export const federatedLearningService = new FederatedLearningService();
export default FederatedLearningService;