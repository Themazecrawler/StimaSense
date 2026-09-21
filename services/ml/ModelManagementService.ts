import { logger } from '../../src/observability/logger';

export interface ModelVersion {
  version: string;
  createdAt: Date;
  isActive: boolean;
  eligibility: 'research-only' | 'operational';
}

export interface TrainingSchedule {
  isEnabled: false;
  lastTraining: null;
  nextScheduled: null;
  trainingInProgress: false;
}

class ModelManagementService {
  async getModelVersions(): Promise<ModelVersion[]> {
    return [];
  }

  getTrainingSchedule(): TrainingSchedule {
    return { isEnabled: false, lastTraining: null, nextScheduled: null, trainingInProgress: false };
  }

  async triggerModelTraining(): Promise<null> {
    logger.warn('model.training_disabled', { reason: 'verified_kenyan_dataset_unavailable' });
    return null;
  }
}

export const modelManagementService = new ModelManagementService();
export default ModelManagementService;
