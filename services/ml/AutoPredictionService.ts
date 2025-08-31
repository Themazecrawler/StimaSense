import AsyncStorage from '@react-native-async-storage/async-storage';
// TODO: replace with @react-native-community/geolocation
// import Geolocation from '@react-native-community/geolocation';
import { mlService } from './MLService';
import { weatherService } from '../../src/backend/weather/WeatherService';

import { federatedLearningService } from './FederatedLearningService';

export interface LivePrediction {
  id: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  prediction: {
    probability: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    timeWindow: string;
    factors: {
      weather: number;
      grid: number;
      historical: number;
    };
  };
  environmentalData: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    gridLoad: number;
    weatherSeverity: number;
  };
  recommendations: string[];
  nextUpdateAt: Date;
  modelVersion: string;
}

export interface PredictionTrend {
  direction: 'increasing' | 'stable' | 'decreasing';
  magnitude: number; // 0-1 scale
  confidence: number; // 0-1 scale
  timeframe: '1h' | '3h' | '6h' | '12h' | '24h';
}

class AutoPredictionService {
  private currentPrediction: LivePrediction | null = null;
  private predictionHistory: LivePrediction[] = [];
  private predictionInterval: NodeJS.Timeout | null = null;
  private subscribers: ((prediction: LivePrediction) => void)[] = [];
  private isRunning = false;
  private updateInterval = 15 * 60 * 1000; // 15 minutes
  private maxHistorySize = 1000;

  /**
   * Start automatic prediction service
   */
  async startAutoPredictions(): Promise<void> {
    if (this.isRunning) {
      console.log('Auto prediction service already running');
      return;
    }

    try {
      console.log('Starting autonomous prediction service...');
      
      // Load existing prediction history
      await this.loadPredictionHistory();
      
      // Generate initial prediction
      await this.generatePrediction();
      
      // Set up recurring predictions
      this.predictionInterval = setInterval(async () => {
        try {
          await this.generatePrediction();
        } catch (error) {
          console.error('Auto prediction failed:', error);
        }
      }, this.updateInterval);
      
      this.isRunning = true;
      console.log('Auto prediction service started successfully');
      
      // Start model training scheduler
      this.startModelTrainingScheduler();
      
    } catch (error) {
      console.error('Failed to start auto prediction service:', error);
      throw error;
    }
  }

