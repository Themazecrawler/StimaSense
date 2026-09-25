import { z } from 'zod';

export class ValidationError extends Error {
  readonly issues: string[];

  constructor(subject: string, error: z.ZodError) {
    const issues = error.issues.map(issue => `${issue.path.join('.') || 'input'}: ${issue.message}`);
    super(`Invalid ${subject}: ${issues.join('; ')}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

const quietHour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:MM');

export const NotificationPreferencesSchema = z
  .object({
    push_enabled: z.boolean(),
    email_enabled: z.boolean(),
    sms_enabled: z.boolean(),
    outage_alerts: z.boolean(),
    weather_alerts: z.boolean(),
    maintenance_alerts: z.boolean(),
    quiet_hours_start: quietHour.optional(),
    quiet_hours_end: quietHour.optional(),
  })
  .strict();

/** Fields a user may change on their own profile; identity and audit columns are rejected. */
export const UserProfileUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120),
    phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/, 'must be a phone number'),
    location_lat: z.number().min(-90).max(90),
    location_lng: z.number().min(-180).max(180),
    location_address: z.string().trim().max(300),
    notification_preferences: NotificationPreferencesSchema,
  })
  .partial()
  .strict();

/** Mirrors the outage_reports table constraints and its insert row-level-security policy. */
export const OutageReportInputSchema = z
  .object({
    user_id: z.string().uuid(),
    service_area: z.string().trim().min(1).max(120),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().trim().min(10).max(2000),
    verification_status: z.literal('unverified'),
    moderation_status: z.literal('pending'),
  })
  .strict();

export function parseOrThrow<T>(schema: z.ZodType<T>, subject: string, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(subject, result.error);
  return result.data;
}
