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
import authRoutes from './auth';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://app.smsguard.dev', 'https://smsguard-web.pages.dev'],
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

// Create Stripe Checkout Session
v1.post('/billing/create-checkout', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const body = await c.req.json<{ success_url: string; cancel_url: string }>();

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    // Get or create Stripe customer
    const org = await c.env.DB.prepare(
      'SELECT id, name, stripe_customer_id FROM organizations WHERE id = ?'
    ).bind(user.org).first<{ id: string; name: string; stripe_customer_id: string | null }>();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      // Get user email
      const userData = await c.env.DB.prepare(
        'SELECT email FROM users WHERE id = ?'
      ).bind(user.sub).first<{ email: string }>();

      const customer = await stripe.customers.create({
        email: userData?.email,
        name: org?.name,
        metadata: { org_id: user.org },
      });
      customerId = customer.id;

      await c.env.DB.prepare(
        'UPDATE organizations SET stripe_customer_id = ? WHERE id = ?'
      ).bind(customerId, user.org).run();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'SMSGuard Pro',
            description: 'SMS Pumping Prevention Service',
          },
          unit_amount: 10000,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      metadata: { org_id: user.org },
      subscription_data: { metadata: { org_id: user.org } },
    });

    return c.json<APIResponse<{ url: string }>>({
      success: true,
      data: { url: session.url! }
    });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'stripe_error', message: 'Failed to create checkout session' }
    }, 500);
  }
});

// Create Stripe Billing Portal Session
v1.post('/billing/portal', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const body = await c.req.json<{ return_url: string }>();

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    const org = await c.env.DB.prepare(
      'SELECT stripe_customer_id FROM organizations WHERE id = ?'
    ).bind(user.org).first<{ stripe_customer_id: string | null }>();

    if (!org?.stripe_customer_id) {
      return c.json<APIResponse<null>>({
        success: false,
        error: { code: 'no_customer', message: 'No billing account found. Please subscribe first.' }
      }, 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: body.return_url,
    });

    return c.json<APIResponse<{ url: string }>>({
      success: true,
      data: { url: session.url }
    });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'stripe_error', message: 'Failed to open billing portal' }
    }, 500);
  }
});

// ============================================
// Integration Endpoints (JWT Auth)
// ============================================

// Get all integrations
v1.get('/integrations', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const integrations = await c.env.DB.prepare(`
    SELECT id, provider, status, connected_at, last_sync_at
    FROM integrations WHERE org_id = ?
  `).bind(user.org).all();

  return c.json<APIResponse<typeof integrations.results>>({
    success: true,
    data: integrations.results
  });
});

