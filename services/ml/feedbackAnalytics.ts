import type { FeedbackAnalytics, FeedbackData } from './feedbackTypes';

export function defaultFeedbackAnalytics(): FeedbackAnalytics {
  return {
    totalFeedbackCount: 0,
    averageAccuracyRating: 0,
    predictionAccuracyRate: 0,
    falsePositiveRate: 0,
    falseNegativeRate: 0,
    avgTimeToFeedback: 0,
    feedbackQualityScore: 0,
    userEngagementScore: 0,
    recentTrends: {
      accuracyTrend: 'stable',
      feedbackVolumeTrend: 'stable',
    },
  };
}

export function calculateTrends(feedbackData: FeedbackData[]): FeedbackAnalytics['recentTrends'] {
  // Simple trend calculation - compare recent vs older data
  const midpoint = Math.floor(feedbackData.length / 2);
  
  if (feedbackData.length < 20) {
    return { accuracyTrend: 'stable', feedbackVolumeTrend: 'stable' };
  }
  
  const olderData = feedbackData.slice(0, midpoint);
  const recentData = feedbackData.slice(midpoint);
  
  const olderAccuracy = olderData.filter(f => f.predictionFeedback.wasAccurate).length / olderData.length;
  const recentAccuracy = recentData.filter(f => f.predictionFeedback.wasAccurate).length / recentData.length;
  
  const accuracyTrend = 
    recentAccuracy > olderAccuracy + 0.05 ? 'improving' :
    recentAccuracy < olderAccuracy - 0.05 ? 'declining' : 'stable';
  
  // For volume trend, compare recent week to previous week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const recentWeekCount = feedbackData.filter(f => new Date(f.timestamp) > oneWeekAgo).length;
  const previousWeekCount = feedbackData.filter(f => 
    new Date(f.timestamp) > twoWeeksAgo && new Date(f.timestamp) <= oneWeekAgo
  ).length;
  
  const feedbackVolumeTrend = 
    recentWeekCount > previousWeekCount * 1.2 ? 'increasing' :
    recentWeekCount < previousWeekCount * 0.8 ? 'decreasing' : 'stable';
  
  return { accuracyTrend, feedbackVolumeTrend };
}

export function computeFeedbackAnalytics(filteredFeedback: FeedbackData[]): FeedbackAnalytics {
  if (filteredFeedback.length === 0) {
    return defaultFeedbackAnalytics();
  }

  // Calculate basic metrics
  const totalCount = filteredFeedback.length;
  const accuratePredictions = filteredFeedback.filter(f => f.predictionFeedback.wasAccurate).length;
  const averageRating = filteredFeedback.reduce((sum, f) => sum + f.predictionFeedback.accuracyRating, 0) / totalCount;
  const accuracyRate = accuratePredictions / totalCount;

  // Calculate false positive/negative rates
  const truePositives = filteredFeedback.filter(f => 
    f.actualOutcome.hadOutage && f.predictionFeedback.wasAccurate
  ).length;
  const falsePositives = filteredFeedback.filter(f => 
    !f.actualOutcome.hadOutage && !f.predictionFeedback.wasAccurate
  ).length;
  const falseNegatives = filteredFeedback.filter(f => 
    f.actualOutcome.hadOutage && !f.predictionFeedback.wasAccurate
  ).length;

  const totalPredictedOutages = truePositives + falsePositives;
  const totalActualOutages = truePositives + falseNegatives;

  const falsePositiveRate = totalPredictedOutages > 0 ? falsePositives / totalPredictedOutages : 0;
  const falseNegativeRate = totalActualOutages > 0 ? falseNegatives / totalActualOutages : 0;

  // Average time to feedback
  const avgTimeToFeedback = filteredFeedback.reduce(
    (sum, f) => sum + f.predictionFeedback.timeToFeedback, 0
  ) / totalCount;

  // Feedback quality score
  const avgConfidence = filteredFeedback.reduce(
    (sum, f) => sum + f.predictionFeedback.confidenceInFeedback, 0
  ) / totalCount;
  const verifiedFeedback = filteredFeedback.filter(f => 
    f.actualOutcome.verificationConfidence > 0.7
  ).length;
  const feedbackQualityScore = (avgConfidence / 5 * 0.5) + (verifiedFeedback / totalCount * 0.5);

  // User engagement score
  const recentFeedback = filteredFeedback.filter(f => 
    Date.now() - new Date(f.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
  ).length;
  const userEngagementScore = Math.min(recentFeedback / 10, 1); // Target: 10+ feedback per week

  // Calculate trends
  const trends = calculateTrends(filteredFeedback);

  return {
    totalFeedbackCount: totalCount,
    averageAccuracyRating: averageRating,
    predictionAccuracyRate: accuracyRate,
    falsePositiveRate,
    falseNegativeRate,
    avgTimeToFeedback,
    feedbackQualityScore,
    userEngagementScore,
    recentTrends: trends,
  };
}
