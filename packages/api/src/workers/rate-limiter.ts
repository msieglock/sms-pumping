// Durable Object for rate limiting
export class RateLimiter {
  private state: DurableObjectState;
  private requests: number[] = [];

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    // Load state
    const stored = await this.state.storage.get<number[]>('requests');
    if (stored) {
      this.requests = stored;
    }

    const { limit, windowMs } = await request.json() as { limit: number; windowMs: number };
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old requests
    this.requests = this.requests.filter(ts => ts > windowStart);

    const allowed = this.requests.length < limit;
    const remaining = Math.max(0, limit - this.requests.length);
    const resetAt = this.requests.length > 0
      ? this.requests[0] + windowMs
      : now + windowMs;

    if (allowed) {
      this.requests.push(now);
      await this.state.storage.put('requests', this.requests);
    }

    return Response.json({
      allowed,
      remaining: allowed ? remaining - 1 : remaining,
      resetAt
    });
  }
}