// Connect an integration
v1.post('/integrations/:provider/connect', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const provider = c.req.param('provider');
  const body = await c.req.json<Record<string, string>>();

  // Validate provider
  const validProviders = ['twilio', 'vonage', 'messagebird', 'plivo', 'sinch', 'aws-sns'];
  if (!validProviders.includes(provider)) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'invalid_provider', message: 'Unsupported provider' }
    }, 400);
  }

  // Validate and verify credentials based on provider
  try {
    if (provider === 'twilio') {
      if (!body.accountSid || !body.authToken) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'Account SID and Auth Token are required' }
        }, 400);
      }
      // Verify Twilio credentials
      const authHeader = btoa(`${body.accountSid}:${body.authToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${body.accountSid}.json`, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });
      if (!response.ok) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'invalid_credentials', message: 'Invalid Twilio credentials' }
        }, 400);
      }
    } else if (provider === 'vonage') {
      if (!body.apiKey || !body.apiSecret) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'API Key and API Secret are required' }
        }, 400);
      }
      // Verify Vonage credentials
      const response = await fetch(`https://rest.nexmo.com/account/get-balance?api_key=${body.apiKey}&api_secret=${body.apiSecret}`);
      if (!response.ok) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'invalid_credentials', message: 'Invalid Vonage credentials' }
        }, 400);
      }
    } else if (provider === 'messagebird') {
      if (!body.apiKey) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'API Key is required' }
        }, 400);
      }
      // Verify MessageBird credentials
      const response = await fetch('https://rest.messagebird.com/balance', {
        headers: { 'Authorization': `AccessKey ${body.apiKey}` }
      });
      if (!response.ok) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'invalid_credentials', message: 'Invalid MessageBird credentials' }
        }, 400);
      }
    } else if (provider === 'plivo') {
      if (!body.authId || !body.authToken) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'Auth ID and Auth Token are required' }
        }, 400);
      }
      // Verify Plivo credentials
      const authHeader = btoa(`${body.authId}:${body.authToken}`);
      const response = await fetch(`https://api.plivo.com/v1/Account/${body.authId}/`, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });
      if (!response.ok) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'invalid_credentials', message: 'Invalid Plivo credentials' }
        }, 400);
      }
    } else if (provider === 'sinch') {
      if (!body.servicePlanId || !body.apiToken) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'Service Plan ID and API Token are required' }
        }, 400);
      }
      // Verify Sinch credentials
      const response = await fetch(`https://us.sms.api.sinch.com/xms/v1/${body.servicePlanId}/batches`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${body.apiToken}` }
      });
      if (!response.ok && response.status !== 404) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'invalid_credentials', message: 'Invalid Sinch credentials' }
        }, 400);
      }
    } else if (provider === 'aws-sns') {
      if (!body.accessKeyId || !body.secretAccessKey || !body.region) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'Access Key ID, Secret Access Key, and Region are required' }
        }, 400);
      }
      // AWS credentials will be validated when used - store for now
      // Full AWS SigV4 signing is complex, we'll validate on first use
    }
  } catch (err) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'validation_error', message: 'Failed to validate credentials' }
    }, 500);
  }

  // Store integration (encrypt credentials in production)
  const integrationId = `int_${crypto.randomUUID().replace(/-/g, '')}`;

  // Check if integration already exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ?'
  ).bind(user.org, provider).first();

  if (existing) {
    // Update existing
    await c.env.DB.prepare(`
      UPDATE integrations
      SET status = 'connected', credentials = ?, connected_at = datetime('now')
      WHERE org_id = ? AND provider = ?
    `).bind(JSON.stringify(body), user.org, provider).run();
  } else {
    // Create new
    await c.env.DB.prepare(`
      INSERT INTO integrations (id, org_id, provider, status, credentials, connected_at)
      VALUES (?, ?, ?, 'connected', ?, datetime('now'))
    `).bind(integrationId, user.org, provider, JSON.stringify(body)).run();
  }

  return c.json<APIResponse<{ connected: boolean; provider: string }>>({
    success: true,
    data: { connected: true, provider }
  });
});

// Disconnect an integration
v1.delete('/integrations/:provider', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const provider = c.req.param('provider');

  await c.env.DB.prepare(
    'DELETE FROM integrations WHERE org_id = ? AND provider = ?'
  ).bind(user.org, provider).run();

  return c.json<APIResponse<{ disconnected: boolean }>>({
    success: true,
    data: { disconnected: true }
  });
});

// Import historical data from provider
v1.post('/integrations/import-history', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const body = await c.req.json<{ provider: string; dateRange: string }>();

  // Check if provider is connected
  const integration = await c.env.DB.prepare(
    'SELECT credentials FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(user.org, body.provider, 'connected').first<{ credentials: string }>();

  if (!integration) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'not_connected', message: 'Please connect your provider first' }
    }, 400);
  }

  // For now, simulate import (in production, would call provider API)
  let importedCount = 0;

  if (body.provider === 'twilio') {
    const credentials = JSON.parse(integration.credentials);
    const authHeader = btoa(`${credentials.accountSid}:${credentials.authToken}`);

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (body.dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    try {
      // Fetch messages from Twilio
      const messagesUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json?DateSent>=${startDate.toISOString().split('T')[0]}&PageSize=1000`;
      const response = await fetch(messagesUrl, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });

      if (response.ok) {
        const data = await response.json() as { messages?: any[] };
        importedCount = data.messages?.length || 0;

        // Store imported messages for analysis (simplified)
        // In production, would process each message and run fraud analysis
      }
    } catch (err) {
      console.error('Twilio import error:', err);
    }
  }

  // Update last sync time
  await c.env.DB.prepare(`
    UPDATE integrations SET last_sync_at = datetime('now') WHERE org_id = ? AND provider = ?
  `).bind(user.org, body.provider).run();

  return c.json<APIResponse<{ imported: number; provider: string }>>({
    success: true,
    data: { imported: importedCount, provider: body.provider }
  });
});

// Re-analyze a review queue item
v1.post('/review-queue/:checkId/reanalyze', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const checkId = c.req.param('checkId');

  // Get the check
  const check = await c.env.DB.prepare(
    'SELECT * FROM sms_checks WHERE id = ? AND org_id = ?'
  ).bind(checkId, user.org).first();

  if (!check) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'not_found', message: 'Check not found' }
    }, 404);
  }

  // Trigger AI re-analysis
  try {
    const agent = createAIAgent(c.env.ANTHROPIC_API_KEY);
    const historicalData = await getHistoricalData(c.env.DB, check.phone_number as string);
    const review = await agent.reviewCheck(check as any, historicalData);

    // Update or insert AI review
    const existingReview = await c.env.DB.prepare(
      'SELECT id FROM ai_reviews WHERE check_id = ?'
    ).bind(checkId).first();

    if (existingReview) {
      await c.env.DB.prepare(`
        UPDATE ai_reviews
        SET recommendation = ?, confidence = ?, reasoning = ?, created_at = datetime('now')
        WHERE check_id = ?
      `).bind(review.recommendation, review.confidence, review.reasoning, checkId).run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO ai_reviews (id, check_id, recommendation, confidence, reasoning)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        `rev_${crypto.randomUUID().replace(/-/g, '')}`,
        checkId,
        review.recommendation,
        review.confidence,
        review.reasoning
      ).run();
    }

    return c.json<APIResponse<{
      recommendation: string;
      confidence: string;
      reasoning: string;
    }>>({
      success: true,
      data: {
        recommendation: review.recommendation,
        confidence: review.confidence,
        reasoning: review.reasoning
      }
    });
  } catch (err) {
    console.error('AI reanalysis error:', err);
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'ai_error', message: 'Failed to reanalyze' }
    }, 500);
  }
});

// Sync integration data
v1.post('/integrations/:provider/sync', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const provider = c.req.param('provider');

  // Check if connected
  const integration = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(user.org, provider, 'connected').first();

  if (!integration) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'not_connected', message: 'Provider not connected' }
    }, 400);
  }

  // Update last sync time
  await c.env.DB.prepare(`
    UPDATE integrations SET last_sync_at = datetime('now') WHERE org_id = ? AND provider = ?
  `).bind(user.org, provider).run();

  return c.json<APIResponse<{ synced: boolean; synced_at: string }>>({
    success: true,
    data: { synced: true, synced_at: new Date().toISOString() }
  });
});

// Mount routes
app.route('/auth', authRoutes);
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
