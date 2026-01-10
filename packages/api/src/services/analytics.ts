import { Env, AnalyticsSummary } from '../types';
import { calculateSavings, calculateFee } from './scoring';

// Get analytics summary for an organization
export async function getAnalyticsSummary(
  db: D1Database,
  orgId: string,
  startDate: string,
  endDate: string
): Promise<AnalyticsSummary> {
  // Get totals
  const totals = await db.prepare(`
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN decision = 'allow' THEN 1 ELSE 0 END) as allowed,
      SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN decision = 'review' THEN 1 ELSE 0 END) as review
    FROM sms_checks
    WHERE org_id = ?
    AND created_at BETWEEN ? AND ?
  `).bind(orgId, startDate, endDate).first<{
    total_checks: number;
    allowed: number;
    blocked: number;
    review: number;
  }>();

  // Get organization's SMS cost
  const org = await db.prepare(
    'SELECT avg_sms_cost FROM organizations WHERE id = ?'
  ).bind(orgId).first<{ avg_sms_cost: number }>();

  const avgCost = org?.avg_sms_cost ?? 0.08;
  const fraudSavings = calculateSavings(totals?.blocked ?? 0, avgCost);

  // Get top countries
  const countries = await db.prepare(`
    SELECT
      phone_country as country,
      COUNT(*) as count,
      SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as blocked
    FROM sms_checks
    WHERE org_id = ?
    AND created_at BETWEEN ? AND ?
    GROUP BY phone_country
    ORDER BY count DESC
    LIMIT 10
  `).bind(orgId, startDate, endDate).all<{
    country: string;
    count: number;
    blocked: number;
  }>();

  // Get hourly distribution
  const hourly = await db.prepare(`
    SELECT
      CAST(strftime('%H', created_at) AS INTEGER) as hour,
      COUNT(*) as count
    FROM sms_checks
    WHERE org_id = ?
    AND created_at BETWEEN ? AND ?
    GROUP BY hour
    ORDER BY hour
  `).bind(orgId, startDate, endDate).all<{
    hour: number;
    count: number;
  }>();

  return {
    total_checks: totals?.total_checks ?? 0,
    allowed: totals?.allowed ?? 0,
    blocked: totals?.blocked ?? 0,
    review: totals?.review ?? 0,
    fraud_savings: fraudSavings,
    top_countries: countries.results ?? [],
    hourly_distribution: hourly.results ?? []
  };
}

