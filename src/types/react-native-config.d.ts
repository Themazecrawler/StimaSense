declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    WEATHER_API_KEY?: string;
    GOOGLE_MAPS_API_KEY?: string;
    SENTRY_DSN?: string;
    APP_ENVIRONMENT?: string;
    DEMO_MODE?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
