import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '../../src/observability/logger';

export type VerifiedOutcomeSource = 'utility_api' | 'corroborated_reports';

export interface TrainingDataPoint {
  id: string;
  predictionId: string;
  actualOutcome: boolean;
  observedAt: string;
  source: VerifiedOutcomeSource;
}

export class UnverifiedOutcomeError extends Error {
  constructor() {
    super('Only authenticated utility outcomes or corroborated observations may become training labels');
    this.name = 'UnverifiedOutcomeError';
  }
}

class LocalModelFeedbackService {
  private readonly storageKey = 'verified_model_outcomes';

  async recordVerifiedOutcome(input: {
    predictionId: string;
    actualOutcome: boolean;
    observedAt: Date;
    source: VerifiedOutcomeSource;
  }): Promise<void> {
    if (!input.predictionId || !['utility_api', 'corroborated_reports'].includes(input.source)) {
      throw new UnverifiedOutcomeError();
    }

    const existing = await this.load();
    const point: TrainingDataPoint = {
      id: `verified_${Date.now()}`,
      predictionId: input.predictionId,
      actualOutcome: input.actualOutcome,
      observedAt: input.observedAt.toISOString(),
      source: input.source,
    };
    await AsyncStorage.setItem(this.storageKey, JSON.stringify([...existing, point].slice(-10_000)));
    logger.info('model.verified_outcome_recorded', { source: input.source });
  }

  async addTrainingDataFromReport(): Promise<never> {
    throw new UnverifiedOutcomeError();
  }

  async getTrainingDataStats(): Promise<{
    totalDataPoints: number;
    positiveExamples: number;
    negativeExamples: number;
    recentDataPoints: number;
    dataQualityScore: number;
  }> {
    const points = await this.load();
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const positiveExamples = points.filter(point => point.actualOutcome).length;
    return {
      totalDataPoints: points.length,
      positiveExamples,
      negativeExamples: points.length - positiveExamples,
      recentDataPoints: points.filter(point => Date.parse(point.observedAt) >= recentCutoff).length,
      dataQualityScore: points.length > 0 ? 1 : 0,
    };
  }

  private async load(): Promise<TrainingDataPoint[]> {
    const value = await AsyncStorage.getItem(this.storageKey);
    if (!value) return [];
    try {
      return JSON.parse(value) as TrainingDataPoint[];
    } catch (error) {
      logger.error('model.verified_outcome_storage_invalid', error);
      return [];
    }
  }
}

export const localModelFeedbackService = new LocalModelFeedbackService();
export default LocalModelFeedbackService;
