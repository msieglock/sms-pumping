import { Env, SignalBreakdown, PhoneInfo, VelocityData, CountryRiskData } from '../types';

// Phone number parsing utilities
function parsePhoneNumber(phone: string): { country: string; prefix: string; number: string } {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Country code mappings (simplified - would use libphonenumber in production)
  const countryPrefixes: Record<string, string> = {
    '1': 'US', // US/Canada
    '44': 'GB',
    '49': 'DE',
    '33': 'FR',
    '81': 'JP',
    '86': 'CN',
    '91': 'IN',
    '55': 'BR',
    '52': 'MX',
    '62': 'ID',
    '63': 'PH',
    '234': 'NG',
    '92': 'PK',
    '66': 'TH',
    '84': 'VN',
    '61': 'AU',
  };

  let country = 'UNKNOWN';
  let prefix = '';

  const withoutPlus = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;

  // Try 3-digit, then 2-digit, then 1-digit country codes
  for (const len of [3, 2, 1]) {
    const possiblePrefix = withoutPlus.slice(0, len);
    if (countryPrefixes[possiblePrefix]) {
      country = countryPrefixes[possiblePrefix];
      prefix = possiblePrefix;
      break;
    }
  }

  return {
    country,
    prefix: withoutPlus.slice(0, 7), // First 7 digits as prefix for velocity tracking
    number: withoutPlus
  };
}

// Get country risk data
async function getCountryRisk(db: D1Database, countryCode: string): Promise<CountryRiskData | null> {
  const result = await db.prepare(
    'SELECT * FROM country_risk WHERE code = ?'
  ).bind(countryCode).first<CountryRiskData>();

  return result;
}

// Check if IP country matches phone country
function checkGeoMismatch(ipCountry: string | null, phoneCountry: string): boolean {
  if (!ipCountry) return false;
  return ipCountry.toUpperCase() !== phoneCountry.toUpperCase();
}

// Detect sequential numbers
function detectSequentialNumbers(recentNumbers: string[]): boolean {
  if (recentNumbers.length < 3) return false;

  // Sort and check for sequential patterns
  const sorted = recentNumbers.map(n => parseInt(n.slice(-4))).sort((a, b) => a - b);

  let sequentialCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i-1] === 1) {
      sequentialCount++;
      if (sequentialCount >= 2) return true;
    } else {
      sequentialCount = 0;
    }
  }

  return false;
}

// Calculate velocity risk score
function calculateVelocityRisk(velocity: VelocityData, limits: {
  max_1min: number;
  max_5min: number;
  max_1hr: number;
}): number {
  let score = 0;

  // Check against limits
  if (velocity.requests_1min > limits.max_1min) {
    score += Math.min(40, (velocity.requests_1min / limits.max_1min) * 20);
  }

  if (velocity.requests_5min > limits.max_5min) {
    score += Math.min(30, (velocity.requests_5min / limits.max_5min) * 15);
  }

  if (velocity.requests_1hr > limits.max_1hr) {
    score += Math.min(20, (velocity.requests_1hr / limits.max_1hr) * 10);
  }

  // Sequential number detection adds significant risk
  if (velocity.sequential_detected) {
    score += 30;
  }

  return Math.min(100, score);
}

// Calculate carrier risk score
function calculateCarrierRisk(
  phoneType: string,
  carrierRiskScore: number,
  deliveryRate: number
): number {
  let score = carrierRiskScore;

  // VoIP numbers are higher risk
  if (phoneType === 'voip') {
    score += 25;
  }

  // Low delivery rates indicate potential fraud destination
  if (deliveryRate < 0.7) {
    score += 20;
  } else if (deliveryRate < 0.85) {
    score += 10;
  }

  return Math.min(100, score);
}

// Calculate behavioral risk score
function calculateBehavioralRisk(
  sessionDuration: number | null, // milliseconds from page load to SMS request
  conversionRate: number, // historical verification success rate
  userAgentRisk: number
): number {
  let score = 0;

  // Very fast requests are suspicious
  if (sessionDuration !== null) {
    if (sessionDuration < 1000) {
      score += 30; // Less than 1 second
    } else if (sessionDuration < 3000) {
      score += 15; // Less than 3 seconds
    }
  }

  // Low conversion rates indicate fraud
  if (conversionRate < 0.1) {
    score += 40;
  } else if (conversionRate < 0.3) {
    score += 20;
  } else if (conversionRate < 0.5) {
    score += 10;
  }

  // User agent risk (bot detection)
  score += userAgentRisk;

  return Math.min(100, score);
}

// Analyze user agent for bot indicators
function analyzeUserAgent(userAgent: string | undefined): number {
  if (!userAgent) return 20; // Missing UA is suspicious

  const ua = userAgent.toLowerCase();
  let risk = 0;

  // Known bot indicators
  const botIndicators = ['bot', 'crawler', 'spider', 'headless', 'phantom', 'selenium'];
  for (const indicator of botIndicators) {
    if (ua.includes(indicator)) {
      risk += 40;
      break;
    }
  }

  // Missing browser indicators
  if (!ua.includes('mozilla') && !ua.includes('chrome') && !ua.includes('safari')) {
    risk += 15;
  }

  // Very short user agents
  if (userAgent.length < 50) {
    risk += 10;
  }

  return Math.min(50, risk);
}

