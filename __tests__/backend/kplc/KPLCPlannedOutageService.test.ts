import KPLCPlannedOutageService from '../../../src/backend/kplc/KPLCPlannedOutageService';

describe('KPLCPlannedOutageService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('accepts only notices with provenance and valid time windows', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'notice-1',
        region: 'Nairobi',
        area: 'Westlands',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        sourceUrl: 'https://www.kplc.co.ke/notice.pdf',
        createdAt: new Date().toISOString(),
      }],
    } as Response);

    const service = new KPLCPlannedOutageService();
    await service.refresh('https://example.test/notices.json');

    expect(service.getPlannedOutages()).toEqual([
      expect.objectContaining({ id: 'notice-1', source: 'kplc' }),
    ]);
  });

  it('rejects a non-empty feed whose rows cannot support a planned-interruption claim', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'bad', region: 'Navigation', area: 'Home', startTime: '', endTime: '' }],
    } as Response);

    const service = new KPLCPlannedOutageService();
    await expect(service.refresh('https://example.test/notices.json')).rejects.toThrow(
      'Feed contained no current notices',
    );
    expect(service.getPlannedOutages()).toEqual([]);
  });
});
