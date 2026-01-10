import Anthropic from '@anthropic-ai/sdk';
import { SMSCheck, AIReview, SignalBreakdown } from '../types';

// AI Agent for gray-area fraud review
export class AIReviewAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  // Generate review for a gray-area SMS check
  async reviewCheck(
    check: SMSCheck,
    historicalData: {
      prefixRequests24h: number;
      verificationRate: number;
      previousBlocks: number;
    }
  ): Promise<Omit<AIReview, 'id' | 'check_id' | 'created_at'>> {
    const signals: SignalBreakdown = JSON.parse(check.signals);

    const prompt = this.buildPrompt(check, signals, historicalData);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    try {
      const result = JSON.parse(content.text);
      return {
        recommendation: result.recommendation.toLowerCase() as 'allow' | 'deny',
        confidence: result.confidence.toLowerCase() as 'high' | 'medium' | 'low',
        reasoning: result.explanation
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        recommendation: 'deny',
        confidence: 'low',
        reasoning: 'Unable to parse AI response. Manual review recommended.'
      };
    }
  }

  private buildPrompt(
    check: SMSCheck,
    signals: SignalBreakdown,
    historicalData: {
      prefixRequests24h: number;
      verificationRate: number;
      previousBlocks: number;
    }
  ): string {
    // Mask phone number for privacy
    const maskedPhone = check.phone_number.slice(0, -4).replace(/\d/g, '*') +
      check.phone_number.slice(-4);

    return `You are an SMS fraud detection assistant. Analyze the following SMS request and determine if it's likely fraudulent.

Context:
- Phone Number: ${maskedPhone}
- Country: ${check.phone_country || 'Unknown'}
- Carrier: ${check.phone_carrier || 'Unknown'}
- Phone Type: ${check.phone_type || 'Unknown'}
- Request IP: ${check.ip_address}
- IP Country: ${check.ip_country || 'Unknown'}
- Time: ${check.created_at}
- Fraud Score: ${check.fraud_score}

Historical data for this phone prefix:
- Total requests in last 24h: ${historicalData.prefixRequests24h}
- Verification success rate: ${(historicalData.verificationRate * 100).toFixed(1)}%
- Previous blocks: ${historicalData.previousBlocks}

Signal breakdown:
- Geographic risk: ${signals.geo_risk}/100
- Velocity risk: ${signals.velocity_risk}/100
- Carrier risk: ${signals.carrier_risk}/100
- Behavioral risk: ${signals.behavior_risk}/100

Based on this information, provide:
1. Your recommendation: ALLOW or DENY
2. Confidence level: HIGH, MEDIUM, or LOW
3. Brief explanation (2-3 sentences)

Respond ONLY with valid JSON in this exact format:
{
  "recommendation": "ALLOW|DENY",
  "confidence": "HIGH|MEDIUM|LOW",
  "explanation": "..."
}`;
  }

  // Batch review multiple checks
  async batchReview(
    checks: Array<{
      check: SMSCheck;
      historicalData: {
        prefixRequests24h: number;
        verificationRate: number;
        previousBlocks: number;
      };
    }>
  ): Promise<Array<Omit<AIReview, 'id' | 'check_id' | 'created_at'>>> {
    // Process in parallel with rate limiting
    const results: Array<Omit<AIReview, 'id' | 'check_id' | 'created_at'>> = [];

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < checks.length; i += batchSize) {
      const batch = checks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(({ check, historicalData }) =>
          this.reviewCheck(check, historicalData)
        )
      );
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < checks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }
}

// Create AI agent instance
export function createAIAgent(apiKey: string): AIReviewAgent {
  return new AIReviewAgent(apiKey);
}

// Get historical data for a phone prefix
export async function getHistoricalData(
  db: D1Database,
  phoneNumber: string
): Promise<{
  prefixRequests24h: number;
  verificationRate: number;
  previousBlocks: number;
}> {
  const prefix = phoneNumber.replace(/[^\d]/g, '').slice(0, 7);

  const result = await db.prepare(`
    SELECT
      COUNT(*) as total_requests,
      SUM(CASE WHEN code_verified = 1 THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as block_count
    FROM sms_checks
    WHERE phone_number LIKE ? || '%'
    AND created_at > datetime('now', '-24 hours')
  `).bind(prefix).first<{
    total_requests: number;
    verified_count: number;
    block_count: number;
  }>();

  if (!result) {
    return {
      prefixRequests24h: 0,
      verificationRate: 0.5,
      previousBlocks: 0
    };
  }

  return {
    prefixRequests24h: result.total_requests,
    verificationRate: result.total_requests > 0
      ? result.verified_count / result.total_requests
      : 0.5,
    previousBlocks: result.block_count
  };
}