// Main detection function
export interface DetectionResult {
  signals: SignalBreakdown;
  phoneInfo: PhoneInfo;
  decision: 'allow' | 'block' | 'review';
  fraudScore: number;
}

export async function analyzeRequest(
  env: Env,
  phoneNumber: string,
  ipAddress: string,
  userAgent?: string,
  sessionId?: string,
  metadata?: Record<string, unknown>
): Promise<DetectionResult> {
  const parsed = parsePhoneNumber(phoneNumber);

  // Get country risk
  const countryRisk = await getCountryRisk(env.DB, parsed.country);
  const geoBaseScore = countryRisk?.base_score ?? 50;

  // Check geo rules for this org (would need org_id passed in)
  // For now, use country base score

  // Get IP country (would use MaxMind or similar in production)
  const ipCountry = await getIPCountry(ipAddress);
  const geoMismatch = checkGeoMismatch(ipCountry, parsed.country);

  // Calculate geo risk
  let geoRisk = geoBaseScore;
  if (geoMismatch) {
    geoRisk += 25;
  }
  geoRisk = Math.min(100, geoRisk);

  // Get velocity data from Durable Object
  const velocityId = env.VELOCITY_TRACKER.idFromName(`ip:${ipAddress}`);
  const velocityObj = env.VELOCITY_TRACKER.get(velocityId);

  const velocityData = await velocityObj.fetch(new Request('http://internal/get', {
    method: 'POST',
    body: JSON.stringify({
      phonePrefix: parsed.prefix,
      phoneNumber: phoneNumber
    })
  })).then(r => r.json()) as VelocityData;

  // Calculate velocity risk
  const velocityRisk = calculateVelocityRisk(velocityData, {
    max_1min: 5,
    max_5min: 20,
    max_1hr: 100
  });

  // Get carrier info (would use Twilio Lookup or similar)
  const carrierInfo = await lookupCarrier(phoneNumber);

  // Calculate carrier risk
  const carrierRisk = calculateCarrierRisk(
    carrierInfo.type,
    carrierInfo.riskScore,
    carrierInfo.deliveryRate
  );

  // Calculate behavioral risk
  const uaRisk = analyzeUserAgent(userAgent);
  const conversionRate = await getConversionRate(env.DB, parsed.prefix);

  const behaviorRisk = calculateBehavioralRisk(
    null, // Session duration would come from client
    conversionRate,
    uaRisk
  );

  // Calculate weighted fraud score
  const signals: SignalBreakdown = {
    geo_risk: geoRisk,
    velocity_risk: velocityRisk,
    carrier_risk: carrierRisk,
    behavior_risk: behaviorRisk
  };

  const fraudScore = Math.round(
    signals.geo_risk * 0.25 +
    signals.velocity_risk * 0.30 +
    signals.carrier_risk * 0.25 +
    signals.behavior_risk * 0.20
  );

  // Determine decision based on thresholds
  let decision: 'allow' | 'block' | 'review';
  if (fraudScore <= 30) {
    decision = 'allow';
  } else if (fraudScore >= 71) {
    decision = 'block';
  } else {
    decision = 'review';
  }

  const phoneInfo: PhoneInfo = {
    country: parsed.country,
    carrier: carrierInfo.name,
    type: carrierInfo.type as PhoneInfo['type'],
    risk_level: countryRisk?.risk_tier ?? 'medium'
  };

  // Record the request in velocity tracker
  await velocityObj.fetch(new Request('http://internal/record', {
    method: 'POST',
    body: JSON.stringify({
      phoneNumber,
      timestamp: Date.now()
    })
  }));

  return {
    signals,
    phoneInfo,
    decision,
    fraudScore
  };
}

// Stub functions - would be replaced with actual implementations

async function getIPCountry(ip: string): Promise<string | null> {
  // Would use MaxMind GeoIP2 or similar
  // For now, return null
  return null;
}

async function lookupCarrier(phoneNumber: string): Promise<{
  name: string | null;
  type: string;
  riskScore: number;
  deliveryRate: number;
}> {
  // Would use Twilio Lookup API or similar
  return {
    name: null,
    type: 'mobile',
    riskScore: 30,
    deliveryRate: 0.95
  };
}

async function getConversionRate(db: D1Database, phonePrefix: string): Promise<number> {
  // Calculate historical verification rate for this prefix
  const result = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN code_verified = 1 THEN 1 ELSE 0 END) as verified
    FROM sms_checks
    WHERE phone_number LIKE ? || '%'
    AND created_at > datetime('now', '-30 days')
  `).bind(phonePrefix).first<{ total: number; verified: number }>();

  if (!result || result.total === 0) return 0.5; // Default 50% if no data

  return result.verified / result.total;
}
