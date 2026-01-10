// Durable Object for velocity tracking
export class VelocityTracker {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/get') {
      return this.getVelocity(request);
    } else if (url.pathname === '/record') {
      return this.recordRequest(request);
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
  }

  private async getVelocity(request: Request): Promise<Response> {
    const { phonePrefix, phoneNumber } = await request.json() as {
      phonePrefix: string;
      phoneNumber: string;
    };

    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get stored requests
    const requests = await this.state.storage.get<Array<{
      timestamp: number;
      phoneNumber: string;
    }>>('requests') || [];

    // Calculate velocities
    const requests1min = requests.filter(r => r.timestamp > oneMinAgo).length;
    const requests5min = requests.filter(r => r.timestamp > fiveMinAgo).length;
    const requests1hr = requests.filter(r => r.timestamp > oneHourAgo).length;
    const requests24hr = requests.filter(r => r.timestamp > oneDayAgo).length;

    // Count unique numbers in last hour
    const recentNumbers = new Set(
      requests
        .filter(r => r.timestamp > oneHourAgo)
        .map(r => r.phoneNumber)
    );

    // Detect sequential numbers
    const sortedNumbers = Array.from(recentNumbers)
      .map(n => parseInt(n.replace(/\D/g, '').slice(-6)))
      .sort((a, b) => a - b);

    let sequential = false;
    let seqCount = 0;
    for (let i = 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] - sortedNumbers[i - 1] === 1) {
        seqCount++;
        if (seqCount >= 2) {
          sequential = true;
          break;
        }
      } else {
        seqCount = 0;
      }
    }

    return Response.json({
      requests_1min: requests1min,
      requests_5min: requests5min,
      requests_1hr: requests1hr,
      requests_24hr: requests24hr,
      unique_numbers_1hr: recentNumbers.size,
      sequential_detected: sequential
    });
  }

  private async recordRequest(request: Request): Promise<Response> {
    const { phoneNumber, timestamp } = await request.json() as {
      phoneNumber: string;
      timestamp: number;
    };

    // Get stored requests
    const requests = await this.state.storage.get<Array<{
      timestamp: number;
      phoneNumber: string;
    }>>('requests') || [];

    // Add new request
    requests.push({ timestamp, phoneNumber });

    // Clean up old requests (keep last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filteredRequests = requests.filter(r => r.timestamp > oneDayAgo);

    // Store
    await this.state.storage.put('requests', filteredRequests);

    return Response.json({ recorded: true });
  }
}
