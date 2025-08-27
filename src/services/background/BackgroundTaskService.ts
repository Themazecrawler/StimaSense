import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { federatedLearningService } from '../ml/FederatedLearningService';
import { modelFeedbackService } from '../ml/ModelFeedbackService';
import { weatherService } from '../weather/WeatherService';


export interface BackgroundTaskConfig {
  taskId: string;
  enabled: boolean;
  interval: number; // milliseconds
  lastRun: Date | null;
  priority: 'high' | 'medium' | 'low';
  requiresNetwork: boolean;
  requiresCharging: boolean;
  runOnlyWhenIdle: boolean;
}

export interface BackgroundTaskResult {
  taskId: string;
  success: boolean;
  duration: number; // milliseconds
  error?: string;
  data?: any;
}

class BackgroundTaskService {
  private tasks: Map<string, BackgroundTaskConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isAppInBackground = false;
  private isCharging = false; // Would be detected via battery API
  private isNetworkAvailable = true; // Would be detected via NetInfo

  constructor() {
    this.initializeDefaultTasks();
    this.setupAppStateListener();
    this.startTaskScheduler();
  }

  /**
   * Initialize default background tasks
   */
  private initializeDefaultTasks(): void {
    // Model retraining task
    this.registerTask({
      taskId: 'model_retraining',
      enabled: true,
      interval: 6 * 60 * 60 * 1000, // 6 hours
      lastRun: null,
      priority: 'high',
      requiresNetwork: true,
      requiresCharging: false,
      runOnlyWhenIdle: true,
    }, this.performModelRetraining.bind(this));

    // Automatic feedback collection
    this.registerTask({
      taskId: 'feedback_collection',
      enabled: true,
      interval: 2 * 60 * 60 * 1000, // 2 hours
      lastRun: null,
      priority: 'medium',
      requiresNetwork: true,
      requiresCharging: false,
      runOnlyWhenIdle: false,
    }, this.collectFeedbackData.bind(this));

    // Training data cleanup
    this.registerTask({
      taskId: 'data_cleanup',
      enabled: true,
      interval: 24 * 60 * 60 * 1000, // 24 hours
      lastRun: null,
      priority: 'low',
      requiresNetwork: false,
      requiresCharging: false,
      runOnlyWhenIdle: true,
    }, this.cleanupOldData.bind(this));

    // Model performance monitoring
    this.registerTask({
      taskId: 'performance_monitoring',
      enabled: true,
      interval: 30 * 60 * 1000, // 30 minutes
      lastRun: null,
      priority: 'medium',
      requiresNetwork: false,
      requiresCharging: false,
      runOnlyWhenIdle: false,
    }, this.monitorModelPerformance.bind(this));

    // Weather data sync
    this.registerTask({
      taskId: 'weather_sync',
      enabled: true,
      interval: 15 * 60 * 1000, // 15 minutes
      lastRun: null,
      priority: 'medium',
      requiresNetwork: true,
      requiresCharging: false,
      runOnlyWhenIdle: false,
    }, this.syncWeatherData.bind(this));

    // Grid data sync
    this.registerTask({
      taskId: 'grid_sync',
      enabled: true,
      interval: 10 * 60 * 1000, // 10 minutes
      lastRun: null,
      priority: 'medium',
      requiresNetwork: true,
      requiresCharging: false,
      runOnlyWhenIdle: false,
    }, this.syncGridData.bind(this));
  }

  /**
   * Register a background task
   */
  registerTask(
    config: BackgroundTaskConfig,
    taskFunction: () => Promise<BackgroundTaskResult>
  ): void {
    this.tasks.set(config.taskId, config);
    this.scheduleTask(config.taskId, taskFunction);
  }

