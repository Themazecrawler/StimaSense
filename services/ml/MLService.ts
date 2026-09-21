import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '../../src/observability/logger';
import { OperationalModelUnavailableError, tensorflowMLService } from './TensorFlowMLService';

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
  location: { latitude: number; longitude: number };
}

export interface OutagePredictionResult {
  probability: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timeWindow: string;
  factors: { weather: number; grid: number; historical: number };
  recommendations: string[];
}

export interface ModelMetrics {
  accuracy: null;
  lastUpdated: null;
  version: null;
  trainingDataSize: 0;
  eligibility: 'unavailable';
}

class MLService {
  async initializeModel(): Promise<boolean> {
    return tensorflowMLService.loadModel();
  }

  async predictOutage(_input: OutagePredictionInput): Promise<OutagePredictionResult> {
    logger.warn('prediction.rejected_without_operational_model');
    throw new OperationalModelUnavailableError();
  }

  async batchPredict(_inputs: OutagePredictionInput[]): Promise<OutagePredictionResult[]> {
    throw new OperationalModelUnavailableError();
  }

  async getModelMetrics(): Promise<ModelMetrics> {
    return {
      accuracy: null,
      lastUpdated: null,
      version: null,
      trainingDataSize: 0,
      eligibility: 'unavailable',
    };
  }

  async updateModel(_feedbackData: unknown[]): Promise<boolean> {
    logger.warn('model.update_rejected_without_verified_pipeline');
    return false;
  }

  async getPredictionHistory(_limit = 100): Promise<never[]> {
    return [];
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove(['prediction_history', 'model_metrics', 'auto_prediction_history']);
  }
}

export const mlService = new MLService();
export default MLService;
