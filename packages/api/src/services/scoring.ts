import { SignalBreakdown } from '../types';

// Scoring configuration
export interface ScoringConfig {
  weights: {
    geo_risk: number;
    velocity_risk: number;
    carrier_risk: number;
    behavior_risk: number;
  };
  thresholds: {
    allow_max: number;
    block_min: number;
  };
}

// Default scoring configuration
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    geo_risk: 0.25,
    velocity_risk: 0.30,
    carrier_risk: 0.25,
    behavior_risk: 0.20
  },
  thresholds: {
    allow_max: 30,
    block_min: 71
  }
};

// Calculate weighted fraud score
export function calculateFraudScore(
  signals: SignalBreakdown,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  const score =
    signals.geo_risk * config.weights.geo_risk +
    signals.velocity_risk * config.weights.velocity_risk +
    signals.carrier_risk * config.weights.carrier_risk +
    signals.behavior_risk * config.weights.behavior_risk;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// Get decision based on score
export function getDecision(
  score: number,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): 'allow' | 'block' | 'review' {
  if (score <= config.thresholds.allow_max) {
    return 'allow';
  } else if (score >= config.thresholds.block_min) {
    return 'block';
  }
  return 'review';
}

// Normalize individual signal scores (0-100)
export function normalizeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Calculate z-score for anomaly detection
export function calculateZScore(
  value: number,
  mean: number,
  stdDev: number
): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// Check if value exceeds threshold (e.g., 3.5 sigma)
export function isAnomalous(
  value: number,
  mean: number,
  stdDev: number,
  sigmaThreshold: number = 3.5
): boolean {
  const zScore = calculateZScore(value, mean, stdDev);
  return Math.abs(zScore) > sigmaThreshold;
}

// Calculate risk tier from score
export function getRiskTier(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

// Generate human-readable explanation
export function generateExplanation(signals: SignalBreakdown, score: number): string {
  const factors: string[] = [];

  if (signals.geo_risk >= 60) {
    factors.push('high-risk geographic region');
  }

  if (signals.velocity_risk >= 60) {
    factors.push('unusual request velocity');
  }

  if (signals.carrier_risk >= 60) {
    factors.push('suspicious carrier or number type');
  }

  if (signals.behavior_risk >= 60) {
    factors.push('abnormal behavioral patterns');
  }

  if (factors.length === 0) {
    return 'Low fraud probability based on all signals.';
  }

  return `Elevated risk due to: ${factors.join(', ')}.`;
}

// Batch scoring for analytics
export function batchScore(
  requests: Array<{ signals: SignalBreakdown }>,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Array<{ score: number; decision: 'allow' | 'block' | 'review' }> {
  return requests.map(req => {
    const score = calculateFraudScore(req.signals, config);
    return {
      score,
      decision: getDecision(score, config)
    };
  });
}

// Calculate savings from blocked requests
export function calculateSavings(
  blockedCount: number,
  avgSmsCost: number
): number {
  return blockedCount * avgSmsCost;
}

// Calculate our fee (15% of savings)
export function calculateFee(savings: number): number {
  return savings * 0.15;
}

// Calculate total invoice
export function calculateInvoice(
  blockedCount: number,
  avgSmsCost: number,
  baseFee: number = 100
): { savings: number; fee: number; total: number } {
  const savings = calculateSavings(blockedCount, avgSmsCost);
  const fee = calculateFee(savings);
  return {
    savings,
    fee,
    total: baseFee + fee
  };
}
