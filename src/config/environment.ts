import Config from 'react-native-config';

type EnvironmentKey = keyof typeof Config;

export class MissingEnvironmentVariableError extends Error {
  constructor(key: EnvironmentKey) {
    super(`Missing required environment variable: ${key}`);
    this.name = 'MissingEnvironmentVariableError';
  }
}

export function getRequiredEnvironmentVariable(key: EnvironmentKey): string {
  const value = Config[key]?.trim();

  if (!value) {
    throw new MissingEnvironmentVariableError(key);
  }

  return value;
}

export function getOptionalEnvironmentVariable(key: EnvironmentKey): string | undefined {
  return Config[key]?.trim() || undefined;
}

export const environment = {
  get optionalSupabaseUrl(): string | undefined {
    return getOptionalEnvironmentVariable('SUPABASE_URL');
  },
  get optionalSupabaseAnonKey(): string | undefined {
    return getOptionalEnvironmentVariable('SUPABASE_ANON_KEY');
  },
  get isSupabaseConfigured(): boolean {
    return Boolean(getOptionalEnvironmentVariable('SUPABASE_URL') && getOptionalEnvironmentVariable('SUPABASE_ANON_KEY'));
  },
  get supabaseUrl(): string {
    return getRequiredEnvironmentVariable('SUPABASE_URL');
  },
  get supabaseAnonKey(): string {
    return getRequiredEnvironmentVariable('SUPABASE_ANON_KEY');
  },
  get weatherApiKey(): string {
    return getRequiredEnvironmentVariable('WEATHER_API_KEY');
  },
  get sentryDsn(): string | undefined {
    return getOptionalEnvironmentVariable('SENTRY_DSN');
  },
  get appEnvironment(): string {
    return getOptionalEnvironmentVariable('APP_ENVIRONMENT') || (__DEV__ ? 'development' : 'production');
  },
  get demoMode(): boolean {
    return __DEV__ && getOptionalEnvironmentVariable('DEMO_MODE') === 'true';
  },
};
