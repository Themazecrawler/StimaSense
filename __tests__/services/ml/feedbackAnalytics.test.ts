import { calculateTrends, computeFeedbackAnalytics } from '../../../services/ml/feedbackAnalytics';
import type { FeedbackData } from '../../../services/ml/feedbackTypes';

const entry = (wasAccurate: boolean, hadOutage: boolean, rating = 4): FeedbackData => ({
  predictionId: 'p',
  timestamp: new Date(),
  predictionFeedback: { wasAccurate, accuracyRating: rating, confidenceInFeedback: 5, timeToFeedback: 10 },
  actualOutcome: { hadOutage, verificationSource: 'utility_api', verificationConfidence: 0.95 },
  context: {
    userLocation: { latitude: 0, longitude: 0 },
    reportMethod: 'manual',
    hasPhotos: false,
    hasAdditionalReports: false,
    weatherConditionsAtTime: null,
  },
});

describe('feedbackAnalytics', () => {
  it('returns zeroed analytics for empty input', () => {
    const result = computeFeedbackAnalytics([]);
    expect(result.totalFeedbackCount).toBe(0);
    expect(result.recentTrends.accuracyTrend).toBe('stable');
  });

  it('computes accuracy, false-positive and false-negative rates', () => {
    const result = computeFeedbackAnalytics([
      entry(true, true, 5),
      entry(true, true, 3),
      entry(false, false),
      entry(false, true),
    ]);
    expect(result.totalFeedbackCount).toBe(4);
    expect(result.predictionAccuracyRate).toBe(0.5);
    expect(result.averageAccuracyRating).toBe(4);
    expect(result.falsePositiveRate).toBe(1 / 3);
    expect(result.falseNegativeRate).toBe(1 / 3);
  });

  it('reports stable trends when there are fewer than 20 entries', () => {
    expect(calculateTrends([entry(true, true)]).accuracyTrend).toBe('stable');
  });

  it('detects an improving accuracy trend', () => {
    const data = [
      ...Array.from({ length: 10 }, () => entry(false, true)),
      ...Array.from({ length: 10 }, () => entry(true, true)),
    ];
    expect(calculateTrends(data).accuracyTrend).toBe('improving');
  });
});
