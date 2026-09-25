import { environment } from '../config/environment';

export type HealthCheck = {
  name: string;
  ok: boolean;
};

export type HealthStatus = {
  status: 'healthy' | 'degraded';
  environment: string;
  checks: HealthCheck[];
};

/**
 * Reports which runtime dependencies are configured. Reports presence only;
 * it never exposes configuration values.
 */
export function getHealthStatus(): HealthStatus {
  const checks: HealthCheck[] = [
    { name: 'supabase_configured', ok: environment.isSupabaseConfigured },
    { name: 'error_reporting_configured', ok: Boolean(environment.sentryDsn) },
  ];

  return {
    status: checks.every(check => check.ok) ? 'healthy' : 'degraded',
    environment: environment.appEnvironment,
    checks,
  };
}
