import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalModelFeedbackService from '../../../services/ml/LocalModelFeedbackService';

describe('LocalModelFeedbackService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects ordinary reports as training labels', async () => {
    const service = new LocalModelFeedbackService();
    await expect(service.addTrainingDataFromReport()).rejects.toThrow(
      'Only authenticated utility outcomes',
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('stores explicitly verified outcome provenance', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const service = new LocalModelFeedbackService();
    await service.recordVerifiedOutcome({
      predictionId: 'prediction-1',
      actualOutcome: true,
      observedAt: new Date('2026-09-21T12:00:00Z'),
      source: 'utility_api',
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'verified_model_outcomes',
      expect.stringContaining('utility_api'),
    );
  });
});
