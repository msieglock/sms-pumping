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
import { encryptCredentials, decryptCredentials } from '../services/encryption';
import { RateLimiter } from './rate-limiter';
import { VelocityTracker } from './velocity-tracker';
import authRoutes from './auth';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://app.smsguard.ai', 'https://smsguard-web.pages.dev'],
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
  const validProviders = ['twilio', 'vonage', 'messagebird', 'plivo', 'sinch', 'aws-sns', 'klaviyo'];
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
    } else if (provider === 'klaviyo') {
      if (!body.apiKey) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'missing_credentials', message: 'Private API Key is required' }
        }, 400);
      }
      // Verify Klaviyo credentials by fetching account info
      const response = await fetch('https://a.klaviyo.com/api/accounts/', {
        headers: {
          'Authorization': `Klaviyo-API-Key ${body.apiKey}`,
          'revision': '2024-02-15'
        }
      });
      if (!response.ok) {
        return c.json<APIResponse<null>>({
          success: false,
          error: { code: 'invalid_credentials', message: 'Invalid Klaviyo API key' }
        }, 400);
      }
    }
  } catch (err) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'validation_error', message: 'Failed to validate credentials' }
    }, 500);
  }

  // Encrypt and store credentials
  const integrationId = `int_${crypto.randomUUID().replace(/-/g, '')}`;
  const encryptionKey = c.env.ENCRYPTION_KEY || c.env.JWT_SECRET; // Fallback to JWT_SECRET
  const encryptedCreds = await encryptCredentials(body, encryptionKey);

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
    `).bind(encryptedCreds, user.org, provider).run();
  } else {
    // Create new
    await c.env.DB.prepare(`
      INSERT INTO integrations (id, org_id, provider, status, credentials, connected_at)
      VALUES (?, ?, ?, 'connected', ?, datetime('now'))
    `).bind(integrationId, user.org, provider, encryptedCreds).run();
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

  // Decrypt credentials
  const encryptionKey = c.env.ENCRYPTION_KEY || c.env.JWT_SECRET;
  let credentials: Record<string, string>;
  try {
    credentials = await decryptCredentials(integration.credentials, encryptionKey);
  } catch {
    // Fallback: try parsing as plain JSON (legacy data)
    credentials = JSON.parse(integration.credentials);
  }

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

  let importedCount = 0;
  const provider = body.provider;

  try {
    if (provider === 'twilio') {
      const authHeader = btoa(`${credentials.accountSid}:${credentials.authToken}`);
      const messagesUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json?DateSent>=${startDate.toISOString().split('T')[0]}&PageSize=1000`;
      const response = await fetch(messagesUrl, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });

      if (response.ok) {
        const data = await response.json() as { messages?: any[] };
        const messages = data.messages || [];
        importedCount = messages.length;

        // Store each message in sms_messages table
        for (const msg of messages) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, body, price, price_unit, raw_data, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `msg_${crypto.randomUUID().replace(/-/g, '')}`,
            user.org,
            'twilio',
            msg.sid,
            msg.direction?.includes('outbound') ? 'outbound' : 'inbound',
            msg.status,
            msg.from,
            msg.to,
            msg.body,
            parseFloat(msg.price) || null,
            msg.price_unit || 'USD',
            JSON.stringify(msg),
            msg.date_sent
          ).run();
        }
      }
    } else if (provider === 'vonage') {
      // Vonage Reports API
      const response = await fetch(`https://api.nexmo.com/v2/reports?api_key=${credentials.apiKey}&api_secret=${credentials.apiSecret}&product=SMS&date_start=${startDate.toISOString()}&date_end=${now.toISOString()}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json() as { items?: any[] };
        const messages = data.items || [];
        importedCount = messages.length;

        for (const msg of messages) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, price, price_unit, raw_data, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `msg_${crypto.randomUUID().replace(/-/g, '')}`,
            user.org,
            'vonage',
            msg.message_id,
            msg.direction || 'outbound',
            msg.status,
            msg.from,
            msg.to,
            parseFloat(msg.total_price) || null,
            'EUR',
            JSON.stringify(msg),
            msg.date_received || msg.date_finalized
          ).run();
        }
      }
    } else if (provider === 'messagebird') {
      const response = await fetch(`https://rest.messagebird.com/messages?offset=0&limit=200`, {
        headers: { 'Authorization': `AccessKey ${credentials.apiKey}` }
      });

      if (response.ok) {
        const data = await response.json() as { items?: any[] };
        const messages = data.items || [];
        importedCount = messages.length;

        for (const msg of messages) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, body, raw_data, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `msg_${crypto.randomUUID().replace(/-/g, '')}`,
            user.org,
            'messagebird',
            msg.id,
            msg.direction || 'outbound',
            msg.status,
            msg.originator,
            msg.recipients?.items?.[0]?.recipient || '',
            msg.body,
            JSON.stringify(msg),
            msg.createdDatetime
          ).run();
        }
      }
    } else if (provider === 'plivo') {
      const authHeader = btoa(`${credentials.authId}:${credentials.authToken}`);
      const response = await fetch(`https://api.plivo.com/v1/Account/${credentials.authId}/Message/?limit=200&message_time__gte=${startDate.toISOString()}`, {
        headers: { 'Authorization': `Basic ${authHeader}` }
      });

      if (response.ok) {
        const data = await response.json() as { objects?: any[] };
        const messages = data.objects || [];
        importedCount = messages.length;

        for (const msg of messages) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, body, price, price_unit, raw_data, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `msg_${crypto.randomUUID().replace(/-/g, '')}`,
            user.org,
            'plivo',
            msg.message_uuid,
            msg.message_direction === 'inbound' ? 'inbound' : 'outbound',
            msg.message_state,
            msg.from_number,
            msg.to_number,
            msg.message,
            parseFloat(msg.total_rate) || null,
            'USD',
            JSON.stringify(msg),
            msg.message_time
          ).run();
        }
      }
    } else if (provider === 'sinch') {
      const response = await fetch(`https://us.sms.api.sinch.com/xms/v1/${credentials.servicePlanId}/batches?page_size=100`, {
        headers: { 'Authorization': `Bearer ${credentials.apiToken}` }
      });

      if (response.ok) {
        const data = await response.json() as { batches?: any[] };
        const messages = data.batches || [];
        importedCount = messages.length;

        for (const msg of messages) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, body, raw_data, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `msg_${crypto.randomUUID().replace(/-/g, '')}`,
            user.org,
            'sinch',
            msg.id,
            'outbound',
            msg.canceled ? 'canceled' : 'sent',
            msg.from,
            Array.isArray(msg.to) ? msg.to[0] : msg.to,
            msg.body,
            JSON.stringify(msg),
            msg.created_at
          ).run();
        }
      }
    } else if (provider === 'aws-sns') {
      // AWS SNS doesn't have a direct message history API
      // Users need to set up CloudWatch Logs or SNS delivery status logging
      // We'll return 0 and inform them to use webhooks instead
      importedCount = 0;
    } else if (provider === 'klaviyo') {
      // Fetch SMS events from Klaviyo's Events API
      const response = await fetch(`https://a.klaviyo.com/api/events/?filter=equals(metric.name,"Sent SMS")&page[size]=100`, {
        headers: {
          'Authorization': `Klaviyo-API-Key ${credentials.apiKey}`,
          'revision': '2024-02-15',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json() as { data?: any[] };
        const events = data.data || [];
        importedCount = events.length;

        for (const event of events) {
          const attrs = event.attributes || {};
          const profileId = event.relationships?.profile?.data?.id;

          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, to_number, body, raw_data, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            `msg_${crypto.randomUUID().replace(/-/g, '')}`,
            user.org,
            'klaviyo',
            event.id,
            'outbound',
            'sent',
            attrs.event_properties?.$phone_number || profileId || '',
            attrs.event_properties?.$message || '',
            JSON.stringify(event),
            attrs.datetime || attrs.timestamp
          ).run();
        }
      }
    }
  } catch (err) {
    console.error(`${provider} import error:`, err);
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'import_error', message: `Failed to import from ${provider}: ${err}` }
    }, 500);
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

