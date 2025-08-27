import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = 'https://miklxxtgaglndjizgqnn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pa2x4eHRnYWdsbmRqaXpncW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjg4NDcsImV4cCI6MjA3MTc0NDg0N30.i57AO--wvjJ7sAZOB--QnOYTVRDbjz4ytipn3t3-1cM';

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
  location_lat: number;
  location_lng: number;
  location_address: string;
  outage_type: 'planned' | 'unplanned' | 'weather' | 'equipment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_customers?: number;
  estimated_duration?: string;
  status: 'active' | 'investigating' | 'resolved';
  photos?: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
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
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }

  // Outage reports
  async createOutageReport(report: Omit<OutageReport, 'id' | 'created_at' | 'updated_at'>): Promise<OutageReport | null> {
    try {
      const { data, error } = await supabase
        .from('outage_reports')
        .insert([report])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating outage report:', error);
      return null;
    }
  }

  async getOutageReports(location?: { lat: number; lng: number; radius?: number }): Promise<OutageReport[]> {
    try {
      let query = supabase
        .from('outage_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (location) {
        query = query.eq('location_lat', location.lat).eq('location_lng', location.lng);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting outage reports:', error);
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
      console.error('Error saving weather data:', error);
      return null;
    }
  }

  async getWeatherData(location: { lat: number; lng: number }, hours: number = 24): Promise<WeatherData[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('location_lat', location.lat)
        .eq('location_lng', location.lng)
        .gte('recorded_at', cutoffTime.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting weather data:', error);
      return [];
    }
  }

  // Predictions
  async savePrediction(prediction: Omit<PredictionResult, 'id' | 'created_at'>): Promise<PredictionResult | null> {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .insert([prediction])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving prediction:', error);
      return null;
    }
  }

  async getPredictions(userId: string, limit: number = 50): Promise<PredictionResult[] | null> {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting predictions:', error);
      return null;
    }
  }

  // KPLC planned outages
  async getKPLCPlannedOutages(region?: string): Promise<KPLCPlannedOutage[]> {
    try {
      let query = supabase
        .from('kplc_planned_outages')
        .select('*')
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });

      if (region) {
        query = query.eq('region', region);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting KPLC planned outages:', error);
      return [];
    }
  }

  // Model feedback
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
      console.error('Error saving model feedback:', error);
      return null;
    }
  }

  async getModelFeedback(userId: string): Promise<ModelFeedback[]> {
    try {
      const { data, error } = await supabase
        .from('model_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting model feedback:', error);
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

  // Utility methods
  async uploadPhoto(file: File, bucket: string = 'outage-photos'): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();


