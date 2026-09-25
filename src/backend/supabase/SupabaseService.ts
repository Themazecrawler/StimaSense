import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environment } from '../../config/environment';
import { logger } from '../../observability/logger';
import { OutageReportInputSchema, UserProfileUpdateSchema, parseOrThrow } from './schemas';

// Supabase configuration
const supabaseUrl = environment.optionalSupabaseUrl || 'https://unconfigured.invalid';
const supabaseAnonKey = environment.optionalSupabaseAnonKey || 'unconfigured';

if (!environment.isSupabaseConfigured) {
  logger.warn('supabase.configuration_missing');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  outage_alerts: boolean;
  weather_alerts: boolean;
  maintenance_alerts: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface OutageReport {
  id: string;
  user_id: string;
  service_area: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  verification_status: 'unverified' | 'corroborated' | 'official';
  moderation_status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  id: string;
  location_lat: number;
  location_lng: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
  wind_direction: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  weather_condition: string;
  recorded_at: string;
}

export interface PredictionResult {
  id: string;
  user_id: string;
  location_lat: number;
  location_lng: number;
  weather_data: WeatherData;
  outage_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  predicted_time_window: string;
  factors: string[];
  created_at: string;
}

export interface KPLCPlannedOutage {
  id: string;
  region: string;
  specific_area: string;
  start_time: string;
  end_time: string;
  affected_customers?: number;
  reason: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  source_url: string;
  scraped_at: string;
  created_at: string;
}

export interface ModelFeedback {
  id: string;
  user_id: string;
  prediction_id: string;
  actual_outage_occurred: boolean;
  accuracy_rating: number;
  feedback_text?: string;
  created_at: string;
}

export class SupabaseService {
  // User management
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('supabase.current_user_failed', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User | null> {
    const validUpdates = parseOrThrow(UserProfileUpdateSchema, 'profile update', updates);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('profiles')
        .update(validUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('supabase.profile_update_failed', error);
      return null;
    }
  }

  // Outage reports
  async createOutageReport(report: Omit<OutageReport, 'id' | 'created_at' | 'updated_at'>): Promise<OutageReport | null> {
    const validReport = parseOrThrow(OutageReportInputSchema, 'outage report', report);

    try {
      const { data, error } = await supabase
        .from('outage_reports')
        .insert([validReport])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('supabase.outage_report_create_failed', error);
      return null;
    }
  }

  async getOutageReports(serviceArea?: string): Promise<OutageReport[]> {
    try {
      let query = supabase
        .from('outage_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (serviceArea?.trim()) {
        query = query.eq('service_area', serviceArea.trim());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('supabase.outage_reports_load_failed', error);
      return [];
    }
  }

  // Weather data
  async saveWeatherData(weatherData: Omit<WeatherData, 'id' | 'recorded_at'>): Promise<WeatherData | null> {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .insert([weatherData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('supabase.weather_save_failed', error);
      return null;
    }
  }

  async getWeatherData(location: { lat: number; lng: number }, timeRange?: { start: string; end: string }): Promise<WeatherData[]> {
    try {
      let query = supabase
        .from('weather_data')
        .select('*')
        .eq('location_lat', location.lat)
        .eq('location_lng', location.lng)
        .order('recorded_at', { ascending: false });

      if (timeRange) {
        query = query.gte('recorded_at', timeRange.start).lte('recorded_at', timeRange.end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('supabase.weather_load_failed', error);
      return [];
    }
  }

  // Predictions
  async savePredictionResult(prediction: Omit<PredictionResult, 'id' | 'created_at'>): Promise<PredictionResult | null> {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .insert([prediction])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('supabase.prediction_save_failed', error);
      return null;
    }
  }

  async getPredictionHistory(userId?: string, limit: number = 50): Promise<PredictionResult[]> {
    try {
      let query = supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('supabase.prediction_history_failed', error);
      return [];
    }
  }

  // KPLC Planned Outages
  async saveKPLCOutages(outages: Omit<KPLCPlannedOutage, 'id' | 'created_at'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('kplc_planned_outages')
        .upsert(outages, { onConflict: 'source_url,start_time' });

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('supabase.kplc_save_failed', error);
      return false;
    }
  }

  async getKPLCOutages(region?: string, activeOnly: boolean = true): Promise<KPLCPlannedOutage[]> {
    try {
      let query = supabase
        .from('kplc_planned_outages')
        .select('*')
        .order('start_time', { ascending: true });

      if (region) {
        query = query.ilike('region', `%${region}%`);
      }

      if (activeOnly) {
        const now = new Date().toISOString();
        query = query.gte('end_time', now);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('supabase.kplc_load_failed', error);
      return [];
    }
  }

  // Model Feedback
  async saveModelFeedback(feedback: Omit<ModelFeedback, 'id' | 'created_at'>): Promise<ModelFeedback | null> {
    try {
      const { data, error } = await supabase
        .from('model_feedback')
        .insert([feedback])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('supabase.model_feedback_save_failed', error);
      return null;
    }
  }

  async getModelFeedback(predictionId?: string): Promise<ModelFeedback[]> {
    try {
      let query = supabase
        .from('model_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (predictionId) {
        query = query.eq('prediction_id', predictionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('supabase.model_feedback_load_failed', error);
      return [];
    }
  }

  // Real-time subscriptions
  subscribeToOutageReports(callback: (payload: any) => void) {
    return supabase
      .channel('outage_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outage_reports' }, callback)
      .subscribe();
  }

  subscribeToKPLCOutages(callback: (payload: any) => void) {
    return supabase
      .channel('kplc_outages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kplc_planned_outages' }, callback)
      .subscribe();
  }

  subscribeToPredictions(callback: (payload: any) => void) {
    return supabase
      .channel('predictions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, callback)
      .subscribe();
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
export default supabaseService;
