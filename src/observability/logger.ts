import * as Sentry from '@sentry/react-native';

import { environment } from '../config/environment';

type LogContext = Record<string, unknown>;

const REDACTED_KEYS = /authorization|cookie|dsn|email|feedback|key|latitude|longitude|password|secret|token/i;

function shouldWriteToConsole(): boolean {
  return __DEV__ && environment.appEnvironment !== 'test';
}

function sanitize(context: LogContext = {}): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      REDACTED_KEYS.test(key) ? '[REDACTED]' : value,
    ]),
  );
}

export function initializeObservability(): void {
  const dsn = environment.sentryDsn;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: environment.appEnvironment,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const logger = {
  info(event: string, context?: LogContext): void {
    const safeContext = sanitize(context);
    if (shouldWriteToConsole()) console.info(event, safeContext);
    Sentry.addBreadcrumb({ category: 'application', level: 'info', message: event, data: safeContext });
  },

  warn(event: string, context?: LogContext): void {
    const safeContext = sanitize(context);
    if (shouldWriteToConsole()) console.warn(event, safeContext);
    Sentry.addBreadcrumb({ category: 'application', level: 'warning', message: event, data: safeContext });
  },

  error(event: string, error: unknown, context?: LogContext): void {
    const safeContext = sanitize(context);
    if (shouldWriteToConsole()) console.error(event, error, safeContext);
    Sentry.withScope(scope => {
      scope.setTag('event', event);
      scope.setContext('application', safeContext);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  },
};
