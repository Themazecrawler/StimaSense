import { logger } from '../../src/observability/logger';
import { OperationalModelUnavailableError } from './TensorFlowMLService';

export interface LivePrediction {
  id: string;
  timestamp: Date;
  location: { latitude: number; longitude: number; address?: string };
  prediction: {
    probability: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    timeWindow: string;
    factors: { weather: number; grid: number; historical: number };
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
  magnitude: number;
  confidence: number;
  timeframe: '1h' | '3h' | '6h' | '12h' | '24h';
}

class AutoPredictionService {
  async startAutoPredictions(): Promise<void> {
    logger.warn('prediction.scheduler_not_started', { reason: 'operational_model_unavailable' });
    throw new OperationalModelUnavailableError();
  }

  stopAutoPredictions(): void {}

  getCurrentPrediction(): null {
    return null;
  }

  getPredictionHistory(_limit?: number): LivePrediction[] {
    return [];
  }

  subscribe(_callback: (prediction: LivePrediction) => void): () => void {
    return () => undefined;
  }

  getPredictionTrends(_timeframe: PredictionTrend['timeframe'] = '6h'): null {
    return null;
  }

  async forceUpdate(): Promise<never> {
    throw new OperationalModelUnavailableError();
  }

  getStatus(): {
    isRunning: false;
    lastUpdate: null;
    nextUpdate: null;
    totalPredictions: 0;
    currentRiskLevel: null;
    reason: 'operational_model_unavailable';
  } {
    return {
      isRunning: false,
      lastUpdate: null,
      nextUpdate: null,
      totalPredictions: 0,
      currentRiskLevel: null,
      reason: 'operational_model_unavailable',
    };
  }
}

export const autoPredictionService = new AutoPredictionService();
export default AutoPredictionService;