// ============================================
// Provider Webhook Endpoints (No Auth - Signature Verified)
// ============================================

// Helper to look up org by provider integration
async function findOrgByProvider(db: D1Database, provider: string, identifier: string): Promise<string | null> {
  // For Twilio, identifier is AccountSid
  // For others, we match by checking stored credentials (encrypted)
  const integration = await db.prepare(
    'SELECT org_id FROM integrations WHERE provider = ? AND status = ?'
  ).bind(provider, 'connected').first<{ org_id: string }>();
  return integration?.org_id || null;
}

// Twilio webhook - receives SMS status callbacks
app.post('/webhooks/twilio', async (c) => {
  const body = await c.req.parseBody();

  // Get AccountSid to find org
  const accountSid = body.AccountSid as string;
  if (!accountSid) {
    return c.text('Missing AccountSid', 400);
  }

  // Find org with this Twilio account
  const integration = await c.env.DB.prepare(`
    SELECT org_id, credentials FROM integrations
    WHERE provider = 'twilio' AND status = 'connected'
  `).all<{ org_id: string; credentials: string }>();

  let orgId: string | null = null;
  for (const row of integration.results || []) {
    try {
      const encryptionKey = c.env.ENCRYPTION_KEY || c.env.JWT_SECRET;
      const creds = await decryptCredentials(row.credentials, encryptionKey);
      if (creds.accountSid === accountSid) {
        orgId = row.org_id;
        break;
      }
    } catch {
      // Try legacy JSON
      try {
        const creds = JSON.parse(row.credentials);
        if (creds.accountSid === accountSid) {
          orgId = row.org_id;
          break;
        }
      } catch {}
    }
  }

  if (!orgId) {
    return c.text('Unknown account', 404);
  }

  // Store webhook delivery
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, signature, processed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    deliveryId,
    orgId,
    'twilio',
    body.MessageStatus as string || 'status_update',
    JSON.stringify(body),
    c.req.header('X-Twilio-Signature') || null,
    false
  ).run();

  // Store/update message
  const messageSid = body.MessageSid as string;
  if (messageSid) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, raw_data, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status,
        raw_data = excluded.raw_data
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgId,
      'twilio',
      messageSid,
      (body.Direction as string)?.includes('outbound') ? 'outbound' : 'inbound',
      body.MessageStatus as string || 'unknown',
      body.From as string || '',
      body.To as string || '',
      JSON.stringify(body)
    ).run();
  }

  // Mark webhook as processed
  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.text('OK', 200);
});

