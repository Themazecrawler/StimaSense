import { logger } from '../../src/observability/logger';

export interface ModelInputs {
  weatherFeatures: number[];
  gridFeatures: number[];
  temporalFeatures: number[];
  sequenceFeatures: number[][];
}

export interface ModelOutputs {
  outageProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timeWindow: string;
}

export class OperationalModelUnavailableError extends Error {
  constructor() {
    super('No operational outage prediction model is installed');
    this.name = 'OperationalModelUnavailableError';
  }
}

export class TensorFlowMLService {
  async loadModel(): Promise<boolean> {
    logger.warn('model.operational_artifact_unavailable', { eligibility: 'research-only' });
    return false;
  }

  async predict(_inputs: ModelInputs): Promise<ModelOutputs> {
    throw new OperationalModelUnavailableError();
  }

  getModelInfo(): {
    isLoaded: boolean;
    modelSize: number;
    version: null;
    eligibility: 'unavailable';
  } {
    return { isLoaded: false, modelSize: 0, version: null, eligibility: 'unavailable' };
  }
}

export const tensorflowMLService = new TensorFlowMLService();