  /**
   * Schedule a task for execution
   */
  private scheduleTask(
    taskId: string,
    taskFunction: () => Promise<BackgroundTaskResult>
  ): void {
    const config = this.tasks.get(taskId);
    if (!config || !config.enabled) return;

    // Clear existing interval if any
    const existingInterval = this.intervals.get(taskId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Set up new interval
    const interval = setInterval(async () => {
      if (this.shouldRunTask(config)) {
        try {
          console.log(`Running background task: ${taskId}`);
          const result = await taskFunction();
          await this.handleTaskResult(taskId, result);
        } catch (error) {
          console.error(`Background task ${taskId} failed:`, error);
          await this.handleTaskResult(taskId, {
            taskId,
            success: false,
            duration: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }, config.interval);

    this.intervals.set(taskId, interval);
  }

  /**
   * Check if a task should run based on its configuration
   */
  private shouldRunTask(config: BackgroundTaskConfig): boolean {
    // Check if task is enabled
    if (!config.enabled) return false;

    // Check network requirement
    if (config.requiresNetwork && !this.isNetworkAvailable) return false;

    // Check charging requirement
    if (config.requiresCharging && !this.isCharging) return false;

    // Check idle requirement
    if (config.runOnlyWhenIdle && !this.isAppInBackground) return false;

    // Check if enough time has passed since last run
    if (config.lastRun) {
      const timeSinceLastRun = Date.now() - config.lastRun.getTime();
      if (timeSinceLastRun < config.interval) return false;
    }

    return true;
  }

  /**
   * Handle task execution result
   */
  private async handleTaskResult(taskId: string, result: BackgroundTaskResult): Promise<void> {
    // Update last run time
    const config = this.tasks.get(taskId);
    if (config) {
      config.lastRun = new Date();
      this.tasks.set(taskId, config);
    }

    // Log result
    if (result.success) {
      console.log(`Background task ${taskId} completed successfully in ${result.duration}ms`);
    } else {
      console.error(`Background task ${taskId} failed: ${result.error}`);
    }

    // Store task history for monitoring
    await this.storeTaskResult(result);
  }

  /**
   * Set up app state listener to detect background/foreground state
   */
  private setupAppStateListener(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      this.isAppInBackground = nextAppState === 'background' || nextAppState === 'inactive';
      console.log(`App state changed: ${nextAppState}`);
    });
  }

  /**
   * Start the task scheduler
   */
  private startTaskScheduler(): void {
    console.log('Background task scheduler started');
    
    // Load saved task configurations
    this.loadTaskConfigurations();
    
    // Schedule all registered tasks
    for (const [taskId, config] of this.tasks.entries()) {
      if (config.enabled) {
        this.scheduleTask(taskId, this.getTaskFunction(taskId));
      }
    }
  }

  /**
   * Background task implementations
   */
  private async performModelRetraining(): Promise<BackgroundTaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('Starting background model retraining...');
      
      const retrainingResult = await federatedLearningService.retrainModel();
      
      if (retrainingResult) {
        return {
          taskId: 'model_retraining',
          success: true,
          duration: Date.now() - startTime,
          data: {
            accuracy_improvement: 
              retrainingResult.modelAccuracyAfter - retrainingResult.modelAccuracyBefore,
            data_points_used: retrainingResult.dataPointsCollected,
          },
        };
      } else {
        return {
          taskId: 'model_retraining',
          success: false,
          duration: Date.now() - startTime,
          error: 'Insufficient data for retraining',
        };
      }
    } catch (error) {
      return {
        taskId: 'model_retraining',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async collectFeedbackData(): Promise<BackgroundTaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('Collecting automatic feedback data...');
      
      await federatedLearningService.collectAutomaticTrainingData();
      
      return {
        taskId: 'feedback_collection',
        success: true,
        duration: Date.now() - startTime,
        data: { message: 'Feedback collection completed' },
      };
    } catch (error) {
      return {
        taskId: 'feedback_collection',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async cleanupOldData(): Promise<BackgroundTaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('Cleaning up old data...');
      
      // Clean up old prediction history (keep last 3 months)
      const cutoffDate = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000);
      const predictionHistory = await AsyncStorage.getItem('prediction_history');
      
      if (predictionHistory) {
        const predictions = JSON.parse(predictionHistory);
        const filteredPredictions = predictions.filter((p: any) => 
          new Date(p.timestamp) > cutoffDate
        );
        
        await AsyncStorage.setItem('prediction_history', JSON.stringify(filteredPredictions));
      }
      
      // Clean up old feedback data (keep last 6 months)
      const feedbackCutoffDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      const feedbackData = await AsyncStorage.getItem('model_feedback_data');
      
      if (feedbackData) {
        const feedback = JSON.parse(feedbackData);
        const filteredFeedback = feedback.filter((f: any) => 
          new Date(f.timestamp) > feedbackCutoffDate
        );
        
        await AsyncStorage.setItem('model_feedback_data', JSON.stringify(filteredFeedback));
      }
      
      return {
        taskId: 'data_cleanup',
        success: true,
        duration: Date.now() - startTime,
        data: { message: 'Data cleanup completed' },
      };
    } catch (error) {
      return {
        taskId: 'data_cleanup',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async monitorModelPerformance(): Promise<BackgroundTaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('Monitoring model performance...');
      
      const analytics = await modelFeedbackService.getFeedbackAnalytics();
      
      // Check for performance degradation
      const performanceThreshold = 0.85; // 85% accuracy threshold
      const needsAttention = analytics.predictionAccuracyRate < performanceThreshold;
      
      if (needsAttention) {
        console.warn('Model performance below threshold:', analytics.predictionAccuracyRate);
        // Could trigger immediate retraining or notification
      }
      
      return {
        taskId: 'performance_monitoring',
        success: true,
        duration: Date.now() - startTime,
        data: {
          accuracy: analytics.predictionAccuracyRate,
          needs_attention: needsAttention,
        },
      };
    } catch (error) {
      return {
        taskId: 'performance_monitoring',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async syncWeatherData(): Promise<BackgroundTaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('Syncing weather data...');
      
      const weatherData = await weatherService.getCurrentWeather();
      
      if (weatherData) {
        // Store for offline use
        await AsyncStorage.setItem('cached_weather_data', JSON.stringify({
          data: weatherData,
          timestamp: new Date().toISOString(),
        }));
      }
      
      return {
        taskId: 'weather_sync',
        success: !!weatherData,
        duration: Date.now() - startTime,
        data: weatherData ? { location: weatherData.location.city } : undefined,
      };
    } catch (error) {
      return {
        taskId: 'weather_sync',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async syncGridData(): Promise<BackgroundTaskResult> {
    const startTime = Date.now();
    
    try {
      console.log('Syncing grid data...');
      
              // Grid data removed - not available in Kenya
        const gridData = null;
      
      if (gridData) {
        // Store for offline use
        await AsyncStorage.setItem('cached_grid_data', JSON.stringify({
          data: gridData,
          timestamp: new Date().toISOString(),
        }));
      }
      
      return {
        taskId: 'grid_sync',
        success: !!gridData,
        duration: Date.now() - startTime,
        data: gridData ? { load: (gridData as any).load, region: (gridData as any).region } : undefined,
      };
    } catch (error) {
      return {
        taskId: 'grid_sync',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get task function by ID
   */
  private getTaskFunction(taskId: string): () => Promise<BackgroundTaskResult> {
    switch (taskId) {
      case 'model_retraining':
        return this.performModelRetraining.bind(this);
      case 'feedback_collection':
        return this.collectFeedbackData.bind(this);
      case 'data_cleanup':
        return this.cleanupOldData.bind(this);
      case 'performance_monitoring':
        return this.monitorModelPerformance.bind(this);
      case 'weather_sync':
        return this.syncWeatherData.bind(this);
      case 'grid_sync':
        return this.syncGridData.bind(this);
      default:
        return async () => ({
          taskId,
          success: false,
          duration: 0,
          error: 'Unknown task',
        });
    }
  }

  /**
   * Public API methods
   */
  async getTaskStatus(taskId: string): Promise<BackgroundTaskConfig | null> {
    return this.tasks.get(taskId) || null;
  }

  async getAllTaskStatuses(): Promise<BackgroundTaskConfig[]> {
    return Array.from(this.tasks.values());
  }

  async enableTask(taskId: string): Promise<void> {
    const config = this.tasks.get(taskId);
    if (config) {
      config.enabled = true;
      this.tasks.set(taskId, config);
      this.scheduleTask(taskId, this.getTaskFunction(taskId));
      await this.saveTaskConfigurations();
    }
  }

  async disableTask(taskId: string): Promise<void> {
    const config = this.tasks.get(taskId);
    if (config) {
      config.enabled = false;
      this.tasks.set(taskId, config);
      
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(taskId);
      }
      
      await this.saveTaskConfigurations();
    }
  }

  async runTaskNow(taskId: string): Promise<BackgroundTaskResult> {
    const taskFunction = this.getTaskFunction(taskId);
    const result = await taskFunction();
    await this.handleTaskResult(taskId, result);
    return result;
  }

  /**
   * Storage methods
   */
  private async loadTaskConfigurations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('background_task_configs');
      if (stored) {
        const configs = JSON.parse(stored);
        for (const config of configs) {
          config.lastRun = config.lastRun ? new Date(config.lastRun) : null;
          this.tasks.set(config.taskId, config);
        }
      }
    } catch (error) {
      console.error('Failed to load task configurations:', error);
    }
  }

  private async saveTaskConfigurations(): Promise<void> {
    try {
      const configs = Array.from(this.tasks.values());
      await AsyncStorage.setItem('background_task_configs', JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save task configurations:', error);
    }
  }

  private async storeTaskResult(result: BackgroundTaskResult): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('background_task_history');
      const history = stored ? JSON.parse(stored) : [];
      
      history.push({
        ...result,
        timestamp: new Date().toISOString(),
      });
      
      // Keep only last 100 results
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      await AsyncStorage.setItem('background_task_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to store task result:', error);
    }
  }

  /**
   * Get task execution history
   */
  async getTaskHistory(taskId?: string): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('background_task_history');
      const history = stored ? JSON.parse(stored) : [];
      
      if (taskId) {
        return history.filter((h: any) => h.taskId === taskId);
      }
      
      return history;
    } catch (error) {
      console.error('Failed to get task history:', error);
      return [];
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    // Remove app state listener
    // removeEventListener deprecated; no-op cleanup for RN
  }
}

// Export singleton instance
export const backgroundTaskService = new BackgroundTaskService();
export default BackgroundTaskService;