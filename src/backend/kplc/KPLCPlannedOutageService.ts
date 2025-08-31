// TODO: Replace with notifee/react-native when wiring notifications
// import notifee from '@notifee/react-native';

export interface PlannedOutage {
  id: string;
  region: string;
  area: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  sourceUrl: string;
  createdAt: string; // ISO when posted if available, else fetchedAt
}

type Subscriber = (outages: PlannedOutage[]) => void;

class KPLCPlannedOutageService {
  private outages: PlannedOutage[] = [];
  private subscribers: Subscriber[] = [];
  private lastFetch: number = 0;
  private fetchIntervalMs = 12 * 60 * 60 * 1000; // every 12 hours
  private lastNotifiedIds = new Set<string>();
  private userAreaText: string = '';

  async initialize(remoteUrl?: string): Promise<void> {
    await this.refresh(remoteUrl);
    // Set background refresh timer (in-app best-effort)
    setInterval(() => {
      this.refresh(remoteUrl).catch(() => {});
    }, this.fetchIntervalMs);
  }

  setUserArea(userAreaText: string) {
    this.userAreaText = (userAreaText || '').trim();
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.push(cb);
    cb(this.outages);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== cb);
    };
  }

  getPlannedOutages(): PlannedOutage[] {
    return this.outages;
  }

  getOutagesForRegion(userRegion: string): PlannedOutage[] {
    if (!userRegion) return [];
    const normalized = userRegion.toLowerCase();
    return this.outages.filter(o =>
      o.region.toLowerCase().includes(normalized) ||
      o.area.toLowerCase().includes(normalized)
    );
  }

  async refresh(remoteUrl?: string): Promise<void> {
    try {
      // Avoid overly frequent refreshes
      if (Date.now() - this.lastFetch < 30 * 1000) return;

      let data: PlannedOutage[] = [];
      if (remoteUrl) {
        const res = await fetch(remoteUrl);
        data = await res.json();
      } else {
        // Fallback to bundled file
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bundled = require('../../models/planned_outages.json');
        data = bundled as PlannedOutage[];
      }

      const newIds = new Set(data.map(d => d.id));
      const oldIds = new Set(this.outages.map(d => d.id));
      const newlyAdded = data.filter(d => !oldIds.has(d.id));

      this.outages = data.sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''));
      this.lastFetch = Date.now();
      this.subscribers.forEach(s => s(this.outages));

      // Trigger notifications for new postings (personalized by user area if available)
      if (newlyAdded.length > 0) {
        const filtered = this.userAreaText
          ? newlyAdded.filter(o =>
              (o.region || '').toLowerCase().includes(this.userAreaText.toLowerCase()) ||
              (o.area || '').toLowerCase().includes(this.userAreaText.toLowerCase())
            )
          : newlyAdded;
        for (const item of filtered.slice(0, 10)) {
          if (this.lastNotifiedIds.has(item.id)) continue;
          await this.notifyNewOutage(item);
          this.lastNotifiedIds.add(item.id);
        }
      }
    } catch (e) {
      // silent fail
    }
  }

  private async notifyNewOutage(item: PlannedOutage) {
    try {
      const notifee = require('@notifee/react-native').default;
      await notifee.requestPermission();
      await notifee.displayNotification({
        title: 'Planned power interruption',
        body: `${item.region}: ${item.area} • ${this.formatWindow(item.startTime, item.endTime)}`,
      });
    } catch (_) {}
  }

  private formatWindow(startIso?: string, endIso?: string) {
    if (!startIso && !endIso) return 'Time TBA';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    const start = startIso ? new Date(startIso).toLocaleString(undefined, opts) : 'TBA';
    const end = endIso ? new Date(endIso).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'TBA';
    return `${start} - ${end}`;
  }

  // Filter outages by approximate user area text (e.g., "Nairobi West").
  filterForUserArea(userAreaText: string): PlannedOutage[] {
    const q = (userAreaText || '').toLowerCase();
    if (!q) return [];
    return this.outages.filter(o =>
      (o.region || '').toLowerCase().includes(q) ||
      (o.area || '').toLowerCase().includes(q)
    );
  }
}

export const kplcPlannedOutageService = new KPLCPlannedOutageService();