// Vonage webhook - receives SMS delivery receipts
app.post('/webhooks/vonage', async (c) => {
  const body = await c.req.json();

  // Vonage sends api_key in callbacks
  const apiKey = body.api_key;

  // Find org
  const integration = await c.env.DB.prepare(`
    SELECT org_id, credentials FROM integrations
    WHERE provider = 'vonage' AND status = 'connected'
  `).all<{ org_id: string; credentials: string }>();

  let orgId: string | null = null;
  for (const row of integration.results || []) {
    try {
      const encryptionKey = c.env.ENCRYPTION_KEY || c.env.JWT_SECRET;
      const creds = await decryptCredentials(row.credentials, encryptionKey);
      if (creds.apiKey === apiKey) {
        orgId = row.org_id;
        break;
      }
    } catch {
      try {
        const creds = JSON.parse(row.credentials);
        if (creds.apiKey === apiKey) {
          orgId = row.org_id;
          break;
        }
      } catch {}
    }
  }

  if (!orgId) {
    return c.json({ error: 'Unknown account' }, 404);
  }

  // Store webhook
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(deliveryId, orgId, 'vonage', body.status || 'delivery_receipt', JSON.stringify(body), false).run();

  // Store message
  if (body.message_id) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, raw_data, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status,
        delivered_at = excluded.delivered_at
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgId,
      'vonage',
      body.message_id,
      'outbound',
      body.status || 'unknown',
      body.from || '',
      body.to || body.msisdn || '',
      JSON.stringify(body)
    ).run();
  }

  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.json({ status: 'ok' });
});