// Get real-time stats (last hour)
export async function getRealTimeStats(
  db: D1Database,
  orgId: string
): Promise<{
  checks_last_hour: number;
  blocked_last_hour: number;
  current_threat_level: 'low' | 'medium' | 'high';
}> {
  const stats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as blocked
    FROM sms_checks
    WHERE org_id = ?
    AND created_at > datetime('now', '-1 hour')
  `).bind(orgId).first<{ total: number; blocked: number }>();

  const total = stats?.total ?? 0;
  const blocked = stats?.blocked ?? 0;
  const blockRate = total > 0 ? blocked / total : 0;

  let threatLevel: 'low' | 'medium' | 'high' = 'low';
  if (blockRate > 0.3) {
    threatLevel = 'high';
  } else if (blockRate > 0.1) {
    threatLevel = 'medium';
  }

  return {
    checks_last_hour: total,
    blocked_last_hour: blocked,
    current_threat_level: threatLevel
  };
}

// Get geographic breakdown
export async function getGeoBreakdown(
  db: D1Database,
  orgId: string,
  days: number = 30
): Promise<Array<{
  country: string;
  total: number;
  allowed: number;
  blocked: number;
  review: number;
  block_rate: number;
}>> {
  const result = await db.prepare(`
    SELECT
      phone_country as country,
      COUNT(*) as total,
      SUM(CASE WHEN decision = 'allow' THEN 1 ELSE 0 END) as allowed,
      SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN decision = 'review' THEN 1 ELSE 0 END) as review
    FROM sms_checks
    WHERE org_id = ?
    AND created_at > datetime('now', '-' || ? || ' days')
    GROUP BY phone_country
    ORDER BY total DESC
  `).bind(orgId, days).all<{
    country: string;
    total: number;
    allowed: number;
    blocked: number;
    review: number;
  }>();

  return (result.results ?? []).map(row => ({
    ...row,
    block_rate: row.total > 0 ? row.blocked / row.total : 0
  }));
}

// Get review queue items
export async function getReviewQueue(
  db: D1Database,
  orgId: string,
  limit: number = 50
): Promise<Array<{
  check_id: string;
  phone_number_masked: string;
  phone_country: string;
  fraud_score: number;
  signals: string;
  ai_recommendation?: string;
  ai_confidence?: string;
  ai_reasoning?: string;
  created_at: string;
}>> {
  const result = await db.prepare(`
    SELECT
      c.id as check_id,
      SUBSTR(c.phone_number, 1, LENGTH(c.phone_number) - 4) || '****' as phone_number_masked,
      c.phone_country,
      c.fraud_score,
      c.signals,
      c.created_at,
      r.recommendation as ai_recommendation,
      r.confidence as ai_confidence,
      r.reasoning as ai_reasoning
    FROM sms_checks c
    LEFT JOIN ai_reviews r ON c.id = r.check_id
    WHERE c.org_id = ?
    AND c.decision = 'review'
    AND r.human_override IS NULL
    ORDER BY c.created_at DESC
    LIMIT ?
  `).bind(orgId, limit).all();

  return result.results as Array<{
    check_id: string;
    phone_number_masked: string;
    phone_country: string;
    fraud_score: number;
    signals: string;
    ai_recommendation?: string;
    ai_confidence?: string;
    ai_reasoning?: string;
    created_at: string;
  }>;
}

// Get billing summary
export async function getBillingSummary(
  db: D1Database,
  orgId: string,
  month: string // YYYY-MM format
): Promise<{
  total_checks: number;
  blocked_count: number;
  fraud_savings: number;
  our_fee: number;
  base_fee: number;
  total_invoice: number;
}> {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`; // D1 handles this correctly

  // Get blocked count
  const stats = await db.prepare(`
    SELECT COUNT(*) as blocked
    FROM sms_checks
    WHERE org_id = ?
    AND decision = 'block'
    AND fraud_score >= 71
    AND created_at BETWEEN ? AND ?
  `).bind(orgId, startDate, endDate).first<{ blocked: number }>();

  // Get total checks
  const total = await db.prepare(`
    SELECT COUNT(*) as total
    FROM sms_checks
    WHERE org_id = ?
    AND created_at BETWEEN ? AND ?
  `).bind(orgId, startDate, endDate).first<{ total: number }>();

  // Get org SMS cost
  const org = await db.prepare(
    'SELECT avg_sms_cost FROM organizations WHERE id = ?'
  ).bind(orgId).first<{ avg_sms_cost: number }>();

  const blockedCount = stats?.blocked ?? 0;
  const avgCost = org?.avg_sms_cost ?? 0.08;
  const fraudSavings = calculateSavings(blockedCount, avgCost);
  const ourFee = calculateFee(fraudSavings);
  const baseFee = 100;

  return {
    total_checks: total?.total ?? 0,
    blocked_count: blockedCount,
    fraud_savings: fraudSavings,
    our_fee: ourFee,
    base_fee: baseFee,
    total_invoice: baseFee + ourFee
  };
}

// Export data as CSV
export async function exportToCSV(
  db: D1Database,
  orgId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const result = await db.prepare(`
    SELECT
      id,
      phone_country,
      phone_carrier,
      phone_type,
      fraud_score,
      decision,
      signals,
      created_at
    FROM sms_checks
    WHERE org_id = ?
    AND created_at BETWEEN ? AND ?
    ORDER BY created_at DESC
    LIMIT 10000
  `).bind(orgId, startDate, endDate).all();

  const headers = [
    'id', 'country', 'carrier', 'type', 'score', 'decision',
    'geo_risk', 'velocity_risk', 'carrier_risk', 'behavior_risk', 'created_at'
  ];

  const rows = (result.results ?? []).map((row: Record<string, unknown>) => {
    const signals = JSON.parse(row.signals as string);
    return [
      row.id,
      row.phone_country,
      row.phone_carrier || '',
      row.phone_type || '',
      row.fraud_score,
      row.decision,
      signals.geo_risk,
      signals.velocity_risk,
      signals.carrier_risk,
      signals.behavior_risk,
      row.created_at
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
