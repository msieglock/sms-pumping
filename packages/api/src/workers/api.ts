import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, SMSCheckRequest, SMSCheckResponse, APIResponse } from '../types';
import { analyzeRequest } from '../services/detection';
import { createAIAgent, getHistoricalData } from '../services/ai-agent';
import {
  getAnalyticsSummary,
  getRealTimeStats,
  getGeoBreakdown,
  getReviewQueue,
  getBillingSummary,
  exportToCSV
} from '../services/analytics';
import { verifyAPIKey, verifyJWT, hashAPIKey } from '../middleware/auth';
import { RateLimiter } from './rate-limiter';
import { VelocityTracker } from './velocity-tracker';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://app.smsguard.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Idempotency-Key'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API version prefix
const v1 = new Hono<{ Bindings: Env }>();

// ============================================
// SMS Check Endpoints (API Key Auth)
// ============================================

// Check SMS request
v1.post('/sms/check', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Missing API key' }
    }, 401);
  }

  const keyData = await verifyAPIKey(c.env.DB, apiKey);
  if (!keyData) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid API key' }
    }, 401);
  }

  const body = await c.req.json<SMSCheckRequest>();

  if (!body.phone_number) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'invalid_request', message: 'phone_number is required' }
    }, 400);
  }

  // Run detection
  const result = await analyzeRequest(
    c.env,
    body.phone_number,
    body.ip_address,
    body.user_agent,
    body.session_id,
    body.metadata
  );

  // Generate check ID
  const checkId = `chk_${crypto.randomUUID().replace(/-/g, '')}`;

  // Store in database
  await c.env.DB.prepare(`
    INSERT INTO sms_checks (
      id, org_id, phone_number, phone_country, phone_carrier, phone_type,
      ip_address, user_agent, session_id, fraud_score, decision, signals, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    checkId,
    keyData.org_id,
    body.phone_number,
    result.phoneInfo.country,
    result.phoneInfo.carrier,
    result.phoneInfo.type,
    body.ip_address,
    body.user_agent || null,
    body.session_id || null,
    result.fraudScore,
    result.decision,
    JSON.stringify(result.signals),
    body.metadata ? JSON.stringify(body.metadata) : null
  ).run();

  // If review, trigger AI agent asynchronously
  if (result.decision === 'review') {
    await c.env.EVENTS_QUEUE.send({
      type: 'review_needed',
      checkId,
      orgId: keyData.org_id
    });
  }

  // Update API key last used
  await c.env.DB.prepare(
    'UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?'
  ).bind(keyData.id).run();

  const response: SMSCheckResponse = {
    id: checkId,
    decision: result.decision,
    fraud_score: result.fraudScore,
    signals: result.signals,
    phone_info: result.phoneInfo,
    created_at: new Date().toISOString()
  };

  return c.json<APIResponse<SMSCheckResponse>>({
    success: true,
    data: response
  });
});

// Report SMS outcome
v1.post('/sms/report', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Missing API key' }
    }, 401);
  }

  const keyData = await verifyAPIKey(c.env.DB, apiKey);
  if (!keyData) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid API key' }
    }, 401);
  }

  const body = await c.req.json<{
    check_id: string;
    sms_sent?: boolean;
    code_verified?: boolean;
  }>();

  await c.env.DB.prepare(`
    UPDATE sms_checks
    SET sms_sent = ?, code_verified = ?
    WHERE id = ? AND org_id = ?
  `).bind(
    body.sms_sent ? 1 : 0,
    body.code_verified ? 1 : 0,
    body.check_id,
    keyData.org_id
  ).run();

  return c.json<APIResponse<{ updated: boolean }>>({
    success: true,
    data: { updated: true }
  });
});

// Override decision
v1.post('/sms/override', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Missing API key' }
    }, 401);
  }

  const keyData = await verifyAPIKey(c.env.DB, apiKey);
  if (!keyData) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid API key' }
    }, 401);
  }

  const body = await c.req.json<{
    check_id: string;
    action: 'allow' | 'deny';
  }>();

  // Update AI review with human override
  await c.env.DB.prepare(`
    UPDATE ai_reviews
    SET human_override = ?, overridden_at = datetime('now')
    WHERE check_id = ?
  `).bind(body.action, body.check_id).run();

  return c.json<APIResponse<{ overridden: boolean }>>({
    success: true,
    data: { overridden: true }
  });
});

// ============================================
// Configuration Endpoints (API Key Auth)
// ============================================

// Get geo rules
v1.get('/config/geo-rules', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  const keyData = await verifyAPIKey(c.env.DB, apiKey || '');
  if (!keyData) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid API key' }
    }, 401);
  }

  const rules = await c.env.DB.prepare(
    'SELECT country_code, action, created_at FROM geo_rules WHERE org_id = ?'
  ).bind(keyData.org_id).all();

  return c.json<APIResponse<typeof rules.results>>({
    success: true,
    data: rules.results
  });
});

// Update geo rules
v1.put('/config/geo-rules', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  const keyData = await verifyAPIKey(c.env.DB, apiKey || '');
  if (!keyData) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid API key' }
    }, 401);
  }

  const body = await c.req.json<{
    rules: Array<{ country_code: string; action: 'allow' | 'block' }>;
  }>();

  // Delete existing and insert new
  await c.env.DB.prepare('DELETE FROM geo_rules WHERE org_id = ?').bind(keyData.org_id).run();

  for (const rule of body.rules) {
    await c.env.DB.prepare(`
      INSERT INTO geo_rules (id, org_id, country_code, action)
      VALUES (?, ?, ?, ?)
    `).bind(
      `geo_${crypto.randomUUID().replace(/-/g, '')}`,
      keyData.org_id,
      rule.country_code,
      rule.action
    ).run();
  }

  return c.json<APIResponse<{ updated: boolean }>>({
    success: true,
    data: { updated: true }
  });
});

// ============================================
// Analytics Endpoints (JWT Auth)
// ============================================

// Get analytics summary
v1.get('/analytics/summary', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const range = c.req.query('range') || '24h';
  const now = new Date();
  let startDate: Date;

  switch (range) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const summary = await getAnalyticsSummary(
    c.env.DB,
    user.org,
    startDate.toISOString(),
    now.toISOString()
  );

  return c.json<APIResponse<typeof summary>>({
    success: true,
    data: summary
  });
});

// Get real-time stats
v1.get('/analytics/realtime', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const stats = await getRealTimeStats(c.env.DB, user.org);

  return c.json<APIResponse<typeof stats>>({
    success: true,
    data: stats
  });
});

// Get geographic breakdown
v1.get('/analytics/geo', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const days = parseInt(c.req.query('days') || '30');
  const breakdown = await getGeoBreakdown(c.env.DB, user.org, days);

  return c.json<APIResponse<typeof breakdown>>({
    success: true,
    data: breakdown
  });
});

// Get review queue
v1.get('/review-queue', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const queue = await getReviewQueue(c.env.DB, user.org);

  return c.json<APIResponse<typeof queue>>({
    success: true,
    data: queue
  });
});

// Export data
v1.get('/export/csv', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const startDate = c.req.query('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = c.req.query('end') || new Date().toISOString();

  const csv = await exportToCSV(c.env.DB, user.org, startDate, endDate);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="smsguard-export.csv"'
    }
  });
});

// ============================================
// Billing Endpoints (JWT Auth)
// ============================================

v1.get('/billing/summary', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const month = c.req.query('month') || new Date().toISOString().slice(0, 7);
  const summary = await getBillingSummary(c.env.DB, user.org, month);

  return c.json<APIResponse<typeof summary>>({
    success: true,
    data: summary
  });
});

// Mount v1 routes
app.route('/v1', v1);

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      const data = message.body as { type: string; checkId: string; orgId: string };

      if (data.type === 'review_needed') {
        // Process AI review
        const check = await env.DB.prepare(
          'SELECT * FROM sms_checks WHERE id = ?'
        ).bind(data.checkId).first();

        if (check) {
          const agent = createAIAgent(env.ANTHROPIC_API_KEY);
          const historicalData = await getHistoricalData(env.DB, check.phone_number as string);

          const review = await agent.reviewCheck(check as any, historicalData);

          await env.DB.prepare(`
            INSERT INTO ai_reviews (id, check_id, recommendation, confidence, reasoning)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            `rev_${crypto.randomUUID().replace(/-/g, '')}`,
            data.checkId,
            review.recommendation,
            review.confidence,
            review.reasoning
          ).run();
        }
      }

      message.ack();
    }
  }
};

// Export Durable Objects
export { RateLimiter, VelocityTracker };