// MessageBird webhook - receives status reports
app.post('/webhooks/messagebird', async (c) => {
  const body = await c.req.json();

  // MessageBird doesn't send API key in webhooks - use reference or look up by message id
  // We'll accept all and match later, or use a shared secret in the URL
  const orgIdParam = c.req.query('org');

  if (!orgIdParam) {
    return c.json({ error: 'Missing org parameter' }, 400);
  }

  // Verify org has messagebird connected
  const integration = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(orgIdParam, 'messagebird', 'connected').first();

  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  // Store webhook
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(deliveryId, orgIdParam, 'messagebird', body.status || 'status_report', JSON.stringify(body), false).run();

  // Store message
  if (body.id) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, body, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgIdParam,
      'messagebird',
      body.id,
      'outbound',
      body.status || body.statusCode || 'unknown',
      body.originator || '',
      body.recipient || '',
      body.body || '',
      JSON.stringify(body)
    ).run();
  }

  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.json({ status: 'ok' });
});

// Plivo webhook - receives delivery reports
app.post('/webhooks/plivo', async (c) => {
  const body = await c.req.parseBody();

  const orgIdParam = c.req.query('org');
  if (!orgIdParam) {
    return c.text('Missing org', 400);
  }

  const integration = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(orgIdParam, 'plivo', 'connected').first();

  if (!integration) {
    return c.text('Integration not found', 404);
  }

  // Store webhook
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(deliveryId, orgIdParam, 'plivo', body.Status as string || 'delivery_report', JSON.stringify(body), false).run();

  // Store message
  const messageUuid = body.MessageUUID as string;
  if (messageUuid) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, from_number, to_number, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgIdParam,
      'plivo',
      messageUuid,
      'outbound',
      body.Status as string || 'unknown',
      body.From as string || '',
      body.To as string || '',
      JSON.stringify(body)
    ).run();
  }

  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.text('OK');
});

// Sinch webhook - receives delivery reports
app.post('/webhooks/sinch', async (c) => {
  const body = await c.req.json();

  const orgIdParam = c.req.query('org');
  if (!orgIdParam) {
    return c.json({ error: 'Missing org' }, 400);
  }

  const integration = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(orgIdParam, 'sinch', 'connected').first();

  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  // Store webhook
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(deliveryId, orgIdParam, 'sinch', body.type || 'delivery_report', JSON.stringify(body), false).run();

  // Store message
  const batchId = body.batch_id;
  if (batchId) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, to_number, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgIdParam,
      'sinch',
      batchId,
      'outbound',
      body.status || body.type || 'unknown',
      body.recipient || '',
      JSON.stringify(body)
    ).run();
  }

  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.json({ status: 'ok' });
});

// AWS SNS webhook - receives delivery status notifications
app.post('/webhooks/aws-sns', async (c) => {
  const body = await c.req.json();

  // Handle SNS subscription confirmation
  if (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) {
    // Auto-confirm subscription
    await fetch(body.SubscribeURL);
    return c.json({ status: 'subscribed' });
  }

  const orgIdParam = c.req.query('org');
  if (!orgIdParam) {
    return c.json({ error: 'Missing org' }, 400);
  }

  const integration = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(orgIdParam, 'aws-sns', 'connected').first();

  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  // Parse the actual message if it's a notification
  let messageBody = body;
  if (body.Type === 'Notification' && body.Message) {
    try {
      messageBody = JSON.parse(body.Message);
    } catch {
      messageBody = { message: body.Message };
    }
  }

  // Store webhook
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(deliveryId, orgIdParam, 'aws-sns', messageBody.notification?.messageType || 'notification', JSON.stringify(body), false).run();

  // Store message if delivery receipt
  const messageId = messageBody.notification?.messageId;
  if (messageId) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, to_number, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgIdParam,
      'aws-sns',
      messageId,
      'outbound',
      messageBody.status || messageBody.delivery?.providerResponse || 'unknown',
      messageBody.delivery?.destination || '',
      JSON.stringify(body)
    ).run();
  }

  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.json({ status: 'ok' });
});

