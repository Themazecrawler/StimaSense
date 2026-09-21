import {
  OperationalModelUnavailableError,
  TensorFlowMLService,
} from '../../../services/ml/TensorFlowMLService';

describe('TensorFlowMLService', () => {
  it('refuses inference when no operational artifact is installed', async () => {
    const service = new TensorFlowMLService();
    await expect(service.loadModel()).resolves.toBe(false);
    await expect(service.predict({
      weatherFeatures: [], gridFeatures: [], temporalFeatures: [], sequenceFeatures: [],
    })).rejects.toBeInstanceOf(OperationalModelUnavailableError);
    expect(service.getModelInfo()).toEqual({
      isLoaded: false,
      modelSize: 0,
      version: null,
      eligibility: 'unavailable',
    });
  });
});
