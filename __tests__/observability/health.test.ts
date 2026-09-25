import Config from 'react-native-config';
import { getHealthStatus } from '../../src/observability/health';

describe('getHealthStatus', () => {
  const original = { ...Config };

  afterEach(() => {
    Object.assign(Config, original);
  });

  it('is healthy when supabase and error reporting are configured', () => {
    Config.SUPABASE_URL = 'https://example.supabase.co';
    Config.SUPABASE_ANON_KEY = 'anon';
    Config.SENTRY_DSN = 'https://dsn.example';

    expect(getHealthStatus().status).toBe('healthy');
  });

  it('is degraded and never exposes config values when something is missing', () => {
    Config.SUPABASE_URL = 'https://example.supabase.co';
    Config.SUPABASE_ANON_KEY = '';
    Config.SENTRY_DSN = '';

    const health = getHealthStatus();

    expect(health.status).toBe('degraded');
    expect(health.checks.find(c => c.name === 'supabase_configured')?.ok).toBe(false);
    expect(JSON.stringify(health)).not.toContain('example.supabase.co');
  });
});