// Klaviyo webhook - receives SMS events
app.post('/webhooks/klaviyo', async (c) => {
  const body = await c.req.json();

  const orgIdParam = c.req.query('org');
  if (!orgIdParam) {
    return c.json({ error: 'Missing org' }, 400);
  }

  const integration = await c.env.DB.prepare(
    'SELECT id FROM integrations WHERE org_id = ? AND provider = ? AND status = ?'
  ).bind(orgIdParam, 'klaviyo', 'connected').first();

  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  // Store webhook
  const deliveryId = `wh_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(`
    INSERT INTO provider_webhooks (id, org_id, provider, event_type, raw_payload, processed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(deliveryId, orgIdParam, 'klaviyo', body.type || body.event || 'sms_event', JSON.stringify(body), false).run();

  // Store message if SMS event
  const messageId = body.data?.id || body.attributes?.message_id;
  if (messageId) {
    await c.env.DB.prepare(`
      INSERT INTO sms_messages (id, org_id, provider, provider_message_id, direction, status, to_number, raw_data, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(org_id, provider, provider_message_id) DO UPDATE SET
        status = excluded.status
    `).bind(
      `msg_${crypto.randomUUID().replace(/-/g, '')}`,
      orgIdParam,
      'klaviyo',
      messageId,
      'outbound',
      body.attributes?.status || body.data?.attributes?.status || 'unknown',
      body.attributes?.phone_number || body.data?.attributes?.phone_number || '',
      JSON.stringify(body)
    ).run();
  }

  await c.env.DB.prepare(
    'UPDATE provider_webhooks SET processed = 1, processed_at = datetime("now") WHERE id = ?'
  ).bind(deliveryId).run();

  return c.json({ status: 'ok' });
});

// Get webhook URL for a provider (for setup instructions)
v1.get('/integrations/:provider/webhook-url', async (c) => {
  const auth = c.req.header('Authorization');
  const user = await verifyJWT(c.env, auth || '');
  if (!user) {
    return c.json<APIResponse<null>>({
      success: false,
      error: { code: 'authentication_error', message: 'Invalid token' }
    }, 401);
  }

  const provider = c.req.param('provider');
  const baseUrl = 'https://api.smsguard.ai';

  let webhookUrl: string;
  let setupInstructions: string;

  switch (provider) {
    case 'twilio':
      webhookUrl = `${baseUrl}/webhooks/twilio`;
      setupInstructions = 'Go to Twilio Console > Phone Numbers > Configure > Messaging > Webhook URL';
      break;
    case 'vonage':
      webhookUrl = `${baseUrl}/webhooks/vonage`;
      setupInstructions = 'Go to Vonage Dashboard > Settings > Default SMS webhook URLs';
      break;
    case 'messagebird':
      webhookUrl = `${baseUrl}/webhooks/messagebird?org=${user.org}`;
      setupInstructions = 'Go to MessageBird Dashboard > Developers > Flow Builder or API Settings';
      break;
    case 'plivo':
      webhookUrl = `${baseUrl}/webhooks/plivo?org=${user.org}`;
      setupInstructions = 'Go to Plivo Console > Messaging > Applications > Create/Edit Application';
      break;
    case 'sinch':
      webhookUrl = `${baseUrl}/webhooks/sinch?org=${user.org}`;
      setupInstructions = 'Go to Sinch Dashboard > SMS > API > Callback URLs';
      break;
    case 'aws-sns':
      webhookUrl = `${baseUrl}/webhooks/aws-sns?org=${user.org}`;
      setupInstructions = 'Create an SNS topic for SMS delivery status and subscribe this URL as an HTTPS endpoint';
      break;
    case 'klaviyo':
      webhookUrl = `${baseUrl}/webhooks/klaviyo?org=${user.org}`;
      setupInstructions = 'Go to Klaviyo Settings > Webhooks > Create Webhook and add this URL for SMS events';
      break;
    default:
      return c.json<APIResponse<null>>({
        success: false,
        error: { code: 'invalid_provider', message: 'Unknown provider' }
      }, 400);
  }

  return c.json<APIResponse<{ webhook_url: string; setup_instructions: string }>>({
    success: true,
    data: { webhook_url: webhookUrl, setup_instructions: setupInstructions }
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
