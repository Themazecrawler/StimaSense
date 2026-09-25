const mockBuilder: Record<string, jest.Mock> = {};
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: () => mockGetUser() },
  }),
}));

import { SupabaseService } from '../../../src/backend/supabase/SupabaseService';
import { ValidationError } from '../../../src/backend/supabase/schemas';

const validReport = {
  user_id: '3f2b8f2e-6a54-4c39-9d2a-0d3f6f5a1b11',
  service_area: 'Nairobi West',
  severity: 'high' as const,
  description: 'Transformer failed and the whole street is dark.',
  verification_status: 'unverified' as const,
  moderation_status: 'pending' as const,
};

function resolveWith(result: { data: unknown; error: unknown }) {
  for (const method of ['select', 'insert', 'update', 'upsert', 'eq', 'order', 'limit', 'gte', 'lte', 'ilike']) {
    mockBuilder[method] = jest.fn(() => mockBuilder);
  }
  mockBuilder.single = jest.fn(() => Promise.resolve(result));
  (mockBuilder as any).then = (resolve: (value: unknown) => unknown) => resolve(result);
  mockFrom.mockReturnValue(mockBuilder);
}

describe('SupabaseService input validation', () => {
  const service = new SupabaseService();

  beforeEach(() => {
    jest.clearAllMocks();
    resolveWith({ data: { id: 'row' }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('rejects an invalid outage report before any network call', async () => {
    await expect(
      service.createOutageReport({ ...validReport, description: 'short' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects a report that tries to self-verify', async () => {
    await expect(
      service.createOutageReport({ ...validReport, verification_status: 'official' } as never),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts a valid outage report', async () => {
    await expect(service.createOutageReport(validReport)).resolves.toEqual({ id: 'row' });
    expect(mockFrom).toHaveBeenCalledWith('outage_reports');
    expect(mockBuilder.insert).toHaveBeenCalledWith([validReport]);
  });

  it('rejects profile updates that touch identity columns', async () => {
    await expect(
      service.updateUserProfile({ id: 'someone-else', full_name: 'Amina' } as never),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range coordinate and a malformed phone number', async () => {
    await expect(service.updateUserProfile({ location_lat: 123 })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.updateUserProfile({ phone: 'call me' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('applies a valid profile update for the signed-in user', async () => {
    await service.updateUserProfile({ full_name: 'Amina Otieno' });
    expect(mockBuilder.update).toHaveBeenCalledWith({ full_name: 'Amina Otieno' });
    expect(mockBuilder.eq).toHaveBeenCalledWith('id', 'user-1');
  });
});

describe('SupabaseService reads', () => {
  const service = new SupabaseService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('returns rows for outage reports filtered by trimmed service area', async () => {
    resolveWith({ data: [{ id: 'a' }], error: null });
    await expect(service.getOutageReports('  Kilimani ')).resolves.toEqual([{ id: 'a' }]);
    expect(mockBuilder.eq).toHaveBeenCalledWith('service_area', 'Kilimani');
  });

  it('returns an empty list when a read fails', async () => {
    resolveWith({ data: null, error: new Error('boom') });
    await expect(service.getOutageReports()).resolves.toEqual([]);
    await expect(service.getKPLCOutages('Nairobi')).resolves.toEqual([]);
    await expect(service.getPredictionHistory('user-1')).resolves.toEqual([]);
  });

  it('filters KPLC outages by region and active window', async () => {
    resolveWith({ data: [{ id: 'k' }], error: null });
    await expect(service.getKPLCOutages('Nairobi')).resolves.toEqual([{ id: 'k' }]);
    expect(mockBuilder.ilike).toHaveBeenCalledWith('region', '%Nairobi%');
    expect(mockBuilder.gte).toHaveBeenCalledWith('end_time', expect.any(String));
  });

  it('reports whether KPLC outages were saved', async () => {
    resolveWith({ data: null, error: null });
    await expect(service.saveKPLCOutages([])).resolves.toBe(true);
    resolveWith({ data: null, error: new Error('nope') });
    await expect(service.saveKPLCOutages([])).resolves.toBe(false);
  });

  it('returns null for the current user when nobody is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(service.getCurrentUser()).resolves.toBeNull();
  });
});
