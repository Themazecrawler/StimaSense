export interface FeedbackData {
  predictionId: string;
  userId?: string;
  timestamp: Date;
  
  // User feedback on prediction accuracy
  predictionFeedback: {
    wasAccurate: boolean;
    accuracyRating: number; // 1-5 scale
    confidenceInFeedback: number; // 1-5 scale
    timeToFeedback: number; // minutes after prediction
  };
  
  // Actual outcome data
  actualOutcome: {
    hadOutage: boolean;
    outageDetails?: {
      startTime: Date;
      endTime?: Date;
      duration: number; // minutes
      cause: 'weather' | 'equipment' | 'overload' | 'maintenance' | 'unknown';
      severity: 'low' | 'medium' | 'high' | 'critical';
      affectedArea: string;
      estimatedCustomersAffected: number;
    };
    verificationSource: 'user_report' | 'utility_api' | 'news_report' | 'social_media' | 'app_users';
    verificationConfidence: number; // 0-1
  };
  
  // Additional context
  context: {
    userLocation: { latitude: number; longitude: number };
    reportMethod: 'manual' | 'automatic' | 'scheduled_check';
    hasPhotos: boolean;
    hasAdditionalReports: boolean; // Other users reporting same outage
    weatherConditionsAtTime: any;
  };
}

export interface FeedbackAnalytics {
  totalFeedbackCount: number;
  averageAccuracyRating: number;
  predictionAccuracyRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  avgTimeToFeedback: number; // minutes
  feedbackQualityScore: number; // 0-1
  userEngagementScore: number; // 0-1
  recentTrends: {
    accuracyTrend: 'improving' | 'stable' | 'declining';
    feedbackVolumeTrend: 'increasing' | 'stable' | 'decreasing';
  };
}
