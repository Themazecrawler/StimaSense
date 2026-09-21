import AsyncStorage from '@react-native-async-storage/async-storage';
import ModelFeedbackService from '../../../services/ml/ModelFeedbackService';

const storedPrediction = {
  id: 'prediction-1',
  timestamp: new Date(Date.now() - 60_000).toISOString(),
  location: { latitude: -1.2864, longitude: 36.8172 },
  weatherData: { temperature: 24 },
  result: { riskLevel: 'high' },
};

describe('ModelFeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async key => {
      if (key === 'prediction_history') {
        return JSON.stringify([storedPrediction]);
      }
      if (key === 'user_id') {
        return 'user-1';
      }
      return null;
    });
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists user feedback without treating it as a verified training label', async () => {
    const service = new ModelFeedbackService();

    await expect(
      service.submitPredictionFeedback(
        'prediction-1',
        true,
        5,
        { hadOutage: true, verificationSource: 'utility_api' },
        { confidence: 5, hasPhotos: true },
      ),
    ).resolves.toBe('prediction-1');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'model_feedback_data',
      expect.stringContaining('prediction-1'),
    );
    await expect(service.getFeedbackAnalytics()).resolves.toMatchObject({
      totalFeedbackCount: 1,
      averageAccuracyRating: 5,
      predictionAccuracyRate: 1,
    });
    await expect(service.exportFeedbackData('csv')).resolves.toContain('prediction-1');
    await expect(service.getPendingFeedbackRequests()).resolves.toEqual([]);
    await service.markFeedbackRequested('prediction-1');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'prediction_history',
      expect.stringContaining('feedbackRequested'),
    );
  });

  it('rejects feedback when its original prediction cannot be found', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const service = new ModelFeedbackService();

    await expect(
      service.submitPredictionFeedback('missing-prediction', false, 1),
    ).rejects.toThrow('Original prediction not found');
  });
});
