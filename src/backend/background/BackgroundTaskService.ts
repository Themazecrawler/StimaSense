import { logger } from '../../observability/logger';

export interface ForegroundRefreshStatus {
  id: string;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
}

/**
 * Best-effort refresh scheduling while the JavaScript runtime is active.
 * This is deliberately not described as OS-guaranteed background execution.
 */
class ForegroundRefreshScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private readonly intervalMs = 15 * 60 * 1000;

  start(task: () => Promise<void>): void {
    if (this.timer) return;
    this.nextRun = new Date(Date.now() + this.intervalMs);
    this.timer = setInterval(async () => {
      try {
        await task();
        this.lastRun = new Date();
        logger.info('foreground_refresh.completed');
      } catch (error) {
        logger.error('foreground_refresh.failed', error);
      } finally {
        this.nextRun = new Date(Date.now() + this.intervalMs);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.nextRun = null;
  }

  async getAllTaskStatuses(): Promise<ForegroundRefreshStatus[]> {
    return [{
      id: 'foreground_refresh',
      enabled: this.timer !== null,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
    }];
  }
}

export const foregroundRefreshScheduler = new ForegroundRefreshScheduler();
/** @deprecated Use foregroundRefreshScheduler. */
export const backgroundTaskService = foregroundRefreshScheduler;
export default ForegroundRefreshScheduler;
