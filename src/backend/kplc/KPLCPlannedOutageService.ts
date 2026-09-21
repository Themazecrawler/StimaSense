import { logger } from '../../observability/logger';

export interface PlannedOutage {
  id: string;
  region: string;
  area: string;
  startTime: string;
  endTime: string;
  sourceUrl: string;
  createdAt: string;
  source: 'kplc';
}

type Subscriber = (outages: PlannedOutage[]) => void;

export class InvalidPlannedOutageFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPlannedOutageFeedError';
  }
}

class KPLCPlannedOutageService {
  private outages: PlannedOutage[] = [];
  private subscribers: Subscriber[] = [];
  private lastFetch = 0;
  private readonly fetchIntervalMs = 12 * 60 * 60 * 1000;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private lastNotifiedIds = new Set<string>();
  private userAreaText = '';

  async initialize(remoteUrl?: string): Promise<void> {
    await this.refresh(remoteUrl);
    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => {
        this.refresh(remoteUrl).catch(error => logger.error('kplc.refresh_failed', error));
      }, this.fetchIntervalMs);
    }
  }

  stop(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  setUserArea(userAreaText: string): void {
    this.userAreaText = userAreaText.trim();
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.push(callback);
    callback(this.outages);
    return () => {
      this.subscribers = this.subscribers.filter(item => item !== callback);
    };
  }

  getPlannedOutages(): PlannedOutage[] {
    return [...this.outages];
  }

  getOutagesForRegion(userRegion: string): PlannedOutage[] {
    const normalized = userRegion.trim().toLowerCase();
    if (!normalized) return [];
    return this.outages.filter(item =>
      item.region.toLowerCase().includes(normalized) || item.area.toLowerCase().includes(normalized),
    );
  }

  async refresh(remoteUrl?: string): Promise<void> {
    if (Date.now() - this.lastFetch < 30_000) return;

    try {
      const raw = remoteUrl ? await this.fetchRemote(remoteUrl) : require('../../models/planned_outages.json');
      const data = this.validateFeed(raw);
      const oldIds = new Set(this.outages.map(item => item.id));
      const newlyAdded = data.filter(item => !oldIds.has(item.id));

      this.outages = data.sort((a, b) => a.startTime.localeCompare(b.startTime));
      this.lastFetch = Date.now();
      this.subscribers.forEach(subscriber => subscriber([...this.outages]));
      await this.notifyNewItems(newlyAdded);
      logger.info('kplc.refresh_succeeded', { noticeCount: data.length });
    } catch (error) {
      logger.error('kplc.refresh_failed', error, { retainedNoticeCount: this.outages.length });
      throw error;
    }
  }

  filterForUserArea(userAreaText: string): PlannedOutage[] {
    return this.getOutagesForRegion(userAreaText);
  }

  private async fetchRemote(remoteUrl: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(remoteUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`KPLC feed returned HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateFeed(raw: unknown): PlannedOutage[] {
    if (!Array.isArray(raw)) throw new InvalidPlannedOutageFeedError('Feed must be an array');

    const now = Date.now();
    const valid = raw.flatMap((candidate): PlannedOutage[] => {
      if (!candidate || typeof candidate !== 'object') return [];
      const item = candidate as Record<string, unknown>;
      const start = Date.parse(String(item.startTime || ''));
      const end = Date.parse(String(item.endTime || ''));
      const region = String(item.region || '').trim();
      const area = String(item.area || '').trim();
      const id = String(item.id || '').trim();
      const sourceUrl = String(item.sourceUrl || '').trim();
      const looksLikeNavigation = /^(home|about|contact|customer support|power maintenance notice)$/i.test(area);

      if (!id || !region || !area || looksLikeNavigation || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
      if (end < now - 2 * 60 * 60 * 1000) return [];
      if (!/^https:\/\//i.test(sourceUrl)) return [];

      const created = Date.parse(String(item.createdAt || ''));
      return [{
        id,
        region,
        area,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        sourceUrl,
        createdAt: Number.isFinite(created) ? new Date(created).toISOString() : new Date().toISOString(),
        source: 'kplc',
      }];
    });

    if (raw.length > 0 && valid.length === 0) {
      throw new InvalidPlannedOutageFeedError('Feed contained no current notices with valid regions and time windows');
    }
    return valid;
  }

  private async notifyNewItems(items: PlannedOutage[]): Promise<void> {
    const filtered = this.userAreaText ? this.getOutagesForRegion(this.userAreaText) : items;
    for (const item of filtered.filter(candidate => items.some(next => next.id === candidate.id)).slice(0, 10)) {
      if (this.lastNotifiedIds.has(item.id)) continue;
      await this.notifyNewOutage(item);
      this.lastNotifiedIds.add(item.id);
    }
  }

  private async notifyNewOutage(item: PlannedOutage): Promise<void> {
    try {
      const notifee = require('@notifee/react-native').default;
      await notifee.requestPermission();
      await notifee.displayNotification({
        title: 'Planned power interruption',
        body: `${item.region}: ${item.area} · ${new Date(item.startTime).toLocaleString()}`,
      });
    } catch (error) {
      logger.warn('kplc.notification_unavailable', {
        reason: error instanceof Error ? error.name : 'notification_error',
      });
    }
  }
}

export const kplcPlannedOutageService = new KPLCPlannedOutageService();
export default KPLCPlannedOutageService;
