import { Hono } from 'hono';
import { Env } from '../types';
import { getStripeClient, processSubscriptionEvent } from '../services/stripe';
import { sendFraudAlertEmail, sendMonthlySummaryEmail, initSendGrid } from '../services/email';

const app = new Hono<{ Bindings: Env }>();

// Stripe webhook handler
app.post('/stripe', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  const body = await c.req.text();
  const stripe = getStripeClient(c.env);

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // Process the event
    await processSubscriptionEvent(c.env.DB, event);

    return c.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return c.json({ error: 'Webhook error' }, 400);
  }
});

// Internal webhook for fraud alerts
app.post('/internal/fraud-alert', async (c) => {
  const body = await c.req.json<{
    orgId: string;
    blockedCount: number;
    timeWindow: string;
    topCountry: string;
    threatLevel: 'medium' | 'high';
  }>();

  // Get org admin email
  const admin = await c.env.DB.prepare(`
    SELECT u.email, u.id as name
    FROM users u
    WHERE u.org_id = ? AND u.role = 'admin'
    LIMIT 1
  `).bind(body.orgId).first<{ email: string; name: string }>();

  if (admin) {
    initSendGrid(c.env.SENDGRID_API_KEY);
    await sendFraudAlertEmail(admin.email, {
      blockedCount: body.blockedCount,
      timeWindow: body.timeWindow,
      topCountry: body.topCountry,
      threatLevel: body.threatLevel,
    });
  }

  return c.json({ sent: true });
});

// Scheduled job for monthly summaries
app.post('/internal/monthly-summary', async (c) => {
  const body = await c.req.json<{ month: string }>();

  // Get all active organizations
  const orgs = await c.env.DB.prepare(`
    SELECT o.id, o.name, u.email, u.id as user_name
    FROM organizations o
    JOIN users u ON o.id = u.org_id
    WHERE u.role = 'admin'
    AND o.plan = 'pro'
  `).all<{ id: string; name: string; email: string; user_name: string }>();

  initSendGrid(c.env.SENDGRID_API_KEY);

  for (const org of orgs.results || []) {
    // Get monthly stats
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_checks,
        SUM(CASE WHEN decision = 'allow' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN decision = 'block' THEN 1 ELSE 0 END) as blocked
      FROM sms_checks
      WHERE org_id = ?
      AND created_at LIKE ? || '%'
    `).bind(org.id, body.month).first<{
      total_checks: number;
      allowed: number;
      blocked: number;
    }>();

    // Get SMS cost
    const orgData = await c.env.DB.prepare(
      'SELECT avg_sms_cost FROM organizations WHERE id = ?'
    ).bind(org.id).first<{ avg_sms_cost: number }>();

    const blocked = stats?.blocked || 0;
    const avgCost = orgData?.avg_sms_cost || 0.08;
    const savings = blocked * avgCost;
    const invoice = 100 + (savings * 0.15);

    await sendMonthlySummaryEmail(org.email, org.user_name, {
      month: body.month,
      totalChecks: stats?.total_checks || 0,
      allowed: stats?.allowed || 0,
      blocked: blocked,
      savings,
      invoice,
    });
  }

  return c.json({ sent: true, count: orgs.results?.length || 0 });
});

// Customer webhook delivery
app.post('/deliver', async (c) => {
  const body = await c.req.json<{
    webhookId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }>();

  // Get webhook config
  const webhook = await c.env.DB.prepare(`
    SELECT url, secret FROM webhooks WHERE id = ? AND enabled = 1
  `).bind(body.webhookId).first<{ url: string; secret: string }>();

  if (!webhook) {
    return c.json({ error: 'Webhook not found' }, 404);
  }

  // Generate signature
  const timestamp = Date.now();
  const payloadString = JSON.stringify(body.payload);
  const signaturePayload = `${timestamp}.${payloadString}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhook.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signaturePayload)
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Deliver webhook
  let statusCode = 0;
  let responseBody = '';

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SMSGuard-Signature': `t=${timestamp},v1=${signature}`,
        'X-SMSGuard-Event': body.eventType,
      },
      body: payloadString,
    });

    statusCode = response.status;
    responseBody = await response.text();
  } catch (err) {
    responseBody = err instanceof Error ? err.message : 'Unknown error';
  }

  // Log delivery
  await c.env.DB.prepare(`
    INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, status_code, response_body, delivered_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    `del_${crypto.randomUUID().replace(/-/g, '')}`,
    body.webhookId,
    body.eventType,
    payloadString,
    statusCode,
    responseBody.slice(0, 1000)
  ).run();

  return c.json({ delivered: statusCode >= 200 && statusCode < 300 });
});

export default app;
