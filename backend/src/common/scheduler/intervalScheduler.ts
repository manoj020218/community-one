export class IntervalScheduler {
  private timer?: NodeJS.Timeout;

  constructor(private readonly task: () => Promise<void>, private readonly intervalMs: number) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.task();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  isRunning(): boolean {
    return !!this.timer;
  }
}