  /**
   * Stop automatic prediction service
   */
  stopAutoPredictions(): void {
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval);
      this.predictionInterval = null;
    }
    this.isRunning = false;
    console.log('Auto prediction service stopped');
  }

  /**
   * Generate a new prediction automatically
   */
  private async generatePrediction(): Promise<LivePrediction> {
    try {
      console.log('Generating autonomous prediction...');
      
      // Get current location
      const location = await this.getCurrentLocation();
      
      // Collect environmental data
      const [weatherData, gridData] = await Promise.all([
        weatherService.getWeatherForLocation(location.latitude, location.longitude),
        null, // Grid data removed - not available in Kenya
      ]);

      // Prepare ML input
      const mlInput = {
        temperature: weatherData?.temperature || 20,
        humidity: weatherData?.humidity || 50,
        windSpeed: weatherData?.windSpeed || 5,
        precipitation: weatherData?.precipitation || 0,
        historicalOutages: await this.getHistoricalOutagesCount(location),
        gridLoad: (gridData as any)?.load || 70,
        timeOfDay: new Date().getHours() + new Date().getMinutes() / 60,
        dayOfWeek: new Date().getDay(),
        season: Math.floor((new Date().getMonth() + 1) / 3),
        location,
      };

      // Generate prediction using ML service
      const predictionResult = await mlService.predictOutage(mlInput);
      
      // Create live prediction object
      const livePrediction: LivePrediction = {
        id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date(),
        location,
        prediction: {
          probability: predictionResult.probability,
          confidence: predictionResult.confidence,
          riskLevel: predictionResult.riskLevel,
          timeWindow: predictionResult.timeWindow || 'next 6 hours',
          factors: predictionResult.factors,
        },
        environmentalData: {
          temperature: mlInput.temperature,
          humidity: mlInput.humidity,
          windSpeed: mlInput.windSpeed,
          precipitation: mlInput.precipitation,
          gridLoad: mlInput.gridLoad,
          weatherSeverity: this.calculateWeatherSeverity(mlInput),
        },
        recommendations: predictionResult.recommendations || [],
        nextUpdateAt: new Date(Date.now() + this.updateInterval),
        modelVersion: '1.0.0', // Would be actual model version
      };

      // Update current prediction
      this.currentPrediction = livePrediction;
      
      // Add to history
      this.predictionHistory.push(livePrediction);
      
      // Limit history size
      if (this.predictionHistory.length > this.maxHistorySize) {
        this.predictionHistory = this.predictionHistory.slice(-this.maxHistorySize);
      }
      
      // Save to storage
      await this.savePredictionHistory();
      
      // Notify subscribers
      this.notifySubscribers(livePrediction);
      
      // Store for federated learning
      await this.storePredictionForLearning(livePrediction);
      
      console.log(`Generated prediction: ${predictionResult.riskLevel} risk (${Math.round(predictionResult.probability * 100)}%)`);
      
      return livePrediction;
      
    } catch (error) {
      console.error('Prediction generation failed:', error);
      
      // Return fallback prediction
      const fallbackPrediction = await this.generateFallbackPrediction();
      this.currentPrediction = fallbackPrediction;
      this.notifySubscribers(fallbackPrediction);
      
      return fallbackPrediction;
    }
  }

  /**
   * Get current location for predictions
   */
  private async getCurrentLocation(): Promise<{ latitude: number; longitude: number; address?: string }> {
    try {
      const location = await new Promise<any>((resolve, reject) => {
        // Lazy import to avoid circulars
        const { default: Geolocation } = require('@react-native-community/geolocation');
        Geolocation.getCurrentPosition(
          (pos: any) => resolve(pos),
          (err: any) => reject(err),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
      });

      const result = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Try to get address
      (result as any).address = undefined;

      // Cache location
      await AsyncStorage.setItem('cached_location', JSON.stringify(result));

      return result;
      
    } catch (error) {
      console.error('Failed to get location:', error);
      
      // Return cached or default location
      const cachedLocation = await AsyncStorage.getItem('cached_location');
      return cachedLocation ? JSON.parse(cachedLocation) : {
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'Default Location',
      };
    }
  }

  /**
   * Calculate weather severity index
   */
  private calculateWeatherSeverity(input: any): number {
    let severity = 0;
    
    // Wind contribution (0-4 points)
    if (input.windSpeed > 25) severity += 4;
    else if (input.windSpeed > 20) severity += 3;
    else if (input.windSpeed > 15) severity += 2;
    else if (input.windSpeed > 10) severity += 1;
    
    // Precipitation contribution (0-3 points)
    if (input.precipitation > 20) severity += 3;
    else if (input.precipitation > 10) severity += 2;
    else if (input.precipitation > 5) severity += 1;
    
    // Temperature extremes (0-2 points)
    if (input.temperature < -10 || input.temperature > 40) severity += 2;
    else if (input.temperature < 0 || input.temperature > 35) severity += 1;
    
    return Math.min(severity, 10);
  }

  /**
   * Get historical outages count for location
   */
  private async getHistoricalOutagesCount(location: { latitude: number; longitude: number }): Promise<number> {
    try {
      // In a real implementation, this would query a database
      // For now, return a simulated value based on prediction history
      const recentPredictions = this.predictionHistory.filter(p => 
        Date.now() - new Date(p.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000 // Last 30 days
      );
      
      const highRiskPredictions = recentPredictions.filter(p => 
        p.prediction.riskLevel === 'high' || p.prediction.riskLevel === 'critical'
      );
      
      return Math.max(1, Math.floor(highRiskPredictions.length / 10)); // Estimate
    } catch (error) {
      return 1; // Default value
    }
  }

  /**
   * Generate fallback prediction when ML fails
   */
  private async generateFallbackPrediction(): Promise<LivePrediction> {
    const location = await this.getCurrentLocation();
    
    return {
      id: `fallback_${Date.now()}`,
      timestamp: new Date(),
      location,
      prediction: {
        probability: 0.15, // Low default risk
        confidence: 0.3,   // Low confidence
        riskLevel: 'low',
        timeWindow: 'next 6 hours',
        factors: {
          weather: 0.2,
          grid: 0.3,
          historical: 0.2,
        },
      },
      environmentalData: {
        temperature: 20,
        humidity: 50,
        windSpeed: 5,
        precipitation: 0,
        gridLoad: 70,
        weatherSeverity: 2,
      },
      recommendations: [
        'ML model temporarily unavailable',
        'Using fallback prediction',
        'Check back in 15 minutes for updated forecast',
      ],
      nextUpdateAt: new Date(Date.now() + this.updateInterval),
      modelVersion: 'fallback',
    };
  }

  /**
   * Store prediction for federated learning
   */
  private async storePredictionForLearning(prediction: LivePrediction): Promise<void> {
    try {
      // Store prediction for later verification and training
      const predictionRecord = {
        id: prediction.id,
        timestamp: prediction.timestamp,
        input: {
          temperature: prediction.environmentalData.temperature,
          humidity: prediction.environmentalData.humidity,
          windSpeed: prediction.environmentalData.windSpeed,
          precipitation: prediction.environmentalData.precipitation,
          gridLoad: prediction.environmentalData.gridLoad,
          timeOfDay: new Date().getHours() + new Date().getMinutes() / 60,
          dayOfWeek: new Date().getDay(),
          season: Math.floor((new Date().getMonth() + 1) / 3),
          location: prediction.location,
          historicalOutages: 1,
        },
        result: prediction.prediction,
        weatherData: prediction.environmentalData,
        verified: false,
      };

      // Store in prediction history for verification
      let storedPredictions = await AsyncStorage.getItem('prediction_history');
      const predictions = storedPredictions ? JSON.parse(storedPredictions) : [];
      predictions.push(predictionRecord);
      
      // Keep last 1000 predictions
      if (predictions.length > 1000) {
        predictions.splice(0, predictions.length - 1000);
      }
      
      await AsyncStorage.setItem('prediction_history', JSON.stringify(predictions));
      
    } catch (error) {
      console.error('Failed to store prediction for learning:', error);
    }
  }

  /**
   * Start model training scheduler
   */
  private startModelTrainingScheduler(): void {
    // Check for training opportunities every hour
    setInterval(async () => {
      try {
        await this.checkAndTriggerTraining();
      } catch (error) {
        console.error('Training scheduler error:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Check if model training should be triggered
   */
  private async checkAndTriggerTraining(): Promise<void> {
    try {
      const retrainingStatus = await federatedLearningService.getRetrainingStatus();
      
      // Trigger training if conditions are met
      if (retrainingStatus.canRetrainNow) {
        console.log('Triggering autonomous model retraining...');
        const result = await federatedLearningService.triggerManualRetraining();
        
        if (result) {
          console.log('Model retraining completed successfully');
          
          // Regenerate prediction with updated model
          setTimeout(() => {
            this.generatePrediction();
          }, 5000); // Wait 5 seconds for model to be available
        }
      }
    } catch (error) {
      console.error('Training check failed:', error);
    }
  }

  /**
   * Public API methods
   */
  
  /**
   * Get current live prediction
   */
  getCurrentPrediction(): LivePrediction | null {
    return this.currentPrediction;
  }

  /**
   * Get prediction history
   */
  getPredictionHistory(limit?: number): LivePrediction[] {
    if (limit) {
      return this.predictionHistory.slice(-limit);
    }
    return [...this.predictionHistory];
  }

  /**
   * Subscribe to prediction updates
   */
  subscribe(callback: (prediction: LivePrediction) => void): () => void {
    this.subscribers.push(callback);
    
    // Send current prediction immediately if available
    if (this.currentPrediction) {
      callback(this.currentPrediction);
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get prediction trends
   */
  getPredictionTrends(timeframe: '1h' | '3h' | '6h' | '12h' | '24h' = '6h'): PredictionTrend {
    const timeframeMs = {
      '1h': 60 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeframe];

    const cutoffTime = new Date(Date.now() - timeframeMs);
    const recentPredictions = this.predictionHistory.filter(p => 
      new Date(p.timestamp) > cutoffTime
    );

    if (recentPredictions.length < 2) {
      return {
        direction: 'stable',
        magnitude: 0,
        confidence: 0.5,
        timeframe,
      };
    }

    // Calculate trend
    const probabilities = recentPredictions.map(p => p.prediction.probability);
    const firstHalf = probabilities.slice(0, Math.floor(probabilities.length / 2));
    const secondHalf = probabilities.slice(Math.floor(probabilities.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    const magnitude = Math.abs(difference);

    return {
      direction: difference > 0.05 ? 'increasing' : difference < -0.05 ? 'decreasing' : 'stable',
      magnitude: Math.min(magnitude * 2, 1), // Scale to 0-1
      confidence: Math.min(recentPredictions.length / 10, 1), // More data = higher confidence
      timeframe,
    };
  }

  /**
   * Force immediate prediction update
   */
  async forceUpdate(): Promise<LivePrediction> {
    return await this.generatePrediction();
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    lastUpdate: Date | null;
    nextUpdate: Date | null;
    totalPredictions: number;
    currentRiskLevel: string | null;
  } {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.currentPrediction?.timestamp || null,
      nextUpdate: this.currentPrediction?.nextUpdateAt || null,
      totalPredictions: this.predictionHistory.length,
      currentRiskLevel: this.currentPrediction?.prediction.riskLevel || null,
    };
  }

  /**
   * Private helper methods
   */
  private notifySubscribers(prediction: LivePrediction): void {
    this.subscribers.forEach(callback => {
      try {
        callback(prediction);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    });
  }

  private async loadPredictionHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('auto_prediction_history');
      if (stored) {
        const history = JSON.parse(stored);
        this.predictionHistory = history.map((p: any) => ({
          ...p,
          timestamp: new Date(p.timestamp),
          nextUpdateAt: new Date(p.nextUpdateAt),
        }));
        
        // Set current prediction to the latest one
        if (this.predictionHistory.length > 0) {
          this.currentPrediction = this.predictionHistory[this.predictionHistory.length - 1];
        }
      }
    } catch (error) {
      console.error('Failed to load prediction history:', error);
    }
  }

  private async savePredictionHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('auto_prediction_history', JSON.stringify(this.predictionHistory));
    } catch (error) {
      console.error('Failed to save prediction history:', error);
    }
  }
}

// Export singleton instance
export const autoPredictionService = new AutoPredictionService();
export default AutoPredictionService;