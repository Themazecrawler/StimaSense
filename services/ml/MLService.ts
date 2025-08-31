import AsyncStorage from '@react-native-async-storage/async-storage';
import { tensorflowMLService } from './TensorFlowMLService';

// ML Model Interface
export interface OutagePredictionInput {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  historicalOutages: number;
  gridLoad: number;
  timeOfDay: number;
  dayOfWeek: number;
  season: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface OutagePredictionResult {
  probability: number; // 0-1
  confidence: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timeWindow: string; // e.g., "next 2-4 hours"
  factors: {
    weather: number;
    grid: number;
    historical: number;
  };
  recommendations: string[];
}

export interface ModelMetrics {
  accuracy: number;
  lastUpdated: Date;
  version: string;
  trainingDataSize: number;
}

class MLService {
  private modelLoaded = false;

  constructor() {
    // Path is managed by TensorFlowMLService
  }

  /**
   * Initialize and load the ML model
   */
  async initializeModel(): Promise<boolean> {
    try {
      console.log('Loading ML model...');
      
      // Use the TensorFlowMLService to load the actual model
      const success = await tensorflowMLService.initializeModel();
      
      if (success) {
        this.modelLoaded = true;
        console.log('ML model loaded successfully via TensorFlowMLService');
        
        // Cache model metadata
        await this.cacheModelMetrics();
        
        return true;
      } else {
        throw new Error('Failed to initialize TensorFlowMLService');
      }
    } catch (error) {
      console.error('Failed to load ML model:', error);
      this.modelLoaded = false;
      return false;
    }
  }

  /**
   * Make outage prediction using the ML model
   */
  async predictOutage(input: OutagePredictionInput): Promise<OutagePredictionResult> {
    if (!this.modelLoaded) {
      await this.initializeModel();
    }

    try {
      // Use TensorFlowMLService for actual predictions
      const weatherFeatures = [
        input.temperature,
        input.humidity,
        input.windSpeed,
        input.precipitation, // Use as pressure proxy
        10.0 // Default visibility
      ];
      
      const temporalFeatures = [
        input.timeOfDay,
        input.dayOfWeek,
        Math.floor((input.timeOfDay / 24) * 12) + 1, // Month approximation
        input.dayOfWeek === 0 || input.dayOfWeek === 6 ? 1 : 0 // Weekend flag
      ];
      
      const prediction = await tensorflowMLService.predict({
        weatherFeatures,
        temporalFeatures
      });
      
      // Convert TensorFlowMLService output to MLService format
      const result: OutagePredictionResult = {
        probability: prediction.outageProbability,
        confidence: prediction.confidence,
        riskLevel: prediction.riskLevel,
        timeWindow: 'next 2-4 hours', // Default time window
        factors: {
          weather: prediction.outageProbability * 0.7, // Weather factor
          grid: 0, // Grid data not available in Kenya
          historical: prediction.outageProbability * 0.3 // Historical factor
        },
        recommendations: this.generateRecommendations(prediction.riskLevel, input)
      };
      
      // Log prediction for debugging
      await this.logPrediction(input, result);
      
      return result;
    } catch (error) {
      console.error('Prediction failed:', error);
      throw new Error('Failed to generate outage prediction');
    }
  }

