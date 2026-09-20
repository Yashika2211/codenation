import "server-only";

/**
 * A tiny in-process token bucket.
 *
 * The public Piston endpoint allows roughly five requests a second and answers
 * a burst with 429s. Test cases for one submission run sequentially through
 * this gate, so a submission with twelve cases paces itself instead of being
 * throttled halfway and reported as an error.
 *
 * In-process is the honest scope: on serverless each instance keeps its own
 * bucket. A shared limiter would need Redis, which the free tier does not have.
 */

type Task<T> = { run: () => Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };

export class RateLimitedQueue {
  private queue: Array<Task<unknown>> = [];
  private active = 0;
  private lastStart = 0;

  constructor(
    private readonly minIntervalMs: number,
    private readonly concurrency: number,
  ) {}

  push<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.active >= this.concurrency) return;

    const task = this.queue.shift();
    if (!task) return;

    this.active += 1;

    const sinceLast = Date.now() - this.lastStart;
    const wait = Math.max(0, this.minIntervalMs - sinceLast);
    if (wait > 0) await sleep(wait);
    this.lastStart = Date.now();

    try {
      task.resolve(await task.run());
    } catch (error) {
      task.reject(error);
    } finally {
      this.active -= 1;
      void this.drain();
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ~4 req/s with two in flight. Both public backends throttle a burst, and a
 * submission's cases walk through this gate one at a time rather than arriving
 * all at once and coming back as a wall of 429s.
 */
export const judgeQueue = new RateLimitedQueue(260, 2);

/** Kept as a named alias so `piston.ts` reads clearly at its call site. */
export const pistonQueue = judgeQueue;
