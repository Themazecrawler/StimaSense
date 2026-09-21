import { logger } from '../../src/observability/logger';
import { OutagePredictionResult } from '../ml/MLService';

export interface FullPredictionResult {
  prediction: OutagePredictionResult;
  lastUpdated: Date;
}

class PredictionService {
  async getPredictionForCurrentLocation(): Promise<null> {
    logger.warn('prediction.current_location_unavailable', { reason: 'operational_model_unavailable' });
    return null;
  }

  async getPredictionForLocation(
    _latitude: number,
    _longitude: number,
    _region = 'unknown',
  ): Promise<null> {
    logger.warn('prediction.location_unavailable', { reason: 'operational_model_unavailable' });
    return null;
  }

  async getBatchPredictions(locations: Array<{ latitude: number; longitude: number; region: string }>): Promise<Array<{
    location: { latitude: number; longitude: number; region: string };
    prediction: null;
  }>> {
    return locations.map(location => ({ location, prediction: null }));
  }

  async getPredictionTrend(): Promise<never[]> {
    return [];
  }

  async updatePredictionWithFeedback(): Promise<void> {
    logger.warn('prediction.feedback_not_linked_to_training');
  }

  async getPredictionAccuracy(): Promise<{
    overall: null;
    byTimeFrame: Record<string, never>;
    byRiskLevel: Record<string, never>;
    recent: null;
  }> {
    return { overall: null, byTimeFrame: {}, byRiskLevel: {}, recent: null };
  }
}

export const predictionService = new PredictionService();
export default PredictionService;