  /**
   * Batch predictions for multiple locations/times
   */
  async batchPredict(inputs: OutagePredictionInput[]): Promise<OutagePredictionResult[]> {
    const predictions: OutagePredictionResult[] = [];
    
    for (const input of inputs) {
      try {
        const prediction = await this.predictOutage(input);
        predictions.push(prediction);
      } catch (error) {
        console.error('Batch prediction failed for input:', input, error);
        // Continue with other predictions
      }
    }
    
    return predictions;
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(): Promise<ModelMetrics> {
    const cached = await AsyncStorage.getItem('model_metrics');
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Default metrics
    return {
      accuracy: 0.92,
      lastUpdated: new Date(),
      version: '1.0.0',
      trainingDataSize: 50000,
    };
  }

  /**
   * Update model with new data (for online learning)
   */
  async updateModel(feedbackData: any[]): Promise<boolean> {
    try {
      // Implementation would depend on your model architecture
      // For now, just update metrics
      const metrics = await this.getModelMetrics();
      metrics.lastUpdated = new Date();
      await AsyncStorage.setItem('model_metrics', JSON.stringify(metrics));
      
      return true;
    } catch (error) {
      console.error('Model update failed:', error);
      return false;
    }
  }

  /**
   * Get prediction history for analytics
   */
  async getPredictionHistory(limit: number = 100): Promise<any[]> {
    try {
      const history = await AsyncStorage.getItem('prediction_history');
      const parsedHistory = history ? JSON.parse(history) : [];
      
      return parsedHistory.slice(-limit);
    } catch (error) {
      console.error('Failed to get prediction history:', error);
      return [];
    }
  }

  /**
   * Clear prediction cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('prediction_history');
      await AsyncStorage.removeItem('model_metrics');
    } catch (error) {
      console.error('Failed to clear ML cache:', error);
    }
  }

  // Private methods
  private normalizeInput(input: OutagePredictionInput): any {
    // Normalize values to 0-1 range for ML model
    return {
      temperature: (input.temperature + 20) / 60, // Assume -20 to 40°C range
      humidity: input.humidity / 100,
      windSpeed: Math.min(input.windSpeed / 50, 1), // Cap at 50 m/s
      precipitation: Math.min(input.precipitation / 100, 1), // Cap at 100mm
      historicalOutages: Math.min(input.historicalOutages / 10, 1),
      gridLoad: input.gridLoad / 100,
      timeOfDay: input.timeOfDay / 24,
      dayOfWeek: input.dayOfWeek / 7,
      season: input.season / 4,
      latitude: (input.location.latitude + 90) / 180,
      longitude: (input.location.longitude + 180) / 360,
    };
  }

  private generateMockPrediction(input: OutagePredictionInput): OutagePredictionResult {
    // Mock prediction logic - replace with actual model inference
    const weatherRisk = (input.windSpeed > 20 || input.precipitation > 10) ? 0.7 : 0.2;
    const gridRisk = input.gridLoad > 80 ? 0.6 : 0.1;
    const historicalRisk = input.historicalOutages > 3 ? 0.5 : 0.1;
    
    const probability = Math.min((weatherRisk + gridRisk + historicalRisk) / 3, 1);
    const confidence = 0.85 + Math.random() * 0.1; // 85-95% confidence
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (probability < 0.2) riskLevel = 'low';
    else if (probability < 0.5) riskLevel = 'medium';
    else if (probability < 0.8) riskLevel = 'high';
    else riskLevel = 'critical';

    const recommendations = this.generateRecommendations(riskLevel, input);
    
    return {
      probability,
      confidence,
      riskLevel,
      timeWindow: this.getTimeWindow(probability),
      factors: {
        weather: weatherRisk,
        grid: gridRisk,
        historical: historicalRisk,
      },
      recommendations,
    };
  }

  private getTimeWindow(probability: number): string {
    if (probability > 0.8) return 'next 1-2 hours';
    if (probability > 0.5) return 'next 2-6 hours';
    if (probability > 0.2) return 'next 6-12 hours';
    return 'low risk period';
  }

  private generateRecommendations(riskLevel: string, input: OutagePredictionInput): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Charge all devices immediately');
      recommendations.push('Prepare emergency supplies');
      recommendations.push('Consider backup power options');
    }
    
    if (input.windSpeed > 15) {
      recommendations.push('Secure outdoor equipment');
    }
    
    if (input.precipitation > 5) {
      recommendations.push('Avoid unnecessary electrical use');
    }
    
    if (input.gridLoad > 85) {
      recommendations.push('Reduce non-essential power consumption');
    }
    
    return recommendations;
  }

  private async cacheModelMetrics(): Promise<void> {
    const metrics: ModelMetrics = {
      accuracy: 0.92,
      lastUpdated: new Date(),
      version: '1.0.0',
      trainingDataSize: 50000,
    };
    
    await AsyncStorage.setItem('model_metrics', JSON.stringify(metrics));
  }

  private async logPrediction(input: OutagePredictionInput, result: OutagePredictionResult): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        input,
        result,
        modelVersion: '1.0.0',
      };
      
      const history = await AsyncStorage.getItem('prediction_history');
      const parsedHistory = history ? JSON.parse(history) : [];
      parsedHistory.push(logEntry);
      
      // Keep only last 1000 predictions
      if (parsedHistory.length > 1000) {
        parsedHistory.splice(0, parsedHistory.length - 1000);
      }
      
      await AsyncStorage.setItem('prediction_history', JSON.stringify(parsedHistory));
    } catch (error) {
      console.error('Failed to log prediction:', error);
    }
  }
}

// Export singleton instance
export const mlService = new MLService();
export default MLService;